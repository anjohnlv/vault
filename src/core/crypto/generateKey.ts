import { CRYPTO_PARAMS } from '../utils/constants';

/**
 * 生成随机的文件加密密钥（AES-GCM 256）
 * 每个文件使用独立的随机密钥
 */
export function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: CRYPTO_PARAMS.AES_MODE,
      length: CRYPTO_PARAMS.FILE_KEY_LENGTH,
    },
    true, // extractable: 需要导出以便主密钥加密存储
    ['encrypt', 'decrypt'],
  );
}

/**
 * 生成随机 IV（96-bit，GCM 推荐值）
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(CRYPTO_PARAMS.IV_LENGTH));
}
