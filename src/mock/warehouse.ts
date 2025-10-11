import type {
  SaveWarehousePayload,
  UpdateWarehousePayload,
  Warehouse,
  WarehouseDataset,
  WarehouseListParams,
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const nowString = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

const initialWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    name: '杭州总部成品仓',
    type: 'finished',
    remarks: '主要用于国内渠道成品存储',
    createdAt: '2024-07-12 08:30',
    updatedAt: '2025-02-20 17:05',
  },
  {
    id: 'wh-002',
    name: '滨江辅料仓',
    type: 'material',
    remarks: '辅料与配件集中存放, 支持扫码出入库',
    createdAt: '2024-09-05 10:22',
    updatedAt: '2025-01-18 09:58',
  },
  {
    id: 'wh-003',
    name: '嘉兴外协中转库',
    type: 'finished',
    remarks: '外发工厂回货中转暂存',
    createdAt: '2024-11-28 15:10',
    updatedAt: '2025-02-02 13:40',
  },
];

const store: Warehouse[] = clone(initialWarehouses);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

export const listWarehouses = async (
  params: WarehouseListParams,
  latency = 200,
): Promise<WarehouseDataset> => {
  await delay(latency);
  return {
    list: paginate(store, params.page, params.pageSize).map(clone),
    total: store.length,
  };
};

export const createWarehouse = async (
  payload: SaveWarehousePayload,
  latency = 220,
): Promise<Warehouse> => {
  await delay(latency);
  const timestamp = nowString();
  const next: Warehouse = {
    id: `wh-${Date.now()}`,
    name: payload.name,
    type: payload.type,
    remarks: payload.remarks,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.unshift(next);
  return clone(next);
};

export const updateWarehouse = async (
  id: string,
  payload: UpdateWarehousePayload,
  latency = 200,
): Promise<Warehouse | undefined> => {
  await delay(latency);
  const target = store.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  const updated: Warehouse = {
    ...target,
    ...payload,
    type: payload.type ?? target.type,
    updatedAt: nowString(),
  };
  Object.assign(target, updated);
  return clone(updated);
};

export const removeWarehouse = async (id: string, latency = 180): Promise<boolean> => {
  await delay(latency);
  const index = store.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  store.splice(index, 1);
  return true;
};

export const resetWarehouseStore = () => {
  store.splice(0, store.length, ...clone(initialWarehouses));
};
