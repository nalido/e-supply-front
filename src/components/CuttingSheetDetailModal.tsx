import {
  Button,
  Card,
  Descriptions,
  Modal,
  Skeleton,
  Space,
  Table,
  Typography,
} from 'antd';
import type { CuttingSheetDetail, CuttingTask } from '../types';

const { Text } = Typography;

const OVER_USAGE_REASON_OPTIONS = [
  { label: '排料损耗超预估', value: 'LAY_LOSS' },
  { label: '面料瑕疵 / 换片补裁', value: 'FABRIC_DEFECT' },
  { label: '工艺调整导致追加用量', value: 'PROCESS_ADJUSTMENT' },
  { label: '其它', value: 'OTHER' },
];

const OVER_CUT_REASON_OPTIONS = [
  { label: '补裁返工', value: 'REWORK' },
  { label: '备损预留', value: 'LOSS_RESERVE' },
  { label: '面料瑕疵换片', value: 'DEFECT_REPLACEMENT' },
  { label: '其它', value: 'OTHER' },
];

const getReasonLabel = (
  code: string | undefined,
  fallbackText: string | undefined,
  options: Array<{ label: string; value: string }>,
) => {
  if (fallbackText && fallbackText.trim()) {
    return fallbackText;
  }
  const matched = options.find((item) => item.value === code);
  return matched?.label ?? code ?? '-';
};

const getCuttingStatusLabel = (status?: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return '未开裁';
    case 'IN_PROGRESS':
      return '裁剪中';
    case 'COMPLETED':
      return '已完成';
    case 'PAUSED':
      return '已暂停';
    default:
      return status ?? '-';
  }
};

const getVarianceTypeLabel = (varianceType?: string) => {
  switch (varianceType) {
    case 'OVER':
      return '超用';
    case 'UNDER':
      return '回退';
    case 'NORMAL':
      return '正常';
    default:
      return varianceType ?? '-';
  }
};

type Props = {
  open: boolean;
  loading: boolean;
  task?: CuttingTask;
  detail: CuttingSheetDetail | null;
  zIndex?: number;
  onClose: () => void;
  onNavigateToFactoryOrder: (orderCode?: string) => void;
  onNavigate: (path: string) => void;
  onStart?: () => void;
  onRecordBed?: () => void;
  onComplete?: () => void;
};

