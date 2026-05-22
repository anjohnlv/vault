import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type {
  VaultStatus,
  VaultNode,
  FolderNode,
  FileNode,
  VaultIndex,
  SortField,
  SortOrder,
  FileOrigin,
} from '../types';
import { generateUUID } from '../utils/format';
import { NOTE_MIME_TYPE, PASSWORD_BOOK_MIME_TYPE } from '../utils/constants';
import { deriveMasterKey, generateSalt, derivePasswordHash } from '../crypto/deriveKey';
import { generateFileKey } from '../crypto/generateKey';
import { wrapFileKey, encryptPasswordHash } from '../crypto/encrypt';
import { unwrapFileKey, decryptPasswordHash } from '../crypto/decrypt';
import { createVaultStructure, getMetaDir } from '../storage/directory';
import { readIndex, writeIndex, writeIndexInitial } from '../storage/indexFile';
import {
  storeEncryptedFile,
  readEncryptedFile,
  deleteEncryptedFile,
  writePlainFile,
  readPlainFile,
  deletePlainFile,
} from '../storage/fileStorage';
import { isPlatformAuthAvailable, registerWebAuthn, saveWebAuthnInfo, hasWebAuthn, encryptWithWebAuthn, decryptWithWebAuthn } from '../auth/webauthn';
import { findNode, removeNode, insertNode, searchNodes } from '../utils/tree';
import { cloneTree } from '../utils/clone';

// ---- State ----

interface VaultState {
  status: VaultStatus;
  vaultFolder: FileSystemDirectoryHandle | null;
  tree: VaultNode[];
  rootId: string;
  folderAccess: Record<string, number>;    // folderId → expiresAt
  currentFolderId: string | null;
  webauthnAvailable: boolean;
  webauthnRegistered: boolean;
  searchQuery: string;
  searchResults: VaultNode[];
  sortBy: SortField;
  sortOrder: SortOrder;
  batchMode: boolean;
  selectedFileIds: string[];
  editingFileId: string | null;
  error: string | null;
  isLoading: boolean;
}

