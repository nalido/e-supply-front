import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import { DatePicker, Input, Space, Table, Tag, Typography, Button, message, Modal, Descriptions } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { CuttingReportDataset, CuttingReportRecord } from '../types';
import { pieceworkService } from '../api/piecework';
import '../styles/cutting-report.css';
import ListImage from '../components/common/ListImage';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const initialDataset: CuttingReportDataset = {
  list: [],
  total: 0,
  summary: { cuttingQuantity: 0, ticketQuantity: 0 },
  page: 1,
  pageSize: 10,
};

const toNumber = (value: number) => value.toLocaleString('zh-CN');

const CuttingReportPage = () => {
  const [dataset, setDataset] = useState<CuttingReportDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [orderKeyword, setOrderKeyword] = useState('');
  const [styleKeyword, setStyleKeyword] = useState('');
  const [cutterKeyword, setCutterKeyword] = useState('');
  const [remarkKeyword, setRemarkKeyword] = useState('');
  const [dateRange, setDateRange] = useState<RangeValue<Dayjs>>(null);
  const [appliedFilters, setAppliedFilters] = useState({
    orderKeyword: '',
    styleKeyword: '',
    cutterKeyword: '',
    remarkKeyword: '',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [detailRecord, setDetailRecord] = useState<CuttingReportRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await pieceworkService.getCuttingReport({
          page,
          pageSize,
          orderKeyword: appliedFilters.orderKeyword,
          styleKeyword: appliedFilters.styleKeyword,
          cutterKeyword: appliedFilters.cutterKeyword,
          remarkKeyword: appliedFilters.remarkKeyword,
          startDate: appliedFilters.startDate,
          endDate: appliedFilters.endDate,
        });
        if (!cancelled) {
          setDataset(response);
          if (response.page !== page) {
            setPage(response.page);
          }
          if (response.pageSize !== pageSize) {
            setPageSize(response.pageSize);
          }
        }
      } catch (error) {
        console.error('failed to load cutting report', error);
        if (!cancelled) {
          message.error('获取裁床报表失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void fetchReport();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedFilters]);

  const handleReset = () => {
    setOrderKeyword('');
    setStyleKeyword('');
    setCutterKeyword('');
    setRemarkKeyword('');
    setDateRange(null);
    setAppliedFilters({
      orderKeyword: '',
      styleKeyword: '',
      cutterKeyword: '',
      remarkKeyword: '',
      startDate: undefined,
      endDate: undefined,
    });
    setPage(1);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      orderKeyword: orderKeyword.trim(),
      styleKeyword: styleKeyword.trim(),
      cutterKeyword: cutterKeyword.trim(),
      remarkKeyword: remarkKeyword.trim(),
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
    });
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { fileUrl } = await pieceworkService.exportCuttingReport({
        orderKeyword: appliedFilters.orderKeyword,
        styleKeyword: appliedFilters.styleKeyword,
        cutterKeyword: appliedFilters.cutterKeyword,
        remarkKeyword: appliedFilters.remarkKeyword,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      });
      message.success('导出任务已开始，请在服务器 logs/exports 目录查看');
      if (fileUrl) {
        console.info('cutting report export file', fileUrl);
      }
    } catch (error) {
      console.error('failed to export cutting report', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<CuttingReportRecord> = useMemo(() => [
    {
      title: '序号',
      dataIndex: 'index',
      width: 72,
      fixed: 'left',
      align: 'right',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '图片',
      dataIndex: 'thumbnail',
      width: 96,
      fixed: 'left',
      render: (value: string, record) => (
        <ListImage
          src={value}
          alt={record.styleName}
          wrapperClassName="cutting-report-thumbnail"
          width={null}
          height={null}
        />
      ),
    },
    { title: '日期', dataIndex: 'date', width: 120 },
    { title: '工厂订单', dataIndex: 'orderCode', width: 160 },
    { title: '款号', dataIndex: 'styleCode', width: 120 },
    { title: '款名', dataIndex: 'styleName', width: 180 },
    {
      title: '订单备注',
      dataIndex: 'orderRemark',
      width: 200,
      ellipsis: true,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '订单数量',
      dataIndex: 'orderQuantity',
      width: 120,
      align: 'right',
      render: (value: number) => `${toNumber(value)} 件`,
    },
    { title: '床次', dataIndex: 'bedNumber', width: 100 },
    {
      title: '裁床备注',
      dataIndex: 'cuttingRemark',
      width: 200,
      ellipsis: true,
      render: (value?: string) => value ?? '-',
    },
    {
      title: '颜色明细',
      dataIndex: 'colorDetails',
      width: 220,
      render: (_value, record) => (
        <Space size={8} wrap>
          {record.colorDetails.map((detail) => (
            <Tag key={`${record.id}-color-${detail.name}`} color="geekblue">
              {detail.name} {toNumber(detail.quantity)} 件
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '尺码明细',
      dataIndex: 'sizeDetails',
      width: 260,
      render: (_value, record) => (
        <Space size={8} wrap>
          {record.sizeDetails.map((detail) => (
            <Tag key={`${record.id}-size-${detail.size}`} color="purple">
              {detail.size}：{toNumber(detail.quantity)}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '裁床数量',
      dataIndex: 'cuttingQuantity',
      width: 120,
      align: 'right',
      render: (value: number) => `${toNumber(value)} 件`,
    },
    {
      title: '菲票数量',
      dataIndex: 'ticketQuantity',
      width: 120,
      align: 'right',
      render: (value: number) => `${toNumber(value)} 张`,
    },
    { title: '裁剪人', dataIndex: 'cutter', width: 120 },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 160,
      fixed: 'right',
      render: (_value, record) => (
        <Space size={8}>
          <Button
            type="link"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setDetailRecord(record);
            }}
          >
            查看详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              message.success(`已打印裁床单：${record.orderCode} - ${record.bedNumber}`);
            }}
          >
            打印
          </Button>
        </Space>
      ),
    },
  ], [page, pageSize]);

  return (
    <div className="cutting-report-page">
      <section className="cutting-report-filters">
        <div className="cutting-report-fields">
          <div className="cutting-report-field">
            <Text type="secondary">订单</Text>
            <Input
              allowClear
              placeholder="请输入工厂订单号"
              value={orderKeyword}
              onChange={(event) => setOrderKeyword(event.target.value)}
            />
          </div>
          <div className="cutting-report-field">
            <Text type="secondary">款式资料</Text>
            <Input
              allowClear
              placeholder="请输入款号/款名"
              value={styleKeyword}
              onChange={(event) => setStyleKeyword(event.target.value)}
            />
          </div>
          <div className="cutting-report-field">
            <Text type="secondary">裁剪人</Text>
            <Input
              allowClear
              placeholder="请输入裁剪人"
              value={cutterKeyword}
              onChange={(event) => setCutterKeyword(event.target.value)}
            />
          </div>
          <div className="cutting-report-field">
            <Text type="secondary">备注</Text>
            <Input
              allowClear
              placeholder="请输入裁床/订单备注"
              value={remarkKeyword}
              onChange={(event) => setRemarkKeyword(event.target.value)}
            />
          </div>
          <div className="cutting-report-field">
            <Text type="secondary">日期范围</Text>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              allowClear
            />
          </div>
        </div>
        <div className="cutting-report-toolbar">
          <Space size={12} wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleApplyFilters}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置条件</Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
              按当前条件全部导出
            </Button>
          </Space>
          <Text type="secondary">匹配 {dataset.total} 条裁床单</Text>
        </div>
      </section>

      <section className="cutting-report-table">
        <Table<CuttingReportRecord>
          bordered
          rowKey={(record) => record.id}
          loading={loading}
          columns={columns}
          dataSource={dataset.list}
          pagination={{
            current: page,
            pageSize,
            total: dataset.total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 30],
            showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize ?? pageSize);
            },
          }}
          scroll={{ x: 1600 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={12}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} align="right">
                  <Text>{`${toNumber(dataset.summary.cuttingQuantity)} 件`}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={13} align="right">
                  <Text>{`${toNumber(dataset.summary.ticketQuantity)} 张`}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={14} />
                <Table.Summary.Cell index={15} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </section>

      <Modal
        title={detailRecord ? `裁床报表详情 - ${detailRecord.orderCode}` : '裁床报表详情'}
        open={Boolean(detailRecord)}
        footer={null}
        onCancel={() => setDetailRecord(null)}
        width={760}
      >
        {detailRecord ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="日期">{detailRecord.date}</Descriptions.Item>
              <Descriptions.Item label="订单号">{detailRecord.orderCode}</Descriptions.Item>
              <Descriptions.Item label="款号">{detailRecord.styleCode}</Descriptions.Item>
              <Descriptions.Item label="款名">{detailRecord.styleName}</Descriptions.Item>
              <Descriptions.Item label="床次">{detailRecord.bedNumber}</Descriptions.Item>
              <Descriptions.Item label="裁剪人">{detailRecord.cutter}</Descriptions.Item>
              <Descriptions.Item label="订单数量">{toNumber(detailRecord.orderQuantity)} 件</Descriptions.Item>
              <Descriptions.Item label="裁床数量">{toNumber(detailRecord.cuttingQuantity)} 件</Descriptions.Item>
              <Descriptions.Item label="菲票数量">{toNumber(detailRecord.ticketQuantity)} 张</Descriptions.Item>
              <Descriptions.Item label="订单备注">{detailRecord.orderRemark ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="裁床备注" span={2}>{detailRecord.cuttingRemark ?? '-'}</Descriptions.Item>
            </Descriptions>
            <div>
              <Text type="secondary">颜色明细</Text>
              <div style={{ marginTop: 8 }}>
                <Space size={[8, 8]} wrap>
                  {detailRecord.colorDetails.map((detail) => (
                    <Tag key={`${detailRecord.id}-detail-color-${detail.name}`} color="geekblue">
                      {detail.name} {toNumber(detail.quantity)} 件
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
            <div>
              <Text type="secondary">尺码明细</Text>
              <div style={{ marginTop: 8 }}>
                <Space size={[8, 8]} wrap>
                  {detailRecord.sizeDetails.map((detail) => (
                    <Tag key={`${detailRecord.id}-detail-size-${detail.size}`} color="purple">
                      {detail.size}：{toNumber(detail.quantity)}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default CuttingReportPage;
