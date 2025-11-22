import type {
  OperationTemplate,
  OperationTemplateDataset,
  OperationTemplateListParams,
  SaveOperationTemplatePayload,
  UpdateOperationTemplatePayload,
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const sampleTemplates: OperationTemplate[] = [
  {
    id: 'tpl-1',
    name: '基础打样流程',
    defaultTemplate: true,
    operations: [
      {
        id: 'tpl-1-op-1',
        sequence: 1,
        unitPrice: 2.5,
        processCatalog: {
          id: '1',
          code: 'CUT',
          name: '裁剪',
          chargeMode: 'piecework',
          defaultWage: 2.5,
          unit: '件',
        },
      },
      {
        id: 'tpl-1-op-2',
        sequence: 2,
        unitPrice: 8,
        processCatalog: {
          id: '2',
          code: 'SEW',
          name: '缝制',
          chargeMode: 'piecework',
          defaultWage: 8,
          unit: '件',
        },
      },
    ],
    createdAt: '2025-02-15 09:00',
    updatedAt: '2025-02-20 11:12',
  },
];

const store: OperationTemplate[] = clone(sampleTemplates);

const toDataset = (): OperationTemplateDataset => ({ list: clone(store), total: store.length });

const list = async (_params?: OperationTemplateListParams): Promise<OperationTemplateDataset> => {
  void _params;
  return new Promise((resolve) => {
    setTimeout(() => resolve(toDataset()), 120);
  });
};

export const listOperationTemplates = list;

export const createOperationTemplate = async (
  payload: SaveOperationTemplatePayload,
): Promise<OperationTemplate> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const operations = payload.operations.map((operation, index) => ({
        id: `op-${Date.now()}-${index}`,
        sequence: operation.sequence ?? index + 1,
        unitPrice: operation.unitPrice,
        processCatalog: {
          id: operation.processCatalogId,
          code: `PROC-${operation.processCatalogId}`,
          name: `工序-${operation.processCatalogId}`,
        },
      }));
      const template: OperationTemplate = {
        id: `tpl-${Date.now()}`,
        name: payload.name,
        defaultTemplate: Boolean(payload.defaultTemplate),
        operations,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      store.unshift(template);
      resolve(clone(template));
    }, 120);
  });

export const updateOperationTemplate = async (
  id: string,
  payload: UpdateOperationTemplatePayload,
): Promise<OperationTemplate | undefined> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const index = store.findIndex((item) => item.id === id);
      if (index === -1) {
        resolve(undefined);
        return;
      }
      const operations = payload.operations.map((operation, sequenceIndex) => ({
        id: `op-${id}-${sequenceIndex}`,
        sequence: operation.sequence ?? sequenceIndex + 1,
        unitPrice: operation.unitPrice,
        processCatalog: {
          id: operation.processCatalogId,
          code: `PROC-${operation.processCatalogId}`,
          name: `工序-${operation.processCatalogId}`,
        },
      }));
      const updated: OperationTemplate = {
        ...store[index],
        name: payload.name,
        defaultTemplate: Boolean(payload.defaultTemplate),
        operations,
        updatedAt: new Date().toISOString(),
      };
      store[index] = updated;
      resolve(clone(updated));
    }, 120);
  });

export const removeOperationTemplate = async (id: string): Promise<boolean> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const index = store.findIndex((item) => item.id === id);
      if (index === -1) {
        resolve(false);
        return;
      }
      store.splice(index, 1);
      resolve(true);
    }, 120);
  });
