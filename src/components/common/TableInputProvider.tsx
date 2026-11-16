import type { FocusEvent as ReactFocusEvent, PropsWithChildren } from 'react';
import { selectTableInputOnFocus, TABLE_SELECTOR } from './table-input-focus';

export function TableInputProvider({ children }: PropsWithChildren) {
  const handleLegacyFocusCapture = (event: ReactFocusEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)
      || !target.closest(TABLE_SELECTOR)
      || target.closest('.oc-excel-interaction-scope')) {
      return;
    }
    selectTableInputOnFocus(event);
  };

  return (
    <div
      className="oc-table-input-provider"
      style={{ display: 'contents' }}
      onFocusCapture={handleLegacyFocusCapture}
    >
      {children}
    </div>
  );
}
