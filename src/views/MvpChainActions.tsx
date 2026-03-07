import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { mvpChainActionsApi } from '../api/mvp-chain-actions';

const { Text } = Typography;

const parseJsonArray = (value: string, fieldName: string) => {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error(`${fieldName} 必须是数组 JSON`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`${fieldName} 解析失败：${(error as Error).message}`);
  }
};

const MvpChainActions = () => {
  const [outsourceCreateForm] = Form.useForm();
  const [outsourceStatusForm] = Form.useForm();
  const [outsourceMaterialForm] = Form.useForm();
  const [pieceworkCreateForm] = Form.useForm();
  const [pieceworkStatusForm] = Form.useForm();
  const [procurementCreateForm] = Form.useForm();
  const [procurementReceiveForm] = Form.useForm();
  const [finishedReceiptForm] = Form.useForm();

  const handleOutsourceCreate = async () => {
    const values = await outsourceCreateForm.validateFields();
    const payload = {
      ...values,
      dispatchDate: values.dispatchDate.format('YYYY-MM-DD'),
      expectedReturnDate: values.expectedReturnDate?.format('YYYY-MM-DD'),
    };
    const result = await mvpChainActionsApi.createOutsourcingOrder(payload);
    message.success(`外发单创建成功：${result.orderNo ?? result.id ?? '-'}`);
  };

  const handleOutsourceStatusUpdate = async () => {
    const values = await outsourceStatusForm.validateFields();
    const result = await mvpChainActionsApi.updateOutsourcingOrderStatus(values);
    message.success(`外发状态更新成功：${result.orderNo ?? result.id ?? '-'}`);
  };

  const handleOutsourceMaterial = async () => {
    const values = await outsourceMaterialForm.validateFields();
    const result = await mvpChainActionsApi.createOutsourcingMaterialRequest({
      ...values,
      requestedAt: values.requestedAt?.format('YYYY-MM-DDTHH:mm:ss'),
    });
    message.success(`补料申请成功：${result.id ?? '-'}`);
  };

  const handlePieceworkCreate = async () => {
    const values = await pieceworkCreateForm.validateFields();
    const result = await mvpChainActionsApi.createPieceworkTicket({
      ...values,
      recordedAt: values.recordedAt?.format('YYYY-MM-DDTHH:mm:ss'),
    });
    message.success(`计件票创建成功：${result.ticketNo ?? result.id ?? '-'}`);
  };

  const handlePieceworkStatusUpdate = async () => {
    const values = await pieceworkStatusForm.validateFields();
    const result = await mvpChainActionsApi.updatePieceworkTicketStatus(values);
    message.success(`计件票状态更新成功：${result.ticketNo ?? result.id ?? '-'}`);
  };

  const handleProcurementCreate = async () => {
    const values = await procurementCreateForm.validateFields();
    const lines = parseJsonArray(values.linesJson, '采购明细 lines');
    const result = await mvpChainActionsApi.createOrderBasedProcurement({
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      productionOrderId: values.productionOrderId,
      orderDate: values.orderDate.format('YYYY-MM-DD'),
      lines,
    });
    message.success(`订单采购创建成功：${result.orderNo ?? result.id ?? '-'}`);
  };

  const handleProcurementReceive = async () => {
    const values = await procurementReceiveForm.validateFields();
    const items = parseJsonArray(values.itemsJson, '收料明细 items');
    const result = await mvpChainActionsApi.receiveProcurementOrder({
      orderId: values.orderId,
      warehouseId: values.warehouseId,
      items,
      receivedAt: values.receivedAt?.format('YYYY-MM-DDTHH:mm:ss'),
      remark: values.remark,
    });
    message.success(`采购收料成功：${result.receiptNo ?? result.id ?? '-'}`);
  };

  const handleFinishedReceiptCreate = async () => {
    const values = await finishedReceiptForm.validateFields();
    const items = parseJsonArray(values.itemsJson, '成品入库明细 items');
    const result = await mvpChainActionsApi.createFinishedGoodsReceipt({
      productionOrderId: values.productionOrderId,
      warehouseId: values.warehouseId,
      items,
      receiptDate: values.receiptDate?.format('YYYY-MM-DDTHH:mm:ss'),
      remark: values.remark,
    });
    message.success(`成品入库成功：${result.receiptNo ?? result.id ?? '-'}`);
  };

  const onError = (error: unknown) => {
    message.error((error as Error)?.message || '操作失败');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="MVP 链路操作台（补齐后端 API 按钮入口）">
        <Text type="secondary">
          该页面用于直接触发闭环中缺失按钮的后端接口，所有请求均走当前登录租户。
        </Text>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="外发订单 - 新建 / 状态 / 补料">
            <Form form={outsourceCreateForm} layout="vertical" initialValues={{ dispatchQty: 10, unitPrice: 1.5, attritionRate: 0 }}>
              <Form.Item name="workOrderId" label="workOrderId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="subcontractorId" label="subcontractorId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="processCatalogId" label="processCatalogId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="dispatchQty" label="dispatchQty" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="unitPrice" label="unitPrice" rules={[{ required: true }]}><InputNumber min={0} precision={4} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="attritionRate" label="attritionRate"><InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="orderNo" label="orderNo（可选）"><Input /></Form.Item>
              <Form.Item name="dispatchDate" label="dispatchDate" rules={[{ required: true }]} initialValue={dayjs()}><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="expectedReturnDate" label="expectedReturnDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Button type="primary" onClick={() => void handleOutsourceCreate().catch(onError)}>创建外发订单</Button>
            </Form>

            <Form form={outsourceStatusForm} layout="inline" style={{ marginTop: 16 }}>
              <Form.Item name="orderId" rules={[{ required: true }]}><InputNumber min={1} placeholder="orderId" /></Form.Item>
              <Form.Item name="status" rules={[{ required: true }]} initialValue="COMPLETED">
                <Select style={{ width: 180 }} options={['PENDING_DISPATCH', 'DISPATCHED', 'RECEIVED', 'COMPLETED', 'SETTLED', 'CANCELLED'].map((v) => ({ label: v, value: v }))} />
              </Form.Item>
              <Button onClick={() => void handleOutsourceStatusUpdate().catch(onError)}>更新外发状态</Button>
            </Form>

            <Form form={outsourceMaterialForm} layout="inline" style={{ marginTop: 12 }}>
              <Form.Item name="orderId" rules={[{ required: true }]}><InputNumber min={1} placeholder="orderId" /></Form.Item>
              <Form.Item name="requestQuantity" rules={[{ required: true }]}><InputNumber min={1} placeholder="requestQty" /></Form.Item>
              <Form.Item name="materialId"><InputNumber min={1} placeholder="materialId(可选)" /></Form.Item>
              <Form.Item name="requestedAt"><DatePicker showTime /></Form.Item>
              <Form.Item name="remark"><Input placeholder="remark" /></Form.Item>
              <Button onClick={() => void handleOutsourceMaterial().catch(onError)}>提交补料申请</Button>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="计件票 - 新建 / 状态">
            <Form form={pieceworkCreateForm} layout="vertical" initialValues={{ quantity: 10, pieceRate: 1.2 }}>
              <Form.Item name="workOrderId" label="workOrderId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="processCatalogId" label="processCatalogId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="workerId" label="workerId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="quantity" label="quantity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="pieceRate" label="pieceRate" rules={[{ required: true }]}><InputNumber min={0.0001} precision={4} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="ticketNo" label="ticketNo（可选）"><Input /></Form.Item>
              <Form.Item name="recordedAt" label="recordedAt（可选）"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="remark" label="remark"><Input /></Form.Item>
              <Button type="primary" onClick={() => void handlePieceworkCreate().catch(onError)}>创建计件票</Button>
            </Form>

            <Form form={pieceworkStatusForm} layout="inline" style={{ marginTop: 16 }}>
              <Form.Item name="ticketId" rules={[{ required: true }]}><InputNumber min={1} placeholder="ticketId" /></Form.Item>
              <Form.Item name="status" rules={[{ required: true }]} initialValue="SETTLED">
                <Select style={{ width: 140 }} options={['PENDING', 'SETTLED', 'VOID'].map((v) => ({ label: v, value: v }))} />
              </Form.Item>
              <Button onClick={() => void handlePieceworkStatusUpdate().catch(onError)}>更新计件票状态</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="订单采购（ORDER_BASED）- 新建 / 收料">
            <Form form={procurementCreateForm} layout="vertical" initialValues={{ linesJson: '[{"materialId":1,"orderQty":10,"unit":"米","unitPrice":8.8}]', orderDate: dayjs() }}>
              <Form.Item name="supplierId" label="supplierId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="warehouseId" label="warehouseId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="productionOrderId" label="productionOrderId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="orderDate" label="orderDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="linesJson" label="lines(JSON)" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
              <Button type="primary" onClick={() => void handleProcurementCreate().catch(onError)}>创建订单采购</Button>
            </Form>

            <Form form={procurementReceiveForm} layout="vertical" style={{ marginTop: 16 }} initialValues={{ itemsJson: '[{"lineId":1,"receiveQty":10}]' }}>
              <Form.Item name="orderId" label="orderId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="warehouseId" label="warehouseId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="receivedAt" label="receivedAt"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="remark" label="remark"><Input /></Form.Item>
              <Form.Item name="itemsJson" label="items(JSON)" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
              <Button onClick={() => void handleProcurementReceive().catch(onError)}>执行采购收料</Button>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="成品入库（/finished-goods/receipts）">
            <Form form={finishedReceiptForm} layout="vertical" initialValues={{ itemsJson: '[{"productionOrderLineId":1,"styleVariantId":1,"quantity":10,"unitPrice":20}]' }}>
              <Form.Item name="productionOrderId" label="productionOrderId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="warehouseId" label="warehouseId" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="receiptDate" label="receiptDate"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="remark" label="remark"><Input /></Form.Item>
              <Form.Item name="itemsJson" label="items(JSON)" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item>
              <Button type="primary" onClick={() => void handleFinishedReceiptCreate().catch(onError)}>创建成品入库</Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default MvpChainActions;
