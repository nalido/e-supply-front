export const PREFERENCE_UPDATED_EVENT = 'esupply:preference-updated';

export type PreferenceUpdatedDetail = {
  key: string;
  value: boolean | string;
};

export const emitPreferenceUpdated = (detail: PreferenceUpdatedDetail) => {
  window.dispatchEvent(new CustomEvent<PreferenceUpdatedDetail>(PREFERENCE_UPDATED_EVENT, { detail }));
};

