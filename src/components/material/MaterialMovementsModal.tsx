import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { DatePicker, Modal, Space, Table, Tag, Typography, message } from 'antd';
import type { Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import { materialStockService } from '../../api/material-inventory';
import type {
  MaterialMovementListResponse,
  MaterialMovementRecord,
  MaterialMovementSummary,
  MaterialStockListItem,
} from '../../types/material-stock';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const EMPTY_SUMMARY: MaterialMovementSummary = {
  stockQty: 0,
  availableQty: 0,
  inTransitQty: 0,
  openingQty: 0,
  inboundQty: 0,
  outboundQty: 0,
  closingQty: 0,
};

type MaterialMovementsModalProps = {
  open: boolean;
  material: MaterialStockListItem | null;
  onClose: () => void;
};

const MaterialMovementsModal = ({ open, material, onClose }: MaterialMovementsModalProps) => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<MaterialMovementRecord[]>([]);
  const [summary, setSummary] = useState<MaterialMovementSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setRecords([]);
    setTotal(0);
    setSummary(EMPTY_SUMMARY);
  };

  useEffect(() => {
    if (!open) {
      setPage(1);
      setPageSize(PAGE_SIZE_OPTIONS[0]);
      setDateRange(null);
      resetState();
      return;
    }
    if (material) {
      setPage(1);
      setDateRange(null);
    }
  }, [material, open]);

  const fetchMovements = useCallback(async () => {
    if (!open || !material) {
      resetState();
      return;
    }
    setLoading(true);
    try {
      const [start, end] = dateRange ?? [];
      const params = {
        materialId: material.materialId,
        materialMinimumSpecificationId: material.materialMinimumSpecificationId,
        warehouseId: material.warehouseId,
        startDate: start ? start.format('YYYY-MM-DD') : undefined,
        endDate: end ? end.format('YYYY-MM-DD') : undefined,
        page,
        pageSize,
      };
      const response: MaterialMovementListResponse = await materialStockService.getMovements(params);
      setRecords(response.list);
      setTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load material movements', error);
      message.error('获取进出明细失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [dateRange, material, open, page, pageSize]);

  useEffect(() => {
    void fetchMovements();
  }, [fetchMovements]);

  const handleRangeChange = (value: [Dayjs | null, Dayjs | null] | null) => {
    if (value?.[0] && value?.[1]) {
      setDateRange([value[0], value[1]]);
    } else {
      setDateRange(null);
    }
    setPage(1);
  };

  const handlePageChange = (nextPage: number, nextSize?: number) => {
    setPage(nextPage);
    if (nextSize && nextSize !== pageSize) {
      setPageSize(nextSize);
    }
  };

  const columns: ColumnsType<MaterialMovementRecord> = useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'occurredAt',
        width: 160,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '类型',
        dataIndex: 'movementLabel',
        width: 140,
        render: (value: string, record) => (
          <Space size={4}>
            <Tag color={record.direction === 'in' ? 'green' : record.direction === 'out' ? 'red' : 'default'}>
              {record.directionLabel}
            </Tag>
            <Text>{value}</Text>
          </Space>
        ),
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        width: 120,
        align: 'right',
        render: (value: number, record) => {
          const sign = record.direction === 'out' ? -1 : 1;
          const display = sign * value;
          return (
            <Text type={sign >= 0 ? 'success' : 'danger'}>{`${display > 0 ? '+' : ''}${display} ${record.unit ?? ''}`}</Text>
          );
        },
      },
      {
        title: '变动后结存',
        dataIndex: 'balanceAfter',
        width: 130,
        align: 'right',
        render: (value: number, record) => `${value} ${record.unit ?? ''}`,
      },
      {
        title: '仓库',
        dataIndex: 'warehouseName',
        width: 140,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '对象',
        dataIndex: 'counterpart',
        width: 180,
        ellipsis: true,
        render: (value?: string) => value ?? '-',
      },
      {
        title: '关联单据',
        dataIndex: 'documentNo',
        width: 180,
        ellipsis: true,
        render: (_value, record) => {
          const label = record.documentNo ?? record.documentType ?? '-';
          let target: string | null = null;
          if (record.documentType === 'MATERIAL_RECEIPT' || record.documentType === 'MATERIAL_RECEIPT_VOID') {
            target = `/material/purchase-prep?keyword=${encodeURIComponent(label)}`;
          } else if (record.documentType === 'MATERIAL_ISSUE') {
            target = `/material/issue?keyword=${encodeURIComponent(label)}`;
          } else if (record.workOrderId) {
            target = `/orders/cutting/pending?workOrderId=${encodeURIComponent(record.workOrderId)}&openDetail=1`;
          } else if (record.productionOrderNo) {
            target = `/orders/factory?keyword=${encodeURIComponent(record.productionOrderNo)}`;
          }
          return target ? <Link to={target}>{label}</Link> : label;
        },
      },
      {
        title: '备注',
        dataIndex: 'remark',
        ellipsis: true,
        render: (value?: string) => value ?? '-',
      },
    ],
    [],
  );

  const materialHeader = useMemo(() => {
    if (!material) {
      return null;
    }
    return (
      <Space direction="vertical" size={4}>
        <Text strong>{material.materialName}</Text>
        <Text type="secondary">
          {material.materialCode} · {material.specification ?? '未知规格'}
        </Text>
        <Text type="secondary">所在仓库：{material.warehouseName}</Text>
      </Space>
    );
  }, [material]);

  const summaryItems = [
    { label: '当前库存', value: summary.stockQty },
    { label: '当前可用', value: summary.availableQty },
    { label: '采购在途', value: summary.inTransitQty },
    { label: '期初', value: summary.openingQty },
    { label: '期间入库', value: summary.inboundQty },
    { label: '期间出库', value: summary.outboundQty },
    { label: '期末结存', value: summary.closingQty },
  ];

  return (
    <Modal
      title="进出明细"
      width={1200}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {materialHeader}
          <div className="oc-summary-strip">
            {summaryItems.map((item) => (
              <div key={item.label} className="oc-summary-chip">
                <div className="oc-summary-chip__label">{item.label}</div>
                <div className="oc-summary-chip__value">{item.value}</div>
              </div>
            ))}
          </div>
          <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size={12} align="center">
              <Text>时间范围：</Text>
              <RangePicker
                value={dateRange}
                onChange={handleRangeChange}
                allowClear
                format="YYYY-MM-DD"
              />
            </Space>
            <Text type="secondary">不选日期时显示全部历史，共 {total} 条记录</Text>
          </Space>
        </Space>

        <Table<MaterialMovementRecord>
          rowKey={(record) => record.id}
          dataSource={records}
          columns={columns}
          loading={loading}
          scroll={{ x: 1320, y: 420 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
            onChange: handlePageChange,
          }}
        />
      </Space>
    </Modal>
  );
};

export default MaterialMovementsModal;
