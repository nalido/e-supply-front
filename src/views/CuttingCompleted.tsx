import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Pagination,
  Skeleton,
  Space,
  Tag,
  Table,
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
import '../styles/cutting-pending.css';
import ListImage from '../components/common/ListImage';
import { useNavigate } from 'react-router-dom';

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
                          <span>订单号：{task.orderCode}</span>
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

      <Modal
        title={detailState.task ? `裁床任务详情 - ${detailState.task.orderCode}` : '裁床任务详情'}
        open={detailState.open}
        footer={(
          <Space>
            <Button onClick={() => setDetailState({ open: false })}>关闭</Button>
          </Space>
        )}
        onCancel={() => {
          setDetailState({ open: false });
          setSheetDetail(null);
        }}
        width={1200}
      >
        {detailLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : detailState.task ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="订单号">{detailState.task.orderCode}</Descriptions.Item>
              <Descriptions.Item label="款号">{detailState.task.styleCode}</Descriptions.Item>
              <Descriptions.Item label="款名">{detailState.task.styleName}</Descriptions.Item>
              <Descriptions.Item label="客户">{detailState.task.customer || '-'}</Descriptions.Item>
              <Descriptions.Item label="下单日期">{detailState.task.orderDate}</Descriptions.Item>
              <Descriptions.Item label="计划排床">{detailState.task.scheduleDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="下单数量">
                {detailState.task.orderedQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="已裁数量">
                {detailState.task.cutQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="待裁数量">
                {detailState.task.pendingQuantity.toLocaleString()} {detailState.task.unit}
              </Descriptions.Item>
              <Descriptions.Item label="面料">{detailState.task.fabricSummary || '-'}</Descriptions.Item>
              <Descriptions.Item label="裁床状态">{sheetDetail?.status ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="床次">{sheetDetail?.bedNumber ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="裁剪人ID">{sheetDetail?.cutterId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="预计用料">{sheetDetail?.plannedFabricQty ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="开裁实用">{sheetDetail?.startActualFabricQty ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="完成实用">{sheetDetail?.completeActualFabricQty ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailState.task.remarks || '-'}</Descriptions.Item>
            </Descriptions>
            {sheetDetail ? (
              <>
                <Card title="床次信息" size="small">
                  {sheetDetail.bedRecords && sheetDetail.bedRecords.length > 0 ? (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {sheetDetail.bedRecords.map((record, index) => {
                        const recordMatrix = record.items.reduce<Record<string, Record<string, number>>>((matrix, item) => {
                          if (!matrix[item.color]) {
                            matrix[item.color] = {};
                          }
                          matrix[item.color][item.size] = (matrix[item.color][item.size] ?? 0) + item.quantity;
                          return matrix;
                        }, {});
                        const matrixColors = Array.from(new Set([
                          ...sheetDetail.rows.map((row) => row.color),
                          ...record.items.map((item) => item.color),
                        ]));
                        const matrixSizes = Array.from(new Set([
                          ...sheetDetail.sizes,
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
                                  ? `${record.actualFabricQty}${sheetDetail.materialUnit ?? ''}`
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
                  dataSource={sheetDetail.rows}
                  columns={[
                    { title: '颜色', dataIndex: 'color', width: 120, fixed: 'left' },
                    ...sheetDetail.sizes.map((size) => ({
                      title: size,
                      dataIndex: 'cells',
                      width: 120,
                      render: (_value: unknown, row: CuttingSheetDetail['rows'][number]) => {
                        const cell = row.cells.find((item) => item.size === size);
                        if (!cell) return '0/0';
                        return `${cell.completedQty}/${cell.orderedQty}`;
                      },
                    })),
                    { title: '小计', width: 140, render: (_value: unknown, row: CuttingSheetDetail['rows'][number]) => `${row.completedSubtotal}/${row.orderedSubtotal}` },
                  ]}
                  scroll={{ x: 720 }}
                />
                <Card title="库存单据" size="small">
                  <Table
                    rowKey={(row) => `${row.documentCategory}-${row.documentId}`}
                    bordered
                    pagination={false}
                    dataSource={sheetDetail.materialDocuments ?? []}
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
                                navigate(`/material/issue?keyword=${encodeURIComponent(row.documentNo)}`);
                                return;
                              }
                              navigate(`/material/report/overview?keyword=${encodeURIComponent(sheetDetail.materialCode ?? '')}`);
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
    </div>
  );
};

export default CuttingCompletedPage;
