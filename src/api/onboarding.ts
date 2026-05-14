import type { CompanyBilling } from '../types/settings';
import { adaptCompanyBillingResponse, type CompanyBillingResponse } from './adapters/settings';
import http from './http';

export type OnboardingStatus = {
  linked: boolean;
  tenantId?: number;
  userId?: number;
  tenantName?: string;
  username?: string;
  billing?: CompanyBilling;
};

type OnboardingStatusResponse = {
  linked: boolean;
  tenantId?: number;
  userId?: number;
  tenantName?: string;
  username?: string;
  billing?: CompanyBillingResponse;
};

export type RegisterEnterprisePayload = {
  tenantName: string;
  adminUsername: string;
  adminDisplayName: string;
  adminEmail: string;
  adminPhone?: string;
  mode: 'EXISTING_CLERK' | 'CREATE_CLERK';
  clerkPassword?: string;
};

export const onboardingApi = {
  status: async () => {
    const { data } = await http.get<OnboardingStatusResponse>('/api/v1/auth/onboarding/status');
    return {
      linked: data.linked,
      tenantId: data.tenantId,
      userId: data.userId,
      tenantName: data.tenantName,
      username: data.username,
      billing: adaptCompanyBillingResponse(data.billing),
    } satisfies OnboardingStatus;
  },
  registerEnterprise: async (payload: RegisterEnterprisePayload) => {
    const endpoint =
      payload.mode === 'CREATE_CLERK'
        ? '/api/v1/auth/onboarding/register-enterprise-public'
        : '/api/v1/auth/onboarding/register-enterprise';
    const { data } = await http.post(endpoint, payload);
    return data;
  },
};
