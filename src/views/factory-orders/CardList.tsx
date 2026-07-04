import { CheckOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Empty, List, Pagination, Skeleton, Space, Tag, message } from 'antd';
import type { FactoryOrderItem, FactoryOrderProgress } from '../../types';
import ListImage from '../../components/common/ListImage';
import {
  getMaterialStatusLabel,
  getMaterialTagColor,
  getOverallStatusMeta,
  hiddenOrderStatusTags,
  normalizeProgressLabel,
  progressNodeCodeMap,
  resolveOverallCompleted,
  resolveProgressStageState,
} from './utils';
import type { OrderActionSnapshot } from './types';

type Props = {
  loading: boolean;
  orders: FactoryOrderItem[];
  total: number;
  page: number;
  pageSize: number;
  appliedKeyword: string;
  selectedOrderIds: string[];
  onToggleOrder: (orderId: string, checked: boolean) => void;
  onPageChange: (page: number, size?: number) => void;
  onOpenCostDetail: (record: OrderActionSnapshot) => void;
  onCopyOrder: (record: OrderActionSnapshot) => void;
  onEditOrder: (record: OrderActionSnapshot) => void;
  onDeleteOrder: (record: OrderActionSnapshot) => void;
  onOpenPrintPreview: (record: OrderActionSnapshot) => void;
  onOpenProgressAction: (record: OrderActionSnapshot, stage: FactoryOrderProgress) => void;
};

