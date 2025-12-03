import type { SampleOrder, SampleStatus } from '../types/sample';

const STATUS_LABEL_MAP: Record<SampleStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  producing: '生产中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLOR_MAP: Record<SampleStatus, string> = {
  pending: '#faad14',
  confirmed: '#1890ff',
  producing: '#722ed1',
  completed: '#52c41a',
  cancelled: '#f5222d',
};

const PRIORITY_LABEL_MAP: Record<SampleOrder['priority'], string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const PRIORITY_COLOR_MAP: Record<SampleOrder['priority'], string> = {
  low: '#52c41a',
  medium: '#1890ff',
  high: '#faad14',
  urgent: '#f5222d',
};

export const getSampleStatusLabel = (status: SampleStatus): string => STATUS_LABEL_MAP[status] ?? status;

export const getSampleStatusColor = (status: SampleStatus): string => STATUS_COLOR_MAP[status] ?? '#d9d9d9';

export const getSamplePriorityLabel = (priority: SampleOrder['priority']): string =>
  PRIORITY_LABEL_MAP[priority] ?? priority;

export const getSamplePriorityColor = (priority: SampleOrder['priority']): string =>
  PRIORITY_COLOR_MAP[priority] ?? '#d9d9d9';
