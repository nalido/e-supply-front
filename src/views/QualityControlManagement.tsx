import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Timeline,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { pieceworkService } from '../api/piecework';
import type {
  QualityControlCreatePayload,
  QualityControlListParams,
  QualityControlMeta,
  QualityControlRecord,
  QualityDisposition,
  QualityInspectionStatus,
  QualityExceptionLog,
} from '../types/quality-control-management';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 30, 50];

const numberFormatter = new Intl.NumberFormat('zh-CN');
const EMPTY_SUMMARY = { inspectedQty: 0, passedQty: 0, failedQty: 0, reworkQty: 0 };

const formatNumber = (value?: number) => numberFormatter.format(Math.round(value ?? 0));

const statusLabelMap: Record<QualityInspectionStatus, string> = {
  passed: '合格',
  failed: '不合格',
  rework: '返工',
};

const statusColorMap: Record<QualityInspectionStatus, string> = {
  passed: 'green',
  failed: 'red',
  rework: 'orange',
};

const exceptionStatusMap: Record<NonNullable<QualityControlRecord['exceptionStatus']>, { label: string; color: string }> = {
  none: { label: '无异常', color: 'default' },
  pending: { label: '待处理', color: 'red' },
  resolved: { label: '已处理', color: 'blue' },
};

const dispositionOptions: Array<{ label: string; value: QualityDisposition }> = [
  { label: '合格', value: 'accepted' },
  { label: '返工', value: 'rework' },
  { label: '报废', value: 'scrap' },
];

const resolveStatus = (record: QualityControlRecord): QualityInspectionStatus => {
  if (record.disposition === 'accepted') {
    return 'passed';
  }
  if (record.disposition === 'scrap') {
    return 'failed';
  }
  return 'rework';
};

const formatRangeValue = (range: [Dayjs | null, Dayjs | null]) => {
  const [start, end] = range;
  return {
    startDate: start ? start.format('YYYY-MM-DD') : undefined,
    endDate: end ? end.format('YYYY-MM-DD') : undefined,
  };
};

type AppliedFilters = {
  keyword?: string;
  workOrderId?: string;
  status: QualityInspectionStatus | 'all';
  inspectorId?: string;
  startDate?: string;
  endDate?: string;
};

const createDefaultFilters = (status: QualityInspectionStatus | 'all'): AppliedFilters => ({
  keyword: undefined,
  workOrderId: undefined,
  status,
  inspectorId: undefined,
  startDate: undefined,
  endDate: undefined,
});

