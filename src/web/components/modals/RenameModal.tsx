/**
 * 重命名弹窗
 * 用于 FileItem/Sidebar，重命名文件或文件夹
 */
import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function RenameModal({ open, currentName, onClose, onRename }: Props) {
  const [name, setName] = useState(currentName);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onRename(name.trim());
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="重命名">
      <form onSubmit={handleSubmit} className="modal-form">
        <Input label="新名称" value={name} onChange={(e) => setName(e.target.value)} />
        <Button htmlType="submit" disabled={!name.trim()}>确认</Button>
      </form>
    </Modal>
  );
}
