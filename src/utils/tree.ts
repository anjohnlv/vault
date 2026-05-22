import type { VaultNode, FolderNode, FileNode } from '../types';

/** 在树中查找节点 */
export function findNode(tree: VaultNode[], id: string): VaultNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.type === 'folder') {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** 查找节点的父文件夹 */
export function findParent(
  tree: VaultNode[],
  id: string,
): FolderNode | null {
  for (const node of tree) {
    if (node.type === 'folder') {
      if (node.children.some((c) => c.id === id)) return node;
      const found = findParent(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** 查找从根到加密文件夹的路径（返回最近的加密层） */
export function findEncryptionParent(
  tree: VaultNode[],
  id: string,
  parentChain: FolderNode[],
): FolderNode | null {
  for (const node of tree) {
    if (node.type === 'folder') {
      const chain = [...parentChain, node];
      if (node.children.some((c) => c.id === id)) {
        for (let i = chain.length - 1; i >= 0; i--) {
          if (chain[i].encrypted) return chain[i];
        }
        return null;
      }
      const found = findEncryptionParent(node.children, id, chain);
      if (found) return found;
    }
  }
  return null;
}

/** 在树中移除节点，返回被移除的节点 */
export function removeNode(tree: VaultNode[], id: string): VaultNode | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      return tree.splice(i, 1)[0];
    }
    if (tree[i].type === 'folder') {
      const removed = removeNode((tree[i] as FolderNode).children, id);
      if (removed) return removed;
    }
  }
  return null;
}

/** 插入节点到指定父文件夹（parentId 为 null 则插入根） */
export function insertNode(
  tree: VaultNode[],
  node: VaultNode,
  parentId: string | null,
): boolean {
  if (parentId === null) {
    tree.push(node);
    return true;
  }
  for (const n of tree) {
    if (n.type === 'folder' && n.id === parentId) {
      n.children.push(node);
      return true;
    }
    if (n.type === 'folder') {
      if (insertNode(n.children, node, parentId)) return true;
    }
  }
  return false;
}

/** 获取指定父文件夹下的所有子节点名称（用于重名检测） */
export function getSiblingNames(tree: VaultNode[], parentId: string | null): Set<string> {
  const names = new Set<string>();
  if (parentId === null) {
    for (const node of tree) names.add(node.name);
    return names;
  }
  for (const node of tree) {
    if (node.type === 'folder' && node.id === parentId) {
      for (const child of node.children) names.add(child.name);
      return names;
    }
    if (node.type === 'folder') {
      const found = getSiblingNames(node.children, parentId);
      if (found.size > 0) return found;
    }
  }
  return names;
}

/** 生成同文件夹下不重复的文件名（同名则追加 (1) (2) …） */
export function getUniqueName(
  tree: VaultNode[],
  parentId: string | null,
  desiredName: string,
): string {
  const existing = getSiblingNames(tree, parentId);
  if (!existing.has(desiredName)) return desiredName;

  const dotIndex = desiredName.lastIndexOf('.');
  const base = dotIndex > 0 ? desiredName.slice(0, dotIndex) : desiredName;
  const ext = dotIndex > 0 ? desiredName.slice(dotIndex) : '';

  let counter = 1;
  let name: string;
  do {
    name = `${base} (${counter})${ext}`;
    counter++;
  } while (existing.has(name));
  return name;
}

/** 递归搜索匹配名称的节点 */
export function searchNodes(
  tree: VaultNode[],
  query: string,
): VaultNode[] {
  const results: VaultNode[] = [];
  const q = query.toLowerCase();
  for (const node of tree) {
    if (node.name.toLowerCase().includes(q)) {
      results.push(node);
    }
    if (node.type === 'folder') {
      results.push(...searchNodes(node.children, q));
    }
  }
  return results;
}

/** 递归收集所有 FileNode */
export function getAllFiles(tree: VaultNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of tree) {
    if (node.type === 'file') {
      files.push(node);
    } else if (node.type === 'folder') {
      files.push(...getAllFiles(node.children));
    }
  }
  return files;
}
