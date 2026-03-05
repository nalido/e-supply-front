import type { GlobalErrorPayload } from '../components/common/global-error-bus';

type ErrorRule = {
  matcher: (message?: string, status?: number) => boolean;
  build: (message?: string) => GlobalErrorPayload;
};

const normalize = (message?: string) => message?.trim().toLowerCase() ?? '';

const resolveSafeMessage = (message?: string): string | null => {
  const normalized = normalize(message);
  if (!normalized) {
    return null;
  }
  if (normalized.includes('quantity must be greater than zero')) {
    return '请为至少一个颜色/尺码组合设置大于 0 的数量后再提交。';
  }
  if (normalized.includes('用户名已存在') || (normalized.includes('form_identifier_exists') && normalized.includes('username'))) {
    return '用户名已存在，请更换后重试';
  }
  if (
    normalized.includes('邮箱已被占用') ||
    normalized.includes('email address is taken') ||
    (normalized.includes('form_identifier_exists') && normalized.includes('email'))
  ) {
    return '邮箱已被占用，请更换后重试';
  }
  if (normalized.includes('user not authenticated')) {
    return '登录状态已失效，请重新登录后重试。';
  }
  return null;
};

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
      description: resolveSafeMessage(message) || '请检查填写内容后重试。',
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
  const safeMessage = resolveSafeMessage(message);
  return {
    title: '操作失败',
    description: safeMessage || '请求失败，请稍后再试。',
  };
};
