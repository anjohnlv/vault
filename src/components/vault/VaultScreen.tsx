/**
 * 保险箱主画面组件（状态: unlocked）
 * 解锁后主界面，组合 Sidebar、Toolbar、FileList、Header 等子组件
 */
import { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { Sidebar } from './Sidebar';
import { FileList } from './FileList';
import { Toolbar } from './Toolbar';
import { BatchBar } from './BatchBar';
import { Header } from './Header';
import { PreviewModal } from '../preview/PreviewModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function VaultScreen() {
  const { state, addFile, registerBiometric } = useVault();
  const [showBiometricPwd, setShowBiometricPwd] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  return (
    <div className="vault-screen">
      <Header />
      <div className="vault-body">
        <Sidebar
          onChangePassword={() => setShowChangePwd(true)}
          onRegisterBiometric={() => setShowBiometricPwd(true)}
          webauthnAvailable={state.webauthnAvailable}
          webauthnRegistered={state.webauthnRegistered}
        />
        <main className="vault-main">
          <Toolbar
            onAddFile={addFile}
            fileSearchQuery={fileSearchQuery}
            onFileSearchChange={setFileSearchQuery}
          />
          <FileList fileSearchQuery={fileSearchQuery} />
          <BatchBar />
        </main>
      </div>

      {state.editingFileId && <PreviewModal />}

      {showBiometricPwd && (
        <BiometricSetupModal
          onClose={() => setShowBiometricPwd(false)}
          onRegister={async (pwd) => {
            const ok = await registerBiometric(pwd);
            if (ok) setShowBiometricPwd(false);
          }}
        />
      )}
      <ChangePasswordModal
        open={showChangePwd}
        onClose={() => setShowChangePwd(false)}
      />
    </div>
  );
}


function BiometricSetupModal({
  onClose,
  onRegister,
}: {
  onClose: () => void;
  onRegister: (pwd: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <Modal open onClose={onClose} title="注册指纹解锁">
      <form
        className="modal-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          try {
            await onRegister(password);
          } catch {
            setError('注册失败');
          } finally {
            setLoading(false);
          }
        }}
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          输入主密码以确认身份，然后通过指纹或设备 PIN 完成注册。
        </p>
        <Input
          label="主密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <Button htmlType="submit" loading={loading} disabled={!password}>
          注册指纹
        </Button>
      </form>
    </Modal>
  );
}
