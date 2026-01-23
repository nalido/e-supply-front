import http from './http';
import { tenantStore } from '../stores/tenant';
import type {
  CustomerReceiptListParams,
  CustomerReceiptListResponse,
  CustomerReceiptMeta,
  CustomerReceiptPayload,
} from '../types/settlement-customer-receipts';
import type {
  SupplierPaymentListParams,
  SupplierPaymentListResponse,
  SupplierPaymentMeta,
  SupplierPaymentPayload,
} from '../types/settlement-supplier-payments';
import type {
  FactoryPaymentListParams,
  FactoryPaymentListResponse,
  FactoryPaymentMeta,
  FactoryPaymentPayload,
} from '../types/settlement-factory-payments';
import type {
  CashierAccountListParams,
  CashierAccountListResponse,
  CashierAccountMeta,
  CashierAccountPayload,
} from '../types/settlement-cashier-accounts';
import type {
  CustomerBusinessDetailAggregation,
  CustomerBusinessDetailListParams,
  CustomerBusinessDetailListResponse,
  CustomerBusinessDetailMeta,
} from '../types/settlement-report-customer-details';
import type {
  SupplierBusinessDetailAggregation,
  SupplierBusinessDetailListParams,
  SupplierBusinessDetailListResponse,
  SupplierBusinessDetailMeta,
} from '../types/settlement-report-supplier-details';
import type {
  FactoryBusinessDetailAggregation,
  FactoryBusinessDetailListParams,
  FactoryBusinessDetailListResponse,
  FactoryBusinessDetailMeta,
} from '../types/settlement-report-factory-details';
import type {
  ReconciliationDetailsListParams,
  ReconciliationDetailsListResponse,
  ReconciliationDetailsMeta,
} from '../types/settlement-report-reconciliation-details';

const ensureTenantId = (): string => {
  const tenantId = tenantStore.getTenantId();
  if (!tenantId) {
    throw new Error('未获取到企业信息，请重新登录');
  }
  return tenantId;
};

const exportRequest = async (url: string, payload: Record<string, unknown>) => {
  const response = await http.post<{ fileUrl: string }>(url, payload);
  return response.data;
};

