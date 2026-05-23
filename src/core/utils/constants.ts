/** 加密算法参数 */
export const CRYPTO_PARAMS = {
  PBKDF2_ITERATIONS: 600_000,
  PBKDF2_HASH: 'SHA-256' as const,
  MASTER_KEY_LENGTH: 256,
  FILE_KEY_LENGTH: 256,
  AES_MODE: 'AES-GCM',
  IV_LENGTH: 12,
  SALT_LENGTH: 32,
} as const;

/** 保险箱存储目录名 */
export const VAULT_META_DIR = '.vault_meta';
export const VAULT_DATA_DIR = 'data';
export const VAULT_PLAIN_DIR = 'plain';

export const INDEX_FILE = 'index.json';
export const AUTH_FILE = 'auth.enc';
export const SALT_FILE = 'salt';

/** 支持预览的图片/PDF 类型 */
export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
];

export const PDF_MIME_TYPE = 'application/pdf';

/** 内置文件类型的 MIME */
export const NOTE_MIME_TYPE = 'text/plain';
export const PASSWORD_BOOK_MIME_TYPE = 'application/x-vault-passwordbook';
