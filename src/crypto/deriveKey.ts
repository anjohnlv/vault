import { CRYPTO_PARAMS } from '../utils/constants';

/** 将 ArrayBuffer 转为 base64 字符串（用于存储 salt） */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** 将 base64 字符串转为 ArrayBuffer（用于读取 salt） */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** 生成随机盐值 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.SALT_LENGTH));
}

/**
 * 从主密码通过 PBKDF2 派生 AES-GCM 主密钥
 * @param password 用户输入的主密码
 * @param salt 随机盐值（ArrayBuffer）
 * @returns AES-GCM CryptoKey，仅内存中使用
 */
export async function deriveMasterKey(
  password: string,
  salt: ArrayBuffer,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: CRYPTO_PARAMS.PBKDF2_ITERATIONS,
      hash: CRYPTO_PARAMS.PBKDF2_HASH,
    },
    keyMaterial,
    {
      name: CRYPTO_PARAMS.AES_MODE,
      length: CRYPTO_PARAMS.MASTER_KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * 从文件夹密码派生验证哈希
 * 使用 HKDF 而非 PBKDF2，因为哈希仅用于比对，不需要高迭代成本
 */
export async function derivePasswordHash(
  password: string,
  salt: ArrayBuffer,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'HKDF',
    false,
    ['deriveBits'],
  );

  return crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode('vault-folder-password'),
    },
    keyMaterial,
    256,
  );
}
