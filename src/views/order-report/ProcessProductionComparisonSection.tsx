import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import {
  Button,
  Card,
  Empty,
  Input,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { processProductionComparisonReportService } from '../../api/mock';
import type {
  ProcessProductionDetailParams,
  ProcessProductionDisplayMode,
  ProcessProductionLot,
  ProcessProductionLotListParams,
  ProcessProductionSkuRecord,
  ProcessProductionStep,
} from '../../types/process-production-comparison-report';

const { Text } = Typography;

const LOT_PAGE_SIZE = 6;
const LOT_PAGE_OPTIONS = [6, 8, 10];
const DETAIL_PAGE_SIZE = 20;
const DETAIL_PAGE_OPTIONS = [20, 30, 50];

const numberFormatter = new Intl.NumberFormat('zh-CN');

const formatNumber = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return numberFormatter.format(Math.round(value));
};

const buildLotParams = (
  page: number,
  pageSize: number,
  keyword: string,
): ProcessProductionLotListParams => ({
  page,
  pageSize,
  keyword: keyword.trim() || undefined,
});

const buildDetailParams = (
  lotId: string,
  page: number,
  pageSize: number,
  ticketKeyword?: string,
  colorKeyword?: string,
  sizeKeyword?: string,
): ProcessProductionDetailParams => ({
  lotId,
  page,
  pageSize,
  ticketKeyword: ticketKeyword?.trim() || undefined,
  colorKeyword: colorKeyword?.trim() || undefined,
  sizeKeyword: sizeKeyword?.trim() || undefined,
});

