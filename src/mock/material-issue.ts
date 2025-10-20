import type {
  MaterialIssueListParams,
  MaterialIssueListResponse,
  MaterialIssueMeta,
  MaterialIssueRecord,
  MaterialIssueType,
} from '../types/material-issue';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const tabs: MaterialIssueMeta['tabs'] = [
  { value: 'fabric', label: '面料' },
  { value: 'accessory', label: '辅料/包材' },
];

const fabricRecords: MaterialIssueRecord[] = [
  {
    id: 'issue-fabric-001',
    poNumber: 'PO-FAB-20250301-001',
    warehouseName: '杭州总仓',
    materialName: '32S全棉罗纹',
    materialType: '面料',
    imageUrl: '/assets/images/materials/fabric-cotton.jpg',
    color: '本白',
    width: '180cm',
    weight: '180g/m²',
    unit: '米',
    issueQty: 360,
    packageInfo: '18匹',
    dyeLotNo: 'DL-2025-0301',
    batchNo: 'BATCH-0325-A',
    unitPrice: 26.8,
    amount: 9648,
    supplierName: '兴盛纺织',
    supplierModel: 'XS-A2025',
    supplierColorNo: 'XS-白01',
    processorName: '杭州本厂',
    sourceOrderNo: 'FO-ET0110-002',
    dispatchOrderNo: 'MR-20250302-001',
    issueType: '领料出库',
    recipient: '黄立',
    issueDate: '2025-03-02 09:45',
    remark: '一期大货排产',
  },
  {
    id: 'issue-fabric-002',
    poNumber: 'PO-FAB-20250303-002',
    warehouseName: '苏州面料仓',
    materialName: '高弹锦纶经编网布',
    materialType: '面料',
    imageUrl: '/assets/images/materials/fabric-nylon.jpg',
    color: '黑色',
    width: '150cm',
    weight: '220g/m²',
    unit: '米',
    issueQty: 420,
    packageInfo: '21卷',
    dyeLotNo: 'DL-2025-0303',
    batchNo: 'BATCH-0401-B',
    unitPrice: 39.5,
    amount: 16590,
    supplierName: '锦绣面料行',
    supplierModel: 'JX-ET0362',
    supplierColorNo: 'JX-深黑',
    processorName: '苏州协作厂',
    sourceOrderNo: 'FO-ET0362-003',
    dispatchOrderNo: 'MR-20250304-003',
    issueType: '领料出库',
    recipient: '刘霞',
    issueDate: '2025-03-04 14:20',
    remark: '复尺校对后领料',
  },
  {
    id: 'issue-fabric-003',
    poNumber: 'PO-FAB-20250305-005',
    warehouseName: '杭州总仓',
    materialName: '全棉提花双面布',
    materialType: '面料',
    imageUrl: '/assets/images/materials/fabric-flannel.jpg',
    color: '咖色',
    width: '160cm',
    weight: '260g/m²',
    unit: '米',
    issueQty: 280,
    packageInfo: '14匹',
    dyeLotNo: 'DL-2025-0305',
    batchNo: 'BATCH-0501-C',
    unitPrice: 45.2,
    amount: 12656,
    supplierName: '兴盛纺织',
    supplierModel: 'XS-5031',
    supplierColorNo: 'XS-咖色条',
    processorName: '杭州本厂',
    sourceOrderNo: 'FO-ET5031-002',
    dispatchOrderNo: 'MR-20250306-002',
    issueType: '领料出库',
    recipient: '周凯',
    issueDate: '2025-03-06 10:05',
    remark: '裁床准备',
  },
];

const accessoryRecords: MaterialIssueRecord[] = [
  {
    id: 'issue-accessory-001',
    poNumber: 'PO-ACC-20250302-001',
    warehouseName: '广东辅料仓',
    materialName: 'YKK树脂拉链5#',
    materialType: '辅料',
    imageUrl: '/assets/images/materials/zipper.jpg',
    color: '黑色',
    unit: '条',
    issueQty: 1500,
    packageInfo: '150袋',
    batchNo: 'ACC-BATCH-0330-A',
    unitPrice: 2.2,
    amount: 3300,
    supplierName: '宏兴辅料',
    supplierModel: 'HX-ZIP-5#',
    supplierColorNo: 'HX-BK',
    processorName: '佛山加工厂',
    sourceOrderNo: 'FO-ET5033-004',
    dispatchOrderNo: 'MR-20250303-005',
    issueType: '领料出库',
    recipient: '陈可',
    issueDate: '2025-03-03 16:20',
    remark: '大货车缝一次发齐',
  },
  {
    id: 'issue-accessory-002',
    poNumber: 'PO-ACC-20250304-002',
    warehouseName: '杭州总仓',
    materialName: '120gsm珠光吊牌卡纸',
    materialType: '包材',
    imageUrl: '/assets/images/materials/packaging-box.jpg',
    color: '暖白',
    unit: '张',
    issueQty: 8000,
    packageInfo: '80箱',
    batchNo: 'ACC-BATCH-0402-B',
    unitPrice: 0.58,
    amount: 4640,
    supplierName: '博雅包装',
    supplierModel: 'BY-TAG-120',
    processorName: '杭州本厂',
    sourceOrderNo: 'FO-ET0151-006',
    dispatchOrderNo: 'MR-20250305-006',
    issueType: '领料出库',
    recipient: '赵琪',
    issueDate: '2025-03-05 11:18',
    remark: '成品包装领用',
  },
];

const datasetMap: Record<MaterialIssueType, MaterialIssueRecord[]> = {
  fabric: fabricRecords,
  accessory: accessoryRecords,
};

const summarize = (records: MaterialIssueRecord[]) =>
  records.reduce(
    (total, record) => {
      total.issueQtyTotal += record.issueQty;
      total.amountTotal += record.amount;
      return total;
    },
    { issueQtyTotal: 0, amountTotal: 0 },
  );

export const fetchMaterialIssueMeta = async (): Promise<MaterialIssueMeta> => {
  await delay(140);
  return { tabs };
};

export const fetchMaterialIssueList = async (
  params: MaterialIssueListParams,
): Promise<MaterialIssueListResponse> => {
  await delay(220);
  const source = datasetMap[params.materialType] ?? [];
  const keyword = params.keyword?.trim().toLowerCase();
  const filtered = keyword
    ? source.filter((record) => {
        const haystack = [
          record.materialName,
          record.materialType,
          record.sourceOrderNo,
          record.dispatchOrderNo,
          record.poNumber,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(keyword);
      })
    : source;

  const safePage = Math.max(1, params.page);
  const safeSize = Math.max(1, params.pageSize);
  const start = (safePage - 1) * safeSize;
  const list = filtered.slice(start, start + safeSize);
  return {
    list,
    total: filtered.length,
    summary: summarize(filtered),
  };
};
