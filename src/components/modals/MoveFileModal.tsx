/**
 * 移动文件弹窗
 * 用于 FileItem，将文件移动到其他文件夹
 */
import React from "react";
import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useVault } from '../../context/VaultContext';
import type { VaultNode, FolderNode } from '../../types';

interface Props {
  nodeId: string;
  nodeName: string;
  open: boolean;
  onClose: () => void;
}

export function MoveFileModal({ nodeId, nodeName, open, onClose }: Props) {
  const { state, moveNode } = useVault();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const renderFolders = (nodes: VaultNode[], depth: number = 0): React.ReactElement[] => {
    const folders = nodes.filter((n) => n.type === 'folder') as FolderNode[];
    return folders.flatMap((f) => {
      if (f.id === nodeId) return [];
      return [
        <div
          key={f.id}
          className={`move-modal__item ${selectedFolder === f.id ? 'move-modal__item--selected' : ''}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => setSelectedFolder(f.id)}
        >
          {selectedFolder === f.id ? '📂' : '📁'} {f.name}
        </div>,
        ...renderFolders(f.children, depth + 1),
      ];
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`移动: ${nodeName}`}>
      <div className="modal-form">
        <div className="move-modal__root" onClick={() => setSelectedFolder(null)}>
          {selectedFolder === null ? '📂' : '📁'} 根目录
        </div>
        {renderFolders(state.tree)}
        <Button
          onClick={() => {
            moveNode(nodeId, selectedFolder);
            onClose();
          }}
        >
          移动到此处
        </Button>
      </div>
    </Modal>
  );
}
