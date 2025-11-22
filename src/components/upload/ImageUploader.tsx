import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Upload, message } from 'antd';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import type { UploadRequestOption as RcCustomRequestOptions } from 'rc-upload/lib/interface';
import { PlusOutlined } from '@ant-design/icons';
import storageApi from '../../api/storage';

export type ImageUploaderProps = {
  value?: string;
  onChange?: (value?: string) => void;
  module?: string;
  maxSizeMB?: number;
  tips?: ReactNode;
  accept?: string;
  disabled?: boolean;
};

const MAX_SIZE_DEFAULT_MB = 5;

const buildPreviewFile = (value?: string): UploadFile[] => {
  if (!value) {
    return [];
  }
  return [
    {
      uid: '-1',
      name: 'image',
      status: 'done',
      url: value,
    },
  ];
};

const ImageUploader = ({
  value,
  onChange,
  module = 'materials',
  maxSizeMB = MAX_SIZE_DEFAULT_MB,
  tips,
  accept = 'image/*',
  disabled,
}: ImageUploaderProps) => {
  const [fileList, setFileList] = useState<UploadFile[]>(() => buildPreviewFile(value));
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFileList(buildPreviewFile(value));
  }, [value]);

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
    setUploading(true);
    setFileList([
      {
        uid,
        name: rcFile.name,
        status: 'uploading',
      },
    ]);

    try {
      const result = await storageApi.upload(rcFile as File, { module });
      setFileList([
        {
          uid,
          name: rcFile.name,
          status: 'done',
          url: result.url,
        },
      ]);
      onChange?.(result.url);
      options.onSuccess?.(result, new XMLHttpRequest());
    } catch (error) {
      console.error('上传图片失败', error);
      message.error('上传图片失败，请稍后再试');
      setFileList([
        {
          uid,
          name: rcFile.name,
          status: 'error',
        },
      ]);
      options.onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFileList([]);
    onChange?.(undefined);
    return true;
  };

  const handlePreview = async (file: UploadFile) => {
    const src = file.url ?? (file.originFileObj ? URL.createObjectURL(file.originFileObj) : '');
    if (!src) {
      return;
    }
    const image = new Image();
    image.src = src;
    const newWindow = window.open(src);
    if (newWindow) {
      newWindow.document.write(image.outerHTML);
    }
  };

  const uploadButton = useMemo(
    () => (
      <div>
        <PlusOutlined />
        <div style={{ marginTop: 8 }}>上传</div>
      </div>
    ),
    [],
  );

  return (
    <div>
      <Upload
        listType="picture-card"
        fileList={fileList}
        maxCount={1}
        customRequest={handleUpload}
        onRemove={handleRemove}
        onPreview={handlePreview}
        accept={accept}
        disabled={disabled || uploading}
        showUploadList={{ showPreviewIcon: true }}
      >
        {fileList.length >= 1 ? null : uploadButton}
      </Upload>
      {tips && (
        <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginTop: 8 }}>{tips}</div>
      )}
    </div>
  );
};

export default ImageUploader;
