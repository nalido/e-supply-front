import type {
  QualityControlExportParams,
  QualityControlListParams,
  QualityControlListResponse,
  QualityControlMeta,
  QualityControlRecord,
  QualityInspectionStatus,
} from '../types/quality-control-management';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dataset: Array<QualityControlRecord & { status: QualityInspectionStatus }> = [
  {
    id: 'qc-20240506-001',
    qcDate: '2024-05-06',
    orderNumber: 'ET0107-202405',
    styleNumber: 'ET0107',
    styleName: '儿童三层棉衣',
    processName: '车缝',
    ticketNo: 'FP20240506003',
    worker: '吴小妹',
    inspectedQty: 120,
    passedQty: 114,
    failedQty: 6,
    defectReason: '走线不齐/线头',
    disposition: 'rework',
    inspector: '林珊',
    status: 'rework',
  },
  {
    id: 'qc-20240506-002',
    qcDate: '2024-05-06',
    orderNumber: 'ET0107-202405',
    styleNumber: 'ET0107',
    styleName: '儿童三层棉衣',
    processName: '锁眼',
    ticketNo: 'FP20240506003',
    worker: '陈建',
    inspectedQty: 120,
    passedQty: 120,
    failedQty: 0,
    disposition: 'accepted',
    inspector: '王婷',
    status: 'passed',
  },
  {
    id: 'qc-20240505-005',
    qcDate: '2024-05-05',
    orderNumber: 'ET5025-202404',
    styleNumber: 'ET5025',
    styleName: '儿童斜拼拉链套装',
    processName: '车缝',
    ticketNo: 'FP20240428022',
    worker: '苏丽娜',
    inspectedQty: 110,
    passedQty: 108,
    failedQty: 2,
    defectReason: '跳线',
    disposition: 'rework',
    inspector: '林珊',
    status: 'rework',
  },
  {
    id: 'qc-20240505-006',
    qcDate: '2024-05-05',
    orderNumber: 'ET5025-202404',
    styleNumber: 'ET5025',
    styleName: '儿童斜拼拉链套装',
    processName: '整烫',
    ticketNo: 'FP20240428024',
    worker: '黄敏',
    inspectedQty: 100,
    passedQty: 100,
    failedQty: 0,
    disposition: 'accepted',
    inspector: '郭诚',
    status: 'passed',
  },
  {
    id: 'qc-20240504-003',
    qcDate: '2024-05-04',
    orderNumber: 'ET0297-202405',
    styleNumber: 'ET0297',
    styleName: '男童拼接休闲短袖套装',
    processName: '印花',
    ticketNo: 'FP20240504012',
    worker: '黎强',
    inspectedQty: 90,
    passedQty: 86,
    failedQty: 4,
    defectReason: '图案移位',
    disposition: 'scrap',
    inspector: '郭诚',
    status: 'failed',
  },
  {
    id: 'qc-20240504-004',
    qcDate: '2024-05-04',
    orderNumber: 'ET0297-202405',
    styleNumber: 'ET0297',
    styleName: '男童拼接休闲短袖套装',
    processName: '车缝',
    ticketNo: 'FP20240504014',
    worker: '李琴',
    inspectedQty: 90,
    passedQty: 90,
    failedQty: 0,
    disposition: 'accepted',
    inspector: '王婷',
    status: 'passed',
  },
  {
    id: 'qc-20240503-011',
    qcDate: '2024-05-03',
    orderNumber: 'ET5031-202404',
    styleNumber: 'ET5031',
    styleName: '儿童立领防风外套',
    processName: '车缝',
    ticketNo: 'FP20240430008',
    worker: '张丽',
    inspectedQty: 150,
    passedQty: 147,
    failedQty: 3,
    defectReason: '肩缝变形',
    disposition: 'rework',
    inspector: '王婷',
    status: 'rework',
  },
  {
    id: 'qc-20240503-012',
    qcDate: '2024-05-03',
    orderNumber: 'ET5031-202404',
    styleNumber: 'ET5031',
    styleName: '儿童立领防风外套',
    processName: '整烫',
    ticketNo: 'FP20240430008',
    worker: '杨春',
    inspectedQty: 150,
    passedQty: 150,
    failedQty: 0,
    disposition: 'accepted',
    inspector: '郭诚',
    status: 'passed',
  },
  {
    id: 'qc-20240502-015',
    qcDate: '2024-05-02',
    orderNumber: 'ET1120-202404',
    styleNumber: 'ET1120',
    styleName: '商务弹力衬衫',
    processName: '锁眼',
    ticketNo: 'FP20240422003',
    worker: '陈建',
    inspectedQty: 180,
    passedQty: 175,
    failedQty: 5,
    defectReason: '锁眼偏位',
    disposition: 'rework',
    inspector: '林珊',
    status: 'rework',
  },
  {
    id: 'qc-20240502-016',
    qcDate: '2024-05-02',
    orderNumber: 'ET1120-202404',
    styleNumber: 'ET1120',
    styleName: '商务弹力衬衫',
    processName: '质检',
    ticketNo: 'FP20240422005',
    worker: '谢青',
    inspectedQty: 180,
    passedQty: 178,
    failedQty: 2,
    defectReason: '吊牌缺失',
    disposition: 'rework',
    inspector: '王婷',
    status: 'rework',
  },
  {
    id: 'qc-20240501-021',
    qcDate: '2024-05-01',
    orderNumber: 'ET3051-202404',
    styleNumber: 'ET3051',
    styleName: '儿童绣花卫衣',
    processName: '整烫',
    ticketNo: 'FP20240414007',
    worker: '朱俊',
    inspectedQty: 150,
    passedQty: 150,
    failedQty: 0,
    disposition: 'accepted',
    inspector: '郭诚',
    status: 'passed',
  },
  {
    id: 'qc-20240501-022',
    qcDate: '2024-05-01',
    orderNumber: 'ET3051-202404',
    styleNumber: 'ET3051',
    styleName: '儿童绣花卫衣',
    processName: '车缝',
    ticketNo: 'FP20240414006',
    worker: '刘艳',
    inspectedQty: 150,
    passedQty: 148,
    failedQty: 2,
    defectReason: '压线不齐',
    disposition: 'rework',
    inspector: '林珊',
    status: 'rework',
  },
];

