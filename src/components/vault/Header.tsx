/**
 * 顶部栏组件
 * 用于 VaultScreen，显示保险箱名称和锁定按钮
 */
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { useVault } from '../../context/VaultContext';
import { LogoIcon } from '../ui/LogoIcon';

export function Header() {
  const { lock, state } = useVault();
  return (
    <header className="vault-header">
      <div className="vault-header__left">
        <LogoIcon size={20} />
        <h1 className="vault-header__title">Vault</h1>
      </div>
      <span className="vault-header__folder">
        {state.vaultFolder?.name ?? ''}
      </span>
      <button
        className="vault-header__lock"
        onClick={lock}
        title="锁定"
      >
        <span className="vault-header__lock-icon">
          <UnlockOutlined />
        </span>
        <span className="vault-header__lock-icon vault-header__lock-icon--hover">
          <LockOutlined />
        </span>
      </button>
    </header>
  );
}
