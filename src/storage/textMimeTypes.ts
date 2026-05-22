/** 用户自定义纯文本文件后缀名列表的持久化 */
const DB_NAME = 'vault-recent';
const DB_VERSION = 2;
const STORE_NAME = 'textExtensions';
const KEY = 'userExtensions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 获取用户保存的自定义后缀名列表，未设置时返回 null */
export async function getCustomTextExtensions(): Promise<string[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const record = await new Promise<{ id: string; exts: string[] } | undefined>((resolve, reject) => {
      const req = store.get(KEY);
      req.onsuccess = () => resolve(req.result ?? undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record?.exts ?? null;
  } catch {
    return null;
  }
}

/** 保存自定义后缀名列表 */
export async function saveCustomTextExtensions(exts: string[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: KEY, exts });
    db.close();
  } catch {
    // ignore
  }
}

/** 删除自定义列表（恢复默认） */
export async function resetCustomTextExtensions(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(KEY);
    db.close();
  } catch {
    // ignore
  }
}
