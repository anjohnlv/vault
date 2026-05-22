/**
 * 密码条目卡片组件
 * 用于 PasswordBook，视图/编辑双模式，支持复制用户名/密码
 * 视图模式为可折叠面板：点击展开/收起，折叠时展示精简信息行
 */
import { useState } from 'react';
import {
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Input, Button, Popconfirm } from 'antd';
import { useToast } from '../ui/Toast';
import type { PasswordEntry } from '../../types';

interface Props {
  entry: PasswordEntry;
  onSave: (entry: PasswordEntry) => void;
  onDelete: (id: string) => void;
  initialEditing?: boolean;
  onCancelNew?: () => void;
}

export function PasswordEntryCard({
  entry,
  onSave,
  onDelete,
  initialEditing = false,
  onCancelNew,
}: Props) {
  const [editing, setEditing] = useState(initialEditing);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<'username' | 'password' | null>(null);
  const [name, setName] = useState(entry.name);
  const [username, setUsername] = useState(entry.username);
  const [password, setPassword] = useState(entry.password);
  const [notes, setNotes] = useState(entry.notes);
  const { toast } = useToast();

  const handleCopy = async (text: string, label: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label}已复制`, 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast(`${label}已复制`, 'success');
    }
    setCopyFeedback(field);
    setTimeout(() => setCopyFeedback(null), 800);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...entry,
      name: name.trim(),
      username: username.trim(),
      password,
      notes: notes.trim(),
      updatedAt: Date.now(),
    });
    setEditing(false);
  };

  const handleCancel = () => {
    if (initialEditing && onCancelNew) {
      onCancelNew();
      return;
    }
    setName(entry.name);
    setUsername(entry.username);
    setPassword(entry.password);
    setNotes(entry.notes);
    setEditing(false);
  };

  const toggleExpanded = () => {
    if (expanded) {
      setVisible(false);
    }
    setExpanded((prev) => !prev);
  };

  if (editing) {
    return (
      <div className="pw-entry-card pw-entry-card--editing">
        <div className="pw-entry-card__fields">
          <Input
            size="small"
            placeholder="名称（如：Google 账号）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            size="small"
            placeholder="邮箱或用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input.Password
            size="small"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            size="small"
            placeholder="备注（可选）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="pw-entry-card__actions">
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            disabled={!name.trim()}
            onClick={handleSave}
          />
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={handleCancel}
          />
        </div>
      </div>
    );
  }

  /* ===== Collapsed view ===== */
  if (!expanded) {
    return (
      <div
        className="pw-entry-card pw-entry-card--collapsed"
        onClick={toggleExpanded}
        title="点击展开"
      >
        <div className="pw-entry-card__collapsed-row">
          <span className="pw-entry-card__collapsed-name">{entry.name || '(未命名)'}</span>

          <span className="pw-entry-card__collapsed-sep" />

          <button
            className="pw-entry-card__collapsed-field"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(entry.username, '用户名', 'username');
            }}
            title="复制用户名"
          >
            <span className="pw-entry-card__collapsed-text">{entry.username || '(无)'}</span>
            {copyFeedback === 'username' ? (
              <CheckOutlined className="pw-entry-card__collapsed-copy pw-entry-card__collapsed-copy--done" />
            ) : (
              <CopyOutlined className="pw-entry-card__collapsed-copy" />
            )}
          </button>

          <span className="pw-entry-card__collapsed-sep" />

          <button
            className="pw-entry-card__collapsed-field"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(entry.password, '密码', 'password');
            }}
            title="复制密码"
          >
            <span className="pw-entry-card__collapsed-text pw-entry-card__collapsed-text--password">
              {'••••••••'}
            </span>
            {copyFeedback === 'password' ? (
              <CheckOutlined className="pw-entry-card__collapsed-copy pw-entry-card__collapsed-copy--done" />
            ) : (
              <CopyOutlined className="pw-entry-card__collapsed-copy" />
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ===== Expanded view ===== */
  return (
    <div className="pw-entry-card pw-entry-card--expanded">
      <div
        className="pw-entry-card__expanded-header"
        onClick={toggleExpanded}
        title="点击收起"
      >
        <span className="pw-entry-card__expanded-name">{entry.name}</span>
        <DownOutlined className="pw-entry-card__collapse-icon pw-entry-card__collapse-icon--up" />
      </div>

      {entry.notes && (
        <div className="pw-entry-card__expanded-notes">{entry.notes}</div>
      )}

      <div className="pw-entry-card__expanded-divider" />

      <div className="pw-entry-card__expanded-field">
        <span className="pw-entry-card__expanded-label">用户名</span>
        <span className="pw-entry-card__expanded-value">{entry.username || '(无)'}</span>
        <button
          className={`pw-entry-card__expanded-copy-btn${copyFeedback === 'username' ? ' pw-entry-card__expanded-copy-btn--done' : ''}`}
          onClick={() => handleCopy(entry.username, '用户名', 'username')}
          title="复制用户名"
        >
          {copyFeedback === 'username' ? <CheckOutlined /> : <CopyOutlined />}
        </button>
      </div>

      <div className="pw-entry-card__expanded-field">
        <span className="pw-entry-card__expanded-label">密码</span>
        <span className="pw-entry-card__expanded-value pw-entry-card__expanded-value--password">
          {visible ? entry.password : '••••••••'}
        </span>
        <span
          className="pw-entry-card__visibility-toggle"
          onClick={() => setVisible((prev) => !prev)}
          title={visible ? '隐藏密码' : '显示密码'}
        >
          {visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        </span>
        <button
          className={`pw-entry-card__expanded-copy-btn${copyFeedback === 'password' ? ' pw-entry-card__expanded-copy-btn--done' : ''}`}
          onClick={() => handleCopy(entry.password, '密码', 'password')}
          title="复制密码"
        >
          {copyFeedback === 'password' ? <CheckOutlined /> : <CopyOutlined />}
        </button>
      </div>

      <div className="pw-entry-card__expanded-actions">
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditing(true)}
        >
          编辑
        </Button>
        <Popconfirm
          title="确定要删除此条目吗？"
          onConfirm={() => onDelete(entry.id)}
          okText="删除"
          cancelText="取消"
          placement="left"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
}
