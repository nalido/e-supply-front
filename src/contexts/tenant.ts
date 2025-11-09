import { createContext, useContext } from 'react';
import type { CompanyOverview } from '../types/settings';

export type TenantContextValue = {
  tenantId: string;
  overview: CompanyOverview;
  refresh: () => Promise<void>;
};

export const TenantContext = createContext<TenantContextValue | null>(null);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};
