import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ProgressProps } from 'antd/es/progress';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ApartmentOutlined, CalendarOutlined, ProfileOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  Modal,
  Pagination,
  Progress,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
} from 'antd';
import type { StepsProps } from 'antd';
import type {
  WorkshopProgressDataset,
  WorkshopProgressOrder,
  WorkshopStageStatus,
} from '../types';
import { fetchWorkshopProgressDataset } from '../mock';
import '../styles/workshop-progress.css';

const { Text } = Typography;

type SummaryMetric = {
  key: string;
  label: string;
  value: number;
  hint?: string;
  tone?: 'warning' | 'success';
};

const orderStatusTagColor: Record<WorkshopProgressOrder['status'], string> = {
  new: 'default',
  in_progress: 'processing',
  delayed: 'warning',
  completed: 'success',
};

const stageProgressStatus: Record<WorkshopStageStatus, ProgressProps['status']> = {
  not_started: 'normal',
  in_progress: 'active',
  completed: 'success',
  delayed: 'exception',
};

const stageProgressColor: Record<WorkshopStageStatus, string> = {
  not_started: '#d9d9d9',
  in_progress: '#1677ff',
  completed: '#52c41a',
  delayed: '#ff4d4f',
};

const stageStepStatus: Record<WorkshopStageStatus, StepsProps['status']> = {
  not_started: 'wait',
  in_progress: 'process',
  completed: 'finish',
  delayed: 'error',
};

const pageSize = 4;

