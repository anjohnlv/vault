import { useState, useEffect } from 'react';
import { ConfigProvider, theme, App as AntApp, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { VaultProvider } from '../core/context/VaultContext';
import { UnlockScreen } from './components/unlock/UnlockScreen';
import { LockScreen } from './components/unlock/LockScreen';
import { VaultScreen } from './components/vault/VaultScreen';
import { useVault } from '../core/context/VaultContext';
import { verifyPermission } from '../core/storage/web-provider';
import './App.css';
import {
  getRecentFolders,
  getLastOpenedVault,
  type RecentFolder,
} from '../core/storage/recentFolders';

interface LockTarget {
  handle: FileSystemDirectoryHandle;
  name: string;
}

function AppInner() {
  const { state } = useVault();
  const [lockTarget, setLockTarget] = useState<LockTarget | null | undefined>(undefined);

  useEffect(() => {
    if (state.status !== 'unlocked') {
      checkLastVault();
    }
  }, [state.status]);

  async function checkLastVault() {
    const lastId = getLastOpenedVault();
    if (!lastId) {
      setLockTarget(null);
      return;
    }
    const recents = await getRecentFolders();
    const match = recents.find((f: RecentFolder) => f.id === lastId);
    if (!match) {
      setLockTarget(null);
      return;
    }
    try {
      const permitted = await verifyPermission(match.handle);
      if (!permitted) {
        setLockTarget(null);
        return;
      }
      setLockTarget({ handle: match.handle, name: match.name });
    } catch {
      setLockTarget(null);
    }
  }

  if (state.status === 'unlocked') return <VaultScreen />;

  if (lockTarget === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (lockTarget) {
    return (
      <LockScreen
        vaultHandle={lockTarget.handle}
        vaultName={lockTarget.name}
        onBack={() => setLockTarget(null)}
      />
    );
  }

  return <UnlockScreen />;
}

function App() {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ minHeight: '100vh' }}
    >
      <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#58a6ff',
          colorBgBase: '#0d1117',
          colorBgContainer: '#161b22',
          colorBgElevated: '#1c2129',
          colorBgLayout: '#0d1117',
          colorBorder: '#30363d',
          colorBorderSecondary: '#21262d',
          colorTextBase: '#e6edf3',
          colorTextSecondary: '#8b949e',
          colorTextTertiary: '#6e7681',
          colorError: '#f85149',
          colorSuccess: '#3fb950',
          colorWarning: '#d2991d',
          borderRadius: 8,
          borderRadiusLG: 12,
          fontSize: 14,
          wireframe: false,
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeightSM: 28,
            controlHeight: 36,
            controlHeightLG: 44,
          },
          Modal: {
            borderRadiusLG: 12,
            margin: 24,
          },
          Input: {
            borderRadius: 6,
            controlHeight: 36,
          },
          Message: {
            borderRadius: 8,
          },
        },
      }}
    >
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
