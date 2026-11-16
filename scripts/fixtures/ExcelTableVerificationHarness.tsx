import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
import {
  ExcelDatePicker,
  ExcelNumberInput,
  ExcelReadonlyCell,
  ExcelSelect,
  ExcelTable,
  ExcelTextInput,
} from '../../src/components/common/ExcelTable';
import type { ColumnsType } from 'antd/es/table';

type VerificationRow = {
  key: string;
  index: number;
  disabled: boolean;
};

const rows: VerificationRow[] = Array.from({ length: 8 }, (_, index) => ({
  key: `row-${index + 1}`,
  index: index + 1,
  disabled: index === 1,
}));

const columns: ColumnsType<VerificationRow> = [
  {
    title: '只读',
    width: 120,
    render: (_, row) => <ExcelReadonlyCell>第 {row.index} 行</ExcelReadonlyCell>,
  },
  {
    title: '文本',
    width: 180,
    render: (_, row) => (
      <ExcelTextInput
        aria-label={`文本-${row.index}`}
        defaultValue={`文本 ${row.index}`}
        disabled={row.disabled}
        status={row.index === 3 ? 'error' : undefined}
      />
    ),
  },
  {
    title: '带前缀文本',
    width: 180,
    render: (_, row) => (
      <ExcelTextInput
        aria-label={`带前缀文本-${row.index}`}
        defaultValue={`编号 ${row.index}`}
        disabled={row.disabled}
        prefix="#"
        status={row.index === 3 ? 'error' : undefined}
      />
    ),
  },
  {
    title: '普通数字',
    width: 170,
    render: (_, row) => (
      <ExcelNumberInput
        aria-label={`普通数字-${row.index}`}
        defaultValue={row.index}
        disabled={row.disabled}
        controls={false}
        status={row.index === 3 ? 'error' : undefined}
      />
    ),
  },
  {
    title: '前缀数字',
    width: 170,
    render: (_, row) => (
      <ExcelNumberInput
        aria-label={`前缀数字-${row.index}`}
        defaultValue={row.index * 10}
        disabled={row.disabled}
        controls={false}
        prefix="¥"
      />
    ),
  },
  {
    title: '后缀数字',
    width: 170,
    render: (_, row) => (
      <ExcelNumberInput
        aria-label={`后缀数字-${row.index}`}
        defaultValue={row.index * 2}
        disabled={row.disabled}
        controls={false}
        suffix="米"
      />
    ),
  },
  {
    title: '组合数字',
    width: 170,
    render: (_, row) => (
      <ExcelNumberInput
        aria-label={`组合数字-${row.index}`}
        defaultValue={row.index * 3}
        disabled={row.disabled}
        controls={false}
        addonAfter="件"
      />
    ),
  },
  {
    title: '下拉',
    width: 180,
    render: (_, row) => (
      <ExcelSelect
        aria-label={`下拉-${row.index}`}
        defaultValue="ACTIVE"
        disabled={row.disabled}
        status={row.index === 3 ? 'error' : undefined}
        options={[
          { value: 'ACTIVE', label: '启用' },
          { value: 'INACTIVE', label: '停用' },
        ]}
      />
    ),
  },
  {
    title: '日期',
    width: 190,
    render: (_, row) => (
      <ExcelDatePicker
        aria-label={`日期-${row.index}`}
        defaultValue={dayjs('2026-11-16').add(row.index, 'day')}
        disabled={row.disabled}
        status={row.index === 3 ? 'error' : undefined}
      />
    ),
  },
];

export function mountExcelTableVerificationHarness(container: HTMLElement) {
  container.className = 'excel-table-verification-harness';
  container.style.cssText = 'width:920px;padding:20px;background:#fff;';
  const root = createRoot(container);
  root.render(
    <ExcelTable<VerificationRow>
      className="excel-table-verification-table"
      rowKey="key"
      columns={columns}
      dataSource={rows}
      scroll={{ x: 1530, y: 220 }}
    />,
  );
  return () => root.unmount();
}
