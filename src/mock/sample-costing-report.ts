import type {
  SampleCostAggregation,
  SampleCostCard,
  SampleCostListParams,
  SampleCostListResponse,
} from '../types/sample-costing-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const aggregation: SampleCostAggregation = {
  trend: {
    labels: ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05'],
    developmentCost: [4200, 4680, 5120, 4980, 5300, 5580],
    sampleCost: [16800, 17560, 18240, 19120, 20280, 21440],
  },
  typeComparison: {
    total: 156,
    types: [
      { name: '头样', value: 78 },
      { name: '复样', value: 52 },
      { name: '产前样', value: 18 },
      { name: '对色样', value: 8 },
    ],
  },
};

const cards: SampleCostCard[] = [
  {
    id: 'sample-cost-001',
    imageUrl: '/assets/images/styles/ET0110.jpg',
    styleNumber: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    sampleOrderNo: '202505180001',
    quantity: 1,
    developmentCost: 320,
    completionDate: '2025-05-18',
    unitCost: 612,
    costBreakdown: [
      { item: '面料', cost: 220 },
      { item: '辅料', cost: 42 },
      { item: '包材', cost: 18 },
      { item: '加工', cost: 272 },
      { item: '裁剪', cost: 60 },
    ],
  },
  {
    id: 'sample-cost-002',
    imageUrl: '/assets/images/styles/ET0362.jpg',
    styleNumber: 'ET0362',
    styleName: '儿童黑色波浪拉链速干短裤',
    sampleOrderNo: '202505120004',
    quantity: 2,
    developmentCost: 260,
    completionDate: '2025-05-12',
    unitCost: 336,
    costBreakdown: [
      { item: '面料', cost: 140 },
      { item: '辅料', cost: 26 },
      { item: '加工', cost: 140 },
      { item: '裁剪', cost: 30 },
    ],
  },
  {
    id: 'sample-cost-003',
    imageUrl: '/assets/images/styles/ET0193.jpg',
    styleNumber: 'ET0193',
    styleName: '儿童书包卫衣',
    sampleOrderNo: '202504300007',
    quantity: 1,
    developmentCost: 310,
    completionDate: '2025-04-30',
    unitCost: 562,
    costBreakdown: [
      { item: '面料', cost: 210 },
      { item: '辅料', cost: 32 },
      { item: '包材', cost: 14 },
      { item: '加工', cost: 242 },
      { item: '裁剪', cost: 64 },
    ],
  },
  {
    id: 'sample-cost-004',
    imageUrl: '/assets/images/styles/ET0151.jpg',
    styleNumber: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    sampleOrderNo: '202504220003',
    quantity: 3,
    developmentCost: 510,
    completionDate: '2025-04-22',
    unitCost: 428,
    costBreakdown: [
      { item: '面料', cost: 180 },
      { item: '辅料', cost: 38 },
      { item: '包材', cost: 20 },
      { item: '加工', cost: 160 },
      { item: '裁剪', cost: 30 },
    ],
  },
  {
    id: 'sample-cost-005',
    imageUrl: '/assets/images/styles/ET0152.jpg',
    styleNumber: 'ET0152',
    styleName: '儿童拼色棒球服套装',
    sampleOrderNo: '202503150002',
    quantity: 2,
    developmentCost: 468,
    completionDate: '2025-03-15',
    unitCost: 512,
    costBreakdown: [
      { item: '面料', cost: 200 },
      { item: '辅料', cost: 44 },
      { item: '加工', cost: 200 },
      { item: '裁剪', cost: 40 },
      { item: '包材', cost: 28 },
    ],
  },
  {
    id: 'sample-cost-006',
    imageUrl: '/assets/images/styles/ET0168.jpg',
    styleNumber: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    sampleOrderNo: '202503020001',
    quantity: 1,
    developmentCost: 285,
    completionDate: '2025-03-02',
    unitCost: 376,
    costBreakdown: [
      { item: '面料', cost: 160 },
      { item: '辅料', cost: 26 },
      { item: '加工', cost: 150 },
      { item: '裁剪', cost: 40 },
    ],
  },
];

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

const matches = (card: SampleCostCard, params: SampleCostListParams): boolean => {
  if (params.keyword) {
    const keyword = normalize(params.keyword);
    const fields = [card.styleNumber, card.styleName, card.sampleOrderNo];
    if (!fields.some((field) => field.toLowerCase().includes(keyword))) {
      return false;
    }
  }
  if (params.startDate) {
    if (Date.parse(card.completionDate) < Date.parse(params.startDate)) {
      return false;
    }
  }
  if (params.endDate) {
    if (Date.parse(card.completionDate) > Date.parse(params.endDate)) {
      return false;
    }
  }
  return true;
};

export const fetchSampleCostAggregation = async (): Promise<SampleCostAggregation> => {
  await delay(220);
  return aggregation;
};

export const fetchSampleCostList = async (
  params: SampleCostListParams,
): Promise<SampleCostListResponse> => {
  await delay(340);
  const filtered = cards.filter((card) => matches(card, params));
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  return {
    list: filtered.slice(start, end),
    total: filtered.length,
  };
};

export const exportSampleCostList = async (
  _params: SampleCostListParams,
): Promise<{ fileUrl: string }> => {
  await delay(200);
  void _params;
  return { fileUrl: '/mock/exports/sample-costing-report.xlsx' };
};
