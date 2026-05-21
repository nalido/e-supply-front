import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { saleApi } from '../../api/sale';
import { getSaleSellerTypeLabel, type SaleChannelAccount, type SaleChannelCredential } from '../../types/sale';
import { publishSaleContextChanged, resolveSaleAccountSelection } from '../../utils/sale-menu-context';

const SELLER_TYPE_OPTIONS = [
  { label: '全托管', value: 'FULLY_MANAGED' },
  { label: '半托管', value: 'SEMI_MANAGED' },
];

const PLATFORM_OPTIONS = [
  { label: 'Temu', value: 'TEMU' },
  { label: 'Ozon', value: 'OZON' },
];

type ChannelAccountFormValues = {
  accountName: string;
  platformCode?: string;
  shopId?: string;
  shopName?: string;
  sellerType: string;
  remarks?: string;
  regionCode?: string;
  gatewayUrl?: string;
  authorizationType?: string;
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  credentialStatus?: string;
  extraPayload?: string;
};

const trimToUndefined = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const hasCredentialInput = (values: ChannelAccountFormValues) =>
  Boolean(
    trimToUndefined(values.appKey) ||
      trimToUndefined(values.appSecret) ||
      trimToUndefined(values.accessToken) ||
      trimToUndefined(values.refreshToken) ||
      trimToUndefined(values.extraPayload),
  );

