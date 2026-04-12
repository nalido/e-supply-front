import { useCallback, useEffect, useState } from 'react';
import { Card, Col, Row, Space, Statistic, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';

const SaleDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    accounts: 0,
    orders: 0,
    fulfillments: 0,
    syncLogs: 0,
    retryCandidates: 0,
    idempotencies: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accounts, orders, fulfillments, syncLogs, retryCandidates, idempotencies] = await Promise.all([
        saleApi.listChannelAccounts(),
        saleApi.listOrders(),
        saleApi.listFulfillments(),
        saleApi.listSyncLogs(),
        saleApi.listRetryCandidates(),
        saleApi.listIdempotencyRecords(),
      ]);
      setCounts({
        accounts: accounts.length,
        orders: orders.length,
        fulfillments: fulfillments.length,
        syncLogs: syncLogs.length,
        retryCandidates: retryCandidates.length,
        idempotencies: idempotencies.length,
      });
    } catch (error) {
      console.error(error);
      message.error('加载销售看板失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card loading={loading}>
        <Typography.Title level={4}>销售看板</Typography.Title>
        <Typography.Paragraph type="secondary">
          汇总展示渠道账号、订单、履约、同步日志与治理数据的实时规模。
        </Typography.Paragraph>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="渠道账号" value={counts.accounts} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="销售订单" value={counts.orders} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="履约单" value={counts.fulfillments} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="同步日志" value={counts.syncLogs} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="重试候选" value={counts.retryCandidates} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="幂等记录" value={counts.idempotencies} />
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default SaleDashboard;
