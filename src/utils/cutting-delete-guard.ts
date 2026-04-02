export const getCuttingDeleteBlockedTooltip = (reason?: string) => {
  const normalized = reason?.trim();
  if (!normalized) {
    return '当前记录暂不能删除';
  }
  if (normalized.includes('车缝已领取')) {
    return '已被车缝领取，不能删除';
  }
  if (normalized.includes('开裁占位')) {
    return '开裁记录不能删除';
  }
  if (normalized.includes('自动补齐')) {
    return '系统补齐记录不能删除';
  }
  return '当前记录暂不能删除';
};