export const customerReceiptService = {
  async getMeta(): Promise<CustomerReceiptMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<CustomerReceiptMeta>(
      '/api/v1/settlements/customers/receipts/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(params: CustomerReceiptListParams): Promise<CustomerReceiptListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<CustomerReceiptListResponse>(
      '/api/v1/settlements/customers/receipts',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  async create(payload: CustomerReceiptPayload) {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/settlements/customers/receipts', {
      tenantId,
      ...payload,
    });
  },

  export(params: CustomerReceiptListParams) {
    const tenantId = ensureTenantId();
    return exportRequest('/api/v1/settlements/customers/receipts/export', {
      tenantId,
      keyword: params.keyword,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  },
};

export const supplierPaymentService = {
  async getMeta(): Promise<SupplierPaymentMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<SupplierPaymentMeta>(
      '/api/v1/settlements/suppliers/payments/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(params: SupplierPaymentListParams): Promise<SupplierPaymentListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<SupplierPaymentListResponse>(
      '/api/v1/settlements/suppliers/payments',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  async create(payload: SupplierPaymentPayload) {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/settlements/suppliers/payments', {
      tenantId,
      ...payload,
    });
  },

  export(params: SupplierPaymentListParams) {
    const tenantId = ensureTenantId();
    return exportRequest('/api/v1/settlements/suppliers/payments/export', {
      tenantId,
      keyword: params.keyword,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  },
};

export const factoryPaymentService = {
  async getMeta(): Promise<FactoryPaymentMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<FactoryPaymentMeta>(
      '/api/v1/settlements/factories/payments/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(params: FactoryPaymentListParams): Promise<FactoryPaymentListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<FactoryPaymentListResponse>(
      '/api/v1/settlements/factories/payments',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  async create(payload: FactoryPaymentPayload) {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/settlements/factories/payments', {
      tenantId,
      ...payload,
    });
  },

  export(params: FactoryPaymentListParams) {
    const tenantId = ensureTenantId();
    return exportRequest('/api/v1/settlements/factories/payments/export', {
      tenantId,
      keyword: params.keyword,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  },
};

export const cashierAccountService = {
  async getMeta(): Promise<CashierAccountMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<CashierAccountMeta>(
      '/api/v1/settlements/cashier-accounts/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(params: CashierAccountListParams): Promise<CashierAccountListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<CashierAccountListResponse>(
      '/api/v1/settlements/cashier-accounts',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          type: params.type,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  async create(payload: CashierAccountPayload) {
    const tenantId = ensureTenantId();
    await http.post('/api/v1/settlements/cashier-accounts', {
      tenantId,
      ...payload,
    });
  },

  async update(id: string, payload: CashierAccountPayload) {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/settlements/cashier-accounts/${id}/update`, {
      tenantId,
      ...payload,
    });
  },

  async remove(id: string) {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/settlements/cashier-accounts/${id}/delete`, null, {
      params: { tenantId },
    });
  },
};

export const customerBusinessDetailReportService = {
  async getMeta(): Promise<CustomerBusinessDetailMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<CustomerBusinessDetailMeta>(
      '/api/v1/settlements/reports/customers/details/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getOverview(
    params: CustomerBusinessDetailListParams,
  ): Promise<CustomerBusinessDetailAggregation> {
    const tenantId = ensureTenantId();
    const response = await http.get<CustomerBusinessDetailAggregation>(
      '/api/v1/settlements/reports/customers/details/overview',
      {
        params: {
          tenantId,
          customerIds: params.customerIds,
          startDate: params.startDate,
          endDate: params.endDate,
          page: 0,
          size: 1000,
        },
      },
    );
    return response.data;
  },

  async getList(
    params: CustomerBusinessDetailListParams,
  ): Promise<CustomerBusinessDetailListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<CustomerBusinessDetailListResponse>(
      '/api/v1/settlements/reports/customers/details',
      {
        params: {
          tenantId,
          customerIds: params.customerIds,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  export(params: CustomerBusinessDetailListParams) {
    const tenantId = ensureTenantId();
    return exportRequest('/api/v1/settlements/reports/customers/details/export', {
      tenantId,
      customerIds: params.customerIds,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  },
};

export const supplierBusinessDetailReportService = {
  async getMeta(): Promise<SupplierBusinessDetailMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<SupplierBusinessDetailMeta>(
      '/api/v1/settlements/reports/suppliers/details/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getOverview(
    params: SupplierBusinessDetailListParams,
  ): Promise<SupplierBusinessDetailAggregation> {
    const tenantId = ensureTenantId();
    const response = await http.get<SupplierBusinessDetailAggregation>(
      '/api/v1/settlements/reports/suppliers/details/overview',
      {
        params: {
          tenantId,
          supplierIds: params.supplierIds,
          startDate: params.startDate,
          endDate: params.endDate,
          page: 0,
          size: 1000,
        },
      },
    );
    return response.data;
  },

  async getList(
    params: SupplierBusinessDetailListParams,
  ): Promise<SupplierBusinessDetailListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<SupplierBusinessDetailListResponse>(
      '/api/v1/settlements/reports/suppliers/details',
      {
        params: {
          tenantId,
          supplierIds: params.supplierIds,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  export(params: SupplierBusinessDetailListParams) {
    const tenantId = ensureTenantId();
    return exportRequest('/api/v1/settlements/reports/suppliers/details/export', {
      tenantId,
      supplierIds: params.supplierIds,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  },
};

export const factoryBusinessDetailReportService = {
  async getMeta(): Promise<FactoryBusinessDetailMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<FactoryBusinessDetailMeta>(
      '/api/v1/settlements/reports/factories/details/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getOverview(
    params: FactoryBusinessDetailListParams,
  ): Promise<FactoryBusinessDetailAggregation> {
    const tenantId = ensureTenantId();
    const response = await http.get<FactoryBusinessDetailAggregation>(
      '/api/v1/settlements/reports/factories/details/overview',
      {
        params: {
          tenantId,
          factoryIds: params.factoryIds,
          startDate: params.startDate,
          endDate: params.endDate,
          page: 0,
          size: 1000,
        },
      },
    );
    return response.data;
  },

  async getList(
    params: FactoryBusinessDetailListParams,
  ): Promise<FactoryBusinessDetailListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<FactoryBusinessDetailListResponse>(
      '/api/v1/settlements/reports/factories/details',
      {
        params: {
          tenantId,
          factoryIds: params.factoryIds,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  export(params: FactoryBusinessDetailListParams) {
    const tenantId = ensureTenantId();
    return exportRequest('/api/v1/settlements/reports/factories/details/export', {
      tenantId,
      factoryIds: params.factoryIds,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  },
};

export const reconciliationDetailsReportService = {
  async getMeta(): Promise<ReconciliationDetailsMeta> {
    const tenantId = ensureTenantId();
    const response = await http.get<ReconciliationDetailsMeta>(
      '/api/v1/settlements/reports/reconciliation/meta',
      { params: { tenantId } },
    );
    return response.data;
  },

  async getList(
    params: ReconciliationDetailsListParams,
  ): Promise<ReconciliationDetailsListResponse> {
    const tenantId = ensureTenantId();
    const response = await http.get<ReconciliationDetailsListResponse>(
      '/api/v1/settlements/reports/reconciliation',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          status: params.status,
          page: params.page - 1,
          size: params.pageSize,
        },
      },
    );
    return response.data;
  },

  async cancel(id: string) {
    const tenantId = ensureTenantId();
    await http.post(`/api/v1/settlements/reports/reconciliation/${id}/cancel`, null, {
      params: { tenantId },
    });
  },

  export(params: ReconciliationDetailsListParams) {
    const tenantId = ensureTenantId();
    return exportRequest('/api/v1/settlements/reports/reconciliation/export', {
      tenantId,
      keyword: params.keyword,
      status: params.status,
    });
  },
};
