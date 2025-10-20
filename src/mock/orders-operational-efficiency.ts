import type {
  OperationalEfficiencyListItem,
  OperationalEfficiencyListParams,
  OperationalEfficiencyListResponse,
  OperationalEfficiencyMeta,
  OperationalEfficiencyNode,
  OperationalEfficiencyNodeOption,
  OperationalEfficiencyTemplate,
  OperationalEfficiencyTemplatePayload,
} from '../types/operational-efficiency';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const nodeOptions: OperationalEfficiencyNodeOption[] = [
  { value: 'material-prep', label: '备料', description: '确认物料到位及预处理' },
  { value: 'cutting', label: '裁剪', description: '裁床排料、裁剪分捡' },
  { value: 'sewing', label: '车缝', description: '整件缝制、特殊工艺处理' },
  { value: 'ironing', label: '整烫', description: '半成品或成品熨烫定型' },
  { value: 'inspection', label: '质检', description: '全检/抽检成品品质' },
  { value: 'finishing', label: '后整', description: '修剪线头、补扣、整烫复查' },
  { value: 'packing', label: '包装', description: '折叠装袋、装箱贴标' },
  { value: 'shipping', label: '发货', description: '装车出库、物流交接' },
];

const unitOptions: OperationalEfficiencyMeta['timeUnits'] = [
  { value: 'day', label: '天' },
  { value: 'hour', label: '小时' },
];

const createNodeId = (templateId: string, index: number) =>
  `${templateId}-node-${index + 1}-${Math.random().toString(16).slice(2, 8)}`;

const resolveNodeName = (code: string): string =>
  nodeOptions.find((item) => item.value === code)?.label ?? code;

const cloneNodesFromPayload = (
  templateId: string,
  nodes: OperationalEfficiencyTemplatePayload['nodes'],
): OperationalEfficiencyNode[] =>
  nodes.map((node, index) => ({
    id: createNodeId(templateId, index),
    nodeCode: node.nodeCode,
    nodeName: resolveNodeName(node.nodeCode),
    standardDuration: node.standardDuration,
    timeUnit: node.timeUnit,
    sequence: index + 1,
  }));

const buildSummary = (nodes: OperationalEfficiencyNode[]): string =>
  (nodes.length ? nodes.map((node) => node.nodeName).join(' -> ') : '未配置节点');

const attachSummary = (
  template: OperationalEfficiencyTemplate,
): OperationalEfficiencyListItem => ({
  ...template,
  nodeSummary: buildSummary(template.nodes),
});

const nowIso = () => new Date().toISOString();

