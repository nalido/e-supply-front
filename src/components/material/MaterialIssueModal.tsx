import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Modal, Space, Table, Typography, InputNumber, message } from 'antd';
import type { MaterialStockListItem, MaterialStockType } from '../../types/material-stock';
import { materialIssueService } from '../../api/material-inventory';
import type { MaterialIssueCreatePayload } from '../../types/material-issue';

const { Text } = Typography;

export type MaterialIssueModalProps = {
  open: boolean;
  materials: MaterialStockListItem[];
  materialType: MaterialStockType;
  onClose: () => void;
  onIssued: () => void;
};

const MaterialIssueModal = ({ open, materials, materialType, onClose, onIssued }: MaterialIssueModalProps) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuantities({});
    }
  }, [open, materials]);

  const handleQuantityChange = (materialId: string, value: number | null) => {
    setQuantities((prev) => ({
      ...prev,
      [materialId]: value ?? 0,
    }));
  };

  const tableData = useMemo(() => materials, [materials]);

  const rowsWithQuantity = useMemo(() => {
    return tableData.filter((item) => {
      const qty = quantities[item.id];
      return qty !== undefined && qty > 0;
    });
  }, [quantities, tableData]);

  const disabled = !rowsWithQuantity.length || submitting;
  const warehouseName = materials[0]?.warehouseName;

  const columns: ColumnsType<MaterialStockListItem> = useMemo(
    () => [
      {
        title: '物料名称',
        dataIndex: 'materialName',
        key: 'materialName',
        render: (value: string, record) => (
          <Space direction="vertical" size={2}>
            <Text strong>{value}</Text>
            <Text type="secondary">{record.materialCode}</Text>
          </Space>
        ),
      },
      {
        title: '规格',
        dataIndex: 'specification',
        key: 'specification',
        width: 160,
        render: (value?: string) => value || '-',
      },
      {
        title: '可用库存',
        dataIndex: 'availableQty',
        key: 'availableQty',
        width: 140,
        render: (value: number, record) => `${value.toLocaleString('zh-CN')} ${record.unit}`,
      },
      {
        title: '出库数量',
        dataIndex: 'issueQty',
        key: 'issueQty',
        width: 180,
        render: (_value, record) => (
          <InputNumber
            min={0}
            max={record.availableQty}
            precision={0}
            value={quantities[record.id] ?? 0}
            onChange={(val) => handleQuantityChange(record.id, val)}
            addonAfter={record.unit}
            style={{ width: '100%' }}
          />
        ),
      },
    ],
    [quantities],
  );

  const handleSubmit = async () => {
    if (!rowsWithQuantity.length) {
      message.warning('请先填写出库数量');
      return;
    }
    const invalid = rowsWithQuantity.find((item) => {
      const qty = quantities[item.id];
      return !qty || qty <= 0 || qty > item.availableQty;
    });
    if (invalid) {
      message.error('出库数量需大于0且不得超过可用库存');
      return;
    }
    const warehouseId = materials[0]?.warehouseId;
    if (!warehouseId) {
      message.error('无法识别仓库信息，请刷新后重试');
      return;
    }
    const payload: MaterialIssueCreatePayload = {
      warehouseId,
      materialType,
      lines: rowsWithQuantity.map((item) => ({
        materialId: item.materialId,
        quantity: quantities[item.id],
        unit: item.unit,
      })),
    };
    setSubmitting(true);
    try {
      const response = await materialIssueService.createIssue(payload);
      message.success(`出库成功，单号 ${response.issueNo}`);
      onIssued();
    } catch (error) {
      console.error('failed to create material issue', error);
      message.error('出库失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      width={720}
      title="领料出库"
      open={open}
      onCancel={onClose}
      confirmLoading={submitting}
      okButtonProps={{ disabled }}
      okText="出库"
      onOk={handleSubmit}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          message={
            <Space direction="vertical" size={4}>
              <Text>请填写各物料的出库数量，出库后库存将实时扣减。</Text>
              {warehouseName ? (
                <Text type="secondary">出库仓库：{warehouseName}</Text>
              ) : null}
            </Space>
          }
        />
        <Table<MaterialStockListItem>
          rowKey="id"
          dataSource={tableData}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ y: 360 }}
        />
        <Text type="secondary">
          已填写数量的物料：<Text strong>{rowsWithQuantity.length}</Text> 项
        </Text>
      </Space>
    </Modal>
  );
};

export default MaterialIssueModal;
