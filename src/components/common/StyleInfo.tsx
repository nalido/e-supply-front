import type { CSSProperties, ReactNode } from 'react';
import { Space, Typography } from 'antd';

const { Text } = Typography;

type StyleInfoProps = {
  styleNo?: string;
  styleName?: string;
  color?: string;
  size?: string;
  hideSpecLine?: boolean;
  extra?: ReactNode;
  className?: string;
  style?: CSSProperties;
  renderSpec?: (color?: string, size?: string) => ReactNode;
};

const StyleInfo = ({
  styleNo,
  styleName,
  color,
  size,
  hideSpecLine = false,
  extra,
  className,
  style,
  renderSpec,
}: StyleInfoProps) => {
  const specContent = renderSpec ? renderSpec(color, size) : (
    <Text type="secondary">颜色：{color ?? '—'} / 尺码：{size ?? '—'}</Text>
  );

  return (
    <Space direction="vertical" size={2} className={className} style={style}>
      <Text strong>{styleNo ?? '-'}</Text>
      <Text type="secondary">{styleName ?? '—'}</Text>
      {hideSpecLine ? null : specContent}
      {extra}
    </Space>
  );
};

export default StyleInfo;
