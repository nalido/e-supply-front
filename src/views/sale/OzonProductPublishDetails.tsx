import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import {
  Button,
  Empty,
  Input,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import type { SaleAsyncTask, SaleAsyncTaskItem } from '../../types/sale';
import './sale-workspace.css';
import './ozon-product-publish.css';

const { Text } = Typography;

const TASK_TYPE = 'OZON_PRODUCT_BULK_PUBLISH';

const statusColor = (value?: string | null) => {
  const normalized = (value || '').toUpperCase();
  if (normalized === 'SUCCESS') return 'green';
  if (normalized === 'FAILED' || normalized === 'PARTIAL_FAILED') return 'red';
  if (normalized === 'RUNNING') return 'blue';
  if (normalized === 'PENDING') return 'gold';
  if (normalized === 'CANCELED' || normalized === 'SKIPPED') return 'default';
  return 'default';
};

const statusLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '执行中',
    SUCCESS: '成功',
    FAILED: '失败',
    PARTIAL_FAILED: '部分失败',
    SKIPPED: '已跳过',
    CANCELED: '已终止',
  };
  return labels[(value || '').toUpperCase()] || value || '--';
};

const stringValue = (value: unknown) => (value === null || value === undefined ? '' : String(value));

const parseJsonObject = (value?: string | null): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const taskNo = (task: SaleAsyncTask) => stringValue(task.taskName).replace(/\s*批量铺货$/, '') || task.taskId;

const itemRequest = (record: SaleAsyncTaskItem) => parseJsonObject(record.requestPayloadJson);
const itemResponse = (record: SaleAsyncTaskItem) => parseJsonObject(record.responsePayloadJson);
const itemCleanup = (record: SaleAsyncTaskItem) => asRecord(itemResponse(record).cleanup);
const itemShopName = (record: SaleAsyncTaskItem) => stringValue(itemRequest(record).shopName || record.itemName || record.channelAccountId || '--');
const itemProductName = (record: SaleAsyncTaskItem) => stringValue(itemRequest(record).productName || itemResponse(record).productName || '--');
const itemOfferId = (record: SaleAsyncTaskItem) => stringValue(itemRequest(record).targetOfferId || itemResponse(record).targetOfferId || '--');
const countValue = (value?: number | null) => (typeof value === 'number' ? value : 0);
const cleanupAction = (record: SaleAsyncTaskItem) => stringValue(itemCleanup(record).action).toUpperCase();
const isLiveTask = (task?: SaleAsyncTask) => ['PENDING', 'RUNNING'].includes((task?.status || '').toUpperCase());
const isCanceledTask = (task?: SaleAsyncTask) => (task?.status || '').toUpperCase() === 'CANCELED';
const isRetryableTask = (task?: SaleAsyncTask) => countValue(task?.failedCount) > 0 && !isLiveTask(task);

const itemProductStatusTag = (record: SaleAsyncTaskItem) => {
  const action = cleanupAction(record);
  if (itemCleanup(record).requestId && action === 'ARCHIVE') {
    return <Tag color="blue">已下架</Tag>;
  }
  if (itemCleanup(record).requestId) {
    return <Tag color="default">已删除</Tag>;
  }
  const status = (record.status || '').toUpperCase();
  if (status === 'SUCCESS') return <Tag color="green">发布成功</Tag>;
  if (status === 'FAILED') return <Tag color="red">发布失败</Tag>;
  if (status === 'RUNNING') return <Tag color="blue">发布中</Tag>;
  if (status === 'PENDING') return <Tag color="gold">待发布</Tag>;
  if (status === 'SKIPPED') return <Tag>已跳过</Tag>;
  return <Tag>{statusLabel(record.status)}</Tag>;
};

