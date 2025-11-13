import axios from 'axios';
import { message } from 'antd';
import { tenantStore } from '../stores/tenant';

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
      const backendMessage = error?.response?.data?.message;
      const errMsg = backendMessage || error.message || '请求失败，请稍后再试';
      console.error('API Error:', error.response.status, errMsg); // Log status code
      message.error(errMsg);
    }
    return Promise.reject(error);
  },
);

export default http;
