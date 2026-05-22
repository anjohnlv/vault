/**
 * 锁定后快速解锁页面（状态: locked）
 * 当有 lastVaultId 时展示，同一保险箱快速解锁，无需重新选择目录
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useVault } from '../../context/VaultContext';
import { isPlatformAuthAvailable, hasWebAuthn } from '../../auth/webauthn';
import { clearLastOpenedVault } from '../../storage/recentFolders';
import { LogoIcon } from '../ui/LogoIcon';

interface LockScreenProps {
  vaultHandle: FileSystemDirectoryHandle;
  vaultName: string;
  onBack: () => void;
}

export function LockScreen({ vaultHandle, vaultName, onBack }: LockScreenProps) {
  const { unlock, unlockWithWebAuthn } = useVault();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webauthnAvailable, setWebauthnAvailable] = useState(false);
  const [webauthnRegistered, setWebauthnRegistered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isPlatformAuthAvailable().then(setWebauthnAvailable);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (webauthnAvailable) {
      hasWebAuthn(vaultHandle).then(setWebauthnRegistered);
    }
  }, [webauthnAvailable, vaultHandle]);

  const handleUnlock = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await unlock(vaultHandle, password);
      if (!ok) {
        setError('密码错误，请重试');
      }
    } catch {
      setError('解锁失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [password, vaultHandle, unlock]);

  const handleWebAuthn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await unlockWithWebAuthn(vaultHandle);
      if (!ok) {
        setError('生物识别验证失败');
      }
    } catch {
      setError('生物识别验证失败');
    } finally {
      setLoading(false);
    }
  }, [vaultHandle, unlockWithWebAuthn]);

  const handleBack = useCallback(() => {
    clearLastOpenedVault();
    onBack();
  }, [onBack]);

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <div className="lock-card__glow" />

        <LogoIcon size={80} />

        <h2 className="lock-card__title">Vault 已锁定</h2>
        <p className="lock-card__name">{vaultName}</p>

        <div className="lock-card__form">
          <div className="lock-card__input-wrap">
            <input
              className="lock-card__input"
              type="password"
              placeholder="输入密码解锁"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlock();
              }}
              ref={inputRef}
            />
          </div>

          <button
            className="lock-card__btn"
            onClick={handleUnlock}
            disabled={loading || !password}
          >
            解锁保险箱
          </button>

          {webauthnAvailable && webauthnRegistered && (
            <button
              className="lock-card__bio-btn"
              onClick={handleWebAuthn}
              disabled={loading}
            >
              使用指纹解锁
            </button>
          )}
        </div>

        {error && <p className="lock-card__error">{error}</p>}

        <button className="lock-card__back" onClick={handleBack}>
          ← 返回保险箱列表
        </button>

        <div className="lock-card__line lock-card__line--top" />
        <div className="lock-card__line lock-card__line--bottom" />
      </div>
    </div>
  );
}