export default function FactoryOrderCardList({
  loading,
  orders,
  total,
  page,
  pageSize,
  appliedKeyword,
  selectedOrderIds,
  onToggleOrder,
  onPageChange,
  onOpenCostDetail,
  onCopyOrder,
  onEditOrder,
  onDeleteOrder,
  onOpenPrintPreview,
  onOpenProgressAction,
}: Props) {
  if (loading && orders.length === 0) {
    return (
      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
        dataSource={Array.from({ length: pageSize }, (_v, index) => ({ id: `factory-skeleton-${index}` }))}
        rowKey="id"
        renderItem={(item) => (
          <List.Item key={item.id}>
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </List.Item>
        )}
      />
    );
  }

  if (!loading && orders.length === 0) {
    return <Empty description={appliedKeyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />;
  }

  return (
    <>
      <List
        className="factory-orders-card-list"
        rowKey="id"
        grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
        dataSource={orders}
        renderItem={(order) => {
          const isChecked = selectedOrderIds.includes(order.id);
          const meta = getOverallStatusMeta(order.isCompleted, order.statusKey);
          const visibleTags = (order.tags ?? []).filter((tag) => !hiddenOrderStatusTags.has(tag));
          const overallCompleted = resolveOverallCompleted(order.isCompleted, order.statusKey);
          return (
            <List.Item key={order.id}>
              <Card className="factory-order-card-shell" styles={{ body: { display: 'flex', flexDirection: 'column', gap: 16, padding: 20 } }}>
                <div className="factory-order-card-header">
                  <div className="factory-order-card-main">
                    <div className="factory-order-checkbox">
                      <Checkbox checked={isChecked} onChange={(event) => onToggleOrder(order.id, event.target.checked)} />
                    </div>
                    <div className="factory-order-card-info">
                      <ListImage src={order.thumbnail} alt={order.name} wrapperClassName="factory-order-thumbnail" width={null} height={null} />
                      <div className="factory-order-content">
                        <div className="factory-order-topline">
                          <div className="factory-order-title-group">
                            <div className="factory-order-title-row">
                              <div className="factory-order-title">
                                {order.styleCode ? `${order.styleCode}/${order.name}` : order.name}
                              </div>
                              <span className={`factory-order-status-badge${overallCompleted ? ' completed' : ' ongoing'}`}>{meta.label}</span>
                            </div>
                            <div className="factory-order-title-subline">
                              <span className="factory-order-order-code">{order.code}</span>
                            </div>
                          </div>
                        </div>
                        <Space className="factory-order-meta-row" size={8} wrap>
                          {order.materialStatus && order.materialStatus !== 'PENDING' ? (
                            <Tag color={getMaterialTagColor(order.materialStatus)}>{getMaterialStatusLabel(order.materialStatus)}</Tag>
                          ) : null}
                          {visibleTags.map((tag) => (
                            <Tag key={`${order.id}-${tag}`} bordered={false}>
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    </div>
                  </div>
                  <div className="factory-order-actions">
                    <Space size={8} wrap>
                      <Button size="small" type="text" onClick={() => onOpenCostDetail({ orderId: order.id, orderCode: order.code, styleCode: order.styleCode, styleName: order.name, expectedDelivery: order.expectedDelivery, materialStatus: order.materialStatus })}>
                        大货成本
                      </Button>
                      <Button size="small" type="text" onClick={() => onCopyOrder({ orderId: order.id, orderCode: order.code, styleCode: order.styleCode, styleName: order.name, expectedDelivery: order.expectedDelivery, materialStatus: order.materialStatus })}>
                        复制
                      </Button>
                      <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEditOrder({ orderId: order.id, orderCode: order.code, styleCode: order.styleCode, styleName: order.name, expectedDelivery: order.expectedDelivery, materialStatus: order.materialStatus })}>
                        编辑
                      </Button>
                      <Button size="small" type="text" onClick={() => onOpenPrintPreview({ orderId: order.id, orderCode: order.code, styleCode: order.styleCode, styleName: order.name, expectedDelivery: order.expectedDelivery, materialStatus: order.materialStatus })}>
                        打印
                      </Button>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onDeleteOrder({ orderId: order.id, orderCode: order.code, styleCode: order.styleCode, styleName: order.name, expectedDelivery: order.expectedDelivery, materialStatus: order.materialStatus, deletable: order.deletable, deleteBlockedReason: order.deleteBlockedReason })}>
                        删除
                      </Button>
                    </Space>
                  </div>
                </div>

                <div className="factory-order-progress-panel">
                  <div className="factory-order-progress-panel-header">
                    <div className="factory-order-progress-panel-title">生产推进</div>
                    <div className="factory-order-progress-panel-meta">点击节点可继续推进状态</div>
                  </div>
                  <div className="factory-order-progress">
                    <div className="factory-order-progress-track">
                      {order.progress.map((stage, index) => {
                        const { breakdown: stageBreakdown, isCompleted, isInProgress, isOrderPlaced, isOvercut, progressStateClass } = resolveProgressStageState(stage);
                        const predecessorBlockedStage = order.progress.slice(0, index).find((prev) => !resolveProgressStageState(prev).isCompleted);
                        const predecessorCuttingBreakdown = predecessorBlockedStage ? resolveProgressStageState(predecessorBlockedStage).breakdown : null;
                        const allowSewingWithPartialCutting = stage.key === 'sewing' && predecessorBlockedStage?.key === 'cutting' && (predecessorCuttingBreakdown?.completedPercent ?? 0) > 0;
                        const effectiveBlockedStage = allowSewingWithPartialCutting ? undefined : predecessorBlockedStage;
                        const predecessorBlockedName = effectiveBlockedStage ? normalizeProgressLabel(effectiveBlockedStage) : '';
                        const alwaysViewable = stage.key === 'inbound';
                        const repeatOpen = stage.key === 'cutting' || stage.key === 'sewing' || stage.key === 'fabric_arrived' || stage.key === 'accessory_arrived' || alwaysViewable;
                        const clickable = Boolean(progressNodeCodeMap[stage.key] && (!isCompleted || repeatOpen) && (!effectiveBlockedStage || alwaysViewable));
                        const orderPlacedTime = stage.date ?? order.orderDate;
                        const [orderPlacedDate, orderPlacedClock] = orderPlacedTime?.split(' ') ?? [];
                        const nodeStatusContent = isOrderPlaced ? (
                          <span className="factory-order-progress-status-grid">
                            <span>{`下单数量：${order.quantityValue}`}</span>
                            {orderPlacedDate ? <span className="date">{orderPlacedDate}</span> : null}
                            {orderPlacedClock ? <span className="date">{orderPlacedClock}</span> : null}
                          </span>
                        ) : isCompleted ? (
                          <span>{stage.date ?? '已完成'}</span>
                        ) : isInProgress ? (
                          <span>进行中</span>
                        ) : (
                          <span>待完成</span>
                        );
                        const iconContent = stageBreakdown ? (
                          <span className="factory-order-progress-icon-percent">{`${stageBreakdown.completedPercent}%`}</span>
                        ) : isOvercut ? (
                          <ExclamationCircleOutlined />
                        ) : isCompleted ? (
                          <CheckOutlined />
                        ) : (
                          <ClockCircleOutlined />
                        );
                        return (
                          <div className="factory-order-progress-step" key={`${order.id}-${stage.key}`}>
                            <div
                              className={`factory-order-progress-node ${progressStateClass}${clickable ? ' clickable' : ''}`}
                              onClick={() => {
                                if (effectiveBlockedStage && !alwaysViewable) {
                                  message.warning(`请先完成前置节点：${predecessorBlockedName}`);
                                  return;
                                }
                                if (!clickable) {
                                  return;
                                }
                                onOpenProgressAction(
                                  {
                                    orderId: order.id,
                                    orderCode: order.code,
                                    styleName: order.name,
                                    expectedDelivery: order.expectedDelivery,
                                    materialStatus: order.materialStatus,
                                    orderQuantity: Number(order.quantityValue),
                                  },
                                  stage,
                                );
                              }}
                            >
                              <div className={`factory-order-progress-icon ${progressStateClass}${stageBreakdown ? ' has-percent' : ''}`}>{iconContent}</div>
                              <div className="factory-order-progress-content">
                                <div className="factory-order-progress-name">{normalizeProgressLabel(stage)}</div>
                                <div className={`factory-order-progress-status ${progressStateClass}`}>{nodeStatusContent}</div>
                              </div>
                            </div>
                            {index < order.progress.length - 1 ? <div className={`factory-order-progress-arrow ${progressStateClass}`} /> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </List.Item>
          );
        }}
      />
      {total > pageSize ? (
        <div className="factory-orders-pagination">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showQuickJumper
            showSizeChanger
            pageSizeOptions={['6', '9', '12']}
            showTotal={(currentTotal, range) => `${range[0]}-${range[1]} / 共 ${currentTotal} 单`}
            onChange={onPageChange}
          />
        </div>
      ) : null}
    </>
  );
}
