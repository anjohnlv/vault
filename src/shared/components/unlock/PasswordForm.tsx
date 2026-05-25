import { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface PasswordFormProps {
  mode: 'create' | 'unlock';
  onSubmit: (password: string, confirmPassword?: string, hint?: string) => Promise<void>;
  loading: boolean;
  error?: string;
  passwordHint?: string;
}

export function PasswordForm({
  mode,
  onSubmit,
  loading,
  error,
  passwordHint,
}: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    if (mode === 'create' && password !== confirm) return;
    await onSubmit(password, mode === 'create' ? confirm : undefined, mode === 'create' ? hint : undefined);
  };

  return (
    <form className="password-form" onSubmit={handleSubmit}>
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === 'create' ? '设置主密码' : '输入主密码'}
        autoFocus
        error={
          error
            ? error
            : mode === 'create' && confirm && password !== confirm
              ? '两次输入的密码不一致'
              : undefined
        }
      />
      {mode === 'create' && (
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="确认主密码"
        />
      )}
      {mode === 'create' && (
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="密码提示（可选，请勿写入密码本身）"
        />
      )}

      {mode === 'create' && (
        <p className="password-form__notice">
          保险箱目录完全由 Vault 管理。请勿手动添加、修改或删除其中的任何文件，否则可能导致数据丢失或无法打开。
        </p>
      )}

      {mode === 'unlock' && passwordHint && !showForgot && (
        <button
          type="button"
          className="password-form__forgot"
          onClick={() => setShowForgot(true)}
        >
          显示密码提示
        </button>
      )}
      {mode === 'unlock' && passwordHint && showForgot && (
        <p className="password-form__hint--warn">{passwordHint}</p>
      )}

      <Button htmlType="submit" variant="primary" size="lg" loading={loading}>
        {mode === 'create' ? '新建保险箱' : '解锁保险箱'}
      </Button>
    </form>
  );
}
