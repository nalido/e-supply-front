import type { GlobalErrorPayload } from '../components/common/global-error-bus';

type ErrorRule = {
  matcher: (message?: string, status?: number) => boolean;
  build: (message?: string) => GlobalErrorPayload;
};

const normalize = (message?: string) => message?.trim().toLowerCase() ?? '';

const looksReadableBusinessMessage = (message?: string): boolean => {
  const text = message?.trim();
  if (!text) {
    return false;
  }
  if (text.length > 120) {
    return false;
  }
  const normalized = text.toLowerCase();
  const technicalMarkers = [
    'exception',
    'error:',
    'stack trace',
    'traceback',
    'sqlstate',
    'jdbc',
    'java.',
    'org.springframework',
    'com.mysql',
    'axioserror',
    'network error',
    'request failed with status code',
    '<html',
    'doctype html',
  ];
  return !technicalMarkers.some((marker) => normalized.includes(marker));
};

const resolveSafeMessage = (message?: string): string | null => {
  const normalized = normalize(message);
  if (!normalized) {
    return null;
  }
  if (normalized.includes('quantity must be greater than zero')) {
    return '请为至少一个颜色/尺码组合设置大于 0 的数量后再提交。';
  }
  if (normalized.includes('style number already exists') || normalized.includes('styleno already exists')) {
    return '款号已存在，请更换后重试';
  }
  if (normalized.includes('warehouse name already exists')) {
    return '仓库名称已存在，请更换后重试';
  }
  if (normalized.includes('partner name already exists')) {
    return '往来单位名称已存在，请更换后重试';
  }
  if (normalized.includes('ticketno already exists')) {
    return '单号已存在，请更换后重试';
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
  if (normalized.includes('库存不足，无法领料') || normalized.includes('库存不足,无法领料')) {
    return '库存不足，无法领料。请先补充库存或调整本次实际用量后再试。';
  }
  if (normalized.includes('超收必须填写原因编码、原因说明和备注')) {
    return '超计划收料时必须填写超收原因、原因说明和业务备注。';
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
    matcher: (message) => {
      const normalized = normalize(message);
      return normalized.includes('库存不足，无法领料') || normalized.includes('库存不足,无法领料');
    },
    build: (message) => ({
      title: '库存不足，无法完成本次领料',
      description: resolveSafeMessage(message) || '请先补充库存或调整本次实际用量后再试。',
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
    matcher: (_, status) => status === 409,
    build: (message) => ({
      title: '数据冲突',
      description: resolveSafeMessage(message) || '数据已存在或状态冲突，请调整后重试。',
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
  const safeMessage = resolveSafeMessage(message);
  if (safeMessage) {
    const matchedRule = rules.find((rule) => rule.matcher(message, status));
    if (matchedRule) {
      return matchedRule.build(message);
    }
  }

  if (looksReadableBusinessMessage(message)) {
    return {
      title: '操作失败',
      description: message?.trim(),
    };
  }

  const matchedRule = rules.find((rule) => rule.matcher(message, status));
  if (matchedRule) {
    return matchedRule.build(message);
  }

  return {
    title: '操作失败',
    description: '请求失败，请稍后再试。',
  };
};
