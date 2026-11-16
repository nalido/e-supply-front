import type { FocusEvent as ReactFocusEvent } from 'react';

export const TABLE_SELECTOR = 'table, [role="table"], [role="grid"]';

export const SELECTABLE_INPUT_TYPES = new Set([
  '',
  'email',
  'number',
  'search',
  'tel',
  'text',
  'url',
]);

export const selectTableInputOnFocus = (event: ReactFocusEvent<HTMLElement>) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.disabled || target.readOnly || !SELECTABLE_INPUT_TYPES.has(target.type)) {
    return;
  }
  window.requestAnimationFrame(() => {
    if (document.activeElement === target) {
      target.select();
    }
  });
};
