import { Alert, InputNumber, Typography } from 'antd';
import type { OutsourcingReceiptPlan } from '../types/outsourcing-management';
import '../styles/matrix-table.css';

const { Text } = Typography;

type Props = {
  plan?: OutsourcingReceiptPlan | null;
  qtyMap: Record<string, number | null>;
  onChange: (lineId: string, value: number | null) => void;
};

export default function OutsourcingReceiptItemsMatrix({ plan, qtyMap, onChange }: Props) {
  if (!plan || plan.items.length === 0) {
    return <Text type="secondary">暂无可接收的颜色尺码明细</Text>;
  }

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message={`派工 ${plan.dispatchQty} 件，已收 ${plan.receivedQty} 件，待收 ${plan.pendingQty} 件`}
      />
      <div className="factory-create-matrix-wrap">
        <table className="factory-create-matrix-table factory-editable-matrix-table">
          <thead>
            <tr>
              <th>颜色</th>
              <th>尺码</th>
              <th>派工数量</th>
              <th>已收数量</th>
              <th>待收数量</th>
              <th>本次接收</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item) => {
              const value = qtyMap[item.productionOrderLineId];
              return (
                <tr key={item.productionOrderLineId}>
                  <td>{item.color}</td>
                  <td>{item.size}</td>
                  <td>{item.plannedQty}</td>
                  <td>{item.receivedQty}</td>
                  <td>{item.pendingQty}</td>
                  <td>
                    <InputNumber
                      className="factory-matrix-cell-input"
                      min={0}
                      max={item.pendingQty}
                      precision={0}
                      controls={false}
                      value={value ?? null}
                      onChange={(nextValue) => {
                        const qty = nextValue == null ? null : Math.max(0, Math.round(Number(nextValue) || 0));
                        onChange(item.productionOrderLineId, qty == null ? null : Math.min(qty, item.pendingQty));
                      }}
                      style={{ width: '100%' }}
                      placeholder="填写"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
