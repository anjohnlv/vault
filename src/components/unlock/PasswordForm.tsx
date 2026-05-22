/**
 * 密码输入表单组件
 * 用于 UnlockScreen/LockScreen，输入主密码解锁保险箱
 */
import { useState, type FormEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface PasswordFormProps {
  mode: 'create' | 'unlock';
  onSubmit: (password: string, confirmPassword?: string) => Promise<void>;
  loading: boolean;
  error?: string;
}

export function PasswordForm({
  mode,
  onSubmit,
  loading,
  error,
}: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    if (mode === 'create' && password !== confirm) return;
    await onSubmit(password, mode === 'create' ? confirm : undefined);
  };

  return (
    <form className="password-form" onSubmit={handleSubmit}>
      <Input
        label="主密码"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === 'create' ? '设置主密码' : '输入主密码'}
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
          label="确认密码"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="再次输入主密码"
        />
      )}
      <p className="password-form__hint">
        {mode === 'create'
          ? '请牢记主密码，丢失后将无法恢复数据'
          : '输入主密码解锁保险箱'}
      </p>
      <Button htmlType="submit" variant="primary" size="lg" loading={loading}>
        {mode === 'create' ? '创建保险箱' : '解锁'}
      </Button>
    </form>
  );
}
