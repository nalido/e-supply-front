import http from './http';
import { requireTenantId, toBackendPage } from './request-context';
import type {
  OrderShipmentProfitAggregation,
  OrderShipmentProfitListParams,
  OrderShipmentProfitListResponse,
  OrderShipmentProfitRecord,
} from '../types/order-shipment-profit-report';

type BackendAggregation = OrderShipmentProfitAggregation;

type BackendRecord = Partial<OrderShipmentProfitRecord> & { id?: string | number };

type BackendListResponse = {
  items?: BackendRecord[];
  list?: BackendRecord[];
  total: number;
  summary?: {
    shipmentAmount?: number;
    profit?: number;
  };
};

const adaptRecord = (record: BackendRecord): OrderShipmentProfitRecord => ({
  id: record.id ? String(record.id) : crypto.randomUUID(),
  orderNumber: record.orderNumber ?? '--',
  customer: record.customer ?? '--',
  styleNumber: record.styleNumber ?? '--',
  styleName: record.styleName ?? '--',
  shipmentDate: record.shipmentDate ?? '',
  shippedQty: record.shippedQty ?? 0,
  shipmentAmount: record.shipmentAmount ?? 0,
  cost: record.cost ?? 0,
  profit: record.profit ?? 0,
  profitMargin: record.profitMargin ?? 0,
});

export const orderShipmentProfitReportService = {
  async getAggregation(): Promise<OrderShipmentProfitAggregation> {
    const tenantId = requireTenantId();
    const response = await http.get<BackendAggregation>(
      '/api/v1/orders/reports/shipment-profit/aggregation',
      { params: { tenantId } },
    );
    return response.data ?? {
      totalShipmentAmount: 0,
      totalProfit: 0,
      trend: [],
    };
  },

  async getList(params: OrderShipmentProfitListParams): Promise<OrderShipmentProfitListResponse> {
    const tenantId = requireTenantId();
    const response = await http.get<BackendListResponse>(
      '/api/v1/orders/reports/shipment-profit',
      {
        params: {
          tenantId,
          keyword: params.keyword,
          page: toBackendPage(params.page),
          size: params.pageSize,
        },
        skipPageNormalization: true,
      },
    );
    const data = response.data ?? { items: [], list: [], total: 0, summary: {} };
    const items = data.items ?? data.list ?? [];
    return {
      list: items.map(adaptRecord),
      total: data.total ?? 0,
      summary: {
        shipmentAmount: data.summary?.shipmentAmount ?? 0,
        profit: data.summary?.profit ?? 0,
      },
    };
  },

  async export(params: OrderShipmentProfitListParams) {
    const tenantId = requireTenantId();
    const response = await http.post<{ fileUrl: string }>(
      '/api/v1/orders/reports/shipment-profit/export',
      {
        tenantId,
        keyword: params.keyword,
      },
    );
    return response.data;
  },
};
