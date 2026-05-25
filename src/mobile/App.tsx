import { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, theme, App as AntApp, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { VaultProvider, useVault } from '../core/context/VaultContext';
import { MobileVaultScreen } from './components/vault/MobileVaultScreen';
import { VaultList } from './components/unlock/VaultList';
import { PasswordScreen } from './components/unlock/PasswordScreen';
import './App.css';

type Step = 'scanning' | 'vault-list' | 'password' | 'vault';

interface VaultInfo {
  name: string;
  rootPath: string;
}

function AppInner() {
  const { state, init, unlock, clearError } = useVault();
  const { message, modal } = AntApp.useApp();
  const [step, setStep] = useState<Step>('scanning');
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [selectedVault, setSelectedVault] = useState<VaultInfo | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (state.error) {
      message.error(state.error);
      clearError();
    }
  }, [state.error, message, clearError]);

  useEffect(() => {
    if (!scanned) {
      scanVaults();
    }
  }, [scanned]);

  async function scanVaults() {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const result = await Filesystem.readdir({ path: '', directory: Directory.Documents });
      const found: VaultInfo[] = [];
      for (const entry of result.files) {
        if (entry.type === 'directory') {
          const hasVault = await Filesystem.stat({
            path: `${entry.name}/.vault_meta`,
            directory: Directory.Documents,
          }).then(() => true).catch(() => false);

          if (hasVault) {
            found.push({ name: entry.name, rootPath: `${entry.name}` });
          }
        }
      }
      setVaults(found);
    } catch {
      // Dev fallback: allow creating new vault
    }
    setStep('vault-list');
    setScanned(true);
  }

  const handleSelectVault = useCallback((vault: VaultInfo) => {
    setSelectedVault(vault);
    setStep('password');
  }, []);

  const handleCreateVault = useCallback(() => {
    setStep('password');
  }, []);

  const handleDeleteVault = useCallback((vault: VaultInfo) => {
    modal.confirm({
      title: '删除保险箱',
      content: (
        <>
          确定要永久删除保险箱「{vault.name}」吗？<br />
          <span style={{ color: 'var(--mv-color-danger)', fontSize: '13px' }}>
            保险箱目录中的所有文件将被永久删除，无法恢复。
          </span>
        </>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const { CapacitorStorageProvider } = await import('../core/storage/capacitor-provider');
        try {
          await CapacitorStorageProvider.removeVault(vault.rootPath);
          setVaults((prev) => prev.filter((v) => v.rootPath !== vault.rootPath));
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败');
        }
      },
    });
  }, [message, modal]);

  const handlePasswordSubmit = useCallback(async (
    password: string,
    isCreating: boolean,
    hint?: string,
    vaultName?: string,
  ) => {
    const { CapacitorStorageProvider } = await import('../core/storage/capacitor-provider');
    const rootPath = isCreating && vaultName ? vaultName : selectedVault?.rootPath;

    if (!rootPath) return;

    const provider = new CapacitorStorageProvider(rootPath);

    if (isCreating) {
      await init(provider, vaultName || rootPath, password, hint);
    } else {
      const ok = await unlock(provider, selectedVault?.name || rootPath, password);
      if (!ok) return;
    }
  }, [selectedVault, init, unlock]);

  const handleBack = useCallback(() => {
    setStep('vault-list');
    setSelectedVault(null);
  }, []);

  if (state.status === 'unlocked') {
    return <MobileVaultScreen />;
  }

  if (step === 'scanning') {
    return (
      <div className="mobile-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (step === 'vault-list') {
    return <VaultList vaults={vaults} onSelect={handleSelectVault} onCreate={handleCreateVault} onDelete={handleDeleteVault} />;
  }

  if (step === 'password') {
    return (
      <PasswordScreen
        vaultName={selectedVault?.name}
        onSubmit={handlePasswordSubmit}
        onBack={handleBack}
      />
    );
  }

  return null;
}

const themeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#c89b3c',
    colorBgBase: '#0a0a0e',
    colorBgContainer: '#12121a',
    colorBgElevated: '#181824',
    colorBgLayout: '#0a0a0e',
    colorBorder: '#2a2a36',
    colorBorderSecondary: '#1e1e28',
    colorTextBase: '#e8e6e3',
    colorTextSecondary: '#8a8a9e',
    colorTextTertiary: '#6b6b7e',
    colorError: '#e85a4a',
    colorSuccess: '#3fb950',
    colorWarning: '#d2991d',
    borderRadius: 8,
    borderRadiusLG: 14,
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Button: { borderRadius: 8, controlHeightSM: 28, controlHeight: 36, controlHeightLG: 44 },
    Modal: { borderRadiusLG: 12, margin: 24 },
    Input: { borderRadius: 6, controlHeight: 36 },
    Message: { borderRadius: 8 },
  },
};

function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <ConfigProvider locale={zhCN} theme={themeConfig}>
        <AntApp>
          <VaultProvider>
            <AppInner />
          </VaultProvider>
        </AntApp>
      </ConfigProvider>
    </div>
  );
}

export default App;
