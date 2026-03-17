import { Form, Input, InputNumber, Modal, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { CuttingSheetDetail, CuttingTask } from '../types';

const { Text } = Typography;

type Props = {
  open: boolean;
  task?: CuttingTask;
  detail: CuttingSheetDetail | null;
  qtyMap: Record<string, number>;
  form: FormInstance;
  submitting: boolean;
  zIndex?: number;
  onQtyChange: (key: string, value: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const buildSpecKey = (color: string, size: string) => `${color}::${size}`;

export default function CuttingBedRecordModal({
  open,
  task,
  detail,
  qtyMap,
  form,
  submitting,
  zIndex,
  onQtyChange,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Modal
      open={open}
      title={task ? `手动录入床次 - ${task.orderCode}` : '手动录入床次'}
      width={1080}
      zIndex={zIndex}
      destroyOnHidden
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={submitting}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="床次编号" name="bedNumber" rules={[{ required: true, message: '请输入床次编号' }]}>
          <Input maxLength={32} />
        </Form.Item>
        <Form.Item
          label={`当前床次实际用料${detail?.materialUnit ? `（${detail.materialUnit}）` : ''}`}
          name="actualFabricQty"
          rules={[
            { required: true, message: '请输入当前床次实际用料' },
            {
              validator: (_rule, value: number | undefined) => {
                if (value === undefined || value === null) {
                  return Promise.resolve();
                }
                if (Number(value) <= 0) {
                  return Promise.reject(new Error('当前床次实际用料必须大于 0'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>
        {detail?.rows?.length ? (
          <div className="factory-create-matrix-wrap">
            <table className="factory-create-matrix-table">
              <thead>
                <tr>
                  <th>颜色 \\ 尺码</th>
                  {detail.sizes.map((size) => (
                    <th key={`bed-record-head-${size}`}>{size}</th>
                  ))}
                  <th>小计</th>
                </tr>
              </thead>
              <tbody>
                {detail.rows.map((row) => (
                  <tr key={`bed-record-row-${row.color}`}>
                    <td>{row.color}</td>
                    {detail.sizes.map((size) => {
                      const key = buildSpecKey(row.color, size);
                      const value = qtyMap[key] ?? 0;
                      return (
                        <td key={`bed-record-${row.color}-${size}`}>
                          <InputNumber
                            min={0}
                            precision={0}
                            controls={false}
                            value={value}
                            onChange={(nextValue) => {
                              const qty = Math.max(0, Math.round(Number(nextValue) || 0));
                              onQtyChange(key, qty);
                            }}
                            style={{ width: '100%' }}
                            placeholder="填写实裁数量"
                          />
                        </td>
                      );
                    })}
                    <td>
                      {detail.sizes.reduce((sum, size) => sum + (qtyMap[buildSpecKey(row.color, size)] ?? 0), 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Text type="secondary">暂无可录入的颜色尺码数据</Text>
        )}
      </Form>
    </Modal>
  );
}
