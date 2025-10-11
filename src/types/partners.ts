export type PartnerStatus = 'uninvited' | 'invited' | 'bound';

export type PartnerType = 'customer' | 'supplier' | 'factory';

export type Partner = {
  id: string;
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
};

export type UpdatePartnerPayload = Partial<SavePartnerPayload> & {
  disabled?: boolean;
  status?: PartnerStatus;
  boundEnterprise?: string;
};
