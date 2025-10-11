import type {
  Partner,
  PartnerDataset,
  PartnerListParams,
  SavePartnerPayload,
  UpdatePartnerPayload,
} from '../types';
import {
  createPartner,
  invitePartner,
  listPartners,
  removePartner,
  togglePartnerDisabled,
  updatePartner,
} from '../mock/partners';

export const partnersApi = {
  list: (params: PartnerListParams): Promise<PartnerDataset> => listPartners(params),
  create: (payload: SavePartnerPayload): Promise<Partner> => createPartner(payload),
  update: (id: string, payload: UpdatePartnerPayload): Promise<Partner | undefined> => updatePartner(id, payload),
  remove: (id: string): Promise<boolean> => removePartner(id),
  invite: (id: string): Promise<Partner | undefined> => invitePartner(id),
  toggleDisabled: (id: string, disabled: boolean): Promise<Partner | undefined> => togglePartnerDisabled(id, disabled),
};

export default partnersApi;
