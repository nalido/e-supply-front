import type { SaleChannelAccount } from '../types/sale'

export const SALE_ACTIVE_ACCOUNT_ID_KEY = 'sale.active-account-id'
export const SALE_CONTEXT_CHANGED_EVENT = 'sale-context-changed'

export type SaleContextChangedDetail = {
  accountId?: string
  sellerType?: string | null
}

export const resolveSaleOrderMenuLabel = (sellerType?: string | null): string =>
  sellerType === 'FULLY_MANAGED' ? '备货单管理' : '订单管理'

export const pickPreferredSaleAccount = (
  accounts: SaleChannelAccount[],
  preferredAccountId?: string | null,
): SaleChannelAccount | undefined => {
  if (!accounts.length) {
    return undefined
  }
  if (preferredAccountId) {
    const preferred = accounts.find((item) => item.id === preferredAccountId)
    if (preferred) {
      return preferred
    }
  }
  return accounts[0]
}

export const resolveSaleAccountSelection = (
  accounts: SaleChannelAccount[],
  currentAccountId?: string | null,
): SaleChannelAccount | undefined => {
  if (currentAccountId) {
    const current = accounts.find((item) => item.id === currentAccountId)
    if (current) {
      return current
    }
  }
  return pickPreferredSaleAccount(accounts, window.localStorage.getItem(SALE_ACTIVE_ACCOUNT_ID_KEY))
}

export const publishSaleContextChanged = (detail: SaleContextChangedDetail) => {
  if (detail.accountId) {
    window.localStorage.setItem(SALE_ACTIVE_ACCOUNT_ID_KEY, detail.accountId)
  } else {
    window.localStorage.removeItem(SALE_ACTIVE_ACCOUNT_ID_KEY)
  }
  window.dispatchEvent(new CustomEvent<SaleContextChangedDetail>(SALE_CONTEXT_CHANGED_EVENT, { detail }))
}
