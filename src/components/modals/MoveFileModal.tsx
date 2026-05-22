/**
 * 移动文件弹窗
 * 用于文件下拉菜单和批量操作栏，选择目标文件夹后执行移动回调
 */
import { useMemo, useState } from 'react';
import { Modal, Tree, Input } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { useVault } from '../../context/VaultContext';
import type { VaultNode } from '../../types';

interface Props {
  open: boolean;
  /** 当前所在文件夹 ID，其自身和子节点将被禁用 */
  currentFolderId: string | null;
  /** 弹窗标题 */
  title: string;
  onCancel: () => void;
  onConfirm: (targetFolderId: string | null) => void;
}

/** 将 VaultNode 树转换为 antd TreeDataNode，同时排除指定节点 */
function buildTreeData(
  nodes: VaultNode[],
  excludeId: string | null,
  search: string,
): TreeDataNode[] {
  const result: TreeDataNode[] = [];
  for (const n of nodes) {
    if (n.type !== 'folder') continue;
    const children = buildTreeData(n.children, excludeId, search);
    const nameMatch = !search || n.name.toLowerCase().includes(search);
    const hasVisibleChild = children.some((c) => !c.disabled);
    // 只保留自身匹配 or 有可见子节点的条目
    if (!nameMatch && !hasVisibleChild) continue;
    result.push({
      key: n.id,
      title: n.name,
      icon: <FolderOutlined />,
      disabled: n.id === excludeId,
      children,
    });
  }
  return result;
}

export function MoveFileModal({ open, currentFolderId, title, onCancel, onConfirm }: Props) {
  const { state } = useVault();

  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const searchLower = search.toLowerCase();

  const treeData = useMemo(
    () => buildTreeData(state.tree, currentFolderId, searchLower),
    [state.tree, currentFolderId, searchLower],
  );

  /** 默认展开所有节点（包括搜索过滤时），方便浏览文件夹层级 */
  const expandedKeys = useMemo(() => {
    const keys: string[] = [];
    const walk = (nodes: TreeDataNode[]) => {
      for (const n of nodes) {
        if (n.children?.length) {
          keys.push(n.key as string);
          walk(n.children);
        }
      }
    };
    walk(treeData);
    return keys;
  }, [treeData]);

  const handleOk = () => {
    if (selectedKey) onConfirm(selectedKey);
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={title}
      onOk={handleOk}
      okText="移动到此处"
      okButtonProps={{ disabled: !selectedKey }}
      destroyOnClose
      centered
      width={420}
    >
      <Input.Search
        placeholder="搜索文件夹..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedKey(null);
        }}
        allowClear
        style={{ marginBottom: 12 }}
      />
      <div className="move-modal__tree-wrap">
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedKey ? [selectedKey] : []}
          onSelect={(keys) => {
            setSelectedKey(keys.length > 0 ? (keys[0] as string) : null);
          }}
          showIcon
        />
        {treeData.length === 0 && (
          <div className="move-modal__empty">无可用文件夹</div>
        )}
      </div>
    </Modal>
  );
}
