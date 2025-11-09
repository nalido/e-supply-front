import axios from 'axios';
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

  return nextConfig;
});

export default http;
