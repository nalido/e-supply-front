import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
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
import { fetchCuttingCompletedDataset } from '../mock';
import '../styles/cutting-pending.css';

const { Text } = Typography;

const initialDataset: CuttingTaskDataset = {
  summary: [],
  list: [],
  total: 0,
};

type ColorPreviewState = {
  open: boolean;
  task?: CuttingTask;
};

const filterTasks = (tasks: CuttingTask[], keyword: string): CuttingTask[] => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return tasks;
  }
  return tasks.filter((task) => {
    const haystack = [task.orderCode, task.styleCode, task.styleName].join(' ').toLowerCase();
    return haystack.includes(normalized);
  });
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });

  useEffect(() => {
    setLoading(true);
    fetchCuttingCompletedDataset().then((data) => {
      setDataset(data);
      setPage(1);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const filteredTasks = useMemo(
    () => filterTasks(dataset.list, keyword),
    [dataset.list, keyword],
  );

  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, page, pageSize]);

  const handleSearch = (value: string) => {
    setKeyword(value.trim());
  };

  const handleOpenPreview = (task: CuttingTask) => {
    setPreviewState({ open: true, task });
  };

  const handleViewDetail = (task: CuttingTask) => {
    message.info(`跳转裁床单详情：${task.orderCode}`);
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
      ) : paginatedTasks.length === 0 ? (
        <Empty description={keyword ? '未找到匹配的已裁订单' : '暂无已裁订单'} />
      ) : (
        <div className="cutting-task-list">
          {paginatedTasks.map((task) => {
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
                    <img src={task.thumbnail} alt={task.styleName} className="cutting-task-thumbnail" />
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

      {filteredTasks.length > 0 ? (
        <div className="cutting-pagination-wrap">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredTasks.length}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={[6, 9, 12]}
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
                <img src={color.image} alt={color.name} />
                <Text>{color.name}</Text>
                {color.fabric ? (
                  <Text type="secondary" style={{ display: 'block' }}>{color.fabric}</Text>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default CuttingCompletedPage;
