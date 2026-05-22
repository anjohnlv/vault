/**
 * 文件列表组件
 * 用于 VaultScreen，展示当前文件夹下的文件列表，支持排序和选中
 */
import { useMemo, useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { FileItem } from './FileItem';
import type { VaultNode, FileNode, FolderNode } from '../../types';

interface FileListProps {
  fileSearchQuery: string;
}

export function FileList({ fileSearchQuery }: FileListProps) {
  const { state } = useVault();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // 获取当前文件夹下的节点
  const currentNode = useMemo((): VaultNode[] => {
    if (state.searchQuery.trim()) return state.searchResults;

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
  }, [state.tree, state.currentFolderId, state.searchQuery, state.searchResults]);

  // 分离文件和文件夹
  const { files } = useMemo(() => {
    const f: FileNode[] = [];
    for (const node of currentNode) {
      if (node.type === 'file') f.push(node);
    }
    return { files: f };
  }, [currentNode]);

  const filteredFiles = useMemo(() => {
    if (!fileSearchQuery.trim()) return files;
    const q = fileSearchQuery.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, fileSearchQuery]);

  // 排序
  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let cmp = 0;
      if (state.sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (state.sortBy === 'size') cmp = a.size - b.size;
      else cmp = a.modifiedAt - b.modifiedAt;
      return state.sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredFiles, state.sortBy, state.sortOrder]);

  if (currentNode.length === 0) {
    return (
      <div className="file-list__empty">
        <p>此文件夹为空</p>
      </div>
    );
  }

  if (fileSearchQuery.trim() && sortedFiles.length === 0) {
    return (
      <div className="file-list__empty">
        <p>未找到匹配的文件</p>
      </div>
    );
  }

  return (
    <div className="file-list">
      <div className="file-list__header">
        <span className="file-list__h-name">名称</span>
        <span className="file-list__h-size">大小</span>
        <span className="file-list__h-date">修改时间</span>
        <span className="file-list__h-actions">操作</span>
      </div>
      {sortedFiles.map((f) => (
        <FileItem
          key={f.id}
          file={f}
          isSelected={selectedFileId === f.id}
          onSelect={setSelectedFileId}
        />
      ))}
    </div>
  );
}
