import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Empty, Form, InputNumber, Row, Space, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import {
  formatSaleDateTime,
  SaleHero,
  SaleMetricCard,
  SaleMiniStat,
  SaleSection,
  SaleStatusTag,
} from '../../components/sale/SaleCenterUI';
import type { SaleChannelAccount, SaleProductSyncStatus, SaleProductSyncTaskSubmitResponse } from '../../types/sale';

const SaleProductSync = () => {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SaleProductSyncStatus | null>(null);
  const [submission, setSubmission] = useState<SaleProductSyncTaskSubmitResponse | null>(null);
  const [syncForm] = Form.useForm();

  const loadData = useCallback(async (accountId: string) => {
    if (!accountId) {
      setSyncStatus(null);
      return;
    }
    try {
      const status = await saleApi.getProductSyncStatus(accountId);
      setSyncStatus(status);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void saleApi.listChannelAccounts().then((list) => {
      setAccounts(list);
      if (!selectedAccountId && list[0]) {
        setSelectedAccountId(list[0].id);
      }
    });
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      void loadData(selectedAccountId);
    }
  }, [selectedAccountId, loadData]);

  const summary = useMemo(
    () => ({
      currentTask: syncStatus?.currentTask?.status || '空闲',
      lastFinished: syncStatus?.latestFinishedTask?.status || '--',
      successCount: syncStatus?.latestFinishedTask?.successCount || 0,
      failedCount: syncStatus?.latestFinishedTask?.failedCount || 0,
    }),
    [syncStatus],
  );

  const handleSync = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择店铺');
      return;
    }
    const values = await syncForm.validateFields();
    setSyncing(true);
    try {
      const result = await saleApi.syncProducts({
        channelAccountId: Number(selectedAccountId),
        page: values.page,
        pageSize: values.pageSize,
      });
      setSubmission(result);
      message.success(result.alreadyRunning ? '已有任务在运行，已返回当前任务' : '商品同步任务已提交');
      await loadData(selectedAccountId);
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleCancel = async () => {
    if (!syncStatus?.currentTask?.taskId) {
      return;
    }
    try {
      await saleApi.cancelProductSync(syncStatus.currentTask.taskId);
      message.success('已提交取消请求');
      await loadData(selectedAccountId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <SaleHero
        eyebrow="商品中心 / 商品同步"
        title="把同步任务做成工作台，而不是一次性按钮"
        subtitle="首屏清晰展示当前任务、最近结果和后续入口，避免同步完后又回到混乱的映射页面里找结果。"
        extra={
          <Form form={syncForm} initialValues={{ page: 1, pageSize: 50 }}>
            <div className="sale-center-filter-bar">
              <div className="sale-center-filter-group">
                <div>
                  <Typography.Text type="secondary">店铺</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <SaleChannelAccountSelect
                      accounts={accounts}
                      value={selectedAccountId}
                      onChange={setSelectedAccountId}
                      placeholder="选择店铺"
                      size="large"
                      width={280}
                    />
                  </div>
                </div>
                <Form.Item label="页码" name="page" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} size="large" style={{ width: 96 }} />
                </Form.Item>
                <Form.Item label="每页" name="pageSize" style={{ marginBottom: 0 }}>
                  <InputNumber min={1} max={100} size="large" style={{ width: 108 }} />
                </Form.Item>
              </div>
              <Space>
                <Button size="large" onClick={() => void loadData(selectedAccountId)}>
                  刷新
                </Button>
                <Button size="large" onClick={() => void handleCancel()} disabled={!syncStatus?.currentTask?.taskId}>
                  取消同步
                </Button>
                <Button type="primary" size="large" loading={syncing} onClick={() => void handleSync()}>
                  开始同步
                </Button>
              </Space>
            </div>
          </Form>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="当前任务状态" value={summary.currentTask} hint="优先判断是否已有任务在执行" tone="warning" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="最近完成状态" value={summary.lastFinished} hint="最近一次同步结果" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="成功条数" value={summary.successCount} hint="最近一次完成任务的成功数量" tone="success" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <SaleMetricCard title="失败条数" value={summary.failedCount} hint="最近一次完成任务的失败数量" tone="danger" />
        </Col>
      </Row>

      <SaleSection title="当前任务卡" description="任务执行时，只看需要判断的关键字段。">
        {syncStatus?.currentTask ? (
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12}>
              <SaleMiniStat label="任务状态" value={<SaleStatusTag value={syncStatus.currentTask.status} />} tone="warning" />
            </Col>
            <Col xs={24} sm={12}>
              <SaleMiniStat label="处理进度" value={`${syncStatus.currentTask.successCount || 0} / ${syncStatus.currentTask.processedCount || 0}`} />
            </Col>
            <Col xs={24} sm={12}>
              <SaleMiniStat label="开始时间" value={formatSaleDateTime(syncStatus.currentTask.startedAt)} />
            </Col>
            <Col xs={24} sm={12}>
              <SaleMiniStat label="错误信息" value={syncStatus.currentTask.errorMessage || '--'} tone={syncStatus.currentTask.errorMessage ? 'danger' : 'default'} />
            </Col>
          </Row>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前无运行中的商品同步任务" />
        )}
      </SaleSection>

      <SaleSection title="最近任务结果" description="同步完成后直接给出结果摘要和下一步入口。">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <SaleMiniStat label="最近完成时间" value={formatSaleDateTime(syncStatus?.latestFinishedTask?.finishedAt)} />
          </Col>
          <Col xs={24} sm={12}>
            <SaleMiniStat label="最近错误" value={syncStatus?.latestFinishedTask?.errorMessage || '--'} tone={syncStatus?.latestFinishedTask?.errorMessage ? 'danger' : 'success'} />
          </Col>
          {submission ? (
            <Col xs={24}>
              <div className="sale-center-object-card">
                <div className="sale-center-object-card__title">最近一次提交</div>
                <div className="sale-center-object-card__sub" style={{ marginTop: 6 }}>
                  任务号 {submission.taskId} · 状态 {submission.status || '--'} · {submission.message || '已创建同步任务'}
                </div>
              </div>
            </Col>
          ) : null}
          <Col xs={24}>
            <Space wrap>
              <Button type="primary" onClick={() => navigate('/sale/products/bindings')}>
                去商品绑定
              </Button>
              <Button onClick={() => navigate('/sale/governance/sync')}>去治理中心</Button>
            </Space>
          </Col>
        </Row>
      </SaleSection>
    </Space>
  );
};

export default SaleProductSync;
