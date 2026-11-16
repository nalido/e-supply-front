import { forwardRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PropsWithChildren } from 'react';
import {
  DatePicker,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
} from 'antd';
import type {
  DatePickerProps,
  InputNumberProps,
  InputProps,
  SelectProps,
  SpaceProps,
  TableProps,
} from 'antd';
import type { RefSelectProps } from 'antd';
import type { HTMLAttributes, ReactNode } from 'react';
import {
  SELECTABLE_INPUT_TYPES,
  selectTableInputOnFocus,
  TABLE_SELECTOR,
} from './table-input-focus';
import './excel-table.css';

const ROW_SELECTOR = 'tr, [role="row"]';
const CELL_SELECTOR = [
  'td',
  'th',
  '[role="cell"]',
  '[role="gridcell"]',
  '[role="columnheader"]',
  '[role="rowheader"]',
].join(', ');
const CONTROL_SELECTOR = 'input, select';
const DISABLED_CONTAINER_SELECTOR = [
  '.ant-input-number-disabled',
  '.ant-select-disabled',
  '.ant-picker-disabled',
  '[aria-disabled="true"]',
  '[data-table-arrow-navigation="off"]',
].join(', ');
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

type TableControl = HTMLInputElement | HTMLSelectElement;
type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const mergeClassNames = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

const isInputNumber = (control: TableControl) => (
  control instanceof HTMLInputElement
  && Boolean(control.closest('.ant-input-number, .ant-input-number-affix-wrapper, .ant-input-number-group-wrapper'))
);

const isPickerOrSelect = (control: TableControl) => Boolean(control.closest('.ant-picker, .ant-select'));

const isVisible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && element.getClientRects().length > 0;
};

const hasOpenPopup = (control: TableControl) => {
  if (control.getAttribute('aria-expanded') === 'true' || control.closest('.ant-select-open')) {
    return true;
  }
  if (!control.closest('.ant-picker')) {
    return false;
  }
  return Array.from(document.querySelectorAll<HTMLElement>('.ant-picker-dropdown')).some(isVisible);
};

const isNavigableControl = (element: Element): element is TableControl => {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) {
    return false;
  }
  if (element.disabled || element.closest(DISABLED_CONTAINER_SELECTOR)) {
    return false;
  }
  if (element instanceof HTMLInputElement) {
    if (!SELECTABLE_INPUT_TYPES.has(element.type)) {
      return false;
    }
    if (element.readOnly && !isPickerOrSelect(element)) {
      return false;
    }
  }
  return isVisible(element);
};

const getNavigationTable = (control: TableControl, scope: HTMLElement) => {
  const table = control.closest<HTMLElement>(TABLE_SELECTOR);
  return table && scope.contains(table) ? table : null;
};

const getNavigationRow = (control: TableControl, table: HTMLElement) => {
  const row = control.closest<HTMLElement>(ROW_SELECTOR);
  return row?.closest(TABLE_SELECTOR) === table ? row : null;
};

const getRowCells = (row: HTMLElement): HTMLElement[] => {
  if (row instanceof HTMLTableRowElement) {
    return Array.from(row.cells);
  }
  return Array.from(row.children).filter((element): element is HTMLElement => element instanceof HTMLElement);
};

const getNavigationCell = (control: TableControl, row: HTMLElement) => {
  const semanticCell = control.closest<HTMLElement>(CELL_SELECTOR);
  if (semanticCell && semanticCell.closest(ROW_SELECTOR) === row) {
    return semanticCell;
  }
  let current: HTMLElement | null = control;
  while (current && current.parentElement !== row) {
    current = current.parentElement;
  }
  return current?.parentElement === row ? current : null;
};

const getTableRows = (table: HTMLElement) => {
  const rows = table instanceof HTMLTableElement
    ? Array.from(table.rows)
    : Array.from(table.querySelectorAll<HTMLElement>(ROW_SELECTOR));
  return rows.filter((row) => row.closest(TABLE_SELECTOR) === table);
};