const meta: QualityControlMeta = {
  statusOptions: [
    { label: '全部状态', value: 'all' },
    { label: '合格', value: 'passed' },
    { label: '不合格', value: 'failed' },
    { label: '返工', value: 'rework' },
  ],
  inspectorOptions: [
    { label: '全部质检员', value: '' },
    { label: '林珊', value: '林珊' },
    { label: '王婷', value: '王婷' },
    { label: '郭诚', value: '郭诚' },
  ],
  defaultStatus: 'all',
};

const normalizeKeyword = (value?: string): string => (value ? value.trim().toLowerCase() : '');

const withinDateRange = (value: string, start?: string, end?: string): boolean => {
  if (!start && !end) {
    return true;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  if (start && timestamp < Date.parse(start)) {
    return false;
  }
  if (end && timestamp > Date.parse(end)) {
    return false;
  }
  return true;
};

const matchesKeyword = (record: QualityControlRecord, keyword: string): boolean => {
  if (!keyword) {
    return true;
  }
  return [
    record.orderNumber,
    record.styleNumber,
    record.styleName,
    record.ticketNo,
    record.processName,
    record.worker,
    record.defectReason,
  ]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(keyword));
};

const summarise = (records: Array<QualityControlRecord & { status: QualityInspectionStatus }>) =>
  records.reduce(
    (
      acc,
      record,
    ) => {
      acc.inspectedQty += record.inspectedQty;
      acc.passedQty += record.passedQty;
      acc.failedQty += record.failedQty;
      if (record.status === 'rework') {
        acc.reworkQty += record.failedQty;
      }
      return acc;
    },
    {
      inspectedQty: 0,
      passedQty: 0,
      failedQty: 0,
      reworkQty: 0,
    },
  );

export const fetchQualityControlMeta = async (): Promise<QualityControlMeta> => {
  await delay(180);
  return meta;
};

export const fetchQualityControlList = async (
  params: QualityControlListParams,
): Promise<QualityControlListResponse> => {
  await delay(320);
  const keyword = normalizeKeyword(params.keyword);

  const filtered = dataset.filter((record) => {
    if (!withinDateRange(record.qcDate, params.startDate, params.endDate)) {
      return false;
    }
    if (params.status && params.status !== 'all' && record.status !== params.status) {
      return false;
    }
    if (params.inspector && record.inspector !== params.inspector) {
      return false;
    }
    if (!matchesKeyword(record, keyword)) {
      return false;
    }
    return true;
  });

  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const list = filtered.slice(start, end).map((record) => {
    const { status: statusToOmit, ...rest } = record;
    void statusToOmit;
    return rest;
  });

  return {
    list,
    total: filtered.length,
    summary: summarise(filtered),
  };
};

export const exportQualityControlRecords = async (
  _params: QualityControlExportParams,
): Promise<{ fileUrl: string }> => {
  await delay(240);
  void _params;
  return { fileUrl: '/mock/exports/quality-control-records.xlsx' };
};
