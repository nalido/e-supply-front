import { useEffect } from 'react';

const SELECTABLE_INPUT_TYPES = new Set([
  '',
  'email',
  'number',
  'search',
  'tel',
  'text',
  'url',
]);

export const useAutoSelectTableInput = () => {
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.disabled || target.readOnly || !SELECTABLE_INPUT_TYPES.has(target.type)) {
        return;
      }
      if (!target.closest('.ant-table, table')) {
        return;
      }
      window.requestAnimationFrame(() => {
        target.select();
      });
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);
};
