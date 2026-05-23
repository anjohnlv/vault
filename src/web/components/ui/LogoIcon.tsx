/**
 * 通用 Logo 图标组件
 * 保险箱样式图标，支持自定义尺寸
 */
interface LogoIconProps {
  size?: number;
}

export function LogoIcon({ size = 24 }: LogoIconProps) {
  const accent = 'var(--color-accent, #58a6ff)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="28" stroke={accent} strokeWidth="1" opacity="0.2" />
      <circle cx="32" cy="32" r="20" stroke={accent} strokeWidth="1.5" opacity="0.5" />
      <path d="M18 24C26 24 32 44 32 44C32 44 38 24 46 24" stroke={accent} strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
      <path d="M16 20C26 20 32 44 32 44C32 44 38 20 48 20" stroke={accent} strokeWidth="2.3" strokeLinecap="round" opacity="0.55" />
      <path d="M14 16C27 16 32 44 32 44C32 44 37 16 50 16" stroke={accent} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