export default function CuttingSheetDetailModal({
  open,
  loading,
  task,
  detail,
  zIndex,
  onClose,
  onNavigateToFactoryOrder,
  onNavigate,
  onStart,
  onRecordBed,
  onComplete,
}: Props) {
  const buildSpecKey = (color: string, size: string) => `${color}::${size}`;
  const detailActualQtyMap = (detail?.bedRecords ?? []).reduce<Record<string, number>>((acc, record) => {
    (record.items ?? []).forEach((item) => {
      const key = buildSpecKey(item.color, item.size);
      acc[key] = (acc[key] ?? 0) + Math.max(0, Number(item.quantity ?? 0));
    });
    return acc;
  }, {});
  const detailOrderedQtyMap = (detail?.rows ?? []).reduce<Record<string, number>>((acc, row) => {
    row.cells.forEach((cell) => {
      acc[buildSpecKey(row.color, cell.size)] = Math.max(0, Number(cell.orderedQty ?? 0));
    });
    return acc;
  }, {});
  const detailMatrixColors = Array.from(new Set([
    ...(detail?.rows ?? []).map((row) => row.color),
    ...((detail?.bedRecords ?? []).flatMap((record) => record.items.map((item) => item.color))),
  ]));
  const detailMatrixSizes = Array.from(new Set([
    ...(detail?.sizes ?? []),
    ...((detail?.bedRecords ?? []).flatMap((record) => record.items.map((item) => item.size))),
  ]));
  const detailSummaryRows = detailMatrixColors.map((color) => {
    const cells = detailMatrixSizes.map((size) => {
      const key = buildSpecKey(color, size);
      return {
        size,
        orderedQty: detailOrderedQtyMap[key] ?? 0,
        actualQty: detailActualQtyMap[key] ?? 0,
      };
    });
    return {
      color,
      cells,
      orderedSubtotal: cells.reduce((sum, cell) => sum + cell.orderedQty, 0),
      actualSubtotal: cells.reduce((sum, cell) => sum + cell.actualQty, 0),
    };
  });
  const detailOrderedQty = Object.values(detailOrderedQtyMap).reduce((sum, qty) => sum + qty, 0);
  const detailActualQty = Object.values(detailActualQtyMap).reduce((sum, qty) => sum + qty, 0);
  const detailPendingQty = Math.max(detailOrderedQty - detailActualQty, 0);

  return (
    <Modal
      title={task ? `裁床任务详情 - ${task.orderCode}` : '裁床任务详情'}
      open={open}
      zIndex={zIndex}
      onCancel={onClose}
      width={1200}
      footer={(
        <Space>
          {detail?.status === 'IN_PROGRESS' && onComplete ? (
            <Button type="primary" onClick={onComplete}>
              完成
            </Button>
          ) : null}
          {detail?.status === 'IN_PROGRESS' && onRecordBed ? (
            <Button onClick={onRecordBed}>
              手动录入床次
            </Button>
          ) : null}
          {detail?.status === 'NOT_STARTED' && onStart ? (
            <Button type="primary" onClick={onStart}>
              配布开裁
            </Button>
          ) : null}
          <Button onClick={onClose}>关闭</Button>
        </Space>
      )}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : task ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="订单号">
              <Button type="link" style={{ padding: 0 }} onClick={() => onNavigateToFactoryOrder(task.orderCode)}>
                {task.orderCode}
              </Button>
            </Descriptions.Item>
            <Descriptions.Item label="款号">{task.styleCode}</Descriptions.Item>
            <Descriptions.Item label="款名">{task.styleName}</Descriptions.Item>
            <Descriptions.Item label="客户">{task.customer || '-'}</Descriptions.Item>
            <Descriptions.Item label="下单日期">{task.orderDate}</Descriptions.Item>
            <Descriptions.Item label="计划排床">{task.scheduleDate || '-'}</Descriptions.Item>
            <Descriptions.Item label="下单数量">
              {detailOrderedQty.toLocaleString()} {task.unit}
            </Descriptions.Item>
            <Descriptions.Item label="已裁数量">
              {detailActualQty.toLocaleString()} {task.unit}
            </Descriptions.Item>
            <Descriptions.Item label="待裁数量">
              {detailPendingQty.toLocaleString()} {task.unit}
            </Descriptions.Item>
            <Descriptions.Item label="面料">{task.fabricSummary || '-'}</Descriptions.Item>
            <Descriptions.Item label="裁床状态">{getCuttingStatusLabel(detail?.status)}</Descriptions.Item>
            <Descriptions.Item label="床次">{detail?.bedNumber ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="裁剪人ID">{detail?.cutterId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="计划用量">{detail?.plannedFabricQty ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="开裁实用">{detail?.startActualFabricQty ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="实际用量">{detail?.completeActualFabricQty ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="超计划用量">{detail?.overUsedFabricQty ?? Math.max((detail?.completeActualFabricQty ?? 0) - (detail?.plannedFabricQty ?? 0), 0)}</Descriptions.Item>
            <Descriptions.Item label="节约回退量">{detail?.returnedFabricQty ?? Math.max((detail?.plannedFabricQty ?? 0) - (detail?.completeActualFabricQty ?? 0), 0)}</Descriptions.Item>
            <Descriptions.Item label="差异类型">{getVarianceTypeLabel(detail?.fabricUsageVarianceType)}</Descriptions.Item>
            <Descriptions.Item label="超用原因">
              {getReasonLabel(detail?.usageReasonCode, detail?.usageReasonText, OVER_USAGE_REASON_OPTIONS)}
            </Descriptions.Item>
            <Descriptions.Item label="超用备注">{detail?.usageRemark ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="超裁数量">{Math.max((detail?.completedQty ?? 0) - (detail?.plannedQty ?? 0), 0) || '-'}</Descriptions.Item>
            <Descriptions.Item label="超裁原因">
              {getReasonLabel(detail?.overCutReasonCode, detail?.overCutReasonText, OVER_CUT_REASON_OPTIONS)}
            </Descriptions.Item>
            <Descriptions.Item label="超裁备注">{detail?.overCutRemark ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="订单备注" span={2}>{task.remarks || '-'}</Descriptions.Item>
          </Descriptions>
          {detail ? (
            <>
              <Card title="床次信息" size="small">
                {detail.bedRecords && detail.bedRecords.length > 0 ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {detail.bedRecords.map((record, index) => {
                      const recordMatrix = record.items.reduce<Record<string, Record<string, number>>>((matrix, item) => {
                        if (!matrix[item.color]) {
                          matrix[item.color] = {};
                        }
                        matrix[item.color][item.size] = (matrix[item.color][item.size] ?? 0) + item.quantity;
                        return matrix;
                      }, {});
                      const matrixColors = Array.from(new Set([
                        ...detail.rows.map((row) => row.color),
                        ...record.items.map((item) => item.color),
                      ]));
                      const matrixSizes = Array.from(new Set([
                        ...detail.sizes,
                        ...record.items.map((item) => item.size),
                      ]));
                      return (
                        <Card
                          key={`${record.bedNumber}-${record.recordedAt ?? index}`}
                          size="small"
                          title={`床次 ${record.bedNumber}（${record.totalQty} 件）`}
                          extra={<Text type="secondary">{record.recordedAt ?? '-'}</Text>}
                        >
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">
                              床次实用：
                              {typeof record.actualFabricQty === 'number'
                                ? `${record.actualFabricQty}${detail.materialUnit ?? ''}`
                                : '-'}
                            </Text>
                          </div>
                          <div className="factory-create-matrix-wrap">
                            <table className="factory-create-matrix-table">
                              <thead>
                                <tr>
                                  <th>颜色</th>
                                  {matrixSizes.map((size) => (
                                    <th key={`${record.bedNumber}-head-${size}`}>{size}</th>
                                  ))}
                                  <th>小计</th>
                                </tr>
                              </thead>
                              <tbody>
                                {matrixColors.map((color) => {
                                  const rowTotal = matrixSizes.reduce((sum, size) => sum + (recordMatrix[color]?.[size] ?? 0), 0);
                                  return (
                                    <tr key={`${record.bedNumber}-row-${color}`}>
                                      <td>{color}</td>
                                      {matrixSizes.map((size) => (
                                        <td key={`${record.bedNumber}-${color}-${size}`}>{recordMatrix[color]?.[size] ?? 0}</td>
                                      ))}
                                      <td>{rowTotal}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      );
                    })}
                  </Space>
                ) : (
                  <Text type="secondary">暂无床次裁剪数据</Text>
                )}
              </Card>
              <Table
                rowKey={(row) => row.color}
                bordered
                pagination={false}
                dataSource={detailSummaryRows}
                columns={[
                  { title: '颜色', dataIndex: 'color', width: 120, fixed: 'left' },
                  ...detailMatrixSizes.map((size) => ({
                    title: size,
                    dataIndex: 'cells',
                    width: 120,
                    render: (_value: unknown, row: typeof detailSummaryRows[number]) => {
                      const cell = row.cells.find((item) => item.size === size);
                      if (!cell) return '0/0';
                      const isOverCut = cell.actualQty > cell.orderedQty;
                      return (
                        <Text strong={isOverCut} style={isOverCut ? { color: '#cf1322' } : undefined}>
                          {`${cell.actualQty}/${cell.orderedQty}`}
                        </Text>
                      );
                    },
                  })),
                  {
                    title: '小计',
                    width: 140,
                    render: (_value: unknown, row: typeof detailSummaryRows[number]) => {
                      const isOverCut = row.actualSubtotal > row.orderedSubtotal;
                      return (
                        <Text strong={isOverCut} style={isOverCut ? { color: '#cf1322' } : undefined}>
                          {`${row.actualSubtotal}/${row.orderedSubtotal}`}
                        </Text>
                      );
                    },
                  },
                ]}
                scroll={{ x: 720 }}
              />
              <Card title="库存单据" size="small">
                <Table
                  rowKey={(row) => `${row.documentCategory}-${row.documentId}`}
                  bordered
                  pagination={false}
                  dataSource={detail.materialDocuments ?? []}
                  locale={{ emptyText: '暂无关联领退料单据' }}
                  columns={[
                    { title: '单据类型', dataIndex: 'documentTypeLabel', width: 120 },
                    { title: '单据号', dataIndex: 'documentNo', width: 180 },
                    { title: '数量', dataIndex: 'quantity', width: 120, render: (v: number) => v.toLocaleString() },
                    { title: '时间', dataIndex: 'issuedAt', width: 180, render: (v?: string) => v ?? '-' },
                    {
                      title: '操作',
                      width: 120,
                      render: (_value: unknown, row: NonNullable<CuttingSheetDetail['materialDocuments']>[number]) => (
                        <Button
                          type="link"
                          onClick={() => {
                            if (row.documentCategory === 'ISSUE') {
                              onNavigate(`/material/issue?keyword=${encodeURIComponent(row.documentNo)}`);
                              return;
                            }
                            onNavigate(`/material/report/overview?keyword=${encodeURIComponent(detail.materialCode ?? '')}`);
                          }}
                        >
                          查看并跳转
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            </>
          ) : null}
        </Space>
      ) : null}
    </Modal>
  );
}
