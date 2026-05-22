/**
 * 文本文件预览组件
 * 用于 PreviewModal，渲染纯文本/代码文件内容
 */
import { useEffect, useState } from 'react';

interface TextPreviewProps {
  blob: Blob;
}

export function TextPreview({ blob }: TextPreviewProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    blob.text().then(setText);
  }, [blob]);

  return (
    <pre className="text-preview">{text}</pre>
  );
}
