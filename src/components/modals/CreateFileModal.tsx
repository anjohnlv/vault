/**
 * 创建文件弹窗
 * 用于 Sidebar/Toolbar（通过 handleAddFile），选择新建笔记、密码本或导入文件
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateNote: (name: string) => Promise<void>;
  onCreatePasswordBook: (name: string) => Promise<void>;
}

export function CreateFileModal({
  open,
  onClose,
  onCreateNote,
  onCreatePasswordBook,
}: Props) {
  const [mode, setMode] = useState<'note' | 'password-book' | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mode || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'note') await onCreateNote(name.trim());
      else await onCreatePasswordBook(name.trim());
      setName(''); setMode(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="新建">
      {!mode ? (
        <div className="modal-form">
          <Button variant="outline" onClick={() => setMode('note')}>
            纯文本笔记
          </Button>
          <Button variant="outline" onClick={() => setMode('password-book')}>
            密码本
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="modal-form">
          <Input
            label={mode === 'note' ? '笔记名称' : '密码本名称'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="form-error">{error}</p>}
          <Button htmlType="submit" loading={submitting} disabled={!name.trim()}>创建</Button>
        </form>
      )}
    </Modal>
  );
}
