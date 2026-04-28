import type { CSSProperties, ReactNode, SyntheticEvent } from 'react';
import { useState } from 'react';
import { EyeOutlined } from '@ant-design/icons';
import { Image, Tag } from 'antd';
import './ListImage.css';

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
  enablePreview?: boolean;
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
  enablePreview = true,
}: ListImageProps) => {
  const [hovered, setHovered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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
    <div
      className={[wrapperClassName, 'list-image'].filter(Boolean).join(' ')}
      style={resolvedStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {src ? (
        <>
          <img
            src={src}
            alt={alt || fallbackText}
            className={imageClassName}
            style={{ width: '100%', height: '100%', objectFit, display: 'block', ...imageStyle }}
            onError={onImageError}
          />
          {enablePreview ? (
            <button
              type="button"
              className={`list-image__preview-button${hovered ? ' is-visible' : ''}`}
              aria-label="查看大图"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setPreviewOpen(true);
              }}
            >
              <EyeOutlined />
            </button>
          ) : null}
          <Image
            style={{ display: 'none' }}
            src={src}
            alt={alt || fallbackText}
            preview={{
              visible: previewOpen,
              src,
              onVisibleChange: (visible) => setPreviewOpen(visible),
            }}
          />
        </>
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
