export type MaterialBasicType = 'fabric' | 'accessory';

export type MaterialUnit = 'kg' | '公斤' | '斤' | '米' | '件' | '个' | '码' | '张' | '套' | '条';

export type MaterialMinimumSpecification = {
  id?: string;
  code?: string;
  label: string;
  color?: string;
  specification?: string;
  width?: string;
  grammage?: string;
  active: boolean;
  legacyDefault?: boolean;
  recoveryCandidate?: boolean;
  recoveryBasis?: 'business-record' | 'original-data';
  recoveryEvidenceCount?: number;
};

export type MaterialSpecificationRecoverySuggestion = {
  minimumSpecificationId?: string;
  color: string;
  specification: string;
  selected: boolean;
  basis: 'business-record' | 'original-data';
  evidenceCount: number;
};

export type MaterialSpecificationRecoveryPreview = {
  materialId: string;
  originalColors: string[];
  originalSpecifications: string[];
  historicalPlaceholderRetained: boolean;
  suggestions: MaterialSpecificationRecoverySuggestion[];
};

export type MaterialItem = {
  id: string;
  tenantId?: string;
  sku: string;
  name: string;
  materialType: MaterialBasicType;
  imageUrl?: string;
  width?: string;
  grammage?: string;
  tolerance?: string;
  unit: MaterialUnit;
  referencePrice?: number;
  colors: string[];
  specifications: string[];
  minimumSpecifications: MaterialMinimumSpecification[];
  legacyUnmappedDimensions?: boolean;
  remarks?: string;
  status?: 'active' | 'inactive';
  updatedAt?: string;
  createdAt?: string;
};

export type MaterialListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  materialType: MaterialBasicType;
};

export type MaterialDataset = {
  list: MaterialItem[];
  total: number;
};

export type CreateMaterialPayload = {
  rowNumber?: number;
  name: string;
  sku?: string;
  materialType: MaterialBasicType;
  imageUrl?: string;
  width?: string;
  grammage?: string;
  tolerance?: string;
  unit: MaterialUnit;
  referencePrice?: number;
  colors?: string[];
  specifications?: string[];
  minimumSpecifications?: MaterialMinimumSpecification[];
  remarks?: string;
};

export type UpdateMaterialPayload = Partial<CreateMaterialPayload>;
