import { VAULT_META_DIR, VAULT_DATA_DIR, VAULT_PLAIN_DIR } from '../utils/constants';
import type { VaultStorageProvider } from './provider';

export class WebStorageProvider implements VaultStorageProvider {
  private handle: FileSystemDirectoryHandle;

  constructor(handle: FileSystemDirectoryHandle) {
    this.handle = handle;
  }

  getHandle(): FileSystemDirectoryHandle {
    return this.handle;
  }

  async createStructure(): Promise<void> {
    await this.handle.getDirectoryHandle(VAULT_META_DIR, { create: true });
    await this.handle.getDirectoryHandle(VAULT_PLAIN_DIR, { create: true });
    await this.handle.getDirectoryHandle(VAULT_DATA_DIR, { create: true });
  }

  async isValid(): Promise<boolean> {
    try {
      await this.handle.getDirectoryHandle(VAULT_META_DIR);
      await this.handle.getDirectoryHandle(VAULT_DATA_DIR);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<ArrayBuffer> {
    const fileHandle = await this.resolveFileHandle(path, false);
    const file = await fileHandle.getFile();
    return file.arrayBuffer();
  }

  async writeFile(path: string, data: ArrayBuffer): Promise<void> {
    const fileHandle = await this.resolveFileHandle(path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const parts = path.split('/');
      if (parts.length === 1) {
        await this.handle.removeEntry(parts[0]!);
        return true;
      }
      let dir: FileSystemDirectoryHandle = this.handle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]!);
      }
      await dir.removeEntry(parts[parts.length - 1]!);
      return true;
    } catch {
      return false;
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.resolveFileHandle(path, false);
      return true;
    } catch {
      return false;
    }
  }

  private async resolveFileHandle(
    path: string,
    create: boolean,
  ): Promise<FileSystemFileHandle> {
    const parts = path.split('/');
    if (parts.length === 1) {
      return this.handle.getFileHandle(parts[0]!, { create });
    }
    let dir: FileSystemDirectoryHandle = this.handle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!, { create });
    }
    return dir.getFileHandle(parts[parts.length - 1]!, { create });
  }
}

export async function selectVaultFolder(): Promise<FileSystemDirectoryHandle> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('您的浏览器不支持 File System Access API，请使用 Chrome 或 Edge。');
  }

  return window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents',
  });
}

export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') {
    return true;
  }
  return (await handle.requestPermission(opts)) === 'granted';
}

export async function isValidVault(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    await handle.getDirectoryHandle('.vault_meta');
    await handle.getDirectoryHandle('data');
    return true;
  } catch {
    return false;
  }
}
