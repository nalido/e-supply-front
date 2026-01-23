import type {
  SequentialProcessListParams,
  SequentialProcessListResponse,
  SequentialProcessRecord,
  SequentialProcessStageStatus,
} from '../types/sequential-process-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sequentialDataset: SequentialProcessRecord[] = [
  {
    id: 'seq-order-001',
    orderNumber: 'ET0032-202405',
    styleNumber: 'ET0032',
    styleName: '速干跑步T恤',
    customer: '云动体育',
    plannedQuantity: 3200,
    totalQuantity: 3180,
    progressStatus: 'completed',
    firstRecordedAt: '2024-05-18 08:20',
    lastRecordedAt: '2024-05-25 17:42',
    stages: [
      {
        sequence: 1,
        processId: 'cutting',
        processName: '裁剪',
        quantity: 3200,
        ticketCount: 8,
        workerCount: 4,
        progressPercent: 100,
        status: 'completed',
        firstRecordedAt: '2024-05-18 08:20',
      },
      {
        sequence: 2,
        processId: 'sewing',
        processName: '车缝',
        quantity: 3180,
        ticketCount: 22,
        workerCount: 12,
        progressPercent: 99,
        status: 'completed',
        firstRecordedAt: '2024-05-19 09:10',
      },
      {
        sequence: 3,
        processId: 'finishing',
        processName: '整烫后整',
        quantity: 3180,
        ticketCount: 10,
        workerCount: 6,
        progressPercent: 99,
        status: 'completed',
        firstRecordedAt: '2024-05-23 11:35',
      },
    ],
  },
  {
    id: 'seq-order-002',
    orderNumber: 'ET1120-202404',
    styleNumber: 'ET1120',
    styleName: '商务弹力衬衫',
    customer: '恒杉贸易',
    plannedQuantity: 1800,
    totalQuantity: 1260,
    progressStatus: 'inProgress',
    firstRecordedAt: '2024-04-25 07:50',
    lastRecordedAt: '2024-04-28 15:26',
    stages: [
      {
        sequence: 1,
        processId: 'cutting',
        processName: '裁剪',
        quantity: 1800,
        ticketCount: 5,
        workerCount: 3,
        progressPercent: 100,
        status: 'completed',
        firstRecordedAt: '2024-04-25 07:50',
      },
      {
        sequence: 2,
        processId: 'sewing',
        processName: '车缝',
        quantity: 1260,
        ticketCount: 14,
        workerCount: 9,
        progressPercent: 70,
        status: 'inProgress',
        firstRecordedAt: '2024-04-26 09:05',
      },
    ],
  },
  {
    id: 'seq-order-003',
    orderNumber: 'PT605-202405',
    styleNumber: 'PT605',
    styleName: '都市骑行短裤',
    customer: '摩动运动',
    plannedQuantity: 640,
    totalQuantity: 320,
    progressStatus: 'inProgress',
    firstRecordedAt: '2024-05-02 08:40',
    lastRecordedAt: '2024-05-04 14:22',
    stages: [
      {
        sequence: 1,
        processId: 'cutting',
        processName: '裁剪',
        quantity: 640,
        ticketCount: 4,
        workerCount: 2,
        progressPercent: 100,
        status: 'completed',
        firstRecordedAt: '2024-05-02 08:40',
      },
      {
        sequence: 2,
        processId: 'sewing',
        processName: '车缝',
        quantity: 320,
        ticketCount: 6,
        workerCount: 5,
        progressPercent: 50,
        status: 'inProgress',
        firstRecordedAt: '2024-05-03 10:12',
      },
    ],
  },
];

const filterDataset = (
  keyword?: string,
  status?: SequentialProcessStageStatus,
): SequentialProcessRecord[] => {
  if (!keyword) {
    return filterByStatus(sequentialDataset, status);
  }
  const token = keyword.toLowerCase();
  return filterByStatus(
    sequentialDataset.filter(
      (item) =>
        item.orderNumber.toLowerCase().includes(token)
        || item.styleNumber.toLowerCase().includes(token)
        || item.styleName.toLowerCase().includes(token),
    ),
    status,
  );
};

const filterByStatus = (
  records: SequentialProcessRecord[],
  status?: SequentialProcessStageStatus,
) => {
  if (!status) {
    return records;
  }
  return records.filter((item) => item.progressStatus === status);
};

export const orderSequentialProcessReportService = {
  async getList(
    params: SequentialProcessListParams,
  ): Promise<SequentialProcessListResponse> {
    await delay(240);
    const filtered = filterDataset(params.keyword?.trim(), params.status);
    const start = (params.page - 1) * params.pageSize;
    const end = start + params.pageSize;
    return {
      list: filtered.slice(start, end),
      total: filtered.length,
    };
  },
};
