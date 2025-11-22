import type {
  CreateProcessTypePayload,
  ProcessType,
  ProcessTypeDataset,
  ProcessTypeStatus,
  UpdateProcessTypePayload,
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const initialStore: ProcessType[] = [
  {
    id: 'process-01',
    name: '车缝工序',
    code: 'PROC-SEW',
    chargeMode: 'piecework',
    defaultWage: 0.58,
    unit: '件',
    description: '适用于标准机缝流程，按件计酬。',
    status: 'active',
    updatedAt: '2025-03-02 09:32',
  },
  {
    id: 'process-02',
    name: '锁钉压胶',
    code: 'PROC-LOCK',
    chargeMode: 'piecework',
    defaultWage: 0.36,
    unit: '件',
    description: '儿童外套锁钉加压胶特殊流程。',
    status: 'active',
    updatedAt: '2025-02-27 14:18',
  },
  {
    id: 'process-03',
    name: '水洗定型',
    code: 'PROC-WASH',
    chargeMode: 'stage',
    defaultWage: 220,
    unit: '批',
    description: 'T恤、卫衣水洗后定型流程，按批次核算。',
    status: 'inactive',
    updatedAt: '2025-02-20 18:46',
  },
  {
    id: 'process-04',
    name: '熨烫整烫',
    code: 'PROC-IRON',
    chargeMode: 'hourly',
    defaultWage: 32,
    unit: '小时',
    description: '整烫车缝成衣，按小时折算。',
    status: 'active',
    updatedAt: '2025-02-16 10:25',
  },
  {
    id: 'process-05',
    name: '裁剪备料',
    code: 'PROC-CUT',
    chargeMode: 'stage',
    defaultWage: 160,
    unit: '批',
    description: '按批计费的裁剪备料流程，支持配套下发。',
    status: 'active',
    updatedAt: '2025-02-13 08:50',
  },
  {
    id: 'process-06',
    name: '手工钉珠',
    code: 'PROC-BEAD',
    chargeMode: 'piecework',
    defaultWage: 1.2,
    unit: '件',
    description: '婚纱与礼服钉珠工艺，可与质检联动。',
    status: 'inactive',
    updatedAt: '2025-02-07 16:32',
  },
];

const store: ProcessType[] = clone(initialStore);

const nowString = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

const toDataset = (): ProcessTypeDataset => ({ list: clone(store), total: store.length });

export const listProcessTypes = async (delay = 160): Promise<ProcessTypeDataset> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(toDataset()), delay);
  });

export const createProcessType = async (payload: CreateProcessTypePayload, delay = 160): Promise<ProcessType> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const next: ProcessType = {
        id: `process-${Date.now()}`,
        status: payload.status ?? 'active',
        updatedAt: nowString(),
        ...payload,
      };
      store.unshift(next);
      resolve(clone(next));
    }, delay);
  });

export const updateProcessType = async (
  id: string,
  payload: UpdateProcessTypePayload,
  delay = 160,
): Promise<ProcessType | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const index = store.findIndex((item) => item.id === id);
      if (index === -1) {
        resolve(undefined);
        return;
      }
      const updated: ProcessType = {
        ...store[index],
        ...payload,
        updatedAt: nowString(),
      };
      store[index] = updated;
      resolve(clone(updated));
    }, delay);
  });

export const removeProcessType = async (id: string, delay = 160): Promise<boolean> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const index = store.findIndex((item) => item.id === id);
      if (index === -1) {
        resolve(false);
        return;
      }
      store.splice(index, 1);
      resolve(true);
    }, delay);
  });

export const batchRemoveProcessTypes = async (ids: string[], delay = 160): Promise<number> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const before = store.length;
      ids.forEach((itemId) => {
        const index = store.findIndex((item) => item.id === itemId);
        if (index !== -1) {
          store.splice(index, 1);
        }
      });
      resolve(before - store.length);
    }, delay);
  });

export const setProcessTypeStatus = async (
  id: string,
  status: ProcessTypeStatus,
  delay = 160,
): Promise<ProcessType | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const index = store.findIndex((item) => item.id === id);
      if (index === -1) {
        resolve(undefined);
        return;
      }
      store[index].status = status;
      store[index].updatedAt = nowString();
      resolve(clone(store[index]));
    }, delay);
  });

export const batchSetProcessTypeStatus = async (
  ids: string[],
  status: ProcessTypeStatus,
  delay = 160,
): Promise<number> =>
  new Promise((resolve) => {
    setTimeout(() => {
      ids.forEach((itemId) => {
        const index = store.findIndex((item) => item.id === itemId);
        if (index !== -1) {
          store[index].status = status;
          store[index].updatedAt = nowString();
        }
      });
      resolve(ids.length);
    }, delay);
  });

export const importProcessTypes = async (
  payload: CreateProcessTypePayload[],
  delay = 160,
): Promise<number> =>
  new Promise((resolve) => {
    setTimeout(() => {
      payload.forEach((item) => {
        store.unshift({
          id: `process-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          updatedAt: nowString(),
          status: item.status ?? 'active',
          ...item,
        });
      });
      resolve(payload.length);
    }, delay);
  });

export const exportProcessTypes = async (filters?: { onlyActive?: boolean }): Promise<Blob> => {
  const data = filters?.onlyActive ? store.filter((item) => item.status === 'active') : store;
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
};
