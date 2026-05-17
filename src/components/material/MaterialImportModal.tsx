import { Alert, Button, Modal, Table, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { UploadProps } from 'antd/es/upload';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import type { MaterialImportRowResult } from '../../api/material';
import type { CreateMaterialPayload } from '../../types';

const { Paragraph, Text } = Typography;
const { Dragger } = Upload;

type MaterialImportModalProps = {
  open: boolean;
  loading?: boolean;
  fileList: UploadFile[];
  previewRows: CreateMaterialPayload[];
  resultRows: MaterialImportRowResult[];
  onCancel: () => void;
  onDownloadTemplate: () => void;
  onFileChange: (next: UploadFile[]) => void;
  onStartImport: () => void;
};

const MaterialImportModal = ({
  open,
  loading,
  fileList,
  previewRows,
  resultRows,
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
          originFileObj: file,
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
      destroyOnHidden
      width={920}
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
        <p className="ant-upload-hint">支持 .xlsx / .xls / .csv，单次最多 500 行，按物料编号新增或更新</p>
      </Dragger>
      {previewRows.length > 0 && (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 16 }}
            message={`已解析 ${previewRows.length} 行，提交后将按物料编号执行新增或更新。`}
          />
          <Table
            size="small"
            rowKey={(record) => String(record.rowNumber ?? record.sku ?? record.name)}
            style={{ marginTop: 12 }}
            pagination={{ pageSize: 5 }}
            dataSource={previewRows}
            columns={[
              { title: '行号', dataIndex: 'rowNumber', width: 72 },
              { title: '物料编号', dataIndex: 'sku', width: 140 },
              { title: '名称', dataIndex: 'name' },
              { title: '单位', dataIndex: 'unit', width: 90 },
              { title: '参考单价', dataIndex: 'referencePrice', width: 110 },
              { title: '颜色', dataIndex: 'colors', render: (value?: string[]) => value?.join('、') || '-' },
            ]}
          />
        </>
      )}
      {resultRows.length > 0 && (
        <Table
          size="small"
          rowKey={(record) => `${record.rowNumber}-${record.sku ?? ''}-${record.action}`}
          style={{ marginTop: 12 }}
          pagination={{ pageSize: 5 }}
          dataSource={resultRows}
          columns={[
            { title: '行号', dataIndex: 'rowNumber', width: 72 },
            { title: '物料编号', dataIndex: 'sku', width: 140 },
            { title: '名称', dataIndex: 'name' },
            { title: '动作', dataIndex: 'action', width: 96 },
            {
              title: '结果',
              dataIndex: 'success',
              width: 80,
              render: (value: boolean) => (value ? '成功' : '失败'),
            },
            { title: '说明', dataIndex: 'message' },
          ]}
        />
      )}
    </Modal>
  );
};

export default MaterialImportModal;
