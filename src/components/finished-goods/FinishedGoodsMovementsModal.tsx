import { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker, Modal, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import { finishedGoodsStockService } from '../../api/finished-goods';
import type {
  FinishedGoodsStockMovementRecord,
  FinishedGoodsStockMovementSummary,
  FinishedGoodsStockStyleRecord,
} from '../../types/finished-goods-stock';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const EMPTY_SUMMARY: FinishedGoodsStockMovementSummary = {
  stockQty: 0,
  availableQty: 0,
  openingQty: 0,
  inboundQty: 0,
  outboundQty: 0,
  closingQty: 0,
};

type Props = {
  open: boolean;
  style: FinishedGoodsStockStyleRecord | null;
  onClose: () => void;
};

const FinishedGoodsMovementsModal = ({ open, style, onClose }: Props) => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FinishedGoodsStockMovementRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<FinishedGoodsStockMovementSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    setPage(1);
    setDateRange(null);
  }, [open, style]);

  const load = useCallback(async () => {
    if (!open || !style) return;
    setLoading(true);
    try {
      const response = await finishedGoodsStockService.getStyleMovements(style.styleId, style.warehouseId, {
        startDate: dateRange?.[0].format('YYYY-MM-DD'),
        endDate: dateRange?.[1].format('YYYY-MM-DD'),
        page,
        pageSize,
      });
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load finished goods movements', error);
      message.error('获取成品出入库流水失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [dateRange, open, page, pageSize, style]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<FinishedGoodsStockMovementRecord> = useMemo(() => [
    { title: '时间', dataIndex: 'occurredAt', width: 170, render: (value?: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-' },
    {
      title: '类型', dataIndex: 'movementLabel', width: 130,
      render: (value: string, record) => (
        <Space size={4}>
          <Tag color={record.direction === 'in' ? 'green' : 'red'}>{record.direction === 'in' ? '入库' : '出库'}</Tag>
          <Text>{value}</Text>
        </Space>
      ),
    },
    {
      title: '数量', dataIndex: 'quantity', width: 110, align: 'right',
      render: (value: number, record) => (
        <Text type={record.direction === 'out' ? 'danger' : 'success'}>
          {record.direction === 'out' ? '-' : '+'}{value} {style?.unit ?? '件'}
        </Text>
      ),
    },
    { title: '变动后结存', dataIndex: 'balanceAfter', width: 120, align: 'right' },
    { title: '仓库', dataIndex: 'warehouseName', width: 130, render: (value?: string) => value ?? '-' },
    {
      title: '关联单据', dataIndex: 'documentNo', width: 180,
      render: (value: string | undefined, record) => {
        const label = value ?? '-';
        const target = record.documentType === 'FINISHED_GOODS_RECEIPT'
          ? `/product/inbound/received?keyword=${encodeURIComponent(label)}`
          : record.documentType === 'FINISHED_GOODS_DISPATCH'
            ? `/product/outbound?keyword=${encodeURIComponent(label)}`
            : null;
        return target ? <Link to={target}>{label}</Link> : label;
      },
    },
    {
      title: '生产订单', dataIndex: 'productionOrderNo', width: 160,
      render: (value?: string) => value
        ? <Link to={`/orders/factory?keyword=${encodeURIComponent(value)}&status=all`}>{value}</Link>
        : '-',
    },
  ], [style?.unit]);

  const summaryItems = [
    { label: '当前库存', value: summary.stockQty },
    { label: '当前可用', value: summary.availableQty },
    { label: '期初', value: summary.openingQty },
    { label: '期间入库', value: summary.inboundQty },
    { label: '期间出库', value: summary.outboundQty },
    { label: '期末结存', value: summary.closingQty },
  ];

  return (
    <Modal title="成品出入库流水" width={1120} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space direction="vertical" size={2}>
          <Text strong>{style?.styleNo} · {style?.styleName}</Text>
          <Text type="secondary">{style?.warehouseName}，不选日期时显示全部历史</Text>
        </Space>
        <div className="oc-summary-strip">
          {summaryItems.map((item) => (
            <div key={item.label} className="oc-summary-chip">
              <div className="oc-summary-chip__label">{item.label}</div>
              <div className="oc-summary-chip__value">{item.value}</div>
            </div>
          ))}
        </div>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <RangePicker
            value={dateRange}
            allowClear
            onChange={(value) => {
              setDateRange(value?.[0] && value?.[1] ? [value[0], value[1]] : null);
              setPage(1);
            }}
          />
          <Text type="secondary">共 {total} 条记录</Text>
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={records}
          columns={columns}
          scroll={{ x: 1040, y: 420 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Space>
    </Modal>
  );
};

export default FinishedGoodsMovementsModal;
