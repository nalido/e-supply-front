import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
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
  PictureOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { CuttingSheetDetail, CuttingTask, CuttingTaskDataset, CuttingTaskMetric } from '../types';
import { pieceworkService } from '../api/piecework';
import { SearchField } from '../components/page';
import '../styles/cutting-pending.css';
import ListImage from '../components/common/ListImage';
import { useNavigate } from 'react-router-dom';
import CuttingSheetDetailModal from '../components/CuttingSheetDetailModal';

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

const CuttingCompletedPage = () => {
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(initialDataset.page);
  const [pageSize, setPageSize] = useState(initialDataset.pageSize);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });
  const [detailState, setDetailState] = useState<DetailModalState>({ open: false });
  const [sheetDetail, setSheetDetail] = useState<CuttingSheetDetail | null>(null);

  const navigateToFactoryOrder = (orderCode?: string) => {
    const normalized = orderCode?.trim();
    if (!normalized) {
      return;
    }
    navigate(`/orders/factory?keyword=${encodeURIComponent(normalized)}`);
  };

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
          message.error('获取已裁数据失败，请稍后重试');
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
    if (!task.workOrderId) {
      setSheetDetail(null);
      return;
    }
    setDetailLoading(true);
    void pieceworkService.getCuttingSheetDetail(task.workOrderId)
      .then((detail) => setSheetDetail(detail))
      .catch((error) => {
        console.error('failed to load cutting sheet detail', error);
        setSheetDetail(null);
        message.error('获取裁床单详情失败');
      })
      .finally(() => setDetailLoading(false));
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
        <SearchField
          allowClear
          placeholder="请输入订单号/款名/款号"
          value={keyword}
          onChange={setKeyword}
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
        <Empty description={appliedKeyword ? '未找到匹配的已裁任务' : '暂无已裁任务'} />
      ) : (
        <div className="cutting-task-list">
          {dataset.list.map((task) => {
            return (
              <article className="cutting-task-card" key={task.workOrderId ?? task.id}>
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
                        <Tag color="success" bordered={false}>已裁</Tag>
                      </div>
                      <div className="cutting-task-meta">
                        <Space size={12} wrap>
                          <span>
                            订单号：
                            <Button
                              type="link"
                              size="small"
                              style={{ paddingInline: 4 }}
                              onClick={() => navigateToFactoryOrder(task.orderCode)}
                            >
                              {task.orderCode}
                            </Button>
                          </span>
                          <span>床次：{task.bedNumber || '-'}</span>
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
                    </div>
                  </div>
                  <div className="cutting-task-actions">
                    <Button type="link" onClick={() => handleViewDetail(task)}>
                      查看详情
                    </Button>
                    <Button
                      icon={<PictureOutlined />}
                      type="link"
                      onClick={() => handleOpenPreview(task)}
                    >
                      颜色图
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
                  <div>
                    <div className="label">剩余数量</div>
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
            pageSizeOptions={[6, 10, 20]}
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
        width={760}
      >
        {previewState.task ? (
          <div className="cutting-color-grid">
            {previewState.task.colors.map((color) => (
              <div className="cutting-color-item" key={`${previewState.task?.id}-${color.name}`}>
                <ListImage
                  src={color.image}
                  alt={color.name}
                  width="100%"
                  height={180}
                  borderRadius={8}
                  objectFit="contain"
                  background="#fff"
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

      <CuttingSheetDetailModal
        open={detailState.open}
        loading={detailLoading}
        task={detailState.task}
        detail={sheetDetail}
        onClose={() => {
          setDetailState({ open: false });
          setSheetDetail(null);
        }}
        onNavigateToFactoryOrder={navigateToFactoryOrder}
        onNavigate={navigate}
      />
    </div>
  );
};

export default CuttingCompletedPage;
