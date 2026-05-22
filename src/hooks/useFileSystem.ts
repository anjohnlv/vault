import { useCallback, useState } from 'react';

/**
 * 文件夹选择 hook
 * 封装 File System Access API 的 showDirectoryPicker
 */
export function useFileSystem() {
  const [isSupported, _setIsSupported] = useState(
    typeof window !== 'undefined' && 'showDirectoryPicker' in window,
  );

  const selectFolder = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!isSupported) return null;
    try {
      return await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });
    } catch {
      // 用户取消选择
      return null;
    }
  }, [isSupported]);

  return { isSupported, selectFolder };
}
