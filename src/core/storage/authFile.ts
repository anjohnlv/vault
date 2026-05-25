import type { AuthData } from '../types';
import { AUTH_FILE, VAULT_META_DIR } from '../utils/constants';
import { encryptData, decryptData } from '../crypto';
import { generateIV } from '../crypto/generateKey';
import type { VaultStorageProvider } from './provider';

const AUTH_PATH = `${VAULT_META_DIR}/${AUTH_FILE}`;

export async function writeAuthData(
  provider: VaultStorageProvider,
  authData: AuthData,
  prfKey: CryptoKey,
): Promise<void> {
  const json = JSON.stringify({
    encryptedPassword: arrayBufferToBase64(authData.encryptedPassword),
    iv: arrayBufferToBase64(authData.iv.buffer),
    credentialId: authData.credentialId,
  });

  const iv = generateIV();
  const plaintext = new TextEncoder().encode(json);
  const ciphertext = await encryptData(plaintext, prfKey, iv);

  const output = new Uint8Array(iv.length + ciphertext.byteLength);
  output.set(iv);
  output.set(new Uint8Array(ciphertext), iv.length);

  await provider.writeFile(AUTH_PATH, output.buffer);
}

export async function readAuthData(
  provider: VaultStorageProvider,
  prfKey: CryptoKey,
): Promise<AuthData | null> {
  try {
    const raw = await provider.readFile(AUTH_PATH);

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
