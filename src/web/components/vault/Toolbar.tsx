/**
 * 操作工具栏组件
 * 用于 VaultScreen，提供导入文件、新建文件/笔记/密码本、搜索当前文件夹文件等操作
 */
import { useMemo, useState } from 'react';
import { useVault } from '../../../core/context/VaultContext';
import { Tooltip } from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  KeyOutlined,
  SearchOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { findNode } from '../../../core/utils/tree';
import type { FolderNode } from '../../../core/types';

interface ToolbarProps {
  onAddFile: (handle: FileSystemFileHandle) => void;
}

export function Toolbar({ onAddFile }: ToolbarProps) {
  const { state, setFileFilter, createNote, createPasswordBook } = useVault();
  const [creatingBook, setCreatingBook] = useState(false);

  const encrypted = useMemo(() => {
    const node = state.currentFolderId ? findNode(state.tree, state.currentFolderId) : null;
    return node?.type === 'folder' ? (node as FolderNode).encrypted : false;
  }, [state.currentFolderId, state.tree]);

  const folderName = useMemo(() => {
    if (state.currentFolderId === state.rootId) return state.vaultFolder?.name ?? '';
    if (state.currentFolderId) {
      const node = findNode(state.tree, state.currentFolderId);
      if (node?.name) return node.name;
    }
    return state.vaultFolder?.name ?? '';
  }, [state.currentFolderId, state.rootId, state.tree, state.vaultFolder]);

  const handleUpload = async () => {
    try {
      const handles = await window.showOpenFilePicker({ multiple: true, mode: 'readwrite' });
      for (const h of handles) {
        onAddFile(h);
      }
    } catch {
    }
  };

  const handleCreateNote = async () => {
    try {
      await createNote('未命名笔记', state.currentFolderId);
    } catch {
    }
  };

  const handleCreatePasswordBook = async () => {
    setCreatingBook(true);
    try {
      await createPasswordBook('未命名密码本', state.currentFolderId);
    } catch {
    } finally {
      setCreatingBook(false);
    }
  };

  return (
    <div className="toolbar">
      <span className="toolbar__folder">
        {folderName}
        {encrypted && (
          <span className="toolbar__tag">加密</span>
        )}
      </span>

      <div className="toolbar__right">
        <div className="toolbar__search">
          <SearchOutlined className="toolbar__search-icon" />
          <input
            className="toolbar__search-input"
            type="text"
            placeholder="搜索文件..."
            value={state.fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
          />
        </div>

        <Tooltip title="上传文件">
          <button
            className="toolbar__btn"
            onClick={handleUpload}
            disabled={state.isLoading}
          >
            <UploadOutlined />
          </button>
        </Tooltip>
        <Tooltip title="新建笔记">
          <button
            className="toolbar__btn"
            onClick={handleCreateNote}
            disabled={state.isLoading}
          >
            <FileTextOutlined />
          </button>
        </Tooltip>
        <Tooltip title={creatingBook ? '创建中...' : '新建密码本'}>
          <button
            className="toolbar__btn toolbar__btn--loading"
            onClick={handleCreatePasswordBook}
            disabled={state.isLoading || creatingBook}
          >
            {creatingBook ? <LoadingOutlined spin /> : <KeyOutlined />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
