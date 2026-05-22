/**
 * 通用提示 Hook
 * 封装 antd message，提供 useToast() 快速调用 info/success/warning/error
 */
import { message } from 'antd';
import type { NoticeType } from 'antd/es/message/interface';

export function useToast() {
  const toast = (text: string, type: NoticeType = 'info') => {
    message.open({ content: text, type });
  };
  return { toast };
}
