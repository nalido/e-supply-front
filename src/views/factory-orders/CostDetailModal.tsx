import { Descriptions, Modal, Space, Table } from 'antd';
import type { FactoryOrderCostDetail } from '../../api/factory-orders';
import { getMaterialStatusLabel } from './utils';
import type { OrderActionSnapshot } from './types';

type Props = {
  record: OrderActionSnapshot | null;
  data: FactoryOrderCostDetail | null;
  loading: boolean;
  onCancel: () => void;
};

export default function CostDetailModal({ record, data, loading, onCancel }: Props) {
  return (
    <Modal
      open={Boolean(record)}
      title={record ? `大货成本明细 - ${record.orderCode}` : '大货成本明细'}
      footer={null}
      onCancel={onCancel}
      destroyOnHidden
      width={900}
    >
      {record ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="订单号">{record.orderCode}</Descriptions.Item>
            <Descriptions.Item label="款号">{record.styleCode ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="款名">{record.styleName ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="下单数量">
              {typeof record.orderQuantity === 'number' ? `${record.orderQuantity.toLocaleString()} 件` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预计交货">{record.expectedDelivery ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="物料状态">{getMaterialStatusLabel(record.materialStatus)}</Descriptions.Item>
            <Descriptions.Item label="生产阶段">{record.productionStage ?? '-'}</Descriptions.Item>
          </Descriptions>
          <Table
            size="small"
            bordered
            loading={loading}
            pagination={false}
            rowKey="key"
            dataSource={
              data
                ? [
                    {
                      key: 'estimated',
                      label: '预计总成本',
                      material: data.estimatedCost.material,
                      processing: data.estimatedCost.processing,
                      outsourcing: data.estimatedCost.outsourcing,
                      fee: data.estimatedCost.fee,
                      total: data.estimatedCost.total,
                    },
                    {
                      key: 'actual',
                      label: '实际总成本',
                      material: data.actualCost.material,
                      processing: data.actualCost.processing,
                      outsourcing: data.actualCost.outsourcing,
                      fee: data.actualCost.fee,
                      total: data.actualCost.total,
                    },
                    {
                      key: 'estimated-unit',
                      label: '预计单件成本',
                      material: data.estimatedUnitCost.material,
                      processing: data.estimatedUnitCost.processing,
                      outsourcing: data.estimatedUnitCost.outsourcing,
                      fee: data.estimatedUnitCost.fee,
                      total: data.estimatedUnitCost.total,
                    },
                    {
                      key: 'actual-unit',
                      label: '实际单件成本',
                      material: data.actualUnitCost.material,
                      processing: data.actualUnitCost.processing,
                      outsourcing: data.actualUnitCost.outsourcing,
                      fee: data.actualUnitCost.fee,
                      total: data.actualUnitCost.total,
                    },
                  ]
                : []
            }
            columns={[
              { title: '成本类型', dataIndex: 'label', width: 140 },
              { title: '物料', dataIndex: 'material', align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '加工', dataIndex: 'processing', align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '外协', dataIndex: 'outsourcing', align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '费用', dataIndex: 'fee', align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '合计', dataIndex: 'total', align: 'right', render: (value: number) => value.toFixed(2) },
            ]}
          />
          <Table
            size="small"
            bordered
            pagination={{ pageSize: 5, showSizeChanger: false }}
            rowKey={(_record, index) => `entry-${index}`}
            dataSource={data?.entries ?? []}
            columns={[
              {
                title: '类型',
                dataIndex: 'entryType',
                width: 100,
                render: (value: string) => (value === 'ESTIMATED' ? '预计' : value === 'ACTUAL' ? '实际' : value || '-'),
              },
              {
                title: '类别',
                dataIndex: 'costCategory',
                width: 120,
                render: (value: string) => ({
                  MATERIAL: '物料',
                  PROCESSING: '加工',
                  OUTSOURCING: '外协',
                  FEE: '费用',
                }[value] ?? value ?? '-'),
              },
              {
                title: '金额',
                dataIndex: 'amount',
                width: 120,
                align: 'right',
                render: (value: number) => value.toFixed(2),
              },
              {
                title: '引用单号',
                dataIndex: 'referenceNo',
                render: (value: string | undefined) => value || '-',
              },
              {
                title: '记录时间',
                dataIndex: 'recordedAt',
                width: 190,
                render: (value: string | undefined) => value || '-',
              },
            ]}
          />
        </Space>
      ) : null}
    </Modal>
  );
}
