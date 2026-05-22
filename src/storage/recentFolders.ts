/** 最近访问的保险箱记录 */
export interface RecentFolder {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  lastAccessed: number;
}

const DB_NAME = 'vault-recent';
const DB_VERSION = 2;
const STORE_NAME = 'folders';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 获取所有最近文件夹 */
export async function getRecentFolders(): Promise<RecentFolder[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const items = await new Promise<RecentFolder[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items.sort((a, b) => b.lastAccessed - a.lastAccessed);
  } catch {
    return [];
  }
}

/** 添加或更新最近文件夹记录 */
export async function upsertRecentFolder(
  handle: FileSystemDirectoryHandle,
): Promise<string> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // 检查是否已存在同名 handle
    const items = await new Promise<RecentFolder[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const existing = items.find((f) => f.name === handle.name);
    const id = existing?.id ?? crypto.randomUUID();

    store.put({
      id,
      name: handle.name,
      handle,
      lastAccessed: Date.now(),
    });

    db.close();
    return id;
  } catch {
    // 静默失败，不影响主流程
    return '';
  }
}

/** 删除一条记录 */
export async function removeRecentFolder(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    db.close();
  } catch {
    // ignore
  }
}

const LAST_OPENED_KEY = 'vault-last-opened';

/** 记录最后打开的保险箱 ID */
export function setLastOpenedVault(id: string): void {
  try {
    localStorage.setItem(LAST_OPENED_KEY, id);
  } catch {
    // ignore
  }
}

/** 获取最后打开的保险箱 ID */
export function getLastOpenedVault(): string | null {
  try {
    return localStorage.getItem(LAST_OPENED_KEY);
  } catch {
    return null;
  }
}

/** 清除最后打开的保险箱记录 */
export function clearLastOpenedVault(): void {
  try {
    localStorage.removeItem(LAST_OPENED_KEY);
  } catch {
    // ignore
  }
}
