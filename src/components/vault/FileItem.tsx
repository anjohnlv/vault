/**
 * 文件列表项组件
 * 用于 FileList，支持单击选中、双击打开、右键菜单和重命名
 */
import { useState } from 'react';
import { App, Dropdown, Modal, Input } from 'antd';
import type { MenuProps } from 'antd';
import {
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  EditOutlined,
  ExportOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useVault } from '../../context/VaultContext';
import type { FileNode } from '../../types';
import { formatFileSize, formatDate } from '../../utils/format';
import { PDF_MIME_TYPE } from '../../utils/constants';

interface FileItemProps {
  file: FileNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType.startsWith('image/')) return <FileImageOutlined />;
  if (mimeType === PDF_MIME_TYPE) return <FilePdfOutlined />;
  if (mimeType.startsWith('text/')) return <FileTextOutlined />;
  return <FileOutlined />;
}

export function FileItem({ file, isSelected, onSelect }: FileItemProps) {
  const { state, exportFile, setEditingFile, deleteNode, renameNode, toggleFileSelection } = useVault();
  const { modal } = App.useApp();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const selected = state.batchMode ? state.selectedFileIds.includes(file.id) : isSelected;

  const isImported = file.origin === 'import';

  const handleOpen = () => {
    if (isImported) {
      exportFile(file.id);
    } else {
      setEditingFile(file.id);
    }
  };

  const handleClick = () => {
    if (state.batchMode) {
      toggleFileSelection(file.id);
      return;
    }
    onSelect(file.id);
  };

  const handleDoubleClick = () => {
    if (state.batchMode) return;
    handleOpen();
  };

  const handleStartRename = () => {
    setRenameValue(file.name);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === file.name) {
      setRenameOpen(false);
      return;
    }
    await renameNode(file.id, trimmed);
    setRenameOpen(false);
  };

  const handleDelete = () => {
    modal.confirm({
      title: '删除文件',
      content: (
        <>
          确定要删除「{file.name}」吗？
          <br />
          <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>
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

  const menuItems: MenuProps['items'] = [
    {
      key: 'open',
      icon: <EyeOutlined />,
      label: '打开',
      onClick: handleOpen,
    },
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: handleStartRename,
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: '导出',
      onClick: () => exportFile(file.id),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <div
        className={`file-item ${selected ? 'file-item--selected' : ''} ${
          isSelected ? 'file-item--active' : ''
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {state.batchMode && (
          <input
            type="checkbox"
            className="file-item__check"
            checked={selected}
            onChange={() => {}}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <span className="file-item__icon">
          {getFileIcon(file.mimeType)}
        </span>
        <span className="file-item__name">{file.name}</span>
        <span className="file-item__size">{formatFileSize(file.size)}</span>
        <span className="file-item__date">{formatDate(file.modifiedAt)}</span>
        <div className="file-item__actions" onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            overlayClassName="folder-card-dropdown"
          >
            <button
              className="file-item__btn"
              onClick={(e) => e.stopPropagation()}
            >
              ⋮
            </button>
          </Dropdown>
        </div>
      </div>

      <Modal
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        title="重命名"
        footer={null}
        destroyOnClose
        centered
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onPressEnter={handleRename}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setRenameOpen(false)}
              style={{
                padding: '6px 16px',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              取消
            </button>
            <button
              onClick={handleRename}
              disabled={!renameValue.trim()}
              style={{
                padding: '6px 16px',
                background: 'var(--color-accent)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              确认
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
