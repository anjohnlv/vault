/**
 * 图片文件预览组件
 * 用于 PreviewModal，渲染图片文件
 */
import { useEffect, useState } from 'react';

interface ImagePreviewProps {
  blob: Blob;
}

export function ImagePreview({ blob }: ImagePreviewProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  return <img className="image-preview" src={url} alt="预览" />;
}
