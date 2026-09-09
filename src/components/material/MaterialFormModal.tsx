import { useEffect } from 'react';
import { Alert, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import type {
  CreateMaterialPayload,
  MaterialBasicType,
  MaterialItem,
  MaterialMinimumSpecification,
  MaterialSpecificationRecoveryPreview,
  MaterialUnit,
} from '../../types';
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
  recoveryLoading?: boolean;
  recoveryPreview?: MaterialSpecificationRecoveryPreview;
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

const specificationIdentity = (item: Pick<MaterialMinimumSpecification, 'color' | 'specification'>) =>
  [item.color, item.specification]
    .map((value) => value?.trim().toLocaleLowerCase() ?? '')
    .join('|');

const buildRecoverySpecifications = (
  initialValues?: Partial<MaterialItem>,
  recoveryPreview?: MaterialSpecificationRecoveryPreview,
): MaterialMinimumSpecification[] => {
  const current = (initialValues?.minimumSpecifications ?? []).map((item) => ({ ...item }));
  if (!initialValues?.legacyUnmappedDimensions) {
    return current;
  }
  const suggestions: MaterialSpecificationRecoveryPreview['suggestions'] = recoveryPreview?.suggestions ?? (initialValues.colors ?? []).flatMap((color) =>
    (initialValues.specifications ?? []).map((specification) => ({
      color,
      specification,
      selected: false,
      basis: 'original-data' as const,
      evidenceCount: 0,
    })));
  suggestions.forEach((suggestion) => {
    const index = current.findIndex((item) => (
      suggestion.minimumSpecificationId
        ? item.id === suggestion.minimumSpecificationId
        : specificationIdentity(item) === specificationIdentity(suggestion)
    ));
    const recoveryFields = {
      recoveryCandidate: true,
      recoveryBasis: suggestion.basis,
      recoveryEvidenceCount: suggestion.evidenceCount,
    };
    if (index >= 0) {
      current[index] = {
        ...current[index],
        ...recoveryFields,
        active: suggestion.selected,
      };
      return;
    }
    current.push({
      id: suggestion.minimumSpecificationId,
      color: suggestion.color,
      specification: suggestion.specification,
      label: [suggestion.color, suggestion.specification].filter(Boolean).join(' · '),
      active: suggestion.selected,
      ...recoveryFields,
    });
  });
  return current;
};

const MaterialFormModal = ({
  open,
  loading,
  title,
  materialType,
  initialValues,
  recoveryLoading,
  recoveryPreview,
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
        colors: recoveryPreview?.originalColors ?? initialValues?.colors ?? [],
        specifications: recoveryPreview?.originalSpecifications ?? initialValues?.specifications ?? [],
        minimumSpecifications: buildRecoverySpecifications(initialValues, recoveryPreview),
        remarks: initialValues?.remarks,
        imageUrl: initialValues?.imageUrl,
      });
    }
  }, [open, initialValues, recoveryPreview, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const minimumSpecifications = values.minimumSpecifications.filter(
      (item) => !(item.recoveryCandidate && !item.active && !item.id),
    );
    const formalSpecifications = minimumSpecifications.filter((item) => !item.legacyDefault);
    const activeFormalSpecifications = formalSpecifications.filter((item) => item.active);
    if (!activeFormalSpecifications.length) {
      form.setFields([{ name: 'minimumSpecifications', errors: ['请至少采用一个颜色与规格组合'] }]);
      return;
    }
    const duplicateKeys = new Set<string>();
    for (const item of formalSpecifications) {
      const key = [item.color, item.specification, item.width, item.grammage]
        .map((value) => value?.trim().toLocaleLowerCase() ?? '')
        .join('|');
      if (duplicateKeys.has(key)) {
        form.setFields([{ name: 'minimumSpecifications', errors: ['存在重复的最小规格，请合并或修改'] }]);
        return;
      }
      duplicateKeys.add(key);
    }
    const specificationColors = formalSpecifications.map((item) => item.color?.trim()).filter((item): item is string => Boolean(item));
    const specificationValues = formalSpecifications.map((item) => item.specification?.trim()).filter((item): item is string => Boolean(item));
    const colors = Array.from(new Set(initialValues?.legacyUnmappedDimensions ? [...(values.colors ?? []), ...specificationColors] : specificationColors));
    const specifications = Array.from(new Set(initialValues?.legacyUnmappedDimensions ? [...(values.specifications ?? []), ...specificationValues] : specificationValues));
    const firstSpecification = activeFormalSpecifications[0];
    onSubmit({
      ...values,
      width: isAccessory ? undefined : firstSpecification.width,
      grammage: isAccessory ? undefined : firstSpecification.grammage,
      tolerance: isAccessory ? undefined : values.tolerance,
      colors,
      specifications: isAccessory ? specifications : [],
      minimumSpecifications,
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
      width={900}
      destroyOnHidden
      className="material-form-modal"
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
        {initialValues?.legacyUnmappedDimensions ? (
          <>
            <Alert
              type="info"
              showIcon
              message="原有资料已自动带入，无需重新填写"
              description="历史单据中能确定的组合已自动采用；其余可能组合已预填，请只需勾选实际使用的组合。暂时无法判断的历史数量会原样保留。"
              style={{ marginBottom: 16 }}
            />
            <Form.Item name="colors" hidden>
              <Select mode="multiple" />
            </Form.Item>
            <Form.Item name="specifications" hidden>
              <Select mode="multiple" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Typography.Text type="secondary">原有颜色</Typography.Text>
                <Space size={[4, 4]} wrap style={{ display: 'flex', marginTop: 8, marginBottom: 16 }}>
                  {(recoveryPreview?.originalColors ?? initialValues.colors ?? []).map((color) => (
                    <Tag key={color}>{color}</Tag>
                  ))}
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Typography.Text type="secondary">原有规格</Typography.Text>
                <Space size={[4, 4]} wrap style={{ display: 'flex', marginTop: 8, marginBottom: 16 }}>
                  {(recoveryPreview?.originalSpecifications ?? initialValues.specifications ?? []).map((specification) => (
                    <Tag key={specification}>{specification}</Tag>
                  ))}
                </Space>
              </Col>
            </Row>
          </>
        ) : null}
        <Spin spinning={recoveryLoading === true} tip="正在整理原有组合">
          <Form.Item label="颜色与规格组合" name="minimumSpecifications" required>
            <MaterialSpecificationEditor materialType={materialType} />
          </Form.Item>
        </Spin>
        <Form.Item label="备注" name="remarks">
          <Input.TextArea rows={4} placeholder="请输入备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MaterialFormModal;
