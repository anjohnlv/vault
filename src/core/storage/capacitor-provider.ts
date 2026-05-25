import type { VaultStorageProvider } from './provider';

export class CapacitorStorageProvider implements VaultStorageProvider {
  private rootPath: string;

  static async removeVault(rootPath: string): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.rmdir({ path: rootPath, directory: Directory.Documents, recursive: true });
  }

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  getRootPath(): string {
    return this.rootPath;
  }

  private fullPath(subPath: string): string {
    return `${this.rootPath}/${subPath}`.replace(/\/+/g, '/');
  }

  async readFile(path: string): Promise<ArrayBuffer> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const result = await Filesystem.readFile({
      path: this.fullPath(path),
      directory: Directory.Documents,
      encoding: undefined as unknown as never,
    });
    const data = result.data;
    if (data instanceof Blob) {
      return data.arrayBuffer();
    }
    if (typeof data === 'string') {
      const binaryStr = atob(data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes.buffer;
    }
    return new ArrayBuffer(0);
  }

  async writeFile(path: string, data: ArrayBuffer): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const base64 = arrayBufferToBase64(data);
    const parts = this.fullPath(path).split('/');
    const dir = parts.slice(0, -1).join('/');
    if (dir) {
      try {
        await Filesystem.mkdir({ path: dir, directory: Directory.Documents, recursive: true });
      } catch { /* 目录已存在 */ }
    }
    await Filesystem.writeFile({
      path: this.fullPath(path),
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({ path: this.fullPath(path), directory: Directory.Documents });
      return true;
    } catch {
      return false;
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.stat({ path: this.fullPath(path), directory: Directory.Documents });
      return true;
    } catch {
      return false;
    }
  }

  async createStructure(): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const dirs = ['.vault_meta', 'plain', 'data'];
    for (const dir of dirs) {
      try {
        await Filesystem.mkdir({ path: this.fullPath(dir), directory: Directory.Documents, recursive: true });
      } catch { /* 目录已存在 */ }
    }
  }

  async isValid(): Promise<boolean> {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.stat({ path: this.fullPath('.vault_meta'), directory: Directory.Documents });
      await Filesystem.stat({ path: this.fullPath('data'), directory: Directory.Documents });
      return true;
    } catch {
      return false;
    }
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
