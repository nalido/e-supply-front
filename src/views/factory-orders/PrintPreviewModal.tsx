import { Descriptions, Modal } from 'antd';
import type { OrderActionSnapshot } from './types';

type Props = {
  record: OrderActionSnapshot | null;
  onCancel: () => void;
  onPrint: () => void;
};

export default function PrintPreviewModal({ record, onCancel, onPrint }: Props) {
  return (
    <Modal
      open={Boolean(record)}
      title={record ? `打印预览 - ${record.orderCode}` : '打印预览'}
      onCancel={onCancel}
      onOk={onPrint}
      okText="打印"
      cancelText="关闭"
      destroyOnHidden
    >
      {record ? (
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="订单号">{record.orderCode}</Descriptions.Item>
          <Descriptions.Item label="款号">{record.styleCode ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="款名">{record.styleName ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="下单数量">
            {typeof record.orderQuantity === 'number' ? `${record.orderQuantity.toLocaleString()} 件` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="预计交货">{record.expectedDelivery ?? '-'}</Descriptions.Item>
        </Descriptions>
      ) : null}
    </Modal>
  );
}
