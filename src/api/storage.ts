import http from './http';
import { tenantStore } from '../stores/tenant';

export type FileUploadResult = {
  objectKey: string;
  fileName: string;
  size: number;
  contentType: string;
  url: string;
};

type UploadOptions = {
  module?: string;
};

const ensureTenantId = (): number => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到租户信息，请重新选择企业');
  }
  const parsed = Number(tenantId);
  if (!Number.isFinite(parsed)) {
    throw new Error('租户信息无效，请刷新后重试');
  }
  return parsed;
};

export const storageApi = {
  upload: async (file: File, options?: UploadOptions): Promise<FileUploadResult> => {
    const tenantId = ensureTenantId();
    const formData = new FormData();
    formData.append('tenantId', String(tenantId));
    if (options?.module) {
      formData.append('module', options.module);
    }
    formData.append('file', file);

    const response = await http.post<FileUploadResult>('/api/v1/storage/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default storageApi;
