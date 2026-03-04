import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
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
import {
  CalendarOutlined,
  CheckCircleTwoTone,
  EyeOutlined,
  PictureOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
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
  pageSize: 6,
};

type ColorPreviewState = {
  open: boolean;
  task?: CuttingTask;
};

type DetailModalState = {
  open: boolean;
  task?: CuttingTask;
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

const CuttingCompletedPage = () => {
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });
  const [detailState, setDetailState] = useState<DetailModalState>({ open: false });

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await pieceworkService.getCuttingCompleted({
          page,
          pageSize,
          keyword: appliedKeyword,
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
        console.error('failed to load completed cutting tasks', error);
        if (!cancelled) {
          message.error('获取已裁记录失败，请稍后重试');
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
  }, [page, pageSize, appliedKeyword]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    setAppliedKeyword(trimmed);
    setPage(1);
  };

  const handleOpenPreview = (task: CuttingTask) => {
    setPreviewState({ open: true, task });
  };

  const handleViewDetail = (task: CuttingTask) => {
    setDetailState({ open: true, task });
  };

  return (
    <div className="cutting-completed-page">
      <section className="cutting-summary-section">
        <Space size={16} wrap>
          {dataset.summary.map(renderMetric)}
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
      </section>

      {loading ? (
        <div className="cutting-task-list">
          {Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      ) : dataset.list.length === 0 ? (
        <Empty description={appliedKeyword ? '未找到匹配的已裁订单' : '暂无已裁订单'} />
      ) : (
        <div className="cutting-task-list">
          {dataset.list.map((task) => {
            const pendingHighlight = task.pendingQuantity !== 0 ? 'cutting-qty-highlight' : '';
            const isOverCut = task.pendingQuantity < 0;
            return (
              <article
                className="cutting-task-card"
                key={task.id}
                onClick={() => handleViewDetail(task)}
              >
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
                      {task.remarks ? (
                        <Text type="secondary">{task.remarks}</Text>
                      ) : null}
                      <div className="cutting-task-tags">
                        {task.pendingQuantity <= 0 ? (
                          <Tag color="success" bordered={false}>
                            <CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 4 }} />
                            裁床完成
                          </Tag>
                        ) : (
                          <Tag color="processing" bordered={false}>
                            裁床收尾中
                          </Tag>
                        )}
                        {isOverCut ? (
                          <Tag color="volcano" bordered={false}>
                            超裁 {Math.abs(task.pendingQuantity)} {task.unit}
                          </Tag>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="cutting-task-actions">
                    <Button
                      icon={<PictureOutlined />}
                      type="link"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenPreview(task);
                      }}
                    >
                      颜色图
                    </Button>
                    <Button
                      icon={<EyeOutlined />}
                      type="text"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleViewDetail(task);
                      }}
                    >
                      详情
                    </Button>
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
                  <div className={pendingHighlight}>
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
            pageSizeOptions={[6, 9, 12]}
            showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize ?? pageSize);
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
                  fallback={<PictureOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
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
              <Descriptions.Item label="面料">{detailState.task.fabricSummary || '-'}</Descriptions.Item>
              <Descriptions.Item label="下单数量">
                {detailState.task.orderedQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="已裁数量">
                {detailState.task.cutQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="待裁数量">
                {detailState.task.pendingQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="备注">{detailState.task.remarks || '-'}</Descriptions.Item>
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

export default CuttingCompletedPage;
