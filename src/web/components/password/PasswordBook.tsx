/**
 * 密码本页面组件
 * 用于 PreviewModal，展示和管理密码条目（支持自动保存、模糊搜索、原地编辑）
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Input as AntInput, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { LockOutlined } from '@ant-design/icons';
import type { PasswordEntry } from '../../../core/types';
import { PasswordEntryCard } from './PasswordEntryCard';
import { generateUUID } from '../../../core/utils/format';

interface Props {
  entries: PasswordEntry[];
  onSave: (entries: PasswordEntry[]) => Promise<void>;
}

export function PasswordBook({ entries: initialEntries, onSave }: Props) {
  const [entries, setEntries] = useState<PasswordEntry[]>(initialEntries);
  const [search, setSearch] = useState('');
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      onSaveRef.current(entriesRef.current);
    }, 500);
  }, []);

  // 组件卸载前执行最后一次保存
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (entriesRef.current.length > 0) {
          onSaveRef.current(entriesRef.current);
        }
      }
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q),
    );
  }, [entries, search]);

  const handleAdd = () => {
    const id = generateUUID();
    setNewEntryId(id);
    setEntries((prev) => [
      {
        id,
        name: '',
        username: '',
        password: '',
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleSaveEntry = (entry: PasswordEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
    if (entry.id === newEntryId) {
      setNewEntryId(null);
    }
    debouncedSave();
  };

  const handleCancelNew = () => {
    if (!newEntryId) return;
    setEntries((prev) => prev.filter((e) => e.id !== newEntryId));
    setNewEntryId(null);
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const next = entries.filter((e) => e.id !== id);
    onSaveRef.current(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
  };

  return (
    <div className="password-book">
      <div className="password-book__header">
        <div className="password-book__badge">
          <LockOutlined /> AES-256-GCM 端到端加密
        </div>
        <div className="password-book__header-right">
          <AntInput.Search
            className="password-book__search"
            placeholder="搜索条目..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="password-book__empty">
          {search
            ? '无匹配条目'
            : '密码本为空，点击「添加」创建第一条密码'}
        </p>
      ) : (
        <div className="password-book__list">
          {filtered.map((e) => (
            <PasswordEntryCard
              key={e.id}
              entry={e}
              onSave={handleSaveEntry}
              onDelete={handleDelete}
              initialEditing={e.id === newEntryId}
              onCancelNew={handleCancelNew}
            />
          ))}
        </div>
      )}
    </div>
  );
}
