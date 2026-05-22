import type { AuthData } from '../types';
import { AUTH_FILE } from '../utils/constants';
import { encryptData, decryptData } from '../crypto';
import { generateIV } from '../crypto/generateKey';
import { readVaultFile, writeVaultFile, getMetaDir } from './directory';

/**
 * 写入加密的 WebAuthn 认证数据
 * 用 PRF 派生的对称密钥加密 AuthData
 */
export async function writeAuthData(
  vaultHandle: FileSystemDirectoryHandle,
  authData: AuthData,
  prfKey: CryptoKey,
): Promise<void> {
  const metaDir = await getMetaDir(vaultHandle);

  const json = JSON.stringify({
    encryptedPassword: arrayBufferToBase64(authData.encryptedPassword),
    iv: arrayBufferToBase64(authData.iv.buffer),
    credentialId: authData.credentialId,
  });

  const iv = generateIV();
  const plaintext = new TextEncoder().encode(json);
  const ciphertext = await encryptData(plaintext, prfKey, iv);

  // IV + 密文
  const output = new Uint8Array(iv.length + ciphertext.byteLength);
  output.set(iv);
  output.set(new Uint8Array(ciphertext), iv.length);

  await writeVaultFile(metaDir, AUTH_FILE, output.buffer);
}

/**
 * 读取并解密 WebAuthn 认证数据
 */
export async function readAuthData(
  vaultHandle: FileSystemDirectoryHandle,
  prfKey: CryptoKey,
): Promise<AuthData | null> {
  try {
    const metaDir = await getMetaDir(vaultHandle);
    const path = `${AUTH_FILE}`;
    const raw = await readVaultFile(metaDir, path);

    const iv = new Uint8Array(raw.slice(0, 12));
    const ciphertext = raw.slice(12);

    const plaintext = await decryptData(ciphertext, prfKey, iv);
    const json = new TextDecoder().decode(plaintext);
    const parsed = JSON.parse(json);

    return {
      encryptedPassword: base64ToArrayBuffer(parsed.encryptedPassword),
      iv: new Uint8Array(base64ToArrayBuffer(parsed.iv)),
      credentialId: parsed.credentialId,
    };
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
