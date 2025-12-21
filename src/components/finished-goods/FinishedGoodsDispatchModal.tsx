import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Alert, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { FinishedGoodsStockRecord } from '../../types/finished-goods-stock';
import type {
  FinishedGoodsDispatchCreatePayload,
  FinishedGoodsDispatchSummary,
  FinishedGoodsOutboundMeta,
} from '../../types/finished-goods-outbound';
import { finishedGoodsDispatchService } from '../../api/finished-goods';

const { Text } = Typography;

type FormValues = {
  customerId?: string;
  logisticsProviderId?: string;
  dispatchAt?: Dayjs;
  trackingNo?: string;
  remark?: string;
};

type FinishedGoodsDispatchModalProps = {
  open: boolean;
  records: FinishedGoodsStockRecord[];
  meta: FinishedGoodsOutboundMeta | null;
  onClose: () => void;
  onDispatched: (summary: FinishedGoodsDispatchSummary) => void;
};

const FinishedGoodsDispatchModal = ({ open, records, meta, onClose, onDispatched }: FinishedGoodsDispatchModalProps) => {
  const [form] = Form.useForm<FormValues>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuantities({});
      setUnitPrices({});
      form.resetFields();
      return;
    }
    const defaults: Record<string, number> = {};
    const defaultsPrice: Record<string, number> = {};
    records.forEach((record) => {
      defaults[record.id] = Math.min(record.availableQuantity ?? record.quantity, record.quantity);
      defaultsPrice[record.id] = 0;
    });
    setQuantities(defaults);
    setUnitPrices(defaultsPrice);
    form.setFieldsValue({
      customerId: undefined,
      dispatchAt: dayjs(),
    });
  }, [form, open, records]);

  const rowsWithQuantity = useMemo(
    () =>
      records.filter((record) => {
        const qty = quantities[record.id];
        return qty !== undefined && qty > 0;
      }),
    [quantities, records],
  );

  const handleSubmit = async () => {
    if (!records.length) {
      message.error('请先选择需要出库的库存记录');
      return;
    }
    try {
      const values = await form.validateFields();
      const invalid = rowsWithQuantity.find((record) => {
        const qty = quantities[record.id];
        return !record.styleVariantId || !qty || qty <= 0 || qty > record.availableQuantity;
      });
      if (!rowsWithQuantity.length) {
        message.warning('至少需要为一条记录填写出库数量');
        return;
      }
      if (invalid) {
        message.error('出库数量需大于 0 且不得超过可用库存，并确保存在 SKU 信息');
        return;
      }
      const baseRecord = records[0];
      const productionOrders = new Set(
        rowsWithQuantity.map((record) => record.productionOrderId || '__unknown__'),
      );
      if (productionOrders.size > 1) {
        message.error('暂不支持跨生产订单一次性出库，请按生产订单拆分。');
        return;
      }
      const payload: FinishedGoodsDispatchCreatePayload = {
        warehouseId: baseRecord.warehouseId,
        logisticsProviderId: values.logisticsProviderId,
        dispatchAt: values.dispatchAt ? values.dispatchAt.toISOString() : undefined,
        remark: values.remark?.trim() || undefined,
        productionOrderId: baseRecord.productionOrderId,
        trackingNo: values.trackingNo?.trim() || undefined,
        items: rowsWithQuantity.map((record) => ({
          styleVariantId: record.styleVariantId!,
          quantity: Math.floor(quantities[record.id]),
          unitPrice: Number(unitPrices[record.id] ?? 0),
        })),
      };
      if (values.customerId) {
        payload.customerId = values.customerId;
      }
      setSubmitting(true);
      const summary = await finishedGoodsDispatchService.create(payload);
      message.success(`已创建出库单 ${summary.dispatchNo}`);
      onDispatched(summary);
    } catch (error) {
      if ((error as { errorFields?: unknown[] } | undefined)?.errorFields) {
        return;
      }
      console.error('failed to create finished goods dispatch', error);
      message.error('出库失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<FinishedGoodsStockRecord> = useMemo(() => {
    return [
      {
        title: 'SKU/款式',
        dataIndex: 'styleNo',
        key: 'styleNo',
        render: (_value, record) => (
          <Space direction="vertical" size={2}>
            <Text strong>{record.styleNo ?? record.sku ?? '--'}</Text>
            <Text type="secondary">{record.styleName ?? '-'}</Text>
          </Space>
        ),
      },
      {
        title: '规格',
        dataIndex: 'size',
        key: 'size',
        width: 160,
        render: (_value, record) => (
          <Space size={8}>
            <Text>{record.color ?? '-'}</Text>
            <Text type="secondary">{record.size ?? '-'}</Text>
          </Space>
        ),
      },
      {
        title: '可用库存',
        dataIndex: 'availableQuantity',
        key: 'availableQuantity',
        width: 140,
        render: (_value, record) => `${record.availableQuantity.toLocaleString('zh-CN')} 件`,
      },
      {
        title: '出库数量',
        dataIndex: 'dispatchQty',
        key: 'dispatchQty',
        width: 180,
        render: (_value, record) => (
          <InputNumber
            min={0}
            max={record.availableQuantity}
            precision={0}
            value={quantities[record.id] ?? 0}
            onChange={(value) => setQuantities((prev) => ({ ...prev, [record.id]: value ?? 0 }))}
            addonAfter="件"
            style={{ width: '100%' }}
          />
        ),
      },
      {
        title: '含税单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 180,
        render: (_value, record) => (
          <InputNumber
            min={0}
            precision={2}
            value={unitPrices[record.id] ?? 0}
            onChange={(value) => setUnitPrices((prev) => ({ ...prev, [record.id]: value ?? 0 }))}
            addonAfter="元"
            style={{ width: '100%' }}
          />
        ),
      },
    ];
  }, [quantities, unitPrices]);

  const customerOptions = meta?.customers.map((customer) => ({ label: customer.name, value: customer.id }));
  const logisticsOptions = meta?.logistics.map((item) => ({ label: item.name, value: item.id }));

  return (
    <Modal
      open={open}
      width={920}
      title="成品出库"
      onCancel={onClose}
      okText="确认出库"
      confirmLoading={submitting}
      onOk={handleSubmit}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          message={
            <Space direction="vertical" size={4}>
              <Text>将从「{records[0]?.warehouseName ?? '未选择仓库'}」出库 {rowsWithQuantity.length} 个 SKU。</Text>
              <Text type="secondary">出库成功后库存将实时扣减。</Text>
            </Space>
          }
        />
        <Form<FormValues> layout="vertical" form={form}>
          <Space size={16} wrap style={{ width: '100%' }}>
            <Form.Item label="客户（可选）" name="customerId" style={{ flex: '1 1 220px' }}>
              <Select
                showSearch
                allowClear
                placeholder="选择客户（可为空）"
                optionFilterProp="label"
                options={customerOptions ?? []}
              />
            </Form.Item>
            <Form.Item label="物流公司" name="logisticsProviderId" style={{ flex: '1 1 220px' }}>
              <Select placeholder="选择物流公司" allowClear options={logisticsOptions ?? []} />
            </Form.Item>
            <Form.Item label="出库时间" name="dispatchAt" style={{ flex: '1 1 220px' }}>
              <DatePicker
                showTime
                allowClear
                style={{ width: '100%' }}
                format="YYYY-MM-DD HH:mm"
              />
            </Form.Item>
            <Form.Item label="物流单号" name="trackingNo" style={{ flex: '1 1 220px' }}>
              <Input placeholder="填写物流单号 (可选)" allowClear />
            </Form.Item>
            <Form.Item label="备注" name="remark" style={{ flex: '1 1 100%' }}>
              <Input.TextArea rows={2} placeholder="填写备注" />
            </Form.Item>
          </Space>
        </Form>
        <Table<FinishedGoodsStockRecord>
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={records}
          size="small"
          pagination={false}
          scroll={{ y: 320 }}
        />
      </Space>
    </Modal>
  );
};

export default FinishedGoodsDispatchModal;
