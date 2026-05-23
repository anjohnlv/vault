import type { ReactNode } from 'react';
import { LogoIcon } from '../ui/LogoIcon';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, onBack, children }: AuthCardProps) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__glow" />
        <div className="auth-card__bg-letter">V</div>

        <div className="auth-card__body">
          <div className="auth-card__accent" />

          <div className="auth-card__header">
            <LogoIcon size={40} />
            <div className="auth-card__titles">
              <h1 className="auth-card__title">{title}</h1>
              {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="auth-card__divider" />

          <div className="auth-card__content">
            {children}
          </div>

          {onBack && (
            <div className="auth-card__footer">
              <button className="auth-card__back" onClick={onBack}>
                ← 返回
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
