import type { VaultIndex, VaultNode, FileNode, FolderNode } from '../types';
import { INDEX_FILE } from '../utils/constants';
import { generateUUID } from '../utils/format';
import { writeVaultFile, readVaultFile, getMetaDir } from './directory';

const B64_PREFIX = '__b64:';

function binToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    chars.push(String.fromCharCode(bytes[i]));
  }
  return B64_PREFIX + btoa(chars.join(''));
}

function base64ToBin(value: string): ArrayBuffer {
  const b64 = value.slice(B64_PREFIX.length);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function uint8ToBase64(arr: Uint8Array): string {
  return binToBase64(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength));
}

function base64ToUint8(value: string): Uint8Array {
  return new Uint8Array(base64ToBin(value));
}

function treeToSerializable(nodes: VaultNode[]): unknown[] {
  return nodes.map((node) => {
    if (node.type === 'file') {
      const file = node as FileNode;
      return {
        ...file,
        encryptedKey: file.encryptedKey ? binToBase64(file.encryptedKey) : undefined,
        iv: file.iv ? uint8ToBase64(file.iv) : undefined,
        fileIv: file.fileIv ? uint8ToBase64(file.fileIv) : undefined,
      };
    }
    const folder = node as FolderNode;
    return {
      ...folder,
      passwordHash: folder.passwordHash ? binToBase64(folder.passwordHash) : undefined,
      passwordHashIv: folder.passwordHashIv ? uint8ToBase64(folder.passwordHashIv) : undefined,
      passwordHashSalt: folder.passwordHashSalt ? uint8ToBase64(folder.passwordHashSalt) : undefined,
      children: treeToSerializable(folder.children),
    };
  });
}

function treeFromSerializable(data: unknown[]): VaultNode[] {
  return data.map((item) => {
    const node = item as Record<string, unknown>;
    if (node.type === 'file') {
      return {
        ...node,
        encryptedKey: node.encryptedKey ? base64ToBin(node.encryptedKey as string) : undefined,
        iv: node.iv ? base64ToUint8(node.iv as string) : undefined,
        fileIv: node.fileIv ? base64ToUint8(node.fileIv as string) : undefined,
      } as FileNode;
    }
    return {
      ...node,
      passwordHash: node.passwordHash ? base64ToBin(node.passwordHash as string) : undefined,
      passwordHashIv: node.passwordHashIv ? base64ToUint8(node.passwordHashIv as string) : undefined,
      passwordHashSalt: node.passwordHashSalt ? base64ToUint8(node.passwordHashSalt as string) : undefined,
      children: treeFromSerializable((node.children as unknown[]) || []),
    } as FolderNode;
  });
}

/** v1/v2 → v3：将顶层节点包裹进根文件夹节点 */
function migrateToV3(parsed: Record<string, unknown>): VaultIndex {
  const tree = treeFromSerializable((parsed.tree as unknown[]) || []);
  const rootEncrypted = (parsed.rootEncrypted as boolean) ?? false;
  const rootId = generateUUID();
  const rootFolder: FolderNode = {
    id: rootId,
    name: '保险箱',
    type: 'folder',
    encrypted: rootEncrypted,
    createdAt: Date.now(),
    children: tree,
  };
  return { version: 3, rootId, tree: [rootFolder] };
}

export async function readIndex(
  vaultHandle: FileSystemDirectoryHandle,
  masterKey: CryptoKey,
): Promise<VaultIndex | null> {
  void masterKey;
  try {
    const metaDir = await getMetaDir(vaultHandle);
    const raw = await readVaultFile(metaDir, INDEX_FILE);
    const json = new TextDecoder().decode(raw);
    const parsed = JSON.parse(json);
    const version = parsed.version ?? 1;
    if (version < 3) {
      return migrateToV3(parsed);
    }
    return {
      version: parsed.version,
      tree: treeFromSerializable(parsed.tree ?? []),
      rootId: parsed.rootId,
      passwordHint: parsed.passwordHint,
    };
  } catch {
    return null;
  }
}

/** 仅读取主密码提示（无需 masterKey，index.json 为明文） */
export async function readPasswordHint(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<string | undefined> {
  try {
    const metaDir = await getMetaDir(vaultHandle);
    const raw = await readVaultFile(metaDir, INDEX_FILE);
    const json = new TextDecoder().decode(raw);
    const parsed = JSON.parse(json);
    return parsed.passwordHint;
  } catch {
    return undefined;
  }
}

export async function writeIndex(
  vaultHandle: FileSystemDirectoryHandle,
  index: VaultIndex,
  masterKey: CryptoKey,
): Promise<boolean> {
  void masterKey;
  try {
    const metaDir = await getMetaDir(vaultHandle);
    const payload: Record<string, unknown> = {
      version: index.version,
      tree: treeToSerializable(index.tree),
    };
    if (index.rootId) payload.rootId = index.rootId;
    if (index.passwordHint) payload.passwordHint = index.passwordHint;
    const json = new TextEncoder().encode(JSON.stringify(payload));
    await writeVaultFile(metaDir, INDEX_FILE, json.buffer);
    return true;
  } catch (err) {
    console.error('写入索引失败:', err);
    return false;
  }
}

export async function writeIndexInitial(
  vaultHandle: FileSystemDirectoryHandle,
  index: VaultIndex,
  masterKey: CryptoKey,
): Promise<boolean> {
  return writeIndex(vaultHandle, index, masterKey);
}