const createTemplateId = () => `oe-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;

let templates: OperationalEfficiencyTemplate[] = [
  {
    id: 'oe-default-standard',
    name: '标准大货生产线',
    isDefault: true,
    nodes: [
      {
        id: 'oe-default-standard-node-1',
        nodeCode: 'material-prep',
        nodeName: resolveNodeName('material-prep'),
        standardDuration: 2,
        timeUnit: 'day',
        sequence: 1,
      },
      {
        id: 'oe-default-standard-node-2',
        nodeCode: 'cutting',
        nodeName: resolveNodeName('cutting'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 2,
      },
      {
        id: 'oe-default-standard-node-3',
        nodeCode: 'sewing',
        nodeName: resolveNodeName('sewing'),
        standardDuration: 3,
        timeUnit: 'day',
        sequence: 3,
      },
      {
        id: 'oe-default-standard-node-4',
        nodeCode: 'ironing',
        nodeName: resolveNodeName('ironing'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 4,
      },
      {
        id: 'oe-default-standard-node-5',
        nodeCode: 'inspection',
        nodeName: resolveNodeName('inspection'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 5,
      },
      {
        id: 'oe-default-standard-node-6',
        nodeCode: 'packing',
        nodeName: resolveNodeName('packing'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 6,
      },
    ],
    createdAt: '2025-02-01T08:00:00.000Z',
    updatedAt: '2025-02-15T10:30:00.000Z',
  },
  {
    id: 'oe-sample-rapid',
    name: '样衣快速线',
    isDefault: false,
    nodes: [
      {
        id: 'oe-sample-rapid-node-1',
        nodeCode: 'cutting',
        nodeName: resolveNodeName('cutting'),
        standardDuration: 6,
        timeUnit: 'hour',
        sequence: 1,
      },
      {
        id: 'oe-sample-rapid-node-2',
        nodeCode: 'sewing',
        nodeName: resolveNodeName('sewing'),
        standardDuration: 12,
        timeUnit: 'hour',
        sequence: 2,
      },
      {
        id: 'oe-sample-rapid-node-3',
        nodeCode: 'inspection',
        nodeName: resolveNodeName('inspection'),
        standardDuration: 2,
        timeUnit: 'hour',
        sequence: 3,
      },
    ],
    createdAt: '2025-01-12T02:45:00.000Z',
    updatedAt: '2025-02-05T07:15:00.000Z',
  },
  {
    id: 'oe-outsource-collab',
    name: '委外协同线',
    isDefault: false,
    nodes: [
      {
        id: 'oe-outsource-collab-node-1',
        nodeCode: 'material-prep',
        nodeName: resolveNodeName('material-prep'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 1,
      },
      {
        id: 'oe-outsource-collab-node-2',
        nodeCode: 'cutting',
        nodeName: resolveNodeName('cutting'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 2,
      },
      {
        id: 'oe-outsource-collab-node-3',
        nodeCode: 'sewing',
        nodeName: resolveNodeName('sewing'),
        standardDuration: 2,
        timeUnit: 'day',
        sequence: 3,
      },
      {
        id: 'oe-outsource-collab-node-4',
        nodeCode: 'finishing',
        nodeName: resolveNodeName('finishing'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 4,
      },
      {
        id: 'oe-outsource-collab-node-5',
        nodeCode: 'inspection',
        nodeName: resolveNodeName('inspection'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 5,
      },
      {
        id: 'oe-outsource-collab-node-6',
        nodeCode: 'shipping',
        nodeName: resolveNodeName('shipping'),
        standardDuration: 1,
        timeUnit: 'day',
        sequence: 6,
      },
    ],
    createdAt: '2024-12-08T04:30:00.000Z',
    updatedAt: '2025-01-28T09:20:00.000Z',
  },
];

const sortTemplates = (dataset: OperationalEfficiencyTemplate[]): OperationalEfficiencyTemplate[] =>
  [...dataset].sort((a, b) => {
    if (a.isDefault && !b.isDefault) {
      return -1;
    }
    if (!a.isDefault && b.isDefault) {
      return 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

export const fetchOperationalEfficiencyMeta = async (): Promise<OperationalEfficiencyMeta> => {
  await delay(200);
  return {
    nodeOptions,
    timeUnits: unitOptions,
  };
};

export const fetchOperationalEfficiencyList = async (
  params: OperationalEfficiencyListParams,
): Promise<OperationalEfficiencyListResponse> => {
  await delay(260);
  const { page, pageSize, keyword } = params;
  const safePage = Math.max(page, 1);
  const safeSize = Math.max(pageSize, 1);
  const trimmed = keyword?.trim().toLowerCase();
  const filtered = trimmed
    ? templates.filter(
        (template) =>
          template.name.toLowerCase().includes(trimmed) ||
          template.nodes.some((node) => node.nodeName.toLowerCase().includes(trimmed)),
      )
    : templates;
  const ordered = sortTemplates(filtered);
  const total = ordered.length;
  const start = (safePage - 1) * safeSize;
  const list = ordered.slice(start, start + safeSize).map(attachSummary);
  return { list, total };
};

export const createOperationalEfficiencyTemplate = async (
  payload: OperationalEfficiencyTemplatePayload,
): Promise<OperationalEfficiencyListItem> => {
  await delay(320);
  const id = createTemplateId();
  if (payload.isDefault) {
    templates = templates.map((item) => ({ ...item, isDefault: false }));
  }
  const timestamp = nowIso();
  const nodes = cloneNodesFromPayload(id, payload.nodes);
  const template: OperationalEfficiencyTemplate = {
    id,
    name: payload.name,
    isDefault: payload.isDefault,
    nodes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  templates = sortTemplates([template, ...templates]);
  return attachSummary(template);
};

export const updateOperationalEfficiencyTemplate = async (
  id: string,
  payload: OperationalEfficiencyTemplatePayload,
): Promise<OperationalEfficiencyListItem> => {
  await delay(320);
  let exists = false;
  let nextTemplates = templates.map((item) => {
    if (item.id !== id) {
      return item;
    }
    exists = true;
    return {
      ...item,
      name: payload.name,
      isDefault: payload.isDefault,
      nodes: cloneNodesFromPayload(id, payload.nodes),
      updatedAt: nowIso(),
    } satisfies OperationalEfficiencyTemplate;
  });
  if (!exists) {
    throw new Error('模板不存在');
  }
  if (payload.isDefault) {
    nextTemplates = nextTemplates.map((item) => ({ ...item, isDefault: item.id === id }));
  } else {
    const currentDefault = nextTemplates.some((item) => item.isDefault);
    if (!currentDefault) {
      const first = nextTemplates[0];
      if (first) {
        nextTemplates = nextTemplates.map((item, index) => ({ ...item, isDefault: index === 0 }));
      }
    }
  }
  templates = sortTemplates(nextTemplates);
  const updated = templates.find((item) => item.id === id);
  if (!updated) {
    throw new Error('模板不存在');
  }
  return attachSummary(updated);
};

export const removeOperationalEfficiencyTemplate = async (
  id: string,
): Promise<{ success: boolean }> => {
  await delay(200);
  const before = templates.length;
  templates = templates.filter((item) => item.id !== id);
  if (!templates.some((item) => item.isDefault) && templates.length) {
    const [first, ...rest] = templates;
    templates = [{ ...first, isDefault: true }, ...rest];
  }
  return { success: before !== templates.length };
};

export const setOperationalEfficiencyDefault = async (
  id: string,
): Promise<{ success: boolean }> => {
  await delay(200);
  let found = false;
  templates = templates.map((item) => {
    if (item.id === id) {
      found = true;
      return { ...item, isDefault: true, updatedAt: nowIso() };
    }
    return { ...item, isDefault: false };
  });
  templates = sortTemplates(templates);
  return { success: found };
};
