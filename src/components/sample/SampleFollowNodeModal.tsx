import React, { useEffect } from 'react';
import { DatePicker, Form, Input, Modal, Switch, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { SampleFollowProgressNode } from '../../types/sample';

const { Text } = Typography;

export type FollowNodePayload = {
  completed: boolean;
  statusValue?: string;
};

type FollowNodeFormValues = {
  completed: boolean;
  textValue?: string;
  booleanValue?: boolean;
  dateValue?: Dayjs;
};

interface SampleFollowNodeModalProps {
  open: boolean;
  node?: SampleFollowProgressNode;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: FollowNodePayload) => Promise<void>;
}

const normalizeBoolean = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'y', '是'].includes(normalized);
};

const parseDateValue = (value?: string | null): Dayjs | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : undefined;
};

const SampleFollowNodeModal: React.FC<SampleFollowNodeModalProps> = ({
  open,
  node,
  loading,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm<FollowNodeFormValues>();

  useEffect(() => {
    if (!node) {
      form.resetFields();
      return;
    }
    const fieldType = (node.fieldType || 'text').toLowerCase();
    form.setFieldsValue({
      completed: node.completed,
      textValue: fieldType === 'text' ? (node.statusValue && node.statusValue !== '--' ? node.statusValue : undefined) : undefined,
      booleanValue: fieldType === 'boolean' ? normalizeBoolean(node.statusValue) : undefined,
      dateValue: fieldType === 'date' ? parseDateValue(node.statusValue) : undefined,
    });
  }, [form, node]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const fieldType = (node?.fieldType || 'text').toLowerCase();
      let statusValue: string | undefined;
      if (fieldType === 'boolean') {
        statusValue = String(Boolean(values.booleanValue));
      } else if (fieldType === 'date') {
        statusValue = values.dateValue ? values.dateValue.format('YYYY-MM-DD') : undefined;
      } else {
        statusValue = values.textValue?.trim();
      }
      await onSubmit({
        completed: Boolean(values.completed),
        statusValue,
      });
    } catch (error) {
      console.error('Failed to submit follow node form', error);
    }
  };

  const renderField = () => {
    const fieldType = (node?.fieldType || 'text').toLowerCase();
    if (fieldType === 'boolean') {
      return (
        <Form.Item
          label="节点状态值"
          name="booleanValue"
          valuePropName="checked"
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      );
    }
    if (fieldType === 'date') {
      return (
        <Form.Item label="节点日期" name="dateValue">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      );
    }
    return (
      <Form.Item label="状态说明" name="textValue">
        <Input placeholder="请输入状态描述" />
      </Form.Item>
    );
  };

  return (
    <Modal
      open={open}
      title="编辑节点状态"
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnClose
    >
      {node ? (
        <Form form={form} layout="vertical">
          <Form.Item label="节点名称">
            <Text>{node.nodeName}</Text>
          </Form.Item>
          <Form.Item label="节点完成" name="completed" valuePropName="checked">
            <Switch checkedChildren="完成" unCheckedChildren="待处理" />
          </Form.Item>
          {renderField()}
        </Form>
      ) : (
        <Text type="secondary">请选择要编辑的节点</Text>
      )}
    </Modal>
  );
};

export default SampleFollowNodeModal;
