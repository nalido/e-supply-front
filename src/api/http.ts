import axios from 'axios';
import { tenantStore } from '../stores/tenant';
import { emitGlobalError } from '../components/common/global-error-bus';
import { buildFriendlyError } from '../utils/friendly-error';

type TokenResolver = () => Promise<string | null>;

let tokenResolver: TokenResolver | null = null;

export const setAuthTokenResolver = (resolver: TokenResolver) => {
  tokenResolver = resolver;
};

const baseURL = import.meta.env.VITE_API_BASE_URL || '/';

const http = axios.create({
  baseURL,
  timeout: 15000,
});

http.interceptors.request.use(async (config) => {
  const nextConfig = config;
  nextConfig.headers = nextConfig.headers ?? {};

  if (tokenResolver) {
    try {
      const token = await tokenResolver();
      if (token) {
        nextConfig.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to resolve auth token', error);
    }
  }

  const tenantId = tenantStore.getTenantId();
  if (tenantId) {
    nextConfig.headers['X-Tenant-Id'] = tenantId;
  }

  if (nextConfig.params && typeof nextConfig.params === 'object' && 'page' in nextConfig.params) {
    const pageValue = Number(nextConfig.params.page);
    if (!Number.isNaN(pageValue)) {
      nextConfig.params.page = Math.max(pageValue - 1, 0);
    }
  }

  return nextConfig;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status !== 401) {
      const backendMessage = error?.response?.data?.message ?? error.message;
      const status = error?.response?.status;
      console.error('API Error:', status, backendMessage);
      emitGlobalError(buildFriendlyError(backendMessage, status));
    }
    return Promise.reject(error);
  },
);

export default http;
