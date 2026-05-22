/**
 * 纯文本后缀名配置弹窗
 * 用于 Sidebar 设置面板，管理可预览为纯文本的文件后缀名
 */
import { useState } from 'react';
import { Input } from 'antd';
import {
  getTextExtensions,
  setTextExtensions,
  resetTextExtensions,
  DEFAULT_TEXT_EXTENSIONS,
} from '../../utils/textMimeTypes';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TextMimeSettingsModal({ open, onClose }: Props) {
  const [value, setValue] = useState(() => getTextExtensions().map((e) => `.${e}`).join('\n'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    const lines = value
      .split('\n')
      .map((l) => l.trim())
      .map((l) => l.replace(/^\.+/, ''))
      .filter((l) => l.length > 0 && !l.startsWith('#'));
    if (lines.length === 0) {
      setError('至少需要保留一个后缀名');
      return;
    }
    setLoading(true);
    await setTextExtensions(lines);
    setLoading(false);
    onClose();
  };

  const handleReset = async () => {
    setLoading(true);
    await resetTextExtensions();
    setValue(DEFAULT_TEXT_EXTENSIONS.map((e) => `.${e}`).join('\n'));
    setLoading(false);
    setError('');
  };

  return (
    <Modal open={open} onClose={onClose} title="文本后缀名配置" width="md">
      <div className="text-mime-settings">
        <p className="text-mime-settings__desc">
          每行一个后缀名（如 <code>.txt</code>），只有匹配列表中后缀的文件可在预览中以纯文本方式打开。支持或不带前导点号均可。
        </p>
        <Input.TextArea
          className="text-mime-settings__textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={14}
          placeholder=".txt&#10;.md&#10;.json&#10;..."
        />
        {error && <p className="form-error">{error}</p>}
        <div className="text-mime-settings__actions">
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            重置为默认
          </Button>
          <div className="text-mime-settings__actions-right">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button onClick={handleSave} loading={loading}>
              保存
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
