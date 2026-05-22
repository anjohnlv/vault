/**
 * 笔记编辑/预览组件
 * 用于 PreviewModal，支持纯文本笔记的查看和保存
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';

interface NoteEditorProps {
  blob: Blob;
  onSave: (content: string) => Promise<void>;
}

export function NoteEditor({ blob, onSave }: NoteEditorProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number>(0);
  const dirtyRef = useRef(false);

  useEffect(() => {
    blob.text().then(setText);
  }, [blob]);

  // 防抖自动保存（30 秒）
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (dirtyRef.current) {
        setSaving(true);
        await onSave(text);
        setSaving(false);
        setDirty(false);
        dirtyRef.current = false;
      }
    }, 30000);
  }, [text, onSave]);

  // 关闭前保存
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (dirtyRef.current) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  const handleChange = (value: string) => {
    setText(value);
    setDirty(true);
    dirtyRef.current = true;
    debouncedSave();
  };

  const handleManualSave = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    await onSave(text);
    setSaving(false);
    setDirty(false);
    dirtyRef.current = false;
  };

  return (
    <div className="note-editor">
      <div className="note-editor__header">
        <span className="note-editor__status">
          {saving ? '保存中...' : dirty ? '未保存' : '已保存'}
        </span>
        <Button size="sm" onClick={handleManualSave} disabled={!dirty || saving}>
          保存
        </Button>
      </div>
      <textarea
        className="note-editor__textarea"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="输入文本..."
      />
    </div>
  );
}
