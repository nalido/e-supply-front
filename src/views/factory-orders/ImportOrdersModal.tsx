import { Alert, Modal, Table, Upload } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import type { ImportRecord, ImportModalState } from './types';

type Props = {
  state: ImportModalState;
  onCancel: () => void;
  onOk: () => void;
  onBeforeUpload: (file: RcFile) => boolean;
  onRemove: () => void;
};

export default function ImportOrdersModal({ state, onCancel, onOk, onBeforeUpload, onRemove }: Props) {
  return (
    <Modal
      open={state.open}
      title="导入工厂订单"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={state.uploading}
      destroyOnHidden
      width={720}
    >
      <Upload.Dragger
        accept=".json,application/json"
        multiple={false}
        beforeUpload={onBeforeUpload}
        fileList={state.fileList}
        onRemove={() => {
          onRemove();
          return true;
        }}
      >
        <p className="ant-upload-drag-icon">
          <ImportOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽 JSON 文件到此处完成导入</p>
        <p className="ant-upload-hint">支持字段：orderNo、styleId、merchandiserId、factoryId、totalQuantity、expectedDelivery、status、materialStatus、remarks</p>
      </Upload.Dragger>
      {state.error ? <Alert type="error" showIcon style={{ marginTop: 16 }} message={state.error} /> : null}
      {state.records.length ? (
        <Table<ImportRecord>
          style={{ marginTop: 16 }}
          size="small"
          bordered
          rowKey={(record) => record.orderNo}
          dataSource={state.records}
          pagination={false}
          columns={[
            { title: '订单号', dataIndex: 'orderNo' },
            { title: '款式 ID', dataIndex: 'styleId' },
            { title: '数量', dataIndex: 'totalQuantity' },
            { title: '预计交期', dataIndex: 'expectedDelivery' },
            { title: '状态', dataIndex: 'status' },
            { title: '物料状态', dataIndex: 'materialStatus' },
          ]}
        />
      ) : null}
    </Modal>
  );
}
