export type StyleGovernanceStatus =
  | 'AUTO_SUGGESTED'
  | 'READY'
  | 'REVIEW_REQUIRED'
  | 'CONFLICT'
  | 'NO_CANDIDATE'
  | 'COMPLETED'
  | 'FAILED'

export type StyleGovernanceDecisionMode = 'CONVERT_IN_PLACE' | 'MERGE_TO_EXISTING' | 'KEEP_SEPARATE'

/**
 * 渠道款式采用平台无关的公共身份，平台差异放在扩展数据中。
 * 一期仅接入 OZON，后续新增平台不需要改动工厂映射结构。
 */
export type ChannelPlatformCode = 'OZON' | 'TEMU' | string

export type StyleGovernanceBatch = {
  batchId: string
  status: 'PENDING' | 'RUNNING' | 'CANCELLED' | 'COMPLETED' | 'PARTIAL_FAILED' | string
  totalCount: number
  scannedCount: number
  progressPercent?: number
  createdAt?: string | null
  finishedAt?: string | null
}

export type StyleGovernanceSummary = {
  total: number
  ready: number
  reviewRequired: number
  conflict: number
  noCandidate: number
  completed: number
  lastScannedAt?: string | null
}

export type StyleGovernanceItemSummary = {
  itemId: string
  version?: number
  status: StyleGovernanceStatus
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | string
  channelAccountId: string
  shopName?: string | null
  platformCode?: ChannelPlatformCode | null
  channelStyleId?: string | null
  platformSpuId?: string | null
  platformStyleId?: string | null
  platformStyleNo?: string | null
  platformTitle?: string | null
  platformImageUrl?: string | null
  candidateStyleId?: string | null
  candidateStyleNo?: string | null
  candidateStyleName?: string | null
  colorMappedCount?: number
  colorTotalCount?: number
  skuMappedCount?: number
  skuTotalCount?: number
  conflictCount?: number
  conflictSummary?: string | null
  confidence?: number | null
  updatedAt?: string | null
}

export type StyleGovernanceCandidate = {
  styleId: string
  styleNo: string
  styleName: string
  imageUrl?: string | null
  confidence?: number | null
  matchReason?: string | null
}

export type ChannelStyleProfile = {
  profileId: string
  channelAccountId: string
  localStyleId: string
  platformCode?: ChannelPlatformCode | null
  channelStyleId?: string | null
  channelProductId?: string | null
  platformSpuId?: string | null
  platformProductId?: string | null
  platformProductCode?: string | null
  platformStyleNo?: string | null
  sellerStyleCode?: string | null
  shopName?: string | null
  locale: string
  platformTitle?: string | null
  platformDescription?: string | null
  platformCategoryId?: string | null
  platformCategoryPath?: string | null
  platformImageUrl?: string | null
  platformStatus?: string | null
  skuCount?: number
  mappedSkuCount?: number
  skcs?: ChannelStyleSkc[]
  platformExtension?: Record<string, unknown> | null
  updatedAt?: string | null
}

export type ChannelStyleSku = {
  channelSkuId?: string | null
  platformSkuId?: string | null
  sellerSkuCode?: string | null
  color?: string | null
  size?: string | null
  sizeSystem?: string | null
  imageUrl?: string | null
  factoryVariantId?: string | null
  factorySkuNo?: string | null
  factoryColor?: string | null
  factorySize?: string | null
  mappingStatus?: string | null
  matchSource?: string | null
  confidence?: number | null
  platformExtension?: Record<string, unknown> | null
}

export type ChannelStyleSkc = {
  channelSkcId?: string | null
  platformSkcId?: string | null
  sellerSkcCode?: string | null
  color?: string | null
  imageUrl?: string | null
  factorySkcId?: string | null
  factorySkcNo?: string | null
  factoryColor?: string | null
  mappingStatus?: string | null
  skus: ChannelStyleSku[]
  platformExtension?: Record<string, unknown> | null
}

export type StyleGovernanceSkuMapping = {
  mappingId: string
  channelSkuId?: string | null
  platformSkuId?: string | null
  platformSkuCode?: string | null
  sellerSkuCode?: string | null
  platformColor?: string | null
  platformSize?: string | null
  platformSizeSystem?: 'RU' | 'EU' | 'MANUFACTURER' | 'OZON' | string | null
  platformImageUrl?: string | null
  factoryVariantId?: string | null
  factoryColor?: string | null
  factorySize?: string | null
  systemSkuNo?: string | null
  factorySkuNo?: string | null
  matchSource?: 'SELLER_SKU_EXACT' | 'COLOR_SIZE_EXACT' | 'MANUAL' | string | null
  confidence?: number | null
  status?: 'MATCHED' | 'UNMATCHED' | 'CONFLICT' | string
  errorMessage?: string | null
}

export type StyleGovernanceColorGroup = {
  groupId: string
  channelSkcId?: string | null
  platformSkcId?: string | null
  sellerSkcCode?: string | null
  platformColor?: string | null
  factorySkcId?: string | null
  factoryColor?: string | null
  factorySkcNo?: string | null
  status?: string | null
  skuMappings: StyleGovernanceSkuMapping[]
}

export type StyleGovernanceConflict = {
  conflictId: string
  type: string
  title: string
  description?: string | null
  blocking: boolean
}

export type StyleGovernanceItemDetail = StyleGovernanceItemSummary & {
  decisionMode?: StyleGovernanceDecisionMode | null
  originalStyleId?: string | null
  originalStyleNo?: string | null
  originalStyleName?: string | null
  factoryStyleName?: string | null
  factoryStyleNo?: string | null
  candidates: StyleGovernanceCandidate[]
  colorGroups: StyleGovernanceColorGroup[]
  conflicts: StyleGovernanceConflict[]
  referenceCount?: number
  reviewNote?: string | null
}

export type StyleGovernanceDraftPayload = {
  version?: number
  decisionMode: StyleGovernanceDecisionMode
  targetStyleId?: number
  factoryStyleName?: string
  factoryStyleNo?: string
  reviewNote?: string
  skuMappings: Array<{
    mappingId: string
    factoryVariantId?: number
    factoryColor?: string
    factorySize?: string
    factorySkuNo?: string
    platformSizeSystem?: string
  }>
}

export type StyleGovernancePreview = {
  previewId: string
  readyToExecute: boolean
  mergeCount: number
  convertCount: number
  keepSeparateCount: number
  channelProfileCount: number
  colorMappingCount: number
  skuMappingCount: number
  archiveCount: number
  skippedCount: number
  blockingCount: number
  blockingReasons?: string[]
}

export type StyleGovernanceExecutionResult = {
  executionId: string
  status: string
  successCount: number
  failedCount: number
  skippedCount: number
  message?: string | null
}

export type StyleGovernancePage = {
  list: StyleGovernanceItemSummary[]
  total: number
  page: number
  pageSize: number
}
