/**
 * 文件预览入口弹窗
 * 用于 VaultScreen，根据文件类型分发到 TextPreview/ImagePreview/PdfPreview/NoteEditor/PasswordBook
 */
import { useEffect, useState, useCallback } from 'react';
import { useVault } from '../../context/VaultContext';
import { Modal } from '../ui/Modal';
import { TextPreview } from './TextPreview';
import { ImagePreview } from './ImagePreview';
import { PdfPreview } from './PdfPreview';
import { NoteEditor } from './NoteEditor';
import { PasswordBook } from '../password/PasswordBook';
import { IMAGE_MIME_TYPES, PDF_MIME_TYPE } from '../../utils/constants';
import { findNode } from '../../utils/tree';
import type { PasswordEntry, FileNode } from '../../types';

export function PreviewModal() {
  const { state, getFileBlob, setEditingFile, saveFileContent } = useVault();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileOrigin, setFileOrigin] = useState<string>('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [loading, setLoading] = useState(true);

  const fileId = state.editingFileId;

  useEffect(() => {
    if (!fileId) { console.log("[PreviewModal] no fileId"); return; }
    console.log("[PreviewModal] loading fileId:", fileId);
    setLoading(true);
    const node = findNode(state.tree, fileId) as FileNode | null;
    console.log("[PreviewModal] node found:", !!node, node?.type, "tree length:", state.tree.length);
    if (node && node.type === 'file') {
      setFileName(node.name);
      setFileOrigin(node.origin);
      setFileMimeType(node.mimeType);
      console.log("[PreviewModal] calling getFileBlob for:", node.name);
      getFileBlob(fileId).then((result) => {
        console.log("[PreviewModal] getFileBlob result:", !!result);
        if (result) setBlob(result.blob);
        setLoading(false);
      });
    } else {
      console.log("[PreviewModal] node not found or not a file, setting loading false");
      setLoading(false);
    }
  }, [fileId, getFileBlob, state.tree]);

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

  if (!fileId) return null;

  const renderContent = () => {
    if (loading) return <div className="preview-loading">加载中...</div>;
    if (!blob) return <div className="preview-error">无法加载文件</div>;

    if (fileOrigin === 'password-book') {
      return <PasswordBookAsync blob={blob} onSave={handlePasswordBookSave} />;
    }

    if (fileOrigin === 'note') {
      return <NoteEditor blob={blob} onSave={handleNoteSave} />;
    }

    if (fileMimeType.startsWith('text/')) {
      return <TextPreview blob={blob} />;
    }

    if (IMAGE_MIME_TYPES.includes(fileMimeType)) {
      return <ImagePreview blob={blob} />;
    }

    if (fileMimeType === PDF_MIME_TYPE) {
      return <PdfPreview blob={blob} />;
    }

    return <div className="preview-unsupported">此文件类型不支持预览</div>;
  };

  return (
    <Modal
      open
      onClose={() => setEditingFile(null)}
      title={fileName}
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
