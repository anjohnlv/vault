import { VAULT_META_DIR, VAULT_DATA_DIR, VAULT_PLAIN_DIR } from '../utils/constants';

/**
 * 让用户选择或创建保险箱文件夹
 * 使用 File System Access API
 */
export async function selectVaultFolder(): Promise<FileSystemDirectoryHandle> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('您的浏览器不支持 File System Access API，请使用 Chrome 或 Edge。');
  }

  const handle = await window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents',
  });

  return handle;
}

/**
 * 在选定的文件夹中创建 .vault_meta/ 和 data/ 子目录
 */
export async function createVaultStructure(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<void> {
  await vaultHandle.getDirectoryHandle(VAULT_META_DIR, { create: true });
  await vaultHandle.getDirectoryHandle(VAULT_PLAIN_DIR, { create: true });
  await vaultHandle.getDirectoryHandle(VAULT_DATA_DIR, { create: true });
}

/**
 * 获取 .vault_meta/ 目录句柄
 */
export async function getMetaDir(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  return vaultHandle.getDirectoryHandle(VAULT_META_DIR);
}

/**
 * 获取 data/ 目录句柄
 */
export async function getDataDir(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  return vaultHandle.getDirectoryHandle(VAULT_DATA_DIR);
}

/**
 * 从保险箱中读取文件
 */
export async function readVaultFile(
  vaultHandle: FileSystemDirectoryHandle,
  path: string,
): Promise<ArrayBuffer> {
  const fileHandle = await vaultHandle.getFileHandle(path);
  const file = await fileHandle.getFile();
  return file.arrayBuffer();
}

/**
 * 向保险箱中写入文件
 * @returns 写入后的文件句柄
 */
export async function writeVaultFile(
  vaultHandle: FileSystemDirectoryHandle,
  path: string,
  data: ArrayBuffer,
): Promise<void> {
  const fileHandle = await vaultHandle.getFileHandle(path, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * 删除保险箱中的文件
 * @returns true 如果删除成功，false 如果文件不存在
 */
export async function deleteVaultFile(
  vaultHandle: FileSystemDirectoryHandle,
  path: string,
): Promise<boolean> {
  try {
    await vaultHandle.removeEntry(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查文件是否存在
 */
export async function fileExists(
  vaultHandle: FileSystemDirectoryHandle,
  path: string,
): Promise<boolean> {
  try {
    await vaultHandle.getFileHandle(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证文件夹是否是有效的保险箱（是否存在 .vault_meta/ 和 data/）
 */
export async function isValidVault(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    await vaultHandle.getDirectoryHandle(VAULT_META_DIR);
    await vaultHandle.getDirectoryHandle(VAULT_DATA_DIR);
    return true;
  } catch {
    return false;
  }
}

/**
 * 重新请求文件夹权限（权限可能被浏览器回收）
 */
export async function verifyPermission(
  vaultHandle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
  if ((await vaultHandle.queryPermission(opts)) === 'granted') {
    return true;
  }
  return (await vaultHandle.requestPermission(opts)) === 'granted';
}
