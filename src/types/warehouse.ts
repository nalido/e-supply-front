export type WarehouseType = 'material' | 'finished' | 'virtual';

export type WarehouseStatus = 'active' | 'inactive';

export type Warehouse = {
  id: string;
  tenantId?: string;
  name: string;
  type: WarehouseType;
  status: WarehouseStatus;
  remarks?: string;
  address?: string;
  managerId?: string;
  updatedAt?: string;
  createdAt?: string;
};

export type WarehouseListParams = {
  page: number;
  pageSize: number;
  type?: WarehouseType;
  status?: WarehouseStatus;
  keyword?: string;
};

export type WarehouseDataset = {
  list: Warehouse[];
  total: number;
};

export type SaveWarehousePayload = {
  name: string;
  type: WarehouseType;
  remarks?: string;
  address?: string;
  status?: WarehouseStatus;
  managerId?: string;
};

export type UpdateWarehousePayload = SaveWarehousePayload;
