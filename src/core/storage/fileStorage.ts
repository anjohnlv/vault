import { VAULT_DATA_DIR, VAULT_PLAIN_DIR } from '../utils/constants';
import { readVaultFile, deleteVaultFile, writeVaultFile } from './directory';
import { encryptData, decryptData } from '../crypto';
import { generateIV } from '../crypto/generateKey';

/**
 * 将加密后的文件内容写入 data/{uuid}.enc
 * data 为已加密的密文，这里再包一层（IV + 密文格式统一存储）
 */
export async function writeEncryptedFile(
  vaultHandle: FileSystemDirectoryHandle,
  uuid: string,
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
): Promise<void> {
  const dataDir = await vaultHandle.getDirectoryHandle(VAULT_DATA_DIR);

  // IV (12) + 密文
  const output = new Uint8Array(iv.length + encryptedData.byteLength);
  output.set(iv);
  output.set(new Uint8Array(encryptedData), iv.length);

  const fileHandle = await dataDir.getFileHandle(`${uuid}.enc`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(output.buffer);
  await writable.close();
}

/**
 * 加密并存储文件
 * @returns 写入的 UUID（即 encPath 为 data/{uuid}.enc）
 */
export async function storeEncryptedFile(
  vaultHandle: FileSystemDirectoryHandle,
  uuid: string,
  plaintext: ArrayBuffer,
  fileKey: CryptoKey,
): Promise<Uint8Array> {
  const iv = generateIV();
  const ciphertext = await encryptData(plaintext, fileKey, iv);
  await writeEncryptedFile(vaultHandle, uuid, ciphertext, iv);
  return iv;
}

/**
 * 读取并解密 data/{uuid}.enc
 * @returns { data: 明文, iv: 加密使用的 IV }
 */
export async function readEncryptedFile(
  vaultHandle: FileSystemDirectoryHandle,
  uuid: string,
  fileKey: CryptoKey,
): Promise<{ data: ArrayBuffer; iv: Uint8Array }> {
  const path = `${VAULT_DATA_DIR}/${uuid}.enc`;
  const raw = await readVaultFile(vaultHandle, path);

  const iv = new Uint8Array(raw.slice(0, 12));
  const ciphertext = raw.slice(12);

  const plaintext = await decryptData(ciphertext, fileKey, iv);
  return { data: plaintext, iv };
}

/**
 * 删除 data/{uuid}.enc
 */
export async function deleteEncryptedFile(
  vaultHandle: FileSystemDirectoryHandle,
  uuid: string,
): Promise<boolean> {
  return deleteVaultFile(vaultHandle, `${VAULT_DATA_DIR}/${uuid}.enc`);
}

/** 写入普通文件（不加密） */
export async function writePlainFile(
  vaultHandle: FileSystemDirectoryHandle,
  filename: string,
  data: ArrayBuffer,
): Promise<void> {
  await writeVaultFile(vaultHandle, `${VAULT_PLAIN_DIR}/${filename}`, data);
}

/**
 * 将外部文件直接移动到 plain/ 目录（物理移动，非复制）
 * 使用 File System Access API 的 FileSystemFileHandle.move()
 */
export async function moveFileToPlain(
  vaultHandle: FileSystemDirectoryHandle,
  fileHandle: FileSystemFileHandle,
  filename: string,
): Promise<string> {
  const plainDir = await vaultHandle.getDirectoryHandle(VAULT_PLAIN_DIR);
  await fileHandle.move(plainDir, filename);
  return `${VAULT_PLAIN_DIR}/${filename}`;
}

/** 读取普通文件（不解密） */
export async function readPlainFile(
  vaultHandle: FileSystemDirectoryHandle,
  filename: string,
): Promise<ArrayBuffer> {
  return readVaultFile(vaultHandle, `${VAULT_PLAIN_DIR}/${filename}`);
}

/** 删除普通文件 */
export async function deletePlainFile(
  vaultHandle: FileSystemDirectoryHandle,
  filename: string,
): Promise<boolean> {
  return deleteVaultFile(vaultHandle, `${VAULT_PLAIN_DIR}/${filename}`);
}
