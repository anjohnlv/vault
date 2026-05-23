/**
 * 纯文本文件后缀名统一管理
 * 默认值 + 用户自定义（持久化到 IndexedDB），通过 getTextExtensions() 获取当前生效的列表
 */
import {
  getCustomTextExtensions,
  saveCustomTextExtensions,
  resetCustomTextExtensions,
} from '../storage/textMimeTypes';

/** 默认文本文件后缀名（不含前导 .） */
export const DEFAULT_TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown',
  'json', 'xml', 'yml', 'yaml', 'toml',
  'csv', 'tsv',
  'env', 'cfg', 'conf', 'ini', 'properties', 'log',
  'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1',
  'css', 'scss', 'less', 'sass',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts',
  'py', 'rb', 'go', 'java', 'rs', 'swift', 'kt', 'kts',
  'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hxx',
  'sql', 'gradle', 'lock', 'diff', 'patch',
  'html', 'htm', 'svg',
  'vue', 'svelte',
  'makefile', 'dockerfile',
  'gitignore', 'gitkeep', 'editorconfig', 'prettierrc', 'eslintrc',
];

let _currentExtensions: string[] | null = null;

/** 获取当前生效的文本文件后缀名列表（同步） */
export function getTextExtensions(): string[] {
  return _currentExtensions ?? DEFAULT_TEXT_EXTENSIONS;
}

/** 从文件名中提取小写后缀名 */
export function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

/** 判断文件名是否匹配配置的文本后缀 */
export function isTextFileName(fileName: string): boolean {
  const ext = getExtension(fileName);
  return getTextExtensions().includes(ext);
}

/** 初始化（从 IndexedDB 加载用户自定义列表） */
export async function initTextExtensions(): Promise<void> {
  const stored = await getCustomTextExtensions();
  _currentExtensions = stored ?? null;
}

/** 保存用户自定义列表并更新缓存 */
export async function setTextExtensions(exts: string[]): Promise<void> {
  await saveCustomTextExtensions(exts);
  _currentExtensions = exts;
}

/** 重置为默认列表 */
export async function resetTextExtensions(): Promise<void> {
  await resetCustomTextExtensions();
  _currentExtensions = null;
}
