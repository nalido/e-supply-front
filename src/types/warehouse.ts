export type WarehouseType = 'material' | 'finished';

export type Warehouse = {
  id: string;
  name: string;
  type: WarehouseType;
  remarks?: string;
  updatedAt: string;
  createdAt: string;
};

export type WarehouseListParams = {
  page: number;
  pageSize: number;
};

export type WarehouseDataset = {
  list: Warehouse[];
  total: number;
};

export type SaveWarehousePayload = {
  name: string;
  type: WarehouseType;
  remarks?: string;
};

export type UpdateWarehousePayload = Partial<SaveWarehousePayload>;
