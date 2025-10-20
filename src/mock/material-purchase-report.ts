import dayjs from 'dayjs';
import type {
  MaterialPurchaseReportListItem,
  MaterialPurchaseReportListParams,
  MaterialPurchaseReportListResponse,
  MaterialPurchaseReportMeta,
  SupplierOption,
} from '../types/material-purchase-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const supplierOptions: SupplierOption[] = [
  { id: 'sup-001', name: '兴盛纺织' },
  { id: 'sup-002', name: '锦绣面料行' },
  { id: 'sup-003', name: '宏兴辅料' },
  { id: 'sup-004', name: '博雅包装' },
];

const purchaseTypeLabels: Record<string, string> = {
  preparation: '备料采购',
  order: '按单采购',
};

const dataset: MaterialPurchaseReportListItem[] = [
  {
    id: 'mpr-20250301-001',
    purchaseType: 'preparation',
    purchaseTypeLabel: purchaseTypeLabels.preparation,
    purchaseOrderNo: 'PO-PR-20250301-001',
    purchaseTime: '2025-03-01 09:12',
    documentNo: 'IN-20250302-001',
    styleNo: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    supplierName: '兴盛纺织',
    supplierModel: 'XS-A2025',
    supplierColor: '奶白',
    materialType: '面料',
    materialName: '32S全棉罗纹',
    color: '本白',
    specification: '180cm · 180g/m²',
    width: '180cm',
    weight: '180g/m²',
    orderedQty: 5200,
    unit: '米',
    unitPrice: 26.8,
    orderedAmount: 139360,
    inboundTime: '2025-03-02 15:45',
    inboundQty: 4800,
    inboundAmount: 128640,
  },
  {
    id: 'mpr-20250303-002',
    purchaseType: 'order',
    purchaseTypeLabel: purchaseTypeLabels.order,
    purchaseOrderNo: 'PO-OR-ET0362-005',
    purchaseTime: '2025-03-03 11:05',
    documentNo: 'IN-20250305-006',
    styleNo: 'ET0362',
    styleName: '儿童黑色波浪拉链速干短裤',
    supplierName: '锦绣面料行',
    supplierModel: 'JX-ET0362',
    supplierColor: '深黑',
    materialType: '面料',
    materialName: '高弹锦纶经编网布',
    color: '黑色',
    specification: '150cm · 220g/m²',
    width: '150cm',
    weight: '220g/m²',
    orderedQty: 2400,
    unit: '米',
    unitPrice: 39.5,
    orderedAmount: 94800,
    inboundTime: '2025-03-05 09:20',
    inboundQty: 2400,
    inboundAmount: 94800,
  },
  {
    id: 'mpr-20250304-003',
    purchaseType: 'preparation',
    purchaseTypeLabel: purchaseTypeLabels.preparation,
    purchaseOrderNo: 'PO-PR-20250304-002',
    purchaseTime: '2025-03-04 16:48',
    documentNo: 'IN-20250306-004',
    styleNo: 'ET5033',
    styleName: '儿童撞色条纹卫衣卫裤套装',
    supplierName: '宏兴辅料',
    supplierModel: 'HX-STRIPE',
    supplierColor: '橘白条',
    materialType: '辅料',
    materialName: '罗纹松紧带',
    color: '橘白',
    specification: ' 5cm × 100m/卷',
    width: '5cm',
    orderedQty: 380,
    unit: '卷',
    unitPrice: 18.6,
    orderedAmount: 7068,
    inboundTime: '2025-03-06 18:32',
    inboundQty: 360,
    inboundAmount: 6696,
  },
  {
    id: 'mpr-20250305-004',
    purchaseType: 'order',
    purchaseTypeLabel: purchaseTypeLabels.order,
    purchaseOrderNo: 'PO-OR-ET5031-003',
    purchaseTime: '2025-03-05 10:18',
    documentNo: 'IN-20250307-002',
    styleNo: 'ET5031',
    styleName: '儿童高领开衫撞色条纹套装',
    supplierName: '兴盛纺织',
    supplierModel: 'XS-5031',
    supplierColor: '咖色条',
    materialType: '面料',
    materialName: '全棉提花双面布',
    color: '咖色',
    specification: '160cm · 260g/m²',
    width: '160cm',
    weight: '260g/m²',
    orderedQty: 1800,
    unit: '米',
    unitPrice: 45.2,
    orderedAmount: 81360,
    inboundTime: '2025-03-07 20:05',
    inboundQty: 1700,
    inboundAmount: 76840,
  },
  {
    id: 'mpr-20250306-005',
    purchaseType: 'preparation',
    purchaseTypeLabel: purchaseTypeLabels.preparation,
    purchaseOrderNo: 'PO-PR-20250306-001',
    purchaseTime: '2025-03-06 14:36',
    documentNo: 'IN-20250309-008',
    styleNo: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    supplierName: '博雅包装',
    materialType: '包材',
    materialName: '童装手提礼盒',
    color: '暖白',
    specification: '32cm × 25cm × 8cm',
    orderedQty: 2200,
    unit: '个',
    unitPrice: 5.8,
    orderedAmount: 12760,
    inboundTime: '2025-03-09 13:08',
    inboundQty: 0,
    inboundAmount: 0,
  },
];

