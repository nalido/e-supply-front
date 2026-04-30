export const formatSaleDateTime = (value?: string | null) => {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
};

export const formatSaleMoney = (value?: string | null, currency = '¥') => {
  if (!value) {
    return '--';
  }
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return value;
  }
  return `${currency}${amount.toFixed(2)}`;
};

export const toDisplayText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return String(value);
};
