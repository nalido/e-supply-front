import { Button, Card, Space, Tag, Typography } from 'antd';
import { CarryOutOutlined, InboxOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import type { StyleData } from '../types/style';

const { Text } = Typography;

type StyleCardProps = {
  style: StyleData;
  onSample: (styleId: string) => void;
  onProduction: (styleId: string) => void;
  onEdit?: (style: StyleData) => void;
  onDelete?: (style: StyleData) => void;
};

const fallbackImage = (styleNo: string) => `https://via.placeholder.com/320?text=${encodeURIComponent(styleNo)}`;

const StyleCard = ({ style, onSample, onProduction, onEdit, onDelete }: StyleCardProps) => {
  const statusTag = useMemo(() => {
    if (style.status === 'inactive') {
      return <Tag color="default">暂未启用</Tag>;
    }
    return <Tag color="processing">启用中</Tag>;
  }, [style.status]);

  const coverUrl = useMemo(() => {
    const trimmed = style.image?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : fallbackImage(style.styleNo);
  }, [style.image, style.styleNo]);
  const hasHoverActions = Boolean(onEdit || onDelete);

  return (
    <Card
      className="style-card"
      hoverable
      cover={
        <div className="style-card__image-wrapper">
          <div className="style-card__image-box">
            <img
              className="style-card__image"
              src={coverUrl}
              alt={style.styleName}
              loading="lazy"
              onError={(event) => {
                const target = event.currentTarget;
                if (target.dataset.fallbackApplied) return;
                target.dataset.fallbackApplied = 'true';
                target.src = fallbackImage(style.styleNo);
              }}
            />
            {hasHoverActions ? (
              <div className="style-card__overlay">
                {onEdit ? (
                  <button
                    type="button"
                    className="style-card__overlay-btn style-card__overlay-btn--edit"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(style);
                    }}
                  >
                    编辑
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    className="style-card__overlay-btn style-card__overlay-btn--delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(style);
                    }}
                  >
                    删除
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      }
      bodyStyle={{ padding: '14px 16px 16px' }}
    >
      <div className="style-card__body">
        <div className="style-card__header">
          <Text className="style-card__title" ellipsis={{ tooltip: `${style.styleNo} ${style.styleName}` }}>
            {style.styleNo} {style.styleName}
          </Text>
          {statusTag}
        </div>
        <div className="style-card__meta">
          <div className="style-card__scroller" aria-label="颜色列表">
            {style.colors.map((color, index) => (
              <Tag key={`${style.id}-color-${index}`} className="style-card__tag" bordered={false}>
                {color}
              </Tag>
            ))}
          </div>
          <div className="style-card__scroller" aria-label="尺码列表">
            {style.sizes.map((size, index) => (
              <Tag key={`${style.id}-size-${index}`} className="style-card__tag style-card__tag--size" bordered={false}>
                {size}
              </Tag>
            ))}
          </div>
        </div>
        <Space className="style-card__actions">
          <Button
            onClick={(event) => {
              event.stopPropagation();
              onSample(style.id);
            }}
          >
            <CarryOutOutlined /> 打板
          </Button>
          <Button
            onClick={(event) => {
              event.stopPropagation();
              onProduction(style.id);
            }}
          >
            <InboxOutlined /> 下大货
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default StyleCard;
