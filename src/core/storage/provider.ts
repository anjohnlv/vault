/**
 * 平台无关的保险箱存储接口
 *
 * 桌面端: WebStorageProvider 封装 File System Access API
 * 移动端: CapacitorStorageProvider 封装 @capacitor/filesystem
 *
 * 所有路径相对于保险箱根目录，例如:
 *   '.vault_meta/index.json'
 *   'data/{uuid}.enc'
 *   'plain/{uuid}.bin'
 */
export interface VaultStorageProvider {
  /** 读取文件内容 */
  readFile(path: string): Promise<ArrayBuffer>;

  /** 写入文件（自动创建父目录），覆盖已有文件 */
  writeFile(path: string, data: ArrayBuffer): Promise<void>;

  /** 删除文件，返回 false 表示文件不存在 */
  deleteFile(path: string): Promise<boolean>;

  /** 检查文件是否存在 */
  fileExists(path: string): Promise<boolean>;

  /** 创建保险箱目录结构 (.vault_meta/, plain/, data/) */
  createStructure(): Promise<void>;

  /** 验证是否是有效的保险箱目录 */
  isValid(): Promise<boolean>;
}
