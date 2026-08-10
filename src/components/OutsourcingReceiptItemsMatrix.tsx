import { InputNumber, Typography } from 'antd';
import { useMemo } from 'react';
import { sortColorValues, sortSizeValues } from '../utils/spec';
import '../styles/matrix-table.css';

const { Text } = Typography;
export type OutsourcingReceiptMetric = 'received' | 'good' | 'defect' | 'rework';
export type OutsourcingReceiptMatrixItem = { id: string; color: string; size: string; receivedQty?: number | null; goodQty?: number | null; defectQty?: number | null; reworkQty?: number | null; maxQty?: number };
type Props = { items: OutsourcingReceiptMatrixItem[]; metric: OutsourcingReceiptMetric; editable?: boolean; onChange?: (itemId: string, metric: Exclude<OutsourcingReceiptMetric, 'received'>, value: number | null) => void; emptyDescription?: string };
const metricField: Record<OutsourcingReceiptMetric, keyof OutsourcingReceiptMatrixItem> = { received: 'receivedQty', good: 'goodQty', defect: 'defectQty', rework: 'reworkQty' };
const getValue = (item: OutsourcingReceiptMatrixItem, metric: OutsourcingReceiptMetric) => metric === 'received' && item.receivedQty == null
  ? Number(item.goodQty ?? 0) + Number(item.defectQty ?? 0) + Number(item.reworkQty ?? 0)
  : Number(item[metricField[metric]] ?? 0);

export default function OutsourcingReceiptItemsMatrix({ items, metric, editable = false, onChange, emptyDescription = '暂无颜色尺码明细' }: Props) {
  const colors = useMemo(() => sortColorValues(items.map((item) => item.color)), [items]);
  const sizes = useMemo(() => sortSizeValues(items.map((item) => item.size)), [items]);
  const itemMap = useMemo(() => new Map(items.map((item) => [`${item.color}\u0000${item.size}`, item])), [items]);
  if (!items.length || !colors.length || !sizes.length) return <Text type="secondary">{emptyDescription}</Text>;
  const total = items.reduce((sum, item) => sum + getValue(item, metric), 0);
  return <div className="outsourcing-receipt-matrix-wrap" role="region" aria-label="颜色尺码数量明细" tabIndex={0}>
    <table className="outsourcing-receipt-matrix-table"><thead><tr><th scope="col">颜色 / 尺码</th>{sizes.map((size) => <th scope="col" key={size}>{size}</th>)}<th scope="col">合计</th></tr></thead>
      <tbody>{colors.map((color) => { const rowTotal = sizes.reduce((sum, size) => { const item = itemMap.get(`${color}\u0000${size}`); return sum + (item ? getValue(item, metric) : 0); }, 0); return <tr key={color}><th scope="row">{color}</th>{sizes.map((size) => { const item = itemMap.get(`${color}\u0000${size}`); if (!item) return <td key={size}>—</td>; const value = getValue(item, metric); const canEdit = editable && metric !== 'received' && Boolean(onChange); return <td key={size}>{canEdit ? <InputNumber aria-label={`${color} ${size} 数量`} className="outsourcing-receipt-matrix-input" min={0} max={item.maxQty} precision={0} controls={false} value={value || null} placeholder="0" onChange={(next) => { const normalized = next == null ? null : Math.max(0, Math.round(Number(next) || 0)); const clamped = normalized == null || item.maxQty == null ? normalized : Math.min(normalized, item.maxQty); onChange?.(item.id, metric, clamped); }} /> : value.toLocaleString('zh-CN')}</td>; })}<td className="outsourcing-receipt-matrix-total">{rowTotal.toLocaleString('zh-CN')}</td></tr>; })}</tbody>
      <tfoot><tr><th scope="row">合计</th>{sizes.map((size) => <td key={size} className="outsourcing-receipt-matrix-total">{items.filter((item) => item.size === size).reduce((sum, item) => sum + getValue(item, metric), 0).toLocaleString('zh-CN')}</td>)}<td className="outsourcing-receipt-matrix-grand-total">{total.toLocaleString('zh-CN')}</td></tr></tfoot>
    </table></div>;
}
