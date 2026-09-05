import { Button, Card, Form, Input, InputNumber, Modal, Select, Table, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { CuttingSheetDetail, CuttingTask } from '../types';
import type { MaterialStockListItem } from '../types/material-stock';
import '../styles/matrix-table.css';
import ListImage from './common/ListImage';
import { sortColorValues, sortSizeValues } from '../utils/spec';

const { Text } = Typography;

type Props = {
  open: boolean;
  task?: CuttingTask;
  detail: CuttingSheetDetail | null;
  qtyMap: Record<string, number | null>;
  form: FormInstance;
  submitting: boolean;
  stockAvailabilityMap: Record<string, number>;
  materialStockItems: MaterialStockListItem[];
  warehouseOptions: Array<{ label: string; value: number }>;
  zIndex?: number;
  onQtyChange: (key: string, value: number | null) => void;
  onFillPendingQty: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const buildSpecKey = (color: string, size: string) => `${color}::${size}`;
const buildMaterialStockKey = (
  warehouseId?: number,
  materialId?: number,
  materialMinimumSpecificationId?: number,
) => `${Number(warehouseId) || 0}::${Number(materialId) || 0}::${Number(materialMinimumSpecificationId) || 0}`;

export default function CuttingBedRecordModal({
  open,
  task,
  detail,
  qtyMap,
  form,
  submitting,
  stockAvailabilityMap,
  materialStockItems,
  warehouseOptions,
  zIndex,
  onQtyChange,
  onFillPendingQty,
  onCancel,
  onSubmit,
}: Props) {
  const matrixSizes = sortSizeValues(detail?.sizes ?? []);
  const sortedRows = [...(detail?.rows ?? [])].sort((left, right) => {
    const [sortedLeft, sortedRight] = sortColorValues([left.color, right.color]);
    if (!sortedLeft || !sortedRight || sortedLeft === sortedRight) {
      return 0;
    }
    return sortedLeft === left.color ? -1 : 1;
  });

  const getSpecificationOptions = (warehouseId?: number, materialId?: number) => {
    const options = materialStockItems
      .filter((item) => (
        Number(item.warehouseId) === Number(warehouseId)
        && Number(item.materialId) === Number(materialId)
        && Number(item.availableQty ?? 0) > 0
        && Number.isFinite(Number(item.materialMinimumSpecificationId))
      ))
      .map((item) => ({
        label: `${item.materialMinimumSpecificationLabel || '未命名规格'}（可用 ${Number(item.availableQty ?? 0)}${item.unit ?? ''}）`,
        value: Number(item.materialMinimumSpecificationId),
      }));
    return [...new Map(options.map((item) => [item.value, item])).values()];
  };

  const applyWarehouseToUsage = (item: Record<string, unknown>, warehouseId: number) => {
    const materialId = Number(item.materialId);
    const specificationOptions = getSpecificationOptions(warehouseId, materialId);
    const currentSpecificationId = Number(item.materialMinimumSpecificationId);
    const currentStillAvailable = specificationOptions.some((option) => option.value === currentSpecificationId);
    return {
      ...item,
      warehouseId,
      materialMinimumSpecificationId: currentStillAvailable
        ? currentSpecificationId
        : specificationOptions.length === 1
          ? specificationOptions[0].value
          : undefined,
    };
  };

  const applyBatchWarehouse = () => {
    const targetWarehouseId = Number(form.getFieldValue('batchWarehouseId'));
    if (!Number.isFinite(targetWarehouseId) || targetWarehouseId <= 0) {
      return;
    }
    const currentValues = (form.getFieldValue('materialUsages') ?? []) as Array<Record<string, unknown>>;
    form.setFieldsValue({
      materialUsages: currentValues.map((item) => ({
        ...applyWarehouseToUsage(item, targetWarehouseId),
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
                            onChange={(warehouseId: number) => {
                              const currentUsage = form.getFieldValue(['materialUsages', field.name]) ?? {};
                              const nextUsage = applyWarehouseToUsage(currentUsage, warehouseId);
                              form.setFieldValue(['materialUsages', field.name], nextUsage);
                            }}
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      title: '最小规格',
                      width: 240,
                      render: (_value, field) => (
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const selectedWarehouseId = Number(form.getFieldValue(['materialUsages', field.name, 'warehouseId']));
                            const selectedMaterialId = Number(form.getFieldValue(['materialUsages', field.name, 'materialId']));
                            const options = getSpecificationOptions(selectedWarehouseId, selectedMaterialId);
                            return (
                              <Form.Item
                                name={[field.name, 'materialMinimumSpecificationId']}
                                style={{ marginBottom: 0 }}
                                rules={[{ required: true, message: '请选择最小规格' }]}
                              >
                                <Select
                                  placeholder={selectedWarehouseId ? '请选择最小规格' : '请先选择仓库'}
                                  options={options}
                                  disabled={!selectedWarehouseId}
                                  showSearch
                                  optionFilterProp="label"
                                />
                              </Form.Item>
                            );
                          }}
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
                              ['materialUsages', field.name, 'materialMinimumSpecificationId'],
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
                                  const selectedSpecificationId = Number(form.getFieldValue(['materialUsages', field.name, 'materialMinimumSpecificationId']));
                                  if (!Number.isFinite(selectedWarehouseId) || selectedWarehouseId <= 0 || !Number.isFinite(selectedMaterialId) || selectedMaterialId <= 0 || !Number.isFinite(selectedSpecificationId) || selectedSpecificationId <= 0) {
                                    return;
                                  }
                                  const currentAvailableQty = stockAvailabilityMap[buildMaterialStockKey(
                                    selectedWarehouseId,
                                    selectedMaterialId,
                                    selectedSpecificationId,
                                  )] ?? 0;
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
        <Card
          title="颜色尺码"
          size="small"
          extra={sortedRows.length ? (
            <Button type="link" onClick={onFillPendingQty} style={{ paddingInline: 0 }}>
              填入剩余数量
            </Button>
          ) : null}
        >
          {sortedRows.length ? (
            <div className="factory-create-matrix-wrap">
              <table className="factory-create-matrix-table factory-editable-matrix-table">
                <thead>
                  <tr>
                    <th>颜色 \\ 尺码</th>
                    {matrixSizes.map((size) => (
                      <th key={`bed-record-head-${size}`}>{size}</th>
                    ))}
                    <th>小计</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={`bed-record-row-${row.color}`}>
                      <td>{row.color}</td>
                      {matrixSizes.map((size) => {
                        const key = buildSpecKey(row.color, size);
                        const value = qtyMap[key];
                        return (
                          <td key={`bed-record-${row.color}-${size}`}>
                            <InputNumber
                              className="factory-matrix-cell-input"
                              min={0}
                              precision={0}
                              controls={false}
                              value={value ?? null}
                              onChange={(nextValue) => {
                                const qty = nextValue == null ? null : Math.max(0, Math.round(Number(nextValue) || 0));
                                onQtyChange(key, qty);
                              }}
                              style={{ width: '100%' }}
                              placeholder="填写实裁数量"
                            />
                          </td>
                        );
                      })}
                      <td>
                        {matrixSizes.reduce((sum, size) => sum + (qtyMap[buildSpecKey(row.color, size)] ?? 0), 0)}
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
