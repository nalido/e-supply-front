import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Empty, Form, Input, InputNumber, Modal, Row, Space, Tag, message } from 'antd';
import { DownloadOutlined, SendOutlined, SyncOutlined, TruckOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import { formatSaleDateTime, toDisplayText } from '../../components/sale/sale-center-formatters';
import { ProductThumb, SaleHero, SaleMetricCard, SaleSection, SaleStatusTag, SaleToneTag } from '../../components/sale/SaleCenterUI';
import type {
  SaleOzonFbsWorkbenchAction,
  SaleOzonFbsWorkbenchActionResult,
  SaleOzonFbsWorkbenchInitResult,
  SaleOzonFbsWorkbenchSubmitResult,
} from '../../types/sale';
import { downloadExportFile } from '../../utils/export-download';
import { isMappedStatus } from './sale-center-helpers';

const parseOrderIds = (value: string | null) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const ACTION_LABELS: Record<SaleOzonFbsWorkbenchAction, string> = {
  LABEL: '获取面单',
  AWAITING_DELIVERY: '推进待交运',
  DELIVERING: '标记配送中',
  REFRESH_STATUS: '回查状态',
};

const ORDER_STAGE_LABELS: Record<string, string> = {
  READY: '待打包',
  WAITING_FULFILLMENT: '待打包',
  AWAITING_PACKAGING: '待打包',
  READY_TO_SHIP: '待交运',
  AWAITING_DELIVERY: '待交运',
  AWAITING_DELIVER: '待交运',
  SHIPPED: '配送中',
  DELIVERING: '配送中',
  COMPLETED: '已完成',
  DELIVERED: '已完成',
  CANCELED: '已取消',
  CANCELLED: '已取消',
  EXCEPTION: '异常',
  ARBITRATION: '异常',
};

const getOrderStageLabel = (status?: string | null) => {
  const key = (status || '').toUpperCase();
  return ORDER_STAGE_LABELS[key] || '待处理';
};

const isAfterPackagingStatus = (status?: string | null) => {
  const key = (status || '').toUpperCase();
  return ['READY_TO_SHIP', 'AWAITING_DELIVERY', 'AWAITING_DELIVER', 'SHIPPED', 'DELIVERING', 'COMPLETED', 'DELIVERED'].includes(key);
};

const OzonFbsFulfillmentWorkbench = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<SaleOzonFbsWorkbenchAction | null>(null);
  const [labelDownloading, setLabelDownloading] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<SaleOzonFbsWorkbenchInitResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SaleOzonFbsWorkbenchSubmitResult | null>(null);
  const [actionResult, setActionResult] = useState<SaleOzonFbsWorkbenchActionResult | null>(null);

  const accountId = params.get('accountId');
  const orderIds = useMemo(() => parseOrderIds(params.get('orderIds')), [params]);

  const loadWorkbench = useCallback(async () => {
    if (!accountId || !orderIds.length) {
      return;
    }
    setLoading(true);
    try {
      const result = await saleApi.initOzonFbsWorkbench({
        channelAccountId: Number(accountId),
        saleOrderIds: orderIds.map(Number),
      });
      setWorkbench(result);
      setSubmitResult(null);
      setActionResult(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [accountId, orderIds]);

  useEffect(() => {
    void loadWorkbench();
  }, [loadWorkbench]);

  const metrics = useMemo(() => {
    const orders = workbench?.orders || [];
    return {
      orderCount: orders.length,
      quantity: orders.reduce((sum, order) => sum + (order.totalQuantity || 0), 0),
      blockerCount: workbench?.blockers?.length || 0,
      warningCount: workbench?.warnings?.length || 0,
    };
  }, [workbench]);

  const followUpReady = useMemo(() => {
    const orders = workbench?.orders || [];
    return Boolean(orders.length && orders.every((order) => isAfterPackagingStatus(order.fulfillmentStatus || order.normalizedStatus || order.platformOrderStatus)));
  }, [workbench]);

  const submit = async () => {
    if (!workbench?.workbenchId || !workbench.submitReady) {
      message.warning('请先处理阻塞项后再提交发货');
      return;
    }
    const values = await form.validateFields();
    Modal.confirm({
      title: '确认提交 Ozon 发货',
      content: `本次将提交 ${workbench.orders.length} 个订单，成功后订单会进入待交运状态。`,
      okText: '确认提交',
      cancelText: '再检查一下',
      onOk: async () => {
        setSubmitting(true);
        try {
          const result = await saleApi.submitOzonFbsWorkbench(workbench.workbenchId, {
            confirm: true,
            trackingNo: values.trackingNo || undefined,
            carrierCode: values.carrierCode || undefined,
            carrierName: values.carrierName || undefined,
            deliveryMethod: values.deliveryMethod,
          });
          setSubmitResult(result);
          if (result.success) {
            message.success('Ozon 发货已提交');
          } else {
            message.warning('部分订单提交失败，请查看结果');
          }
        } catch (error) {
          console.error(error);
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const runAction = async (action: SaleOzonFbsWorkbenchAction, label: string, confirmRequired = false) => {
    if (!workbench?.workbenchId) {
      return;
    }
    const execute = async () => {
      setActionLoading(action);
      try {
        const result = await saleApi.runOzonFbsWorkbenchAction(workbench.workbenchId, {
          action,
          confirm: confirmRequired,
        });
        if (result.success) {
          message.success(`${label}已完成`);
        } else {
          message.warning(`${label}存在失败订单`);
        }
        if (action === 'REFRESH_STATUS' || action === 'AWAITING_DELIVERY' || action === 'DELIVERING') {
          await loadWorkbench();
        }
        setActionResult(result);
      } catch (error) {
        console.error(error);
      } finally {
        setActionLoading(null);
      }
    };
    if (!confirmRequired) {
      await execute();
      return;
    }
    Modal.confirm({
      title: `确认${label}`,
      content: `本次将对 ${workbench.orders.length} 个订单执行${label}，请确认订单已经满足平台要求。`,
      okText: '确认执行',
      cancelText: '再检查一下',
      onOk: execute,
    });
  };

  const downloadLabel = async (fileUrl: string, fileName?: string | null) => {
    setLabelDownloading(fileUrl);
    try {
      await downloadExportFile(fileUrl, fileName || undefined);
      message.success('面单下载已开始');
    } catch (error) {
      console.error('failed to download Ozon FBS label', error);
      message.error('面单下载失败，请稍后重试');
    } finally {
      setLabelDownloading(null);
    }
  };

  if (!accountId || !orderIds.length) {
    return (
      <SaleSection title="发货准备" description="请先从订单同步页选择待发货订单。">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待处理订单" />
      </SaleSection>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <SaleHero
        eyebrow="订单中心 / Ozon 发货"
        title="Ozon FBS 发货工作台"
        subtitle="集中复核待发货订单、商品数量、发货时限和商品资料，确认后提交 Ozon 发货。"
        extra={
          <Space wrap>
            <Button size="large" onClick={() => navigate('/sale/orders/overview')}>
              返回订单同步
            </Button>
            <Button size="large" onClick={() => void loadWorkbench()} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      />

      {workbench?.blockers?.length ? (
        <Alert type="warning" showIcon message="存在不适合提交发货的订单" description={workbench.blockers.join('；')} />
      ) : (
        <Alert type={workbench ? 'success' : 'info'} showIcon message={workbench ? '当前订单已完成提交前检查' : '选择订单后生成发货检查'} />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="订单数" value={metrics.orderCount} hint="本次准备提交的订单" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="商品数量" value={metrics.quantity} hint="本次订单内商品总数" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="阻塞项" value={metrics.blockerCount} hint="需要先处理后才能提交" tone={metrics.blockerCount ? 'warning' : 'success'} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="提醒项" value={metrics.warningCount} hint="不阻塞提交，但建议复核" tone={metrics.warningCount ? 'warning' : 'success'} />
        </Col>
      </Row>

      <SaleSection title="提交信息" description="按本次订单填写物流信息；如平台配送方式已在订单中带出，可保留为空。">
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} lg={6}>
              <Form.Item label="物流单号" name="trackingNo">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={6}>
              <Form.Item label="物流商名称" name="carrierName">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={6}>
              <Form.Item label="物流商编码" name="carrierCode">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col xs={24} lg={6}>
              <Form.Item label="配送方式" name="deliveryMethod">
                <InputNumber min={1} precision={0} placeholder="可选" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" icon={<SendOutlined />} loading={submitting} disabled={!workbench?.submitReady} onClick={() => void submit()}>
            提交 Ozon 发货
          </Button>
        </Form>
      </SaleSection>

      <SaleSection title="发货后续处理" description="提交发货后，按平台处理结果继续获取面单、推进交运并回查状态。">
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            loading={actionLoading === 'LABEL'}
            disabled={!workbench?.workbenchId || !followUpReady}
            onClick={() => void runAction('LABEL', ACTION_LABELS.LABEL)}
          >
            获取面单
          </Button>
          <Button
            icon={<TruckOutlined />}
            loading={actionLoading === 'AWAITING_DELIVERY'}
            disabled={!workbench?.workbenchId || !followUpReady}
            onClick={() => void runAction('AWAITING_DELIVERY', ACTION_LABELS.AWAITING_DELIVERY, true)}
          >
            推进待交运
          </Button>
          <Button
            icon={<TruckOutlined />}
            loading={actionLoading === 'DELIVERING'}
            disabled={!workbench?.workbenchId || !followUpReady}
            onClick={() => void runAction('DELIVERING', ACTION_LABELS.DELIVERING, true)}
          >
            标记配送中
          </Button>
          <Button
            icon={<SyncOutlined />}
            loading={actionLoading === 'REFRESH_STATUS'}
            disabled={!workbench?.workbenchId}
            onClick={() => void runAction('REFRESH_STATUS', ACTION_LABELS.REFRESH_STATUS)}
          >
            回查平台状态
          </Button>
        </Space>
      </SaleSection>

      <SaleSection title="订单复核" description="逐单核对发货状态、商品资料和数量。">
        {loading && !workbench ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在准备发货数据" />
        ) : (
          (workbench?.orders || []).map((order) => (
            <div key={order.saleOrderId} className="sale-center-object-card">
              <div className="sale-center-object-card__top">
                <div>
                  <div className="sale-center-object-card__title">
                    {toDisplayText(order.platformOrderNo)}
                    {order.platformParentOrderNo ? ` / 母单 ${order.platformParentOrderNo}` : ''}
                  </div>
                  <div className="sale-center-object-card__sub">
                    收件人 {toDisplayText(order.receiverName)} · 发货时限 {formatSaleDateTime(order.fulfillmentDueAt)}
                  </div>
                </div>
                <Space wrap>
                  <SaleStatusTag value={order.normalizedStatus} label={getOrderStageLabel(order.fulfillmentStatus || order.normalizedStatus || order.platformOrderStatus)} />
                  {order.blockers?.length ? <SaleToneTag label="需处理" tone="warning" /> : <SaleToneTag label="可提交" tone="success" />}
                </Space>
              </div>
              <div className="sale-center-rich-grid">
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">商品数量</div>
                  <div className="sale-center-rich-cell__value">{order.totalQuantity || 0}</div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">配送 / 仓提示</div>
                  <div className="sale-center-rich-cell__value">
                    {[order.deliveryMethodId, order.warehouseHint].filter(Boolean).join(' / ') || '--'}
                  </div>
                </div>
                <div className="sale-center-rich-cell">
                  <div className="sale-center-rich-cell__label">提醒</div>
                  <div className="sale-center-rich-cell__value">{order.warnings?.length || 0}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                {order.lines.map((line) => (
                  <div key={line.saleOrderLineId} className="sale-center-object-card" style={{ padding: 14, marginTop: 10, background: '#fff9f1' }}>
                    <div className="sale-center-object-card__body" style={{ marginTop: 0 }}>
                      <ProductThumb src={line.platformMainImageUrl} alt={line.goodsName || line.platformSkuCode || ''} />
                      <div className="sale-center-object-card__content">
                        <div className="sale-center-object-card__title">{toDisplayText(line.goodsName)}</div>
                        <div className="sale-center-object-card__sub">
                          平台货号 {toDisplayText(line.platformSkuCode)} · 平台商品编码 {toDisplayText(line.platformSkuId)} · 平台商品ID{' '}
                          {toDisplayText(line.platformGoodsId)} · 数量 {toDisplayText(line.quantity)}
                        </div>
                        <div className="sale-center-chip-group" style={{ marginTop: 10 }}>
                          <span className={`sale-center-chip ${isMappedStatus(line.mappingStatus) ? 'sale-center-chip--success' : 'sale-center-chip--warning'}`}>
                            {isMappedStatus(line.mappingStatus) ? '已绑定' : '待补商品资料'}
                          </span>
                          {(line.blockers || []).map((item) => (
                            <span key={item} className="sale-center-chip sale-center-chip--warning">{item}</span>
                          ))}
                          {(line.warnings || []).map((item) => (
                            <span key={item} className="sale-center-chip">{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {order.blockers?.length || order.warnings?.length ? (
                <div style={{ marginTop: 12 }}>
                  <Space wrap>
                    {(order.blockers || []).map((item) => <Tag color="warning" key={item}>{item}</Tag>)}
                    {(order.warnings || []).map((item) => <Tag key={item}>{item}</Tag>)}
                  </Space>
                </div>
              ) : null}
            </div>
          ))
        )}
      </SaleSection>

      {submitResult ? (
        <SaleSection title="提交结果" description="查看本次发货提交结果，失败订单可处理后重新进入发货准备。">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type={submitResult.success ? 'success' : 'warning'}
              showIcon
              message={`成功 ${submitResult.successCount} 单，失败 ${submitResult.failedCount} 单`}
            />
            {submitResult.items.map((item) => (
              <div key={item.saleOrderId} className="sale-center-object-card">
                <div className="sale-center-object-card__top">
                  <div>
                    <div className="sale-center-object-card__title">{toDisplayText(item.platformOrderNo)}</div>
                    <div className="sale-center-object-card__sub">{item.errorMessage || '已提交'}</div>
                  </div>
                  <SaleToneTag label={item.success ? '成功' : '失败'} tone={item.success ? 'success' : 'warning'} />
                </div>
              </div>
            ))}
          </Space>
        </SaleSection>
      ) : null}

      {actionResult ? (
        <SaleSection title="后续处理结果" description="查看面单、交运和状态回查结果，失败订单处理后可重新执行当前动作。">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type={actionResult.success ? 'success' : 'warning'}
              showIcon
              message={`${ACTION_LABELS[actionResult.action]}：成功 ${actionResult.successCount} 单，失败 ${actionResult.failedCount} 单`}
            />
            {actionResult.items.map((item) => (
              <div key={`${actionResult.action}-${item.saleOrderId}`} className="sale-center-object-card">
                <div className="sale-center-object-card__top">
                  <div>
                    <div className="sale-center-object-card__title">{toDisplayText(item.platformOrderNo)}</div>
                    <div className="sale-center-object-card__sub">
                      {[item.platformStatus ? getOrderStageLabel(item.platformStatus) : null, item.errorMessage].filter(Boolean).join(' · ') || '已处理'}
                    </div>
                  </div>
                  <SaleToneTag label={item.success ? '成功' : '失败'} tone={item.success ? 'success' : 'warning'} />
                </div>
                {item.labelFileUrl ? (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      icon={<DownloadOutlined />}
                      loading={labelDownloading === item.labelFileUrl}
                      onClick={() => void downloadLabel(item.labelFileUrl!, item.labelFileName)}
                    >
                      下载面单{item.labelFileName ? ` · ${item.labelFileName}` : ''}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </Space>
        </SaleSection>
      ) : null}
    </Space>
  );
};

export default OzonFbsFulfillmentWorkbench;
