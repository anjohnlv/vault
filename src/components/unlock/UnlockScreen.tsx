/**
 * 首页解锁页面（状态: uninitialized）
 * 当无 lastVaultId 时展示，可选择已有保险箱目录或创建新保险箱
 */
import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { useVault } from '../../context/VaultContext';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FolderSelector } from './FolderSelector';
import { FolderGrid } from './FolderGrid';
import { PasswordForm } from './PasswordForm';
import { WebAuthnPrompt } from './WebAuthnPrompt';
import { AuthCard } from './AuthCard';
import { LogoIcon } from '../ui/LogoIcon';
import { isValidVault, verifyPermission } from '../../storage/directory';
import { readPasswordHint } from '../../storage/indexFile';
import {
  getRecentFolders,
  upsertRecentFolder,
  removeRecentFolder,
  setLastOpenedVault,
  type RecentFolder,
} from '../../storage/recentFolders';

export function UnlockScreen() {
  const { init, unlock, unlockWithWebAuthn } = useVault();
  const { isSupported, selectFolder } = useFileSystem();

  const [folder, setFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [mode, setMode] = useState<'create' | 'unlock' | 'webauthn' | null>(null);
  const [step, setStep] = useState<'select-folder' | 'password'>('select-folder');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordHint, setPasswordHint] = useState<string | undefined>();
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);

  // 加载最近文件夹
  useEffect(() => {
    getRecentFolders().then(setRecentFolders);
  }, []);

  // 刷新最近列表
  const refreshRecent = useCallback(async () => {
    setRecentFolders(await getRecentFolders());
  }, []);

  // 处理文件夹就绪（新选或从历史打开）
  const handleFolderReady = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      setFolder(handle);
      const exists = await isValidVault(handle);
      if (exists) {
        try {
          const metaDir = await handle.getDirectoryHandle('.vault_meta');
          await metaDir.getFileHandle('credential_id');
          setMode('webauthn');
        } catch {
          setMode('unlock');
        }
        readPasswordHint(handle).then(setPasswordHint);
      } else {
        setMode('create');
        setPasswordHint(undefined);
      }
      setStep('password');
    },
    [],
  );

  // 选择新文件夹
  const handleSelectFolder = useCallback(async () => {
    if (!isSupported) {
      setError('您的浏览器不支持 File System Access API，请使用 Chrome 或 Edge。');
      return;
    }
    setLoading(true);
    setError(null);
    const handle = await selectFolder();
    if (!handle) {
      setLoading(false);
      return;
    }
    await handleFolderReady(handle);
    setLoading(false);
  }, [isSupported, selectFolder, handleFolderReady]);

  // 从历史打开
  const handleOpenRecent = useCallback(
    async (recent: RecentFolder) => {
      setLoading(true);
      setError(null);
      try {
        const permitted = await verifyPermission(recent.handle);
        if (!permitted) {
          message.warning(`文件夹「${recent.name}」已被删除或无法访问，已自动从列表中移除`);
          await removeRecentFolder(recent.id);
          await refreshRecent();
          setLoading(false);
          return;
        }
        const exists = await isValidVault(recent.handle);
        if (!exists) {
          message.warning(`文件夹「${recent.name}」已被删除或无法访问，已自动从列表中移除`);
          await removeRecentFolder(recent.id);
          await refreshRecent();
          setLoading(false);
          return;
        }
        await handleFolderReady(recent.handle);
        await upsertRecentFolder(recent.handle);
        await refreshRecent();
      } catch {
        setError('无法访问该文件夹，请重新选择');
      } finally {
        setLoading(false);
      }
    },
    [handleFolderReady, refreshRecent],
  );

  // 删除历史记录
  const handleRemoveRecent = useCallback(
    async (id: string) => {
      await removeRecentFolder(id);
      await refreshRecent();
    },
    [refreshRecent],
  );

  // 保存最近文件夹（init/unlock 成功后调用）
  const saveFolderToRecent = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      const id = await upsertRecentFolder(handle);
      if (id) setLastOpenedVault(id);
      await refreshRecent();
    },
    [refreshRecent],
  );

  // 处理密码提交
  const handlePasswordSubmit = useCallback(
    async (password: string, _confirmPassword?: string, hint?: string) => {
      if (!folder) return;
      setLoading(true);
      setError(null);
      try {
        if (mode === 'create') {
          await init(folder, password, hint);
          await saveFolderToRecent(folder);
        } else {
          const ok = await unlock(folder, password);
          if (ok) {
            await saveFolderToRecent(folder);
          } else {
            setError('密码错误，请重试');
          }
        }
      } catch {
        setError('操作失败，请重试');
      } finally {
        setLoading(false);
      }
    },
    [folder, mode, init, unlock, saveFolderToRecent],
  );

  // 返回文件夹选择
  const handleBackToSelect = useCallback(() => {
    setStep('select-folder');
    setFolder(null);
    setMode(null);
    setError(null);
  }, []);

  // WebAuthn 解锁
  const handleWebAuthn = useCallback(async () => {
    if (!folder) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await unlockWithWebAuthn(folder);
      if (ok) {
        await saveFolderToRecent(folder);
      } else {
        setMode('unlock');
      }
    } catch {
      setError('生物识别验证失败');
      setMode('unlock');
    } finally {
      setLoading(false);
    }
  }, [folder, unlockWithWebAuthn, saveFolderToRecent]);

  if (!isSupported) {
    return (
      <AuthCard title="Vault">
        <p className="form-error">
          请使用 Chrome 或 Edge 浏览器。
        </p>
      </AuthCard>
    );
  }

  const hasRecent = recentFolders.length > 0;

  if (step === 'select-folder' && hasRecent) {
    return (
      <div className="home-screen">
        <div className="home-panel">
          <div className="home-panel__accent" />
          <div className="home-panel__header">
            <LogoIcon size={32} />
            <div className="home-panel__titles">
              <h1 className="home-panel__title">Vault</h1>
              <span className="home-panel__desc">本地加密保险箱</span>
            </div>
          </div>
          <div className="home-panel__divider" />
          <div className="home-panel__body">
            <FolderGrid
              recentFolders={recentFolders}
              onOpenRecent={handleOpenRecent}
              onRemoveRecent={handleRemoveRecent}
              loading={loading}
            />
            {error && <p className="form-error" style={{ padding: '0 var(--space-5)' }}>{error}</p>}
          </div>
          <div className="home-panel__footer">
            <button className="home-panel__add-btn" onClick={handleSelectFolder} disabled={loading}>
              + 添加保险箱
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {step === 'select-folder' && (
        <FolderSelector
          onSelectFolder={handleSelectFolder}
          loading={loading}
          error={error || undefined}
        />
      )}

      {step === 'password' && mode === 'webauthn' && (
        <AuthCard title="密钥验证" onBack={handleBackToSelect}>
          <WebAuthnPrompt
            onUseBiometric={handleWebAuthn}
            onUsePassword={() => setMode('unlock')}
            loading={loading}
          />
        </AuthCard>
      )}

      {step === 'password' && (mode === 'create' || mode === 'unlock') && (
        <AuthCard
          title={mode === 'create' ? '新建保险箱' : '解锁保险箱'}
          onBack={handleBackToSelect}
        >
          <PasswordForm
            mode={mode}
            onSubmit={handlePasswordSubmit}
            loading={loading}
            error={error ?? undefined}
            passwordHint={passwordHint}
          />
        </AuthCard>
      )}
    </>
  );
}
