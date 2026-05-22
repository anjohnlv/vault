/**
 * 密码本页面组件
 * 用于 PreviewModal，展示和管理密码条目（增删改、模糊搜索）
 */
import { useState, useCallback, useMemo } from 'react';
import type { PasswordEntry } from '../../types';
import { PasswordEntryForm } from './PasswordEntryForm';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface Props {
  entries: PasswordEntry[];
  onSave: (entries: PasswordEntry[]) => Promise<void>;
}

export function PasswordBook({ entries: initialEntries, onSave }: Props) {
  const [entries, setEntries] = useState<PasswordEntry[]>(initialEntries);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast(`${label}已复制`, 'success');
    },
    [toast],
  );

  const handleSaveEntry = useCallback(
    (entry: PasswordEntry) => {
      const updated = editingId
        ? entries.map((e) => (e.id === editingId ? entry : e))
        : [...entries, entry];
      setEntries(updated);
      setEditingId(null);
      setAdding(false);
    },
    [entries, editingId],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm('确定要删除此条目吗？')) return;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [],
  );

  const handlePersist = async () => {
    setSaving(true);
    await onSave(entries);
    setSaving(false);
    toast('密码本已保存', 'success');
  };

  if (adding) {
    return (
      <div className="password-book">
        <h3 className="password-book__heading">添加密码条目</h3>
        <PasswordEntryForm
          entry={null}
          onSave={handleSaveEntry}
          onCancel={() => setAdding(false)}
        />
      </div>
    );
  }

  if (editingId) {
    const entry = entries.find((e) => e.id === editingId);
    return (
      <div className="password-book">
        <h3 className="password-book__heading">编辑密码条目</h3>
        <PasswordEntryForm
          entry={entry ?? null}
          onSave={handleSaveEntry}
          onCancel={() => setEditingId(null)}
        />
      </div>
    );
  }

  return (
    <div className="password-book">
      <div className="password-book__header">
        <input
          className="search-bar__input"
          type="text"
          placeholder="搜索条目..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button size="sm" onClick={() => setAdding(true)}>
          + 添加
        </Button>
        <Button size="sm" variant="outline" onClick={handlePersist} loading={saving}>
          保存
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="password-book__empty">
          {search ? '无匹配条目' : '密码本为空，点击"添加"创建第一条'}
        </p>
      ) : (
        <div className="password-book__list">
          {filtered.map((e) => (
            <div key={e.id} className="pw-entry">
              <div className="pw-entry__info">
                <span className="pw-entry__name">{e.name}</span>
                {e.notes && (
                  <span className="pw-entry__notes">{e.notes}</span>
                )}
              </div>
              <div className="pw-entry__fields">
                <button
                  className="pw-entry__field"
                  onClick={() => handleCopy(e.username, '用户名')}
                  title="点击复制用户名"
                >
                  👤 {e.username || '(无)'}
                </button>
                <button
                  className="pw-entry__field pw-entry__field--password"
                  onClick={() => handleCopy(e.password, '密码')}
                  title="点击复制密码"
                >
                  🔑{' '}
                  {visiblePasswords.has(e.id) ? e.password : '••••••'}
                </button>
                <button
                  className="pw-entry__toggle"
                  onClick={() => togglePassword(e.id)}
                  title={visiblePasswords.has(e.id) ? '隐藏密码' : '显示密码'}
                >
                  {visiblePasswords.has(e.id) ? '🙈' : '👁'}
                </button>
              </div>
              <div className="pw-entry__actions">
                <button
                  className="file-item__btn"
                  title="编辑"
                  onClick={() => setEditingId(e.id)}
                >
                  ✏️
                </button>
                <button
                  className="file-item__btn"
                  title="删除"
                  onClick={() => handleDelete(e.id)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
