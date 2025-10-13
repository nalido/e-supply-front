import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
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
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { CuttingTask, CuttingTaskDataset, CuttingTaskMetric } from '../types';
import { fetchCuttingPendingDataset } from '../mock';
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

type MenuClickEvent = Parameters<NonNullable<MenuProps['onClick']>>[0];

const filterTasks = (tasks: CuttingTask[], keyword: string, includeCompleted: boolean): CuttingTask[] => {
  const normalized = keyword.trim().toLowerCase();
  return tasks.filter((task) => {
    if (!includeCompleted && task.pendingQuantity <= 0) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    const haystack = [task.orderCode, task.styleCode, task.styleName].join(' ').toLowerCase();
    return haystack.includes(normalized);
  });
};

const CuttingPendingPage = () => {
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });

  useEffect(() => {
    setLoading(true);
    fetchCuttingPendingDataset().then((data) => {
      setDataset(data);
      setPage(1);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, includeCompleted]);

  const filteredTasks = useMemo(
    () => filterTasks(dataset.list, keyword, includeCompleted),
    [dataset.list, keyword, includeCompleted],
  );

  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, page, pageSize]);

  const handleSearch = (value: string) => {
    setKeyword(value.trim());
  };

  const handleIncludeCompleted = (event: CheckboxChangeEvent) => {
    setIncludeCompleted(event.target.checked);
  };

  const handleOpenPreview = (task: CuttingTask) => {
    setPreviewState({ open: true, task });
  };

  const handleMenuClick = (task: CuttingTask) => (event: MenuClickEvent) => {
    if (event.key === 'create-sheet') {
      message.info(`即将跳转至新建裁床单页面：${task.orderCode}`);
      return;
    }
    if (event.key === 'edit') {
      message.success(`已进入编辑流程：${task.orderCode}`);
      return;
    }
    if (event.key === 'view') {
      message.info(`查看工厂订单详情：${task.orderCode}`);
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
      ) : paginatedTasks.length === 0 ? (
        <Empty description={keyword ? '未找到匹配的待裁任务' : '暂无待裁任务'} />
      ) : (
        <div className="cutting-task-list">
          {paginatedTasks.map((task) => {
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

      {filteredTasks.length > 0 ? (
        <div className="cutting-pagination-wrap">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredTasks.length}
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

export default CuttingPendingPage;
