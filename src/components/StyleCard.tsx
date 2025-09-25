import { Button, Card, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import type { StyleData } from '../types/style';

const { Text } = Typography;

type StyleCardProps = {
  style: StyleData;
  onSample: (styleId: string) => void;
  onProduction: (styleId: string) => void;
};

const fallbackImage = (styleNo: string) => `https://via.placeholder.com/320?text=${encodeURIComponent(styleNo)}`;

const StyleCard = ({ style, onSample, onProduction }: StyleCardProps) => {
  const statusTag = useMemo(() => {
    if (style.status === 'inactive') {
      return <Tag color="default">暂未启用</Tag>;
    }
    return <Tag color="processing">启用中</Tag>;
  }, [style.status]);

  return (
    <Card
      className="style-card"
      hoverable
      cover={
        <div className="style-card__image-wrapper">
          <img
            className="style-card__image"
            src={style.image}
            alt={style.styleName}
            loading="lazy"
            onError={(event) => {
              const target = event.currentTarget;
              if (target.dataset.fallbackApplied) return;
              target.dataset.fallbackApplied = 'true';
              target.src = fallbackImage(style.styleNo);
            }}
          />
        </div>
      }
      bodyStyle={{ padding: 16 }}
    >
      <div className="style-card__header">
        <Text className="style-card__title" ellipsis={{ tooltip: `${style.styleNo} ${style.styleName}` }}>
          {style.styleNo} {style.styleName}
        </Text>
        {statusTag}
      </div>
      <div className="style-card__meta">
        <Text className="style-card__label">颜色</Text>
        <Text className="style-card__value" ellipsis={{ tooltip: style.colors.join(' ') }}>
          {style.colors.join(' ')}
        </Text>
      </div>
      <div className="style-card__meta">
        <Text className="style-card__label">尺码</Text>
        <Text className="style-card__value" ellipsis={{ tooltip: style.sizes.join(' ') }}>
          {style.sizes.join(' ')}
        </Text>
      </div>
      <Space className="style-card__actions">
        <Button block onClick={() => onSample(style.id)}>
          打板
        </Button>
        <Button block onClick={() => onProduction(style.id)}>
          下大货
        </Button>
      </Space>
    </Card>
  );
};

export default StyleCard;
