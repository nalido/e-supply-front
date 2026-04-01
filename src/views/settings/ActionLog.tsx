import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Descriptions, Form, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { RedoOutlined, SearchOutlined } from '@ant-design/icons';
import type { ActionLogEntry, ActionLogQuery } from '../../types/settings';
import settingsApi from '../../api/settings';

const { Paragraph, Text } = Typography;

type AuditPayloadItem = {
  color?: string;
  size?: string;
  quantity?: number;
};

type AuditPayload = {
  bedNumber?: string;
  completedAt?: string;
  recordedAt?: string;
  workOrderId?: string | number;
  productionOrderId?: string | number;
  deletedQuantity?: number;
  targetCompletedQty?: number;
  source?: string;
  items?: AuditPayloadItem[];
};

const tryParsePayload = (payloadSnapshot?: string): AuditPayload | null => {
  if (!payloadSnapshot) {
    return null;
  }
  try {
    return JSON.parse(payloadSnapshot) as AuditPayload;
  } catch {
    return null;
  }
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-');

const ActionLogPage = () => {
  const [form] = Form.useForm<ActionLogQuery>();
  const [dataSource, setDataSource] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ActionLogEntry | null>(null);
  const [pagination, setPagination] = useState<{ current: number; pageSize: number; total: number }>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadLogs = ({
    page = pagination.current,
    pageSize = pagination.pageSize,
    filters,
  }: {
    page?: number;
    pageSize?: number;
    filters?: ActionLogQuery;
  } = {}) => {
    const values = filters ?? form.getFieldsValue();
    setLoading(true);
    settingsApi.audit
      .list({ ...values, page, pageSize })
      .then((result) => {
        const startIndex = (page - 1) * pageSize;
        const listWithOrder = result.list.map((item, index) => ({
          ...item,
          order: startIndex + index + 1,
        }));
        setDataSource(listWithOrder);
        setPagination({ current: page, pageSize, total: result.total });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const values = form.getFieldsValue();
    loadLogs({ page: 1, filters: values });
  };

  const handleReset = () => {
    form.resetFields();
    loadLogs({ page: 1, filters: {} });
  };

  const handleTableChange = (page: number, pageSize: number) => {
    loadLogs({ page, pageSize });
  };

  const detailPayload = useMemo(() => tryParsePayload(detailRecord?.payloadSnapshot), [detailRecord]);

  const payloadItems = detailPayload?.items ?? [];

  const columns: ColumnsType<ActionLogEntry> = [
    { title: '序号', dataIndex: 'order', width: 80 },
    { title: '模块名称', dataIndex: 'module' },
    { title: '操作名称', dataIndex: 'action' },
    { title: '用户', dataIndex: 'operatorName' },
    {
      title: '操作时间',
      dataIndex: 'operatedAt',
      render: (value: string | undefined) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    { title: '客户端IP', dataIndex: 'clientIp' },
    {
      title: '详情',
      key: 'detail',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setDetailRecord(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <Card title="操作日志">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="module" label="模块名称">
            <Input placeholder="搜索模块" allowClear />
          </Form.Item>
          <Form.Item name="action" label="操作名称">
            <Input placeholder="搜索操作" allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset} icon={<RedoOutlined />}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table<ActionLogEntry>
          rowKey={(record) => record.id}
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: handleTableChange,
          }}
        />
      </Space>
      <Modal
        open={Boolean(detailRecord)}
        title={detailRecord ? `操作详情 · ${detailRecord.action}` : '操作详情'}
        onCancel={() => setDetailRecord(null)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        {detailRecord ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="模块">{detailRecord.module || '-'}</Descriptions.Item>
              <Descriptions.Item label="操作">{detailRecord.action || '-'}</Descriptions.Item>
              <Descriptions.Item label="用户">{detailRecord.operatorName || '-'}</Descriptions.Item>
              <Descriptions.Item label="操作时间">{formatDateTime(detailRecord.operatedAt)}</Descriptions.Item>
              <Descriptions.Item label="客户端IP">{detailRecord.clientIp || '-'}</Descriptions.Item>
              <Descriptions.Item label="单据号">{detailRecord.documentNo || '-'}</Descriptions.Item>
            </Descriptions>

            {detailPayload ? (
              <>
                <Descriptions column={2} size="small" bordered title="业务字段">
                  <Descriptions.Item label="工厂订单ID">
                    {detailPayload.productionOrderId ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="裁床单ID">
                    {detailPayload.workOrderId ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="床次">
                    {detailPayload.bedNumber ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="来源">
                    {detailPayload.source ? <Tag>{detailPayload.source}</Tag> : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="录入/完成时间">
                    {formatDateTime(detailPayload.recordedAt ?? detailPayload.completedAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="删除数量">
                    {detailPayload.deletedQuantity ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="删除后裁床累计">
                    {detailPayload.targetCompletedQty ?? '-'}
                  </Descriptions.Item>
                </Descriptions>

                {payloadItems.length > 0 ? (
                  <Table<AuditPayloadItem>
                    rowKey={(item, index) => `${item.color ?? 'unknown'}-${item.size ?? 'unknown'}-${index}`}
                    size="small"
                    bordered
                    pagination={false}
                    dataSource={payloadItems}
                    title={() => '颜色尺码明细'}
                    columns={[
                      { title: '颜色', dataIndex: 'color', render: (value?: string) => value || '-' },
                      { title: '尺码', dataIndex: 'size', render: (value?: string) => value || '-' },
                      { title: '数量', dataIndex: 'quantity', render: (value?: number) => value ?? 0 },
                    ]}
                  />
                ) : null}
              </>
            ) : (
              <Text type="secondary">该操作没有结构化业务详情。</Text>
            )}

            <div>
              <Text strong>原始 payload</Text>
              <Paragraph
                copyable={detailRecord.payloadSnapshot ? { text: detailRecord.payloadSnapshot } : false}
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: '#fafafa',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
                }}
              >
                {detailRecord.payloadSnapshot || '无'}
              </Paragraph>
            </div>
          </Space>
        ) : null}
      </Modal>
    </Card>
  );
};

export default ActionLogPage;
