import { Alert, Button, DatePicker, Form, Modal, Skeleton, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import dayjs from 'dayjs';
import type { AllocationHistoryRow, CuttingSheetTarget, InOutDataState, InOutDetailRow, InOutSummaryRow, ProgressActionModalState, ProgressStatsState, SelectOption } from './types';
import { normalizeProgressLabel } from './utils';
import { getCuttingDeleteBlockedTooltip } from '../../utils/cutting-delete-guard';

const { Text } = Typography;

type Props = {
  state: ProgressActionModalState;
  form: FormInstance;
  tabKey: 'stats' | 'allocation';
  inOutTabKey: 'pending' | 'detail';
  inOutData: InOutDataState;
  stats: ProgressStatsState;
  width: number;
  isWideProgressStage: boolean;
  isInOutProgressStage: boolean;
  isInOutStageCompleted: boolean;
  isCuttingProgressStage: boolean;
  isSewingProgressStage: boolean;
  orderedTotal: number;
  cuttingCompletedTotal: number;
  sewingAllocatedTotal: number;
  sewingCompletedTotal: number;
  allocationRemainingTotal: number;
  allocationCapacityTotal: number;
  progressPercentLabel: string;
  progressPercentValue: string;
  statsPrimaryLabel: string;
  statsSecondaryLabel?: string;
  statsCapacityLabel: string;
  statsDisplayColors: string[];
  statsDisplaySizes: string[];
  statsDoneMatrix: Record<string, Record<string, number>>;
  statsSecondaryMatrix: Record<string, Record<string, number>>;
  statsCapacityMatrix: Record<string, Record<string, number>>;
  statsDoneRowTotals: Record<string, number>;
  statsSecondaryRowTotals: Record<string, number>;
  statsCapacityRowTotals: Record<string, number>;
  statsDoneColumnTotals: Record<string, number>;
  statsSecondaryColumnTotals: Record<string, number>;
  statsCapacityColumnTotals: Record<string, number>;
  statsDoneTotal: number;
  statsSecondaryTotal: number;
  allocationHistoryRows: AllocationHistoryRow[];
  allocationDisplayColors: string[];
  allocationDisplaySizes: string[];
  allocationCapacityMatrix: Record<string, Record<string, number>>;
  allocationCapacityRowTotals: Record<string, number>;
  allocationCapacityColumnTotals: Record<string, number>;
  factoryOptions: SelectOption[];
  outsourceStatusByOrderId: Record<string, string>;
  cuttingSheetTarget: CuttingSheetTarget | null;
  inOutPendingLabel: string;
  inOutDoneLabel: string;
  inOutDetailLabel: string;
  onCancel: () => void;
  onSubmit?: () => void;
  onTabChange: (key: 'stats' | 'allocation') => void;
  onInOutTabChange: (key: 'pending' | 'detail') => void;
  onOpenAllocationCreate: () => void;
  onNavigateToCurrentCuttingSheet: () => void;
  onNavigateToCuttingSheet: (record: AllocationHistoryRow) => void | Promise<void>;
  onNavigateToOutsourceOrder: (record: AllocationHistoryRow) => void;
  onDeleteCuttingRecord: (record: AllocationHistoryRow) => void;
};

export default function ProgressActionModal({
  state,
  form,
  tabKey,
  inOutTabKey,
  inOutData,
  stats,
  width,
  isWideProgressStage,
  isInOutProgressStage,
  isInOutStageCompleted,
  isCuttingProgressStage,
  isSewingProgressStage,
  orderedTotal,
  cuttingCompletedTotal,
  sewingAllocatedTotal,
  sewingCompletedTotal,
  allocationRemainingTotal,
  allocationCapacityTotal,
  progressPercentLabel,
  progressPercentValue,
  statsPrimaryLabel,
  statsSecondaryLabel,
  statsCapacityLabel,
  statsDisplayColors,
  statsDisplaySizes,
  statsDoneMatrix,
  statsSecondaryMatrix,
  statsCapacityMatrix,
  statsDoneRowTotals,
  statsSecondaryRowTotals,
  statsCapacityRowTotals,
  statsDoneColumnTotals,
  statsSecondaryColumnTotals,
  statsCapacityColumnTotals,
  statsDoneTotal,
  statsSecondaryTotal,
  allocationHistoryRows,
  allocationDisplayColors,
  allocationDisplaySizes,
  allocationCapacityMatrix,
  allocationCapacityRowTotals,
  allocationCapacityColumnTotals,
  factoryOptions,
  outsourceStatusByOrderId,
  cuttingSheetTarget,
  inOutPendingLabel,
  inOutDoneLabel,
  inOutDetailLabel,
  onCancel,
  onSubmit,
  onTabChange,
  onInOutTabChange,
  onOpenAllocationCreate,
  onNavigateToCurrentCuttingSheet,
  onNavigateToCuttingSheet,
  onNavigateToOutsourceOrder,
  onDeleteCuttingRecord,
}: Props) {
  const footer =
    state.stage?.key === 'cutting' || state.stage?.key === 'sewing'
      ? null
      : isInOutProgressStage || isInOutStageCompleted
        ? [<Button key="close" onClick={onCancel}>关闭</Button>]
        : undefined;

  return (
    <Modal
      open={state.open}
      title={state.stage ? `执行节点：${normalizeProgressLabel(state.stage)}` : '执行节点'}
      onCancel={onCancel}
      onOk={isInOutProgressStage || isInOutStageCompleted ? undefined : onSubmit}
      confirmLoading={state.submitting}
      footer={footer}
      width={width}
      styles={isWideProgressStage || isInOutProgressStage ? { body: { maxHeight: '72vh', overflow: 'auto' } } : undefined}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {state.stage?.key === 'fabric_arrived' || state.stage?.key === 'accessory_arrived' ? (
          <Form.Item label="到货时间" name="arrivedAt" rules={[{ required: true, message: '请选择到货时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        ) : null}
        {state.stage?.key === 'cutting' || state.stage?.key === 'sewing' ? (
          <Tabs
            activeKey={tabKey}
            onChange={(key: string) => onTabChange(key as 'stats' | 'allocation')}
            items={[
              {
                key: 'stats',
                label: '统计信息',
                children: (
                  <>
                    <div className="factory-allocation-summary-title">汇总信息</div>
                    {stats.loading ? (
                      <Skeleton active paragraph={{ rows: 4 }} />
                    ) : statsDisplayColors.length === 0 || statsDisplaySizes.length === 0 ? (
                      <Text type="secondary">暂无统计数据</Text>
                    ) : (
                      <>
                        <Alert
                          type={isSewingProgressStage && sewingAllocatedTotal > orderedTotal ? 'warning' : 'info'}
                          showIcon
                          style={{ marginBottom: 8 }}
                          message={
                            isCuttingProgressStage
                              ? `下单总量：${orderedTotal}，裁床累计已完成：${cuttingCompletedTotal}，${progressPercentLabel}：${progressPercentValue}（按下单总量）`
                              : `下单总量：${orderedTotal}，裁床累计已完成：${cuttingCompletedTotal}，车缝累计已完成：${sewingCompletedTotal}，车缝累计已领取：${sewingAllocatedTotal}，当前剩余可领：${allocationRemainingTotal}，${progressPercentLabel}：${progressPercentValue}（按下单总量）`
                          }
                        />
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                          {isCuttingProgressStage
                            ? '矩阵口径：已裁 / 下单量'
                            : '矩阵口径：已完成 / 已领取 / 裁床已完成；进度百分比仍按下单总量计算'}
                        </Text>
                        <div className="factory-create-matrix-wrap">
                          <table className="factory-create-matrix-table">
                            <thead>
                              <tr>
                                <th>颜色</th>
                                {statsDisplaySizes.map((size) => (
                                  <th key={`stats-head-${size}`}>{size}</th>
                                ))}
                                <th>小计</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statsDisplayColors.map((color) => (
                                <tr key={`stats-row-${color}`}>
                                  <td>{color}</td>
                                  {statsDisplaySizes.map((size) => (
                                    <td key={`stats-${color}-${size}`}>
                                      {statsDoneMatrix[color]?.[size] ?? 0}
                                      {isCuttingProgressStage ? (
                                        <>
                                          {' / '}
                                          {statsCapacityMatrix[color]?.[size] ?? 0}
                                        </>
                                      ) : (
                                        <>
                                          {' / '}
                                          {statsSecondaryMatrix[color]?.[size] ?? 0}
                                          {' / '}
                                          {statsCapacityMatrix[color]?.[size] ?? 0}
                                        </>
                                      )}
                                    </td>
                                  ))}
                                  <td>
                                    {statsDoneRowTotals[color] ?? 0}
                                    {isCuttingProgressStage ? (
                                      <>
                                        {' / '}
                                        {statsCapacityRowTotals[color] ?? 0}
                                      </>
                                    ) : (
                                      <>
                                        {' / '}
                                        {statsSecondaryRowTotals[color] ?? 0}
                                        {' / '}
                                        {statsCapacityRowTotals[color] ?? 0}
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>合计</td>
                                {statsDisplaySizes.map((size) => (
                                  <td key={`stats-sum-${size}`}>
                                    {statsDoneColumnTotals[size] ?? 0}
                                    {isCuttingProgressStage ? (
                                      <>
                                        {' / '}
                                        {statsCapacityColumnTotals[size] ?? 0}
                                      </>
                                    ) : (
                                      <>
                                        {' / '}
                                        {statsSecondaryColumnTotals[size] ?? 0}
                                        {' / '}
                                        {statsCapacityColumnTotals[size] ?? 0}
                                      </>
                                    )}
                                  </td>
                                ))}
                                <td>
                                  {statsDoneTotal}
                                  {isCuttingProgressStage ? (
                                    <>
                                      {' / '}
                                      {allocationCapacityTotal}
                                    </>
                                  ) : (
                                    <>
                                      {' / '}
                                      {statsSecondaryTotal}
                                      {' / '}
                                      {allocationCapacityTotal}
                                    </>
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                          {isCuttingProgressStage
                            ? `${statsPrimaryLabel} / ${statsCapacityLabel}`
                            : `${statsPrimaryLabel} / ${statsSecondaryLabel} / ${statsCapacityLabel}`}
                        </Text>
                      </>
                    )}
                  </>
                ),
              },
              {
                key: 'allocation',
                label: isCuttingProgressStage ? '裁剪数据' : '领取记录',
                children: (
                  <>
                    {allocationHistoryRows.length === 0 ? (
                      <Text type="secondary">{isCuttingProgressStage ? '暂无裁剪记录' : '暂无领取记录'}</Text>
                    ) : allocationHistoryRows.map((record) => {
                      const recordMatrix = record.items.reduce<Record<string, Record<string, number>>>((matrix, item) => {
                        if (!matrix[item.color]) {
                          matrix[item.color] = {};
                        }
                        matrix[item.color][item.size] = (matrix[item.color][item.size] ?? 0) + item.quantity;
                        return matrix;
                      }, {});
                      const recordTotal = record.items.reduce((sum, item) => sum + item.quantity, 0);
                      const factoryLabel = record.factoryId
                        ? (factoryOptions.find((item) => item.value === record.factoryId)?.label ?? `工厂ID:${record.factoryId}`)
                        : '-';
                      return (
                        <div key={record.key} style={{ marginBottom: 16 }}>
                          <div style={{ marginBottom: 6 }}>
                            {isCuttingProgressStage ? (
                              record.workOrderId && record.source?.startsWith('CUTTING_SHEET') ? (
                                <Button
                                  type="link"
                                  size="small"
                                  style={{ padding: 0, height: 'auto' }}
                                  onClick={() => void onNavigateToCuttingSheet(record)}
                                >
                                  {`床次：${record.bedNumber ?? '-'}`}
                                </Button>
                              ) : (
                                <Text strong>{`床次：${record.bedNumber ?? '-'}`}</Text>
                              )
                            ) : (
                              <>
                                <Text strong>{`工厂：${factoryLabel}`}</Text>
                                {record.outsourcingOrderId ? (
                                  <Tag
                                    color={
                                      outsourceStatusByOrderId[String(record.outsourcingOrderId)] === '已完成'
                                      || outsourceStatusByOrderId[String(record.outsourcingOrderId)] === '已结算'
                                        ? 'success'
                                        : 'processing'
                                    }
                                    style={{ marginLeft: 12 }}
                                  >
                                    {outsourceStatusByOrderId[String(record.outsourcingOrderId)] ?? '加载中'}
                                  </Tag>
                                ) : null}
                                {record.outsourcingOrderId ? (
                                  <Button
                                    type="link"
                                    size="small"
                                    style={{ padding: 0, height: 'auto', marginLeft: 12 }}
                                    onClick={() => onNavigateToOutsourceOrder(record)}
                                  >
                                    查看外发单
                                  </Button>
                                ) : null}
                              </>
                            )}
                            {isCuttingProgressStage ? (
                              <Text type="secondary" style={{ marginLeft: 12 }}>
                                工厂：{factoryLabel}
                              </Text>
                            ) : null}
                            <Text type="secondary" style={{ marginLeft: 12 }}>
                              {isCuttingProgressStage ? '录入时间' : '领取时间'}：{record.completedAt ? dayjs(record.completedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                            </Text>
                            <Text type="secondary" style={{ marginLeft: 12 }}>
                              工价：{typeof record.unitPrice === 'number' ? record.unitPrice : '-'}
                            </Text>
                            {isCuttingProgressStage ? (
                              record.deletable ? (
                                <Button
                                  danger
                                  type="link"
                                  size="small"
                                  style={{ padding: 0, height: 'auto', marginLeft: 12 }}
                                  onClick={() => onDeleteCuttingRecord(record)}
                                >
                                  删除
                                </Button>
                              ) : record.deleteBlockedReason ? (
                                <Tooltip title={getCuttingDeleteBlockedTooltip(record.deleteBlockedReason)} placement="topRight">
                                  <Button
                                    danger
                                    type="link"
                                    size="small"
                                    disabled
                                    style={{ padding: 0, height: 'auto', marginLeft: 12 }}
                                  >
                                    删除
                                  </Button>
                                </Tooltip>
                              ) : null
                            ) : null}
                          </div>
                          <div className="factory-create-matrix-wrap">
                            <table className="factory-create-matrix-table">
                              <thead>
                                <tr>
                                  <th>颜色</th>
                                  {allocationDisplaySizes.map((size) => (
                                    <th key={`${record.key}-head-${size}`}>{size}</th>
                                  ))}
                                  <th>小计</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allocationDisplayColors.map((color) => {
                                  const rowAssigned = allocationDisplaySizes.reduce((sum, size) => sum + (recordMatrix[color]?.[size] ?? 0), 0);
                                  const rowCapacity = allocationCapacityRowTotals[color] ?? 0;
                                  return (
                                    <tr key={`${record.key}-row-${color}`}>
                                      <td>{color}</td>
                                      {allocationDisplaySizes.map((size) => (
                                        <td key={`${record.key}-${color}-${size}`}>
                                          {recordMatrix[color]?.[size] ?? 0}
                                          {' / '}
                                          {allocationCapacityMatrix[color]?.[size] ?? 0}
                                        </td>
                                      ))}
                                      <td>
                                        {rowAssigned}
                                        {' / '}
                                        {rowCapacity}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td>合计</td>
                                  {allocationDisplaySizes.map((size) => {
                                    const assigned = allocationDisplayColors.reduce((sum, color) => sum + (recordMatrix[color]?.[size] ?? 0), 0);
                                    return (
                                      <td key={`${record.key}-sum-${size}`}>
                                        {assigned}
                                        {' / '}
                                        {allocationCapacityColumnTotals[size] ?? 0}
                                      </td>
                                    );
                                  })}
                                  <td>
                                    {recordTotal}
                                    {' / '}
                                    {allocationCapacityTotal}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      {isCuttingProgressStage ? (
                        <Button
                          type="primary"
                          onClick={onNavigateToCurrentCuttingSheet}
                          disabled={!cuttingSheetTarget?.workOrderId && !cuttingSheetTarget?.orderCode}
                        >
                          前往裁床单
                        </Button>
                      ) : (
                        <Button type="primary" onClick={onOpenAllocationCreate}>
                          新建领取
                        </Button>
                      )}
                    </div>
                  </>
                ),
              },
            ]}
          />
        ) : null}
        {state.stage?.key === 'inbound' ? (
          <Tabs
            activeKey={inOutTabKey}
            onChange={(key: string) => onInOutTabChange(key as 'pending' | 'detail')}
            items={[
              {
                key: 'pending',
                label: inOutPendingLabel,
                children: (
                  inOutData.loading ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                  ) : (
                    <Table<InOutSummaryRow>
                      rowKey="key"
                      size="middle"
                      bordered
                      pagination={false}
                      dataSource={inOutData.summaryRows}
                      locale={{ emptyText: `暂无${inOutPendingLabel}数据` }}
                      columns={[
                        { title: '颜色', dataIndex: 'color', width: 140 },
                        { title: '尺码', dataIndex: 'size', width: 140 },
                        { title: '下货数量', dataIndex: 'totalQty', width: 140 },
                        { title: inOutPendingLabel, dataIndex: 'pendingQty', width: 140 },
                        { title: inOutDoneLabel, dataIndex: 'doneQty', width: 140 },
                      ]}
                    />
                  )
                ),
              },
              {
                key: 'detail',
                label: inOutDetailLabel,
                children: (
                  inOutData.loading ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                  ) : (
                    <Table<InOutDetailRow>
                      rowKey="key"
                      size="middle"
                      bordered
                      pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
                      dataSource={inOutData.detailRows}
                      locale={{ emptyText: `暂无${inOutDetailLabel}数据` }}
                      columns={[
                        { title: '入库单号', dataIndex: 'receiptNo', width: 180 },
                        { title: '入库时间', dataIndex: 'receiptDate', width: 180 },
                        { title: '仓库', dataIndex: 'warehouseName', width: 180 },
                        { title: '加工方', dataIndex: 'processorName', width: 180, render: (value?: string) => value || '-' },
                        { title: '颜色', dataIndex: 'color', width: 140 },
                        { title: '尺码', dataIndex: 'size', width: 140 },
                        { title: inOutDoneLabel, dataIndex: 'quantity', width: 140 },
                      ]}
                    />
                  )
                ),
              },
            ]}
          />
        ) : null}
      </Form>
    </Modal>
  );
}
