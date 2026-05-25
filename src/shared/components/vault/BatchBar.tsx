/**
 * 批量操作栏组件
 * 用于 VaultScreen，有文件选中时显示底栏，支持批量移动、导出、删除
 */
import { useState } from 'react';
import { App } from 'antd';
import { useVault } from '../../../core/context/VaultContext';
import { Button } from '../ui/Button';
import { MoveFileModal } from '../modals/MoveFileModal';

export function BatchBar() {
  const { state, batchDelete, batchExport, batchMove, setSelectedFileIds } = useVault();
  const { modal } = App.useApp();
  const [moveModalOpen, setMoveModalOpen] = useState(false);

  if (state.selectedFileIds.length === 0) return null;

  const handleBatchDelete = () => {
    modal.confirm({
      title: `批量删除 ${state.selectedFileIds.length} 个文件`,
      content: (
        <>
          确定要删除选中的 {state.selectedFileIds.length} 个文件吗？
          <br />
          <span style={{ color: 'var(--color-danger)', fontSize: 13 }}>
            文件将被永久删除，无法恢复。
          </span>
        </>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: batchDelete,
    });
  };

  return (
    <>
    <div className="batch-bar">
      <span className="batch-bar__count">已选 {state.selectedFileIds.length} 项</span>
      <Button size="sm" variant="outline" onClick={batchExport}>
        批量导出
      </Button>
      <Button size="sm" variant="outline" onClick={() => setMoveModalOpen(true)}>
        批量移动
      </Button>
      <Button size="sm" variant="danger" onClick={handleBatchDelete}>
        批量删除
      </Button>
      <Button size="sm" variant="outline" onClick={() => setSelectedFileIds([])}>
        取消选择
      </Button>
    </div>

      <MoveFileModal
        open={moveModalOpen}
        currentFolderId={state.currentFolderId}
        title={`批量移动到（${state.selectedFileIds.length} 个文件）`}
        onCancel={() => setMoveModalOpen(false)}
        onConfirm={(folderId) => {
          batchMove(folderId);
          setMoveModalOpen(false);
        }}
      />
    </>
  );
}
