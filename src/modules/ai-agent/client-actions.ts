import type { NavigateFunction } from 'react-router-dom';

export type AiClientAction =
  | {
      type: 'navigate';
      path: string;
      reason?: string;
    }
  | {
      type: 'ui-op';
      operation: string;
      selector?: string;
      payload?: Record<string, unknown>;
    };

export const executeAiClientAction = (action: AiClientAction, navigate: NavigateFunction): string => {
  if (action.type === 'navigate') {
    navigate(action.path);
    return `已为你跳转到：\`${action.path}\`${action.reason ? `\n\n说明：${action.reason}` : ''}`;
  }
  return `已收到页面操作请求：\`${action.operation}\`。\n\n当前版本仅启用页面跳转，页面控件自动操作将在下一阶段接入。`;
};

