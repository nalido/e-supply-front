import type {
  Partner,
  PartnerDataset,
  PartnerListParams,
  PartnerStatus,
  SavePartnerPayload,
  UpdatePartnerPayload,
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const nowString = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

const initialPartners: Partner[] = [
  {
    id: 'partner-001',
    name: '杭州暖衣童装有限公司',
    type: 'customer',
    status: 'bound',
    tags: ['童装渠道', '直营门店'],
    contact: '刘丽',
    phone: '13812340001',
    address: '杭州市滨江区潮人里商圈',
    disabled: false,
    boundEnterprise: '衣协同-杭州总部',
    remarks: '每季度订货 5000+ 件',
    createdAt: '2024-10-11 09:30',
    updatedAt: '2025-02-14 16:20',
  },
  {
    id: 'partner-002',
    name: '嘉兴顺丰制衣厂',
    type: 'factory',
    status: 'invited',
    tags: ['外发主力', '电商代工'],
    contact: '王强',
    phone: '13987651230',
    address: '嘉兴市秀洲区洪合镇工业园',
    disabled: false,
    boundEnterprise: undefined,
    remarks: '擅长针织类，交期稳定',
    createdAt: '2024-08-19 14:05',
    updatedAt: '2025-01-08 11:42',
  },
  {
    id: 'partner-003',
    name: '宁波欣源面料商行',
    type: 'supplier',
    status: 'bound',
    tags: ['经编面料', '羽绒面料'],
    contact: '周敏',
    phone: '13688881234',
    address: '宁波市江北区纺织城 3F-120',
    disabled: false,
    boundEnterprise: '衣协同-物料中心',
    remarks: '支持票据月结',
    createdAt: '2024-11-01 10:12',
    updatedAt: '2025-03-02 09:02',
  },
  {
    id: 'partner-004',
    name: '温州童心汇供应链',
    type: 'customer',
    status: 'uninvited',
    tags: ['批发渠道'],
    contact: '郑红',
    phone: '13755553366',
    address: '温州市鹿城区七都路 208 号',
    disabled: true,
    boundEnterprise: undefined,
    remarks: '去年采购量低，暂时停用',
    createdAt: '2024-06-23 08:45',
    updatedAt: '2024-12-30 17:15',
  },
  {
    id: 'partner-005',
    name: '苏州智绣工坊',
    type: 'factory',
    status: 'bound',
    tags: ['刺绣', '打样快速'],
    contact: '顾蕾',
    phone: '13577776688',
    address: '苏州市吴中区木渎古镇 66 号',
    disabled: false,
    boundEnterprise: '衣协同-协同中心',
    remarks: '方便打样与小批量处理',
    createdAt: '2024-09-05 13:28',
    updatedAt: '2025-02-27 10:05',
  },
];

const store: Partner[] = clone(initialPartners);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const paginate = <T>(list: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

export const listPartners = async (
  params: PartnerListParams,
  latency = 240,
): Promise<PartnerDataset> => {
  await delay(latency);
  const keyword = normalize(params.keyword);

  const filtered = store.filter((item) => {
    if (params.onlyDisabled && !item.disabled) {
      return false;
    }
    if (params.type && item.type !== params.type) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const candidates = [item.name, item.contact, item.phone, item.address, item.tags.join(' ')];
    return candidates.some((candidate) => candidate?.toLowerCase().includes(keyword));
  });

  return {
    list: paginate(filtered, params.page, params.pageSize).map(clone),
    total: filtered.length,
  };
};

export const createPartner = async (
  payload: SavePartnerPayload,
  latency = 260,
): Promise<Partner> => {
  await delay(latency);
  const id = `partner-${Date.now()}`;
  const timestamp = nowString();
  const next: Partner = {
    id,
    name: payload.name,
    type: payload.type,
    status: 'uninvited',
    tags: payload.tags ?? [],
    contact: payload.contact,
    phone: payload.phone,
    address: payload.address,
    disabled: false,
    remarks: payload.remarks,
    boundEnterprise: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.unshift(next);
  return clone(next);
};

export const updatePartner = async (
  id: string,
  payload: UpdatePartnerPayload,
  latency = 220,
): Promise<Partner | undefined> => {
  await delay(latency);
  const target = store.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  const updated: Partner = {
    ...target,
    ...payload,
    tags: payload.tags ?? target.tags,
    type: payload.type ?? target.type,
    status: payload.status ?? target.status,
    disabled: payload.disabled ?? target.disabled,
    updatedAt: nowString(),
  };
  Object.assign(target, updated);
  return clone(updated);
};

export const removePartner = async (id: string, latency = 200): Promise<boolean> => {
  await delay(latency);
  const index = store.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  store.splice(index, 1);
  return true;
};

export const invitePartner = async (
  id: string,
  latency = 180,
): Promise<Partner | undefined> => {
  await delay(latency);
  const target = store.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  let nextStatus: PartnerStatus = target.status;
  if (target.status === 'uninvited') {
    nextStatus = 'invited';
  } else if (target.status === 'invited') {
    nextStatus = 'bound';
  }
  target.status = nextStatus;
  target.updatedAt = nowString();
  return clone(target);
};

export const togglePartnerDisabled = async (
  id: string,
  disabled: boolean,
  latency = 160,
): Promise<Partner | undefined> => {
  await delay(latency);
  const target = store.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  target.disabled = disabled;
  target.updatedAt = nowString();
  return clone(target);
};

export const resetPartnerStore = () => {
  store.splice(0, store.length, ...clone(initialPartners));
};
