import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Select, Skeleton, Space, Typography, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CuttingTask } from '../types';
import { pieceworkService } from '../api/piecework';

const { Text } = Typography;

type CreateFormValues = {
  orderId?: string;
  bedNumber: string;
  color?: string;
  size?: string;
  quantity: number;
  remark?: string;
};

const CuttingCreatePage = () => {
  const [tasks, setTasks] = useState<CuttingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<CreateFormValues>();
  const navigate = useNavigate();
  const selectedOrderId = Form.useWatch('orderId', form);

  const defaultOrderId = searchParams.get('orderId') ?? undefined;

  useEffect(() => {
    let cancelled = false;
    const fetchPendingTasks = async () => {
      setLoading(true);
      try {
        const response = await pieceworkService.getCuttingPending({
          page: 1,
          pageSize: 100,
          includeCompleted: false,
          includeSummary: false,
        });
        if (!cancelled) {
          const valid = response.list.filter((item) => item.pendingQuantity > 0 && item.workOrderId);
          setTasks(valid);
          const initialId =
            (defaultOrderId && valid.find((item) => String(item.id) === defaultOrderId)?.id) ??
            valid[0]?.id;
          if (initialId) {
            const selected = valid.find((item) => item.id === initialId);
            form.setFieldsValue({
              orderId: initialId,
              quantity: Math.max(1, selected?.pendingQuantity ?? 1),
            });
          }
        }
      } catch (error) {
        console.error('failed to load pending tasks for cutting creation', error);
        if (!cancelled) {
          message.error('获取待裁订单失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void fetchPendingTasks();
    return () => {
      cancelled = true;
    };
  }, [defaultOrderId, form]);

  const selectedTask = useMemo(() => {
    if (!selectedOrderId) {
      return undefined;
    }
    return tasks.find((item) => String(item.id) === String(selectedOrderId));
  }, [selectedOrderId, tasks]);

  const handleOrderChange = (orderId: string) => {
    const selected = tasks.find((item) => String(item.id) === String(orderId));
    form.setFieldsValue({
      quantity: Math.max(1, selected?.pendingQuantity ?? 1),
    });
  };

  const handleSubmit = async (values: CreateFormValues) => {
    const selected = tasks.find((item) => String(item.id) === String(values.orderId));
    if (!selected || !selected.workOrderId) {
      message.error('所选订单缺少工单信息，无法创建裁床单');
      return;
    }
    if (values.quantity > selected.pendingQuantity) {
      message.warning('创建数量不能大于待裁数量');
      return;
    }
    setSubmitting(true);
    try {
      await pieceworkService.createCuttingTasks([
        {
          workOrderId: selected.workOrderId,
          bedNumber: values.bedNumber.trim(),
          color: values.color?.trim() || undefined,
          size: values.size?.trim() || undefined,
          quantity: values.quantity,
          remark: values.remark?.trim() || undefined,
        },
      ]);
      message.success('裁床单创建成功');
      navigate('/piecework/cutting/list');
    } catch (error) {
      console.error('failed to create cutting task', error);
      message.error('创建裁床单失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="新建裁床单">
          {loading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : (
            <Form<CreateFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="选择待裁订单"
                name="orderId"
                rules={[{ required: true, message: '请选择订单' }]}
              >
                <Select
                  showSearch
                  placeholder="请选择待裁订单"
                  optionFilterProp="label"
                  onChange={handleOrderChange}
                  options={tasks.map((task) => ({
                    value: task.id,
                    label: `${task.orderCode} / ${task.styleName}（待裁 ${task.pendingQuantity}${task.unit}）`,
                  }))}
                />
              </Form.Item>

              {selectedTask ? (
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" size={4}>
                    <Text>订单号：{selectedTask.orderCode}</Text>
                    <Text>款式：{selectedTask.styleCode} / {selectedTask.styleName}</Text>
                    <Text>待裁数量：{selectedTask.pendingQuantity} {selectedTask.unit}</Text>
                  </Space>
                </Card>
              ) : null}

              <Space size={16} wrap style={{ width: '100%' }}>
                <Form.Item
                  label="床次"
                  name="bedNumber"
                  rules={[{ required: true, message: '请输入床次' }]}
                  style={{ minWidth: 220 }}
                >
                  <Input placeholder="例如：A-01" maxLength={32} />
                </Form.Item>
                <Form.Item
                  label="创建数量"
                  name="quantity"
                  rules={[{ required: true, message: '请输入数量' }]}
                  style={{ minWidth: 220 }}
                >
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="颜色" name="color" style={{ minWidth: 220 }}>
                  <Input placeholder="可选" maxLength={64} />
                </Form.Item>
                <Form.Item label="尺码" name="size" style={{ minWidth: 220 }}>
                  <Input placeholder="可选" maxLength={32} />
                </Form.Item>
              </Space>

              <Form.Item label="备注" name="remark">
                <Input.TextArea rows={3} placeholder="可选" maxLength={255} />
              </Form.Item>

              <Space>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  创建裁床单
                </Button>
                <Button onClick={() => navigate('/piecework/cutting/list')}>取消</Button>
              </Space>
            </Form>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default CuttingCreatePage;
