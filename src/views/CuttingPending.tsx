import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Dropdown,
  Empty,
  Input,
  Modal,
  Pagination,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CalendarOutlined,
  CheckCircleTwoTone,
  ExclamationCircleOutlined,
  MoreOutlined,
  PictureOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { CuttingTask, CuttingTaskDataset, CuttingTaskMetric } from '../types';
import { pieceworkService } from '../api/piecework';
import '../styles/cutting-pending.css';
import ListImage from '../components/common/ListImage';

const { Text } = Typography;

const initialDataset: CuttingTaskDataset = {
  summary: [],
  list: [],
  total: 0,
  page: 1,
  pageSize: 4,
};

type ColorPreviewState = {
  open: boolean;
  task?: CuttingTask;
};

type DetailModalState = {
  open: boolean;
  task?: CuttingTask;
};

type MenuClickEvent = Parameters<NonNullable<MenuProps['onClick']>>[0];

const CuttingPendingPage = () => {
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [page, setPage] = useState(initialDataset.page);
  const [pageSize, setPageSize] = useState(initialDataset.pageSize);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });
  const [detailState, setDetailState] = useState<DetailModalState>({ open: false });

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await pieceworkService.getCuttingPending({
          page,
          pageSize,
          keyword: appliedKeyword,
          includeCompleted,
          includeSummary: page === 1,
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
        console.error('failed to load pending cutting tasks', error);
        if (!cancelled) {
          message.error('获取待裁数据失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, appliedKeyword, includeCompleted]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    setAppliedKeyword(trimmed);
    setPage(1);
  };

  const handleIncludeCompleted = (event: CheckboxChangeEvent) => {
    const nextValue = event.target.checked;
    setIncludeCompleted(nextValue);
    setPage(1);
  };

  const handleOpenPreview = (task: CuttingTask) => {
    setPreviewState({ open: true, task });
  };

  const handleViewDetail = (task: CuttingTask) => {
    setDetailState({ open: true, task });
  };

  const handleMenuClick = (task: CuttingTask) => (event: MenuClickEvent) => {
    if (event.key === 'create-sheet') {
      navigate(`/piecework/cutting/create?orderId=${task.id}`);
      return;
    }
    if (event.key === 'edit') {
      message.success(`已进入编辑流程：${task.orderCode}`);
      return;
    }
    if (event.key === 'view') {
      handleViewDetail(task);
    }
  };

  const renderMetric = (metric: CuttingTaskMetric) => (
    <Card
      key={metric.key}
      className={`cutting-metric-card${metric.tone === 'warning' ? ' warning' : ''}`}
    >
      <div className="cutting-metric-label">{metric.label}</div>
      <div className="cutting-metric-value">{metric.value}</div>
      {metric.description ? (
        <div className="cutting-metric-desc">{metric.description}</div>
      ) : null}
    </Card>
  );

  return (
    <div className="cutting-pending-page">
      <section className="cutting-summary-section">
        <Space size={16} wrap>
          {dataset.summary.length > 0 ? dataset.summary.map(renderMetric) : null}
        </Space>
      </section>

      <section className="cutting-toolbar">
        <Input.Search
          allowClear
          placeholder="请输入订单号/款名/款号"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          style={{ maxWidth: 420, flex: 1 }}
        />
        <Checkbox checked={includeCompleted} onChange={handleIncludeCompleted}>
          包含已完成
        </Checkbox>
      </section>

      {loading ? (
        <div className="cutting-task-list">
          {Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      ) : dataset.list.length === 0 ? (
        <Empty description={appliedKeyword ? '未找到匹配的待裁任务' : '暂无待裁任务'} />
      ) : (
        <div className="cutting-task-list">
          {dataset.list.map((task) => {
            const menuItems: MenuProps['items'] = [
              { key: 'create-sheet', label: '创建裁床单' },
              { key: 'edit', label: '编辑' },
              { key: 'view', label: '查看详情' },
            ];
            const pendingTone = task.pendingQuantity > 0 ? 'cutting-qty-highlight' : '';
            return (
              <article className="cutting-task-card" key={task.id}>
                <div className="cutting-task-header">
                  <div className="cutting-task-main">
                    <ListImage
                      src={task.thumbnail}
                      alt={task.styleName}
                      wrapperClassName="cutting-task-thumbnail"
                      width={null}
                      height={null}
                      background="#fff"
                    />
                    <div className="cutting-task-info">
                      <div className="cutting-task-title">
                        <Text strong>{task.styleName}</Text>
                        <Tag bordered={false} color="geekblue">{task.styleCode}</Tag>
                      </div>
                      <div className="cutting-task-meta">
                        <Space size={12} wrap>
                          <span>订单号：{task.orderCode}</span>
                          <span>
                            <CalendarOutlined style={{ marginRight: 4 }} />
                            下单：{task.orderDate}
                          </span>
                          {task.scheduleDate ? (
                            <span>
                              <CheckCircleTwoTone twoToneColor="#52c41a" />
                              <Text type="secondary" style={{ marginLeft: 4 }}>
                                计划排床：{task.scheduleDate}
                              </Text>
                            </span>
                          ) : null}
                          {task.customer ? (
                            <span>
                              <UserOutlined style={{ marginRight: 4 }} />
                              客户：{task.customer}
                            </span>
                          ) : null}
                        </Space>
                      </div>
                      {task.fabricSummary ? (
                        <div className="cutting-task-fabric">{task.fabricSummary}</div>
                      ) : null}
                      <div className="cutting-task-tags">
                        {task.priorityTag ? (
                          <Tag color="volcano" bordered={false}>
                            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                            {task.priorityTag}
                          </Tag>
                        ) : null}
                        {task.pendingQuantity <= 0 ? (
                          <Tag color="success" bordered={false}>
                            已完成
                          </Tag>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="cutting-task-actions">
                    <Button
                      icon={<PictureOutlined />}
                      type="link"
                      onClick={() => handleOpenPreview(task)}
                    >
                      颜色图
                    </Button>
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: menuItems,
                        onClick: handleMenuClick(task),
                      }}
                    >
                      <Button icon={<MoreOutlined />} type="text">更多</Button>
                    </Dropdown>
                  </div>
                </div>
                <div className="cutting-task-quantities">
                  <div>
                    <div className="label">下单数量</div>
                    <div className="value">{task.orderedQuantity.toLocaleString()} {task.unit}</div>
                  </div>
                  <div>
                    <div className="label">已裁数量</div>
                    <div className="value">{task.cutQuantity.toLocaleString()} {task.unit}</div>
                  </div>
                  <div className={pendingTone}>
                    <div className="label">待裁数量</div>
                    <div className="value">{task.pendingQuantity.toLocaleString()} {task.unit}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dataset.total > 0 ? (
        <div className="cutting-pagination-wrap">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={dataset.total}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={[4, 6, 8]}
            showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            }}
          />
        </div>
      ) : null}

      <Modal
        title={previewState.task ? `${previewState.task.styleName} 颜色图` : '颜色图'}
        open={previewState.open}
        footer={null}
        onCancel={() => setPreviewState({ open: false })}
        width={640}
      >
        {previewState.task ? (
          <div className="cutting-color-grid">
            {previewState.task.colors.map((color) => (
              <div className="cutting-color-item" key={`${previewState.task?.id}-${color.name}`}>
                <ListImage
                  src={color.image}
                  alt={color.name}
                  width="100%"
                  height={140}
                  borderRadius={8}
                />
                <Text>{color.name}</Text>
                {color.fabric ? (
                  <Text type="secondary" style={{ display: 'block' }}>{color.fabric}</Text>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Modal>

      <Modal
        title={detailState.task ? `裁床任务详情 - ${detailState.task.orderCode}` : '裁床任务详情'}
        open={detailState.open}
        footer={null}
        onCancel={() => setDetailState({ open: false })}
        width={720}
      >
        {detailState.task ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="订单号">{detailState.task.orderCode}</Descriptions.Item>
              <Descriptions.Item label="款号">{detailState.task.styleCode}</Descriptions.Item>
              <Descriptions.Item label="款名">{detailState.task.styleName}</Descriptions.Item>
              <Descriptions.Item label="客户">{detailState.task.customer || '-'}</Descriptions.Item>
              <Descriptions.Item label="下单日期">{detailState.task.orderDate}</Descriptions.Item>
              <Descriptions.Item label="计划排床">{detailState.task.scheduleDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="下单数量">
                {detailState.task.orderedQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="已裁数量">
                {detailState.task.cutQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="待裁数量">
                {detailState.task.pendingQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="面料">{detailState.task.fabricSummary || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailState.task.remarks || '-'}</Descriptions.Item>
            </Descriptions>
            <div>
              <Text type="secondary">颜色明细</Text>
              <div style={{ marginTop: 8 }}>
                <Space size={[8, 8]} wrap>
                  {detailState.task.colors.map((color) => (
                    <Tag key={`${detailState.task?.id}-${color.name}`} color="geekblue">
                      {color.name}{color.fabric ? ` (${color.fabric})` : ''}
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

export default CuttingPendingPage;
