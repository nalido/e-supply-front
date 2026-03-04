import http from './http';

export type OnboardingStatus = {
  linked: boolean;
  tenantId?: number;
  userId?: number;
  tenantName?: string;
  username?: string;
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
    const { data } = await http.get<OnboardingStatus>('/api/v1/auth/onboarding/status');
    return data;
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
