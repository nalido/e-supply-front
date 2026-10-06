import {
  CheckOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Empty,
  List,
  Pagination,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
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
  onOpenMaterialDetail: (record: OrderActionSnapshot) => void;
  onOpenCostDetail: (record: OrderActionSnapshot) => void;
  onCopyOrder: (record: OrderActionSnapshot) => void;
  onEditOrder: (record: OrderActionSnapshot) => void;
  onDeleteOrder: (record: OrderActionSnapshot) => void;
  onOpenPrintPreview: (record: OrderActionSnapshot) => void;
  onOpenProgressAction: (record: OrderActionSnapshot, stage: FactoryOrderProgress) => void;
};

const createOrderSnapshot = (order: FactoryOrderItem): OrderActionSnapshot => ({
  orderId: order.id,
  orderCode: order.code,
  styleCode: order.styleCode,
  styleName: order.name,
  expectedDelivery: order.expectedDelivery,
  materialStatus: order.materialStatus,
  orderQuantity: Number(order.quantityValue),
  deletable: order.deletable,
  deleteBlockedReason: order.deleteBlockedReason,
});

const formatOrderTag = (tag: string): string | null => {
  const normalized = tag.replace(/\s+/g, '').toUpperCase();
  if (normalized === '优先级:MEDIUM' || normalized === 'PRIORITY:MEDIUM') {
    return null;
  }
  if (normalized === '优先级:HIGH' || normalized === 'PRIORITY:HIGH') {
    return '优先处理';
  }
  if (normalized === '优先级:URGENT' || normalized === 'PRIORITY:URGENT') {
    return '紧急';
  }
  if (normalized === '优先级:LOW' || normalized === 'PRIORITY:LOW') {
    return null;
  }
  return tag;
};

