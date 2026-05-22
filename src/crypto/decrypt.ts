import { CRYPTO_PARAMS } from '../utils/constants';

/**
 * AES-GCM 解密
 * @param ciphertext 密文（含 GCM 认证标签）
 * @param key 解密密钥
 * @param iv 加密时使用的 IV
 * @returns 明文数据
 */
export async function decryptData(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: CRYPTO_PARAMS.AES_MODE,
      iv,
    },
    key,
    ciphertext,
  );
}

/**
 * 用主密钥解密被加密的文件密钥，并导入为 CryptoKey
 * @param encryptedKey 主密钥加密的文件密钥
 * @param iv 加密时使用的 IV
 * @param masterKey 主密钥
 * @returns 文件 CryptoKey，可用于加解密文件内容
 */
export async function unwrapFileKey(
  encryptedKey: ArrayBuffer,
  iv: Uint8Array,
  masterKey: CryptoKey,
): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.decrypt(
    {
      name: CRYPTO_PARAMS.AES_MODE,
      iv,
    },
    masterKey,
    encryptedKey,
  );

  return crypto.subtle.importKey(
    'raw',
    rawKey,
    {
      name: CRYPTO_PARAMS.AES_MODE,
      length: CRYPTO_PARAMS.FILE_KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * 用主密钥解密文件夹密码哈希
 * @param encryptedHash 主密钥加密的密码哈希
 * @param iv 加密时使用的 IV
 * @param masterKey 主密钥
 * @returns 原始密码哈希 ArrayBuffer
 */
export async function decryptPasswordHash(
  encryptedHash: ArrayBuffer,
  iv: Uint8Array,
  masterKey: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: CRYPTO_PARAMS.AES_MODE,
      iv,
    },
    masterKey,
    encryptedHash,
  );
}
