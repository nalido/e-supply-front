import type { GlobalErrorPayload } from '../components/common/global-error-bus';

type ErrorRule = {
  matcher: (message?: string, status?: number) => boolean;
  build: (message?: string) => GlobalErrorPayload;
};

const normalize = (message?: string) => message?.trim().toLowerCase() ?? '';

const rules: ErrorRule[] = [
  {
    matcher: (message) => normalize(message).includes('quantity must be greater than zero'),
    build: () => ({
      title: '请填写有效的数量',
      description: '请为至少一个颜色/尺码组合设置大于 0 的数量后再提交。',
    }),
  },
  {
    matcher: (_, status) => status === 400,
    build: (message) => ({
      title: '提交的数据有误',
      description: message || '请检查填写内容后重试。',
    }),
  },
  {
    matcher: (_, status) => status === 500,
    build: () => ({
      title: '系统繁忙，请稍后再试',
      description: '服务器暂时不可用，请稍后重试或联系管理员。',
    }),
  },
];

export const buildFriendlyError = (message?: string, status?: number): GlobalErrorPayload => {
  const matchedRule = rules.find((rule) => rule.matcher(message, status));
  if (matchedRule) {
    return matchedRule.build(message);
  }
  return {
    title: '操作失败',
    description: message || '请求失败，请稍后再试。',
  };
};
