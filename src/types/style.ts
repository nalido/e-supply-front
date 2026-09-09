import type { MaterialBasicType } from './material';
import type { MaterialMinimumSpecification } from './material';

export type StyleStatus = 'active' | 'inactive';

export interface StyleData {
  id: string;
  styleNo: string;
  styleName: string;
  image?: string;
  colors: string[];
  sizes: string[];
  category?: string;
  status: StyleStatus;
  defaultUnit?: string;
  createTime?: string;
  updateTime?: string;
}

export interface StyleListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: StyleStatus;
}

export interface PaginatedStyleData {
  list: StyleData[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StyleFormMeta {
  units: string[];
  designers: Array<{ id: string; name: string }>;
}

export type StyleColorImageMap = Record<string, string | undefined>;

export interface StyleMaterialData {
  materialId: number;
  materialName: string;
  materialSku: string;
  materialType: 'FABRIC' | 'ACCESSORY' | 'PACKAGING';
  unit: string;
  consumption: number;
  lossRate: number;
  imageUrl?: string;
  unitPrice?: number;
  remark?: string;
  bomItemId?: string;
  minimumSpecificationLabel?: string;
  applicableColors?: string[];
  applyToAllColors?: boolean;
  sizeConsumptions?: Array<{ size: string; consumption: number | null }>;
}

export interface StyleBomMaterialDraft {
  uid: string;
  materialId?: string;
  materialType: MaterialBasicType;
  name: string;
  sku: string;
  unit: string;
  imageUrl?: string;
  consumption: number;
  lossRate: number;
  unitPrice?: number;
  remark?: string;
}

export interface StyleDetailData {
  id?: string;
  styleNo: string;
  styleName: string;
  status: StyleStatus;
  defaultUnit?: string;
  designerId?: string;
  remarks?: string;
  coverImageUrl?: string;
  detailImageUrls: string[];
  colors: string[];
  sizes: string[];
  colorImages: StyleColorImageMap;
  sizeChartImageUrl?: string;
  materials?: StyleMaterialData[];
  variants?: Array<{
    id: string;
    styleSkcId?: string;
    color?: string;
    size?: string;
    skcNo?: string;
    systemSkcNo?: string;
    skuNo?: string;
    systemSkuNo?: string;
    barcode?: string;
    sourceType?: 'SYSTEM_DERIVED' | 'USER_CONFIRMED' | 'USER_EDITED';
    attributes?: Record<string, unknown>;
  }>;
}

export interface StyleCodeVariantDraft {
  color: string;
  size: string;
  skcNo?: string;
  systemSkcNo?: string;
  skuNo?: string;
  systemSkuNo?: string;
  barcode?: string;
  sourceType?: 'SYSTEM_DERIVED' | 'USER_CONFIRMED' | 'USER_EDITED';
  attributes?: Record<string, unknown>;
}

export interface StyleVariantSavePayload {
  color?: string;
  size?: string;
  skcNo?: string;
  skuNo?: string;
  barcode?: string;
  sourceType?: 'SYSTEM_DERIVED' | 'USER_CONFIRMED' | 'USER_EDITED';
  attributes?: Record<string, unknown>;
}

export interface StyleDetailSavePayload {
  styleNo: string;
  styleName: string;
  status: StyleStatus;
  defaultUnit?: string;
  designerId?: string;
  remarks?: string;
  coverImageUrl?: string;
  detailImageUrls: string[];
  sizeChartImageUrl?: string;
  colors: string[];
  sizes: string[];
  colorImages: StyleColorImageMap;
  variants?: StyleVariantSavePayload[];
}

export interface StyleCodeImpactLink {
  channelAccountId?: string;
  accountName?: string;
  shopName?: string;
  platformCode?: string;
  targetOfferId?: string;
  targetProductId?: string;
}

export interface StyleVariantImpactReference {
  label: string;
  count: number;
}

export interface StyleVariantImpact {
  styleVariantId?: string;
  color?: string;
  size?: string;
  references: StyleVariantImpactReference[];
}

export interface StyleCodeImpactCheckResult {
  requiresConfirmation: boolean;
  blocked: boolean;
  impactedCount: number;
  impactedLinks: StyleCodeImpactLink[];
  variantImpacts: StyleVariantImpact[];
}

export interface StyleBomUpdatePayload {
  items: Array<{
    materialId: string;
    consumption: number;
    lossRate?: number;
    remark?: string;
  }>;
}

export type StyleBomHandlingMode = 'FUTURE_ONLY' | 'SYNC_UNISSUED' | 'CREATE_CORRECTION_TASK';

export type StyleBomHistoryRangePreset = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'CUSTOM' | 'ALL';

export interface StyleBomSizeConsumption {
  size: string;
  consumption: number | null;
}

export interface StyleBomConfigurationItem {
  id?: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  materialType: MaterialBasicType;
  unit: string;
  imageUrl?: string;
  materialMinimumSpecificationId: string;
  minimumSpecification: MaterialMinimumSpecification;
  applyToAllColors: boolean;
  applicableColors: string[];
  averageConsumption: number | null;
  sizeConsumptions: StyleBomSizeConsumption[];
  lossRate: number;
  remark?: string;
}

export interface StyleBomConfiguration {
  bomVersionId?: string;
  revisionCode?: string;
  revision: number;
  items: StyleBomConfigurationItem[];
}

export interface StyleBomLineDraft extends StyleBomConfigurationItem {
  uid: string;
}

export type StyleBomValidationIssueCode =
  | 'MATERIAL_REQUIRED'
  | 'SPECIFICATION_REQUIRED'
  | 'SPECIFICATION_INACTIVE'
  | 'COLOR_REQUIRED'
  | 'COLOR_INVALID'
  | 'AVERAGE_CONSUMPTION_REQUIRED'
  | 'CONSUMPTION_REQUIRED'
  | 'DUPLICATE_SCOPE';

export interface StyleBomValidationIssue {
  uid: string;
  code: StyleBomValidationIssueCode;
  message: string;
  color?: string;
  size?: string;
}

export interface StyleBomImpactPreview {
  previewToken: string;
  unissuedOrderCount: number;
  issuedOrderCount: number;
  adjustableHistoryCount: number;
  manualReviewCount: number;
  lockedCount: number;
}

export interface StyleBomUnconfiguredOrderLine {
  productionOrderId: string;
  orderNo: string;
  color?: string;
  size?: string;
}

export interface StyleBomUpdateConfigurationPayload {
  baseBomVersionId?: string;
  previewToken: string;
  handlingMode: StyleBomHandlingMode;
  historyStart?: string;
  historyEnd?: string;
  idempotencyKey: string;
  candidateColors: string[];
  candidateSizes: string[];
  items: StyleBomLineDraft[];
}
