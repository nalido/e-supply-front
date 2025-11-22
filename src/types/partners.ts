export type PartnerStatus = 'uninvited' | 'invited' | 'bound' | 'disabled';

export type PartnerType = 'customer' | 'supplier' | 'factory' | 'subcontractor';

export type Partner = {
  id: string;
  tenantId?: string;
  name: string;
  type: PartnerType;
  status: PartnerStatus;
  tags: string[];
  contact?: string;
  phone?: string;
  address?: string;
  disabled: boolean;
  boundEnterprise?: string;
  remarks?: string;
  updatedAt: string;
  createdAt: string;
};

export type PartnerListParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  type?: PartnerType;
  onlyDisabled?: boolean;
  status?: PartnerStatus;
};

export type PartnerDataset = {
  list: Partner[];
  total: number;
};

export type SavePartnerPayload = {
  name: string;
  type: PartnerType;
  contact?: string;
  phone?: string;
  address?: string;
  tags?: string[];
  remarks?: string;
  status?: PartnerStatus;
  taxId?: string;
};

export type UpdatePartnerPayload = SavePartnerPayload;
