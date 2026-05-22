/**
 * 通用输入框组件
 * 封装 antd Input，统一应用内输入框样式（含 label/error 支持）
 */
import { Input as AntInput } from 'antd';
import { forwardRef } from 'react';

interface InputProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  suffix?: React.ReactNode;
  addonAfter?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type, suffix, addonAfter, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {label && (
          <label
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary, #8b949e)',
            }}
          >
            {label}
          </label>
        )}
        {type === 'password' && !suffix ? (
          <AntInput.Password
            ref={ref as any}
            status={error ? 'error' : undefined}
            {...(props as any)}
          />
        ) : (
          <AntInput
            ref={ref}
            type={type}
            status={error ? 'error' : undefined}
            suffix={suffix}
            addonAfter={addonAfter}
            {...(props as any)}
          />
        )}
        {error && (
          <span style={{ fontSize: 12, color: '#f85149' }}>{error}</span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
