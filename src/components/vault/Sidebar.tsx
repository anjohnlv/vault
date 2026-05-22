/**
 * 左侧边栏组件
 * 用于 VaultScreen，包含文件夹树、上下文菜单、创建/解密操作和设置面板
 */
import { useState, useCallback, useRef } from 'react';
import { Dropdown, App, message } from 'antd';
import {
  FolderOutlined,
  DeleteOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  DownOutlined,
  EditOutlined,
  KeyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useVault } from '../../context/VaultContext';
import { SearchBar } from './SearchBar';
import { FolderTree } from './FolderTree';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SetPasswordModal } from '../modals/SetPasswordModal';
import { VerifyPasswordModal } from '../modals/VerifyPasswordModal';
import { RenameModal } from '../modals/RenameModal';
import { TextMimeSettingsModal } from '../modals/TextMimeSettingsModal';
import type { FolderNode } from '../../types';
import { findNode } from '../../utils/tree';

interface SidebarProps {
  onChangePassword: () => void;
  onRegisterBiometric: () => void;
  webauthnAvailable: boolean;
  webauthnRegistered: boolean;
}

export function Sidebar({ onChangePassword, onRegisterBiometric, webauthnAvailable, webauthnRegistered }: SidebarProps) {
  const { state, addFolder, deleteNode, changeFolderType, verifyFolderPassword, getRootFolder, renameNode, changeFolderPassword } = useVault();
  const { modal } = App.useApp();
  const [contextTargetId, setContextTargetId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalTargetId, setFolderModalTargetId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEncrypted, setNewFolderEncrypted] = useState(false);
  const [autoExpandId, setAutoExpandId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [encryptTarget, setEncryptTarget] = useState<FolderNode | null>(null);
  const [decryptTarget, setDecryptTarget] = useState<FolderNode | null>(null);
  const [showSetPwd, setShowSetPwd] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [changePwdVerifyOpen, setChangePwdVerifyOpen] = useState(false);
  const [changePwdSetOpen, setChangePwdSetOpen] = useState(false);
  const changePwdFolderRef = useRef<FolderNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderNode | null>(null);
  const [showTextMimeSettings, setShowTextMimeSettings] = useState(false);
  const [searchMode, setSearchMode] = useState<'folder' | 'file'>('folder');

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const folderEl = (e.target as HTMLElement).closest('[data-folder-id]');
    const folderId = folderEl ? (folderEl as HTMLElement).dataset.folderId ?? null : null;
    setContextTargetId(folderId === state.rootId ? null : folderId);
  }, [state.rootId]);

  const getTargetFolder = useCallback((): FolderNode | null => {
    if (!contextTargetId) return null;
    return findNode(state.tree, contextTargetId) as FolderNode | null;
  }, [contextTargetId, state.tree]);

  const handleAddSubFolder = useCallback((targetId: string | null) => {
    setFolderModalTargetId(targetId);
    setNewFolderName('');
    setNewFolderEncrypted(false);
    setShowFolderModal(true);
    setContextTargetId(null);
  }, []);

  const handleCreateSubfolder = useCallback(async (password?: string, hint?: string) => {
    if (!newFolderName.trim()) return;
    const parentId = folderModalTargetId ?? state.rootId;
    const parent = parentId ? findNode(state.tree, parentId) as FolderNode | null : null;
    const siblings = parent ? parent.children : [];
    if (siblings.some((n) => n.type === 'folder' && n.name === newFolderName.trim())) {
      message.warning('同一层级已存在同名文件夹');
      return;
    }
    if (newFolderEncrypted && !password) {
      setShowSetPwd(true);
      return;
    }
    await addFolder(newFolderName.trim(), newFolderEncrypted, parentId, password, hint);
    if (folderModalTargetId) {
      setAutoExpandId(folderModalTargetId);
    }
    setShowFolderModal(false);
    setNewFolderName('');
  }, [folderModalTargetId, newFolderName, newFolderEncrypted, addFolder, state.tree, state.rootId]);

  const handleDeleteFolder = useCallback(() => {
    const folder = getTargetFolder();
    if (!folder) return;
    if (folder.encrypted) {
      setDeleteTarget(folder);
      setContextTargetId(null);
      return;
    }
    modal.confirm({
      title: '删除文件夹',
      content: (
        <>
          确定要删除文件夹「{folder.name}」吗？
          <br />
          <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>
            文件夹中的所有内容（包括子文件夹和文件）都将被永久删除，无法恢复。
          </span>
        </>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteNode(folder.id);
        setContextTargetId(null);
      },
      onCancel: () => setContextTargetId(null),
    });
  }, [getTargetFolder, modal, deleteNode]);

  const handleToggleRootEncrypted = useCallback(() => {
    const rootFolder = getRootFolder();
    if (!rootFolder) return;
    const target = !rootFolder.encrypted;
    if (!target) {
      setDecryptTarget(rootFolder);
    } else {
      setEncryptTarget(rootFolder);
    }
    setContextTargetId(null);
  }, [getRootFolder]);

  const handleChangeFolderType = useCallback((folder: FolderNode) => {
    const targetEncrypted = !folder.encrypted;
    if (!targetEncrypted) {
      setDecryptTarget(folder);
      return;
    }
    setEncryptTarget(folder);
    setContextTargetId(null);
  }, []);

  const handlePwdConfirm = useCallback((password: string, hint?: string) => {
    setShowSetPwd(false);
    handleCreateSubfolder(password, hint);
  }, [handleCreateSubfolder]);

  const targetId = contextTargetId;

  const contextMenuItems: MenuProps['items'] = (() => {
    const items: MenuProps['items'] = [
      {
        key: 'add-folder',
        icon: <FolderOutlined />,
        label: '新建文件夹',
        onClick: () => handleAddSubFolder(targetId),
      },
    ];
    if (!targetId) {
      const rootFolder = getRootFolder();
      items.push(
        { type: 'divider' },
        {
          key: 'toggle-root-encrypt',
          icon: rootFolder?.encrypted ? <UnlockOutlined /> : <LockOutlined />,
          label: rootFolder?.encrypted ? '取消加密' : '设为加密',
          onClick: handleToggleRootEncrypted,
        },
      );
    } else {
      const folder = getTargetFolder();
      if (folder) {
        items.push(
          { type: 'divider' },
          {
            key: 'rename',
            icon: <EditOutlined />,
            label: '重命名',
            onClick: () => {
              setRenameTarget({ id: folder.id, name: folder.name });
              setContextTargetId(null);
            },
          },
          {
            key: 'toggle-encrypt',
            icon: folder.encrypted ? <UnlockOutlined /> : <LockOutlined />,
            label: folder.encrypted ? '取消加密' : '设为加密',
            onClick: () => handleChangeFolderType(folder),
          },
          ...(folder.encrypted ? [{
              key: 'change-password',
              icon: <KeyOutlined />,
              label: '修改密码',
              onClick: () => {
                changePwdFolderRef.current = folder;
                setChangePwdVerifyOpen(true);
                setContextTargetId(null);
              },
            }] : []),
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: handleDeleteFolder,
          },
        );
      }
    }
    return items;
  })();

  return (
    <aside className="sidebar">
      <SearchBar searchMode={searchMode} onSearchModeChange={setSearchMode} />
      <Dropdown
        menu={{ items: contextMenuItems }}
        trigger={['contextMenu']}
        overlayClassName="folder-card-dropdown"
      >
        <div
          className="sidebar__tree"
          onContextMenu={handleContextMenu}
        >
          <FolderTree nodes={(state.tree[0] as FolderNode | undefined)?.children ?? []} autoExpandId={autoExpandId} searchQuery={state.searchQuery} searchMode={searchMode} />
        </div>
      </Dropdown>

      {showFolderModal && (
        <Modal
          open
          onClose={() => setShowFolderModal(false)}
          title={folderModalTargetId ? '新建子文件夹' : '新建文件夹'}
          width="sm"
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateSubfolder();
            }}
          >
            <Input
              label="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
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

      {decryptTarget && (
        <VerifyPasswordModal
          open
          folderName={decryptTarget.name}
          hint={decryptTarget.passwordHint}
          tips={
            <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>
              此操作会解密文件夹内所有文件，可能需要较长时间。
            </span>
          }
          onClose={() => { setDecryptTarget(null); setContextTargetId(null); }}
          onConfirm={async (password) => {
            const ok = await verifyFolderPassword(decryptTarget.id, password);
            if (!ok) throw new Error('密码错误');
            const folder = decryptTarget;
            setDecryptTarget(null);
            setContextTargetId(null);
            await changeFolderType(folder.id, false);
          }}
        />
      )}

      {encryptTarget && (
        <SetPasswordModal
          open
          folderName={encryptTarget.name}
          tips={
            <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>
              此操作会加密文件夹内所有文件，可能需要较长时间。
            </span>
          }
          onClose={() => { setEncryptTarget(null); setContextTargetId(null); }}
          onConfirm={async (password, hint) => {
            if (!encryptTarget) return;
            const folder = encryptTarget;
            setEncryptTarget(null);
            setContextTargetId(null);
            await changeFolderType(folder.id, true, password, hint ?? '');
          }}
        />
      )}

      <SetPasswordModal
        open={showSetPwd}
        onClose={() => setShowSetPwd(false)}
        onConfirm={handlePwdConfirm}
        title="设置文件夹密码"
        description={`为 "${newFolderName.trim()}" 设置访问密码`}
      />

      {renameTarget && (
        <RenameModal
          open
          currentName={renameTarget.name}
          onClose={() => setRenameTarget(null)}
          onRename={async (name) => {
            try {
              await renameNode(renameTarget.id, name);
            } catch (err) {
              message.error(err instanceof Error ? err.message : '重命名失败');
            }
          }}
        />
      )}

      {changePwdVerifyOpen && changePwdFolderRef.current && (
        <VerifyPasswordModal
          open
          folderName={changePwdFolderRef.current.name}
          hint={changePwdFolderRef.current.passwordHint}
          tips="验证旧密码后设置新密码"
          onClose={() => {
            setChangePwdVerifyOpen(false);
            changePwdFolderRef.current = null;
          }}
          onConfirm={async (password) => {
            const folder = changePwdFolderRef.current;
            if (!folder) return;
            const ok = await verifyFolderPassword(folder.id, password);
            if (!ok) throw new Error('密码错误');
            setChangePwdVerifyOpen(false);
            setChangePwdSetOpen(true);
          }}
        />
      )}

      {changePwdSetOpen && changePwdFolderRef.current && (() => {
        const folder = changePwdFolderRef.current!;
        return (
          <SetPasswordModal
            open
            folderName={folder.name}
            onClose={() => {
              setChangePwdSetOpen(false);
              changePwdFolderRef.current = null;
            }}
            onConfirm={async (password, hint) => {
              setChangePwdSetOpen(false);
              changePwdFolderRef.current = null;
              await changeFolderPassword(folder.id, password, hint ?? '');
            }}
            title="修改文件夹密码"
            description={`为 "${folder.name}" 设置新密码`}
          />
        );
      })()}

      {deleteTarget && (
        <VerifyPasswordModal
          open
          folderName={deleteTarget.name}
          hint={deleteTarget.passwordHint}
          tips={
            <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>
              文件夹中的所有内容（包括子文件夹和文件）都将被永久删除，无法恢复。
            </span>
          }
          onClose={() => setDeleteTarget(null)}
          onConfirm={async (password) => {
            const ok = await verifyFolderPassword(deleteTarget.id, password);
            if (!ok) throw new Error('密码错误');
            const id = deleteTarget.id;
            setDeleteTarget(null);
            await deleteNode(id);
          }}
        />
      )}

      <div className="sidebar__settings">
        <div
          className="sidebar__settings-label"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <SettingOutlined /> 设置
          <DownOutlined
            className={`sidebar__settings-arrow ${settingsOpen ? 'sidebar__settings-arrow--open' : ''}`}
          />
        </div>
        <div className={`sidebar__settings-body ${settingsOpen ? 'sidebar__settings-body--open' : ''}`}>
          <div className="sidebar__settings-inner">
            <button className="sidebar__settings-item" onClick={onChangePassword}>
              <LockOutlined /> 修改主密码
            </button>
            <button className="sidebar__settings-item" onClick={() => setShowTextMimeSettings(true)}>
              <FileTextOutlined /> 文本类型配置
            </button>
            {webauthnAvailable && !webauthnRegistered && (
              <button className="sidebar__settings-item" onClick={onRegisterBiometric}>
                <SafetyOutlined /> 注册指纹解锁
              </button>
            )}
          </div>
        </div>
      </div>

      <TextMimeSettingsModal
        open={showTextMimeSettings}
        onClose={() => setShowTextMimeSettings(false)}
      />
    </aside>
  );
}
