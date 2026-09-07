import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type {
  CuttingSheetDetail,
  CuttingSheetMaterialCalculation,
  CuttingSheetUnconfiguredItem,
  CuttingSheetMaterialUsage,
  CuttingTask,
} from '../types';
import '../styles/matrix-table.css';
import ListImage from './common/ListImage';
import { sortColorValues, sortSizeValues } from '../utils/spec';

const { Text } = Typography;

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  task?: CuttingTask;
  detail: CuttingSheetDetail | null;
  qtyMap: Record<string, number | null>;
  form: FormInstance;
  submitting: boolean;
  calculating: boolean;
  calculations: CuttingSheetMaterialCalculation[];
  unconfiguredItems: CuttingSheetUnconfiguredItem[];
  existingUsages?: CuttingSheetMaterialUsage[];
  cutterOptions?: Array<{ label: string; value: number }>;
  cutterLoading?: boolean;
  zIndex?: number;
  onQtyChange: (key: string, value: number | null) => void;
  onFillPendingQty: () => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const buildSpecKey = (color: string, size: string) => `${color}::${size}`;
const buildStockOptionKey = (warehouseId?: number, specificationId?: number) => (
  `${Number(warehouseId) || 0}::${Number(specificationId) || 0}`
);

export default function CuttingBedRecordModal({
  open,
  mode,
  task,
  detail,
  qtyMap,
  form,
  submitting,
  calculating,
  calculations,
  unconfiguredItems,
  existingUsages = [],
  cutterOptions = [],
  cutterLoading = false,
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

  const totalQty = Object.values(qtyMap).reduce<number>(
    (sum, value) => sum + Math.max(0, Number(value) || 0),
    0,
  );
  const submitDisabled = mode === 'create'
    && (totalQty <= 0 || calculating);
  const footer = (
    <Space>
      <Button onClick={onCancel}>取消</Button>
      <Button type="primary" loading={submitting} disabled={submitDisabled} onClick={onSubmit}>
        {mode === 'edit' ? '保存并调整库存' : '确认并出库'}
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      title={mode === 'edit'
        ? `修改床次用量 - ${form.getFieldValue('bedNumber') ?? ''}`
        : task ? `录入床次 - ${task.orderCode}` : '录入床次'}
      width={1120}
      zIndex={zIndex}
      forceRender
      destroyOnHidden
      onCancel={onCancel}
      footer={footer}
    >
      <div style={{ maxHeight: 'calc(100vh - 190px)', overflowY: 'auto', paddingRight: 4 }}>
        <Form form={form} layout="vertical">
          {mode === 'create' ? (
            <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="填写本床次各颜色尺码的实裁件数后，系统会自动刷新所需面料和辅料。"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
              <Form.Item label="床次编号" name="bedNumber" rules={[{ required: true, message: '请输入床次编号' }]}>
                <Input maxLength={32} />
              </Form.Item>
              <Form.Item label="裁剪人（可选）" name="cutterId">
                <Select
                  allowClear
                  loading={cutterLoading}
                  showSearch
                  optionFilterProp="label"
                  options={cutterOptions}
                  placeholder="请选择本床裁剪人"
                />
              </Form.Item>
            </div>
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
                        {matrixSizes.map((size) => <th key={`bed-record-head-${size}`}>{size}</th>)}
                        <th>小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row) => (
                        <tr key={`bed-record-row-${row.color}`}>
                          <td>{row.color}</td>
                          {matrixSizes.map((size) => {
                            const key = buildSpecKey(row.color, size);
                            return (
                              <td key={`bed-record-${row.color}-${size}`}>
                                <InputNumber
                                  className="factory-matrix-cell-input"
                                  min={0}
                                  precision={0}
                                  controls={false}
                                  value={qtyMap[key] ?? null}
                                  onChange={(nextValue) => onQtyChange(
                                    key,
                                    nextValue == null ? null : Math.max(0, Math.round(Number(nextValue) || 0)),
                                  )}
                                  style={{ width: '100%' }}
                                  placeholder="实裁数量"
                                />
                              </td>
                            );
                          })}
                          <td>{matrixSizes.reduce((sum, size) => sum + (qtyMap[buildSpecKey(row.color, size)] ?? 0), 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Text type="secondary">暂无可录入的颜色尺码数据</Text>}
            </Card>
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="保存后系统会按新旧用量差额自动补出库或退回库存；更换仓库时会先退回原仓，再从新仓出库。"
            />
          )}

          <Card
            title="面辅料实际用量"
            size="small"
            style={{ marginTop: mode === 'create' ? 16 : 0 }}
            extra={calculating ? <Text type="secondary">正在重新计算…</Text> : null}
          >
            {unconfiguredItems.length > 0 ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="部分颜色尺码未配置面辅料用量"
                description={`${unconfiguredItems.map((item) => `${item.color}/${item.size}`).join('、')} 不会自动出库，本床仍可保存；后续可在物料库存中手工领料并关联本裁床单。`}
              />
            ) : null}
            {mode === 'create' && totalQty <= 0 ? (
              <Alert type="info" showIcon message="填写颜色尺码数量后，这里会自动显示本床需要的面料和辅料。" />
            ) : calculations.length > 0 ? (
              <Form.List name="materialUsages">
                {(fields) => (
                  <Table
                    pagination={false}
                    size="small"
                    bordered
                    rowKey={(field) => String(field.key)}
                    dataSource={fields}
                    scroll={{ x: 980 }}
                    columns={[
                      {
                        title: '物料',
                        width: 270,
                        render: (_value, field) => {
                          const material = calculations[field.name];
                          return (
                            <Space size={10}>
                              <ListImage src={material?.imageUrl} alt={material?.materialName} width={46} height={46} borderRadius={8} objectFit="cover" />
                              <div style={{ display: 'grid', gap: 3 }}>
                                <Space size={6}>
                                  <Tag color={material?.materialType === 'ACCESSORY' ? 'purple' : 'blue'}>
                                    {material?.materialType === 'ACCESSORY' ? '辅料' : '面料'}
                                  </Tag>
                                  <Text strong>{material?.materialName ?? '-'}</Text>
                                </Space>
                                <Text type="secondary">{material?.materialCode ?? '-'}</Text>
                              </div>
                            </Space>
                          );
                        },
                      },
                      {
                        title: '适用颜色 / 规格',
                        width: 190,
                        render: (_value, field) => {
                          const material = calculations[field.name];
                          return (
                            <div style={{ display: 'grid', gap: 4 }}>
                              <Text>{material?.applicableColors?.length ? material.applicableColors.join('、') : '全部颜色'}</Text>
                              <Text type="secondary">{material?.materialMinimumSpecificationLabel ?? '按库存规格选择'}</Text>
                            </div>
                          );
                        },
                      },
                      {
                        title: '参考用量',
                        width: 120,
                        render: (_value, field) => {
                          const material = calculations[field.name];
                          return `${material?.plannedQty ?? 0}${material?.materialUnit ?? ''}`;
                        },
                      },
                      {
                        title: '出库仓库 / 规格',
                        width: 280,
                        render: (_value, field) => {
                          const material = calculations[field.name];
                          return (
                            <Form.Item noStyle shouldUpdate>
                              {() => (
                                <Form.Item
                                  name={[field.name, 'stockOptionKey']}
                                  style={{ marginBottom: 0 }}
                                  dependencies={[[field.name, 'actualQty']]}
                                  rules={[{
                                    validator: async (_, value) => {
                                      const actualQty = Number(form.getFieldValue(['materialUsages', field.name, 'actualQty']) ?? 0);
                                      if (actualQty > 0 && !value) {
                                        throw new Error('请选择出库仓库');
                                      }
                                    },
                                  }]}
                                >
                                  <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="用量为 0 时可不选"
                                    options={(material?.stockOptions ?? []).map((option) => ({
                                      value: buildStockOptionKey(option.warehouseId, option.materialMinimumSpecificationId),
                                      label: `${option.warehouseName} / ${option.materialMinimumSpecificationLabel ?? '默认规格'}（可用 ${option.availableQty}${material?.materialUnit ?? ''}）`,
                                    }))}
                                  />
                                </Form.Item>
                              )}
                            </Form.Item>
                          );
                        },
                      },
                      {
                        title: '实际用量',
                        width: 180,
                        render: (_value, field) => {
                          const material = calculations[field.name];
                          const existing = existingUsages.find((usage) => usage.calculationKey === material?.calculationKey);
                          return (
                            <Form.Item noStyle shouldUpdate>
                              {() => (
                                <Form.Item
                                  name={[field.name, 'actualQty']}
                                  style={{ marginBottom: 0 }}
                                  rules={[
                                    { required: true, message: '请输入实际用量（可填 0）' },
                                    {
                                      validator: async (_, value) => {
                                        const qty = Number(value);
                                        if (!Number.isFinite(qty) || qty < 0) {
                                          throw new Error('实际用量不能小于 0');
                                        }
                                        const optionKey = form.getFieldValue(['materialUsages', field.name, 'stockOptionKey']);
                                        const option = material?.stockOptions.find((item) => (
                                          buildStockOptionKey(item.warehouseId, item.materialMinimumSpecificationId) === optionKey
                                        ));
                                        if (!option || qty <= 0) return;
                                        const isCurrentStock = Number(existing?.warehouseId) === option.warehouseId
                                          && Number(existing?.materialMinimumSpecificationId ?? 0) === Number(option.materialMinimumSpecificationId ?? 0);
                                        const availableQty = option.availableQty + (isCurrentStock ? Number(existing?.actualQty ?? 0) : 0);
                                        if (qty > availableQty) {
                                          throw new Error(`超过可用库存，最多可填 ${availableQty}${material?.materialUnit ?? ''}`);
                                        }
                                      },
                                    },
                                  ]}
                                >
                                  <InputNumber
                                    min={0}
                                    precision={4}
                                    style={{ width: '100%' }}
                                    placeholder="填写用量"
                                    suffix={material?.materialUnit ?? ''}
                                  />
                                </Form.Item>
                              )}
                            </Form.Item>
                          );
                        },
                      },
                    ]}
                  />
                )}
              </Form.List>
            ) : calculating ? (
              <Alert type="info" showIcon message="正在根据本床颜色尺码数量计算面辅料…" />
            ) : (
              <Alert type="info" showIcon message="当前填写的颜色尺码没有自动出库项，可直接保存床次。" />
            )}
          </Card>
        </Form>
      </div>
    </Modal>
  );
}
