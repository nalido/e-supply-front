import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Button, Card, Descriptions, Empty, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import type {
  SaleFulfillmentDemandItem,
  SaleTemuFullyManagedWorkbenchInitResult,
  SaleTemuFullyManagedWorkbenchSubmitResult,
  SaleTemuPackageDetail,
  SaleTemuPackagePlan,
} from '../../types/sale';

const deliveryMethodOptions = [
  { label: '自送仓', value: 1 },
  { label: '公司指定物流', value: 2 },
  { label: '第三方物流', value: 3 },
];

const clonePackagePlans = (plans: SaleTemuPackagePlan[] = []): SaleTemuPackagePlan[] =>
  plans.map((plan) => ({
    ...plan,
    detailItems: (plan.detailItems ?? []).map((detail) => ({ ...detail })),
    packageInfos: (plan.packageInfos ?? []).map((pkg) => ({
      ...pkg,
      packageDetails: (pkg.packageDetails ?? []).map((detail) => ({ ...detail })),
    })),
  }));

const getAllocatedQuantity = (plan: SaleTemuPackagePlan, productSkuId: string): number =>
  (plan.packageInfos ?? []).reduce((total, pkg) => {
    const matched = (pkg.packageDetails ?? []).find((detail) => detail.productSkuId === productSkuId);
    return total + Number(matched?.quantity ?? 0);
  }, 0);

const hasAllocationMismatch = (plan: SaleTemuPackagePlan): boolean =>
  (plan.detailItems ?? []).some((detail) => Number(detail.quantity ?? 0) !== getAllocatedQuantity(plan, detail.productSkuId));

