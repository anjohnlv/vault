/**
 * 设置文件夹密码弹窗
 * 用于 FolderTree/Sidebar，加密文件夹时设置密码（含密码确认与提示）
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  folderName?: string;
  tips?: ReactNode;
  title?: string;
  description?: string;
  loading?: boolean;
  error?: string;
  onConfirm: (password: string, hint?: string) => void | Promise<void>;
  onClose: () => void;
}

export function SetPasswordModal({
  open,
  folderName,
  tips,
  title,
  description,
  loading: externalLoading,
  error: externalError,
  onConfirm,
  onClose,
}: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [internalError, setInternalError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);
  const error = externalError ?? internalError;
  const loading = externalLoading ?? internalLoading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInternalError('');
    if (!password) {
      setInternalError('请输入密码');
      return;
    }
    if (password !== confirmPassword) {
      setInternalError('两次输入的密码不一致');
      return;
    }
    setInternalLoading(true);
    try {
      await onConfirm(password, hint);
      setPassword('');
      setConfirmPassword('');
      setHint('');
      onClose();
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : '设置密码失败');
    } finally {
      setInternalLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setHint('');
    setInternalError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={title ?? (folderName ? `请为文件夹「${folderName}」设置密码` : '设置密码')} width="sm">
      <form onSubmit={handleSubmit} className="modal-form pwd-modal">
        {description && <p className="pwd-modal__desc">{description}</p>}
        {tips && <p className="pwd-modal__desc">{tips}</p>}
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          autoFocus
        />
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="请再次输入密码"
        />
        <Input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="密码提示（可选）"
        />
        {error && <p className="form-error">{error}</p>}
        <Button htmlType="submit" loading={loading} disabled={loading}>
          确认
        </Button>
      </form>
    </Modal>
  );
}
