import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { DatePicker, Modal, Space, Table, Tag, Typography, message } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { materialStockService } from '../../api/material-inventory';
import type {
  MaterialMovementListResponse,
  MaterialMovementRecord,
  MaterialStockListItem,
} from '../../types/material-stock';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_RANGE_DAYS = 30;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const buildDefaultRange = (): [Dayjs, Dayjs] => [
  dayjs().subtract(DEFAULT_RANGE_DAYS - 1, 'day'),
  dayjs(),
];

type MaterialMovementsModalProps = {
  open: boolean;
  material: MaterialStockListItem | null;
  onClose: () => void;
};

const MaterialMovementsModal = ({ open, material, onClose }: MaterialMovementsModalProps) => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(buildDefaultRange);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<MaterialMovementRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setRecords([]);
    setTotal(0);
  };

  useEffect(() => {
    if (!open) {
      setPage(1);
      setPageSize(PAGE_SIZE_OPTIONS[0]);
      setDateRange(buildDefaultRange());
      resetState();
      return;
    }
    if (material) {
      setPage(1);
      setDateRange(buildDefaultRange());
    }
  }, [material, open]);

  const fetchMovements = useCallback(async () => {
    if (!open || !material) {
      resetState();
      return;
    }
    setLoading(true);
    try {
      const [start, end] = dateRange;
      const params = {
        materialId: material.materialId,
        warehouseId: material.warehouseId,
        startDate: start ? start.format('YYYY-MM-DD') : undefined,
        endDate: end ? end.format('YYYY-MM-DD') : undefined,
        page,
        pageSize,
      };
      const response: MaterialMovementListResponse = await materialStockService.getMovements(params);
      setRecords(response.list);
      setTotal(response.total);
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

  const handleRangeChange = (value: null | [Dayjs, Dayjs]) => {
    if (value) {
      setDateRange(value);
    } else {
      setDateRange(buildDefaultRange());
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
        render: (_value, record) => record.documentNo ?? record.documentType ?? '-',
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

  return (
    <Modal
      title="进出明细"
      width={960}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {materialHeader}
          <Space wrap align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size={12} align="center">
              <Text>时间范围：</Text>
              <RangePicker
                value={dateRange}
                onChange={handleRangeChange}
                allowEmpty={[false, false]}
                format="YYYY-MM-DD"
              />
            </Space>
            <Text type="secondary">共 {total} 条记录</Text>
          </Space>
        </Space>

        <Table<MaterialMovementRecord>
          rowKey={(record) => record.id}
          dataSource={records}
          columns={columns}
          loading={loading}
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
