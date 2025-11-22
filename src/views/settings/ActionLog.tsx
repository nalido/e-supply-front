import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Form, Input, Space, Table } from 'antd';
import { RedoOutlined, SearchOutlined } from '@ant-design/icons';
import type { ActionLogEntry, ActionLogQuery } from '../../types/settings';
import settingsApi from '../../api/settings';

const ActionLogPage = () => {
  const [form] = Form.useForm<ActionLogQuery>();
  const [dataSource, setDataSource] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
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
    </Card>
  );
};

export default ActionLogPage;
