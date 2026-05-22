/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 格式化时间戳为本地日期字符串 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

/** 生成 UUID v4 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
