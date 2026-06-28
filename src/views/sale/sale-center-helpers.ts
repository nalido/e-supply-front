import type { SaleChannelAccount, SaleInventoryItem, SaleOrderItem, SaleSyncLogItem } from '../../types/sale';

const looksLikeMojibake = (value?: string | null) => {
  if (!value) {
    return false;
  }
  return /[ÃÂÅÆÇÐÑØÙÝÞßåæçðñø]/.test(value) || value.includes('�');
};

const cleanDisplayText = (value?: string | null) => {
  if (!value || looksLikeMojibake(value)) {
    return '';
  }
  return value.trim();
};

export const isMappedStatus = (value?: string | null) => {
  const normalized = (value || '').toUpperCase();
  return normalized === 'ACTIVE' || normalized === 'MAPPED';
};

export const deriveOrderIssue = (order: SaleOrderItem) => {
  const hasUnmappedLine = (order.linePreview || []).some((line) => !isMappedStatus(line.mappingStatus));
  const hasMissingReceiver = !order.receiverName;
  const normalizedStatus = (order.normalizedStatus || order.platformOrderStatus || '').toUpperCase();
  if (hasUnmappedLine) {
    return {
      code: 'PENDING_BINDING',
      label: '待补绑定',
      tone: 'warning' as const,
      reason: '订单中存在未绑定或绑定失效的商品行',
      recommendedAction: '去商品绑定补齐映射关系',
    };
  }
  if (hasMissingReceiver) {
    return {
      code: 'PENDING_DATA_FIX',
      label: '缺少收件信息',
      tone: 'danger' as const,
      reason: '订单没有收件人信息，发货前无法完成收件资料核对',
      recommendedAction: '核对平台订单收件信息，重新同步订单后再进入发货准备',
    };
  }
  if (normalizedStatus.includes('CANCEL') || normalizedStatus.includes('CLOSED') || normalizedStatus.includes('EXCEPTION')) {
    return {
      code: 'PENDING_CONFIRM',
      label: '待人工确认',
      tone: 'warning' as const,
      reason: '平台状态存在异常或已关闭，需要人工确认是否忽略',
      recommendedAction: '进入处理台确认订单状态',
    };
  }
  if (order.processingStatus) {
    return {
      code: order.processingStatus,
      label: order.processingStatus,
      tone: 'success' as const,
      reason: '该订单已有本地处理状态',
      recommendedAction: '查看当前处理记录',
    };
  }
  return null;
};

export const getShopLabel = (account?: SaleChannelAccount) =>
  cleanDisplayText(account?.shopName) ||
  cleanDisplayText(account?.accountName) ||
  `${account?.platformCode === 'TEMU' ? 'Temu 店铺' : '店铺'} #${account?.id || '--'}`;

export const getInventoryRiskLevel = (item: SaleInventoryItem) => {
  if ((item.lackQuantity || 0) > 0) {
    return 'danger' as const;
  }
  if ((item.availableSaleDays ?? 999) <= 5) {
    return 'warning' as const;
  }
  return 'default' as const;
};

const getInventoryLogTimestamp = (log: SaleSyncLogItem) => log.occurredAt || log.createdAt || '';

const isInventoryTokenFailure = (log?: SaleSyncLogItem) => {
  if (!log || log.success) {
    return false;
  }
  const errorCode = (log.errorCode || '').toUpperCase();
  const errorMessage = (log.errorMessage || '').toLowerCase();
  return errorCode === '7000020' || errorMessage.includes('access_token invalid');
};

export const getInventoryReadableAccountIds = (accounts: SaleChannelAccount[], syncLogs: SaleSyncLogItem[]) => {
  const latestInventoryLogByAccount = new Map<string, SaleSyncLogItem>();

  syncLogs
    .filter((log) => log.channelAccountId && (log.bizType || '').toUpperCase() === 'INVENTORY_READ')
    .sort((left, right) => getInventoryLogTimestamp(right).localeCompare(getInventoryLogTimestamp(left)))
    .forEach((log) => {
      const accountId = log.channelAccountId;
      if (accountId && !latestInventoryLogByAccount.has(accountId)) {
        latestInventoryLogByAccount.set(accountId, log);
      }
    });

  return accounts
    .filter((account) => !isInventoryTokenFailure(latestInventoryLogByAccount.get(account.id)))
    .map((account) => account.id);
};

export const pickPreferredInventoryAccountId = (accounts: SaleChannelAccount[], syncLogs: SaleSyncLogItem[]) => {
  const readableAccountIds = new Set(getInventoryReadableAccountIds(accounts, syncLogs));
  return accounts.find((account) => readableAccountIds.has(account.id))?.id || accounts[0]?.id || '';
};