const defaultMeta: MaterialPurchaseReportMeta = {
  suppliers: supplierOptions,
  purchaseTypes: [
    { value: 'preparation', label: purchaseTypeLabels.preparation },
    { value: 'order', label: purchaseTypeLabels.order },
  ],
};

const filterByParams = (params: MaterialPurchaseReportListParams) => {
  const {
    documentNo,
    styleKeyword,
    purchaseOrderNo,
    materialKeyword,
    supplierId,
    dateType = 'inbound',
    startDate,
    endDate,
  } = params;
  const rangeStart = startDate ? dayjs(startDate) : null;
  const rangeEnd = endDate ? dayjs(endDate) : null;

  return dataset.filter((item) => {
    if (documentNo && !item.documentNo.toLowerCase().includes(documentNo.trim().toLowerCase())) {
      return false;
    }
    if (styleKeyword) {
      const keyword = styleKeyword.trim().toLowerCase();
      const haystack = `${item.styleNo} ${item.styleName}`.toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
    }
    if (purchaseOrderNo && !item.purchaseOrderNo.toLowerCase().includes(purchaseOrderNo.trim().toLowerCase())) {
      return false;
    }
    if (materialKeyword) {
      const keyword = materialKeyword.trim().toLowerCase();
      const materialHaystack = `${item.materialName} ${item.materialType}`.toLowerCase();
      if (!materialHaystack.includes(keyword)) {
        return false;
      }
    }
    if (supplierId) {
      const supplier = supplierOptions.find((option) => option.id === supplierId)?.name;
      if (!supplier || supplier !== item.supplierName) {
        return false;
      }
    }

    if (rangeStart && rangeEnd) {
      const targetDate = dateType === 'purchase' ? item.purchaseTime : item.inboundTime;
      if (!targetDate) {
        return false;
      }
      const target = dayjs(targetDate);
      if (target.isBefore(rangeStart, 'day') || target.isAfter(rangeEnd, 'day')) {
        return false;
      }
    }

    return true;
  });
};

export const fetchMaterialPurchaseReportMeta = async (): Promise<MaterialPurchaseReportMeta> => {
  await delay(160);
  return defaultMeta;
};

export const fetchMaterialPurchaseReportList = async (
  params: MaterialPurchaseReportListParams,
): Promise<MaterialPurchaseReportListResponse> => {
  await delay(260);
  const filtered = filterByParams(params);
  const safePage = Math.max(1, params.page);
  const safeSize = Math.max(1, params.pageSize);
  const start = (safePage - 1) * safeSize;
  const list = filtered.slice(start, start + safeSize);
  return {
    list,
    total: filtered.length,
  };
};
