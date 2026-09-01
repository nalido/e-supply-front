import http from './http'
import type { RequestConfigWithDataflow } from './http'
import { requireNumericTenantId, toBackendPage } from './request-context'
import type { PodAsset, PodDesignDraft, PodDesignListParams, PodDesignPage, PodDesignStyle, PodPrintArea, PodProductTemplate, PodProductTemplateDraft, PodTemplateImageRole, PodTemplateSupplierSkuDraft } from '../types/pod-design'

const basePath = '/api/v1/pod/design-styles'

const tenantParams = () => ({ tenantId: requireNumericTenantId() })

const approvalRequestConfig = (): RequestConfigWithDataflow => ({
  params: tenantParams(),
  suppressGlobalError: true,
})

export const podDesignApi = {
  async list(params: PodDesignListParams): Promise<PodDesignPage> {
    const response = await http.get<PodDesignPage>(basePath, {
      params: {
        ...tenantParams(),
        keyword: params.keyword || undefined,
        status: params.status,
        page: toBackendPage(params.page),
        size: params.size,
      },
      skipPageNormalization: true,
    })
    return response.data
  },

  async get(id: number): Promise<PodDesignStyle> {
    const response = await http.get<PodDesignStyle>(`${basePath}/${id}`, { params: tenantParams() })
    return response.data
  },

  async create(payload: PodDesignDraft): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(basePath, payload, { params: tenantParams() })
    return response.data
  },

  async update(id: number, payload: PodDesignDraft): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(`${basePath}/${id}/update`, payload, { params: tenantParams() })
    return response.data
  },

  async upload(id: number, assetType: 'BASE_IMAGE' | 'SOURCE_IMAGE', file: File, printId?: string): Promise<PodAsset> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await http.post<PodAsset>(`${basePath}/${id}/assets/upload`, formData, {
      params: { ...tenantParams(), assetType, printId },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    })
    return response.data
  },

  async generateAiMockups(id: number): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(`${basePath}/${id}/ai-render`, undefined, {
      params: tenantParams(),
      timeout: 60_000,
    })
    return response.data
  },

  async retryAiMockup(id: number, templateImageId: number): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(`${basePath}/${id}/ai-render/${templateImageId}/retry`, undefined, {
      params: tenantParams(),
      timeout: 60_000,
    })
    return response.data
  },

  async confirmMockups(id: number, mainAssetId: number): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(`${basePath}/${id}/mockups/confirm`, { mainAssetId }, { params: tenantParams() })
    return response.data
  },

  async submitReview(id: number): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(`${basePath}/${id}/review/submit`, undefined, { params: tenantParams() })
    return response.data
  },

  async approve(id: number): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(`${basePath}/${id}/review/approve`, undefined, approvalRequestConfig())
    return response.data
  },

  async reject(id: number, reason: string): Promise<PodDesignStyle> {
    const response = await http.post<PodDesignStyle>(`${basePath}/${id}/review/reject`, { reason }, approvalRequestConfig())
    return response.data
  },

  async exportPrintArtwork(id: number): Promise<{ blob: Blob; fileName: string }> {
    const config: RequestConfigWithDataflow = {
      params: tenantParams(),
      responseType: 'blob',
      timeout: 120_000,
      suppressGlobalError: true,
    }
    const response = await http.get(`${basePath}/${id}/print-artwork/export`, config)
    const disposition = String(response.headers['content-disposition'] || '')
    const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
    const fileName = utf8Name ? decodeURIComponent(utf8Name) : plainName || `pod-print-${id}.zip`
    return { blob: response.data as Blob, fileName }
  },
}

export default podDesignApi

const templatePath = '/api/v1/pod/product-templates'

export const podProductTemplateApi = {
  async renderCapability(): Promise<{ available: boolean; provider: string; model: string }> {
    const response = await http.get<{ available: boolean; provider: string; model: string }>(`${templatePath}/render-capability`, { params: tenantParams() })
    return response.data
  },
  async list(): Promise<PodProductTemplate[]> {
    const response = await http.get<PodProductTemplate[]>(templatePath, { params: tenantParams() })
    return response.data
  },
  async get(id: number): Promise<PodProductTemplate> {
    const response = await http.get<PodProductTemplate>(`${templatePath}/${id}`, { params: tenantParams() })
    return response.data
  },
  async create(payload: PodProductTemplateDraft): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(templatePath, payload, { params: tenantParams() })
    return response.data
  },
  async update(id: number, payload: PodProductTemplateDraft): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(`${templatePath}/${id}/update`, payload, { params: tenantParams() })
    return response.data
  },
  async save(id: number, template: PodProductTemplateDraft, printAreas: Array<{ imageId: number; area: PodPrintArea }>, workflowConfig?: string): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(`${templatePath}/${id}/save`, { template, printAreas, workflowConfig }, { params: tenantParams() })
    return response.data
  },
  async uploadImage(id: number, role: PodTemplateImageRole, name: string, file: File): Promise<PodProductTemplate> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await http.post<PodProductTemplate>(`${templatePath}/${id}/images/upload`, formData, {
      params: { ...tenantParams(), imageRole: role, imageName: name },
      headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000,
    })
    return response.data
  },
  async updatePrintArea(templateId: number, imageId: number, area: PodPrintArea): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(`${templatePath}/${templateId}/images/${imageId}/print-area/update`, area, { params: tenantParams() })
    return response.data
  },
  async deleteImage(templateId: number, imageId: number): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(`${templatePath}/${templateId}/images/${imageId}/delete`, undefined, { params: tenantParams() })
    return response.data
  },
  async updateStatus(id: number, status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(`${templatePath}/${id}/status/update`, undefined, { params: { ...tenantParams(), status } })
    return response.data
  },
  async createSupplierSku(id: number, payload: PodTemplateSupplierSkuDraft): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(`${templatePath}/${id}/supplier-skus`, payload, { params: tenantParams() })
    return response.data
  },
  async deleteSupplierSku(id: number, mappingId: number): Promise<PodProductTemplate> {
    const response = await http.post<PodProductTemplate>(`${templatePath}/${id}/supplier-skus/${mappingId}/delete`, undefined, { params: tenantParams() })
    return response.data
  },
}
