import { ArrowRightOutlined, CheckCircleOutlined, CloudUploadOutlined, PictureOutlined, PlusOutlined, SkinOutlined } from '@ant-design/icons'
import { Button, Card, Col, Row, Space, Steps, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const CustomizationDashboard = () => {
  const navigate = useNavigate()
  return (
    <div className="pod-page">
      <section className="pod-hero">
        <div>
          <Typography.Text className="pod-eyebrow">DESIGN TO COMMERCE</Typography.Text>
          <Typography.Title level={1}>用一个商品模板，生成完整的定制商品图</Typography.Title>
          <Typography.Paragraph>模板统一管理正反面、模特图、材质图和设计区域。设计款式只需选择模板并上传设计图，即可批量生成自然融合的商品效果图。</Typography.Paragraph>
          <Space wrap>
            <Button type="primary" size="large" icon={<SkinOutlined />} onClick={() => navigate('/customization/templates')}>配置款式模板</Button>
            <Button size="large" icon={<PlusOutlined />} onClick={() => navigate('/customization/styles/new')}>创建设计款式</Button>
            <Button size="large" onClick={() => navigate('/customization/styles')}>查看全部款式 <ArrowRightOutlined /></Button>
          </Space>
        </div>
        <div className="pod-hero__art" aria-hidden="true"><span className="pod-hero__card pod-hero__card--back" /><span className="pod-hero__card pod-hero__card--front"><PictureOutlined /></span></div>
      </section>
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={15}>
          <Card className="pod-panel" title="从模板到商品图" extra={<Typography.Text type="secondary">标准化四步流程</Typography.Text>}>
            <Steps direction="vertical" current={0} items={[
              { title: '配置款式模板', description: '上传正反面、模特和材质图，标记各图设计区域', icon: <SkinOutlined /> },
              { title: '创建具体设计', description: '选择模板并上传一份透明设计图', icon: <CloudUploadOutlined /> },
              { title: 'AI 批量融合', description: '按模板区域生成整套自然贴合的商品效果图', icon: <PictureOutlined /> },
              { title: '确认并冻结', description: '选择发布图并冻结当前设计版本', icon: <CheckCircleOutlined /> },
            ]} />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card className="pod-panel pod-guide-card">
            <Typography.Title level={3}>设计先行，生产后置</Typography.Title>
            <Typography.Paragraph>这里创建的设计款式不会直接进入工厂款式。待平台产生订单后，再选择创建或关联生产款式。</Typography.Paragraph>
            <Button type="link" onClick={() => navigate('/customization/styles')} className="pod-link-button">进入设计款式库 <ArrowRightOutlined /></Button>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default CustomizationDashboard