const TemuFullManagedWorkbench = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initData, setInitData] = useState<SaleTemuFullyManagedWorkbenchInitResult>();
  const [submitResult, setSubmitResult] = useState<SaleTemuFullyManagedWorkbenchSubmitResult>();
  const [packagePlans, setPackagePlans] = useState<SaleTemuPackagePlan[]>([]);
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
  const packagePlanHasMismatch = useMemo(() => packagePlans.some(hasAllocationMismatch), [packagePlans]);

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
      setPackagePlans(clonePackagePlans(response.packagePlans ?? []));
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

  const handleAddPackage = (bizDocNo: string) => {
    setPackagePlans((current) =>
      current.map((plan) => {
        if (plan.bizDocNo !== bizDocNo) {
          return plan;
        }
        const nextIndex = (plan.packageInfos?.length ?? 0) + 1;
        return {
          ...plan,
          packageInfos: [
            ...(plan.packageInfos ?? []),
            {
              packageKey: `${plan.bizDocNo}-PKG-${nextIndex}-${Date.now()}`,
              packageDetails: (plan.detailItems ?? []).map((detail) => ({
                productSkuId: detail.productSkuId,
                platformSkuCode: detail.platformSkuCode,
                goodsName: detail.goodsName,
                quantity: 0,
              })),
            },
          ],
        };
      }),
    );
  };

  const handleRemovePackage = (bizDocNo: string, packageKey: string) => {
    setPackagePlans((current) =>
      current.map((plan) => {
        if (plan.bizDocNo !== bizDocNo || (plan.packageInfos?.length ?? 0) <= 1) {
          return plan;
        }
        return {
          ...plan,
          packageInfos: (plan.packageInfos ?? []).filter((pkg) => pkg.packageKey !== packageKey),
        };
      }),
    );
  };

  const handlePackageQuantityChange = (bizDocNo: string, packageKey: string, productSkuId: string, value: number | null) => {
    setPackagePlans((current) =>
      current.map((plan) => {
        if (plan.bizDocNo !== bizDocNo) {
          return plan;
        }
        return {
          ...plan,
          packageInfos: (plan.packageInfos ?? []).map((pkg) => {
            if (pkg.packageKey !== packageKey) {
              return pkg;
            }
            return {
              ...pkg,
              packageDetails: (pkg.packageDetails ?? []).map((detail) =>
                detail.productSkuId === productSkuId
                  ? {
                      ...detail,
                      quantity: Math.max(0, Math.floor(Number(value ?? 0))),
                    }
                  : detail,
              ),
            };
          }),
        };
      }),
    );
  };

  const handleResetPackagePlans = () => {
    setPackagePlans(clonePackagePlans(initData?.packagePlans ?? []));
  };

  const handleSubmit = async () => {
    if (!initData?.workbenchId) {
      message.warning('工作台尚未初始化完成');
      return;
    }
    if (packagePlanHasMismatch) {
      message.warning('请先调整包裹分配，确保每个备货单的包裹数量与待发数量一致');
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
        packagePlans: packagePlans.map((plan) => ({
          demandId: plan.demandId,
          bizDocNo: plan.bizDocNo,
          packageInfos: (plan.packageInfos ?? []).map((pkg) => ({
            packageDetails: (pkg.packageDetails ?? []).map((detail) => ({
              productSkuId: detail.productSkuId,
              skuNum: Number(detail.quantity ?? 0),
            })),
          })),
        })),
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

  const renderPackagePlan = (plan: SaleTemuPackagePlan) => {
    const skuRows = (plan.detailItems ?? []).map((detail) => ({
      ...detail,
      allocatedQuantity: getAllocatedQuantity(plan, detail.productSkuId),
      remainingQuantity: Number(detail.quantity ?? 0) - getAllocatedQuantity(plan, detail.productSkuId),
    }));
    const mismatch = hasAllocationMismatch(plan);

    return (
      <Card
        key={plan.bizDocNo}
        size="small"
        title={`备货单 ${plan.bizDocNo}`}
        extra={
          <Space>
            <Tag color={mismatch ? 'warning' : 'success'}>{mismatch ? '待调整' : '已平衡'}</Tag>
            <Button size="small" onClick={() => handleAddPackage(plan.bizDocNo)}>
              新增包裹
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="SKU 行数">{plan.detailItems?.length ?? 0}</Descriptions.Item>
            <Descriptions.Item label="待发总数">{plan.totalQuantity ?? '--'}</Descriptions.Item>
            <Descriptions.Item label="包裹数">{plan.packageInfos?.length ?? 0}</Descriptions.Item>
          </Descriptions>
          <Table
            size="small"
            rowKey={(record) => record.productSkuId}
            pagination={false}
            dataSource={skuRows}
            columns={[
              { title: 'SKU ID', dataIndex: 'productSkuId', width: 180 },
              { title: '平台 SKU 编码', dataIndex: 'platformSkuCode', width: 160, render: (value) => value || '--' },
              { title: '商品', dataIndex: 'goodsName', width: 220, render: (value) => value || '--' },
              { title: '待发数', dataIndex: 'quantity', width: 100, render: (value) => value ?? 0 },
              { title: '已分配', dataIndex: 'allocatedQuantity', width: 100 },
              {
                title: '剩余',
                dataIndex: 'remainingQuantity',
                width: 100,
                render: (value) => <Tag color={Number(value) === 0 ? 'success' : 'warning'}>{value}</Tag>,
              },
            ]}
            scroll={{ x: 900 }}
          />
          {(plan.packageInfos ?? []).map((pkg, packageIndex) => (
            <Card
              key={pkg.packageKey}
              type="inner"
              size="small"
              title={`包裹 ${packageIndex + 1}`}
              extra={
                <Button
                  size="small"
                  danger
                  disabled={(plan.packageInfos?.length ?? 0) <= 1}
                  onClick={() => handleRemovePackage(plan.bizDocNo, pkg.packageKey)}
                >
                  删除包裹
                </Button>
              }
            >
              <Table<SaleTemuPackageDetail>
                size="small"
                rowKey={(record) => record.productSkuId}
                pagination={false}
                dataSource={plan.detailItems ?? []}
                columns={[
                  { title: 'SKU ID', dataIndex: 'productSkuId', width: 180 },
                  { title: '商品', dataIndex: 'goodsName', width: 220, render: (value) => value || '--' },
                  { title: '待发数', dataIndex: 'quantity', width: 100, render: (value) => value ?? 0 },
                  {
                    title: '本包裹数量',
                    width: 160,
                    render: (_, detail) => {
                      const current =
                        (pkg.packageDetails ?? []).find((item) => item.productSkuId === detail.productSkuId)?.quantity ?? 0;
                      return (
                        <InputNumber
                          min={0}
                          max={Number(detail.quantity ?? 0)}
                          value={Number(current)}
                          style={{ width: '100%' }}
                          onChange={(value) =>
                            handlePackageQuantityChange(plan.bizDocNo, pkg.packageKey, detail.productSkuId, value)
                          }
                        />
                      );
                    },
                  },
                ]}
                scroll={{ x: 760 }}
              />
            </Card>
          ))}
          <Alert
            type={mismatch ? 'warning' : 'success'}
            showIcon
            message={mismatch ? '当前包裹分配未平衡' : '当前包裹分配已平衡'}
            description={
              mismatch
                ? '每个 SKU 的所有包裹数量之和，必须等于该备货单待发数量后才能提交发货。'
                : '当前备货单所有 SKU 已完成包裹分配，可直接进入发货提交。'
            }
          />
        </Space>
      </Card>
    );
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
              当前工作台支持按备货单调整包裹拆分方案，再按 Temu 全托流程创建发货单并完成装箱发货。
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
      <Card
        title="包裹计划"
        extra={
          <Button size="small" onClick={handleResetPackagePlans} disabled={loading || !initData?.packagePlans?.length}>
            重置包裹计划
          </Button>
        }
      >
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="先分配每个备货单的包裹数量，再提交发货"
          description="系统默认按“每个备货单一个包裹”初始化，你可以继续拆包。提交前会校验每个 SKU 的包裹分配数量是否等于待发数量。"
        />
        {packagePlans.length ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {packagePlans.map(renderPackagePlan)}
          </Space>
        ) : (
          <Empty description="当前备货单暂无可编辑的包裹计划" />
        )}
      </Card>
      <Card title="发货参数">
        <Alert
          style={{ marginBottom: 16 }}
          type={packagePlanHasMismatch ? 'warning' : 'info'}
          showIcon
          message={packagePlanHasMismatch ? '包裹计划仍有未平衡数量' : '发货提交前将复用当前包裹计划'}
          description={
            packagePlanHasMismatch
              ? '请先把上面的包裹计划调整到全部平衡，再提交发货。'
              : '发货成功后，工作台会继续回传可打印的商品标签与箱唛链接。'
          }
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
              <Button type="primary" loading={submitting} onClick={() => void handleSubmit()} disabled={packagePlanHasMismatch}>
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
