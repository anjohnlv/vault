import { useState, useCallback, type FormEvent } from 'react';
import { LogoIcon } from '../../../shared/components/ui/LogoIcon';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface PasswordScreenProps {
  vaultName?: string;
  onSubmit: (password: string, isCreating: boolean, hint?: string, vaultName?: string) => Promise<void>;
  onBack: () => void;
}

export function PasswordScreen({ vaultName, onSubmit, onBack }: PasswordScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [newVaultName, setNewVaultName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [showHint, setShowHint] = useState(false);

  const isCreating = !vaultName;
  const passwordHint = null; // TODO: pass from vault metadata

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    if (isCreating && !newVaultName.trim()) {
      setError('请输入保险箱名称');
      return;
    }
    if (isCreating && password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      if (isCreating) {
        await onSubmit(password, true, hint || undefined, newVaultName.trim());
      } else {
        await onSubmit(password, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : isCreating ? '创建失败' : '密码错误');
    } finally {
      setLoading(false);
    }
  }, [isCreating, vaultName, newVaultName, password, confirm, hint, onSubmit]);

  return (
    <div className={`ps-screen${!isCreating ? ' ps-screen--unlock' : ''}`}>
      <div className="ps-top">
        <button className="ps-top__back" onClick={onBack} aria-label="返回">
          <ArrowLeftOutlined />
        </button>
      </div>

      <div className="ps-hero">
        <div className="ps-hero__icon-wrap">
          <div className="ps-hero__glow" />
          <LogoIcon size={56} />
        </div>
        <h1 className="ps-hero__title">
          {isCreating ? '新建保险箱' : vaultName}
        </h1>
        <p className="ps-hero__desc">
          {isCreating ? '创建一个安全的加密空间' : '输入主密码解锁'}
        </p>
      </div>

      <form className="ps-form" onSubmit={handleSubmit}>
        {isCreating && (
          <div className="ps-form__row ps-form__row--vault-name">
            <Input
              label="保险箱名称"
              value={newVaultName}
              onChange={(e) => { setNewVaultName(e.target.value); setError(undefined); }}
              placeholder="我的保险箱"
              autoFocus
            />
          </div>
        )}

        <div className="ps-form__row">
          <Input
            type="password"
            label={isCreating ? '主密码' : undefined}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(undefined); }}
            placeholder={isCreating ? '设置主密码' : '输入主密码'}
            autoFocus={!isCreating}
            error={error}
          />
        </div>

        {isCreating && (
          <>
            <div className="ps-form__row">
              <Input
                type="password"
                label="确认密码"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(undefined); }}
                placeholder="再次输入密码"
                error={
                  confirm && password !== confirm
                    ? '两次输入的密码不一致'
                    : undefined
                }
              />
            </div>

            <div className="ps-form__row">
              <Input
                label="密码提示（可选）"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="忘记密码时的提示线索"
              />
            </div>

            <p className="ps-form__notice">
              保险箱目录完全由 Vault 管理。请勿手动添加、修改或删除
              其中的任何文件，否则可能导致数据丢失或无法打开。
            </p>
          </>
        )}

        {!isCreating && passwordHint && (
          <div className="ps-form__hint">
            {showHint ? (
              <p className="ps-form__hint-text">{passwordHint}</p>
            ) : (
              <button
                type="button"
                className="ps-form__hint-btn"
                onClick={() => setShowHint(true)}
              >
                显示密码提示
              </button>
            )}
          </div>
        )}

        <div className="ps-form__submit">
          <Button
            htmlType="submit"
            variant="primary"
            size="lg"
            loading={loading}
          >
            {isCreating ? '创建保险箱' : '解锁'}
          </Button>
        </div>
      </form>
    </div>
  );
}
