import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  Badge,
  Tooltip,
  Row,
  Col,
  Statistic,
  Avatar,
  Image,
  message,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import type { SampleOrder, SampleStats, SampleStatus, SampleQueryParams } from '../types/sample';
import { sampleService } from '../api/mock';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const sampleFilterOptions = sampleService.getSampleFilterOptions();

/**
 * 样板跟进页面
 */
type SampleFollowFilters = {
  keyword: string;
  status?: SampleStatus;
  customer?: string;
  priority?: SampleOrder['priority'];
  dateRange?: [Dayjs, Dayjs];
};

const SampleFollow: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<SampleOrder[]>([]);
  const [stats, setStats] = useState<SampleStats | null>(null);
  
  // 分页状态
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
  });

  const currentPage = pagination.current ?? 1;
  const currentPageSize = pagination.pageSize ?? 20;

  // 筛选状态
  const [filters, setFilters] = useState<SampleFollowFilters>({
    keyword: '',
    status: undefined,
    customer: undefined,
    priority: undefined,
    dateRange: undefined,
  });

  const buildQueryParams = useCallback((overrides: Partial<SampleQueryParams> = {}): SampleQueryParams => {
    const base: SampleQueryParams = {
      keyword: filters.keyword || undefined,
      status: filters.status,
      customer: filters.customer,
      priority: filters.priority,
      startDate: filters.dateRange ? filters.dateRange[0].format('YYYY-MM-DD') : undefined,
      endDate: filters.dateRange ? filters.dateRange[1].format('YYYY-MM-DD') : undefined,
    };
    return { ...base, ...overrides };
  }, [filters]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const result = await sampleService.getSampleStats(buildQueryParams({ status: undefined }));
      setStats(result);
    } catch {
      message.error('加载统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  }, [buildQueryParams]);

  // 加载列表数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = buildQueryParams({
        page: currentPage,
        pageSize: currentPageSize,
      });

      const result = await sampleService.getSampleOrders(params);
      setDataSource(result.list);
      setPagination(prev => ({
        ...prev,
        total: result.total,
        current: result.page,
      }));
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, currentPage, currentPageSize]);

  // 初始化数据
  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 分页、排序、筛选变化时重新加载数据
  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // 搜索
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, keyword: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 筛选变化
  const handleFilterChange = <K extends keyof SampleFollowFilters>(key: K, value: SampleFollowFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      status: undefined,
      customer: undefined,
      priority: undefined,
      dateRange: undefined,
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 操作按钮
  const handleEdit = (record: SampleOrder) => {
    message.info(`编辑样板单: ${record.orderNo}`);
  };

  const handleView = (record: SampleOrder) => {
    message.info(`查看样板单: ${record.orderNo}`);
  };

  const handleDelete = (record: SampleOrder) => {
    message.info(`删除样板单: ${record.orderNo}`);
  };

  // 表格列定义
  const columns: ColumnsType<SampleOrder> = [
    {
      title: '样板单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140,
      fixed: 'left',
      render: (text) => (
        <Button type="link" size="small" onClick={() => handleView({ orderNo: text } as SampleOrder)}>
          {text}
        </Button>
      ),
    },
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      render: (images: string[] | undefined) => (
        images && images.length > 0 ? (
          <Image
            width={40}
            height={40}
            src={images[0]}
            style={{ borderRadius: '4px', objectFit: 'cover' }}
            placeholder={<Avatar size={40} icon="📷" />}
          />
        ) : (
          <Avatar size={40} icon="📷" style={{ backgroundColor: '#f0f0f0', color: '#999' }} />
        )
      ),
    },
    {
      title: '款式信息',
      key: 'styleInfo',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.styleName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.styleCode} | {record.category}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.fabric} · {record.color} · {record.size}
          </div>
        </div>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
      width: 120,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (text) => `${text}件`,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right',
      render: (text) => `¥${text.toFixed(2)}`,
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (text) => (
        <span style={{ fontWeight: 500 }}>¥{text.toFixed(2)}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: SampleStatus) => (
        <Tag color={sampleService.getStatusBadgeColor(status)}>
          {sampleService.getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={sampleService.getPriorityBadgeColor(priority)}>
          {sampleService.getPriorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: '交期',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      render: (text) => {
        const isOverdue = dayjs(text).isBefore(dayjs(), 'day');
        return (
          <span style={{ color: isOverdue ? '#f5222d' : undefined }}>
            {dayjs(text).format('YYYY-MM-DD')}
            {isOverdue && <Badge status="error" />}
          </span>
        );
      },
    },
    {
      title: '设计师',
      dataIndex: 'designer',
      key: 'designer',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 110,
      render: (text) => dayjs(text).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={3}>
            <Card size="small">
              <Statistic
                title="总计"
                value={stats.total}
                loading={statsLoading}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card size="small">
              <Statistic
                title="待确认"
                value={stats.pending}
                loading={statsLoading}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card size="small">
              <Statistic
                title="生产中"
                value={stats.producing}
                loading={statsLoading}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card size="small">
              <Statistic
                title="已完成"
                value={stats.completed}
                loading={statsLoading}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card size="small">
              <Statistic
                title="本月新增"
                value={stats.thisMonth}
                loading={statsLoading}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card size="small">
              <Statistic
                title="紧急"
                value={stats.urgent}
                loading={statsLoading}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col span={3}>
            <Card size="small">
              <Statistic
                title="已取消"
                value={stats.cancelled}
                loading={statsLoading}
                valueStyle={{ color: '#999' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主表格 */}
      <Card>
        {/* 工具栏 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size="middle">
                <Search
                  placeholder="搜索样板单号、款式名称、客户..."
                  allowClear
                  style={{ width: 300 }}
                  onSearch={handleSearch}
                  value={filters.keyword}
                  onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                />
                <Select
                  placeholder="状态筛选"
                  allowClear
                  style={{ width: 120 }}
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                >
                  <Option value="pending">待确认</Option>
                  <Option value="confirmed">已确认</Option>
                  <Option value="producing">生产中</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
                <Select
                  placeholder="客户筛选"
                  allowClear
                  style={{ width: 140 }}
                  value={filters.customer}
                  onChange={(value) => handleFilterChange('customer', value)}
                >
                  {sampleFilterOptions.customers.map(customer => (
                    <Option key={customer} value={customer}>{customer}</Option>
                  ))}
                </Select>
                <RangePicker
                  placeholder={['开始日期', '结束日期']}
                  value={filters.dateRange}
                  onChange={(value) => {
                    if (value && value[0] && value[1]) {
                      handleFilterChange('dateRange', [value[0], value[1]]);
                    } else {
                      handleFilterChange('dateRange', undefined);
                    }
                  }}
                />
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => message.info('新建样板单')}
                >
                  新建样板单
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  onClick={() => message.info('导出数据')}
                >
                  导出
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => { void loadData(); }}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1600 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default SampleFollow;
