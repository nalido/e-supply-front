import { Children, cloneElement, isValidElement, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Image, Modal, Upload, message } from 'antd';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import type { UploadRequestOption as RcCustomRequestOptions } from 'rc-upload/lib/interface';
import { CloseOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import storageApi from '../../api/storage';
import './ImageUploader.css';

type ImageUploaderBaseProps = {
  module?: string;
  maxSizeMB?: number;
  tips?: ReactNode;
  accept?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  maxVisibleCount?: number;
};

type SingleImageUploaderProps = ImageUploaderBaseProps & {
  multiple?: false;
  maxCount?: 1;
  value?: string;
  onChange?: (value?: string) => void;
};

type MultiImageUploaderProps = ImageUploaderBaseProps & {
  multiple: true;
  maxCount?: number;
  value?: string[];
  onChange?: (value?: string[]) => void;
};

export type ImageUploaderProps = SingleImageUploaderProps | MultiImageUploaderProps;

const MAX_SIZE_DEFAULT_MB = 5;
const MAX_MULTI_COUNT_DEFAULT = 10;

const toUrlArray = (value?: string | string[]) => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value.filter(Boolean) : [value];
};

const buildPreviewFiles = (value?: string | string[]): UploadFile[] =>
  toUrlArray(value).map((url, index) => ({
    uid: `preview-${index}`,
    name: `image-${index + 1}`,
    status: 'done',
    url,
  }));

const rewritePreviewAnchors = (
  node: ReactNode,
  file: UploadFile,
  onPreview: (target: UploadFile) => void,
): ReactNode => {
  if (!isValidElement(node)) {
    return node;
  }

  if (typeof node.type !== 'string') {
    return node;
  }

  const props = node.props as {
    children?: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  };

  const nextChildren = props.children
    ? Children.map(props.children, (child) => rewritePreviewAnchors(child, file, onPreview))
    : props.children;

  if (node.type === 'a') {
    return cloneElement(node as ReactElement, {
      href: undefined,
      target: undefined,
      rel: undefined,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick?.(event);
        onPreview(file);
      },
    }, nextChildren);
  }

  return cloneElement(node as ReactElement, undefined, nextChildren);
};

