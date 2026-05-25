import { useState, useCallback, useEffect } from 'react';
import { useVault } from '../../../core/context/VaultContext';
import { isPlatformAuthAvailable, hasWebAuthn } from '../../../core/auth/webauthn';
import { clearLastOpenedVault } from '../../../core/storage/recentFolders';
import { readPasswordHint } from '../../../core/storage/indexFile';
import { WebStorageProvider } from '../../../core/storage/web-provider';
import { AuthCard } from './AuthCard';
import { PasswordForm } from './PasswordForm';

interface LockScreenProps {
  vaultHandle: FileSystemDirectoryHandle;
  vaultName: string;
  onBack: () => void;
}

export function LockScreen({ vaultHandle, vaultName, onBack }: LockScreenProps) {
  const { unlock, unlockWithWebAuthn } = useVault();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordHint, setPasswordHint] = useState<string | undefined>();
  const [webauthnAvailable, setWebauthnAvailable] = useState(false);
  const [webauthnRegistered, setWebauthnRegistered] = useState(false);

  useEffect(() => {
    isPlatformAuthAvailable().then(setWebauthnAvailable);
  }, []);

  useEffect(() => {
    const provider = new WebStorageProvider(vaultHandle);
    readPasswordHint(provider).then(setPasswordHint);
  }, [vaultHandle]);

  useEffect(() => {
    if (webauthnAvailable) {
      const provider = new WebStorageProvider(vaultHandle);
      hasWebAuthn(provider).then(setWebauthnRegistered);
    }
  }, [webauthnAvailable, vaultHandle]);

  const handleUnlock = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const provider = new WebStorageProvider(vaultHandle);
      const ok = await unlock(provider, vaultName, password);
      if (!ok) {
        setError('密码错误');
      }
    } catch {
      setError('解锁失败');
    } finally {
      setLoading(false);
    }
  }, [vaultHandle, vaultName, unlock]);

  const handleWebAuthn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new WebStorageProvider(vaultHandle);
      const ok = await unlockWithWebAuthn(provider, vaultName);
      if (!ok) {
        setError('验证失败');
      }
    } catch {
      setError('验证失败');
    } finally {
      setLoading(false);
    }
  }, [vaultHandle, vaultName, unlockWithWebAuthn]);

  const handleBack = useCallback(() => {
    clearLastOpenedVault();
    onBack();
  }, [onBack]);

  return (
    <AuthCard title="保险箱已锁定" subtitle={vaultName} onBack={handleBack}>
      <PasswordForm
        mode="unlock"
        onSubmit={handleUnlock}
        loading={loading}
        error={error ?? undefined}
        passwordHint={passwordHint}
      />
      {webauthnAvailable && webauthnRegistered && (
        <button
          className="auth-card__webauthn"
          onClick={handleWebAuthn}
          disabled={loading}
        >
          指纹解锁
        </button>
      )}
    </AuthCard>
  );
}
