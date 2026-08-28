import { useEffect } from 'react';
import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import type { CreateMaterialPayload, MaterialBasicType, MaterialItem, MaterialMinimumSpecification, MaterialUnit } from '../../types';
import ImageUploader from '../upload/ImageUploader';
import MaterialSpecificationEditor from './MaterialSpecificationEditor';

type MaterialFormValues = {
  sku?: string;
  name: string;
  unit: MaterialUnit;
  referencePrice?: number;
  width?: string;
  grammage?: string;
  tolerance?: string;
  colors?: string[];
  specifications?: string[];
  minimumSpecifications: MaterialMinimumSpecification[];
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

const units: MaterialUnit[] = ['kg', '公斤', '斤', '米', '件', '个', '码', '张', '套', '条'];

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
  const isAccessory = materialType === 'accessory';

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        sku: initialValues?.sku,
        name: initialValues?.name ?? '',
        unit: initialValues?.unit ?? '米',
        referencePrice: initialValues?.referencePrice,
        width: initialValues?.width,
        grammage: initialValues?.grammage,
        tolerance: initialValues?.tolerance,
        colors: initialValues?.colors ?? [],
        specifications: initialValues?.specifications ?? [],
        minimumSpecifications: initialValues?.minimumSpecifications ?? [],
        remarks: initialValues?.remarks,
        imageUrl: initialValues?.imageUrl,
      });
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    if (!values.minimumSpecifications.length) {
      form.setFields([{ name: 'minimumSpecifications', errors: ['请至少维护一个最小规格'] }]);
      return;
    }
    const duplicateKeys = new Set<string>();
    for (const item of values.minimumSpecifications) {
      const key = [item.color, item.specification, item.width, item.grammage]
        .map((value) => value?.trim().toLocaleLowerCase() ?? '')
        .join('|');
      if (duplicateKeys.has(key)) {
        form.setFields([{ name: 'minimumSpecifications', errors: ['存在重复的最小规格，请合并或修改'] }]);
        return;
      }
      duplicateKeys.add(key);
    }
    const colors = Array.from(new Set(values.minimumSpecifications.map((item) => item.color?.trim()).filter((item): item is string => Boolean(item))));
    const specifications = Array.from(new Set(values.minimumSpecifications.map((item) => item.specification?.trim()).filter((item): item is string => Boolean(item))));
    const firstSpecification = values.minimumSpecifications[0];
    onSubmit({
      ...values,
      width: isAccessory ? undefined : firstSpecification.width,
      grammage: isAccessory ? undefined : firstSpecification.grammage,
      tolerance: isAccessory ? undefined : values.tolerance,
      colors,
      specifications: isAccessory ? specifications : [],
      minimumSpecifications: values.minimumSpecifications,
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
      destroyOnHidden
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
            <Form.Item label="参考单价" name="referencePrice">
              <InputNumber
                min={0}
                precision={2}
                prefix="¥"
                style={{ width: '100%' }}
                placeholder="请输入参考单价"
              />
            </Form.Item>
          </Col>
        </Row>
        {!isAccessory ? (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="空差" name="tolerance" normalize={formatToleranceValue}>
                <Input placeholder="如 ±2cm" />
              </Form.Item>
            </Col>
          </Row>
        ) : null}
        <Form.Item label="最小规格" name="minimumSpecifications" required>
          <MaterialSpecificationEditor materialType={materialType} />
        </Form.Item>
        <Form.Item label="备注" name="remarks">
          <Input.TextArea rows={4} placeholder="请输入备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MaterialFormModal;
