/**
 * 文件夹树形组件
 * 用于 Sidebar，支持展开/折叠、拖拽移动、右键菜单、加密文件夹解锁
 */
import { useState, useEffect, useCallback, useMemo, useRef, type DragEvent } from 'react';
import { App, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  LockOutlined,
  UnlockOutlined,
  HomeOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useVault } from '../../context/VaultContext';
import type { VaultNode, FolderNode } from '../../types';
import { findNode } from '../../utils/tree';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SetPasswordModal } from '../modals/SetPasswordModal';
import { VerifyPasswordModal } from '../modals/VerifyPasswordModal';
import { RenameModal } from '../modals/RenameModal';

interface FolderTreeProps {
  nodes: VaultNode[];
  depth?: number;
  autoExpandId?: string | null;
  searchQuery?: string;
}

export function FolderTree({ nodes, depth = 0, autoExpandId, searchQuery }: FolderTreeProps) {
  const { state, moveNode, setCurrentFolder, deleteNode, addFolder, changeFolderType, getRootFolder, verifyFolderPassword, renameNode, changeFolderPassword } = useVault();
  const { modal } = App.useApp();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [encryptTarget, setEncryptTarget] = useState<FolderNode | null>(null);
  const [decryptTarget, setDecryptTarget] = useState<FolderNode | null>(null);
  const [newFolderTargetId, setNewFolderTargetId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEncrypted, setNewFolderEncrypted] = useState(false);
  const [showSetPwd, setShowSetPwd] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [changePwdVerifyOpen, setChangePwdVerifyOpen] = useState(false);
  const [changePwdSetOpen, setChangePwdSetOpen] = useState(false);
  const changePwdFolderRef = useRef<FolderNode | null>(null);

  useEffect(() => {
    if (autoExpandId) {
      setExpanded((prev) => ({ ...prev, [autoExpandId]: true }));
    }
  }, [autoExpandId]);

  const searchActive = searchQuery && searchQuery.trim();
  const filteredNodes = useMemo(() => {
    if (!searchActive) return null;
    const q = searchQuery.toLowerCase();
    const hasMatch = (n: VaultNode): boolean => {
      if (n.type === 'folder') {
        if (n.name.toLowerCase().includes(q)) return true;
        return n.children.some(hasMatch);
      }
      return false;
    };
    return nodes.filter(hasMatch);
  }, [searchActive, searchQuery, nodes]);

  const displayNodes = (filteredNodes ?? nodes).filter((n) => n.type === 'folder') as FolderNode[];

  useEffect(() => {
    if (searchActive) {
      const expandAll: Record<string, boolean> = {};
      const mark = (n: VaultNode) => {
        if (n.type === 'folder') {
          expandAll[n.id] = true;
          n.children.forEach(mark);
        }
      };
      displayNodes.forEach(mark);
      setExpanded((prev) => ({ ...prev, ...expandAll }));
    }
  }, [searchActive, displayNodes]);

  const handleClick = (folder: FolderNode) => {
    if (folder.encrypted && !state.folderAccess[folder.id]) {
      setUnlockId(folder.id);
      return;
    }
    setExpanded((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }));
    setCurrentFolder(folder.id);
  };

  const handleDragOver = (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(folderId);
  };

  const handleDrop = async (e: DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const nodeId = e.dataTransfer.getData('text/node-id');
    if (nodeId && nodeId !== targetId) {
      await moveNode(nodeId, targetId);
    }
  };

  const handleRootDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nodeId = e.dataTransfer.getData('text/node-id');
    if (nodeId) await moveNode(nodeId, null);
  };

  const handleChangeFolderType = useCallback((folder: FolderNode) => {
    if (!folder.encrypted) {
      setEncryptTarget(folder);
    } else {
      setDecryptTarget(folder);
    }
  }, []);

  const handleToggleRootEncrypted = useCallback(() => {
    const rootFolder = getRootFolder();
    if (rootFolder) handleChangeFolderType(rootFolder);
  }, [getRootFolder, handleChangeFolderType]);

  const handleDeleteFolder = useCallback((folder: FolderNode) => {
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
      onOk: () => deleteNode(folder.id),
    });
  }, [modal, deleteNode]);

  const handleCreateSubfolder = useCallback(async (password?: string, hint?: string) => {
    if (!newFolderName.trim()) return;
    const parentId = newFolderTargetId ?? state.rootId;
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
    if (parentId) {
      setExpanded((prev) => ({ ...prev, [parentId]: true }));
    }
    setShowFolderModal(false);
    setNewFolderName('');
  }, [newFolderTargetId, newFolderName, newFolderEncrypted, addFolder, state.tree, state.rootId]);

  const handlePwdConfirm = useCallback((password: string, hint?: string) => {
    setShowSetPwd(false);
    handleCreateSubfolder(password, hint);
  }, [handleCreateSubfolder]);

  const handleUnlockAndSelect = useCallback((folderId: string) => {
    setExpanded((prev) => ({ ...prev, [folderId]: true }));
    setCurrentFolder(folderId);
    setUnlockId(null);
  }, [setCurrentFolder]);

  const buildMenuItems = (folder: FolderNode | null): MenuProps['items'] => {
    const targetId = folder?.id ?? null;
    const items: MenuProps['items'] = [
      {
        key: 'add-folder',
        icon: <FolderOutlined />,
        label: '新建文件夹',
        onClick: () => {
          setNewFolderTargetId(targetId);
          setNewFolderName('');
          setNewFolderEncrypted(false);
          setShowFolderModal(true);
        },
      },
    ];
    if (!folder) {
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
    } else if (folder) {
      items.push(
        { type: 'divider' },
        {
          key: 'rename',
          icon: <EditOutlined />,
          label: '重命名',
          onClick: () => setRenameTarget({ id: folder.id, name: folder.name }),
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
            },
          }] : []),
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: '删除',
          danger: true,
          onClick: () => handleDeleteFolder(folder),
        },
      );
    }
    return items;
  };

  return (
    <>
      <div
        className={`folder-tree ${depth === 0 ? 'folder-tree--root' : ''}`}
        onDragOver={(e) => {
          if (depth === 0) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
        }}
        onDrop={depth === 0 ? handleRootDrop : undefined}
      >
        {depth === 0 ? (
          <div>
            <div
              className={`folder-tree__item ${state.currentFolderId === state.rootId ? 'folder-tree__item--active' : ''}`}
              data-folder-id={state.rootId}
              onClick={() => setCurrentFolder(state.rootId)}
            >
              <span className="folder-tree__icon">
                <HomeOutlined />
              </span>
              <span className="folder-tree__name">
                {(state.tree[0] as FolderNode | undefined)?.encrypted && (
                  <LockOutlined style={{ marginRight: 4, fontSize: 11 }} />
                )}
                {state.vaultFolder?.name ?? 'Vault'}
              </span>
              <Dropdown
                menu={{ items: buildMenuItems(null) }}
                trigger={['click']}
                overlayClassName="folder-card-dropdown"
              >
                <button
                  className="folder-tree__delete"
                  title="更多操作"
                  onClick={(e) => e.stopPropagation()}
                >
                  ⋮
                </button>
              </Dropdown>
            </div>
<FolderTree nodes={nodes} depth={depth + 1} autoExpandId={autoExpandId} searchQuery={searchQuery} />
            </div>
          ) : (
            displayNodes.map((folder) => (
            <div key={folder.id}>
              <div
                className={`folder-tree__item ${dragOver === folder.id ? 'folder-tree__item--dragover' : ''} ${
                  state.currentFolderId === folder.id ? 'folder-tree__item--active' : ''
                }`}
                data-folder-id={folder.id}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/node-id', folder.id)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, folder.id)}
                onClick={() => handleClick(folder)}
              >
                <span className="folder-tree__icon">
                  {expanded[folder.id] ? <FolderOpenOutlined /> : <FolderOutlined />}
                </span>
                <span className="folder-tree__name">
                  {folder.encrypted && (
                    <LockOutlined style={{ marginRight: 4, fontSize: 11 }} />
                  )}
                  {folder.name}
                </span>
                {folder.encrypted && state.folderAccess[folder.id] && (
                  <span className="folder-tree__unlocked"><CheckOutlined /></span>
                )}
                <Dropdown
                  menu={{ items: buildMenuItems(folder) }}
                  trigger={['click']}
                  overlayClassName="folder-card-dropdown"
                >
                  <button
                    className="folder-tree__delete"
                    title="更多操作"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋮
                  </button>
                </Dropdown>
              </div>
              {expanded[folder.id] && folder.children.length > 0 && (
                <FolderTree nodes={folder.children} depth={depth + 1} autoExpandId={autoExpandId} searchQuery={searchQuery} />
              )}
            </div>
          ))
        )}
      </div>

      {unlockId && (
        <VerifyPasswordModal
          open
          folderName={displayNodes.find((f) => f.id === unlockId)?.name ?? ''}
          hint={displayNodes.find((f) => f.id === unlockId)?.passwordHint}
          onClose={() => setUnlockId(null)}
          onConfirm={async (password) => {
            const ok = await verifyFolderPassword(unlockId, password);
            if (!ok) throw new Error('密码错误');
            handleUnlockAndSelect(unlockId);
          }}
        />
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
          onClose={() => setDecryptTarget(null)}
          onConfirm={async (password) => {
            const ok = await verifyFolderPassword(decryptTarget.id, password);
            if (!ok) throw new Error('密码错误');
            const folder = decryptTarget;
            setDecryptTarget(null);
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
          onClose={() => setEncryptTarget(null)}
          onConfirm={async (password, hint) => {
            if (!encryptTarget) return;
            const folder = encryptTarget;
            setEncryptTarget(null);
            await changeFolderType(folder.id, true, password, hint ?? '');
          }}
        />
      )}

      {showFolderModal && (
        <Modal
          open
          onClose={() => setShowFolderModal(false)}
          title={newFolderTargetId ? '新建子文件夹' : '新建文件夹'}
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
          onRename={(name) => renameNode(renameTarget.id, name)}
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
    </>
  );
}
