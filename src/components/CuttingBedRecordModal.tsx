import { Button, Card, Form, Input, InputNumber, Modal, Select, Table, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { CuttingSheetDetail, CuttingTask } from '../types';
import ListImage from './common/ListImage';

const { Text } = Typography;

type Props = {
  open: boolean;
  task?: CuttingTask;
  detail: CuttingSheetDetail | null;
  qtyMap: Record<string, number>;
  form: FormInstance;
  submitting: boolean;
  stockAvailabilityMap: Record<string, number>;
  warehouseOptions: Array<{ label: string; value: number }>;
  zIndex?: number;
  onQtyChange: (key: string, value: number) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const buildSpecKey = (color: string, size: string) => `${color}::${size}`;
const buildMaterialStockKey = (warehouseId?: number, materialId?: number) => `${Number(warehouseId) || 0}::${Number(materialId) || 0}`;

export default function CuttingBedRecordModal({
  open,
  task,
  detail,
  qtyMap,
  form,
  submitting,
  stockAvailabilityMap,
  warehouseOptions,
  zIndex,
  onQtyChange,
  onCancel,
  onSubmit,
}: Props) {
  const applyBatchWarehouse = () => {
    const targetWarehouseId = Number(form.getFieldValue('batchWarehouseId'));
    if (!Number.isFinite(targetWarehouseId) || targetWarehouseId <= 0) {
      return;
    }
    const currentValues = (form.getFieldValue('materialUsages') ?? []) as Array<Record<string, unknown>>;
    form.setFieldsValue({
      materialUsages: currentValues.map((item) => ({
        ...item,
        warehouseId: targetWarehouseId,
      })),
    });
  };

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
        <Card title="物料用量" size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <Form.Item label="批量设置仓库" name="batchWarehouseId" style={{ marginBottom: 0, minWidth: 240 }}>
              <Select
                allowClear
                placeholder="选择仓库后批量应用"
                options={warehouseOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Button type="primary" onClick={applyBatchWarehouse} disabled={warehouseOptions.length === 0}>
              应用到全部物料
            </Button>
          </div>
          <Form.List name="materialUsages">
            {(fields) => (
              fields.length > 0 ? (
                <Table
                  pagination={false}
                  size="small"
                  bordered
                  rowKey={(field) => String(field.key)}
                  dataSource={fields}
                  columns={[
                    {
                      title: '物料图片',
                      width: 92,
                      render: (_value, field) => {
                        const currentMaterialId = form.getFieldValue(['materialUsages', field.name, 'materialId']);
                        const usage = (detail?.materialUsages ?? detail?.fabricUsages ?? []).find((item) => item.materialId === currentMaterialId)
                          ?? (detail?.materialUsages ?? detail?.fabricUsages ?? [])[field.name];
                        return <ListImage src={usage?.imageUrl} alt={usage?.materialName} width={52} height={52} borderRadius={10} objectFit="cover" />;
                      },
                    },
                    {
                      title: '物料名称',
                      render: (_value, field) => {
                        const currentMaterialId = form.getFieldValue(['materialUsages', field.name, 'materialId']);
                        const usage = (detail?.materialUsages ?? detail?.fabricUsages ?? []).find((item) => item.materialId === currentMaterialId)
                          ?? (detail?.materialUsages ?? detail?.fabricUsages ?? [])[field.name];
                        return (
                          <div style={{ display: 'grid', gap: 4 }}>
                            <Text strong>{usage?.materialName ?? `面料 ${field.name + 1}`}</Text>
                            <Text type="secondary">{usage?.materialCode ?? '-'}</Text>
                          </div>
                        );
                      },
                    },
                    {
                      title: '仓库',
                      width: 220,
                      render: (_value, field) => (
                        <Form.Item name={[field.name, 'warehouseId']} style={{ marginBottom: 0 }}>
                          <Select
                            allowClear
                            placeholder="选择仓库"
                            options={warehouseOptions}
                            showSearch
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '该床次用量',
                      width: 220,
                      render: (_value, field) => {
                        const currentMaterialId = form.getFieldValue(['materialUsages', field.name, 'materialId']);
                        const usage = (detail?.materialUsages ?? detail?.fabricUsages ?? []).find((item) => item.materialId === currentMaterialId)
                          ?? (detail?.materialUsages ?? detail?.fabricUsages ?? [])[field.name];
                        return (
                          <Form.Item
                            name={[field.name, 'actualQty']}
                            style={{ marginBottom: 0 }}
                            dependencies={[
                              ['materialUsages', field.name, 'warehouseId'],
                              ['materialUsages', field.name, 'materialId'],
                            ]}
                            rules={[
                              {
                                validator: async (_, value) => {
                                  const qty = Number(value ?? 0);
                                  if (!Number.isFinite(qty) || qty <= 0) {
                                    return;
                                  }
                                  const selectedWarehouseId = Number(form.getFieldValue(['materialUsages', field.name, 'warehouseId']));
                                  const selectedMaterialId = Number(form.getFieldValue(['materialUsages', field.name, 'materialId']));
                                  if (!Number.isFinite(selectedWarehouseId) || selectedWarehouseId <= 0 || !Number.isFinite(selectedMaterialId) || selectedMaterialId <= 0) {
                                    return;
                                  }
                                  const currentAvailableQty = stockAvailabilityMap[buildMaterialStockKey(selectedWarehouseId, selectedMaterialId)] ?? 0;
                                  if (qty > currentAvailableQty) {
                                    throw new Error(`超过仓库可用库存，当前最多可录入 ${currentAvailableQty}${usage?.materialUnit ?? ''}`);
                                  }
                                },
                              },
                            ]}
                          >
                            <InputNumber min={0} precision={2} style={{ width: '100%' }} addonAfter={usage?.materialUnit ?? ''} placeholder="填写该床次用量" />
                          </Form.Item>
                        );
                      },
                    },
                  ]}
                />
              ) : (
                <Text type="secondary">当前裁床单未配置物料明细，暂无法录入床次物料用量。</Text>
              )
            )}
          </Form.List>
        </Card>
        <Card title="颜色尺码" size="small">
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
        </Card>
      </Form>
    </Modal>
  );
}