const OzonProductPublishDetails = () => {
  const [searchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [tasks, setTasks] = useState<SaleAsyncTask[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(20);
  const [activeTask, setActiveTask] = useState<SaleAsyncTask>();
  const [items, setItems] = useState<SaleAsyncTaskItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useState(20);
  const [shopKeyword, setShopKeyword] = useState('');
  const [productKeyword, setProductKeyword] = useState('');
  const [selectedItemKeys, setSelectedItemKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const queryTaskId = searchParams.get('taskId');

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await saleApi.listSaleAsyncTasksPage({
        taskType: TASK_TYPE,
        page: taskPage,
        pageSize: taskPageSize,
      });
      setTasks(response.list);
      setTasksTotal(response.total || 0);
    } catch (error) {
      const text = error instanceof Error ? error.message : '铺货批次加载失败';
      if (!silent) messageApi.error(text);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [messageApi, taskPage, taskPageSize]);

  const loadItems = useCallback(async (silent = false) => {
    if (!activeTask?.taskId) return;
    if (!silent) setItemLoading(true);
    try {
      const [task, response] = await Promise.all([
        saleApi.getSaleAsyncTask(activeTask.taskId),
        saleApi.listSaleAsyncTaskItems(activeTask.taskId, {
          page: itemPage,
          pageSize: itemPageSize,
          shopKeyword: shopKeyword.trim() || undefined,
          productKeyword: productKeyword.trim() || undefined,
        }),
      ]);
      setActiveTask(task);
      setItems(response.list);
      setItemsTotal(response.total || 0);
      setSelectedItemKeys([]);
    } catch (error) {
      const text = error instanceof Error ? error.message : '铺货明细加载失败';
      if (!silent) messageApi.error(text);
    } finally {
      if (!silent) setItemLoading(false);
    }
  }, [activeTask?.taskId, itemPage, itemPageSize, messageApi, productKeyword, shopKeyword]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!queryTaskId) return;
    let ignore = false;
    const openTask = async () => {
      try {
        const task = await saleApi.getSaleAsyncTask(queryTaskId);
        if (!ignore) {
          setActiveTask(task);
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : '指定铺货批次加载失败';
        messageApi.error(text);
      }
    };
    void openTask();
    return () => {
      ignore = true;
    };
  }, [messageApi, queryTaskId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (activeTask) return undefined;
    const timer = window.setInterval(() => {
      void loadTasks(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeTask, loadTasks]);

  useEffect(() => {
    if (!activeTask?.taskId || !isLiveTask(activeTask)) return undefined;
    const timer = window.setInterval(() => {
      void loadItems(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeTask, loadItems]);

  const canCleanup = (record: SaleAsyncTaskItem) => (
    (record.status || '').toUpperCase() === 'SUCCESS' && !itemCleanup(record).requestId
  );

  const cleanupItems = async (action: 'archive' | 'delete', records: SaleAsyncTaskItem[]) => {
    if (!activeTask?.taskId || !records.length) return;
    setItemLoading(true);
    try {
      if (records.length === 1) {
        if (action === 'archive') {
          await saleApi.archiveSaleAsyncTaskItemProducts(activeTask.taskId, records[0].itemId);
        } else {
          await saleApi.deleteSaleAsyncTaskItemProducts(activeTask.taskId, records[0].itemId);
        }
      } else {
        await saleApi.cleanupSaleAsyncTaskItemsProducts(activeTask.taskId, action, records.map((record) => record.itemId));
      }
      messageApi.success(action === 'archive' ? '已提交下架' : '已提交删除');
      await loadItems();
    } catch (error) {
      const text = error instanceof Error ? error.message : action === 'archive' ? '下架失败' : '删除失败';
      messageApi.error(text);
    } finally {
      setItemLoading(false);
    }
  };

  const cancelTask = async (task: SaleAsyncTask) => {
    setLoading(true);
    setItemLoading(true);
    try {
      const result = await saleApi.cancelSaleAsyncTask(task.taskId);
      messageApi.success('任务已终止');
      setActiveTask((current) => current && String(current.taskId) === String(result.taskId) ? result : current);
      await Promise.all([loadTasks(true), activeTask ? loadItems(true) : Promise.resolve()]);
    } catch (error) {
      const text = error instanceof Error ? error.message : '终止任务失败';
      messageApi.error(text);
    } finally {
      setLoading(false);
      setItemLoading(false);
    }
  };

  const runTask = async (task: SaleAsyncTask) => {
    setLoading(true);
    setItemLoading(true);
    try {
      const result = await saleApi.runSaleAsyncTask(task.taskId);
      messageApi.success('任务已重新运行');
      setActiveTask((current) => current && String(current.taskId) === String(result.taskId) ? result : current);
      await Promise.all([loadTasks(true), activeTask ? loadItems(true) : Promise.resolve()]);
    } catch (error) {
      const text = error instanceof Error ? error.message : '重新运行任务失败';
      messageApi.error(text);
    } finally {
      setLoading(false);
      setItemLoading(false);
    }
  };

  const retryTask = async (task: SaleAsyncTask) => {
    setLoading(true);
    setItemLoading(true);
    try {
      const result = await saleApi.retrySaleAsyncTaskFailedItems(task.taskId);
      messageApi.success('失败明细已重新加入执行队列');
      setActiveTask((current) => current && String(current.taskId) === String(result.taskId) ? result : current);
      await Promise.all([loadTasks(true), activeTask ? loadItems(true) : Promise.resolve()]);
    } catch (error) {
      const text = error instanceof Error ? error.message : '重试失败任务失败';
      messageApi.error(text);
    } finally {
      setLoading(false);
      setItemLoading(false);
    }
  };

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemKeys.includes(item.itemId) && canCleanup(item)),
    [items, selectedItemKeys],
  );

  const taskColumns: ColumnsType<SaleAsyncTask> = [
    {
      title: '铺货批次',
      width: 320,
      render: (_, record) => (
        <div className="opp-attribute-cell">
          <Button
            type="link"
            size="small"
            className="opp-link-button"
            onClick={() => {
              setActiveTask(record);
              setItemPage(1);
              setShopKeyword('');
              setProductKeyword('');
            }}
          >
            {taskNo(record)}
          </Button>
          <Text type="secondary">任务 ID {record.taskId} · {record.createdAt || '--'}</Text>
        </div>
      ),
    },
    { title: '状态', width: 96, render: (_, record) => <Tag color={statusColor(record.status)}>{statusLabel(record.status)}</Tag> },
    { title: '商品', width: 86, render: (_, record) => <Text>{countValue(record.productCount)}</Text> },
    { title: '目标店铺', width: 108, render: (_, record) => <Text>{countValue(record.targetShopCount)}</Text> },
    { title: '任务', width: 86, render: (_, record) => <Text>{countValue(record.totalCount)}</Text> },
    { title: '成功/撤回', width: 118, render: (_, record) => <Text>{countValue(record.successCount)}/{countValue(record.cleanupCount)}</Text> },
    { title: '失败/待执行', width: 128, render: (_, record) => <Text>{countValue(record.failedCount)}/{countValue(record.pendingCount)}</Text> },
    {
      title: '进度',
      width: 160,
      render: (_, record) => <Progress percent={record.progressPercent || 0} size="small" status={(record.failedCount || 0) > 0 ? 'exception' : 'success'} />,
    },
    {
      title: '操作',
      fixed: 'right',
      width: 176,
      render: (_, record) => (
        <Space size={4} className="opp-task-actions">
          <Popconfirm
            title="重试失败明细？"
            description="只会重试仍有重试次数的失败明细，已成功和已跳过明细不会重复提交。"
            okText="重试"
            cancelText="取消"
            disabled={!isRetryableTask(record)}
            onConfirm={() => void retryTask(record)}
          >
            <Button type="link" size="small" disabled={!isRetryableTask(record)}>重试</Button>
          </Popconfirm>
          <Popconfirm
            title="重新运行该任务？"
            description="会把上次终止时跳过的明细重新加入执行队列。"
            okText="运行"
            cancelText="取消"
            disabled={!isCanceledTask(record)}
            onConfirm={() => void runTask(record)}
          >
            <Button type="link" size="small" disabled={!isCanceledTask(record)}>运行</Button>
          </Popconfirm>
          <Popconfirm
            title="终止该发布任务？"
            description="终止后未执行的明细会被跳过，已经提交到 Ozon 的请求不能撤回。"
            okText="终止"
            cancelText="取消"
            disabled={!isLiveTask(record)}
            onConfirm={() => void cancelTask(record)}
          >
            <Button danger type="link" size="small" disabled={!isLiveTask(record)}>终止</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const itemColumns: ColumnsType<SaleAsyncTaskItem> = [
    { title: '目标店铺', width: 260, render: (_, record) => <Text className="opp-detail-shop" ellipsis={{ tooltip: itemShopName(record) }}>{itemShopName(record)}</Text> },
    {
      title: '商品',
      width: 360,
      render: (_, record) => (
        <div className="opp-detail-product">
          <Text strong className="opp-detail-product__name" ellipsis={{ tooltip: itemProductName(record) }}>{itemProductName(record)}</Text>
          <Text type="secondary" className="opp-detail-product__offer">{itemOfferId(record)}</Text>
        </div>
      ),
    },
    { title: '状态', width: 92, align: 'center', render: (_, record) => <Tag color={statusColor(record.status)}>{statusLabel(record.status)}</Tag> },
    { title: '商品状态', width: 108, align: 'center', render: (_, record) => itemProductStatusTag(record) },
    { title: '重试', width: 72, align: 'center', render: (_, record) => `${record.attemptCount || 0}/${record.maxAttemptCount || 0}` },
    { title: 'Ozon 任务', width: 150, render: (_, record) => <Text className="opp-mono" ellipsis={{ tooltip: stringValue(itemResponse(record).ozonTaskId || itemResponse(record).requestId || '--') }}>{stringValue(itemResponse(record).ozonTaskId || itemResponse(record).requestId || '--')}</Text> },
    {
      title: '结果 / 失败原因',
      width: 420,
      render: (_, record) => {
        const cleanup = itemCleanup(record);
        if (record.errorMessage) return <div className="opp-detail-error" title={record.errorMessage}>{record.errorMessage}</div>;
        if (cleanup.requestId) {
          return <Text type="secondary" ellipsis={{ tooltip: `请求 ${stringValue(cleanup.requestId)}` }}>{cleanup.action === 'ARCHIVE' ? '已下架' : '已删除'}，请求 {stringValue(cleanup.requestId)}</Text>;
        }
        return <Text type="secondary">{record.finishedAt ? '平台已接受提交' : '--'}</Text>;
      },
    },
    {
      title: '操作',
      fixed: 'right',
      width: 136,
      render: (_, record) => (
        <Space size={4}>
          <Popconfirm
            title="下架该商品？"
            okText="下架"
            cancelText="取消"
            disabled={!canCleanup(record)}
            onConfirm={() => void cleanupItems('archive', [record])}
          >
            <Button type="link" size="small" disabled={!canCleanup(record)} icon={<CloudDownloadOutlined />}>下架</Button>
          </Popconfirm>
          <Popconfirm
            title="删除该商品？"
            okText="删除"
            cancelText="取消"
            disabled={!canCleanup(record)}
            onConfirm={() => void cleanupItems('delete', [record])}
          >
            <Button danger type="link" size="small" disabled={!canCleanup(record)} icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" className="opp-full" size={16}>
      {contextHolder}
      {!activeTask ? (
        <section className="opp-panel">
          <div className="opp-section-title">
	            <div>
	              <Text strong>历史铺货批次</Text>
	              <Text type="secondary">这里展示每次提交生成的发布批次；草稿不再作为历史数据管理。</Text>
	            </div>
            <Button icon={<ReloadOutlined />} onClick={() => void loadTasks()}>刷新</Button>
          </div>
          <Table
            rowKey={(record) => record.taskId}
            size="small"
            loading={loading}
            columns={taskColumns}
            dataSource={tasks}
            pagination={{
              current: taskPage,
              pageSize: taskPageSize,
              total: tasksTotal,
              showSizeChanger: true,
              onChange: (nextPage, nextSize) => {
                setTaskPage(nextPage);
                setTaskPageSize(nextSize);
              },
            }}
            scroll={{ x: 1360 }}
          />
        </section>
      ) : (
        <section className="opp-panel">
          <div className="opp-section-title">
            <div className="opp-detail-heading">
              <Button className="opp-detail-back" type="link" icon={<ArrowLeftOutlined />} onClick={() => setActiveTask(undefined)}>返回批次列表</Button>
              <div className="opp-detail-title-block">
                <Text strong>{taskNo(activeTask)}</Text>
                <Text type="secondary">目标店铺商品级明细会自动刷新，支持筛选、单条处理和批量下架/删除。</Text>
              </div>
            </div>
            <Tag color={statusColor(activeTask.status)}>{statusLabel(activeTask.status)}</Tag>
          </div>
          <div className="opp-async-progress">
            <Progress percent={activeTask.progressPercent || 0} status={(activeTask.failedCount || 0) > 0 ? 'exception' : 'success'} />
            <div className="opp-async-progress__stats">
              <Text>商品 {countValue(activeTask.productCount)}</Text>
              <Text>目标店铺 {countValue(activeTask.targetShopCount)}</Text>
              <Text>任务 {countValue(activeTask.totalCount)}</Text>
              <Text type="success">成功 {countValue(activeTask.successCount)}</Text>
              <Text type="secondary">撤回 {countValue(activeTask.cleanupCount)}</Text>
              <Text type={countValue(activeTask.failedCount) ? 'danger' : 'secondary'}>失败 {countValue(activeTask.failedCount)}</Text>
              <Text type="secondary">待执行 {countValue(activeTask.pendingCount)}</Text>
            </div>
          </div>
          <Space wrap>
            <Input
              allowClear
              prefix={<ShopOutlined />}
              placeholder="按目标店铺筛选"
              value={shopKeyword}
              onChange={(event) => {
                setShopKeyword(event.target.value);
                setItemPage(1);
              }}
              style={{ width: 240 }}
            />
            <Input
              allowClear
              prefix={<FileSearchOutlined />}
              placeholder="按商品名 / offer_id 筛选"
              value={productKeyword}
              onChange={(event) => {
                setProductKeyword(event.target.value);
                setItemPage(1);
              }}
              style={{ width: 280 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void loadItems()}>刷新明细</Button>
            <Popconfirm
              title="重试失败明细？"
              description="只会重试仍有重试次数的失败明细，已成功和已跳过明细不会重复提交。"
              okText="重试"
              cancelText="取消"
              disabled={!isRetryableTask(activeTask)}
              onConfirm={() => void retryTask(activeTask)}
            >
              <Button disabled={!isRetryableTask(activeTask)}>重试失败</Button>
            </Popconfirm>
            <Popconfirm
              title="重新运行该任务？"
              description="会把上次终止时跳过的明细重新加入执行队列。"
              okText="运行"
              cancelText="取消"
              disabled={!isCanceledTask(activeTask)}
              onConfirm={() => void runTask(activeTask)}
            >
              <Button disabled={!isCanceledTask(activeTask)}>运行任务</Button>
            </Popconfirm>
            <Popconfirm
              title="终止该发布任务？"
              description="终止后未执行的明细会被跳过，已经提交到 Ozon 的请求不能撤回。"
              okText="终止"
              cancelText="取消"
              disabled={!isLiveTask(activeTask)}
              onConfirm={() => void cancelTask(activeTask)}
            >
              <Button danger disabled={!isLiveTask(activeTask)}>终止任务</Button>
            </Popconfirm>
            <Popconfirm
              title={`批量下架 ${selectedItems.length} 条商品？`}
              okText="下架"
              cancelText="取消"
              disabled={!selectedItems.length}
              onConfirm={() => void cleanupItems('archive', selectedItems)}
            >
              <Button disabled={!selectedItems.length} icon={<CloudDownloadOutlined />}>批量下架</Button>
            </Popconfirm>
            <Popconfirm
              title={`批量删除 ${selectedItems.length} 条商品？`}
              okText="删除"
              cancelText="取消"
              disabled={!selectedItems.length}
              onConfirm={() => void cleanupItems('delete', selectedItems)}
            >
              <Button danger disabled={!selectedItems.length} icon={<DeleteOutlined />}>批量删除</Button>
            </Popconfirm>
          </Space>
          {items.length ? (
            <Table
              rowKey={(record) => record.itemId}
              className="opp-detail-table"
              tableLayout="fixed"
              loading={itemLoading}
              columns={itemColumns}
              dataSource={items}
              rowSelection={{
                selectedRowKeys: selectedItemKeys,
                onChange: setSelectedItemKeys,
                getCheckboxProps: (record) => ({ disabled: !canCleanup(record) }),
              }}
              pagination={{
                current: itemPage,
                pageSize: itemPageSize,
                total: itemsTotal,
                showSizeChanger: true,
                onChange: (nextPage, nextSize) => {
                  setItemPage(nextPage);
                  setItemPageSize(nextSize);
                },
              }}
              scroll={{ x: 1320 }}
            />
          ) : (
            <Empty description="当前筛选条件下没有铺货明细" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </section>
      )}
    </Space>
  );
};

export default OzonProductPublishDetails;
