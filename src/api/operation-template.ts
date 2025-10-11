import type {
  OperationTemplate,
  OperationTemplateDataset,
  OperationTemplateListParams,
  SaveOperationTemplatePayload,
  UpdateOperationTemplatePayload,
} from '../types';
import {
  createOperationTemplate,
  listOperationTemplates,
  removeOperationTemplate,
  updateOperationTemplate,
} from '../mock/operation-template';

export const operationTemplateApi = {
  list: (params: OperationTemplateListParams): Promise<OperationTemplateDataset> => listOperationTemplates(params),
  create: (payload: SaveOperationTemplatePayload): Promise<OperationTemplate> => createOperationTemplate(payload),
  update: (id: string, payload: UpdateOperationTemplatePayload): Promise<OperationTemplate | undefined> =>
    updateOperationTemplate(id, payload),
  remove: (id: string): Promise<boolean> => removeOperationTemplate(id),
};

export default operationTemplateApi;
