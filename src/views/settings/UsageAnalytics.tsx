import { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Col, DatePicker, Form, Row, Select, Space, Table, Typography } from 'antd';
import { RedoOutlined, SearchOutlined } from '@ant-design/icons';
import settingsApi from '../../api/settings';
import type {
  UsageAnalyticsButton,
  UsageAnalyticsOverview,
  UsageAnalyticsPage,
  UsageAnalyticsQuery,
} from '../../types/settings';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type FilterValues = {
  range?: [Dayjs, Dayjs];
  module?: string;
  sortBy?: UsageAnalyticsQuery['sortBy'];
};

const moduleOptions = [
  { value: '工作台', label: '工作台' },
  { value: '打板', label: '打板' },
  { value: '订单生产', label: '订单生产' },
  { value: '物料进销存', label: '物料进销存' },
  { value: '成品进销存', label: '成品进销存' },
  { value: '车间计件', label: '车间计件' },
  { value: '销售中心', label: '销售中心' },
  { value: '对账结算', label: '对账结算' },
  { value: '基础资料', label: '基础资料' },
  { value: '系统设置', label: '系统设置' },
];

const sortOptions = [
  { value: 'views_desc', label: '访问多优先' },
  { value: 'views_asc', label: '访问少优先' },
  { value: 'recent_asc', label: '长期未访问优先' },
  { value: 'duration_desc', label: '停留时间长优先' },
];

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(29, 'day'), dayjs()];

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-');

const buildQuery = (values: FilterValues, page: number, pageSize: number): UsageAnalyticsQuery => {
  const [from, to] = values.range ?? defaultRange();
  return {
    from: from.format('YYYY-MM-DD'),
    to: to.format('YYYY-MM-DD'),
    module: values.module,
    sortBy: values.sortBy ?? 'views_desc',
    page,
    pageSize,
  };
};

