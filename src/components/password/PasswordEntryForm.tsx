/**
 * 密码条目编辑表单组件
 * 用于 PasswordBook，添加或编辑密码条目的表单
 */
import { useState, useEffect, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { generateUUID } from '../../utils/format';
import type { PasswordEntry } from '../../types';

interface Props {
  entry?: PasswordEntry | null;  // null = 新增
  onSave: (entry: PasswordEntry) => void;
  onCancel: () => void;
}

export function PasswordEntryForm({ entry, onSave, onCancel }: Props) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (entry) {
      setName(entry.name);
      setUsername(entry.username);
      setPassword(entry.password);
      setNotes(entry.notes);
    }
  }, [entry]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: entry?.id ?? generateUUID(),
      name: name.trim(),
      username: username.trim(),
      password,
      notes: notes.trim(),
      createdAt: entry?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit}>
      <Input
        label="名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="如：Google 账号"
      />
      <Input
        label="用户名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="邮箱或用户名"
      />
      <Input
        label="密码"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="备注"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button htmlType="submit" disabled={!name.trim()}>保存</Button>
        <Button variant="outline" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}
