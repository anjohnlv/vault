import { useCallback, useState } from 'react';

/**
 * 剪贴板复制 hook
 * @returns { copy, copied } — copy 函数和是否刚刚复制过
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    }
  }, [resetDelay]);

  return { copy, copied };
}
