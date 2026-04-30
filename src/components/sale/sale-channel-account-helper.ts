import { getSaleSellerTypeLabel, type SaleChannelAccount } from '../../types/sale';

export const getCompactSaleSellerTypeLabel = (sellerType?: string | null) => {
  if (sellerType === 'FULLY_MANAGED') {
    return '全托';
  }
  if (sellerType === 'SEMI_MANAGED') {
    return '半托';
  }
  return getSaleSellerTypeLabel(sellerType);
};

export const getSaleChannelAccountDisplayName = (account?: SaleChannelAccount | null) =>
  account?.accountName || account?.shopName || account?.shopId || account?.id || '--';
