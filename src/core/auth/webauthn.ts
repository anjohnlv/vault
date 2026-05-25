import { CRYPTO_PARAMS } from '../utils/constants';
import { readAuthData, writeAuthData } from '../storage/authFile';
import type { AuthData } from '../types';
import type { VaultStorageProvider } from '../storage/provider';

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
  provider: VaultStorageProvider,
  credentialId: string,
  prfSalt: Uint8Array,
  masterPassword: string,
): Promise<void> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(masterPassword);

  const prfResult = await getPrfResult(credentialId, prfSalt);
  const prfKey = await importPrfKey(prfResult);

  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.IV_LENGTH));
  const encryptedPassword = await crypto.subtle.encrypt(
    { name: CRYPTO_PARAMS.AES_MODE, iv },
    prfKey,
    passwordData,
  );

  const authData: AuthData = {
    encryptedPassword,
    iv,
    credentialId,
  };
  await writeAuthData(provider, authData, prfKey);
}

/**
 * 通过 WebAuthn 认证 + PRF 解密获取主密码
 *
 * 解锁时调用
 * @returns 主密码字符串，失败返回 null
 */
export async function decryptWithWebAuthn(
  provider: VaultStorageProvider,
): Promise<string | null> {
  try {
    const credentialIdRaw = await readMetaFile(provider, 'credential_id');
    const prfSaltBase64 = await readMetaFile(provider, 'prf_salt');

    if (!credentialIdRaw || !prfSaltBase64) return null;

    const credentialId = credentialIdRaw.trim();
    const prfSalt = base64ToBytes(prfSaltBase64.trim());

    const prfResult = await getPrfResult(credentialId, prfSalt);
    const prfKey = await importPrfKey(prfResult);

    const authData = await readAuthData(provider, prfKey);
    if (!authData) return null;

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

async function readMetaFile(provider: VaultStorageProvider, filename: string): Promise<string | null> {
  try {
    const raw = await provider.readFile(`.vault_meta/${filename}`);
    return new TextDecoder().decode(raw);
  } catch {
    return null;
  }
}

async function writeMetaFile(provider: VaultStorageProvider, filename: string, content: string): Promise<void> {
  await provider.writeFile(`.vault_meta/${filename}`, new TextEncoder().encode(content).buffer);
}

export async function saveWebAuthnInfo(
  provider: VaultStorageProvider,
  credentialId: string,
  prfSalt: Uint8Array,
): Promise<void> {
  await writeMetaFile(provider, 'credential_id', credentialId);
  await writeMetaFile(provider, 'prf_salt', bytesToBase64(prfSalt));
}

export async function hasWebAuthn(
  provider: VaultStorageProvider,
): Promise<boolean> {
  return provider.fileExists('.vault_meta/credential_id');
}

export async function removeWebAuthn(
  provider: VaultStorageProvider,
): Promise<void> {
  try { await provider.deleteFile('.vault_meta/credential_id'); } catch { /* ignore */ }
  try { await provider.deleteFile('.vault_meta/prf_salt'); } catch { /* ignore */ }
  try { await provider.deleteFile('.vault_meta/auth.enc'); } catch { /* ignore */ }
}
