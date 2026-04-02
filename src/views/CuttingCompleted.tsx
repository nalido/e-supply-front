import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Empty,
  Modal,
  Pagination,
  Skeleton,
  Space,
  Typography,
  message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { CuttingSheetDetail, CuttingTask, CuttingTaskDataset, CuttingTaskMetric } from '../types';
import { pieceworkService } from '../api/piecework';
import { SearchField } from '../components/page';
import '../styles/cutting-pending.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CuttingSheetDetailModal from '../components/CuttingSheetDetailModal';
import CuttingTaskCard from '../components/CuttingTaskCard';
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

const CuttingCompletedPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchKeyword = searchParams.get('keyword')?.trim() ?? '';
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState(initialSearchKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState(initialSearchKeyword);
  const [page, setPage] = useState(initialDataset.page);
  const [pageSize, setPageSize] = useState(initialDataset.pageSize);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });
  const [detailState, setDetailState] = useState<DetailModalState>({ open: false });
  const [sheetDetail, setSheetDetail] = useState<CuttingSheetDetail | null>(null);
  const [deletingBedKey, setDeletingBedKey] = useState<string | null>(null);

  const navigateToFactoryOrder = (orderCode?: string) => {
    const normalized = orderCode?.trim();
    if (!normalized) {
      return;
    }
    navigate(`/orders/factory?keyword=${encodeURIComponent(normalized)}&status=all`);
  };

  const loadCompletedTasks = useCallback(async (options?: { targetPage?: number }) => {
    const targetPage = options?.targetPage ?? page;
    setLoading(true);
    try {
      const response = await pieceworkService.getCuttingCompleted({
        page: targetPage,
        pageSize,
        keyword: appliedKeyword,
        includeSummary: targetPage === 1,
      });
      setDataset(response);
      if (response.page !== page) {
        setPage(response.page);
      }
      if (response.pageSize !== pageSize) {
        setPageSize(response.pageSize);
      }
      return response;
    } catch (error) {
      console.error('failed to load completed cutting tasks', error);
      message.error('获取已裁数据失败，请稍后重试');
      return null;
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page, pageSize]);

  const loadSheetDetail = useCallback(async (task: CuttingTask, options?: { silent?: boolean }) => {
    if (!task.workOrderId) {
      setSheetDetail(null);
      return null;
    }
    setDetailLoading(true);
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      setSheetDetail(detail);
      return detail;
    } catch (error) {
      console.error('failed to load cutting sheet detail', error);
      setSheetDetail(null);
      if (!options?.silent) {
        message.error('获取裁床单详情失败');
      }
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const response = await loadCompletedTasks();
      if (cancelled || response == null) {
        return;
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [appliedKeyword, loadCompletedTasks, page, pageSize]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    setAppliedKeyword(trimmed);
    setPage(1);
  };

  const handleOpenPreview = (task: CuttingTask) => {
    setPreviewState({ open: true, task });
  };

  const handleViewDetail = useCallback((task: CuttingTask) => {
    setDetailState({ open: true, task });
    void loadSheetDetail(task);
  }, [loadSheetDetail]);

  const handleDeleteBed = async (record: NonNullable<CuttingSheetDetail['bedRecords']>[number]) => {
    if (!detailState.task?.workOrderId) {
      message.warning('当前裁床单缺少工单信息，无法删除床次');
      return;
    }
    if (!record.recordedAt) {
      message.warning('该床次缺少录入时间，暂时无法删除');
      return;
    }
    const deleteKey = `${record.bedNumber}::${record.recordedAt}`;
    setDeletingBedKey(deleteKey);
    try {
      await pieceworkService.deleteCuttingSheetBed(detailState.task.workOrderId, {
        bedNumber: record.bedNumber,
        recordedAt: record.recordedAt,
      });
      message.success('床次已删除');
      const nextDetail = await loadSheetDetail(detailState.task, { silent: true });
      await loadCompletedTasks();
      if (nextDetail && nextDetail.status !== 'COMPLETED') {
        setDetailState({ open: false });
        setSheetDetail(null);
        message.info('裁床单已回退到待裁列表');
      }
    } catch (error) {
      console.error('failed to delete cutting bed', error);
      message.error(error instanceof Error ? error.message : '删除床次失败');
    } finally {
      setDeletingBedKey(null);
    }
  };

  useEffect(() => {
    const nextKeyword = searchParams.get('keyword')?.trim() ?? '';
    setKeyword((current) => (current === nextKeyword ? current : nextKeyword));
    setAppliedKeyword((current) => (current === nextKeyword ? current : nextKeyword));
    setPage((current) => (current === 1 ? current : 1));
  }, [searchParams]);

  useEffect(() => {
    const rawWorkOrderId = Number(searchParams.get('workOrderId') ?? 0);
    const openDetail = searchParams.get('openDetail') === '1';
    if (!openDetail || !Number.isFinite(rawWorkOrderId) || rawWorkOrderId <= 0 || loading) {
      return;
    }
    const targetTask = dataset.list.find((task) => Number(task.workOrderId) === rawWorkOrderId);
    if (!targetTask) {
      return;
    }
    if (detailState.task?.workOrderId === rawWorkOrderId && detailState.open) {
      const next = new URLSearchParams(searchParams);
      next.delete('workOrderId');
      next.delete('openDetail');
      setSearchParams(next, { replace: true });
      return;
    }
    handleViewDetail(targetTask);
    const next = new URLSearchParams(searchParams);
    next.delete('workOrderId');
    next.delete('openDetail');
    setSearchParams(next, { replace: true });
  }, [dataset.list, detailState.open, detailState.task?.workOrderId, handleViewDetail, loading, searchParams, setSearchParams]);

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
          {dataset.list.map((task) => (
            <CuttingTaskCard
              key={task.workOrderId ?? task.id}
              task={task}
              onViewDetail={handleViewDetail}
              onPreview={handleOpenPreview}
              onNavigateToFactoryOrder={navigateToFactoryOrder}
              detailButtonType="link"
              colorButtonType="link"
              pendingLabel="剩余数量"
            />
          ))}
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
          setDeletingBedKey(null);
        }}
        onNavigateToFactoryOrder={navigateToFactoryOrder}
        onNavigate={navigate}
        onDeleteBed={handleDeleteBed}
        deletingBedKey={deletingBedKey}
      />
    </div>
  );
};

export default CuttingCompletedPage;