const SaleChannelAccounts = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<SaleChannelAccount | null>(null);
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [credentialDetail, setCredentialDetail] = useState<SaleChannelCredential | null>(null);
  const [form] = Form.useForm<ChannelAccountFormValues>();
  const selectedPlatformCode = Form.useWatch('platformCode', form) ?? 'TEMU';
  const isOzon = selectedPlatformCode === 'OZON';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    (record: SaleChannelAccount) => {
      Modal.confirm({
        title: `删除店铺绑定 #${record.id}`,
        content: `删除后将仅做软删除处理，历史数据会保留，但该店铺不会再出现在销售中心页面。确认删除“${record.accountName}”吗？`,
        okText: '确认删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: async () => {
          try {
            const remainingAccounts = accounts.filter((item) => item.id !== record.id);
            const nextAccount = resolveSaleAccountSelection(remainingAccounts);
            await saleApi.deleteChannelAccount(record.id);
            publishSaleContextChanged(
              nextAccount
                ? {
                    accountId: nextAccount.id,
                    sellerType: nextAccount.sellerType,
                  }
                : {},
            );
            message.success('店铺绑定已删除');
            await loadData();
          } catch (error) {
            console.error(error);
          }
        },
      });
    },
    [accounts, loadData],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditing(null);
    setCredentialDetail(null);
    form.resetFields();
    form.setFieldsValue({
      platformCode: 'TEMU',
      sellerType: 'FULLY_MANAGED',
      authorizationType: 'TOKEN',
      credentialStatus: 'ACTIVE',
    });
    setModalOpen(true);
  };

  const openEditModal = useCallback((record: SaleChannelAccount) => {
    setEditing(record);
    setCredentialDetail(null);
    form.resetFields();
    form.setFieldsValue({
      accountName: record.accountName,
      platformCode: record.platformCode ?? 'TEMU',
      shopId: record.shopId ?? undefined,
      shopName: record.shopName ?? undefined,
      regionCode: record.regionCode ?? undefined,
      gatewayUrl: record.gatewayUrl ?? undefined,
      sellerType: record.sellerType ?? 'FULLY_MANAGED',
      authorizationType: record.authorizationType ?? 'TOKEN',
      remarks: record.remarks ?? undefined,
      credentialStatus: 'ACTIVE',
    });
    setModalOpen(true);
    setCredentialLoading(true);
    void saleApi
      .getChannelCredentialDetail(record.id)
      .then((detail) => {
        setCredentialDetail(detail);
        form.setFieldValue('credentialStatus', detail.status ?? 'ACTIVE');
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setCredentialLoading(false);
      });
  }, [form]);

  const columns: ColumnsType<SaleChannelAccount> = useMemo(
    () => [
      { title: '账号ID', dataIndex: 'id', width: 90 },
      { title: '平台', dataIndex: 'platformCode', width: 90 },
      { title: '账号名称', dataIndex: 'accountName', width: 160 },
      { title: '平台店铺ID', dataIndex: 'shopId', width: 130 },
      { title: '店铺名', dataIndex: 'shopName', width: 180 },
      {
        title: '店铺类型',
        dataIndex: 'sellerType',
        width: 120,
        render: (value: string | null | undefined) => (
          <Tag color={value === 'FULLY_MANAGED' ? 'blue' : value === 'SEMI_MANAGED' ? 'green' : 'default'}>
            {getSaleSellerTypeLabel(value)}
          </Tag>
        ),
      },
      { title: '网关', dataIndex: 'gatewayUrl', ellipsis: true },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value: string | null | undefined) => <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value ?? '--'}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 140,
        fixed: 'right',
        render: (_, record) => (
          <Space size={0}>
            <Button type="link" onClick={() => openEditModal(record)}>
              编辑
            </Button>
            <Button danger type="link" onClick={() => handleDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [handleDelete, openEditModal],
  );

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const credentialInputProvided = hasCredentialInput(values);
    const appKey = trimToUndefined(values.appKey);
    const appSecret = trimToUndefined(values.appSecret);
    const accessToken = trimToUndefined(values.accessToken);
    const platformCode = values.platformCode || editing?.platformCode || 'TEMU';
    const accessTokenRequired = platformCode !== 'OZON';

    if (!editing && (!appKey || !appSecret || (accessTokenRequired && !accessToken))) {
      message.warning(
        platformCode === 'OZON'
          ? '绑定 Ozon 店铺时必须同时填写 Client-Id 和 Api-Key'
          : '绑定店铺时必须同时填写 API Key、API Secret、Access Token',
      );
      return;
    }
    if (editing && credentialInputProvided && (!appKey || !appSecret || (accessTokenRequired && !accessToken))) {
      message.warning(
        platformCode === 'OZON'
          ? '如需更新 Ozon 凭证，请同时填写 Client-Id 和 Api-Key'
          : '如需更新凭证，请同时填写 API Key、API Secret、Access Token',
      );
      return;
    }

    setSubmitting(true);
    try {
      const accountPayload = {
        accountName: values.accountName,
        shopId: trimToUndefined(values.shopId),
        shopName: trimToUndefined(values.shopName),
        regionCode: trimToUndefined(values.regionCode),
        gatewayUrl: trimToUndefined(values.gatewayUrl),
        sellerType: values.sellerType,
        authorizationType: trimToUndefined(values.authorizationType),
        remarks: trimToUndefined(values.remarks),
      };

      let savedAccount: SaleChannelAccount;
      if (editing) {
        savedAccount = await saleApi.updateChannelAccount(editing.id, accountPayload);
      } else {
        savedAccount = await saleApi.createChannelAccount({
          platformCode,
          ...accountPayload,
        });
      }

      if (!editing || credentialInputProvided) {
        await saleApi.updateChannelCredential(savedAccount.id, {
          appKey: appKey!,
          appSecret: appSecret!,
          accessToken,
          refreshToken: trimToUndefined(values.refreshToken),
          status: values.credentialStatus ?? 'ACTIVE',
          extraPayload: values.extraPayload,
        });
      }

      publishSaleContextChanged({
        accountId: savedAccount.id,
        sellerType: savedAccount.sellerType,
      });
      message.success(editing ? '店铺绑定已更新' : '店铺绑定成功');
      setModalOpen(false);
      setEditing(null);
      setCredentialDetail(null);
      form.resetFields();
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            平台店铺绑定
          </Typography.Title>
          <Space>
            <Button onClick={() => void loadData()}>刷新</Button>
            <Button type="primary" onClick={openCreateModal}>
              绑定店铺
            </Button>
          </Space>
        </Space>
      </Card>
      <Card>
        <Table<SaleChannelAccount>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={accounts}
          pagination={false}
          scroll={{ x: 1280 }}
        />
      </Card>
      <Modal
        title={editing ? `编辑店铺绑定 #${editing.id}` : '新建店铺绑定'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          setCredentialDetail(null);
          form.resetFields();
        }}
        onOk={() => void handleSubmit()}
        okButtonProps={{ loading: submitting }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Typography.Title level={5}>店铺信息</Typography.Title>
          <Form.Item label="绑定名称" name="accountName" rules={[{ required: true, message: '请输入绑定名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="平台店铺ID" name="shopId">
            <Input placeholder="例如平台返回的 Shop ID" />
          </Form.Item>
          <Form.Item label="店铺名称" name="shopName">
            <Input />
          </Form.Item>
          <Form.Item label="所属平台" name="platformCode" rules={[{ required: true, message: '请选择所属平台' }]}>
            <Select options={PLATFORM_OPTIONS} />
          </Form.Item>
          <Form.Item label="店铺类型" name="sellerType" rules={[{ required: true, message: '请选择店铺类型' }]}>
            <Select options={SELLER_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="备注" name="remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'advanced',
                label: '高级配置（可选）',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Form.Item label="Region" name="regionCode" style={{ marginBottom: 0 }}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="Gateway" name="gatewayUrl" style={{ marginBottom: 0 }}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="授权类型" name="authorizationType" style={{ marginBottom: 0 }}>
                      <Input placeholder="TOKEN" />
                    </Form.Item>
                  </Space>
                ),
              },
            ]}
          />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            API 凭证
          </Typography.Title>
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message={
              editing
                ? isOzon
                  ? '若要覆盖 Ozon 凭证，请重新填写 Client-Id 和 Api-Key；留空则保持当前凭证不变。'
                  : '若要覆盖原有凭证，请重新填写 API Key、API Secret、Access Token；留空则保持当前凭证不变。'
                : isOzon
                  ? '首次绑定 Ozon 必须填写 Client-Id 和 Api-Key。'
                  : '首次绑定必须填写 API Key、API Secret、Access Token。'
            }
          />

          {editing ? (
            <Card size="small" loading={credentialLoading} style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="当前状态">{credentialDetail?.status ?? '--'}</Descriptions.Item>
                <Descriptions.Item label="最近校验">{credentialDetail?.lastValidatedAt ?? '--'}</Descriptions.Item>
                <Descriptions.Item label={isOzon ? 'Client-Id' : 'API Key'}>{credentialDetail?.appKeyMasked ?? '--'}</Descriptions.Item>
                <Descriptions.Item label={isOzon ? 'Api-Key' : 'API Secret'}>{credentialDetail?.appSecretMasked ?? '--'}</Descriptions.Item>
                {!isOzon ? <Descriptions.Item label="Access Token">{credentialDetail?.accessTokenMasked ?? '--'}</Descriptions.Item> : null}
                {!isOzon ? <Descriptions.Item label="Refresh Token">{credentialDetail?.refreshTokenMasked ?? '--'}</Descriptions.Item> : null}
              </Descriptions>
            </Card>
          ) : null}

          <Form.Item label={isOzon ? 'Client-Id' : 'API Key'} name="appKey">
            <Input placeholder={editing ? '留空则保持当前值' : isOzon ? '请输入 Ozon Client-Id' : '请输入 API Key'} />
          </Form.Item>
          <Form.Item label={isOzon ? 'Api-Key' : 'API Secret'} name="appSecret">
            <Input.Password placeholder={editing ? '留空则保持当前值' : isOzon ? '请输入 Ozon Api-Key' : '请输入 API Secret'} />
          </Form.Item>
          {!isOzon ? (
            <>
              <Form.Item label="Access Token" name="accessToken">
                <Input.Password placeholder={editing ? '留空则保持当前值' : '请输入 Access Token'} />
              </Form.Item>
              <Form.Item label="Refresh Token" name="refreshToken">
                <Input.Password placeholder="可选" />
              </Form.Item>
            </>
          ) : null}
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'credential-advanced',
                label: '凭证扩展配置（可选）',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Form.Item label="凭证状态" name="credentialStatus" style={{ marginBottom: 0 }}>
                      <Select
                        options={[
                          { label: 'ACTIVE', value: 'ACTIVE' },
                          { label: 'INACTIVE', value: 'INACTIVE' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item label="extraPayload(JSON)" name="extraPayload" style={{ marginBottom: 0 }}>
                      <Input.TextArea rows={4} placeholder='例如 {"shopId":"xxxx","region":"GLOBAL"}' />
                    </Form.Item>
                  </Space>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </Space>
  );
};

export default SaleChannelAccounts;
