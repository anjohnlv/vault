/**
 * 选择保险箱目录入口组件
 * 用于 UnlockScreen，提供"打开保险箱目录"按钮
 */
import { AuthCard } from './AuthCard';

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
  return (
    <AuthCard title="Vault" subtitle="本地加密保险箱">
      <button
        className="auth-card__cta"
        onClick={onSelectFolder}
        disabled={loading}
      >
        <span className="auth-card__cta-plus">+</span>
        新建保险箱
      </button>
      {error && <p className="form-error">{error}</p>}
    </AuthCard>
  );
}
