import type {
  OperationTemplate,
  OperationTemplateDataset,
  OperationTemplateListParams,
  SaveOperationTemplatePayload,
  UpdateOperationTemplatePayload,
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const nowString = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

const initialTemplates: OperationTemplate[] = [
  {
    id: 'opt-001',
    name: '童装基础裁剪+缝制',
    operations: [
      { id: 'op-001', name: '裁剪', price: 1.6, remarks: '含铺布、裁片检验' },
      { id: 'op-002', name: '锁边', price: 0.8 },
      { id: 'op-003', name: '前片组合', price: 2.5 },
      { id: 'op-004', name: '后片组合', price: 2.3 },
      { id: 'op-005', name: '总拼', price: 4.2 },
      { id: 'op-006', name: '检验+包装', price: 1.1 },
    ],
    createdAt: '2025-02-11 09:12',
    updatedAt: '2025-03-02 15:40',
  },
  {
    id: 'opt-002',
    name: '羽绒外套标准工序',
    operations: [
      { id: 'op-011', name: '裁剪前预缩', price: 0.9 },
      { id: 'op-012', name: '绗缝', price: 3.8, remarks: '按片计价' },
      { id: 'op-013', name: '装袋', price: 6.2 },
      { id: 'op-014', name: '合体', price: 4.5 },
      { id: 'op-015', name: '锁口', price: 1.7 },
      { id: 'op-016', name: '整烫', price: 1.4 },
    ],
    createdAt: '2024-12-03 10:08',
    updatedAt: '2025-01-18 14:26',
  },
  {
    id: 'opt-003',
    name: '针织套装流水线',
    operations: [
      { id: 'op-021', name: '面片裁剪', price: 1.2 },
      { id: 'op-022', name: '领口缝合', price: 1.1 },
      { id: 'op-023', name: '袖口缝合', price: 1.0 },
      { id: 'op-024', name: '下摆定型', price: 0.9 },
      { id: 'op-025', name: '成衣检验', price: 0.7 },
    ],
    createdAt: '2025-01-15 13:50',
    updatedAt: '2025-02-06 09:30',
  },
];

const store: OperationTemplate[] = clone(initialTemplates);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

export const listOperationTemplates = async (
  params: OperationTemplateListParams,
  latency = 220,
): Promise<OperationTemplateDataset> => {
  await delay(latency);
  const keyword = params.keyword?.trim().toLowerCase();
  const filtered = store.filter((item) => {
    if (!keyword) {
      return true;
    }
    if (item.name.toLowerCase().includes(keyword)) {
      return true;
    }
    return item.operations.some((operation) => operation.name.toLowerCase().includes(keyword));
  });

  return {
    list: paginate(filtered, params.page, params.pageSize).map(clone),
    total: filtered.length,
  };
};

export const createOperationTemplate = async (
  payload: SaveOperationTemplatePayload,
  latency = 240,
): Promise<OperationTemplate> => {
  await delay(latency);
  const id = `opt-${Date.now()}`;
  const createdAt = nowString();
  const next: OperationTemplate = {
    id,
    name: payload.name,
    operations: payload.operations.map((op, index) => ({
      id: `${id}-op-${index + 1}`,
      name: op.name,
      price: op.price,
      remarks: op.remarks,
    })),
    createdAt,
    updatedAt: createdAt,
  };
  store.unshift(next);
  return clone(next);
};

export const updateOperationTemplate = async (
  id: string,
  payload: UpdateOperationTemplatePayload,
  latency = 200,
): Promise<OperationTemplate | undefined> => {
  await delay(latency);
  const target = store.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  const updated: OperationTemplate = {
    ...target,
    name: payload.name,
    operations: payload.operations.map((op, index) => ({
      id: `${id}-op-${index + 1}`,
      name: op.name,
      price: op.price,
      remarks: op.remarks,
    })),
    updatedAt: nowString(),
  };
  Object.assign(target, updated);
  return clone(updated);
};

export const removeOperationTemplate = async (id: string, latency = 180): Promise<boolean> => {
  await delay(latency);
  const index = store.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  store.splice(index, 1);
  return true;
};

export const resetOperationTemplateStore = () => {
  store.splice(0, store.length, ...clone(initialTemplates));
};
