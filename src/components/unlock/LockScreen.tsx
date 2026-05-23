import { useState, useCallback, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { isPlatformAuthAvailable, hasWebAuthn } from '../../auth/webauthn';
import { clearLastOpenedVault } from '../../storage/recentFolders';
import { readPasswordHint } from '../../storage/indexFile';
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
    readPasswordHint(vaultHandle).then(setPasswordHint);
  }, [vaultHandle]);

  useEffect(() => {
    if (webauthnAvailable) {
      hasWebAuthn(vaultHandle).then(setWebauthnRegistered);
    }
  }, [webauthnAvailable, vaultHandle]);

  const handleUnlock = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const ok = await unlock(vaultHandle, password);
      if (!ok) {
        setError('密码错误');
      }
    } catch {
      setError('解锁失败');
    } finally {
      setLoading(false);
    }
  }, [vaultHandle, unlock]);

  const handleWebAuthn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await unlockWithWebAuthn(vaultHandle);
      if (!ok) {
        setError('验证失败');
      }
    } catch {
      setError('验证失败');
    } finally {
      setLoading(false);
    }
  }, [vaultHandle, unlockWithWebAuthn]);

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