const getCellColumnRange = (row: HTMLElement, targetCell: HTMLElement) => {
  let columnStart = 0;
  for (const cell of getRowCells(row)) {
    const span = cell instanceof HTMLTableCellElement ? Math.max(cell.colSpan, 1) : 1;
    if (cell === targetCell) {
      return { start: columnStart, end: columnStart + span - 1 };
    }
    columnStart += span;
  }
  return null;
};

const getCellAtColumn = (row: HTMLElement, column: number) => {
  let columnStart = 0;
  for (const cell of getRowCells(row)) {
    const span = cell instanceof HTMLTableCellElement ? Math.max(cell.colSpan, 1) : 1;
    if (column >= columnStart && column < columnStart + span) {
      return cell;
    }
    columnStart += span;
  }
  return null;
};

const getControls = (container: HTMLElement, table: HTMLElement, row?: HTMLElement) => (
  Array.from(container.querySelectorAll(CONTROL_SELECTOR))
    .filter(isNavigableControl)
    .filter((control) => control.closest(TABLE_SELECTOR) === table)
    .filter((control) => !row || control.closest(ROW_SELECTOR) === row)
);

const findHorizontalDestination = (
  control: TableControl,
  table: HTMLElement,
  row: HTMLElement,
  direction: -1 | 1,
) => {
  const controls = getControls(row, table, row);
  const index = controls.indexOf(control);
  return index < 0 ? null : controls[index + direction] ?? null;
};

const findVerticalDestination = (
  control: TableControl,
  table: HTMLElement,
  row: HTMLElement,
  cell: HTMLElement,
  direction: -1 | 1,
) => {
  const rows = getTableRows(table);
  const rowIndex = rows.indexOf(row);
  const columnRange = getCellColumnRange(row, cell);
  if (rowIndex < 0 || !columnRange) {
    return null;
  }

  const sourceCellControls = getControls(cell, table, row);
  const sourceControlIndex = Math.max(sourceCellControls.indexOf(control), 0);
  for (let index = rowIndex + direction; index >= 0 && index < rows.length; index += direction) {
    const targetRow = rows[index];
    const targetCell = getCellAtColumn(targetRow, columnRange.start);
    if (!targetCell) {
      continue;
    }
    const targetControls = getControls(targetCell, table, targetRow);
    if (targetControls.length) {
      return targetControls[Math.min(sourceControlIndex, targetControls.length - 1)];
    }
  }
  return null;
};

const shouldNavigateHorizontally = (control: TableControl, key: 'ArrowLeft' | 'ArrowRight') => {
  if (control instanceof HTMLSelectElement || isInputNumber(control) || isPickerOrSelect(control)) {
    return true;
  }
  if (!(control instanceof HTMLInputElement)) {
    return false;
  }
  const { selectionStart, selectionEnd, value } = control;
  if (selectionStart === null || selectionEnd === null) {
    return true;
  }
  const allSelected = value.length > 0 && selectionStart === 0 && selectionEnd === value.length;
  if (allSelected) {
    return true;
  }
  if (selectionStart !== selectionEnd) {
    return false;
  }
  return key === 'ArrowLeft' ? selectionStart === 0 : selectionEnd === value.length;
};

const shouldConsumeWithoutDestination = (control: TableControl, key: ArrowKey) => (
  (key === 'ArrowUp' || key === 'ArrowDown')
  && (isInputNumber(control) || (control instanceof HTMLInputElement && control.type === 'number'))
);

