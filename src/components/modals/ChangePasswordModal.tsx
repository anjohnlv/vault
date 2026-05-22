/**
 * 修改主密码弹窗
 * 用于 VaultScreen 设置面板，修改保险箱主密码
 */
import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useVault } from '../../context/VaultContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const { changePassword } = useVault();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPwd !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    const ok = await changePassword(oldPwd, newPwd);
    setLoading(false);
    if (ok) {
      onClose();
    } else {
      setError('修改失败，请检查旧密码');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="修改主密码">
      <form onSubmit={handleSubmit} className="modal-form pwd-modal">
        <Input label="旧密码" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
        <Input label="新密码" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        <Input label="确认新密码" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <Button htmlType="submit" loading={loading} disabled={!oldPwd || !newPwd || !confirm}>
          确认修改
        </Button>
      </form>
    </Modal>
  );
}
