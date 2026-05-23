/**
 * 最近保险箱网格展示组件
 * 用于 UnlockScreen，展示 IndexedDB 中存储的最近打开目录列表
 */
import { Dropdown, App } from 'antd';
import type { MenuProps } from 'antd';
import { FolderOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import type { RecentFolder } from '../../storage/recentFolders';

interface FolderGridProps {
  recentFolders: RecentFolder[];
  onOpenRecent: (folder: RecentFolder) => void;
  onRemoveRecent: (id: string) => void;
  loading: boolean;
}

const menuItems: MenuProps['items'] = [
  {
    key: 'delete',
    label: '删除',
    danger: true,
    icon: <DeleteOutlined />,
  },
];

export function FolderGrid({
  recentFolders,
  onOpenRecent,
  onRemoveRecent,
  loading,
}: FolderGridProps) {
  const { modal } = App.useApp();

  const handleMenuClick = (folder: RecentFolder, info: Parameters<NonNullable<MenuProps['onClick']>>[0]) => {
    info.domEvent.stopPropagation();
    if (info.key === 'delete') {
      modal.confirm({
        title: '确认删除',
        content: (
          <>
            确定要从列表中移除「{folder.name}」吗？
            <br />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
              此操作仅移除记录，不会删除文件夹中的文件。
            </span>
          </>
        ),
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => onRemoveRecent(folder.id),
      });
    }
  };

  return (
    <div className="folder-grid">
      {recentFolders.map((folder) => (
        <div
          key={folder.id}
          className="folder-card"
          onClick={() => {
            if (!loading) onOpenRecent(folder);
          }}
        >
          <Dropdown
            menu={{
              items: menuItems,
              onClick: (info) => handleMenuClick(folder, info),
            }}
            trigger={['click']}
            classNames={{ root: 'folder-card-dropdown' }}
          >
            <button
              className="folder-card__delete"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreOutlined />
            </button>
          </Dropdown>
          <span className="folder-card__icon"><FolderOutlined /></span>
          <span className="folder-card__name">{folder.name}</span>
        </div>
      ))}
    </div>
  );
}
