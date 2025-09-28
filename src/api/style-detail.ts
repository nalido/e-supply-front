import type { StyleDraft } from '../types/style';
import { getOperationTemplates, getStyleDraft, getStyleFormMeta, saveStyleDraft } from '../mock/style-detail';

export const styleDetailApi = {
  fetchMeta: () => getStyleFormMeta(),
  fetchDraft: (styleId?: string) => getStyleDraft(styleId),
  fetchOperationTemplates: () => getOperationTemplates(),
  save: (payload: StyleDraft) => saveStyleDraft(payload),
};

export default styleDetailApi;
