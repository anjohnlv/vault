import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { App, Drawer, Dropdown } from 'antd';
import { MenuOutlined, LockOutlined, FolderOutlined, PlusOutlined, SearchOutlined, FileTextOutlined, KeyOutlined, UploadOutlined } from '@ant-design/icons';
import { useVault } from '../../../core/context/VaultContext';
import { getUniqueName } from '../../../core/utils/tree';
import { FileList } from '../../../shared/components/vault/FileList';
import { BatchBar } from '../../../shared/components/vault/BatchBar';
import { FolderTree } from '../../../shared/components/vault/FolderTree';
import { PreviewModal } from '../../../shared/components/preview/PreviewModal';
import { ChangePasswordModal } from '../../../shared/components/modals/ChangePasswordModal';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { SetPasswordModal } from '../../../shared/components/modals/SetPasswordModal';

export function MobileVaultScreen() {
  const { state, lock, importFile, addFolder, setSearchQuery, clearError, createNote, createPasswordBook } = useVault();
  const { message } = App.useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState<'folder' | 'file'>('folder');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder creation
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEncrypted, setNewFolderEncrypted] = useState(false);
  const [showSetPwd, setShowSetPwd] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.error) {
      message.error(state.error);
      clearError();
    }
  }, [state.error, message, clearError]);

  useEffect(() => {
    if (showFolderModal && folderInputRef.current) {
      folderInputRef.current.select();
    }
  }, [showFolderModal]);

  const handleLock = useCallback(() => {
    lock();
  }, [lock]);

  const handleFileSelect = useCallback(async () => {
    const input = fileInputRef.current;
    if (!input) return;
    input.value = '';
    input.onchange = async () => {
      const files = input.files;
      if (!files) return;
      for (let i = 0; i < files.length; i++) {
        await importFile(files[i]!);
      }
    };
    input.click();
  }, [importFile]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) {
        setSearchText('');
        setSearchQuery('');
      }
      return !prev;
    });
  }, [setSearchQuery]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchText(v);
    setSearchQuery(v);
  }, [setSearchQuery]);

  const handleSearchMode = useCallback((mode: 'folder' | 'file') => {
    setSearchMode(mode);
    setSearchText('');
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleNewFolder = useCallback(() => {
    const defaultName = getUniqueName(state.tree, state.rootId, '新建文件夹');
    setNewFolderName(defaultName);
    setNewFolderEncrypted(false);
    setShowFolderModal(true);
  }, [state.tree, state.rootId]);

  const handleCreateFolder = useCallback(async (password?: string, hint?: string) => {
    if (!newFolderName.trim()) return;
    if (newFolderEncrypted && !password) {
      setShowSetPwd(true);
      return;
    }
    await addFolder(newFolderName.trim(), newFolderEncrypted, state.rootId, password, hint);
    setShowFolderModal(false);
    setNewFolderName('');
  }, [newFolderName, newFolderEncrypted, addFolder, state.rootId]);

  const handlePwdConfirm = useCallback((password: string, hint?: string) => {
    setShowSetPwd(false);
    handleCreateFolder(password, hint);
  }, [handleCreateFolder]);

  const createMenuItems = useMemo(() => [
    {
      key: 'note',
      icon: <FileTextOutlined />,
      label: '纯文本笔记',
      onClick: () => createNote('未命名笔记', state.currentFolderId),
    },
    {
      key: 'pbook',
      icon: <KeyOutlined />,
      label: '密码本',
      onClick: () => createPasswordBook('未命名密码本', state.currentFolderId),
    },
    {
      key: 'import',
      icon: <UploadOutlined />,
      label: '导入文件',
      onClick: () => handleFileSelect(),
    },
  ], [createNote, createPasswordBook, state.currentFolderId, handleFileSelect]);

  return (
    <div className="mv-screen">
      <header className="mv-header">
        <button className="mv-header__btn" onClick={() => setDrawerOpen(true)}>
          <MenuOutlined />
        </button>

        <span className="mv-header__title">{state.vaultName || 'Vault'}</span>

        <button className="mv-header__btn" onClick={toggleSearch}>
          <SearchOutlined />
        </button>
        <Dropdown menu={{ items: createMenuItems }} trigger={['click']}>
          <button className="mv-header__btn">
            <PlusOutlined />
          </button>
        </Dropdown>
        <button className="mv-header__btn" onClick={handleLock}>
          <LockOutlined />
        </button>
      </header>

      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} />

      {searchOpen && (
        <div className="mv-search">
          <div className="mv-search__inner">
            <div className="mv-search__tabs">
              {(['folder', 'file'] as const).map((mode) => (
                <button
                  key={mode}
                  className={`mv-search__tab${searchMode === mode ? ' mv-search__tab--active' : ''}`}
                  onClick={() => handleSearchMode(mode)}
                >
                  {mode === 'folder' ? '文件夹' : '文件'}
                </button>
              ))}
            </div>
            <input
              className="mv-search__input"
              autoFocus
              placeholder={searchMode === 'folder' ? '搜索文件夹...' : '搜索文件...'}
              value={searchText}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      )}

      <div className="mv-body">
        <FileList mobile />
        <BatchBar />
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        styles={{
          wrapper: { width: 280 },
          body: {
            padding: 0,
            background: 'var(--mv-color-surface)',
            borderRight: '1px solid var(--mv-color-border)',
          },
          header: { display: 'none' },
          mask: { background: 'rgba(0,0,0,0.6)' },
        }}
      >
        <div className="mv-drawer-section">
          <div className="mv-drawer-header">
            <span className="mv-drawer-title">文件夹</span>
            <button className="mv-drawer-btn" onClick={handleNewFolder} title="新建文件夹">
              <FolderOutlined />
            </button>
            <button className="mv-drawer-btn" onClick={() => setDrawerOpen(false)}>
              ✕
            </button>
          </div>
          <FolderTree
            nodes={(state.tree[0]?.type === 'folder' ? state.tree[0].children : []) ?? []}
            searchQuery={state.searchQuery || ''}
            searchMode={searchMode}
          />
        </div>
      </Drawer>

      {state.editingFileId && <PreviewModal />}

      <ChangePasswordModal
        open={showChangePwd}
        onClose={() => setShowChangePwd(false)}
      />

      {showFolderModal && (
        <Modal
          open
          onClose={() => setShowFolderModal(false)}
          title="新建文件夹"
          width="sm"
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateFolder();
            }}
          >
            <Input
              ref={folderInputRef}
              label="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mv-color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={newFolderEncrypted}
                onChange={(e) => setNewFolderEncrypted(e.target.checked)}
              />
              加密文件夹
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowFolderModal(false)} disabled={state.isLoading}>
                取消
              </Button>
              <Button htmlType="submit" disabled={!newFolderName.trim()} loading={state.isLoading}>
                创建
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <SetPasswordModal
        open={showSetPwd}
        onClose={() => setShowSetPwd(false)}
        onConfirm={handlePwdConfirm}
        title="设置文件夹密码"
        description={`为 "${newFolderName.trim()}" 设置访问密码`}
      />
    </div>
  );
}
