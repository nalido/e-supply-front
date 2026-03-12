import axios from 'axios';
import { tenantStore } from '../stores/tenant';
import { emitGlobalError } from '../components/common/global-error-bus';
import { buildFriendlyError } from '../utils/friendly-error';

const traceHeaderKeys = ['traceid', 'trace-id', 'x-trace-id', 'x-request-id'];

const findTraceIdFromBody = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  const directKeys = ['traceId', 'traceID', 'requestId', 'requestID'];
  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  const nestedKeys = ['data', 'error', 'meta'];
  for (const key of nestedKeys) {
    const nestedValue = record[key];
    const nestedTraceId = findTraceIdFromBody(nestedValue);
    if (nestedTraceId) {
      return nestedTraceId;
    }
  }
  return undefined;
};

const findTraceId = (error: unknown): string | undefined => {
  const response = (error as { response?: { headers?: Record<string, string>; data?: unknown } })?.response;
  if (!response) {
    return undefined;
  }

  const headers = response.headers ?? {};
  for (const key of traceHeaderKeys) {
    const value = headers[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return findTraceIdFromBody(response.data);
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore and fallback
  }

  try {
    if (typeof document === 'undefined') {
      return false;
    }
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);
    return copied;
  } catch {
    return false;
  }
};

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
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as (typeof error.config & { __authRetried?: boolean }) | undefined;

    // Clerk token切换期间可能出现瞬时403，这里做一次静默重试避免打断页面加载。
    if (status === 403 && tokenResolver && originalRequest && !originalRequest.__authRetried) {
      originalRequest.__authRetried = true;
      try {
        const token = await tokenResolver();
        if (token) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return http.request(originalRequest);
      } catch (retryError) {
        console.warn('Retry request after 403 failed', retryError);
      }
    }

    if (status !== 401) {
      const backendMessage = error?.response?.data?.message ?? error.message;
      const traceId = findTraceId(error);
      console.error('API Error:', status, backendMessage, traceId ? `traceId=${traceId}` : '');

      const payload = buildFriendlyError(backendMessage, status);
      if (traceId) {
        const copied = await copyToClipboard(traceId);
        const traceTip = copied
          ? `traceId：${traceId}（已自动复制）`
          : `traceId：${traceId}（自动复制失败，请手动复制）`;
        payload.description = `${payload.description ?? ''}${payload.description ? '\n' : ''}${traceTip}\n请将该 traceId 提供给开发人员排查。`;
      }
      emitGlobalError(payload);
    }
    return Promise.reject(error);
  },
);

export default http;
