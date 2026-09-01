export type PodDesignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

export type PodAsset = {
  id?: number
  assetType: 'BASE_IMAGE' | 'SOURCE_IMAGE' | 'MOCKUP'
  printId?: string
  fileName?: string
  deliveryUrl: string
  width?: number
  height?: number
  fileSize?: number
}

export type PodDesignStyle = {
  id: number
  currentRevisionId?: number
  productTemplateId?: number
  styleNo: string
  styleName: string
  status: PodDesignStatus
  categoryName?: string
  description?: string
  rightsHolder?: string
  rightsSource?: string
  licenseScope?: string
  licenseExpiresAt?: string
  reviewComment?: string
  baseImage?: PodAsset
  sourceImage?: PodAsset
  sourceImages?: PodAsset[]
  mockupImage?: PodAsset
  mockupImages?: Array<{
    templateImageId: number
    status: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
    asset?: PodAsset
    errorMessage?: string
    batchNo?: string
    startedAt?: string
    finishedAt?: string
  }>
  generationBatchNo?: string
  confirmedBatchNo?: string
  resultCurrent: boolean
  submittedAt?: string
  reviewedAt?: string
  reviewedBy?: number
  factoryBinding?: {
    styleId: number
    styleNo: string
    styleName: string
    skcId: number
    skcNo?: string
    colorName: string
    skuCount: number
    boundAt: string
  }
  publishReadiness: { ready: boolean; blockers: string[] }
  reviewEvents: Array<{ id: number; revisionId: number; action: string; operatorId?: number; comment?: string; createdAt: string }>
  revisions: Array<{ id: number; revisionNo: number; frozen: boolean; frozenAt?: string; generationBatchNo?: string; confirmedBatchNo?: string; confirmedAt?: string; assets: PodAsset[] }>
  createdAt?: string
  updatedAt?: string
}

export type PodDesignPage = {
  items: PodDesignStyle[]
  total: number
  page: number
  size: number
}

export type PodDesignListParams = {
  keyword?: string
  status?: PodDesignStatus
  page: number
  size: number
}

export type PodDesignDraft = Pick<PodDesignStyle, 'productTemplateId' | 'styleNo' | 'styleName' | 'categoryName' | 'description'>

export type PodFactoryStyleBindingDraft = {
  mode: 'CREATE_NEW_STYLE' | 'USE_EXISTING_STYLE'
  existingStyleId?: number
  factoryStyleNo?: string
  factoryStyleName?: string
  colorName: string
}

export type PodTemplateImageRole = 'FRONT' | 'BACK' | 'SIDE' | 'MODEL' | 'MATERIAL' | 'DETAIL'

export type PodTemplateImage = {
  id: number
  imageRole: PodTemplateImageRole
  imageName: string
  deliveryUrl: string
  referencePreviewUrl?: string
  width: number
  height: number
  printX?: number
  printY?: number
  printWidth?: number
  printHeight?: number
  physicalPrintWidthMm?: number
  physicalPrintHeightMm?: number
  rotationDegrees: number
  mirrorArtwork: boolean
  sortOrder: number
}

export type PodPrintSizeHistory = {
  id: number
  widthMm: number
  heightMm: number
  useCount: number
  lastUsedAt: string
}

export type PodProductTemplate = {
  id: number
  templateNo: string
  templateName: string
  categoryName?: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  configVersion: number
  printTechnique?: string
  minDpi?: number
  bleedMm?: number
  safeMarginMm?: number
  workflowConfig?: string
  images: PodTemplateImage[]
  readinessBlockers: string[]
  createdAt?: string
  updatedAt?: string
}

export type PodTemplatePrint = { id: string; name: string; color: string }

export type PodTemplateSize = { id: string; name: string }

export type PodPrintSizeMeasurement = {
  sizeId: string
  widthMm?: number
  heightMm?: number
}

export type PodTemplateWorkflowNode = {
  id: string
  type: 'INPUT' | 'PRINT' | 'OUTPUT'
  imageId: number
  inputNodeId?: string
  printId?: string
  name: string
  finalOutput: boolean
  outputRole?: PodTemplateImageRole
  area?: PodPrintArea
  sizeMeasurements?: PodPrintSizeMeasurement[]
}

export type PodTemplateWorkflow = {
  version: 1
  prints: PodTemplatePrint[]
  sizes: PodTemplateSize[]
  nodes: PodTemplateWorkflowNode[]
}

export type PodProductTemplateDraft = Pick<PodProductTemplate, 'templateNo' | 'templateName' | 'categoryName' | 'description' | 'printTechnique' | 'minDpi' | 'bleedMm' | 'safeMarginMm'>

export type PodPrintArea = {
  x: number
  y: number
  width: number
  height: number
  physicalWidthMm?: number
  physicalHeightMm?: number
  rotationDegrees?: number
  mirrorArtwork?: boolean
}
