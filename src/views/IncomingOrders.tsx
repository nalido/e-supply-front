import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig, TableRowSelection } from 'antd/es/table/interface';
import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SendOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { IncomingOrder, IncomingOrderStatus } from '../types';
import collaborationApi from '../api/collaboration';
import '../styles/incoming-orders.css';

const { Text } = Typography;

const statusLabels: Array<{ label: string; value: IncomingOrderStatus }> = [
  { label: '待接单', value: '待接单' },
  { label: '生产中', value: '生产中' },
  { label: '待发货', value: '待发货' },
  { label: '已完结', value: '已完结' },
  { label: '已拒绝', value: '已拒绝' },
];

const statusColorMap: Record<IncomingOrderStatus, string> = {
  待接单: 'processing',
  生产中: 'blue',
  待发货: 'gold',
  已完结: 'success',
  已拒绝: 'error',
};

type ShipmentFieldValues = {
  quantity: number;
  logisticsCompany?: string;
  trackingNo?: string;
  remark?: string;
};

type RejectFieldValues = {
  reason?: string;
};

const IncomingOrders = () => {
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<IncomingOrderStatus>('待接单');
  const [clientFilter, setClientFilter] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rowSelectionKeys, setRowSelectionKeys] = useState<Key[]>([]);
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<IncomingOrder | null>(null);
  const [pagination, setPagination] = useState<{ current: number; pageSize: number; total: number }>(
    { current: 1, pageSize: 10, total: 0 },
  );
  const { current: currentPage, pageSize } = pagination;

  const [shipForm] = Form.useForm<ShipmentFieldValues>();
  const [rejectForm] = Form.useForm<RejectFieldValues>();

  const fetchClients = useCallback(async () => {
    try {
      const data = await collaborationApi.listClients();
      setClients(data);
    } catch {
      message.error('获取客户列表失败，请稍后重试');
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const loadOrders = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const response = await collaborationApi.listIncomingOrders({
          status: statusFilter,
          clientName: clientFilter,
          keyword,
          page,
          pageSize,
        });
        setOrders(response.list);
        setPagination({ current: page, pageSize, total: response.total });
        setRowSelectionKeys([]);
      } catch {
        message.error('加载订单数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, clientFilter, keyword],
  );

  useEffect(() => {
    loadOrders(currentPage, pageSize);
  }, [loadOrders, currentPage, pageSize]);

  const remainingShipQuantity = useMemo(() => {
    if (!activeOrder) {
      return 0;
    }
    return Math.max(activeOrder.totalQuantity - activeOrder.shippedQuantity, 0);
  }, [activeOrder]);

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setKeyword(searchValue.trim());
  };

  const handleResetFilters = () => {
    setStatusFilter('待接单');
    setClientFilter(undefined);
    setSearchValue('');
    setKeyword('');
    setPagination({ current: 1, pageSize: 10, total: 0 });
  };

  const handlePageChange = (page: number, pageSize: number) => {
    loadOrders(page, pageSize);
  };

  const openShipModal = (order: IncomingOrder) => {
    setActiveOrder(order);
    setShipModalOpen(true);
    const remaining = Math.max(order.totalQuantity - order.shippedQuantity, 0);
    shipForm.setFieldsValue({ quantity: remaining || order.totalQuantity });
  };

  const closeShipModal = () => {
    setShipModalOpen(false);
    setActiveOrder(null);
    shipForm.resetFields();
  };

  const handleShipSubmit = async () => {
    if (!activeOrder) return;
    try {
      const values = await shipForm.validateFields();
      if (values.quantity <= 0) {
        message.warning('请输入本次发货数量');
        return;
      }
      setRowActionLoading(activeOrder.id);
      await collaborationApi.shipOrder(activeOrder.id, values);
      message.success('发货信息已更新');
      closeShipModal();
      await loadOrders(currentPage, pageSize);
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      message.error('提交发货信息失败，请稍后重试');
    } finally {
      setRowActionLoading(null);
    }
  };

  const openRejectModal = (order: IncomingOrder) => {
    setActiveOrder(order);
    setRejectModalOpen(true);
    rejectForm.resetFields();
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setActiveOrder(null);
    rejectForm.resetFields();
  };

  const handleRejectSubmit = async () => {
    if (!activeOrder) return;
    try {
      const { reason } = await rejectForm.validateFields();
      setRowActionLoading(activeOrder.id);
      await collaborationApi.rejectIncomingOrder(activeOrder.id, reason);
      message.success('已拒绝该订单');
      closeRejectModal();
      await loadOrders(currentPage, pageSize);
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      message.error('拒绝订单失败，请稍后重试');
    } finally {
      setRowActionLoading(null);
    }
  };

  const handleAccept = async (order: IncomingOrder) => {
    try {
      setRowActionLoading(order.id);
      await collaborationApi.acceptIncomingOrder(order.id);
      message.success('订单已接单，状态更新为生产中');
      await loadOrders(currentPage, pageSize);
    } catch {
      message.error('接单失败，请稍后重试');
    } finally {
      setRowActionLoading(null);
    }
  };

  const handleBulkStatusChange: MenuProps['onClick'] = async ({ key }) => {
    if (!rowSelectionKeys.length) {
      return;
    }
    setBulkUpdating(true);
    try {
      await collaborationApi.bulkUpdateStatus(
        rowSelectionKeys.map(String),
        key as IncomingOrderStatus,
      );
      message.success('已批量更新订单状态');
      await loadOrders(currentPage, pageSize);
    } catch {
      message.error('批量设置状态失败，请稍后重试');
    } finally {
      setBulkUpdating(false);
    }
  };

  const statusMenuItems: MenuProps['items'] = useMemo(() =>
    statusLabels.map(({ label, value }) => ({
      key: value,
      label,
      icon: <CheckCircleOutlined />,
    })),
  []);

  const handleViewDetail = (order: IncomingOrder) => {
    Modal.info({
      title: `订单详情 - ${order.orderNo}`,
      width: 520,
      icon: <InfoCircleOutlined />,
      content: (
        <Descriptions
          className="incoming-orders-detail"
          column={1}
          labelStyle={{ width: 120 }}
          size="small"
        >
          <Descriptions.Item label="客户">{order.clientName}</Descriptions.Item>
          <Descriptions.Item label="款式">{`${order.styleCode} ${order.styleName}`}</Descriptions.Item>
          <Descriptions.Item label="状态">{order.status}</Descriptions.Item>
          <Descriptions.Item label="外发日期">{order.dispatchDate}</Descriptions.Item>
          <Descriptions.Item label="交货日期">{order.deliveryDate}</Descriptions.Item>
          <Descriptions.Item label="发货进度">
            {`${order.shippedQuantity} / ${order.totalQuantity}`}
          </Descriptions.Item>
          <Descriptions.Item label="是否确认收货">{order.receiptConfirmed ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="次品数量">{order.defects}</Descriptions.Item>
          {order.memo ? <Descriptions.Item label="备注">{order.memo}</Descriptions.Item> : null}
        </Descriptions>
      ),
    });
  };

  const columns: ColumnsType<IncomingOrder> = [
    {
      title: '款式信息',
      dataIndex: 'styleName',
      key: 'style',
      render: (_value, record) => (
        <div className="incoming-orders-style">
          <img src={record.styleImage} alt={record.styleName} className="incoming-orders-style-img" />
          <div>
            <div className="incoming-orders-style-code">{record.styleCode}</div>
            <div className="incoming-orders-style-name">{record.styleName}</div>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: IncomingOrderStatus) => <Tag color={statusColorMap[value]}>{value}</Tag>,
    },
    {
      title: '外发日期',
      dataIndex: 'dispatchDate',
      key: 'dispatchDate',
    },
    {
      title: '交货日期',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
    },
    {
      title: '发货',
      dataIndex: 'shippedQuantity',
      key: 'shipment',
      render: (_value, record) => (
        <Text>{`${record.shippedQuantity} / ${record.totalQuantity}`}</Text>
      ),
    },
    {
      title: '确认收货',
      dataIndex: 'receiptConfirmed',
      key: 'receiptConfirmed',
      render: (confirmed: boolean) => (
        <Tag color={confirmed ? 'green' : 'default'}>{confirmed ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '次品',
      dataIndex: 'defects',
      key: 'defects',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value, record) => {
        const isShipDisabled = record.shippedQuantity >= record.totalQuantity;
        const actions: JSX.Element[] = [];
        if (record.status === '待接单') {
          actions.push(
            <Button
              key="accept"
              type="link"
              loading={rowActionLoading === record.id}
              onClick={() => handleAccept(record)}
            >
              接单
            </Button>,
          );
          actions.push(
            <Button
              key="reject"
              type="link"
              danger
              loading={rowActionLoading === record.id && rejectModalOpen}
              onClick={() => openRejectModal(record)}
            >
              拒绝
            </Button>,
          );
        }
        if (record.status === '生产中' || record.status === '待发货') {
          actions.push(
            <Button
              key="ship"
              type="link"
              icon={<SendOutlined />}
              disabled={isShipDisabled}
              loading={rowActionLoading === record.id && shipModalOpen}
              onClick={() => openShipModal(record)}
            >
              发货
            </Button>,
          );
        }
        actions.push(
          <Button key="detail" type="link" onClick={() => handleViewDetail(record)}>
            详情
          </Button>,
        );
        return <Space size={4}>{actions}</Space>;
      },
    },
  ];

  const rowSelection: TableRowSelection<IncomingOrder> = {
    selectedRowKeys: rowSelectionKeys,
    onChange: (keys) => setRowSelectionKeys(keys as Key[]),
  };

  const paginationConfig: TablePaginationConfig = {
    current: currentPage,
    pageSize,
    total: pagination.total,
    showSizeChanger: true,
    onChange: handlePageChange,
    showTotal: (total) => `共 ${total} 条订单`,
  };

  return (
    <div className="incoming-orders-page">
      <Card bordered={false} className="incoming-orders-card">
        <div className="incoming-orders-action-bar">
          <Typography.Title level={4} className="incoming-orders-title">外接订单</Typography.Title>
          <Dropdown
            menu={{ items: statusMenuItems, onClick: handleBulkStatusChange }}
            placement="bottomRight"
            trigger={['click']}
            disabled={!rowSelectionKeys.length}
          >
            <Button
              type="primary"
              icon={<SettingOutlined />}
              loading={bulkUpdating}
              ghost
            >
              设置状态
            </Button>
          </Dropdown>
        </div>

        <div className="incoming-orders-filters">
          <Segmented
            options={statusLabels}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as IncomingOrderStatus);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Space size={12} wrap>
            <Select
              allowClear
              placeholder="全部客户"
              value={clientFilter}
              style={{ width: 180 }}
              onChange={(value) => {
                setClientFilter(value || undefined);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              options={clients.map((client) => ({ label: client, value: client }))}
            />
            <Input
              allowClear
              placeholder="单号/款号/款名"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onPressEnter={handleApplyFilters}
              style={{ width: 240 }}
            />
            <Button type="primary" onClick={handleApplyFilters}>筛选</Button>
            <Button onClick={handleResetFilters} icon={<ExclamationCircleOutlined />}>重置</Button>
          </Space>
        </div>

        <Table<IncomingOrder>
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          columns={columns}
          dataSource={orders}
          pagination={paginationConfig}
          className="incoming-orders-table"
        />
      </Card>

      <Modal
        title="发货"
        open={shipModalOpen}
        onCancel={closeShipModal}
        onOk={handleShipSubmit}
        confirmLoading={rowActionLoading === activeOrder?.id}
        okText="确认发货"
        destroyOnClose
      >
        <Form form={shipForm} layout="vertical" preserve={false}>
          <Form.Item label="本次发货数量" name="quantity" initialValue={0} rules={[{ required: true, message: '请输入发货数量' }]}>
            <InputNumber
              min={1}
              max={remainingShipQuantity || activeOrder?.totalQuantity}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="物流公司" name="logisticsCompany">
            <Input placeholder="请输入物流公司" />
          </Form.Item>
          <Form.Item label="物流单号" name="trackingNo">
            <Input placeholder="请输入物流单号" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
          {activeOrder ? (
            <Text type="secondary">
              剩余发货数量：{Math.max(activeOrder.totalQuantity - activeOrder.shippedQuantity, 0)}
            </Text>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title="拒绝订单"
        open={rejectModalOpen}
        onCancel={closeRejectModal}
        onOk={handleRejectSubmit}
        confirmLoading={rowActionLoading === activeOrder?.id}
        okText="确认拒绝"
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical" preserve={false}>
          <Form.Item
            label="拒绝原因"
            name="reason"
            rules={[{ required: true, message: '请填写拒绝原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入拒绝原因" maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IncomingOrders;