const WorkshopProgress = () => {
  const [dataset, setDataset] = useState<WorkshopProgressDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [bedKeyword, setBedKeyword] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState<WorkshopProgressOrder | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchWorkshopProgressDataset().then((data) => {
      setDataset(data);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const summaryMetrics: SummaryMetric[] = useMemo(() => {
    if (!dataset) {
      return [
        { key: 'total', label: '总订单', value: 0 },
        { key: 'inProgress', label: '生产中', value: 0 },
        { key: 'delayed', label: '预警订单', value: 0, tone: 'warning' },
        { key: 'completed', label: '已完成', value: 0, tone: 'success' },
      ];
    }
    const { summary } = dataset;
    return [
      { key: 'total', label: '总订单', value: summary.totalOrders, hint: '当前查询范围内的订单数量' },
      {
        key: 'inProgress',
        label: '生产中',
        value: summary.inProductionOrders,
        hint: '正在各工序流转的订单',
      },
      {
        key: 'delayed',
        label: '预警订单',
        value: summary.delayedOrders,
        hint: '工序进度异常或滞后的订单',
        tone: 'warning',
      },
      {
        key: 'completed',
        label: '已完成',
        value: summary.completedOrders,
        hint: '全部工序完成并入库的订单',
        tone: 'success',
      },
    ];
  }, [dataset]);

  const filteredOrders = useMemo(() => {
    if (!dataset) return [];

    const lowerKeyword = keyword.trim().toLowerCase();
    const exactBed = bedKeyword.trim();

    return dataset.orders.filter((order) => {
      if (!includeCompleted && order.status === 'completed') {
        return false;
      }

      const matchesKeyword = lowerKeyword
        ? [
            order.orderNo,
            order.remark,
            order.styleNo,
            order.styleName,
            order.customer,
            order.colorSizeSummary,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(lowerKeyword))
        : true;

      const matchesBed = exactBed ? order.bedNo === exactBed : true;

      return matchesKeyword && matchesBed;
    });
  }, [dataset, keyword, bedKeyword, includeCompleted]);

  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const handleSearch = (value: string) => {
    setKeyword(value.trim());
    setCurrentPage(1);
  };

  const handleBedSearch = (value: string) => {
    setBedKeyword(value.trim());
    setCurrentPage(1);
  };

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  };

  const handleBedChange = (event: ChangeEvent<HTMLInputElement>) => {
    setBedKeyword(event.target.value);
  };

  const handleIncludeCompletedChange = (event: CheckboxChangeEvent) => {
    setIncludeCompleted(event.target.checked);
    setCurrentPage(1);
  };

  const handleOpenDetail = (order: WorkshopProgressOrder) => {
    setDetailOrder(order);
  };

  const handleCloseDetail = () => {
    setDetailOrder(null);
  };

  const computePercent = (completed: number, total: number): number => {
    if (!total) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  };

  const modalCurrentStep = useMemo(() => {
    if (!detailOrder) return 0;
    const activeIndex = detailOrder.stages.findIndex((stage) => stage.status === 'in_progress' || stage.status === 'delayed');
    if (activeIndex !== -1) {
      return activeIndex;
    }
    const firstPending = detailOrder.stages.findIndex((stage) => stage.status === 'not_started');
    if (firstPending !== -1) {
      return firstPending;
    }
    return detailOrder.stages.length - 1;
  }, [detailOrder]);

  return (
    <div className="workshop-progress-page">
      <div className="workshop-progress-summary">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.key}
            className={`workshop-summary-card${metric.tone ? ` ${metric.tone}` : ''}`}
          >
            <div className="workshop-summary-label">{metric.label}</div>
            <div className="workshop-summary-value">{metric.value}</div>
            {metric.hint ? (
              <div className="workshop-summary-hint">{metric.hint}</div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="workshop-progress-filters">
        <Input.Search
          allowClear
          style={{ flex: 1, minWidth: 240 }}
          placeholder="工厂订单号/工厂订单备注/款号/款名/客户名"
          value={keyword}
          onChange={handleKeywordChange}
          onSearch={handleSearch}
        />
        <Input.Search
          allowClear
          style={{ width: 200 }}
          placeholder="床次（精确查询）"
          value={bedKeyword}
          onChange={handleBedChange}
          onSearch={handleBedSearch}
        />
        <Checkbox checked={includeCompleted} onChange={handleIncludeCompletedChange}>
          包含已完成
        </Checkbox>
      </div>

      <div className="workshop-progress-legend">
        工序进度：<span className="legend-dot default" />未开始 / <span className="legend-dot processing" />进行中 /
        <span className="legend-dot warning" />预警 / <span className="legend-dot success" />已完成
      </div>

      {loading ? (
        <div className="workshop-progress-loading">
          <Spin tip="正在获取车间工序进度..." />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Empty description="暂未找到符合条件的订单" />
      ) : (
        <>
          <div className="workshop-progress-list">
            {pagedOrders.map((order) => (
              <article className="workshop-order-card" key={order.id}>
                <header className="workshop-order-header">
                  <Space size={8} wrap>
                    <Tag color={orderStatusTagColor[order.status]}>{order.statusLabel}</Tag>
                    <Text type="secondary">床次：{order.bedNo ?? '—'}</Text>
                  </Space>
                  <Button
                    type="link"
                    icon={<ApartmentOutlined />}
                    onClick={() => handleOpenDetail(order)}
                  >
                    工序甘特视图
                  </Button>
                </header>

                <div className="workshop-order-main">
                  <img alt={order.styleName} src={order.thumbnail} className="workshop-order-thumbnail" />
                  <div className="workshop-order-info">
                    <div className="workshop-order-title">{order.styleName}</div>
                    <div className="workshop-order-meta">
                      <span>款号：{order.styleNo}</span>
                      <span>订单号：{order.orderNo}</span>
                      <span>客户：{order.customer}</span>
                    </div>
                    <div className="workshop-order-meta">
                      <span className="workshop-order-meta-item">
                        <CalendarOutlined style={{ marginRight: 4 }} />下单：{order.orderDate}
                      </span>
                      <span className="workshop-order-meta-item">
                        <CalendarOutlined style={{ marginRight: 4 }} />交货：{order.deliveryDate}
                      </span>
                    </div>
                    <Text type="secondary">{order.colorSizeSummary}</Text>
                  </div>
                </div>

                <div className="workshop-order-quantity">
                  <div>
                    <div className="quantity-label">订单数</div>
                    <div className="quantity-value">{order.orderQuantity.toLocaleString()} 件</div>
                  </div>
                  <div>
                    <div className="quantity-label">裁床总数</div>
                    <div className="quantity-value">{order.cuttingQuantity.toLocaleString()} 件</div>
                  </div>
                </div>

                <div className="workshop-order-stages">
                  {order.stages.map((stage) => (
                    <div className="workshop-stage-row" key={stage.key}>
                      <div className="workshop-stage-header">
                        <span className="workshop-stage-label">{stage.label}</span>
                        <span className="workshop-stage-amount">{stage.completed}/{stage.total}</span>
                      </div>
                      <Progress
                        percent={computePercent(stage.completed, stage.total)}
                        status={stageProgressStatus[stage.status]}
                        strokeColor={stageProgressColor[stage.status]}
                        showInfo={false}
                      />
                    </div>
                  ))}
                </div>

                <div className="workshop-order-remark">
                  <ProfileOutlined style={{ marginRight: 4 }} />备注：{order.remark ?? '—'}
                </div>
              </article>
            ))}
          </div>

          <div className="workshop-progress-pagination">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredOrders.length}
              onChange={setCurrentPage}
              showTotal={(total) => `共 ${total} 单`}
            />
          </div>
        </>
      )}

      <Modal
        open={Boolean(detailOrder)}
        onCancel={handleCloseDetail}
        footer={null}
        width={720}
        title={detailOrder ? `${detailOrder.styleName} · ${detailOrder.orderNo}` : '工序详情'}
      >
        {detailOrder ? (
          <div className="workshop-progress-modal">
            <Descriptions
              column={2}
              size="small"
              labelStyle={{ width: 120 }}
              className="workshop-progress-modal-info"
            >
              <Descriptions.Item label="款号">{detailOrder.styleNo}</Descriptions.Item>
              <Descriptions.Item label="客户">{detailOrder.customer}</Descriptions.Item>
              <Descriptions.Item label="床次">{detailOrder.bedNo ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="交货日期">{detailOrder.deliveryDate}</Descriptions.Item>
              <Descriptions.Item label="订单数">{detailOrder.orderQuantity.toLocaleString()} 件</Descriptions.Item>
              <Descriptions.Item label="裁床总数">{detailOrder.cuttingQuantity.toLocaleString()} 件</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailOrder.remark ?? '—'}</Descriptions.Item>
            </Descriptions>
            <Steps
              current={modalCurrentStep}
              items={detailOrder.stages.map((stage) => ({
                title: stage.label,
                description: `${stage.completed}/${stage.total}`,
                status: stageStepStatus[stage.status],
              }))}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default WorkshopProgress;