const Metric = ({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) => (
  <div
    style={{
      border: '1px solid #e7edf5',
      borderRadius: 8,
      padding: '14px 16px',
      minHeight: 78,
      background: '#fff',
    }}
  >
    <Text type="secondary">{label}</Text>
    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>
      {value}
      {suffix ? <span style={{ marginLeft: 4, fontSize: 13, color: '#64748b' }}>{suffix}</span> : null}
    </div>
  </div>
);

const UsageAnalytics = () => {
  const [form] = Form.useForm<FilterValues>();
  const [overview, setOverview] = useState<UsageAnalyticsOverview | null>(null);
  const [pages, setPages] = useState<UsageAnalyticsPage[]>([]);
  const [buttons, setButtons] = useState<UsageAnalyticsButton[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagePagination, setPagePagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [buttonPagination, setButtonPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const pageColumns = useMemo<ColumnsType<UsageAnalyticsPage>>(
    () => [
      { title: '页面', dataIndex: 'pageTitle', render: (value: string, record) => value || record.pagePath },
      { title: '模块', dataIndex: 'pageModule', width: 120, render: (value: string) => value || '-' },
      { title: '访问次数', dataIndex: 'pageViews', width: 110 },
      { title: '访问人数', dataIndex: 'uniqueUsers', width: 110 },
      { title: '按钮点击', dataIndex: 'buttonClicks', width: 110 },
      {
        title: '平均停留',
        dataIndex: 'averageDurationSeconds',
        width: 120,
        render: (value: number) => `${value || 0} 秒`,
      },
      { title: '最近访问', dataIndex: 'lastVisitedAt', width: 160, render: formatDateTime },
      { title: '路径', dataIndex: 'pagePath', ellipsis: true },
    ],
    [],
  );

  const buttonColumns = useMemo<ColumnsType<UsageAnalyticsButton>>(
    () => [
      { title: '操作', dataIndex: 'eventLabel', render: (value: string, record) => value || record.eventName || '-' },
      { title: '页面', dataIndex: 'pageTitle', render: (value: string, record) => value || record.pagePath },
      { title: '模块', dataIndex: 'pageModule', width: 120, render: (value: string) => value || '-' },
      { title: '点击次数', dataIndex: 'clickCount', width: 110 },
      { title: '点击人数', dataIndex: 'uniqueUsers', width: 110 },
      { title: '最近点击', dataIndex: 'lastClickedAt', width: 160, render: formatDateTime },
    ],
    [],
  );

  const loadData = async ({
    pagePage = pagePagination.current,
    pageSize = pagePagination.pageSize,
    buttonPage = buttonPagination.current,
    buttonPageSize = buttonPagination.pageSize,
    filters,
  }: {
    pagePage?: number;
    pageSize?: number;
    buttonPage?: number;
    buttonPageSize?: number;
    filters?: FilterValues;
  } = {}) => {
    const values = filters ?? form.getFieldsValue();
    setLoading(true);
    try {
      const overviewQuery = buildQuery(values, 1, 1);
      const [overviewResult, pageResult, buttonResult] = await Promise.all([
        settingsApi.analytics.overview(overviewQuery),
        settingsApi.analytics.pages(buildQuery(values, pagePage, pageSize)),
        settingsApi.analytics.buttons(buildQuery(values, buttonPage, buttonPageSize)),
      ]);
      setOverview(overviewResult);
      setPages(pageResult.list);
      setButtons(buttonResult.list);
      setPagePagination({ current: pagePage, pageSize, total: pageResult.total });
      setButtonPagination({ current: buttonPage, pageSize: buttonPageSize, total: buttonResult.total });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const values = { range: defaultRange(), sortBy: 'views_desc' as const };
    form.setFieldsValue(values);
    void loadData({ filters: values });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    void loadData({ pagePage: 1, buttonPage: 1, filters: form.getFieldsValue() });
  };

  const handleReset = () => {
    const values = { range: defaultRange(), sortBy: 'views_desc' as const };
    form.setFieldsValue(values);
    void loadData({ pagePage: 1, buttonPage: 1, filters: values });
  };

  return (
    <Card title="使用分析">
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="range" label="时间范围">
            <RangePicker allowClear={false} />
          </Form.Item>
          <Form.Item name="module" label="模块">
            <Select allowClear placeholder="全部模块" options={moduleOptions} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="sortBy" label="页面排序">
            <Select options={sortOptions} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={handleReset} icon={<RedoOutlined />}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Row gutter={[12, 12]}>
          <Col xs={12} md={4}>
            <Metric label="页面访问" value={overview?.pageViews ?? 0} />
          </Col>
          <Col xs={12} md={4}>
            <Metric label="访问人数" value={overview?.uniqueUsers ?? 0} />
          </Col>
          <Col xs={12} md={4}>
            <Metric label="活跃页面" value={overview?.activePages ?? 0} />
          </Col>
          <Col xs={12} md={4}>
            <Metric label="按钮点击" value={overview?.buttonClicks ?? 0} />
          </Col>
          <Col xs={12} md={4}>
            <Metric label="平均停留" value={overview?.averageDurationSeconds ?? 0} suffix="秒" />
          </Col>
          <Col xs={12} md={4}>
            <Metric label="最近记录" value={overview?.lastEventAt ? dayjs(overview.lastEventAt).format('MM-DD HH:mm') : '-'} />
          </Col>
        </Row>

        <Table<UsageAnalyticsPage>
          title={() => '页面使用排行'}
          rowKey={(record) => record.pagePath}
          loading={loading}
          dataSource={pages}
          columns={pageColumns}
          pagination={{
            current: pagePagination.current,
            pageSize: pagePagination.pageSize,
            total: pagePagination.total,
            showSizeChanger: true,
            onChange: (page, pageSize) => void loadData({ pagePage: page, pageSize }),
          }}
        />

        <Table<UsageAnalyticsButton>
          title={() => '主要操作点击排行'}
          rowKey={(record) => `${record.pagePath}-${record.eventKey}`}
          loading={loading}
          dataSource={buttons}
          columns={buttonColumns}
          pagination={{
            current: buttonPagination.current,
            pageSize: buttonPagination.pageSize,
            total: buttonPagination.total,
            showSizeChanger: true,
            onChange: (page, pageSize) => void loadData({ buttonPage: page, buttonPageSize: pageSize }),
          }}
        />
      </Space>
    </Card>
  );
};

export default UsageAnalytics;
