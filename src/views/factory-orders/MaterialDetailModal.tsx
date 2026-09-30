import { Alert, Button, Empty, Modal, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  FactoryOrderMaterialDetail,
  FactoryOrderMaterialItem,
  FactoryOrderMaterialWarehouse,
} from '../../api/factory-orders';
import ListImage from '../../components/common/ListImage';
import type { OrderActionSnapshot } from './types';

type Props = {
  record: OrderActionSnapshot | null;
  data: FactoryOrderMaterialDetail | null;
  loading: boolean;
  onCancel: () => void;
  onCreatePurchase: (materialType: 'fabric' | 'accessory') => void;
};

const formatQuantity = (value: number, unit?: string) => {
  const formatted = Number(value ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
  return unit ? `${formatted} ${unit}` : formatted;
};

const MaterialDetailModal = ({ record, data, loading, onCancel, onCreatePurchase }: Props) => {
  const shortageItems = data?.items.filter((item) => item.shortage) ?? [];
  const hasFabricShortage = shortageItems.some((item) => item.materialType === 'FABRIC');
  const hasAccessoryShortage = shortageItems.some((item) => item.materialType === 'ACCESSORY');

  const columns: ColumnsType<FactoryOrderMaterialItem> = [
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 84,
      render: (value: string | undefined, item) => (
        <ListImage
          src={value}
          alt={item.materialName}
          width={56}
          height={56}
          borderRadius={6}
          fallbackText="暂无"
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'materialType',
      width: 76,
      render: (value: FactoryOrderMaterialItem['materialType']) => (
        <Tag color={value === 'FABRIC' ? 'blue' : 'purple'}>{value === 'FABRIC' ? '面料' : '辅料'}</Tag>
      ),
    },
    {
      title: '面辅料',
      dataIndex: 'materialName',
      width: 190,
      render: (value: string, item) => (
        <div>
          <div>{value}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.materialCode || '-'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '最小规格',
      dataIndex: 'minimumSpecificationLabel',
      width: 150,
      render: (value?: string) => value || '历史未指定规格',
    },
    {
      title: '预计使用',
      dataIndex: 'expectedQty',
      width: 118,
      align: 'right',
      render: (value: number, item) => formatQuantity(value, item.unit),
    },
    {
      title: '实际使用',
      dataIndex: 'actualQty',
      width: 118,
      align: 'right',
      render: (value: number, item) => formatQuantity(value, item.unit),
    },
    {
      title: '使用差异',
      dataIndex: 'varianceQty',
      width: 112,
      align: 'right',
      render: (value: number, item) => {
        const color = value > 0 ? 'red' : value < 0 ? 'green' : undefined;
        const sign = value > 0 ? '+' : '';
        return <Typography.Text type={color === 'red' ? 'danger' : undefined}>{`${sign}${formatQuantity(value, item.unit)}`}</Typography.Text>;
      },
    },
    {
      title: '现存库存',
      dataIndex: 'stockQty',
      width: 118,
      align: 'right',
      render: (value: number, item) => formatQuantity(value, item.unit),
    },
    {
      title: '可用库存',
      dataIndex: 'availableQty',
      width: 118,
      align: 'right',
      render: (value: number, item) => formatQuantity(value, item.unit),
    },
    {
      title: '在途库存',
      dataIndex: 'inTransitQty',
      width: 112,
      align: 'right',
      render: (value: number, item) => formatQuantity(value, item.unit),
    },
    {
      title: '安全库存',
      dataIndex: 'safetyStockQty',
      width: 112,
      align: 'right',
      render: (value: number, item) => formatQuantity(value, item.unit),
    },
    {
      title: '建议采购',
      dataIndex: 'suggestedPurchaseQty',
      width: 124,
      align: 'right',
      render: (value: number, item) => item.shortage
        ? <Typography.Text type="danger" strong>{formatQuantity(value, item.unit)}</Typography.Text>
        : <Typography.Text type="secondary">充足</Typography.Text>,
    },
  ];

  const warehouseColumns: ColumnsType<FactoryOrderMaterialWarehouse> = [
    { title: '仓库', dataIndex: 'warehouseName' },
    { title: '现存库存', dataIndex: 'stockQty', align: 'right', render: (value: number) => formatQuantity(value) },
    { title: '可用库存', dataIndex: 'availableQty', align: 'right', render: (value: number) => formatQuantity(value) },
    { title: '在途库存', dataIndex: 'inTransitQty', align: 'right', render: (value: number) => formatQuantity(value) },
  ];

  return (
    <Modal
      open={Boolean(record)}
      title={record ? `面辅料明细 - ${record.orderCode}` : '面辅料明细'}
      width={1500}
      onCancel={onCancel}
      destroyOnHidden
      footer={(
        <Space wrap>
          <Button onClick={onCancel}>关闭</Button>
          {hasFabricShortage ? (
            <Button type="primary" onClick={() => onCreatePurchase('fabric')}>创建面料采购单</Button>
          ) : null}
          {hasAccessoryShortage ? (
            <Button type="primary" onClick={() => onCreatePurchase('accessory')}>创建辅料采购单</Button>
          ) : null}
        </Space>
      )}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {data?.shortage ? (
          <Alert
            type="warning"
            showIcon
            message="面辅料库存不足"
            description="建议采购量已按“本单预计用量 + 安全库存 − 当前可用库存”计算，在途数量仅供参考。"
          />
        ) : null}
        {data && !data.fullyConfigured ? (
          <Alert
            type="info"
            showIcon
            message="部分订单明细尚未配置面辅料"
            description={`有 ${data.unconfiguredLineCount} 条颜色尺码明细无法核算预计用量，请先完善款式面辅料配置。`}
          />
        ) : null}
        <Table<FactoryOrderMaterialItem>
          size="small"
          bordered
          loading={loading}
          rowKey={(item) => `${item.materialId}::${item.materialMinimumSpecificationId ?? 'legacy'}`}
          dataSource={data?.items ?? []}
          columns={columns}
          pagination={false}
          scroll={{ x: 1432 }}
          locale={{ emptyText: <Empty description="当前订单暂无可核算的面辅料" /> }}
          expandable={{
            rowExpandable: (item) => item.warehouses.length > 0,
            expandedRowRender: (item) => (
              <Table<FactoryOrderMaterialWarehouse>
                size="small"
                rowKey="warehouseId"
                columns={warehouseColumns}
                dataSource={item.warehouses}
                pagination={false}
              />
            ),
          }}
        />
      </Space>
    </Modal>
  );
};

export default MaterialDetailModal;
