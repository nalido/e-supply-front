import { Card, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import '../styles/operation-guide.css';
import { guideSectionList } from './guide/guide-data';

const { Title, Paragraph, Text } = Typography;

const OperationGuide = () => {
  return (
    <div className="operation-guide">
      <div className="operation-guide__hero">
        <div>
          <Title level={2}>操作指南：产品生命周期 + 成本管理</Title>
          <Paragraph>
            <Text strong>目标：</Text>覆盖所有已实现模块，提供快速全链路与分模块的详细操作指引。
          </Paragraph>
          <div className="operation-guide__tags">
            <Tag color="blue">全链路</Tag>
            <Tag color="green">真实数据流</Tag>
            <Tag color="gold">导出可追溯</Tag>
          </div>
        </div>
        <Card className="operation-guide__tips" size="small" title="使用说明">
          <Paragraph>
            <Text strong>推荐顺序：</Text>先完成基础资料与样板，再进入采购、入库与报表。
          </Paragraph>
          <Paragraph>
            <Text strong>查看方式：</Text>在下方选择模块进入独立子页面查看大图与步骤。
          </Paragraph>
        </Card>
      </div>

      <Card className="operation-guide__toc" size="small" title="模块导航">
        <div className="operation-guide__toc-grid">
          {guideSectionList.map((item) => (
            <Link key={item.slug} to={`/guide/${item.slug}`} className="operation-guide__toc-link">
              {item.title}
            </Link>
          ))}
        </div>
      </Card>

      <Title level={2} className="operation-guide__module-title">操作指南入口</Title>
      <Paragraph>点击模块进入完整图文操作说明（大图可放大查看）。</Paragraph>
      <div className="operation-guide__cards">
        {guideSectionList.map((item) => (
          <Card key={item.slug} className="operation-guide__card">
            <Title level={4}>{item.title}</Title>
            <Paragraph>{item.description}</Paragraph>
            <Link to={`/guide/${item.slug}`} className="operation-guide__card-link">查看操作指南</Link>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OperationGuide;
