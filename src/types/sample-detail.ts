export interface SampleMaterialItem {
  id: string;
  category: 'fabric' | 'trim' | 'packaging';
  name: string;
  code: string;
  unit: string;
  consumption: number;
  unitPrice: number;
  cost: number;
  lossRate?: number;
  supplier?: string;
  image?: string;
  remark?: string;
}

export interface SampleProcessItem {
  id: string;
  sequence: number;
  name: string;
  laborPrice: number;
  standardTime?: number;
  remark?: string;
}

export interface SampleOtherCostItem {
  id: string;
  costType: string;
  developmentCost: number;
  quotedUnitCost: number;
  remark?: string;
}

export interface SampleAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  updatedAt: string;
}

export interface SampleDevelopmentCostItem {
  id: string;
  name: string;
  amount: number;
  remark?: string;
}

export interface SampleCostBreakdown {
  fabric: number;
  trims: number;
  packaging: number;
  processing: number;
}

export interface SampleCostInfo {
  totalQuotedPrice: number;
  developmentFee: number;
  breakdown: SampleCostBreakdown;
  developmentFeeDetails: SampleDevelopmentCostItem[];
}

export interface SampleOrderDetail {
  id: string;
  styleNo: string;
  sampleNo: string;
  merchandiser?: string;
  patternMaker?: string;
  patternPrice: number;
  styleName: string;
  patternType?: string;
  patternDate: string;
  paperPatternNo?: string;
  remarks?: string;
  unit: string;
  customer?: string;
  estimatedDeliveryDate?: string;
  sampleSewer?: string;
  processingTypes: string[];
  lineArtImage?: string;
  colors: string[];
  sizes: string[];
  quantityMatrix: Record<string, Record<string, number>>;
  bom: {
    fabrics: SampleMaterialItem[];
    trims: SampleMaterialItem[];
  };
  processes: SampleProcessItem[];
  sizeChartImage?: string;
  otherCosts: SampleOtherCostItem[];
  attachments: SampleAttachment[];
  cost: SampleCostInfo;
}
