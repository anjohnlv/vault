/**
 * 验证文件夹密码弹窗
 * 用于 FolderTree/Sidebar，解密或解锁加密文件夹时验证密码（含密码提示与解锁说明）
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  folderName: string;
  hint?: string;
  tips?: ReactNode;
  loading?: boolean;
  error?: string;
  onConfirm: (password: string) => void | Promise<void>;
  onClose: () => void;
}

export function VerifyPasswordModal({
  open,
  folderName,
  hint,
  tips,
  loading: externalLoading,
  error: externalError,
  onConfirm,
  onClose,
}: Props) {
  const [password, setPassword] = useState('');
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
    setInternalLoading(true);
    try {
      await onConfirm(password);
      setPassword('');
      onClose();
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : '密码错误');
    } finally {
      setInternalLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setInternalError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`请输入文件夹「${folderName}」密码`} width="sm">
      <form onSubmit={handleSubmit} className="modal-form pwd-modal">
        {tips && <p className="pwd-modal__desc">{tips}</p>}
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          error={error}
          autoFocus
          suffix={hint ? (
            <Tooltip title={`密码提示：${hint}`}>
              <QuestionCircleOutlined style={{ fontSize: 13, color: 'var(--color-text-tertiary, #666)', cursor: 'pointer' }} />
            </Tooltip>
          ) : undefined}
        />
        <Button htmlType="submit" loading={loading} disabled={!password || loading}>
          确认
        </Button>
      </form>
    </Modal>
  );
}
