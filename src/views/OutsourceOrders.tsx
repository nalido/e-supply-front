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
  PrinterOutlined,
  ReloadOutlined,
  SettingOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import type {
  OutsourceOrder,
  OutsourceOrderStatus,
  OutsourceMaterialRequestPayload,
  OutsourceReceiptPayload,
} from '../types';
import collaborationApi from '../api/collaboration';
import '../styles/outsource-orders.css';

const { Text, Title } = Typography;

type OutsourceStatusFilter = OutsourceOrderStatus | '全部';

type ReceiptFormFields = OutsourceReceiptPayload;
type MaterialRequestFormFields = OutsourceMaterialRequestPayload;

const statusOptions: Array<{ label: string; value: OutsourceStatusFilter }> = [
  { label: '全部', value: '全部' },
  { label: '已完结', value: '已完结' },
  { label: '已取消', value: '已取消' },
];

const statusColorMap: Record<OutsourceOrderStatus, string> = {
  已完结: 'success',
  已取消: 'error',
};

const OutsourceOrders = () => {
  const [orders, setOrders] = useState<OutsourceOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<OutsourceStatusFilter>('全部');
  const [searchValue, setSearchValue] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rowSelectionKeys, setRowSelectionKeys] = useState<Key[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [receiptTargets, setReceiptTargets] = useState<string[]>([]);
  const [materialTarget, setMaterialTarget] = useState<OutsourceOrder | null>(null);
  const [pagination, setPagination] = useState<{ current: number; pageSize: number; total: number }>(
    { current: 1, pageSize: 10, total: 0 },
  );
  const { current: currentPage, pageSize } = pagination;

  const [receiptForm] = Form.useForm<ReceiptFormFields>();
  const [materialForm] = Form.useForm<MaterialRequestFormFields>();

  const loadOrders = useCallback(
    async (page: number, size: number) => {
      setLoading(true);
      try {
        const response = await collaborationApi.listOutsourceOrders({
          status: statusFilter,
          keyword,
          page,
          pageSize: size,
        });
        setOrders(response.list);
        setPagination({ current: page, pageSize: size, total: response.total });
        setRowSelectionKeys([]);
      } catch {
        message.error('加载外发订单失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, keyword],
  );

  useEffect(() => {
    loadOrders(currentPage, pageSize);
  }, [loadOrders, currentPage, pageSize]);

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setKeyword(searchValue.trim());
  };

  const handleResetFilters = () => {
    setStatusFilter('全部');
    setSearchValue('');
    setKeyword('');
    setPagination({ current: 1, pageSize: 10, total: 0 });
  };

  const handlePageChange = (page: number, size: number) => {
    loadOrders(page, size);
  };

  const openReceiptModal = (targetIds: string[]) => {
    if (!targetIds.length) return;
    setReceiptTargets(targetIds);
    receiptForm.resetFields();
    setReceiptModalOpen(true);
  };

  const closeReceiptModal = () => {
    setReceiptModalOpen(false);
    setReceiptTargets([]);
    receiptForm.resetFields();
  };

  const handleReceiptSubmit = async () => {
    if (!receiptTargets.length) return;
    try {
      const values = await receiptForm.validateFields();
      if (!values.receivedQuantity || values.receivedQuantity <= 0) {
        message.warning('请输入本次收货数量');
        return;
      }
      setBulkUpdating(true);
      await collaborationApi.confirmOutsourceReceipt(receiptTargets, values);
      message.success('收货信息已更新');
      closeReceiptModal();
      await loadOrders(currentPage, pageSize);
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      message.error('更新收货信息失败，请稍后重试');
    } finally {
      setBulkUpdating(false);
    }
  };

  const openMaterialModal = (order: OutsourceOrder) => {
    setMaterialTarget(order);
    materialForm.resetFields();
    setMaterialModalOpen(true);
  };

  const closeMaterialModal = () => {
    setMaterialModalOpen(false);
    setMaterialTarget(null);
    materialForm.resetFields();
  };

  const handleMaterialSubmit = async () => {
    if (!materialTarget) return;
    try {
      const values = await materialForm.validateFields();
      if (!values.requestQuantity || values.requestQuantity <= 0) {
        message.warning('请输入补料数量');
        return;
      }
      setRowActionLoading(materialTarget.id);
      await collaborationApi.requestOutsourceMaterial(materialTarget.id, values);
      message.success('补料申请已提交');
      closeMaterialModal();
      await loadOrders(currentPage, pageSize);
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) {
        return;
      }
      message.error('补料申请提交失败，请稍后重试');
    } finally {
      setRowActionLoading(null);
    }
  };

  const handleBulkStatusChange: MenuProps['onClick'] = async ({ key }) => {
    if (!rowSelectionKeys.length) return;
    setBulkUpdating(true);
    try {
      await collaborationApi.setOutsourceStatus(rowSelectionKeys.map(String), key as OutsourceOrderStatus);
      message.success('状态已更新');
      await loadOrders(currentPage, pageSize);
    } catch {
      message.error('更新状态失败，请稍后重试');
    } finally {
      setBulkUpdating(false);
    }
  };

  const statusMenuItems: MenuProps['items'] = useMemo(
    () =>
      statusOptions
        .filter((option) => option.value !== '全部')
        .map(({ label, value }) => ({ key: value, label, icon: <CheckCircleOutlined /> })),
    [],
  );

  const handleViewDetail = (order: OutsourceOrder) => {
    Modal.info({
      title: `订单详情 - ${order.orderNo}`,
      width: 520,
      icon: <SnippetsOutlined />,
      content: (
        <Descriptions
          className="outsource-orders-detail"
          column={1}
          labelStyle={{ width: 120 }}
          size="small"
        >
          <Descriptions.Item label="合作工厂">{order.partnerName}</Descriptions.Item>
          <Descriptions.Item label="款式">{`${order.styleCode} ${order.styleName}`}</Descriptions.Item>
          <Descriptions.Item label="状态">{order.status}</Descriptions.Item>
          <Descriptions.Item label="发货日期">{order.shipDate}</Descriptions.Item>
          <Descriptions.Item label="预计回货">{order.expectedReturnDate}</Descriptions.Item>
          <Descriptions.Item label="收货进度">
            {`${order.receivedQuantity} / ${order.totalQuantity}`}
          </Descriptions.Item>
          <Descriptions.Item label="次品数量">{order.defects}</Descriptions.Item>
          {order.materialPending ? (
            <Descriptions.Item label="补料状态">
              <Tag color="orange">补料处理中</Tag>
            </Descriptions.Item>
          ) : null}
          {order.remark ? <Descriptions.Item label="备注">{order.remark}</Descriptions.Item> : null}
        </Descriptions>
      ),
    });
  };

  const rowSelection: TableRowSelection<OutsourceOrder> = {
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

  const columns: ColumnsType<OutsourceOrder> = [
    {
      title: '款式信息',
      dataIndex: 'styleName',
      key: 'style',
      render: (_value, record) => (
        <div className="outsource-orders-style">
          <img src={record.styleImage} alt={record.styleName} className="outsource-orders-style-img" />
          <div>
            <div className="outsource-orders-style-code">{record.styleCode}</div>
            <div className="outsource-orders-style-name">{record.styleName}</div>
            <Text type="secondary">合作单位：{record.partnerName}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: OutsourceOrderStatus) => <Tag color={statusColorMap[value]}>{value}</Tag>,
    },
    {
      title: '发货日期',
      dataIndex: 'shipDate',
      key: 'shipDate',
    },
    {
      title: '预计回货',
      dataIndex: 'expectedReturnDate',
      key: 'expectedReturnDate',
    },
    {
      title: '收货',
      dataIndex: 'receivedQuantity',
      key: 'received',
      render: (_value, record) => (
        <Text>{`${record.receivedQuantity} / ${record.totalQuantity}`}</Text>
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
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" onClick={() => openReceiptModal([record.id])}>
            确认收货
          </Button>
          <Button type="link" icon={<PrinterOutlined />} onClick={() => message.info('已生成打印任务')}>打印</Button>
        </Space>
      ),
    },
  ];

  const hasSelection = rowSelectionKeys.length > 0;
  const allowMaterialRequest = rowSelectionKeys.length === 1;

  return (
    <div className="outsource-orders-page">
      <Card bordered={false} className="outsource-orders-card">
        <div className="outsource-orders-action-bar">
          <Title level={4} className="outsource-orders-title">外发订单</Title>
          <Space size={12} wrap>
            <Button
              type="primary"
              ghost
              icon={<ReloadOutlined />}
              disabled={!hasSelection}
              onClick={() => openReceiptModal(rowSelectionKeys.map(String))}
            >
              收货确认
            </Button>
            <Button
              type="primary"
              ghost
              disabled={!allowMaterialRequest}
              onClick={() => {
                const [targetId] = rowSelectionKeys;
                if (!targetId) return;
                const order = orders.find((item) => item.id === targetId);
                if (order) {
                  openMaterialModal(order);
                }
              }}
            >
              补料申请
            </Button>
            <Dropdown
              menu={{ items: statusMenuItems, onClick: handleBulkStatusChange }}
              placement="bottomRight"
              trigger={['click']}
              disabled={!hasSelection}
            >
              <Button type="primary" icon={<SettingOutlined />} ghost loading={bulkUpdating}>
                设置状态
              </Button>
            </Dropdown>
          </Space>
        </div>

        <div className="outsource-orders-filters">
          <Segmented
            options={statusOptions}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as OutsourceStatusFilter);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Space size={12} wrap>
            <Input
              allowClear
              placeholder="单号/款号/款名"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onPressEnter={handleApplyFilters}
              style={{ width: 240 }}
            />
            <Button type="primary" onClick={handleApplyFilters}>筛选</Button>
            <Button icon={<ExclamationCircleOutlined />} onClick={handleResetFilters}>重置</Button>
          </Space>
        </div>

        <Table<OutsourceOrder>
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          columns={columns}
          dataSource={orders}
          pagination={paginationConfig}
          className="outsource-orders-table"
        />
      </Card>

      <Modal
        title={receiptTargets.length > 1 ? `批量确认收货（${receiptTargets.length} 条）` : '确认收货'}
        open={receiptModalOpen}
        onCancel={closeReceiptModal}
        onOk={handleReceiptSubmit}
        okText="确认收货"
        confirmLoading={bulkUpdating}
        destroyOnClose
      >
        <Form form={receiptForm} layout="vertical" preserve={false}>
          <Form.Item
            label="本次收货数量"
            name="receivedQuantity"
            rules={[{ required: true, message: '请输入收货数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="次品数量" name="defectQuantity">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="补料申请"
        open={materialModalOpen}
        onCancel={closeMaterialModal}
        onOk={handleMaterialSubmit}
        okText="提交申请"
        confirmLoading={rowActionLoading === materialTarget?.id}
        destroyOnClose
      >
        <Form form={materialForm} layout="vertical" preserve={false}>
          <Form.Item
            label="补料数量"
            name="requestQuantity"
            rules={[{ required: true, message: '请输入补料数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="补料说明" name="materialRemark">
            <Input.TextArea rows={3} placeholder="补料说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OutsourceOrders;
