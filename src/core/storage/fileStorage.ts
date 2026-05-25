import { VAULT_DATA_DIR, VAULT_PLAIN_DIR } from '../utils/constants';
import { encryptData, decryptData } from '../crypto';
import { generateIV } from '../crypto/generateKey';
import type { VaultStorageProvider } from './provider';

export async function writeEncryptedFile(
  provider: VaultStorageProvider,
  uuid: string,
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
): Promise<void> {
  const output = new Uint8Array(iv.length + encryptedData.byteLength);
  output.set(iv);
  output.set(new Uint8Array(encryptedData), iv.length);
  await provider.writeFile(`${VAULT_DATA_DIR}/${uuid}.enc`, output.buffer);
}

export async function storeEncryptedFile(
  provider: VaultStorageProvider,
  uuid: string,
  plaintext: ArrayBuffer,
  fileKey: CryptoKey,
): Promise<Uint8Array> {
  const iv = generateIV();
  const ciphertext = await encryptData(plaintext, fileKey, iv);
  await writeEncryptedFile(provider, uuid, ciphertext, iv);
  return iv;
}

export async function readEncryptedFile(
  provider: VaultStorageProvider,
  uuid: string,
  fileKey: CryptoKey,
): Promise<{ data: ArrayBuffer; iv: Uint8Array }> {
  const path = `${VAULT_DATA_DIR}/${uuid}.enc`;
  const raw = await provider.readFile(path);

  const iv = new Uint8Array(raw.slice(0, 12));
  const ciphertext = raw.slice(12);

  const plaintext = await decryptData(ciphertext, fileKey, iv);
  return { data: plaintext, iv };
}

export async function deleteEncryptedFile(
  provider: VaultStorageProvider,
  uuid: string,
): Promise<boolean> {
  return provider.deleteFile(`${VAULT_DATA_DIR}/${uuid}.enc`);
}

export async function writePlainFile(
  provider: VaultStorageProvider,
  filename: string,
  data: ArrayBuffer,
): Promise<void> {
  await provider.writeFile(`${VAULT_PLAIN_DIR}/${filename}`, data);
}

export async function readPlainFile(
  provider: VaultStorageProvider,
  filename: string,
): Promise<ArrayBuffer> {
  return provider.readFile(`${VAULT_PLAIN_DIR}/${filename}`);
}

export async function deletePlainFile(
  provider: VaultStorageProvider,
  filename: string,
): Promise<boolean> {
  return provider.deleteFile(`${VAULT_PLAIN_DIR}/${filename}`);
}

export async function moveFileToPlain(
  provider: { readFile(path: string): Promise<ArrayBuffer>; writeFile(path: string, data: ArrayBuffer): Promise<void> },
  source: File,
  destFilename: string,
): Promise<string> {
  const data = await source.arrayBuffer();
  const path = `${VAULT_PLAIN_DIR}/${destFilename}`;
  await provider.writeFile(path, data);
  return path;
}