const ImageUploader = ({
  value,
  onChange,
  module = 'materials',
  maxSizeMB = MAX_SIZE_DEFAULT_MB,
  tips,
  accept = 'image/*',
  disabled,
  className,
  compact = false,
  maxVisibleCount,
  multiple = false,
  maxCount,
}: ImageUploaderProps) => {
  const [fileList, setFileList] = useState<UploadFile[]>(() => buildPreviewFiles(value));
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeUid, setActiveUid] = useState<string>();
  const resolvedMaxCount = multiple ? (maxCount ?? MAX_MULTI_COUNT_DEFAULT) : 1;
  const previewUrls = fileList
    .map((item) => item.url ?? item.thumbUrl)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

  useEffect(() => {
    setFileList(buildPreviewFiles(value));
  }, [value]);

  const emitChange = (nextFileList: UploadFile[]) => {
    const urls = nextFileList
      .map((file) => file.url)
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (multiple) {
      (onChange as MultiImageUploaderProps['onChange'])?.(urls);
      return;
    }
    (onChange as SingleImageUploaderProps['onChange'])?.(urls[0]);
  };

  const normalizeNextFileList = (nextFileList: UploadFile[]) => {
    if (multiple) {
      return nextFileList.slice(-resolvedMaxCount);
    }
    return nextFileList.slice(-1);
  };

  const handleUpload = async (options: RcCustomRequestOptions) => {
    const rcFile = options.file as RcFile;
    if (!rcFile) {
      return;
    }
    if (maxSizeMB && rcFile.size > maxSizeMB * 1024 * 1024) {
      message.error(`文件大小不能超过 ${maxSizeMB}MB`);
      options.onError?.(new Error('文件过大'));
      return;
    }
    const uid = rcFile.uid || `${Date.now()}`;
    const uploadingFile: UploadFile = {
      uid,
      name: rcFile.name,
      status: 'uploading',
    };
    setUploading(true);
    setFileList((prev) => normalizeNextFileList(multiple ? [...prev, uploadingFile] : [uploadingFile]));

    try {
      const result = await storageApi.upload(rcFile as File, { module });
      setFileList((prev) => {
        const next = normalizeNextFileList(
          prev.map((file) => file.uid === uid
            ? {
                ...file,
                status: 'done',
                url: result.url,
              }
            : file),
        );
        emitChange(next);
        return next;
      });
      options.onSuccess?.(result, new XMLHttpRequest());
    } catch (error) {
      console.error('上传图片失败', error);
      message.error('上传图片失败，请稍后再试');
      setFileList((prev) => prev.filter((file) => file.uid !== uid));
      options.onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (target: UploadFile) => {
    const next = fileList.filter((file) => file.uid !== target.uid);
    setFileList(next);
    emitChange(next);
    return true;
  };

  const handlePreview = async (file: UploadFile) => {
    const previewUrl = file.url ?? file.thumbUrl;
    if (!previewUrl) {
      message.warning('当前图片暂不可预览');
      return;
    }
    const nextImages = previewUrls.length ? previewUrls : [previewUrl];
    setPreviewImages(nextImages);
    setPreviewIndex(Math.max(0, nextImages.indexOf(previewUrl)));
    setPreviewOpen(true);
  };

  const uploadButton = useMemo(
    () => (
      <div className={compact ? 'image-uploader__upload-button image-uploader__upload-button--compact' : 'image-uploader__upload-button'}>
        <PlusOutlined />
        {compact ? null : <div style={{ marginTop: 8 }}>上传</div>}
      </div>
    ),
    [compact],
  );
  const galleryUploadButton = useMemo(
    () => (
      <div className="image-uploader__upload-button image-uploader__upload-button--gallery">
        <PlusOutlined />
        <div>上传图片</div>
      </div>
    ),
    [],
  );
  const compactSlotCount = multiple && compact && maxVisibleCount !== undefined ? Math.max(1, maxVisibleCount) : undefined;
  const shouldCollapseList = compactSlotCount !== undefined && fileList.length > compactSlotCount;
  const visibleFileCount = compactSlotCount === undefined
    ? fileList.length
    : shouldCollapseList
      ? Math.max(0, compactSlotCount - 1)
      : Math.min(fileList.length, compactSlotCount);
  const hiddenCount = shouldCollapseList ? fileList.length - visibleFileCount : 0;
  const showUploadButton = fileList.length < resolvedMaxCount
    && (compactSlotCount === undefined || (!shouldCollapseList && fileList.length < compactSlotCount));

  const renderUploadItem = (originNode: ReactNode, file: UploadFile, collapseOverflow: boolean) => {
    const renderedNode = rewritePreviewAnchors(originNode, file, (target) => {
      void handlePreview(target);
    });
    const fileIndex = fileList.findIndex((item) => item.uid === file.uid);
    const collapsed = collapseOverflow
      && shouldCollapseList
      && fileIndex >= visibleFileCount;

    return (
      <div
        className={`image-uploader__item${collapsed ? ' image-uploader__item--collapsed' : ''}`}
        onMouseEnter={() => setActiveUid(file.uid)}
        onMouseLeave={() => setActiveUid((current) => (current === file.uid ? undefined : current))}
        onFocus={() => setActiveUid(file.uid)}
        onBlur={() => setActiveUid((current) => (current === file.uid ? undefined : current))}
      >
        {renderedNode}
        {file.status === 'done' ? (
          <>
            <button
              type="button"
              className={`image-uploader__preview-button${activeUid === file.uid ? ' is-visible' : ''}`}
              aria-label="查看大图"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void handlePreview(file);
              }}
            >
              <EyeOutlined />
            </button>
            {!disabled ? (
              <button
                type="button"
                className={`image-uploader__remove-button${activeUid === file.uid ? ' is-visible' : ''}`}
                aria-label="删除图片"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleRemove(file);
                }}
              >
                <CloseOutlined />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className={className}>
      <Upload
        listType="picture-card"
        fileList={fileList}
        maxCount={resolvedMaxCount}
        multiple={multiple}
        customRequest={handleUpload}
        onPreview={handlePreview}
        onRemove={handleRemove}
        itemRender={(originNode, file) => renderUploadItem(originNode, file, true)}
        accept={accept}
        disabled={disabled || uploading}
        showUploadList={{ showPreviewIcon: false, showRemoveIcon: false }}
      >
        {showUploadButton ? uploadButton : null}
      </Upload>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="image-uploader__more-count"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setGalleryOpen(true);
          }}
        >
          +{hiddenCount}
        </button>
      ) : null}
      <Modal
        title={`全部图片（${previewUrls.length}）`}
        open={galleryOpen}
        footer={null}
        width={720}
        onCancel={() => setGalleryOpen(false)}
      >
        <Upload
          listType="picture-card"
          fileList={fileList}
          maxCount={resolvedMaxCount}
          multiple={multiple}
          customRequest={handleUpload}
          onPreview={handlePreview}
          onRemove={handleRemove}
          itemRender={(originNode, file) => renderUploadItem(originNode, file, false)}
          accept={accept}
          disabled={disabled || uploading}
          showUploadList={{ showPreviewIcon: false, showRemoveIcon: false }}
          className="image-uploader__gallery-upload"
        >
          {fileList.length >= resolvedMaxCount ? null : galleryUploadButton}
        </Upload>
      </Modal>
      <Image.PreviewGroup
        items={previewImages}
        preview={{
          visible: previewOpen,
          current: previewIndex,
          onVisibleChange: (visible) => {
            setPreviewOpen(visible);
            if (!visible) {
              setPreviewImages([]);
              setPreviewIndex(0);
            }
          },
          onChange: (current) => setPreviewIndex(current),
        }}
      />
      {tips ? (
        <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 8 }}>{tips}</div>
      ) : null}
    </div>
  );
};

export default ImageUploader;
