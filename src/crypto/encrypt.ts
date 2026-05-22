import { CRYPTO_PARAMS } from '../utils/constants';

/**
 * AES-GCM 加密
 * @param data 明文数据
 * @param key 加密密钥
 * @param iv 初始化向量（12 字节）
 * @returns 密文（含 GCM 认证标签，附于末尾）
 */
export async function encryptData(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt(
    {
      name: CRYPTO_PARAMS.AES_MODE,
      iv,
    },
    key,
    data,
  );
}

/**
 * 将 CryptoKey 导出为原始 ArrayBuffer，然后用主密钥加密存储
 * @param fileKey 要导出的文件密钥
 * @param masterKey 主密钥
 * @returns { encryptedKey, iv } 加密后的密钥数据和使用的 IV
 */
export async function wrapFileKey(
  fileKey: CryptoKey,
  masterKey: CryptoKey,
): Promise<{ encryptedKey: ArrayBuffer; iv: Uint8Array }> {
  const rawKey = await crypto.subtle.exportKey('raw', fileKey);
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.IV_LENGTH));

  const encryptedKey = await crypto.subtle.encrypt(
    {
      name: CRYPTO_PARAMS.AES_MODE,
      iv,
    },
    masterKey,
    rawKey,
  );

  return { encryptedKey, iv };
}

/**
 * 用主密钥加密文件夹密码哈希
 * @param passwordHash 文件夹密码的 HKDF 哈希
 * @param masterKey 主密钥
 * @returns { encryptedHash, iv }
 */
export async function encryptPasswordHash(
  passwordHash: ArrayBuffer,
  masterKey: CryptoKey,
): Promise<{ encryptedHash: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.IV_LENGTH));

  const encryptedHash = await crypto.subtle.encrypt(
    {
      name: CRYPTO_PARAMS.AES_MODE,
      iv,
    },
    masterKey,
    passwordHash,
  );

  return { encryptedHash, iv };
}
