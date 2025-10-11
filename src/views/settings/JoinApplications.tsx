import { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Card, Form, Input, Select, Space, Table, Tag, message } from 'antd';
import { CheckOutlined, CloseOutlined, RedoOutlined, SearchOutlined } from '@ant-design/icons';
import type { JoinApplication, JoinApplicationStatus } from '../../types/settings';
import settingsApi from '../../api/settings';

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

const statusTag: Record<JoinApplicationStatus, { color: string; text: string }> = {
  pending: { color: 'processing', text: '待审批' },
  approved: { color: 'success', text: '已通过' },
  rejected: { color: 'error', text: '已驳回' },
};

const JoinApplicationsPage = () => {
  const [form] = Form.useForm<{ keyword?: string; status?: JoinApplicationStatus | 'all' }>();
  const [applications, setApplications] = useState<JoinApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const loadApplications = (filters?: { keyword?: string; status?: JoinApplicationStatus | 'all' }) => {
    setLoading(true);
    settingsApi.onboarding
      .list(filters)
      .then(setApplications)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadApplications({ status: 'all' });
  }, []);

  const handleSearch = () => {
    const values = form.getFieldsValue();
    loadApplications(values);
  };

  const handleReset = () => {
    form.resetFields();
    loadApplications({ status: 'all' });
  };

  const updateStatus = async (record: JoinApplication, action: 'approve' | 'reject') => {
    const handler = action === 'approve' ? settingsApi.onboarding.approve : settingsApi.onboarding.reject;
    const success = await handler(record.id);
    if (success) {
      message.success(action === 'approve' ? '已通过该申请' : '已驳回该申请');
      handleSearch();
    } else {
      message.error('操作失败，请稍后再试');
    }
  };

  const columns: ColumnsType<JoinApplication> = [
    { title: '用户名', dataIndex: 'name' },
    { title: '手机号', dataIndex: 'phone' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: JoinApplicationStatus) => <Tag color={statusTag[status].color}>{statusTag[status].text}</Tag>,
    },
    { title: '申请时间', dataIndex: 'appliedAt' },
    {
      title: '处理时间',
      dataIndex: 'handledAt',
      render: (value?: string) => value ?? '—',
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<CheckOutlined />}
            disabled={record.status !== 'pending'}
            onClick={() => updateStatus(record, 'approve')}
          >
            通过
          </Button>
          <Button
            type="link"
            icon={<CloseOutlined />}
            disabled={record.status !== 'pending'}
            onClick={() => updateStatus(record, 'reject')}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="入职申请">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="keyword" label="用户名/手机号">
            <Input placeholder="输入关键词" allowClear prefix={<SearchOutlined />} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="all">
            <Select options={statusOptions} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                搜索
              </Button>
              <Button icon={<RedoOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table<JoinApplication>
          rowKey={(record) => record.id}
          loading={loading}
          dataSource={applications}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Space>
    </Card>
  );
};

export default JoinApplicationsPage;
