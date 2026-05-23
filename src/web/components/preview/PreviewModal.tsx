import { useEffect, useState, useCallback, useRef } from 'react';
import { Input, Space } from 'antd';
import { EditOutlined, LockOutlined, FileTextOutlined, FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useVault } from '../../../core/context/VaultContext';
import { Modal } from '../ui/Modal';
import { ImagePreview } from './ImagePreview';
import { PdfPreview } from './PdfPreview';
import { NoteEditor } from './NoteEditor';
import { PasswordBook } from '../password/PasswordBook';
import { IMAGE_MIME_TYPES, PDF_MIME_TYPE } from '../../../core/utils/constants';
import { isTextFileName } from '../../../core/utils/textMimeTypes';
import { findNode } from '../../../core/utils/tree';

import type { PasswordEntry, FileNode } from '../../../core/types';

function getFileIcon(mimeType: string, size: number) {
  if (mimeType.startsWith('image/')) return <FileImageOutlined />;
  if (mimeType === PDF_MIME_TYPE) return <FilePdfOutlined />;
  if (size > 0) return <FileTextOutlined />;
  return <FileTextOutlined />;
}

function isPreviewable(fileName: string, mimeType: string, origin: string): boolean {
  if (origin === 'password-book') return true;
  if (isTextFileName(fileName)) return true;
  if (IMAGE_MIME_TYPES.includes(mimeType)) return true;
  if (mimeType === PDF_MIME_TYPE) return true;
  return false;
}

