import { useEffect } from 'react';
import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import ColorTagsInput from './ColorTagsInput';
import type { CreateMaterialPayload, MaterialBasicType, MaterialItem, MaterialUnit } from '../../types';
import ImageUploader from '../upload/ImageUploader';

type MaterialFormValues = {
  sku?: string;
  name: string;
  unit: MaterialUnit;
  price?: number;
  width?: string;
  grammage?: string;
  tolerance?: string;
  colors?: string[];
  remarks?: string;
  imageUrl?: string;
};

type MaterialFormModalProps = {
  open: boolean;
  loading?: boolean;
  title: string;
  materialType: MaterialBasicType;
  initialValues?: Partial<MaterialItem>;
  onSubmit: (values: CreateMaterialPayload) => void;
  onCancel: () => void;
};

const units: MaterialUnit[] = ['kg', '米', '件', '个', '码', '张', '套'];

const formatToleranceValue = (value?: string) => {
  if (value === undefined || value === null) {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('±')) {
    return trimmed;
  }
  const withoutSign = trimmed.replace(/^[+-]/, '');
  return `±${withoutSign}`;
};

const MaterialFormModal = ({
  open,
  loading,
  title,
  materialType,
  initialValues,
  onSubmit,
  onCancel,
}: MaterialFormModalProps) => {
  const [form] = Form.useForm<MaterialFormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        sku: initialValues?.sku,
        name: initialValues?.name ?? '',
        unit: initialValues?.unit ?? '米',
        price: initialValues?.price,
        width: initialValues?.width,
        grammage: initialValues?.grammage,
        tolerance: initialValues?.tolerance,
        colors: initialValues?.colors ?? [],
        remarks: initialValues?.remarks,
        imageUrl: initialValues?.imageUrl,
      });
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      ...values,
      colors: values.colors ?? [],
      materialType,
    });
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={680}
      destroyOnClose
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item name="sku" hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item label="物料图片" name="imageUrl" valuePropName="value">
          <ImageUploader module="materials" tips="支持 JPG/PNG，大小不超过 5MB" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="物料名称"
              name="name"
              rules={[{ required: true, message: '请输入物料名称' }]}
            >
              <Input placeholder="请输入物料名称" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="用量单位"
              name="unit"
              rules={[{ required: true, message: '请选择用量单位' }]}
            >
              <Select options={units.map((unit) => ({ value: unit, label: unit }))} placeholder="请选择单位" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="单价" name="price">
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                addonBefore="¥"
                placeholder="请输入单价"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="幅宽" name="width">
              <Input placeholder="如 150cm" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="克重" name="grammage">
              <Input placeholder="如 180g/m²" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="空差" name="tolerance" normalize={formatToleranceValue}>
              <Input placeholder="如 ±2cm" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="颜色" name="colors">
          <ColorTagsInput />
        </Form.Item>
        <Form.Item label="备注" name="remarks">
          <Input.TextArea rows={4} placeholder="请输入备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MaterialFormModal;
