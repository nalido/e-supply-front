import { Button, Modal, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { UploadProps } from 'antd/es/upload';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;
const { Dragger } = Upload;

type MaterialImportModalProps = {
  open: boolean;
  loading?: boolean;
  fileList: UploadFile[];
  onCancel: () => void;
  onDownloadTemplate: () => void;
  onFileChange: (next: UploadFile[]) => void;
  onStartImport: () => void;
};

const MaterialImportModal = ({
  open,
  loading,
  fileList,
  onCancel,
  onDownloadTemplate,
  onFileChange,
  onStartImport,
}: MaterialImportModalProps) => {
  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    multiple: false,
    fileList,
    beforeUpload: (file) => {
      onFileChange([
        {
          uid: file.uid,
          name: file.name,
          status: 'done',
        },
      ]);
      return false;
    },
    onRemove: () => {
      onFileChange([]);
    },
  };

  return (
    <Modal
      title="导入物料"
      open={open}
      onCancel={onCancel}
      onOk={onStartImport}
      okText="开始导入"
      cancelText="取消"
      confirmLoading={loading}
      okButtonProps={{ disabled: fileList.length === 0 }}
      destroyOnClose
    >
      <Paragraph>
        <Text strong>步骤一：</Text> 下载并填写模板。
      </Paragraph>
      <Button icon={<DownloadOutlined />} type="link" onClick={onDownloadTemplate}>
        下载模板
      </Button>
      <Paragraph style={{ marginTop: 16 }}>
        <Text strong>步骤二：</Text> 上传已填写的模板文件。
      </Paragraph>
      <Dragger {...uploadProps} style={{ padding: '12px 0' }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">支持 .xlsx / .xls / .csv，文件大小不超过 5MB</p>
      </Dragger>
    </Modal>
  );
};

export default MaterialImportModal;