type VaultAction =
  | { type: 'SET_STATUS'; payload: VaultStatus }
  | { type: 'SET_FOLDER'; payload: FileSystemDirectoryHandle | null }
  | { type: 'SET_TREE'; payload: VaultNode[] }
  | { type: 'SET_ROOT_ID'; payload: string }
  | { type: 'SET_FOLDER_ACCESS'; payload: Record<string, number> }
  | { type: 'SET_CURRENT_FOLDER'; payload: string | null }
  | { type: 'SET_WEBAUTHN_AVAILABLE'; payload: boolean }
  | { type: 'SET_WEBAUTHN_REGISTERED'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: VaultNode[] }
  | { type: 'SET_SORT'; payload: { sortBy: SortField; sortOrder: SortOrder } }
  | { type: 'SET_BATCH_MODE'; payload: boolean }
  | { type: 'SET_SELECTED_FILES'; payload: string[] }
  | { type: 'SET_EDITING_FILE'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' };

const initialState: VaultState = {
  status: 'uninitialized',
  vaultFolder: null,
  tree: [],
  rootId: '',
  folderAccess: {},
  currentFolderId: null,
  webauthnAvailable: false,
  webauthnRegistered: false,
  searchQuery: '',
  searchResults: [],
  sortBy: 'modifiedAt',
  sortOrder: 'desc',
  batchMode: false,
  selectedFileIds: [],
  editingFileId: null,
  error: null,
  isLoading: false,
};

function vaultReducer(state: VaultState, action: VaultAction): VaultState {
  switch (action.type) {
    case 'SET_STATUS': return { ...state, status: action.payload };
    case 'SET_FOLDER': return { ...state, vaultFolder: action.payload };
    case 'SET_TREE': return { ...state, tree: action.payload };
    case 'SET_ROOT_ID': return { ...state, rootId: action.payload };
    case 'SET_FOLDER_ACCESS': return { ...state, folderAccess: action.payload };
    case 'SET_CURRENT_FOLDER': return { ...state, currentFolderId: action.payload };
    case 'SET_WEBAUTHN_AVAILABLE': return { ...state, webauthnAvailable: action.payload };
    case 'SET_WEBAUTHN_REGISTERED': return { ...state, webauthnRegistered: action.payload };
    case 'SET_SEARCH_QUERY': return { ...state, searchQuery: action.payload };
    case 'SET_SEARCH_RESULTS': return { ...state, searchResults: action.payload };
    case 'SET_SORT': return { ...state, sortBy: action.payload.sortBy, sortOrder: action.payload.sortOrder };
    case 'SET_BATCH_MODE': return { ...state, batchMode: action.payload, selectedFileIds: [] };
    case 'SET_SELECTED_FILES': return { ...state, selectedFileIds: action.payload };
    case 'SET_EDITING_FILE': return { ...state, editingFileId: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'RESET':
      return {
        ...initialState,
        status: 'locked',
        webauthnAvailable: state.webauthnAvailable,
      };
    default: return state;
  }
}

// ---- Context ----

interface VaultContextValue {
  state: VaultState;
  init: (folder: FileSystemDirectoryHandle, password: string) => Promise<void>;
  unlock: (folder: FileSystemDirectoryHandle, password: string) => Promise<boolean>;
  unlockWithWebAuthn: (folder: FileSystemDirectoryHandle) => Promise<boolean>;
  lock: () => void;
  addFile: (file: File) => Promise<void>;
  createNote: (name: string, parentId: string | null) => Promise<void>;
  createPasswordBook: (
    name: string,
    parentId: string | null,
    _folderPassword?: string,
  ) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  getFileBlob: (id: string) => Promise<{ blob: Blob; name: string } | null>;
  exportFile: (id: string) => Promise<void>;
  renameNode: (id: string, newName: string) => Promise<void>;
  moveNode: (id: string, targetFolderId: string | null) => Promise<void>;
  addFolder: (
    name: string,
    encrypted: boolean,
    parentId: string | null,
    password?: string,
    hint?: string,
  ) => Promise<void>;
  changePassword: (_oldPassword: string, newPassword: string) => Promise<boolean>;
  changeFolderType: (folderId: string, encrypted: boolean, password?: string, hint?: string) => Promise<void>;
  changeFolderPassword: (folderId: string, newPassword: string, hint?: string) => Promise<void>;
  getRootFolder: () => FolderNode | null;
  toggleRootEncrypted: (password?: string, hint?: string) => Promise<void>;
  registerBiometric: (password: string) => Promise<boolean>;
  verifyFolderPassword: (folderId: string, password: string) => Promise<boolean>;
  setFolderUnlockTimeout: (folderId: string, timeoutMs: number) => Promise<void>;
  setSortBy: (field: SortField, order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  toggleBatchMode: () => void;
  toggleFileSelection: (id: string) => void;
  batchDelete: () => Promise<void>;
  batchExport: () => Promise<void>;
  setCurrentFolder: (id: string | null) => void;
  setEditingFile: (id: string | null) => void;
  saveFileContent: (fileId: string, content: string) => Promise<void>;
  clearError: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(vaultReducer, initialState);
  const masterKeyRef = useRef<CryptoKey | null>(null);

  const setError = useCallback((msg: string | null) => dispatch({ type: 'SET_ERROR', payload: msg }), []);
  const setLoading = useCallback((v: boolean) => dispatch({ type: 'SET_LOADING', payload: v }), []);

  // ---- 初始化保险箱 ----
  const init = useCallback(async (folder: FileSystemDirectoryHandle, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const salt = generateSalt();
      const masterKey = await deriveMasterKey(password, salt.buffer);
      await createVaultStructure(folder);

      // 写入 salt
      const metaDir = await getMetaDir(folder);
      const saltHandle = await metaDir.getFileHandle('salt', { create: true });
      const sw = await saltHandle.createWritable();
      await sw.write(btoa(String.fromCharCode(...salt)));
      await sw.close();

      // 写入空索引
      const rootId = generateUUID();
      const rootFolder: FolderNode = {
        id: rootId, name: '保险箱', type: 'folder',
        encrypted: false, createdAt: Date.now(), children: [],
      };
      const emptyIndex: VaultIndex = { version: 3, tree: [rootFolder], rootId };
      await writeIndexInitial(folder, emptyIndex, masterKey);

      masterKeyRef.current = masterKey;
      dispatch({ type: 'SET_FOLDER', payload: folder });
      dispatch({ type: 'SET_TREE', payload: [rootFolder] });
      dispatch({ type: 'SET_ROOT_ID', payload: rootId });
      dispatch({ type: 'SET_STATUS', payload: 'unlocked' });

      // 检测 WebAuthn
      const available = await isPlatformAuthAvailable();
      dispatch({ type: 'SET_WEBAUTHN_AVAILABLE', payload: available });
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  // ---- 解锁保险箱（手动密码） ----
  const unlock = useCallback(async (
    folder: FileSystemDirectoryHandle,
    password: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // 读取 salt
      const metaDir = await getMetaDir(folder);
      const saltHandle = await metaDir.getFileHandle('salt');
      const saltFile = await saltHandle.getFile();
      const saltBase64 = await saltFile.text();
      const saltBinary = atob(saltBase64);
      const salt = new Uint8Array(saltBinary.length);
      for (let i = 0; i < saltBinary.length; i++) salt[i] = saltBinary.charCodeAt(i);

      const masterKey = await deriveMasterKey(password, salt.buffer);

      // 解密索引
      const index = await readIndex(folder, masterKey);
      if (!index) {
        setError('密码错误或索引文件已损坏');
        return false;
      }

      masterKeyRef.current = masterKey;
      dispatch({ type: 'SET_FOLDER', payload: folder });
      dispatch({ type: 'SET_TREE', payload: index.tree });
      if (index.rootId) {
        dispatch({ type: 'SET_ROOT_ID', payload: index.rootId });
        dispatch({ type: 'SET_CURRENT_FOLDER', payload: index.rootId });
      }
      dispatch({ type: 'SET_STATUS', payload: 'unlocked' });

      // 检测 WebAuthn
      const available = await isPlatformAuthAvailable();
      dispatch({ type: 'SET_WEBAUTHN_AVAILABLE', payload: available });
      const registered = await hasWebAuthn(folder);
      dispatch({ type: 'SET_WEBAUTHN_REGISTERED', payload: registered });

      return true;
    } catch {
      setError('解锁失败，请重试');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  // ---- 解锁保险箱（WebAuthn） ----
  const unlockWithWebAuthn = useCallback(async (
    folder: FileSystemDirectoryHandle,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const password = await decryptWithWebAuthn(folder);
      if (!password) {
        setError('生物识别验证失败');
        return false;
      }
      return await unlock(folder, password);
    } catch {
      setError('生物识别解锁失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, unlock]);

  // ---- 锁定 ----
  const lock = useCallback(() => {
    masterKeyRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  // ---- 加密并持久化索引 ----
  const saveIndex = useCallback(async (tree: VaultNode[]) => {
    if (!state.vaultFolder || !masterKeyRef.current) return;
    dispatch({ type: 'SET_TREE', payload: tree });
    const root = tree[0] as FolderNode | undefined;
    const index: VaultIndex = { version: 3, tree, rootId: root?.id ?? state.rootId };
    const ok = await writeIndex(state.vaultFolder, index, masterKeyRef.current);
    if (!ok) setError('保存索引失败');
  }, [state.vaultFolder, state.rootId, setError]);

  // ---- 添加外部文件 ----
  const addFile = useCallback(async (file: File) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return;
    setLoading(true);
    try {
      const id = generateUUID();
      const parent = state.currentFolderId ? (findNode(state.tree, state.currentFolderId) as FolderNode | null) : (state.tree[0] as FolderNode | null);
      const encrypt = parent ? parent.encrypted : false;

      let encPath: string;
      let newNode: FileNode;

      if (encrypt) {
        const fileKey = await generateFileKey();
        const plaintext = await file.arrayBuffer();
        const fileIv = await storeEncryptedFile(state.vaultFolder, id, plaintext, fileKey);
        const { encryptedKey, iv } = await wrapFileKey(fileKey, masterKey);
        encPath = `data/${id}.enc`;
        newNode = {
          id, name: file.name, type: 'file',
          origin: 'import' as FileOrigin,
          mimeType: file.type || 'application/octet-stream',
          size: file.size, createdAt: Date.now(), modifiedAt: file.lastModified,
          encPath, encryptedKey, iv, fileIv,
        };
      } else {
        const data = await file.arrayBuffer();
        await writePlainFile(state.vaultFolder, id, data);
        encPath = `plain/${id}.bin`;
        newNode = {
          id, name: file.name, type: 'file',
          origin: 'import' as FileOrigin,
          mimeType: file.type || 'application/octet-stream',
          size: file.size, createdAt: Date.now(), modifiedAt: file.lastModified,
          encPath,
        };
      }

      const newTree = cloneTree(state.tree);
      insertNode(newTree, newNode, state.currentFolderId);
      await saveIndex(newTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加文件失败');
    } finally {
      setLoading(false);
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, state.currentFolderId, saveIndex, setError, setLoading]);

  // ---- 创建纯文本笔记 ----
  const createNote = useCallback(async (name: string, parentId: string | null) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return;
    setLoading(true);
    try {
      const id = generateUUID();
      const fileKey = await generateFileKey();
      const plaintext = new TextEncoder().encode('');
      const fileIv = await storeEncryptedFile(state.vaultFolder, id, plaintext, fileKey);
      const { encryptedKey, iv } = await wrapFileKey(fileKey, masterKey);

      const newNode: FileNode = {
        id, name: `${name}.txt`, type: 'file',
        origin: 'note', mimeType: NOTE_MIME_TYPE,
        size: 0, createdAt: Date.now(), modifiedAt: Date.now(),
        encPath: `data/${id}.enc`, encryptedKey, iv, fileIv,
      };

      const newTree = cloneTree(state.tree);
      insertNode(newTree, newNode, parentId ?? state.rootId);
      await saveIndex(newTree);
      dispatch({ type: 'SET_EDITING_FILE', payload: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建笔记失败');
    } finally {
      setLoading(false);
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, state.rootId, saveIndex, setError, setLoading]);

  // ---- 创建密码本 ----
  const createPasswordBook = useCallback(async (
    name: string,
    parentId: string | null,
    _folderPassword?: string,
  ) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return;
    try {
      // 密码本必须在加密文件夹中
      const encryptParent = parentId 
        ? (findNode(state.tree, parentId) as FolderNode | null)
        : null;
      if (!encryptParent || encryptParent.type !== 'folder' || !encryptParent.encrypted) {
        const msg = '密码本必须存放在加密文件夹中，请先创建加密文件夹'; setError(msg); throw new Error(msg);
      }
      if (!state.folderAccess[encryptParent.id]) {
        const msg = '请先解锁该加密文件夹'; setError(msg); throw new Error(msg);
      }

      setLoading(true);
      const id = generateUUID();
      const fileKey = await generateFileKey();
      const plaintext = new TextEncoder().encode('[]');
      const fileIv = await storeEncryptedFile(state.vaultFolder, id, plaintext, fileKey);
      const { encryptedKey, iv } = await wrapFileKey(fileKey, masterKey);

      const newNode: FileNode = {
        id, name: `${name}.pbook`, type: 'file',
        origin: 'password-book', mimeType: PASSWORD_BOOK_MIME_TYPE,
        size: 0, createdAt: Date.now(), modifiedAt: Date.now(),
        encPath: `data/${id}.enc`, encryptedKey, iv, fileIv,
      };

      const newTree = cloneTree(state.tree);
      insertNode(newTree, newNode, parentId ?? state.rootId);
      await saveIndex(newTree);
      dispatch({ type: 'SET_EDITING_FILE', payload: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建密码本失败');
    } finally {
      setLoading(false);
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, saveIndex, setError, setLoading]);

  // ---- 删除节点 ----
  const deleteNode = useCallback(async (id: string) => {
    if (!state.vaultFolder) {  return; }
    const node = findNode(state.tree, id);
    if (!node) {  return; }

    const newTree = cloneTree(state.tree);
    removeNode(newTree, id);

    const deleteFile = async (n: VaultNode) => {
      if (n.type !== 'file') return;
      const parts = n.encPath.split('/');
      const uuid = parts[parts.length - 1].replace('.enc', '').replace('.bin', '');
      if (n.encPath.startsWith('data/')) {
        await deleteEncryptedFile(state.vaultFolder!, uuid);
      } else {
        await deletePlainFile(state.vaultFolder!, uuid);
      }
    };

    if (node.type === 'file') {
      await deleteFile(node);
    } else {
      const delFolder = async (n: VaultNode) => {
        if (n.type === 'file') {
          await deleteFile(n);
        } else {
          for (const child of n.children) await delFolder(child);
        }
      };
      await delFolder(node);
    }

    await saveIndex(newTree);
  }, [state.vaultFolder, state.tree, saveIndex]);

  // ---- 获取文件 Blob（解密后，用于预览/编辑） ----
  const getFileBlob = useCallback(async (
    id: string,
  ): Promise<{ blob: Blob; name: string } | null> => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return null;

    const node = findNode(state.tree, id);
    if (!node || node.type !== 'file') return null;

    try {
      const uuid = node.encPath.split('/').pop()?.split('.')[0] ?? id;

      if (node.encryptedKey) {
        const fileKey = await unwrapFileKey(node.encryptedKey, node.iv!, masterKey);
        const { data } = await readEncryptedFile(state.vaultFolder, uuid, fileKey);
        const blob = new Blob([data], { type: node.mimeType });
        return { blob, name: node.name };
      } else {
        const data = await readPlainFile(state.vaultFolder, uuid);
        const blob = new Blob([data], { type: node.mimeType });
        return { blob, name: node.name };
      }
    } catch {
      setError('文件读取失败');
      return null;
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, setError]);

  // ---- 导出文件（解密并下载） ----
  const exportFile = useCallback(async (id: string) => {
    const result = await getFileBlob(id);
    if (!result) return;

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getFileBlob]);

  // ---- 重命名 ----
  const renameNode = useCallback(async (id: string, newName: string) => {
    const newTree = cloneTree(state.tree) as VaultNode[];
    const node = findNode(newTree, id);
    if (!node) return;
    node.name = newName;
    await saveIndex(newTree);
  }, [state.tree, saveIndex]);

  // ---- 移动节点 ----
  const moveNode = useCallback(async (id: string, targetFolderId: string | null) => {
    const newTree = cloneTree(state.tree);
    const node = removeNode(newTree, id);
    if (!node) return;
    insertNode(newTree, node, targetFolderId ?? state.rootId);
    await saveIndex(newTree);
  }, [state.tree, state.rootId, saveIndex]);

  // ---- 添加文件夹 ----
  const addFolder = useCallback(async (
    name: string,
    encrypted: boolean,
    parentId: string | null,
    password?: string,
    hint?: string,
  ) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return;
    setLoading(true);
    try {
      const id = generateUUID();
      const newFolder: FolderNode = {
        id, name, type: 'folder', encrypted,
        createdAt: Date.now(),
        children: [],
      };

      if (encrypted && password) {
        const folderSalt = generateSalt();
        const hash = await derivePasswordHash(password, folderSalt.buffer);
        const { encryptedHash, iv } = await encryptPasswordHash(hash, masterKey);
        newFolder.passwordHash = encryptedHash;
        newFolder.passwordHashIv = iv;
        newFolder.passwordHashSalt = folderSalt;
        if (hint) newFolder.passwordHint = hint;
        newFolder.unlockTimeout = 30 * 60 * 1000; // 默认 30 分钟
      }

      const newTree = cloneTree(state.tree);
      insertNode(newTree, newFolder, parentId ?? state.rootId);
      await saveIndex(newTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建文件夹失败');
    } finally {
      setLoading(false);
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, state.rootId, saveIndex, setError, setLoading]);

  // ---- 切换文件夹类型（加密/普通） ----
  const changeFolderType = useCallback(async (folderId: string, encrypted: boolean, password?: string, hint?: string) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return;
    setLoading(true);
    try {
      const newTree = cloneTree(state.tree) as VaultNode[];
      const folder = findNode(newTree, folderId) as FolderNode | null;
      if (!folder || folder.type !== 'folder') return;
      const targetNodes = folder.children;

      const processFiles = async (nodes: VaultNode[]): Promise<void> => {
        for (const node of nodes) {
          if (node.type === 'file') {
            const file = node as FileNode;
            const parts = file.encPath.split('/');
            const uuid = parts[parts.length - 1].replace('.enc', '').replace('.bin', '');

            if (encrypted && !file.encryptedKey) {
              const data = await readPlainFile(state.vaultFolder!, uuid);
              await deletePlainFile(state.vaultFolder!, uuid);
              const fileKey = await generateFileKey();
              const fileIv = await storeEncryptedFile(state.vaultFolder!, uuid, data, fileKey);
              const { encryptedKey, iv } = await wrapFileKey(fileKey, masterKey);
              file.encPath = `data/${uuid}.enc`;
              file.encryptedKey = encryptedKey;
              file.iv = iv;
              file.fileIv = fileIv;
            } else if (!encrypted && file.encryptedKey) {
              const fk = await unwrapFileKey(file.encryptedKey, file.iv!, masterKey);
              const { data } = await readEncryptedFile(state.vaultFolder!, uuid, fk);
              await deleteEncryptedFile(state.vaultFolder!, uuid);
              await writePlainFile(state.vaultFolder!, uuid, data);
              file.encPath = `plain/${uuid}.bin`;
              delete file.encryptedKey;
              delete file.iv;
              delete file.fileIv;
            }
          } else {
            await processFiles(node.children);
          }
        }
      };

      await processFiles(targetNodes);
      folder.encrypted = encrypted;

      // 设置或清除密码哈希
      if (encrypted && password) {
        const folderSalt = generateSalt();
        const hash = await derivePasswordHash(password, folderSalt.buffer);
        const { encryptedHash, iv } = await encryptPasswordHash(hash, masterKey);
        folder.passwordHash = encryptedHash;
        folder.passwordHashIv = iv;
        folder.passwordHashSalt = folderSalt;
        if (hint) folder.passwordHint = hint;
        folder.unlockTimeout = 30 * 60 * 1000;
      } else if (!encrypted) {
        delete folder.passwordHash;
        delete folder.passwordHashIv;
        delete folder.passwordHashSalt;
        delete folder.passwordHint;
        delete folder.unlockTimeout;
      }

      await saveIndex(newTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换类型失败');
    } finally {
      setLoading(false);
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, saveIndex, setError, setLoading]);

  // ---- 修改加密文件夹密码 ----
  const changeFolderPassword = useCallback(async (folderId: string, newPassword: string, hint?: string) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return;
    setLoading(true);
    try {
      const newTree = cloneTree(state.tree) as VaultNode[];
      const folder = findNode(newTree, folderId) as FolderNode | null;
      if (!folder || !folder.encrypted) return;
      const folderSalt = generateSalt();
      const hash = await derivePasswordHash(newPassword, folderSalt.buffer);
      const { encryptedHash, iv } = await encryptPasswordHash(hash, masterKey);
      folder.passwordHash = encryptedHash;
      folder.passwordHashIv = iv;
      folder.passwordHashSalt = folderSalt;
      if (hint) folder.passwordHint = hint;
      else delete folder.passwordHint;
      await saveIndex(newTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改文件夹密码失败');
    } finally {
      setLoading(false);
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, saveIndex, setError, setLoading]);

  const toggleRootEncrypted = useCallback(async (password?: string, hint?: string) => {
    const root = state.tree[0] as FolderNode | undefined;
    if (!root) return;
    await changeFolderType(root.id, !root.encrypted, password, hint);
  }, [changeFolderType, state.tree]);

  // ---- 修改主密码 ----
  const changePassword = useCallback(async (
    _oldPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    const oldKey = masterKeyRef.current;
    if (!oldKey || !state.vaultFolder) return false;
    setLoading(true);
    try {
      // 验证旧密码：尝试解密索引
      const index = await readIndex(state.vaultFolder, oldKey);
      if (!index) {
        setError('旧密码错误');
        return false;
      }

      // 读取 salt，派生新密钥
      const metaDir = await getMetaDir(state.vaultFolder);
      const saltHandle = await metaDir.getFileHandle('salt');
      const saltFile = await saltHandle.getFile();
      const saltBase64 = await saltFile.text();
      const saltBinary = atob(saltBase64);
      const salt = new Uint8Array(saltBinary.length);
      for (let i = 0; i < saltBinary.length; i++) salt[i] = saltBinary.charCodeAt(i);

      const newKey = await deriveMasterKey(newPassword, salt.buffer);

      // 遍历所有文件，重新加密文件密钥
      const walkAndReEncrypt = async (nodes: VaultNode[]): Promise<VaultNode[]> => {
        const result: VaultNode[] = [];
        for (const node of nodes) {
          if (node.type === 'file') {
            if (!node.encryptedKey) { result.push(node); continue; }
            const fileKey = await unwrapFileKey(node.encryptedKey, node.iv!, oldKey);
            const { encryptedKey, iv } = await wrapFileKey(fileKey, newKey);
            result.push({ ...node, encryptedKey, iv });
          } else {
            const newNode: FolderNode = { ...node, children: await walkAndReEncrypt(node.children) };
            // 如果文件夹有密码哈希，重新加密
            if (node.passwordHash && node.passwordHashIv) {
              const hash = await decryptPasswordHash(node.passwordHash, node.passwordHashIv, oldKey);
              const { encryptedHash, iv } = await encryptPasswordHash(hash, newKey);
              newNode.passwordHash = encryptedHash;
              newNode.passwordHashIv = iv;
            }
            result.push(newNode);
          }
        }
        return result;
      };

      const newTree = await walkAndReEncrypt(state.tree);
      const newIndex: VaultIndex = { version: 3, tree: newTree, rootId: state.rootId };
      await writeIndex(state.vaultFolder, newIndex, newKey);

      masterKeyRef.current = newKey;
      dispatch({ type: 'SET_TREE', payload: newTree });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, setError, setLoading]);

  // ---- 注册生物识别 ----
  const registerBiometric = useCallback(async (password: string): Promise<boolean> => {
    if (!state.vaultFolder || !state.webauthnAvailable) return false;
    try {
      const { credentialId, prfSalt } = await registerWebAuthn();
      await saveWebAuthnInfo(state.vaultFolder, credentialId, prfSalt);
      await encryptWithWebAuthn(state.vaultFolder, credentialId, prfSalt, password);
      dispatch({ type: 'SET_WEBAUTHN_REGISTERED', payload: true });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '生物识别注册失败');
      return false;
    }
  }, [state.vaultFolder, state.webauthnAvailable, setError]);

  // ---- 内部：验证文件夹密码 ----
  const verifyFolderPasswordInternal = useCallback(async (
    folder: FolderNode,
    password: string,
    masterKey: CryptoKey,
  ): Promise<boolean> => {
    if (!folder.passwordHash || !folder.passwordHashIv || !folder.passwordHashSalt) return true; // 非加密文件夹

    const storedHash = await decryptPasswordHash(folder.passwordHash, folder.passwordHashIv, masterKey);

    const inputHash = await derivePasswordHash(password, folder.passwordHashSalt.buffer);

    // 比对
    const a = new Uint8Array(storedHash);
    const b = new Uint8Array(inputHash);
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }, []);

  // ---- 验证文件夹密码（公开接口） ----
  const verifyFolderPassword = useCallback(async (
    folderId: string,
    password: string,
  ): Promise<boolean> => {
    const masterKey = masterKeyRef.current;
    if (!masterKey) return false;
    const folder = findNode(state.tree, folderId);
    if (!folder || folder.type !== 'folder') return false;

    const valid = await verifyFolderPasswordInternal(folder, password, masterKey);
    if (valid) {
      // 缓存访问权限
      const newAccess = { ...state.folderAccess };
      const timeout = folder.unlockTimeout ?? 30 * 60 * 1000;
      newAccess[folderId] = timeout === -1 ? Infinity : Date.now() + timeout;
      dispatch({ type: 'SET_FOLDER_ACCESS', payload: newAccess });
    }
    return valid;
  }, [masterKeyRef, state.tree, state.folderAccess, verifyFolderPasswordInternal]);

  // ---- 设置文件夹免密时长 ----
  const setFolderUnlockTimeout = useCallback(async (
    folderId: string,
    timeoutMs: number,
  ) => {
    const newTree = cloneTree(state.tree) as VaultNode[];
    const folder = findNode(newTree, folderId);
    if (folder && folder.type === 'folder') {
      folder.unlockTimeout = timeoutMs;
      await saveIndex(newTree);
    }
  }, [state.tree, saveIndex]);

  // ---- 排序 ----
  const setSortBy = useCallback((sortBy: SortField, sortOrder: SortOrder) => {
    dispatch({ type: 'SET_SORT', payload: { sortBy, sortOrder } });
  }, []);

  // ---- 搜索 ----
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    if (query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: searchNodes(state.tree, query) });
    } else {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    }
  }, [state.tree]);

  // ---- 批量操作 ----
  const toggleBatchMode = useCallback(() => {
    dispatch({ type: 'SET_BATCH_MODE', payload: !state.batchMode });
  }, [state.batchMode]);

  const toggleFileSelection = useCallback((id: string) => {
    const selected = state.selectedFileIds.includes(id)
      ? state.selectedFileIds.filter((fid) => fid !== id)
      : [...state.selectedFileIds, id];
    dispatch({ type: 'SET_SELECTED_FILES', payload: selected });
  }, [state.selectedFileIds]);

  const batchDelete = useCallback(async () => {
    for (const id of state.selectedFileIds) {
      await deleteNode(id);
    }
    dispatch({ type: 'SET_BATCH_MODE', payload: false });
  }, [state.selectedFileIds, deleteNode]);

  const batchExport = useCallback(async () => {
    for (const id of state.selectedFileIds) {
      await exportFile(id);
    }
  }, [state.selectedFileIds, exportFile]);

  
  // ---- 导航到文件夹 ----
  const setCurrentFolder = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_FOLDER', payload: id });
  }, []);


  const setEditingFile = useCallback((id: string | null) => {
    dispatch({ type: 'SET_EDITING_FILE', payload: id });
  }, []);

  
  // ---- 保存文件内容（用于笔记和密码本编辑） ----
  const saveFileContent = useCallback(async (fileId: string, content: string) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !state.vaultFolder) return;
    try {
      const node = findNode(state.tree, fileId);
      if (!node || node.type !== 'file' || !node.encryptedKey) return;

      const fileKey = await unwrapFileKey(node.encryptedKey, node.iv!, masterKey);
      const uuid = node.encPath.replace('data/', '').replace('.enc', '');
      const plaintext = new TextEncoder().encode(content);
      const newIv = await storeEncryptedFile(state.vaultFolder, uuid, plaintext, fileKey);

      // 更新节点元数据（使用不可变模式）
      const updateNode = (nodes: VaultNode[]): VaultNode[] =>
        nodes.map((n) => {
          if (n.type === 'file' && n.id === fileId) {
            return {
              ...n,
              size: plaintext.byteLength,
              modifiedAt: Date.now(),
              fileIv: newIv,
            };
          }
          if (n.type === 'folder') {
            return { ...n, children: updateNode(n.children) };
          }
          return n;
        });

      const newTree = updateNode(state.tree);
      await saveIndex(newTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  }, [masterKeyRef, state.vaultFolder, state.tree, saveIndex, setError]);


  const clearError = useCallback(() => setError(null), [setError]);

  const getRootFolder = useCallback((): FolderNode | null => {
    return (state.tree[0] as FolderNode) ?? null;
  }, [state.tree]);

  const value: VaultContextValue = {
    state,
    init, unlock, unlockWithWebAuthn, lock,
    addFile, createNote, createPasswordBook, deleteNode,
    getFileBlob, exportFile,
    renameNode, moveNode, addFolder, getRootFolder, changeFolderType, changeFolderPassword, toggleRootEncrypted,
    changePassword, registerBiometric,
    verifyFolderPassword, setFolderUnlockTimeout,
    setSortBy, setSearchQuery,
    toggleBatchMode, toggleFileSelection, batchDelete, batchExport,
    setCurrentFolder, setEditingFile, saveFileContent, clearError,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault 必须在 VaultProvider 内使用');
  return ctx;
}
