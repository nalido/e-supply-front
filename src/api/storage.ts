import http from './http';
import { requireNumericTenantId } from './request-context';

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

export const storageApi = {
  upload: async (file: File, options?: UploadOptions): Promise<FileUploadResult> => {
    const tenantId = requireNumericTenantId();
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
