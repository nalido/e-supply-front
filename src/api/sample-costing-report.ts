import http from './http';
import { requireTenantId, toBackendPage } from './request-context';
import type {
  SampleCostAggregation,
  SampleCostCard,
  SampleCostListParams,
  SampleCostListResponse,
} from '../types/sample-costing-report';

type BackendAggregation = {
  trend?: Array<{ month?: string; developmentCost?: number; sampleCost?: number }>;
  typeComparison?: Array<{ name?: string; value?: number }>;
};

type BackendCard = {
  id?: string | number;
  imageUrl?: string;
  styleNumber?: string;
  styleName?: string;
  sampleNo?: string;
  quantity?: number;
  developmentCost?: number;
  otherCost?: number;
  totalCost?: number;
  completionDate?: string;
  unitCost?: number;
  costBreakdown?: Array<{ item?: string; cost?: number }>;
};

type BackendListResponse = {
  items?: BackendCard[];
  list?: BackendCard[];
  total: number;
};

type ExportResponse = {
  fileUrl: string;
};

const adaptCard = (record: BackendCard): SampleCostCard => ({
  id: record.id ? String(record.id) : crypto.randomUUID(),
  imageUrl: record.imageUrl,
  styleNumber: record.styleNumber ?? '--',
  styleName: record.styleName ?? '--',
  sampleOrderNo: record.sampleNo ?? '--',
  quantity: record.quantity ?? 0,
  developmentCost: record.developmentCost ?? 0,
  completionDate: record.completionDate ?? '',
  unitCost:
    record.unitCost ??
    (record.totalCost !== undefined && record.quantity
      ? record.totalCost / record.quantity
      : record.totalCost ?? 0),
  costBreakdown:
      record.costBreakdown?.map((item) => ({
        item: item.item ?? '--',
        cost: item.cost ?? 0,
      })) ?? [],
});

export const sampleCostingReportService = {
  async getAggregation(): Promise<SampleCostAggregation> {
    const tenantId = requireTenantId();
    const response = await http.get<BackendAggregation>(
      '/api/v1/sample/reports/costing/aggregation',
      { params: { tenantId } },
    );
    const data = response.data ?? {};
    const trend = data.trend ?? [];
    const typeComparison = data.typeComparison ?? [];
    return {
      trend: {
        labels: trend.map((point) => point.month ?? ''),
        developmentCost: trend.map((point) => point.developmentCost ?? 0),
        sampleCost: trend.map((point) => point.sampleCost ?? 0),
      },
      typeComparison: {
        total: typeComparison.reduce((sum, item) => sum + (item.value ?? 0), 0),
        types: typeComparison.map((item) => ({
          name: item.name ?? '--',
          value: item.value ?? 0,
        })),
      },
    };
  },

  async getList(params: SampleCostListParams): Promise<SampleCostListResponse> {
    const tenantId = requireTenantId();
    const response = await http.get<BackendListResponse>('/api/v1/sample/reports/costing', {
      params: {
        tenantId,
        keyword: params.keyword,
        startDate: params.startDate,
        endDate: params.endDate,
        page: toBackendPage(params.page),
        size: params.pageSize,
      },
      skipPageNormalization: true,
    });
    const data = response.data ?? { items: [], list: [], total: 0 };
    const items = data.items ?? data.list ?? [];
    return {
      list: items.map(adaptCard),
      total: data.total ?? 0,
    };
  },

  async export(params: SampleCostListParams): Promise<ExportResponse> {
    const tenantId = requireTenantId();
    const response = await http.post<ExportResponse>('/api/v1/sample/reports/costing/export', {
      tenantId,
      keyword: params.keyword,
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return response.data;
  },
};
