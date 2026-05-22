/**
 * 文件列表组件
 * 用于 VaultScreen，展示当前文件夹下的文件列表，支持排序、多选、筛选
 */
import { useState, useMemo } from 'react';
import { Table, App, Dropdown, Modal, Input } from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import {
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  EditOutlined,
  ExportOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  LockOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useVault } from '../../context/VaultContext';
import type { VaultNode, FileNode, FolderNode } from '../../types';
import { formatFileSize, formatDate } from '../../utils/format';
import { IMAGE_MIME_TYPES, PDF_MIME_TYPE } from '../../utils/constants';
import { isTextFileName } from '../../utils/textMimeTypes';
import { MoveFileModal } from '../modals/MoveFileModal';

function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType.startsWith('image/')) return <FileImageOutlined />;
  if (mimeType === PDF_MIME_TYPE) return <FilePdfOutlined />;
  if (mimeType.startsWith('text/')) return <FileTextOutlined />;
  return <FileOutlined />;
}

/** 提取文件扩展名（含点，如 .txt） */
function getFileExt(name: string) {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot);
}

export function FileList() {
  const {
    state, setEditingFile, exportFile, deleteNode, renameNode, moveNode,
    toggleFileSelection, setSelectedFileIds,
  } = useVault();
  const { modal, message } = App.useApp();

  // 单行选中高亮
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // 重命名弹窗状态
  const [renameTarget, setRenameTarget] = useState<FileNode | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameUnlocked, setRenameUnlocked] = useState(false);

  // 移动弹窗状态
  const [moveFileId, setMoveFileId] = useState<string | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);

  // ---- 数据加工 ----

  const currentNode = useMemo((): VaultNode[] => {
    const findFolder = (nodes: VaultNode[], id: string): FolderNode | null => {
      for (const n of nodes) {
        if (n.type === 'folder' && n.id === id) return n;
        if (n.type === 'folder') {
          const found = findFolder(n.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    if (state.currentFolderId) {
      const folder = findFolder(state.tree, state.currentFolderId);
      return folder?.children ?? state.tree;
    }
    return state.tree;
  }, [state.tree, state.currentFolderId]);

  const files = useMemo(() => {
    return currentNode.filter((n): n is FileNode => n.type === 'file');
  }, [currentNode]);

  const filteredFiles = useMemo(() => {
    if (!state.fileFilter.trim()) return files;
    const q = state.fileFilter.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, state.fileFilter]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let cmp = 0;
      if (state.sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (state.sortBy === 'size') cmp = a.size - b.size;
      else cmp = a.modifiedAt - b.modifiedAt;
      return state.sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredFiles, state.sortBy, state.sortOrder]);

  // ---- 操作 ----

  const handleOpen = (file: FileNode) => {
    if (file.origin === 'import') {
      const previewable = isTextFileName(file.name)
        || IMAGE_MIME_TYPES.includes(file.mimeType)
        || file.mimeType === PDF_MIME_TYPE;
      if (previewable) {
        setEditingFile(file.id);
      } else {
        message.info('该文件类型不支持预览，请导出后查看');
      }
    } else {
      setEditingFile(file.id);
    }
  };

  const handleDelete = (file: FileNode) => {
    modal.confirm({
      title: '删除文件',
      content: (
        <>
          确定要删除「{file.name}」吗？
          <br />
          <span style={{ color: 'var(--color-danger)', fontSize: 13 }}>
            文件将被永久删除，无法恢复。
          </span>
        </>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => deleteNode(file.id),
    });
  };

  const handleExport = (file: FileNode) => {
    if (file.origin === 'password-book') {
      modal.confirm({
        title: '导出密码本',
        type: 'warning',
        content: (
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            密码本将导出为明文 JSON 文件，包含所有条目的用户名和密码。
            <br />
            请妥善保管，用完及时删除。
          </div>
        ),
        okText: '确认导出',
        cancelText: '取消',
        onOk: () => exportFile(file.id),
      });
    } else {
      exportFile(file.id);
    }
  };

  // ---- 重命名逻辑 ----

  const handleStartRename = (file: FileNode) => {
    const ext = getFileExt(file.name);
    setRenameTarget(file);
    setRenameValue(ext ? file.name.slice(0, -ext.length) : file.name);
    setRenameUnlocked(false);
    setRenameOpen(true);
  };

  const handleUnlockExt = () => {
    if (!renameTarget) return;
    setRenameValue(renameTarget.name);
    setRenameUnlocked(true);
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenameOpen(false); return; }
    const ext = getFileExt(renameTarget.name);
    const fullName = renameUnlocked ? trimmed : trimmed + ext;
    if (fullName === renameTarget.name) { setRenameOpen(false); return; }
    try {
      await renameNode(renameTarget.id, fullName);
      setRenameOpen(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '重命名失败');
    }
  };

  // ---- 菜单 ----

  const getMenuItems = (file: FileNode): MenuProps['items'] => [
    {
      key: 'open', icon: <EyeOutlined />, label: '打开',
      onClick: () => handleOpen(file),
    },
    {
      key: 'rename', icon: <EditOutlined />, label: '重命名',
      onClick: () => handleStartRename(file),
    },
    {
      key: 'export', icon: <ExportOutlined />, label: '导出',
      onClick: () => handleExport(file),
    },
    {
      key: 'move', icon: <FolderOutlined />, label: '移动到...',
      onClick: () => { setMoveFileId(file.id); setMoveModalOpen(true); },
    },
    { type: 'divider' },
    {
      key: 'delete', icon: <DeleteOutlined />, label: '删除',
      danger: true,
      onClick: () => handleDelete(file),
    },
  ];

  // ---- 列定义 ----

  const columns: TableColumnsType<FileNode> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FileNode) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, lineHeight: 1, color: 'var(--color-accent)' }}>
            {getFileIcon(record.mimeType)}
          </span>
          <span className="file-list__cell-name">{name}</span>
        </span>
      ),
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
      width: 100,
      align: 'center',
    },
    {
      title: '修改时间',
      dataIndex: 'modifiedAt',
      key: 'modifiedAt',
      render: (date: number) => formatDate(date),
      width: 180,
      align: 'center',
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_, record: FileNode) => (
        <Dropdown
          menu={{ items: getMenuItems(record) }}
          trigger={['click']}
          overlayClassName="folder-card-dropdown"
        >
          <button
            className="file-item__btn"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreOutlined />
          </button>
        </Dropdown>
      ),
    },
  ];

  // ---- 行选中 ----

  const rowSelection = {
    selectedRowKeys: state.selectedFileIds,
    onChange: (keys: React.Key[]) => setSelectedFileIds(keys as string[]),
    columnWidth: 40,
  };

  if (files.length === 0) {
    return (
      <div className="file-list__empty">
        <p>{state.fileFilter.trim() ? '未找到匹配的文件' : '此文件夹为空'}</p>
      </div>
    );
  }

  return (
    <>
      <Table<FileNode>
        className="file-table"
        dataSource={sortedFiles}
        columns={columns}
        rowKey="id"
        rowSelection={rowSelection}
        onRow={(record) => ({
          onClick: () => {
            setSelectedFileId(record.id);
            toggleFileSelection(record.id);
          },
          onDoubleClick: () => {
            handleOpen(record);
          },
        })}
        rowClassName={(record) => {
          const classes = ['file-table__row'];
          if (record.id === selectedFileId) classes.push('file-table__row--active');
          if (state.selectedFileIds.includes(record.id)) {
            classes.push('file-table__row--selected');
          }
          return classes.join(' ');
        }}
        pagination={false}
        showHeader={true}
        size="small"
        locale={{ emptyText: '此文件夹为空' }}
      />

      {/* 重命名弹窗 */}
      <Modal
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        title="重命名"
        footer={null}
        destroyOnClose
        centered
        width={400}
      >
        {renameTarget && (() => {
          const ext = getFileExt(renameTarget.name);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onPressEnter={handleRename}
                autoFocus
                addonAfter={!renameUnlocked && ext ? (
                  <span
                    onClick={handleUnlockExt}
                    title="点击可修改后缀"
                    style={{
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      padding: '0 4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <LockOutlined style={{ fontSize: 10 }} />
                    {ext}
                  </span>
                ) : undefined}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setRenameOpen(false)}
                  style={{
                    padding: '6px 16px', background: 'none',
                    border: '1px solid var(--color-border)', borderRadius: 8,
                    color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 14,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleRename}
                  disabled={!renameValue.trim()}
                  style={{
                    padding: '6px 16px', background: 'var(--color-accent)',
                    border: 'none', borderRadius: 8, color: '#fff',
                    cursor: 'pointer', fontSize: 14,
                  }}
                >
                  确认
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <MoveFileModal
        open={moveModalOpen}
        currentFolderId={state.currentFolderId}
        title="移动到"
        onCancel={() => setMoveModalOpen(false)}
        onConfirm={(folderId) => {
          if (moveFileId) moveNode(moveFileId, folderId);
          setSelectedFileIds([]);
          setMoveModalOpen(false);
        }}
      />
    </>
  );
}
