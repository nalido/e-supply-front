import type {
  Partner,
  PartnerDataset,
  PartnerListParams,
  PartnerStatus,
  PartnerType,
  SavePartnerPayload,
  UpdatePartnerPayload,
} from '../types';
import { apiConfig } from './config';
import http from './http';
import { tenantStore } from '../stores/tenant';
import {
  createPartner as mockCreatePartner,
  invitePartner as mockInvitePartner,
  listPartners as mockListPartners,
  removePartner as mockRemovePartner,
  togglePartnerDisabled as mockTogglePartnerDisabled,
  updatePartner as mockUpdatePartner,
} from '../mock/partners';

const useMock = apiConfig.useMock;

type BackendPartnerType = 'CUSTOMER' | 'SUPPLIER' | 'FACTORY' | 'SUBCONTRACTOR';
type BackendPartnerStatus = 'UNINVITED' | 'INVITED' | 'BOUND' | 'DISABLED';

type BackendPartnerResponse = {
  id: number;
  tenantId: number;
  name: string;
  type: BackendPartnerType;
  status: BackendPartnerStatus;
  contact?: string;
  phone?: string;
  address?: string;
  tags?: string[];
  remarks?: string;
  taxId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BackendPageResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

const adaptPartnerType = (type: BackendPartnerType): PartnerType => {
  switch (type) {
    case 'SUPPLIER':
      return 'supplier';
    case 'FACTORY':
      return 'factory';
    case 'SUBCONTRACTOR':
      return 'subcontractor';
    case 'CUSTOMER':
    default:
      return 'customer';
  }
};

const normalizePartnerType = (type: PartnerType | undefined): BackendPartnerType | undefined => {
  if (!type) {
    return undefined;
  }
  switch (type) {
    case 'supplier':
      return 'SUPPLIER';
    case 'factory':
      return 'FACTORY';
    case 'subcontractor':
      return 'SUBCONTRACTOR';
    case 'customer':
    default:
      return 'CUSTOMER';
  }
};

const adaptPartnerStatus = (status: BackendPartnerStatus): PartnerStatus => {
  switch (status) {
    case 'INVITED':
      return 'invited';
    case 'BOUND':
      return 'bound';
    case 'DISABLED':
      return 'disabled';
    case 'UNINVITED':
    default:
      return 'uninvited';
  }
};

const normalizePartnerStatus = (status?: PartnerStatus): BackendPartnerStatus | undefined => {
  if (!status) {
    return undefined;
  }
  switch (status) {
    case 'invited':
      return 'INVITED';
    case 'bound':
      return 'BOUND';
    case 'disabled':
      return 'DISABLED';
    case 'uninvited':
    default:
      return 'UNINVITED';
  }
};

const adaptPartner = (item: BackendPartnerResponse): Partner => {
  const status = adaptPartnerStatus(item.status);
  return {
    id: String(item.id),
    tenantId: item.tenantId ? String(item.tenantId) : undefined,
    name: item.name,
    type: adaptPartnerType(item.type),
    status,
    disabled: status === 'disabled',
    contact: item.contact ?? undefined,
    phone: item.phone ?? undefined,
    address: item.address ?? undefined,
    tags: Array.isArray(item.tags) ? item.tags : [],
    remarks: item.remarks ?? undefined,
    boundEnterprise: undefined,
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
};

const ensureTenantId = (): number => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未找到租户信息，请重新登录或选择企业。');
  }
  const parsed = Number(tenantId);
  if (!Number.isFinite(parsed)) {
    throw new Error('租户信息无效，请刷新后重试');
  }
  return parsed;
};

const buildPartnerPayload = (
  tenantId: number,
  payload: SavePartnerPayload,
): Record<string, unknown> => ({
  tenantId,
  name: payload.name,
  type: normalizePartnerType(payload.type),
  status: normalizePartnerStatus(payload.status),
  contact: payload.contact,
  phone: payload.phone,
  address: payload.address,
  tags: payload.tags,
  remarks: payload.remarks,
  taxId: payload.taxId,
});

const setPartnerStatus = async (
  partnerId: string,
  status: PartnerStatus,
): Promise<Partner | undefined> => {
  if (useMock) {
    if (status === 'disabled') {
      return mockTogglePartnerDisabled(partnerId, true);
    }
    if (status === 'invited') {
      return mockInvitePartner(partnerId);
    }
    return mockTogglePartnerDisabled(partnerId, false);
  }
  const tenantId = ensureTenantId();
  const response = await http.post<BackendPartnerResponse>(
    `/api/v1/partners/${partnerId}/status/update`,
    { status: normalizePartnerStatus(status) },
    { params: { tenantId } },
  );
  return adaptPartner(response.data);
};

export const partnersApi = {
  list: async (params: PartnerListParams): Promise<PartnerDataset> => {
    if (useMock) {
      return mockListPartners(params);
    }
    const tenantId = ensureTenantId();
    const statusFilter = params.onlyDisabled ? 'disabled' : params.status;
    const response = await http.get<BackendPageResponse<BackendPartnerResponse>>(
      '/api/v1/partners',
      {
        params: {
          tenantId,
          type: normalizePartnerType(params.type),
          status: normalizePartnerStatus(statusFilter),
          keyword: params.keyword,
          page: params.page,
          size: params.pageSize,
        },
      },
    );
    return {
      list: response.data.items.map(adaptPartner),
      total: response.data.total,
    };
  },
  create: async (payload: SavePartnerPayload): Promise<Partner> => {
    if (useMock) {
      return mockCreatePartner(payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendPartnerResponse>('/api/v1/partners', {
      ...buildPartnerPayload(tenantId, payload),
    });
    return adaptPartner(response.data);
  },
  update: async (id: string, payload: UpdatePartnerPayload): Promise<Partner | undefined> => {
    if (useMock) {
      return mockUpdatePartner(id, payload);
    }
    const tenantId = ensureTenantId();
    const response = await http.post<BackendPartnerResponse>(
      `/api/v1/partners/${id}/update`,
      buildPartnerPayload(tenantId, payload),
    );
    return adaptPartner(response.data);
  },
  remove: async (id: string): Promise<boolean> => {
    if (useMock) {
      return mockRemovePartner(id);
    }
    const tenantId = ensureTenantId();
    await http.delete(`/api/v1/partners/${id}`, {
      params: { tenantId },
    });
    return true;
  },
  invite: (id: string): Promise<Partner | undefined> => setPartnerStatus(id, 'invited'),
  toggleDisabled: (id: string, disabled: boolean): Promise<Partner | undefined> =>
    setPartnerStatus(id, disabled ? 'disabled' : 'uninvited'),
};

export default partnersApi;
