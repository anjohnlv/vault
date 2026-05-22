/** 文件来源类型 */
export type FileOrigin = 'import' | 'note' | 'password-book';

/** 保险箱生命周期状态 */
export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';

/** 排序字段 */
export type SortField = 'name' | 'size' | 'modifiedAt';

/** 排序方向 */
export type SortOrder = 'asc' | 'desc';

/** 密码条目 */
export interface PasswordEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

/** 文件夹节点 */
export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  encrypted: boolean;
  createdAt: number;
  /** 仅加密文件夹：PBKDF2 密码哈希，由主密钥加密存储 */
  passwordHash?: ArrayBuffer;
  passwordHashIv?: Uint8Array;
  /** 仅加密文件夹：HKDF 派生用盐值 */
  passwordHashSalt?: Uint8Array;
  /** 仅加密文件夹：密码提示 */
  passwordHint?: string;
  /** 免密时长（毫秒）：0=始终验证，-1=直到锁定，正数=超时毫秒 */
  unlockTimeout?: number;
  children: VaultNode[];
}

/** 文件节点 */
export interface FileNode {
  id: string;
  name: string;
  type: 'file';
  origin: FileOrigin;
  mimeType: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
  encPath: string;
  /** 加密文件夹下的文件才有以下字段 */
  encryptedKey?: ArrayBuffer;
  iv?: Uint8Array;
  fileIv?: Uint8Array;
}

/** 树节点（文件夹或文件） */
export type VaultNode = FolderNode | FileNode;

/** 加密索引 */
export interface VaultIndex {
  version: number;
  tree: VaultNode[];
  /** v3+：根文件夹 ID，tree[0] 总是根文件夹节点 */
  rootId?: string;
}

/** WebAuthn 认证数据 */
export interface AuthData {
  encryptedPassword: ArrayBuffer;
  iv: Uint8Array;
  credentialId: string;
}
