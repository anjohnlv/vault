/**
 * WebAuthn 生物认证提示组件
 * 用于 LockScreen，提示用户使用指纹/面容快速解锁
 */
import { SafetyOutlined } from '@ant-design/icons';
import { Button } from '../ui/Button';

interface WebAuthnPromptProps {
  onUseBiometric: () => void;
  onUsePassword: () => void;
  loading: boolean;
}

export function WebAuthnPrompt({
  onUseBiometric,
  onUsePassword,
  loading,
}: WebAuthnPromptProps) {
  return (
    <div className="webauthn-prompt">
      <div className="webauthn-prompt__icon"><SafetyOutlined /></div>
      <p className="webauthn-prompt__text">使用指纹或设备密码快速解锁</p>
      <Button
        variant="primary"
        size="lg"
        onClick={onUseBiometric}
        loading={loading}
      >
        指纹/面容解锁
      </Button>
      <button
        className="webauthn-prompt__fallback"
        onClick={onUsePassword}
        disabled={loading}
      >
        使用密码解锁
      </button>
    </div>
  );
}
