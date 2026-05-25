import { useState, useCallback, useRef, useEffect } from 'react';
import { LogoIcon } from '../../../shared/components/ui/LogoIcon';
import { FolderOutlined, FolderOpenOutlined, RightOutlined, DeleteOutlined } from '@ant-design/icons';

interface VaultInfo {
  name: string;
  rootPath: string;
}

interface VaultListProps {
  vaults: VaultInfo[];
  onSelect: (vault: VaultInfo) => void;
  onCreate: () => void;
  onDelete: (vault: VaultInfo) => void;
}

function VaultRow({ vault, onSelect, onDelete }: { vault: VaultInfo; onSelect: (v: VaultInfo) => void; onDelete: (v: VaultInfo) => void }) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const delBtnRef = useRef<HTMLButtonElement>(null);
  const swipeFlagRef = useRef(false);

  useEffect(() => {
    const el = delBtnRef.current;
    if (!el) return;
    el.style.transition = 'right 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    el.style.right = open ? '0px' : '-100px';
  }, [open]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    let touch = { startX: 0, startY: 0, swiping: false };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touch = { startX: t.clientX, startY: t.clientY, swiping: false };
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - touch.startX;
      const dy = t.clientY - touch.startY;

      if (!touch.swiping) {
        if (Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 10) {
          touch.swiping = true;
        } else {
          return;
        }
      }

      e.preventDefault();

      const offset = open ? 0 : -100;
      const el = delBtnRef.current;
      if (el) {
        el.style.transition = 'none';
        el.style.right = `${Math.max(-100, Math.min(0, offset - dx))}px`;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!touch.swiping) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - touch.startX;

      swipeFlagRef.current = true;
      setTimeout(() => { swipeFlagRef.current = false; }, 400);

      if (open) {
        if (dx > 20) setOpen(false);
      } else {
        if (dx < -40) setOpen(true);
      }
    };

    row.addEventListener('touchstart', onStart, { passive: true });
    row.addEventListener('touchmove', onMove, { passive: false });
    row.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      row.removeEventListener('touchstart', onStart);
      row.removeEventListener('touchmove', onMove);
      row.removeEventListener('touchend', onEnd);
    };
  }, [open]);

  const handleClick = useCallback(() => {
    if (swipeFlagRef.current) return;
    if (open) { setOpen(false); return; }
    onSelect(vault);
  }, [vault, onSelect, open]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    onDelete(vault);
  }, [vault, onDelete]);

  return (
    <div className="vl-row-wrap">
      <button
        ref={delBtnRef}
        className="vl-row__del-btn"
        onClick={handleDelete}
      >
        <DeleteOutlined />
        <span>删除</span>
      </button>
      <div
        ref={rowRef}
        className="vl-row"
        onClick={handleClick}
      >
        <div className="vl-row__icon">
          <FolderOutlined style={{ fontSize: 18, color: '#c89b3c' }} />
        </div>
        <div className="vl-row__info">
          <span className="vl-row__name">{vault.name}</span>
          <span className="vl-row__path">{vault.rootPath}</span>
        </div>
        <RightOutlined className="vl-row__arrow" />
      </div>
    </div>
  );
}

export function VaultList({ vaults, onSelect, onCreate, onDelete }: VaultListProps) {
  return (
    <div className="vl-screen">
      <header className="vl-header">
        <LogoIcon size={28} />
        <h1 className="vl-header__title">Vault</h1>
      </header>

      <div className="vl-body">
        {vaults.length > 0 ? (
          <div className="vl-list">
            {vaults.map((v) => (
              <VaultRow key={v.rootPath} vault={v} onSelect={onSelect} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className="vl-empty">
            <div className="vl-empty__icon">
              <FolderOpenOutlined />
            </div>
            <span className="vl-empty__text">未找到保险箱</span>
            <span className="vl-empty__hint">
              将保险箱文件夹拷贝到 App 文档目录即可
            </span>
          </div>
        )}
      </div>

      <footer className="vl-footer">
        <button className="vl-create-btn" onClick={onCreate}>
          <span>+</span>
          <span>新建保险箱</span>
        </button>
      </footer>
    </div>
  );
}