export function PreviewModal() {
  const { state, getFileBlob, setEditingFile, saveFileContent, renameNode } = useVault();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileNode, setFileNode] = useState<FileNode | null>(null);
  const [fileOrigin, setFileOrigin] = useState<string>('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [renameLocked, setRenameLocked] = useState(true);
  const editInputRef = useRef<HTMLInputElement>(null);

  const fileId = state.editingFileId;

  const treeRef = useRef(state.tree);
  treeRef.current = state.tree;
  const getFileBlobRef = useRef(getFileBlob);
  getFileBlobRef.current = getFileBlob;

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    setEditing(false);
    setBlob(null);
    const node = findNode(treeRef.current, fileId) as FileNode | null;
    if (node && node.type === 'file') {
      setFileName(node.name);
      setFileNode(node);
      setFileOrigin(node.origin);
      setFileMimeType(node.mimeType);
      if (isPreviewable(node.name, node.mimeType, node.origin)) {
        getFileBlobRef.current(fileId).then((result) => {
          if (result) setBlob(result.blob);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [fileId]);

  const handleNoteSave = useCallback(
    async (content: string) => {
      if (!fileId) return;
      await saveFileContent(fileId, content);
    },
    [fileId, saveFileContent],
  );

  const handlePasswordBookSave = useCallback(
    async (entries: PasswordEntry[]) => {
      if (!fileId) return;
      await saveFileContent(fileId, JSON.stringify(entries));
    },
    [fileId, saveFileContent],
  );

  /* 提取文件扩展名 */
  const fileExt = (() => {
    const dot = fileName.lastIndexOf('.');
    if (dot <= 0) return '';
    return fileName.slice(dot);
  })();
  const baseName = fileExt ? fileName.slice(0, -fileExt.length) : fileName;

  const startEditing = useCallback(() => {
    setEditValue(baseName);
    setRenameLocked(!!fileExt);
    setEditing(true);
    requestAnimationFrame(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    });
  }, [baseName, fileExt]);

  const handleUnlockExt = () => {
    setEditValue(baseName + fileExt);
    setRenameLocked(false);
  };

  const confirmRename = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!fileId || !trimmed || trimmed === fileName) {
      setEditing(false);
      return;
    }

    let finalName: string;
    if (renameLocked && fileExt) {
      finalName = trimmed + fileExt;
    } else {
      const dotIndex = fileName.lastIndexOf('.');
      const originalExt = dotIndex > 0 ? fileName.slice(dotIndex) : '';
      const isText = isTextFileName(fileName);
      if (isText || !originalExt) {
        finalName = (dotIndex > 0 && !trimmed.includes('.'))
          ? `${trimmed}${originalExt}`
          : trimmed;
      } else {
        const nameBody = trimmed.lastIndexOf('.') > 0
          ? trimmed.substring(0, trimmed.lastIndexOf('.'))
          : trimmed;
        finalName = `${nameBody}${originalExt}`;
      }
    }

    setFileName(finalName);
    setEditing(false);
    await renameNode(fileId, finalName);
  }, [editValue, fileId, fileName, fileExt, renameLocked, renameNode]);

  const cancelRename = useCallback(() => {
    setEditValue(fileName);
    setEditing(false);
  }, [fileName]);

  if (!fileId) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="preview-body preview-body--loading">
          <div className="preview-skeleton" />
        </div>
      );
    }

    if (!isPreviewable(fileName, fileMimeType, fileOrigin)) {
      return (
        <div className="preview-body preview-body--unsupported">
          <span className="preview-body__icon">?</span>
          <p>此文件类型不支持预览</p>
          <p className="preview-body__hint">请导出文件后使用外部工具查看</p>
        </div>
      );
    }

    if (!blob) {
      return (
        <div className="preview-body preview-body--error">
          <span className="preview-body__icon">!</span>
          <p>无法加载文件</p>
        </div>
      );
    }

    if (fileOrigin === 'password-book') {
      return (
        <div className="preview-body">
          <PasswordBookAsync blob={blob} onSave={handlePasswordBookSave} />
        </div>
      );
    }

    if (isTextFileName(fileName)) {
      return (
        <div className="preview-body preview-body--editor">
          <NoteEditor blob={blob} onSave={handleNoteSave} mimeType={fileMimeType} fileName={fileName} />
        </div>
      );
    }

    if (IMAGE_MIME_TYPES.includes(fileMimeType)) {
      return (
        <div className="preview-body preview-body--media">
          <ImagePreview blob={blob} />
        </div>
      );
    }

    if (fileMimeType === PDF_MIME_TYPE) {
      return (
        <div className="preview-body preview-body--media">
          <PdfPreview blob={blob} />
        </div>
      );
    }

    return (
      <div className="preview-body preview-body--unsupported">
        <span className="preview-body__icon">?</span>
        <p>此文件类型不支持预览</p>
        <p className="preview-body__hint">请导出文件后使用外部工具查看</p>
      </div>
    );
  };

  const fileSize = fileNode?.size ?? 0;

  return (
    <Modal
      open
      onClose={() => setEditingFile(null)}
      title={
        <div className="preview-header">
          <span className="preview-header__icon">{getFileIcon(fileMimeType, fileSize)}</span>
          {editing ? (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                ref={editInputRef as any}
                className="preview-header__input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onPressEnter={confirmRename}
                onBlur={confirmRename}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelRename(); }}
                variant="borderless"
                size="small"
              />
              {renameLocked && fileExt && (
                <span
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleUnlockExt}
                  title="点击可修改后缀"
                  style={{
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    padding: '0 8px',
                    background: 'transparent',
                    border: 'none',
                    lineHeight: 1,
                  }}
                >
                  <LockOutlined style={{ fontSize: 10 }} />
                  {fileExt}
                </span>
              )}
            </Space.Compact>
          ) : (
            <span className="preview-header__name" onClick={startEditing}>
              {fileName}
              <EditOutlined className="preview-header__edit-icon" />
            </span>
          )}
        </div>
      }
      width="lg"
    >
      {renderContent()}
    </Modal>
  );
}

function PasswordBookAsync({
  blob,
  onSave,
}: {
  blob: Blob;
  onSave: (entries: PasswordEntry[]) => Promise<void>;
}) {
  const [entries, setEntries] = useState<PasswordEntry[] | null>(null);

  useEffect(() => {
    blob.text().then((t) => {
      try {
        setEntries(JSON.parse(t));
      } catch {
        setEntries([]);
      }
    });
  }, [blob]);

  if (!entries) return <div className="preview-loading">加载中...</div>;
  return <PasswordBook entries={entries} onSave={onSave} />;
}
