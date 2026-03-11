import { Card, Row, Col, Statistic } from 'antd';

const SalesSummaryReport = () => (
  <Card title="销售概览">
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Statistic title="本月销售额" value={128900} prefix="¥" />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Statistic title="订单量" value={3120} />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Statistic title="退货率" value={2.3} suffix="%" />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Statistic title="履约时效" value={1.8} suffix="天" />
      </Col>
    </Row>
  </Card>
);

export default SalesSummaryReport;
