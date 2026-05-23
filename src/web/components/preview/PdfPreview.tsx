/**
 * PDF 文件预览组件
 * 用于 PreviewModal，通过 <iframe> 加载并渲染 PDF 文件
 */
import { useEffect, useState } from 'react';

interface PdfPreviewProps {
  blob: Blob;
}

export function PdfPreview({ blob }: PdfPreviewProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  return (
    <iframe
      className="pdf-preview"
      src={url}
      title="PDF 预览"
    />
  );
}
