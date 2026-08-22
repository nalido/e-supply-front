import http from './http'
import { tenantStore } from '../stores/tenant'
import type {
  StyleGovernanceBatch,
  ChannelStyleProfile,
  StyleGovernanceDraftPayload,
  StyleGovernanceExecutionResult,
  StyleGovernanceItemDetail,
  StyleGovernancePage,
  StyleGovernancePreview,
  StyleGovernanceStatus,
  StyleGovernanceSummary,
} from '../types/style-compatibility'

const basePath = '/api/v1/sale/style-compatibility'

const tenantId = () => {
  const value = tenantStore.getTenantId()
  if (!value) throw new Error('当前企业信息不可用，请刷新后重试。')
  return value
}

export const styleCompatibilityApi = {
  async getStyleProfiles(styleId: string | number): Promise<ChannelStyleProfile[]> {
    const response = await http.get<ChannelStyleProfile[]>(`${basePath}/styles/${styleId}/profiles`, { params: { tenantId: tenantId() } })
    return response.data
  },

  async getLatestBatch(): Promise<StyleGovernanceBatch | null> {
    const response = await http.get<StyleGovernanceBatch | null>(`${basePath}/batches/latest`, { params: { tenantId: tenantId() } })
    return response.data
  },

  async createBatch(payload: { channelAccountIds: number[]; scope: 'UNRESOLVED' | 'ALL' }): Promise<StyleGovernanceBatch> {
    const response = await http.post<StyleGovernanceBatch>(`${basePath}/batches`, payload, { params: { tenantId: tenantId() } })
    return response.data
  },

  async getBatch(batchId: string): Promise<StyleGovernanceBatch> {
    const response = await http.get<StyleGovernanceBatch>(`${basePath}/batches/${batchId}`, { params: { tenantId: tenantId() } })
    return response.data
  },

  async getSummary(batchId: string): Promise<StyleGovernanceSummary> {
    const response = await http.get<StyleGovernanceSummary>(`${basePath}/batches/${batchId}/summary`, { params: { tenantId: tenantId() } })
    return response.data
  },

  async listItems(batchId: string, params: {
    page: number
    pageSize: number
    status?: StyleGovernanceStatus
    channelAccountIds?: string[]
    riskLevel?: string
    keyword?: string
  }): Promise<StyleGovernancePage> {
    const response = await http.get<StyleGovernancePage>(`${basePath}/batches/${batchId}/items`, {
      params: { tenantId: tenantId(), ...params },
      skipPageNormalization: true,
    })
    return response.data
  },

  async getItem(batchId: string, itemId: string): Promise<StyleGovernanceItemDetail> {
    const response = await http.get<StyleGovernanceItemDetail>(`${basePath}/batches/${batchId}/items/${itemId}`, { params: { tenantId: tenantId() } })
    return response.data
  },

  async saveDecision(batchId: string, itemId: string, payload: StyleGovernanceDraftPayload): Promise<StyleGovernanceItemDetail> {
    const response = await http.post<StyleGovernanceItemDetail>(`${basePath}/batches/${batchId}/items/${itemId}/decision/update`, payload, { params: { tenantId: tenantId() } })
    return response.data
  },

  async bulkConfirm(batchId: string, itemIds: string[]): Promise<{ successCount: number; skippedCount: number; reasons?: string[] }> {
    const response = await http.post<{ successCount: number; skippedCount: number; reasons?: string[] }>(`${basePath}/batches/${batchId}/items/bulk-confirm`, { itemIds }, { params: { tenantId: tenantId() } })
    return response.data
  },

  async createPreview(batchId: string, itemIds?: string[]): Promise<StyleGovernancePreview> {
    const response = await http.post<StyleGovernancePreview>(`${basePath}/batches/${batchId}/preview`, { itemIds }, { params: { tenantId: tenantId() } })
    return response.data
  },

  async execute(batchId: string, previewId: string): Promise<StyleGovernanceExecutionResult> {
    const response = await http.post<StyleGovernanceExecutionResult>(`${basePath}/batches/${batchId}/execute`, { previewId }, { params: { tenantId: tenantId() } })
    return response.data
  },
}

export default styleCompatibilityApi