const ProcessProductionComparisonSection = () => {
  const [lots, setLots] = useState<ProcessProductionLot[]>([]);
  const [lotTotal, setLotTotal] = useState(0);
  const [lotKeyword, setLotKeyword] = useState('');
  const [lotPage, setLotPage] = useState(1);
  const [lotPageSize, setLotPageSize] = useState(LOT_PAGE_SIZE);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [activeLot, setActiveLot] = useState<ProcessProductionLot | null>(null);

  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(DETAIL_PAGE_SIZE);
  const [detailTotal, setDetailTotal] = useState(0);
  const [records, setRecords] = useState<ProcessProductionSkuRecord[]>([]);
  const [processes, setProcesses] = useState<ProcessProductionStep[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalSku: 0,
    totalQuantity: 0,
    totalCompleted: 0,
    bottleneckProcessKey: undefined as string | undefined,
  });

  const [ticketKeyword, setTicketKeyword] = useState('');
  const [colorKeyword, setColorKeyword] = useState('');
  const [sizeKeyword, setSizeKeyword] = useState('');
  const [appliedTicketKeyword, setAppliedTicketKeyword] = useState<string | undefined>(undefined);
  const [appliedColorKeyword, setAppliedColorKeyword] = useState<string | undefined>(undefined);
  const [appliedSizeKeyword, setAppliedSizeKeyword] = useState<string | undefined>(undefined);
  const [displayMode, setDisplayMode] = useState<ProcessProductionDisplayMode>('completed');
  const [exporting, setExporting] = useState(false);

  const loadLots = useCallback(async () => {
    setLotsLoading(true);
    try {
      const params = buildLotParams(lotPage, lotPageSize, lotKeyword);
      const response = await processProductionComparisonReportService.getLots(params);
      setLots(response.list);
      setLotTotal(response.total);
      if (response.list.length) {
        const currentId = activeLot?.id;
        if (!currentId || !response.list.some((item) => item.id === currentId)) {
          setActiveLot(response.list[0]);
        }
      } else {
        setActiveLot(null);
      }
    } catch (error) {
      console.error('failed to load process production lots', error);
      message.error('获取裁床批次失败');
    } finally {
      setLotsLoading(false);
    }
  }, [lotKeyword, lotPage, lotPageSize, activeLot?.id]);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  useEffect(() => {
    setDetailPage(1);
  }, [activeLot?.id, appliedTicketKeyword, appliedColorKeyword, appliedSizeKeyword]);

  const loadDetails = useCallback(async () => {
    if (!activeLot) {
      setRecords([]);
      setProcesses([]);
      setDetailTotal(0);
      setSummary({ totalSku: 0, totalQuantity: 0, totalCompleted: 0, bottleneckProcessKey: undefined });
      return;
    }
    setDetailLoading(true);
    try {
      const params = buildDetailParams(
        activeLot.id,
        detailPage,
        detailPageSize,
        appliedTicketKeyword,
        appliedColorKeyword,
        appliedSizeKeyword,
      );
      const response = await processProductionComparisonReportService.getDetails(params);
      setRecords(response.list);
      setProcesses(response.processes);
      setDetailTotal(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('failed to load process production details', error);
      message.error('获取工序进度失败');
    } finally {
      setDetailLoading(false);
    }
  }, [activeLot, detailPage, detailPageSize, appliedTicketKeyword, appliedColorKeyword, appliedSizeKeyword]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const lotColumns: ColumnsType<ProcessProductionLot> = useMemo(
    () => [
      {
        title: '订单编号',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 160,
        ellipsis: true,
      },
      {
        title: '款号',
        dataIndex: 'styleNumber',
        key: 'styleNumber',
        width: 120,
      },
      {
        title: '款名',
        dataIndex: 'styleName',
        key: 'styleName',
        width: 200,
        ellipsis: true,
      },
      {
        title: '床次',
        dataIndex: 'bedNumber',
        key: 'bedNumber',
        width: 120,
      },
      {
        title: '颜色',
        dataIndex: 'color',
        key: 'color',
        width: 120,
      },
      {
        title: '裁床时间',
        dataIndex: 'cuttingDate',
        key: 'cuttingDate',
        width: 160,
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        key: 'quantity',
        align: 'right',
        width: 120,
        render: (value: number) => formatNumber(value),
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        ellipsis: true,
      },
    ],
    [],
  );

  const lotPagination = useMemo(
    () => ({
      current: lotPage,
      pageSize: lotPageSize,
      total: lotTotal,
      showSizeChanger: true,
      pageSizeOptions: LOT_PAGE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
      onChange: (page: number, size: number) => {
        setLotPage(page);
        setLotPageSize(size);
      },
    }),
    [lotPage, lotPageSize, lotTotal],
  );

  const handleLotSearch = () => {
    setLotPage(1);
    void loadLots();
  };

  const handleLotReset = () => {
    setLotKeyword('');
    setLotPage(1);
    setLotPageSize(LOT_PAGE_SIZE);
  };

  const handleDetailSearch = () => {
    setAppliedTicketKeyword(ticketKeyword.trim() || undefined);
    setAppliedColorKeyword(colorKeyword.trim() || undefined);
    setAppliedSizeKeyword(sizeKeyword.trim() || undefined);
  };

  const handleDetailReset = () => {
    setTicketKeyword('');
    setColorKeyword('');
    setSizeKeyword('');
    setAppliedTicketKeyword(undefined);
    setAppliedColorKeyword(undefined);
    setAppliedSizeKeyword(undefined);
    setDetailPage(1);
    setDetailPageSize(DETAIL_PAGE_SIZE);
  };

  const detailPagination = useMemo<TableProps<ProcessProductionSkuRecord>['pagination']>(
    () => ({
      current: detailPage,
      pageSize: detailPageSize,
      total: detailTotal,
      showSizeChanger: true,
      pageSizeOptions: DETAIL_PAGE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [detailPage, detailPageSize, detailTotal],
  );

  const handleDetailTableChange: TableProps<ProcessProductionSkuRecord>['onChange'] = (pagination) => {
    if (!pagination) {
      return;
    }
    const nextPage = pagination.current ?? 1;
    const nextSize = pagination.pageSize ?? detailPageSize;
    if (nextSize !== detailPageSize) {
      setDetailPageSize(nextSize);
      setDetailPage(1);
    } else if (nextPage !== detailPage) {
      setDetailPage(nextPage);
    }
  };

  const baseColumns: ColumnsType<ProcessProductionSkuRecord> = useMemo(
    () => [
      {
        title: '菲票编号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 160,
        fixed: 'left',
      },
      {
        title: '颜色',
        dataIndex: 'color',
        key: 'color',
        width: 120,
        fixed: 'left',
      },
      {
        title: '尺码',
        dataIndex: 'size',
        key: 'size',
        width: 100,
      },
      {
        title: '合计数量',
        dataIndex: 'totalQuantity',
        key: 'totalQuantity',
        width: 140,
        align: 'right',
        render: (value: number) => formatNumber(value),
      },
    ],
    [],
  );

  const processColumns = useMemo<ColumnsType<ProcessProductionSkuRecord>>(
    () => {
      if (!processes.length) {
        return [];
      }
      return processes.map((process) => {
        const processKey = process.key;
        const header = (
          <Space direction="vertical" size={4} align="start">
            <Text>{process.name}</Text>
            <Space size={6} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                完成 {formatNumber(process.completedQuantity)} / {formatNumber(process.targetQuantity)}
              </Text>
              {process.wipQuantity !== undefined ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  在制 {formatNumber(process.wipQuantity)}
                </Text>
              ) : null}
              {process.bottleneck ? (
                <Tag color="volcano" icon={<WarningOutlined />}>瓶颈</Tag>
              ) : null}
            </Space>
          </Space>
        );

        return {
          title: header,
          dataIndex: ['processMap', processKey],
          key: processKey,
          width: 140,
          align: 'right' as const,
          render: (_value: unknown, record: ProcessProductionSkuRecord) => {
            const cell = record.processMap[processKey];
            if (!cell) {
              return '-';
            }
            const displayValue = displayMode === 'completed' ? cell.completed : cell.remaining;
            const tooltipTitle = (
              <Space direction="vertical" size={0}>
                <span>完成：{formatNumber(cell.completed)}</span>
                <span>待完：{formatNumber(cell.remaining)}</span>
              </Space>
            );
            return (
              <Tooltip title={tooltipTitle} placement="top">
                <span>{formatNumber(displayValue)}</span>
              </Tooltip>
            );
          },
        };
      });
    }, [processes, displayMode]);

  const detailColumns = useMemo(
    () => [...baseColumns, ...processColumns],
    [baseColumns, processColumns],
  );

  const scrollX = useMemo(() => 520 + processes.length * 140, [processes.length]);

  const bottleneckProcess = useMemo(
    () => processes.find((item) => item.key === summary.bottleneckProcessKey) ?? null,
    [processes, summary.bottleneckProcessKey],
  );

  const handleExport = async () => {
    if (!activeLot) {
      message.warning('请选择需要导出的裁床批次');
      return;
    }
    setExporting(true);
    try {
      const result = await processProductionComparisonReportService.export({
        lotId: activeLot.id,
        ticketKeyword: appliedTicketKeyword,
        colorKeyword: appliedColorKeyword,
        sizeKeyword: appliedSizeKeyword,
        mode: displayMode,
      });
      message.success('导出任务已生成，请稍后在下载中心查看');
      console.info('mock export url', result.fileUrl);
    } catch (error) {
      console.error('failed to export process production matrix', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        bordered={false}
        title="裁床批次"
        extra={
          <Space size={8}>
            <Input
              allowClear
              value={lotKeyword}
              onChange={(event) => setLotKeyword(event.target.value)}
              placeholder="请输入订单号/款号/床次/备注"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              onPressEnter={handleLotSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleLotSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleLotReset}>
              重置
            </Button>
          </Space>
        }
      >
        <Table<ProcessProductionLot>
          rowKey={(record) => record.id}
          dataSource={lots}
          columns={lotColumns}
          loading={lotsLoading}
          pagination={lotPagination}
          size="small"
          rowClassName={(record) => (record.id === activeLot?.id ? 'ant-table-row-selected' : '')}
          onRow={(record) => ({
            onClick: () => {
              setActiveLot(record);
            },
          })}
        />
      </Card>

      <Card
        bordered={false}
        title="工序进度明细"
        extra={
          <Space size={12} wrap>
            <Segmented
              value={displayMode}
              onChange={(value) => setDisplayMode(value as ProcessProductionDisplayMode)}
              options={[
                { label: '完成数量', value: 'completed' },
                { label: '待完成数量', value: 'remaining' },
              ]}
            />
            <Input
              allowClear
              value={ticketKeyword}
              onChange={(event) => setTicketKeyword(event.target.value)}
              placeholder="回车搜索(菲票编号)"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              onPressEnter={handleDetailSearch}
            />
            <Input
              allowClear
              value={colorKeyword}
              onChange={(event) => setColorKeyword(event.target.value)}
              placeholder="回车搜索(颜色)"
              prefix={<SearchOutlined />}
              style={{ width: 180 }}
              onPressEnter={handleDetailSearch}
            />
            <Input
              allowClear
              value={sizeKeyword}
              onChange={(event) => setSizeKeyword(event.target.value)}
              placeholder="回车搜索(尺码)"
              prefix={<SearchOutlined />}
              style={{ width: 160 }}
              onPressEnter={handleDetailSearch}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleDetailSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleDetailReset}>
              重置
            </Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
              导出Excel
            </Button>
          </Space>
        }
      >
        {activeLot ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={24} wrap>
              <Text type="secondary">
                当前床次：<Text strong>{activeLot.bedNumber}</Text>
              </Text>
              <Text type="secondary">
                订单：<Text strong>{activeLot.orderNumber}</Text>
              </Text>
              <Text type="secondary">
                款式：<Text strong>{activeLot.styleNumber}</Text> {activeLot.styleName}
              </Text>
              <Text type="secondary">
                剪裁数量：<Text strong>{formatNumber(activeLot.quantity)}</Text>
              </Text>
            </Space>
            <Space size={24} wrap>
              <Text type="secondary">
                SKU数量：<Text strong>{formatNumber(summary.totalSku)}</Text>
              </Text>
              <Text type="secondary">
                总件数：<Text strong>{formatNumber(summary.totalQuantity)}</Text>
              </Text>
              <Text type="secondary">
                已完成：<Text strong>{formatNumber(summary.totalCompleted)}</Text>
              </Text>
              {bottleneckProcess ? (
                <Text type="danger">
                  瓶颈工序：<Tag color="volcano" icon={<WarningOutlined />}>{bottleneckProcess.name}</Tag>
                </Text>
              ) : null}
            </Space>
            <Table<ProcessProductionSkuRecord>
              rowKey={(record) => record.id}
              dataSource={records}
              columns={detailColumns}
              loading={detailLoading}
              pagination={detailPagination}
              onChange={handleDetailTableChange}
              scroll={{ x: scrollX }}
              size="middle"
            />
          </Space>
        ) : (
          <Empty description="请先选择上方的裁床批次" />
        )}
      </Card>
    </Space>
  );
};

export default ProcessProductionComparisonSection;
