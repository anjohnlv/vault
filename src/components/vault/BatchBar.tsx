/**
 * 批量操作栏组件
 * 用于 VaultScreen，批量模式下底部操作栏，支持批量删除和导出
 */
import { useVault } from '../../context/VaultContext';
import { Button } from '../ui/Button';

export function BatchBar() {
  const { state, batchDelete, batchExport, toggleBatchMode } = useVault();

  if (!state.batchMode) return null;

  return (
    <div className="batch-bar">
      <span className="batch-bar__count">已选 {state.selectedFileIds.length} 项</span>
      <Button size="sm" variant="outline" onClick={batchExport}>
        批量导出
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={() => {
          if (confirm(`确定要删除 ${state.selectedFileIds.length} 个文件吗？`)) {
            batchDelete();
          }
        }}
      >
        批量删除
      </Button>
      <Button size="sm" variant="outline" onClick={toggleBatchMode}>
        取消
      </Button>
    </div>
  );
}
