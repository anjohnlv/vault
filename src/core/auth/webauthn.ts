import { CRYPTO_PARAMS } from '../utils/constants';
import { readAuthData, writeAuthData } from '../storage/authFile';
import type { AuthData } from '../types';

/** PRF 盐值长度（字节） */

/** base64url 解码为 Uint8Array */
function base64urlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Uint8Array 编码为 base64 字符串（标准 base64） */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** base64 解码为 Uint8Array */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const PRF_SALT_LENGTH = 32;

/** 检测 WebAuthn + PRF 扩展是否可用 */
export function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

/** 检测平台认证器是否可用（指纹/面容/PIN） */
export async function isPlatformAuthAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * 生成随机的 PRF 盐值
 */
function generatePrfSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PRF_SALT_LENGTH));
}

/**
 * 将 PRF 结果导入为 AES-GCM CryptoKey
 */
async function importPrfKey(prfResult: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    prfResult,
    { name: CRYPTO_PARAMS.AES_MODE, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * 注册 WebAuthn 凭据（使用 PRF 扩展）
 * 注册时验证 PRF 支持，不返回 prfKey（仅认证时可获取）
 *
 * @returns { credentialId, prfSalt } 用于存储
 */
export async function registerWebAuthn(): Promise<{
  credentialId: string;
  prfSalt: Uint8Array;
}> {
  const prfSalt = generatePrfSalt();

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Vault 加密保险箱',
        id: window.location.hostname || 'localhost',
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'vault-user',
        displayName: 'Vault User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      // PRF 扩展：发送盐值确认支持
      extensions: {
        prf: {
          eval: { first: prfSalt.buffer },
        },
      } as Record<string, unknown>,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('WebAuthn 注册被取消');
  }

  // 验证 PRF 扩展是否被认证器接受
  const extResults = credential.getClientExtensionResults();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prfResult = (extResults as any).prf;

  if (!prfResult?.enabled) {
    throw new Error('当前设备不支持 WebAuthn PRF 扩展，请使用密码解锁');
  }

  return {
    credentialId: credential.id,
    prfSalt,
  };
}

/**
 * 通过 WebAuthn 认证获取 PRF 结果，用其加密主密码
 *
 * 注册后调用：用 credentialId + prfSalt 认证 → 获取 prfKey → 加密主密码 → 存入 auth.enc
 */
export async function encryptWithWebAuthn(
  vaultHandle: FileSystemDirectoryHandle,
  credentialId: string,
  prfSalt: Uint8Array,
  masterPassword: string,
): Promise<void> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(masterPassword);

  // 用 WebAuthn PRF 获取 prfKey
  const prfResult = await getPrfResult(credentialId, prfSalt);
  const prfKey = await importPrfKey(prfResult);

  // 用 prfKey 加密主密码
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.IV_LENGTH));
  const encryptedPassword = await crypto.subtle.encrypt(
    { name: CRYPTO_PARAMS.AES_MODE, iv },
    prfKey,
    passwordData,
  );

  // 写入 auth.enc
  const authData: AuthData = {
    encryptedPassword,
    iv,
    credentialId,
  };
  await writeAuthData(vaultHandle, authData, prfKey);
}

/**
 * 通过 WebAuthn 认证 + PRF 解密获取主密码
 *
 * 解锁时调用
 * @returns 主密码字符串，失败返回 null
 */
export async function decryptWithWebAuthn(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<string | null> {
  try {
    // 先读取 credentialId（auth.enc 中存储了 credentialId）
    // 但 auth.enc 是用 prfKey 加密的... 这就鸡生蛋了
    // 所以 credentialId 和 prfSalt 需要单独存储，不用加密
    // 修正：credentialId 明文存储，prfSalt 明文存储
    // 只有 encryptedPassword 用 prfKey 加密

    // 读取 credentialId 和 prfSalt（明文存储）
    const credentialId = await readPlainFile(vaultHandle, 'credential_id');
    const prfSaltBase64 = await readPlainFile(vaultHandle, 'prf_salt');

    if (!credentialId || !prfSaltBase64) return null;

    const prfSalt = base64ToBytes(prfSaltBase64);

    // PRF 认证 → 获取 prfKey
    const prfResult = await getPrfResult(credentialId, prfSalt);
    const prfKey = await importPrfKey(prfResult);

    // 用 prfKey 解密 auth.enc
    const authData = await readAuthData(vaultHandle, prfKey);
    if (!authData) return null;

    // 解密主密码
    const passwordData = await crypto.subtle.decrypt(
      { name: CRYPTO_PARAMS.AES_MODE, iv: authData.iv },
      prfKey,
      authData.encryptedPassword,
    );

    return new TextDecoder().decode(passwordData);
  } catch {
    return null;
  }
}

/**
 * WebAuthn 认证 → 获取 PRF 结果
 */
async function getPrfResult(
  credentialId: string,
  prfSalt: Uint8Array,
): Promise<ArrayBuffer> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname || 'localhost',
      allowCredentials: [
        {
          id: base64urlToBytes(credentialId),
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
      extensions: {
        prf: {
          eval: { first: prfSalt.buffer },
        },
      } as Record<string, unknown>,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('WebAuthn 认证被取消');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prfResult = (credential.getClientExtensionResults() as any).prf;

  if (!prfResult?.results?.first) {
    throw new Error('PRF 认证失败');
  }

  return prfResult.results.first as ArrayBuffer;
}

/**
 * 读取明文文件内容
 */
async function readPlainFile(
  vaultHandle: FileSystemDirectoryHandle,
  filename: string,
): Promise<string | null> {
  try {
    const metaDir = await vaultHandle.getDirectoryHandle('.vault_meta');
    const fileHandle = await metaDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file.text();
  } catch {
    return null;
  }
}

/**
 * 写入明文文件
 */
async function writePlainFile(
  vaultHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const metaDir = await vaultHandle.getDirectoryHandle('.vault_meta');
  const fileHandle = await metaDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * 存储 WebAuthn 注册信息（credentialId + prfSalt 明文存储）
 */
export async function saveWebAuthnInfo(
  vaultHandle: FileSystemDirectoryHandle,
  credentialId: string,
  prfSalt: Uint8Array,
): Promise<void> {
  await writePlainFile(vaultHandle, 'credential_id', credentialId);
  await writePlainFile(vaultHandle, 'prf_salt', bytesToBase64(prfSalt));
}

/**
 * 检查是否已注册 WebAuthn
 */
export async function hasWebAuthn(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const metaDir = await vaultHandle.getDirectoryHandle('.vault_meta');
    await metaDir.getFileHandle('credential_id');
    return true;
  } catch {
    return false;
  }
}

/**
 * 删除 WebAuthn 注册信息
 */
export async function removeWebAuthn(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const metaDir = await vaultHandle.getDirectoryHandle('.vault_meta');
  try { await metaDir.removeEntry('credential_id'); } catch { /* ignore */ }
  try { await metaDir.removeEntry('prf_salt'); } catch { /* ignore */ }
  try { await metaDir.removeEntry('auth.enc'); } catch { /* ignore */ }
}
