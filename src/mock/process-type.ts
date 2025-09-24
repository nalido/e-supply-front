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
    category: '系统',
    chargeMode: '计件',
    defaultWage: 0.58,
    unit: '件',
    description: '适用于标准机缝流程，按件计酬。',
    isDefault: true,
    status: 'active',
    updatedAt: '2025-03-02 09:32',
    createdBy: '系统预置',
    steps: ['分包', '大身缝制', '锁边', '质检入库'],
  },
  {
    id: 'process-02',
    name: '锁钉压胶',
    code: 'PROC-LOCK',
    category: '自定义',
    chargeMode: '计件',
    defaultWage: 0.36,
    unit: '件',
    description: '儿童外套锁钉加压胶特殊流程。',
    status: 'active',
    updatedAt: '2025-02-27 14:18',
    createdBy: '王明',
    steps: ['锁钉', '压胶', '外观检查'],
  },
  {
    id: 'process-03',
    name: '水洗定型',
    code: 'PROC-WASH',
    category: '自定义',
    chargeMode: '阶段计费',
    defaultWage: 220,
    unit: '批',
    description: 'T恤、卫衣水洗后定型流程，按批次核算。',
    status: 'inactive',
    updatedAt: '2025-02-20 18:46',
    createdBy: '陈静',
    steps: ['配方确认', '水洗', '烘干', '蒸汽定型'],
  },
  {
    id: 'process-04',
    name: '熨烫整烫',
    code: 'PROC-IRON',
    category: '系统',
    chargeMode: '计时',
    defaultWage: 32,
    unit: '小时',
    description: '整烫车缝成衣，按小时折算。',
    status: 'active',
    updatedAt: '2025-02-16 10:25',
    createdBy: '系统预置',
    steps: ['拆包', '熨烫', '挂烫', '整合入架'],
  },
  {
    id: 'process-05',
    name: '裁剪备料',
    code: 'PROC-CUT',
    category: '自定义',
    chargeMode: '阶段计费',
    defaultWage: 160,
    unit: '批',
    status: 'active',
    description: '按批计费的裁剪备料流程，支持配套下发。',
    updatedAt: '2025-02-13 08:50',
    createdBy: '周林',
    steps: ['排料', '裁剪', '扎号', '预缝'],
  },
  {
    id: 'process-06',
    name: '手工钉珠',
    code: 'PROC-BEAD',
    category: '自定义',
    chargeMode: '计件',
    defaultWage: 1.2,
    unit: '件',
    description: '婚纱与礼服钉珠工艺，可与质检联动。',
    status: 'inactive',
    updatedAt: '2025-02-07 16:32',
    createdBy: '赖颖',
    steps: ['钉珠', '贴膜', '半成品回收'],
  },
  {
    id: 'process-07',
    name: '包装装箱',
    code: 'PROC-PACK',
    category: '系统',
    chargeMode: '计件',
    defaultWage: 0.18,
    unit: '件',
    status: 'active',
    updatedAt: '2025-02-04 11:08',
    createdBy: '系统预置',
    steps: ['折叠', '装袋', '装箱', '扫码贴标'],
  },
  {
    id: 'process-08',
    name: '压胶贴条',
    code: 'PROC-TAPE',
    category: '自定义',
    chargeMode: '计件',
    defaultWage: 0.42,
    unit: '件',
    status: 'active',
    updatedAt: '2025-01-29 09:40',
    createdBy: '梁欣',
    steps: ['贴条', '压胶', '复检'],
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
      ids.forEach((id) => {
        const index = store.findIndex((item) => item.id === id);
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
): Promise<ProcessType | undefined> => updateProcessType(id, { status }, delay);

export const batchSetProcessTypeStatus = async (
  ids: string[],
  status: ProcessTypeStatus,
  delay = 160,
): Promise<number> =>
  new Promise((resolve) => {
    setTimeout(() => {
      let counter = 0;
      ids.forEach((id) => {
        const index = store.findIndex((item) => item.id === id);
        if (index !== -1) {
          store[index] = { ...store[index], status, updatedAt: nowString() };
          counter += 1;
        }
      });
      resolve(counter);
    }, delay);
  });

export const importProcessTypes = async (
  payload: CreateProcessTypePayload[],
  delay = 240,
): Promise<number> =>
  new Promise((resolve) => {
    setTimeout(() => {
      payload.forEach((item) => {
        const next: ProcessType = {
          id: `process-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          status: item.status ?? 'active',
          updatedAt: nowString(),
          ...item,
        };
        store.unshift(next);
      });
      resolve(payload.length);
    }, delay);
  });

export const exportProcessTypes = async (
  filters: { onlyActive?: boolean } = {},
  delay = 160,
): Promise<Blob> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const list = store.filter((item) => (filters.onlyActive ? item.status === 'active' : true));
      const blob = new Blob([JSON.stringify({ exportedAt: nowString(), list }, null, 2)], {
        type: 'application/json',
      });
      resolve(blob);
    }, delay);
  });

export const resetProcessTypeStore = (): void => {
  store.splice(0, store.length, ...clone(initialStore));
};
