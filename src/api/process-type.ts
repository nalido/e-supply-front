import type {
  CreateProcessTypePayload,
  ProcessType,
  ProcessTypeDataset,
  ProcessTypeStatus,
  UpdateProcessTypePayload,
} from '../types';
import {
  batchRemoveProcessTypes,
  batchSetProcessTypeStatus,
  createProcessType,
  exportProcessTypes,
  importProcessTypes,
  listProcessTypes,
  removeProcessType,
  setProcessTypeStatus,
  updateProcessType,
} from '../mock/process-type';

export const processTypeApi = {
  list: (): Promise<ProcessTypeDataset> => listProcessTypes(),
  create: (payload: CreateProcessTypePayload): Promise<ProcessType> => createProcessType(payload),
  update: (id: string, payload: UpdateProcessTypePayload): Promise<ProcessType | undefined> => updateProcessType(id, payload),
  toggleStatus: (id: string, status: ProcessTypeStatus): Promise<ProcessType | undefined> => setProcessTypeStatus(id, status),
  remove: (id: string): Promise<boolean> => removeProcessType(id),
  batchRemove: (ids: string[]): Promise<number> => batchRemoveProcessTypes(ids),
  batchToggleStatus: (ids: string[], status: ProcessTypeStatus): Promise<number> => batchSetProcessTypeStatus(ids, status),
  import: (payload: CreateProcessTypePayload[]): Promise<number> => importProcessTypes(payload),
  export: (filters?: { onlyActive?: boolean }): Promise<Blob> => exportProcessTypes(filters),
};

export default processTypeApi;
