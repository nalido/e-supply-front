import type { CSSProperties, ReactNode, SyntheticEvent } from 'react';
import { Tag } from 'antd';

export type ListImageProps = {
  src?: string | null;
  alt?: string;
  width?: number | string | null;
  height?: number | string | null;
  borderRadius?: number;
  objectFit?: CSSProperties['objectFit'];
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  background?: string;
  fallback?: ReactNode;
  fallbackText?: string;
  onImageError?: (event: SyntheticEvent<HTMLImageElement, Event>) => void;
};

const ListImage = ({
  src,
  alt,
  width = 64,
  height = 64,
  borderRadius = 8,
  objectFit = 'cover',
  wrapperClassName,
  wrapperStyle,
  imageClassName,
  imageStyle,
  background = '#f4f4f5',
  fallback,
  fallbackText = '暂无图片',
  onImageError,
}: ListImageProps) => {
  const resolvedStyle: CSSProperties = {
    borderRadius,
    overflow: 'hidden',
    background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...wrapperStyle,
  };
  if (width !== null && width !== undefined) {
    resolvedStyle.width = width;
  }
  if (height !== null && height !== undefined) {
    resolvedStyle.height = height;
  }

  return (
    <div className={wrapperClassName} style={resolvedStyle}>
      {src ? (
        <img
          src={src}
          alt={alt || fallbackText}
          className={imageClassName}
          style={{ width: '100%', height: '100%', objectFit, display: 'block', ...imageStyle }}
          onError={onImageError}
        />
      ) : (
        fallback ?? (
          <Tag color="default" bordered={false} style={{ margin: 0 }}>
            {fallbackText}
          </Tag>
        )
      )}
    </div>
  );
};

export default ListImage;
