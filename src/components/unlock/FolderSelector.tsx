/**
 * 选择保险箱目录入口组件
 * 用于 UnlockScreen，提供"打开保险箱目录"按钮
 */
import type { MouseEvent } from 'react';
import { LogoIcon } from '../ui/LogoIcon';

interface FolderSelectorProps {
  onSelectFolder: () => void;
  loading: boolean;
  error?: string;
}

export function FolderSelector({
  onSelectFolder,
  loading,
  error,
}: FolderSelectorProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    onSelectFolder();
  };

  return (
    <div className="folder-selector">
      <div className="folder-selector__glow" />

      <LogoIcon size={80} />

      <h2 className="folder-selector__title">Vault</h2>
      <p className="folder-selector__subtitle">你的私人空间，完全由你掌控</p>

      <button
        className="folder-selector__btn"
        onClick={handleClick}
        disabled={loading}
        type="button"
      >
        <span className="folder-selector__btn-plus">+</span>
        新建保险箱
      </button>

      {error && <p className="form-error">{error}</p>}

      <div className="folder-selector__line folder-selector__line--top" />
      <div className="folder-selector__line folder-selector__line--bottom" />
    </div>
  );
}