const focusControl = (control: TableControl) => {
  control.focus();
  control.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

const handleKeyDownCapture = (event: ReactKeyboardEvent<HTMLElement>) => {
  if (!ARROW_KEYS.has(event.key) || event.nativeEvent.isComposing) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Element) || !isNavigableControl(target)) {
    return;
  }
  const key = event.key as ArrowKey;
  const inputNumber = isInputNumber(target);
  if (!inputNumber && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) {
    return;
  }
  if (hasOpenPopup(target)) {
    return;
  }

  const scope = event.currentTarget;
  const table = getNavigationTable(target, scope);
  if (!table || table.matches('[data-table-arrow-navigation="off"]')) {
    return;
  }
  const row = getNavigationRow(target, table);
  const cell = row ? getNavigationCell(target, row) : null;
  if (!row || !cell) {
    return;
  }

  let destination: TableControl | null = null;
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    if (!shouldNavigateHorizontally(target, key)) {
      return;
    }
    destination = findHorizontalDestination(target, table, row, key === 'ArrowLeft' ? -1 : 1);
  } else {
    destination = findVerticalDestination(target, table, row, cell, key === 'ArrowUp' ? -1 : 1);
  }
  if (!destination && !shouldConsumeWithoutDestination(target, key)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (destination) {
    focusControl(destination);
  }
};

export interface ExcelGridProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  arrowNavigation?: boolean;
}

export function ExcelGrid({ arrowNavigation = true, children, className, ...props }: ExcelGridProps) {
  return (
    <div
      {...props}
      className={mergeClassNames('oc-excel-interaction-scope', className)}
      data-table-arrow-navigation={arrowNavigation ? undefined : 'off'}
      onFocusCapture={selectTableInputOnFocus}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {children}
    </div>
  );
}

export interface ExcelTableProps<RecordType = object> extends TableProps<RecordType> {
  arrowNavigation?: boolean;
  scopeClassName?: string;
}

export function ExcelTable<RecordType = object>({
  arrowNavigation = true,
  className,
  pagination = false,
  scopeClassName,
  size = 'small',
  ...props
}: ExcelTableProps<RecordType>) {
  return (
    <ExcelGrid arrowNavigation={arrowNavigation} className={scopeClassName}>
      <Table<RecordType>
        {...props}
        className={mergeClassNames('oc-excel-entry-table', className)}
        pagination={pagination}
        size={size}
      />
    </ExcelGrid>
  );
}

export function ExcelTextInput({ className, ...props }: InputProps) {
  return <Input {...props} className={mergeClassNames('oc-excel-cell-text-input', className)} />;
}

export function ExcelNumberInput({ className, ...props }: InputNumberProps<number>) {
  return <InputNumber {...props} className={mergeClassNames('oc-excel-cell-input', className)} />;
}

export const ExcelSelect = forwardRef<RefSelectProps, SelectProps>(function ExcelSelect(
  { className, ...props },
  ref,
) {
  return <Select {...props} ref={ref} className={mergeClassNames('oc-excel-cell-select', className)} />;
});

export function ExcelDatePicker({ className, ...props }: DatePickerProps) {
  return <DatePicker {...props} className={mergeClassNames('oc-excel-cell-picker', className)} />;
}

export function ExcelReadonlyCell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={mergeClassNames('oc-excel-cell-readonly', className)} />;
}

export function ExcelPlaceholderCell({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={mergeClassNames('oc-excel-cell-placeholder', className)} />;
}

export function ExcelNoteCell({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={mergeClassNames('oc-excel-cell-note', className)} />;
}

export function ExcelCellStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={mergeClassNames('oc-excel-cell-stack', className)} />;
}

export function ExcelImageCell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={mergeClassNames('oc-excel-image-cell', className)} />;
}

export function ExcelPriceCell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={mergeClassNames('oc-excel-price-cell', className)} />;
}

export function ExcelRowActions({ className, ...props }: SpaceProps) {
  return <Space {...props} className={mergeClassNames('oc-excel-row-actions', className)} />;
}

export function ExcelTableFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={mergeClassNames('oc-excel-table-footer', className)} />;
}

export function ExcelCellError({ children }: { children: ReactNode }) {
  return <span className="oc-excel-cell-error">{children}</span>;
}
