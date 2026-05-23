/**
 * 通用模态框组件
 * 封装 antd Modal，统一应用内弹窗样式（含 width/onClose/children）
 */
import { Modal as AntModal } from 'antd';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthMap: Record<string, number> = {
  sm: 400,
  md: 520,
  lg: 740,
};

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'md',
}: ModalProps) {
  return (
    <AntModal
      open={open}
      onCancel={onClose}
      title={title}
      width={widthMap[width]}
      footer={null}
      destroyOnHidden
      centered
    >
      {children}
    </AntModal>
  );
}
