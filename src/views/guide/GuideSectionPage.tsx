import { Card, Divider, Image, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { guideSections } from './guide-data';
import '../../styles/guide-section.css';

const { Title, Paragraph } = Typography;

const GuideSectionPage = () => {
  const params = useParams();
  const section = useMemo(() => {
    const key = params.sectionId ?? '';
    return guideSections[key];
  }, [params.sectionId]);

  if (!section) {
    return (
      <div className="guide-section">
        <Title level={3}>未找到该指南</Title>
        <Paragraph>请从操作指南首页选择有效模块。</Paragraph>
        <Link to="/guide">返回操作指南</Link>
      </div>
    );
  }

  return (
    <div className="guide-section">
      <Link to="/guide" className="guide-section__back">返回操作指南</Link>
      <Title level={2}>{section.title}</Title>
      <Paragraph>{section.description}</Paragraph>
      <div className="guide-section__meta">
        <Tag color="blue">适用角色</Tag>
        <span>{section.audience}</span>
      </div>
      <Card className="guide-section__block" title="前置条件">
        <ul>
          {section.prerequisites.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Card className="guide-section__block" title="操作步骤（图文对应）">
        <Image.PreviewGroup>
          <div className="guide-section__step-list">
            {section.steps.map((step, index) => {
              const image = section.images[index];
              return (
                <div key={step} className="guide-section__step-item">
                  <div className="guide-section__step-text">
                    <div className="guide-section__step-index">步骤 {index + 1}</div>
                    <div>{step}</div>
                  </div>
                  {image ? (
                    <div className="guide-section__step-shot">
                      <Image src={image.src} alt={image.alt} />
                      <div className="guide-section__caption">{image.caption}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Image.PreviewGroup>
      </Card>
      <Card className="guide-section__block" title="验收检查">
        <ul>
          {section.checkpoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Card className="guide-section__block" title="常见问题">
        <ul>
          {section.troubleshooting.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Divider />
    </div>
  );
};

export default GuideSectionPage;
