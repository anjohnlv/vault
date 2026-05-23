/**
 * 通用按钮组件
 * 封装 antd Button，统一应用内按钮样式（variant: outline/primary）
 */
import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  htmlType?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  className?: string;
}

const sizeMap: Record<string, AntButtonProps['size']> = {
  sm: 'small',
  md: 'middle',
  lg: 'large',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  htmlType,
  children,
  ...props
}: ButtonProps) {
  const antdProps: AntButtonProps = {
    size: sizeMap[size],
    loading,
    htmlType,
  };

  if (variant === 'danger') {
    antdProps.danger = true;
  } else if (variant !== 'outline') {
    antdProps.type = 'primary';
  }

  return (
    <AntButton {...antdProps} {...props}>
      {children}
    </AntButton>
  );
}
