import type { VaultNode, FolderNode, FileNode } from '../types';

/**
 * 深克隆 VaultNode 树，保留 ArrayBuffer 字段
 * 同时兼容旧的已损坏数据（ArrayBuffer 变为 {} 或普通对象）
 */
export function cloneTree(tree: VaultNode[]): VaultNode[] {
  return tree.map(cloneNode);
}

function cloneNode(node: VaultNode): VaultNode {
  if (node.type === 'folder') {
    const folder = node as FolderNode;
    return {
      ...folder,
      passwordHash: safeCloneBuffer(folder.passwordHash),
      passwordHashIv: safeCloneBuffer(folder.passwordHashIv),
      passwordHashSalt: safeCloneBuffer(folder.passwordHashSalt),
      children: (folder.children || []).map(cloneNode),
    } as FolderNode;
  }
  const file = node as FileNode;
  return {
    ...file,
    encryptedKey: file.encryptedKey ? safeCloneBuffer(file.encryptedKey) : undefined,
    iv: file.iv ? safeCloneUint8(file.iv) : undefined,
    fileIv: file.fileIv ? safeCloneUint8(file.fileIv) : undefined,
  } as FileNode;
}

/** 安全克隆 ArrayBuffer，兼容已损坏的 {} 数据 */
function safeCloneBuffer(buf: ArrayBuffer | undefined): ArrayBuffer | undefined {
  if (!buf || typeof buf !== 'object' || !('byteLength' in buf)) return undefined;
  try {
    return buf.slice(0);
  } catch {
    return new ArrayBuffer(0);
  }
}

/** 安全克隆 Uint8Array，兼容已损坏的 {} 数据 */
function safeCloneUint8(arr: Uint8Array | undefined): Uint8Array {
  if (!arr || typeof arr !== 'object' || !('length' in arr)) return new Uint8Array(0);
  try {
    return new Uint8Array(arr);
  } catch {
    return new Uint8Array(0);
  }
}

/**
 * 浅比较两个 ArrayBuffer
 */
export function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const ua = new Uint8Array(a);
  const ub = new Uint8Array(b);
  return ua.every((v, i) => v === ub[i]);
}
