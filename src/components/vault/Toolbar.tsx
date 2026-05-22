/**
 * 操作工具栏组件
 * 用于 VaultScreen，提供导入文件、新建文件/笔记/密码本、进入批量模式等操作
 */
import { useRef, useMemo } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  UploadOutlined,
  FileTextOutlined,
  KeyOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { findNode } from '../../utils/tree';
import type { FolderNode } from '../../types';

interface ToolbarProps {
  onAddFile: (file: File) => void;
  fileSearchQuery: string;
  onFileSearchChange: (query: string) => void;
}

export function Toolbar({ onAddFile, fileSearchQuery, onFileSearchChange }: ToolbarProps) {
  const { state, createNote, createPasswordBook } = useVault();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const f of Array.from(files)) {
        onAddFile(f);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateNote = async () => {
    await createNote('未命名笔记', state.currentFolderId);
  };

  const handleCreatePasswordBook = async () => {
    try {
      await createPasswordBook('未命名密码本', state.currentFolderId);
    } catch {
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
            value={fileSearchQuery}
            onChange={(e) => onFileSearchChange(e.target.value)}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="toolbar__btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={state.isLoading}
          title="上传文件"
        >
          <UploadOutlined />
        </button>
        <button
          className="toolbar__btn"
          onClick={handleCreateNote}
          disabled={state.isLoading}
          title="新建笔记"
        >
          <FileTextOutlined />
        </button>
        <button
          className="toolbar__btn"
          onClick={handleCreatePasswordBook}
          disabled={state.isLoading}
          title="新建密码本"
        >
          <KeyOutlined />
        </button>
      </div>
    </div>
  );
}
