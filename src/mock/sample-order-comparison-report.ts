import type {
  SampleOrderAggregation,
  SampleOrderComparisonItem,
  SampleOrderComparisonParams,
  SampleOrderComparisonResponse,
} from '../types/sample-order-comparison-report';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const aggregation: SampleOrderAggregation = {
  trend: {
    labels: ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05'],
    sampleQuantity: [96, 104, 112, 124, 136, 148],
    styleCount: [28, 30, 32, 35, 38, 41],
  },
  proportion: {
    total: 1220,
    roles: [
      { name: '纸样师', value: 780 },
      { name: '车板师', value: 440 },
    ],
  },
};

const records: SampleOrderComparisonItem[] = [
  {
    id: 'sample-compare-001',
    imageUrl: '/assets/images/styles/ET0110.jpg',
    styleNumber: 'ET0110',
    styleName: '儿童羊羔毛拉链夹克套装',
    sampledTimes: 2,
    sampledQuantity: 3,
    orderedTimes: 2,
    orderedQuantity: 520,
  },
  {
    id: 'sample-compare-002',
    imageUrl: '/assets/images/styles/ET0151.jpg',
    styleNumber: 'ET0151',
    styleName: '儿童拉链连帽拼色套装',
    sampledTimes: 3,
    sampledQuantity: 4,
    orderedTimes: 2,
    orderedQuantity: 420,
  },
  {
    id: 'sample-compare-003',
    imageUrl: '/assets/images/styles/ET0152.jpg',
    styleNumber: 'ET0152',
    styleName: '儿童拼色棒球服套装',
    sampledTimes: 1,
    sampledQuantity: 2,
    orderedTimes: 1,
    orderedQuantity: 260,
  },
  {
    id: 'sample-compare-004',
    imageUrl: '/assets/images/styles/ET0168.jpg',
    styleNumber: 'ET0168',
    styleName: '儿童条纹工装卫裤',
    sampledTimes: 2,
    sampledQuantity: 3,
    orderedTimes: 2,
    orderedQuantity: 360,
  },
  {
    id: 'sample-compare-005',
    imageUrl: '/assets/images/styles/ET0193.jpg',
    styleNumber: 'ET0193',
    styleName: '儿童书包卫衣',
    sampledTimes: 2,
    sampledQuantity: 2,
    orderedTimes: 1,
    orderedQuantity: 200,
  },
  {
    id: 'sample-compare-006',
    imageUrl: '/assets/images/styles/ET0362.jpg',
    styleNumber: 'ET0362',
    styleName: '儿童黑色波浪拉链速干短裤',
    sampledTimes: 1,
    sampledQuantity: 2,
    orderedTimes: 0,
    orderedQuantity: 0,
  },
  {
    id: 'sample-compare-007',
    imageUrl: '/assets/images/styles/ET5025.jpg',
    styleNumber: 'ET5025',
    styleName: '儿童斜拼拉链套装',
    sampledTimes: 3,
    sampledQuantity: 5,
    orderedTimes: 3,
    orderedQuantity: 680,
  },
  {
    id: 'sample-compare-008',
    imageUrl: '/assets/images/styles/ET5031.jpg',
    styleNumber: 'ET5031',
    styleName: '儿童立领防风外套',
    sampledTimes: 2,
    sampledQuantity: 3,
    orderedTimes: 2,
    orderedQuantity: 410,
  },
];

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

const sortRecords = (
  data: SampleOrderComparisonItem[],
  sortBy?: SampleOrderComparisonParams['sortBy'],
  order: SampleOrderComparisonParams['order'] = 'desc',
) => {
  if (!sortBy) {
    return [...data];
  }
  const sorted = [...data].sort((a, b) => {
    const lhs = a[sortBy];
    const rhs = b[sortBy];
    if (lhs === rhs) {
      return 0;
    }
    return lhs > rhs ? 1 : -1;
  });
  return order === 'asc' ? sorted : sorted.reverse();
};

export const fetchSampleOrderAggregation = async (): Promise<SampleOrderAggregation> => {
  await delay(240);
  return aggregation;
};

export const fetchSampleOrderComparisonList = async (
  params: SampleOrderComparisonParams,
): Promise<SampleOrderComparisonResponse> => {
  await delay(360);
  const keyword = normalize(params.styleName);
  const filtered = records.filter((item) =>
    keyword ? item.styleName.toLowerCase().includes(keyword) : true,
  );
  const sorted = sortRecords(filtered, params.sortBy, params.order);
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  return {
    list: sorted.slice(start, end),
    total: filtered.length,
  };
};

export const exportSampleOrderComparison = async (
  _params: SampleOrderComparisonParams,
): Promise<{ fileUrl: string }> => {
  await delay(200);
  void _params;
  return { fileUrl: '/mock/exports/sample-order-comparison.xlsx' };
};
