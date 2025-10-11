import type {
  SaveWarehousePayload,
  UpdateWarehousePayload,
  Warehouse,
  WarehouseDataset,
  WarehouseListParams,
} from '../types';
import {
  createWarehouse,
  listWarehouses,
  removeWarehouse,
  updateWarehouse,
} from '../mock/warehouse';

export const warehouseApi = {
  list: (params: WarehouseListParams): Promise<WarehouseDataset> => listWarehouses(params),
  create: (payload: SaveWarehousePayload): Promise<Warehouse> => createWarehouse(payload),
  update: (id: string, payload: UpdateWarehousePayload): Promise<Warehouse | undefined> => updateWarehouse(id, payload),
  remove: (id: string): Promise<boolean> => removeWarehouse(id),
};

export default warehouseApi;