const QualityControlManagement = () => {
  const [meta, setMeta] = useState<QualityControlMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [records, setRecords] = useState<QualityControlRecord[]>([]);
  const [summary, setSummary] = useState({ inspectedQty: 0, passedQty: 0, failedQty: 0, reworkQty: 0 });
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [keyword, setKeyword] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [status, setStatus] = useState<QualityInspectionStatus | 'all'>('all');
  const [inspectorId, setInspectorId] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(() => createDefaultFilters('all'));
  const [exporting, setExporting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<{
    workOrderId: string;
    inspectorId: string;
    qcDate: Dayjs;
    inspectedQty: number;
    passedQty: number;
    failedQty: number;
    defectReason?: string;
    disposition: QualityDisposition;
  }>();
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<QualityControlRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [exceptionLogs, setExceptionLogs] = useState<QualityExceptionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const response = await pieceworkService.getQualityMeta();
        if (mounted) {
          setMeta(response);
          setStatus(response.defaultStatus ?? 'all');
          setAppliedFilters(createDefaultFilters(response.defaultStatus ?? 'all'));
        }
      } catch (error) {
        console.error('failed to load quality control meta', error);
        if (mounted) {
          message.error('加载质检配置失败');
        }
      } finally {
        if (mounted) {
          setMetaLoading(false);
        }
      }
    };
    void loadMeta();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!meta) {
      return;
    }
    if (meta.defaultStatus !== undefined && meta.defaultStatus !== status) {
      setStatus(meta.defaultStatus);
      setAppliedFilters(createDefaultFilters(meta.defaultStatus));
      setPage(1);
      setInspectorId('');
    }
  }, [meta, status]);

  const loadList = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: QualityControlListParams = {
        page,
        pageSize,
        keyword: appliedFilters.keyword,
        workOrderId: appliedFilters.workOrderId,
        status: appliedFilters.status,
        inspectorId: appliedFilters.inspectorId,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      };
      if (!params.keyword) {
        delete params.keyword;
      }
      if (!params.workOrderId) {
        delete params.workOrderId;
      }
      if (!params.inspectorId) {
        delete params.inspectorId;
      }
      if (!params.startDate) {
        delete params.startDate;
      }
      if (!params.endDate) {
        delete params.endDate;
      }
      if (!params.status || params.status === 'all') {
        delete params.status;
      }
      const response = await pieceworkService.getQualityList(params);
      const nextPageSize = response.pageSize ?? pageSize;
      const totalCount = response.total ?? 0;
      const calculatedMaxPage = nextPageSize > 0 ? Math.ceil(totalCount / nextPageSize) : 0;
      const effectiveMaxPage = calculatedMaxPage === 0 ? 1 : calculatedMaxPage;
      if (page > effectiveMaxPage) {
        setPage(effectiveMaxPage);
        return;
      }
      setRecords(response.list);
      setTotal(totalCount);
      setSummary(response.summary ?? { ...EMPTY_SUMMARY });
      if (response.page && response.page !== page) {
        setPage(response.page);
      }
      if (response.pageSize && response.pageSize !== pageSize) {
        setPageSize(response.pageSize);
      }
    } catch (error) {
      console.error('failed to load quality control list', error);
      message.error('获取质检记录失败');
    } finally {
      setTableLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearch = () => {
    const { startDate, endDate } = formatRangeValue(dateRange);
    setAppliedFilters({
      keyword: keyword.trim() || undefined,
      workOrderId: workOrderId.trim() || undefined,
      status,
      inspectorId: inspectorId ? inspectorId : undefined,
      startDate,
      endDate,
    });
    setPage(1);
  };

  const handleReset = () => {
    setKeyword('');
    setWorkOrderId('');
    const defaultStatus = meta?.defaultStatus ?? 'all';
    setStatus(defaultStatus);
    setInspectorId('');
    setDateRange([null, null]);
    setAppliedFilters(createDefaultFilters(defaultStatus));
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleOpenCreateModal = () => {
    createForm.resetFields();
    setCreateModalOpen(true);
  };

  const handleCreateInspection = async () => {
    try {
      const values = await createForm.validateFields();
      const payload: QualityControlCreatePayload = {
        workOrderId: values.workOrderId?.trim(),
        inspectorId: values.inspectorId,
        qcDate: values.qcDate?.toDate().toISOString() ?? new Date().toISOString(),
        inspectedQty: Number(values.inspectedQty),
        passedQty: Number(values.passedQty),
        failedQty: Number(values.failedQty),
        defectReason: values.defectReason?.trim() || undefined,
        disposition: values.disposition,
      } as QualityControlCreatePayload;
      setCreating(true);
      await pieceworkService.createQualityInspection(payload);
      message.success('质检记录已创建');
      setCreateModalOpen(false);
      createForm.resetFields();
      void loadList();
    } catch (error) {
      const validationError = error as ValidateErrorEntity<unknown> | undefined;
      if (validationError?.errorFields) {
        return;
      }
      console.error('failed to create quality inspection', error);
      message.error('录入失败，请稍后重试');
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = useCallback(async (record: QualityControlRecord) => {
    setDetailDrawerOpen(true);
    setDetailLoading(true);
    setLogsLoading(true);
    setExceptionLogs([]);
    try {
      const detail = await pieceworkService.getQualityDetail(record.id);
      setDetailRecord(detail);
      setResolutionNote('');
    } catch (error) {
      console.error('failed to load quality detail', error);
      message.error('加载质检详情失败');
      setDetailDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
    try {
      const logs = await pieceworkService.getQualityExceptionLogs(record.id);
      setExceptionLogs(logs);
    } catch (error) {
      console.error('failed to load quality logs', error);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleResolveException = async () => {
    if (!detailRecord) {
      return;
    }
    setResolving(true);
    try {
      const updated = await pieceworkService.resolveQualityException(detailRecord.id, {
        note: resolutionNote.trim() || undefined,
      });
      setDetailRecord(updated);
      setResolutionNote('');
      message.success('异常已标记处理');
      void loadList();
    } catch (error) {
      console.error('failed to resolve quality exception', error);
      message.error('标记异常失败，请稍后重试');
    } finally {
      setResolving(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailDrawerOpen(false);
    setDetailRecord(null);
    setDetailLoading(false);
    setResolutionNote('');
    setResolving(false);
  };

  const renderExceptionStatusTag = (status?: QualityControlRecord['exceptionStatus']) => {
    const resolvedStatus = status ?? 'none';
    const meta = exceptionStatusMap[resolvedStatus];
    if (!meta || resolvedStatus === 'none') {
      return <Tag color="default">无异常</Tag>;
    }
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  const pagination = useMemo<TableProps<QualityControlRecord>['pagination']>(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (value: number) => `共 ${value} 条`,
    }),
    [page, pageSize, total],
  );

  const handleTableChange: TableProps<QualityControlRecord>['onChange'] = (paginationConfig) => {
    if (!paginationConfig) {
      return;
    }
    const nextPage = paginationConfig.current ?? 1;
    const nextSize = paginationConfig.pageSize ?? pageSize;
    if (nextSize !== pageSize) {
      setPageSize(nextSize);
      setPage(1);
    } else if (nextPage !== page) {
      setPage(nextPage);
    }
  };

  const columns: ColumnsType<QualityControlRecord> = useMemo(
    () => [
      {
        title: '质检日期',
        dataIndex: 'qcDate',
        key: 'qcDate',
        width: 140,
      },
      {
        title: '订单编号',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 160,
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: '款号/款名',
        key: 'style',
        width: 220,
        render: (_value, record) => (
          <Space direction="vertical" size={4}>
            <Text>{record.styleNumber}</Text>
            <Text type="secondary" style={{ maxWidth: 200 }} ellipsis>
              {record.styleName}
            </Text>
          </Space>
        ),
      },
      {
        title: '工序名称',
        dataIndex: 'processName',
        key: 'processName',
        width: 160,
      },
      {
        title: '菲票编号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 160,
      },
      {
        title: '送检员工',
        dataIndex: 'worker',
        key: 'worker',
        width: 140,
      },
      {
        title: '检验数量',
        dataIndex: 'inspectedQty',
        key: 'inspectedQty',
        width: 120,
        align: 'right',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '合格数量',
        dataIndex: 'passedQty',
        key: 'passedQty',
        width: 120,
        align: 'right',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '不合格数量',
        dataIndex: 'failedQty',
        key: 'failedQty',
        width: 130,
        align: 'right',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '次品原因',
        dataIndex: 'defectReason',
        key: 'defectReason',
        width: 200,
        render: (value?: string) => value || '-',
      },
      {
        title: '质检结果',
        dataIndex: 'disposition',
        key: 'disposition',
        width: 120,
        render: (_value, record) => {
          const statusValue = resolveStatus(record);
          return <Tag color={statusColorMap[statusValue]}>{statusLabelMap[statusValue]}</Tag>;
        },
      },
      {
        title: '异常状态',
        key: 'exceptionStatus',
        width: 120,
        render: (_value, record) => renderExceptionStatusTag(record.exceptionStatus),
      },
      {
        title: '质检员',
        dataIndex: 'inspector',
        key: 'inspector',
        width: 120,
      },
      {
        title: '操作',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_value, record) => (
          <Button type="link" onClick={() => handleViewDetail(record)}>
            查看详情
          </Button>
        ),
      },
    ],
    [handleViewDetail],
  );

  const statusOptions = meta?.statusOptions ?? [
    { label: '全部状态', value: 'all' },
    { label: '合格', value: 'passed' as QualityInspectionStatus },
    { label: '不合格', value: 'failed' as QualityInspectionStatus },
    { label: '返工', value: 'rework' as QualityInspectionStatus },
  ];

  const inspectorOptions = useMemo(
    () => [
      { label: '全部质检员', value: '' },
      ...(meta?.inspectorOptions ?? []),
    ],
    [meta?.inspectorOptions],
  );

  const inspectorSelectOptions = useMemo(
    () => (meta?.inspectorOptions ?? []).filter((option) => option.value),
    [meta?.inspectorOptions],
  );

  const canResolveException =
    detailRecord && detailRecord.exceptionStatus === 'pending' && detailRecord.disposition !== 'accepted';

  const handleExport = async () => {
    setExporting(true);
    try {
      const { fileUrl } = await pieceworkService.exportQualityInspections({
        keyword: appliedFilters.keyword,
        status: appliedFilters.status,
        inspectorId: appliedFilters.inspectorId,
        workOrderId: appliedFilters.workOrderId,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      });
      message.success('导出任务已生成，请在日志目录查看生成的文件');
      if (fileUrl) {
        console.info('quality export file', fileUrl);
      }
    } catch (error) {
      console.error('failed to export quality control records', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card variant="borderless" loading={metaLoading && !records.length}>
        <Space size={32} wrap>
          <Space direction="vertical" size={4}>
            <Text type="secondary">检验数量</Text>
            <Text strong style={{ fontSize: 18 }}>{formatNumber(summary.inspectedQty)}</Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">合格数量</Text>
            <Text strong style={{ fontSize: 18 }}>{formatNumber(summary.passedQty)}</Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">不合格数量</Text>
            <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>{formatNumber(summary.failedQty)}</Text>
          </Space>
          <Space direction="vertical" size={4}>
            <Text type="secondary">返工数量</Text>
            <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>{formatNumber(summary.reworkQty)}</Text>
          </Space>
        </Space>
      </Card>

      <Card
        variant="borderless"
        title="质检记录"
        extra={
          <Space size={8} wrap>
            <Input
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="回车搜索(订单/款号/款名/菲票/工序)"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              onPressEnter={handleSearch}
            />
            <Input
              allowClear
              value={workOrderId}
              onChange={(event) => setWorkOrderId(event.target.value)}
              placeholder="工单编号"
              style={{ width: 180 }}
              onPressEnter={handleSearch}
            />
            <RangePicker
              value={dateRange}
              onChange={(values) => {
                if (!values) {
                  setDateRange([null, null]);
                } else {
                  setDateRange([values[0], values[1]] as [Dayjs | null, Dayjs | null]);
                }
              }}
              placeholder={['开始日期', '结束日期']}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              value={status}
              onChange={(value) => setStatus(value)}
              style={{ width: 140 }}
              options={statusOptions}
            />
            <Select<string>
              value={inspectorId}
              onChange={(value) => setInspectorId(value ?? '')}
              style={{ width: 160 }}
              options={inspectorOptions}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
              导出Excel
            </Button>
            <Button type="primary" onClick={handleOpenCreateModal}>
              录入质检
            </Button>
          </Space>
        }
      >
        <Table<QualityControlRecord>
          rowKey={(record) => record.id}
          dataSource={records}
          columns={columns}
          loading={tableLoading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Drawer
        title={detailRecord ? `质检详情 - ${detailRecord.orderNumber}` : '质检详情'}
        open={detailDrawerOpen}
        onClose={handleCloseDetail}
        width={720}
        destroyOnHidden
      >
        {detailLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : detailRecord ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="订单">{detailRecord.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="工单ID">
                {detailRecord.workOrderId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="工序">{detailRecord.processName}</Descriptions.Item>
              <Descriptions.Item label="款号">{detailRecord.styleNumber}</Descriptions.Item>
              <Descriptions.Item label="款名">{detailRecord.styleName}</Descriptions.Item>
              <Descriptions.Item label="质检员">{detailRecord.inspector}</Descriptions.Item>
              <Descriptions.Item label="送检员工">{detailRecord.worker}</Descriptions.Item>
              <Descriptions.Item label="菲票编号" span={2}>
                {detailRecord.ticketNo || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="检验数量">{formatNumber(detailRecord.inspectedQty)}</Descriptions.Item>
              <Descriptions.Item label="不合格数量">{formatNumber(detailRecord.failedQty)}</Descriptions.Item>
              <Descriptions.Item label="质检日期">{detailRecord.qcDate}</Descriptions.Item>
              <Descriptions.Item label="质检结果">
                {statusLabelMap[resolveStatus(detailRecord)]}
              </Descriptions.Item>
            </Descriptions>
            <Divider style={{ margin: '12px 0' }} />
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>异常状态</Text>
              {renderExceptionStatusTag(detailRecord.exceptionStatus)}
              {detailRecord.exceptionNote ? (
                <Text type="secondary">备注：{detailRecord.exceptionNote}</Text>
              ) : null}
            {detailRecord.exceptionHandledAt ? (
              <Text type="secondary">
                处理人：{detailRecord.exceptionHandledBy ?? '-'} · {detailRecord.exceptionHandledAt}
              </Text>
            ) : null}
          </Space>
          {canResolveException ? (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary">填写异常处理说明</Text>
              <Input.TextArea
                rows={3}
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                maxLength={200}
                showCount
                placeholder="请输入处理措施、责任人等信息"
              />
              <Button type="primary" loading={resolving} onClick={handleResolveException}>
                标记已处理
              </Button>
            </Space>
          ) : null}
          <Divider style={{ margin: '12px 0' }} />
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text strong>异常处理记录</Text>
            {logsLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : exceptionLogs.length ? (
              <Timeline style={{ paddingLeft: 8 }}>
                {exceptionLogs.map((log) => (
                  <Timeline.Item
                    key={log.id}
                    color={log.status === 'resolved' ? 'green' : log.status === 'pending' ? 'red' : 'blue'}
                  >
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Text>{log.createdAt ? dayjs(log.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</Text>
                      <Text>{log.note || '无备注'}</Text>
                      <Text type="secondary">
                        {log.handledByName || log.handledBy || '系统'} · {exceptionStatusMap[log.status].label}
                      </Text>
                    </Space>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="暂无异常处理记录" />
            )}
          </Space>
        </Space>
      ) : (
        <Empty description="暂无详情" />
      )}
      </Drawer>

      <Modal
        title="录入质检记录"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateInspection}
        okText="提交"
        cancelText="取消"
        confirmLoading={creating}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="工单编号"
            name="workOrderId"
            rules={[{ required: true, message: '请输入工单编号' }]}
          >
            <Input placeholder="请输入工单ID" />
          </Form.Item>
          <Form.Item
            label="质检员"
            name="inspectorId"
            rules={[{ required: true, message: '请选择质检员' }]}
          >
            <Select
              placeholder="请选择质检员"
              options={inspectorSelectOptions}
              loading={metaLoading}
            />
          </Form.Item>
          <Form.Item
            label="质检时间"
            name="qcDate"
            rules={[{ required: true, message: '请选择质检时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="检验数量"
            name="inspectedQty"
            rules={[{ required: true, message: '请输入检验数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入检验数量" />
          </Form.Item>
          <Form.Item
            label="合格数量"
            name="passedQty"
            rules={[{ required: true, message: '请输入合格数量' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入合格数量" />
          </Form.Item>
          <Form.Item
            label="不合格数量"
            name="failedQty"
            rules={[{ required: true, message: '请输入不合格数量' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入不合格数量" />
          </Form.Item>
          <Form.Item
            label="质检结论"
            name="disposition"
            rules={[{ required: true, message: '请选择质检结论' }]}
          >
            <Select options={dispositionOptions} placeholder="请选择结论" />
          </Form.Item>
          <Form.Item label="缺陷原因" name="defectReason">
            <Input.TextArea rows={3} maxLength={120} placeholder="选填，描述缺陷原因" showCount />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default QualityControlManagement;