const getProgressStatusContent = (
  stage: FactoryOrderProgress,
  quantityValue: string,
) => {
  const { breakdown, isCompleted, isInProgress, isOrderPlaced } = resolveProgressStageState(stage);
  if (isOrderPlaced) {
    return {
      primary: `${quantityValue} 件`,
      secondary: undefined,
    };
  }
  if (breakdown) {
    if (breakdown.completedPercent <= 0 && breakdown.allocatedPercent <= 0) {
      return { primary: '待开始', secondary: undefined };
    }
    if (breakdown.completedPercent >= 100) {
      return { primary: '已完成', secondary: stage.date };
    }
    return {
      primary: `完成 ${breakdown.completedPercent}%`,
      secondary: breakdown.allocatedPercent > breakdown.completedPercent
        ? `已分配 ${breakdown.allocatedPercent}%`
        : undefined,
    };
  }
  if (isCompleted) {
    return {
      primary: '已完成',
      secondary: stage.date,
    };
  }
  if (isInProgress) {
    return {
      primary: '进行中',
      secondary: undefined,
    };
  }
  return {
    primary: stage.value && stage.value !== '待完成' ? stage.value : '待处理',
    secondary: undefined,
  };
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
  onOpenMaterialDetail,
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
        className="factory-orders-card-list"
        grid={{ gutter: 10, xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
        dataSource={Array.from({ length: pageSize }, (_value, index) => ({ id: `factory-skeleton-${index}` }))}
        rowKey="id"
        renderItem={(item) => (
          <List.Item key={item.id}>
            <Card className="factory-order-card-shell">
              <Skeleton active paragraph={{ rows: 4 }} />
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
        grid={{ gutter: 10, xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
        dataSource={orders}
        renderItem={(order) => {
          const isChecked = selectedOrderIds.includes(order.id);
          const meta = getOverallStatusMeta(order.isCompleted, order.statusKey);
          const visibleTags = (order.tags ?? [])
            .filter((tag) => !hiddenOrderStatusTags.has(tag))
            .map((tag) => ({ key: tag, label: formatOrderTag(tag) }))
            .filter((tag): tag is { key: string; label: string } => Boolean(tag.label));
          const overallCompleted = resolveOverallCompleted(order.isCompleted, order.statusKey);
          const snapshot = createOrderSnapshot(order);
          const moreItems: MenuProps['items'] = [
            {
              key: 'copy',
              icon: <CopyOutlined />,
              label: '复制订单',
              onClick: () => onCopyOrder(snapshot),
            },
            {
              key: 'print',
              icon: <PrinterOutlined />,
              label: '打印订单',
              onClick: () => onOpenPrintPreview(snapshot),
            },
            { type: 'divider' },
            {
              key: 'delete',
              danger: true,
              icon: <DeleteOutlined />,
              label: '删除订单',
              onClick: () => onDeleteOrder(snapshot),
            },
          ];

          return (
            <List.Item key={order.id}>
              <Card className="factory-order-card-shell" styles={{ body: { padding: 0 } }}>
                <div className="factory-order-card-orderline">
                  <div className="factory-order-card-orderline-main">
                    <Checkbox
                      aria-label={`选择工厂订单 ${order.code}`}
                      checked={isChecked}
                      onChange={(event) => onToggleOrder(order.id, event.target.checked)}
                    />
                    <span className="factory-order-card-order-label">订单号</span>
                    <span className="factory-order-order-code">{order.code}</span>
                    <span className={`factory-order-status-badge${overallCompleted ? ' completed' : ' ongoing'}`}>
                      {meta.label}
                    </span>
                    {order.expectedDelivery ? (
                      <span className="factory-order-card-due">预计交货 {order.expectedDelivery}</span>
                    ) : null}
                  </div>
                  <Space className="factory-order-actions" size={2} wrap>
                    <Button type="link" size="small" onClick={() => onOpenMaterialDetail(snapshot)}>
                      面辅料明细
                    </Button>
                    <Button type="link" size="small" onClick={() => onOpenCostDetail(snapshot)}>
                      大货成本
                    </Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEditOrder(snapshot)}>
                      编辑
                    </Button>
                    <Dropdown menu={{ items: moreItems }} trigger={['click']}>
                      <Button type="link" size="small" icon={<MoreOutlined />}>更多</Button>
                    </Dropdown>
                  </Space>
                </div>

                <div className="factory-order-card-body">
                  <div className="factory-order-product-column">
                    <div className="factory-order-product">
                      <ListImage
                        src={order.thumbnail}
                        alt={order.name}
                        wrapperClassName="factory-order-thumbnail"
                        width={null}
                        height={null}
                      />
                      <div className="factory-order-content">
                        <Tooltip title={order.styleCode ? `${order.styleCode} / ${order.name}` : order.name}>
                          <div className="factory-order-title">
                            {order.styleCode ? `${order.styleCode} / ${order.name}` : order.name}
                          </div>
                        </Tooltip>
                        <div className="factory-order-meta-row">
                          {order.materialStatus ? (
                            <Tag bordered={false} color={getMaterialTagColor(order.materialStatus)}>
                              {getMaterialStatusLabel(order.materialStatus)}
                            </Tag>
                          ) : null}
                          {visibleTags.slice(0, 2).map((tag) => (
                            <Tag bordered={false} key={`${order.id}-${tag.key}`}>{tag.label}</Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="factory-order-facts">
                      <div className="factory-order-fact">
                        <span>数量</span>
                        <span className="factory-order-fact-value">{order.quantityValue} 件</span>
                      </div>
                      <div className="factory-order-fact">
                        <span>下单</span>
                        <span className="factory-order-fact-value">{order.orderDate || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="factory-order-progress-panel">
                    <div className="factory-order-progress">
                      <div className="factory-order-progress-track">
                        {order.progress.map((stage, index) => {
                          const {
                            breakdown: stageBreakdown,
                            isCompleted,
                            isOrderPlaced,
                            isOvercut,
                            progressStateClass,
                          } = resolveProgressStageState(stage);
                          const predecessorBlockedStage = order.progress
                            .slice(0, index)
                            .find((previousStage) => !resolveProgressStageState(previousStage).isCompleted);
                          const predecessorCuttingBreakdown = predecessorBlockedStage
                            ? resolveProgressStageState(predecessorBlockedStage).breakdown
                            : null;
                          const allowSewingWithPartialCutting = stage.key === 'sewing'
                            && predecessorBlockedStage?.key === 'cutting'
                            && (predecessorCuttingBreakdown?.completedPercent ?? 0) > 0;
                          const effectiveBlockedStage = allowSewingWithPartialCutting ? undefined : predecessorBlockedStage;
                          const predecessorBlockedName = effectiveBlockedStage
                            ? normalizeProgressLabel(effectiveBlockedStage)
                            : '';
                          const alwaysViewable = stage.key === 'inbound';
                          const repeatOpen = ['cutting', 'sewing', 'fabric_arrived', 'accessory_arrived', 'inbound']
                            .includes(stage.key);
                          const clickable = Boolean(
                            progressNodeCodeMap[stage.key]
                            && (!isCompleted || repeatOpen)
                            && (!effectiveBlockedStage || alwaysViewable),
                          );
                          const statusContent = getProgressStatusContent(stage, order.quantityValue);
                          const iconContent = isOvercut ? (
                            <ExclamationCircleOutlined />
                          ) : stageBreakdown && stageBreakdown.completedPercent > 0 && stageBreakdown.completedPercent < 100 ? (
                            <span className="factory-order-progress-icon-percent">
                              {`${stageBreakdown.completedPercent}%`}
                            </span>
                          ) : isCompleted || isOrderPlaced ? (
                            <CheckOutlined />
                          ) : (
                            <ClockCircleOutlined />
                          );

                          return (
                            <div className="factory-order-progress-step" key={`${order.id}-${stage.key}`}>
                              <div
                                className={`factory-order-progress-node ${progressStateClass}${clickable ? ' clickable' : ''}`}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                onKeyDown={(event) => {
                                  if (clickable && (event.key === 'Enter' || event.key === ' ')) {
                                    event.preventDefault();
                                    event.currentTarget.click();
                                  }
                                }}
                                onClick={() => {
                                  if (effectiveBlockedStage && !alwaysViewable) {
                                    message.warning(`请先完成前置节点：${predecessorBlockedName}`);
                                    return;
                                  }
                                  if (!clickable) {
                                    return;
                                  }
                                  onOpenProgressAction(snapshot, stage);
                                }}
                              >
                                <div className={`factory-order-progress-icon ${progressStateClass}${stageBreakdown ? ' has-percent' : ''}`}>
                                  {iconContent}
                                </div>
                                <div className="factory-order-progress-content">
                                  <div className="factory-order-progress-name">{normalizeProgressLabel(stage)}</div>
                                  <div className={`factory-order-progress-status ${progressStateClass}`}>
                                    <span>{statusContent.primary}</span>
                                    {statusContent.secondary ? <small>{statusContent.secondary}</small> : null}
                                  </div>
                                </div>
                              </div>
                              {index < order.progress.length - 1 ? (
                                <div className={`factory-order-progress-arrow ${progressStateClass}`} />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
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
            pageSizeOptions={['10', '20', '50']}
            showTotal={(currentTotal, range) => `${range[0]}-${range[1]} / 共 ${currentTotal} 单`}
            onChange={onPageChange}
          />
        </div>
      ) : null}
    </>
  );
}
