import type { SampleOrder, SampleProcessOption, SampleProcessStep, SampleQuantityMatrix } from './sample';

export interface StaffOption {
  id: string;
  name: string;
  avatar?: string;
  title?: string;
  department?: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  shortName?: string;
  level?: 'A' | 'B' | 'C' | 'D';
  contact?: string;
}

export interface SampleCreationAttachment {
  id: string;
  url: string;
  isMain?: boolean;
  color?: string;
  createdAt?: string;
}

export interface SampleCreationMeta {
  units: string[];
  sampleTypes: string[];
  customers: CustomerOption[];
  merchandisers: StaffOption[];
  patternMakers: StaffOption[];
  sampleSewers: StaffOption[];
  designers: StaffOption[];
  processLibrary: SampleProcessOption[];
  defaultProcesses: SampleProcessStep[];
  colorPresets: string[];
  sizePresets: string[];
}

export interface SampleCreationPayload extends Partial<SampleOrder> {
  unit: string;
  styleId?: string;
  customerId?: string;
  customerName?: string;
  merchandiserId?: string;
  patternMakerId?: string;
  sampleSewerId?: string;
  patternPrice?: number;
  orderDate?: string;
  deliveryDate?: string;
  remarks?: string;
  processes: SampleProcessStep[];
  colors: string[];
  sizes: string[];
  quantityMatrix: SampleQuantityMatrix;
  colorImagesEnabled: boolean;
  colorImageMap: Record<string, string | undefined>;
  attachments: SampleCreationAttachment[];
}
