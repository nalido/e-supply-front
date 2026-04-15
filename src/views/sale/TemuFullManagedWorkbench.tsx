import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import type { SaleFulfillmentDemandItem, SaleTemuFullyManagedWorkbenchInitResult, SaleTemuFullyManagedWorkbenchSubmitResult } from '../../types/sale';

const deliveryMethodOptions = [
  { label: '自送仓', value: 1 },
  { label: '公司指定物流', value: 2 },
  { label: '第三方物流', value: 3 },
];

const TemuFullManagedWorkbench = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initData, setInitData] = useState<SaleTemuFullyManagedWorkbenchInitResult>();
  const [submitResult, setSubmitResult] = useState<SaleTemuFullyManagedWorkbenchSubmitResult>();
  const [form] = Form.useForm();

  const accountId = searchParams.get('accountId');
  const demandIds = useMemo(
    () =>
      (searchParams.get('demandIds') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [searchParams],
  );
  const selectedDeliveryMethod = Form.useWatch('deliveryMethod', form) as number | undefined;

  const demandColumns: ColumnsType<SaleFulfillmentDemandItem> = [
    { title: '备货单号', dataIndex: 'bizDocNo', width: 180 },
    {
      title: '状态',
      dataIndex: 'normalizedStatus',
      width: 140,
      render: (value) => <Tag color={value === 'READY_TO_SHIP' ? 'blue' : 'default'}>{value ?? '--'}</Tag>,
    },
    { title: '收件人', dataIndex: 'receiverName', width: 120 },
    { title: 'SKU 行数', dataIndex: 'itemCount', width: 100 },
    { title: '数量', dataIndex: 'quantity', width: 100 },
    { title: '仓提示', dataIndex: 'warehouseHint', width: 160 },
    { title: '最晚时限', dataIndex: 'deadlineAt', width: 180 },
  ];

  const loadInitData = useCallback(async () => {
    if (!accountId || demandIds.length === 0) {
      message.error('缺少工作台初始化参数');
      return;
    }
    setLoading(true);
    try {
      const response = await saleApi.initTemuFullyManagedWorkbench({
        channelAccountId: Number(accountId),
        demandIds: demandIds.map(Number),
      });
      setInitData(response);
      const defaultSellerAddress = response.sellerAddresses.find((item) => item.isDefault) ?? response.sellerAddresses[0];
      const defaultVendor = response.thirdPartyVendors[0];
      form.setFieldsValue({
        sellerAddressId: defaultSellerAddress ? Number(defaultSellerAddress.id) : undefined,
        deliveryAddressType: response.deliveryAddressTypeOptions[0]?.value ?? 4,
        deliveryMethod: 3,
        totalPackageNum: 1,
        expressPackageNum: 1,
        pickupMethod: 0,
        thirdPartyVendorId: defaultVendor?.expressCompanyId,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [accountId, demandIds, form]);

  useEffect(() => {
    void loadInitData();
  }, [loadInitData]);

  const sellerAddressOptions = useMemo(
    () =>
      (initData?.sellerAddresses ?? []).map((item) => ({
        label: item.label,
        value: Number(item.id),
      })),
    [initData?.sellerAddresses],
  );
  const vendorOptions = useMemo(
    () =>
      (initData?.thirdPartyVendors ?? []).map((item) => ({
        label: `${item.expressCompanyName} (${item.expressCompanyId})`,
        value: item.expressCompanyId,
      })),
    [initData?.thirdPartyVendors],
  );
  const deliveryAddressTypeOptions = useMemo(
    () =>
      (initData?.deliveryAddressTypeOptions ?? []).map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [initData?.deliveryAddressTypeOptions],
  );
  const receiveAddressSummary = useMemo(
    () => (initData?.receiveAddressGroups ?? []).map((item) => item.subWarehouseName || item.subWarehouseId).join(' / '),
    [initData?.receiveAddressGroups],
  );

  const handleSubmit = async () => {
    if (!initData?.workbenchId) {
      message.warning('工作台尚未初始化完成');
      return;
    }
    const values = await form.validateFields();
    const vendor = initData.thirdPartyVendors.find((item) => item.expressCompanyId === values.thirdPartyVendorId);
    setSubmitting(true);
    try {
      const response = await saleApi.submitTemuFullyManagedWorkbench(initData.workbenchId, {
        sellerAddressId: values.sellerAddressId,
        deliveryAddressType: values.deliveryAddressType,
        trackingNo: values.trackingNo,
        carrierCode: values.carrierCode,
        carrierName: values.carrierName,
        deliveryMethod: values.deliveryMethod,
        predictPackageVolume: values.predictPackageVolume,
        predictTotalPackageWeight: values.predictTotalPackageWeight,
        totalPackageNum: values.totalPackageNum,
        expressPackageNum: values.expressPackageNum,
        pickupMethod: values.pickupMethod,
        selfDeliveryInfo:
          values.deliveryMethod === 1
            ? {
                expressPackageNum: values.expressPackageNum,
                deliveryContactNumber: values.deliveryContactNumber,
              }
            : undefined,
        thirdPartyDeliveryInfo:
          values.deliveryMethod === 2
            ? {
                expressPackageNum: values.expressPackageNum,
                pickupMethod: values.pickupMethod,
              }
            : undefined,
        thirdPartyExpressDeliveryInfoVO:
          values.deliveryMethod === 3
            ? {
                expressPackageNum: values.expressPackageNum,
                expressCompanyId: vendor?.expressCompanyId ?? values.carrierCode,
                expressCompanyName: vendor?.expressCompanyName ?? values.carrierName,
                expressDeliverySn: values.trackingNo,
              }
            : undefined,
      });
      setSubmitResult(response);
      message.success('Temu 全托发货提交成功');
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
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Temu 全托发货工作台
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              当前工作台按 Temu 全托备货单流程执行入发货台、创建发货单、自动生成基础包裹并完成装箱发货。
            </Typography.Paragraph>
          </div>
          <Space>
            <Button onClick={() => navigate('/sale/fulfillments')}>返回待履约单据</Button>
            <Button onClick={() => void loadInitData()} loading={loading}>
              刷新工作台
            </Button>
          </Space>
        </Space>
      </Card>
      {submitResult && (
        <Alert
          type={submitResult.success ? 'success' : 'error'}
          showIcon
          message={submitResult.success ? '发货已提交' : '发货失败'}
          description={
            <Descriptions column={1} size="small">
              <Descriptions.Item label="工作台ID">{submitResult.workbenchId}</Descriptions.Item>
              <Descriptions.Item label="状态">{submitResult.status ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="请求ID">{submitResult.requestId ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="发货单号">{submitResult.deliveryOrderNos?.join(', ') || '--'}</Descriptions.Item>
              <Descriptions.Item label="错误">{submitResult.errorMessage ?? '--'}</Descriptions.Item>
            </Descriptions>
          }
        />
      )}
      {submitResult?.printAssets?.length ? (
        <Alert
          type="info"
          showIcon
          message="打印资源"
          description={
            <Space direction="vertical" size={8}>
              {submitResult.printAssets.map((item) => (
                <Typography.Link key={`${item.assetType}-${item.refNo}-${item.dataKey}`} href={item.printUrl ?? undefined} target="_blank" rel="noreferrer">
                  {item.assetType === 'BOX_MARK' ? '箱唛' : '商品标签'} / {item.refNo || '--'}
                </Typography.Link>
              ))}
            </Space>
          }
        />
      ) : null}
      <Card title="单据概览" loading={loading}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="工作台ID">{initData?.workbenchId ?? '--'}</Descriptions.Item>
          <Descriptions.Item label="备货单数">{initData?.demands.length ?? 0}</Descriptions.Item>
          <Descriptions.Item label="收货仓">{receiveAddressSummary || '--'}</Descriptions.Item>
        </Descriptions>
        <Table<SaleFulfillmentDemandItem>
          style={{ marginTop: 16 }}
          rowKey="id"
          pagination={false}
          columns={demandColumns}
          dataSource={initData?.demands ?? []}
          scroll={{ x: 1100 }}
        />
      </Card>
      <Card title="发货参数">
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="系统会按当前选中的备货单 SKU 数量自动生成基础包裹结构，并在发货成功后返回可打印的商品标签与箱唛链接。"
        />
        <Form form={form} layout="vertical">
          <Form.Item label="卖家发货地址" name="sellerAddressId" rules={[{ required: true, message: '请选择卖家发货地址' }]}>
            <Select options={sellerAddressOptions} placeholder="选择卖家发货地址" />
          </Form.Item>
          <Form.Item label="发货地址类型" name="deliveryAddressType" rules={[{ required: true, message: '请选择发货地址类型' }]}>
            <Select options={deliveryAddressTypeOptions} placeholder="选择发货地址类型" />
          </Form.Item>
          <Form.Item label="发货方式" name="deliveryMethod" rules={[{ required: true, message: '请选择发货方式' }]}>
            <Select options={deliveryMethodOptions} />
          </Form.Item>
          <Form.Item label="物流单号" name="trackingNo" rules={[{ required: true, message: '请输入物流单号' }]}>
            <Input placeholder="请输入物流单号" />
          </Form.Item>
          <Form.Item label="物流公司编码" name="carrierCode">
            <Input placeholder="第三方物流时可直接填写物流公司编码" />
          </Form.Item>
          <Form.Item label="物流公司名称" name="carrierName">
            <Input placeholder="请输入物流公司名称" />
          </Form.Item>
          <Form.Item label="包裹件数" name="totalPackageNum" rules={[{ required: true, message: '请输入包裹件数' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="交接包裹数" name="expressPackageNum" rules={[{ required: true, message: '请输入交接包裹数' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          {selectedDeliveryMethod !== 1 && (
            <>
              <Form.Item label="预估总体积 (m³)" name="predictPackageVolume">
                <InputNumber min={0} step={0.001} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="预估总重量 (g)" name="predictTotalPackageWeight">
                <InputNumber min={1000} step={1000} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
          {selectedDeliveryMethod === 1 && (
            <Form.Item label="联系电话" name="deliveryContactNumber">
              <Input placeholder="自送仓联系电话" />
            </Form.Item>
          )}
          {selectedDeliveryMethod === 2 && (
            <Form.Item label="揽收方式" name="pickupMethod">
              <Select
                options={[
                  { label: '默认', value: 0 },
                  { label: '自送', value: 1 },
                ]}
              />
            </Form.Item>
          )}
          {selectedDeliveryMethod === 3 && (
            <Form.Item label="第三方物流公司" name="thirdPartyVendorId" rules={[{ required: true, message: '请选择第三方物流公司' }]}>
              <Select options={vendorOptions} placeholder="选择第三方物流公司" />
            </Form.Item>
          )}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
                提交发货
              </Button>
              <Button onClick={() => form.resetFields()}>清空表单</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
};

export default TemuFullManagedWorkbench;
