export const DEFAULT_CUTTING_TASK_SORT = 'placed-desc';

export const cuttingTaskSortOptions = [
  { label: '下单时间（新 → 旧）', value: DEFAULT_CUTTING_TASK_SORT },
  { label: '下单时间（旧 → 新）', value: 'placed-asc' },
  { label: '更新时间（新 → 旧）', value: 'updated-desc' },
  { label: '更新时间（旧 → 新）', value: 'updated-asc' },
] as const;

export type CuttingTaskSort = (typeof cuttingTaskSortOptions)[number]['value'];
