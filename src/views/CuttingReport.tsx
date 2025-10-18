import { useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RangeValue } from 'rc-picker/lib/interface';
import { DatePicker, Input, Space, Table, Tag, Typography, Button, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { CuttingReportDataset, CuttingReportRecord } from '../types';
import { fetchCuttingReportDataset } from '../mock';
import '../styles/cutting-report.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const initialDataset: CuttingReportDataset = {
  list: [],
  total: 0,
  summary: { cuttingQuantity: 0, ticketQuantity: 0 },
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setLoading(true);
    fetchCuttingReportDataset().then((data) => {
      setDataset(data);
      setPage(1);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const filteredRecords = useMemo(() => {
    const orderToken = orderKeyword.trim().toLowerCase();
    const styleToken = styleKeyword.trim().toLowerCase();
    const cutterToken = cutterKeyword.trim().toLowerCase();
    const remarkToken = remarkKeyword.trim().toLowerCase();

    return dataset.list.filter((record) => {
      const matchesOrder = !orderToken || record.orderCode.toLowerCase().includes(orderToken);
      const matchesStyle =
        !styleToken ||
        record.styleCode.toLowerCase().includes(styleToken) ||
        record.styleName.toLowerCase().includes(styleToken);
      const matchesCutter = !cutterToken || record.cutter.toLowerCase().includes(cutterToken);
      const matchesRemark =
        !remarkToken ||
        (record.orderRemark && record.orderRemark.toLowerCase().includes(remarkToken)) ||
        (record.cuttingRemark && record.cuttingRemark.toLowerCase().includes(remarkToken));
      const matchesDate = (() => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
          return true;
        }
        const recordDate = dayjs(record.date);
        return (
          recordDate.isSame(dateRange[0], 'day') ||
          recordDate.isSame(dateRange[1], 'day') ||
          (recordDate.isAfter(dateRange[0], 'day') && recordDate.isBefore(dateRange[1], 'day'))
        );
      })();

      return matchesOrder && matchesStyle && matchesCutter && matchesRemark && matchesDate;
    });
  }, [dataset.list, orderKeyword, styleKeyword, cutterKeyword, remarkKeyword, dateRange]);

  const cuttingTotal = useMemo(
    () => filteredRecords.reduce((sum, record) => sum + record.cuttingQuantity, 0),
    [filteredRecords],
  );

  const ticketTotal = useMemo(
    () => filteredRecords.reduce((sum, record) => sum + record.ticketQuantity, 0),
    [filteredRecords],
  );

  useEffect(() => {
    setPage(1);
  }, [orderKeyword, styleKeyword, cutterKeyword, remarkKeyword, dateRange]);

  const handleReset = () => {
    setOrderKeyword('');
    setStyleKeyword('');
    setCutterKeyword('');
    setRemarkKeyword('');
    setDateRange(null);
  };

  const handleExport = () => {
    message.success(`将导出 ${filteredRecords.length} 条裁床单记录`);
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
        <img src={value} alt={record.styleName} className="cutting-report-thumbnail" />
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
              message.info(`查看裁床单详情：${record.orderCode} - ${record.bedNumber}`);
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
            <Button icon={<ReloadOutlined />} onClick={handleReset}>重置条件</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
              按当前条件全部导出
            </Button>
          </Space>
          <Text type="secondary">匹配 {filteredRecords.length} 条裁床单</Text>
        </div>
      </section>

      <section className="cutting-report-table">
        <Table<CuttingReportRecord>
          bordered
          rowKey={(record) => record.id}
          loading={loading}
          columns={columns}
          dataSource={filteredRecords}
          pagination={{
            current: page,
            pageSize,
            total: filteredRecords.length,
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
                  <Text>{`${toNumber(cuttingTotal)} 件`}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={13} align="right">
                  <Text>{`${toNumber(ticketTotal)} 张`}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={14} />
                <Table.Summary.Cell index={15} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </section>
    </div>
  );
};

export default CuttingReportPage;
