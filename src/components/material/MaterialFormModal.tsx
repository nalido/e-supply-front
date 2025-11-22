import { useEffect, useMemo, useState } from 'react';
import { Col, Form, Input, InputNumber, Modal, Row, Select, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { UploadProps } from 'antd/es/upload';
import { PlusOutlined } from '@ant-design/icons';
import ColorTagsInput from './ColorTagsInput';
import type { CreateMaterialPayload, MaterialBasicType, MaterialItem, MaterialUnit } from '../../types';

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

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

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
  const [fileList, setFileList] = useState<UploadFile[]>([]);

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
      if (initialValues?.imageUrl) {
        setFileList([
          {
            uid: '-1',
            name: 'material-image',
            status: 'done',
            url: initialValues.imageUrl,
          },
        ]);
      } else {
        setFileList([]);
      }
    }
  }, [open, initialValues, form]);

  const uploadProps = useMemo<UploadProps>(() => ({
    listType: 'picture-card',
    maxCount: 1,
    fileList,
    accept: 'image/*',
    beforeUpload: async (file) => {
      const base64 = await fileToBase64(file);
      form.setFieldsValue({ imageUrl: base64 });
      setFileList([
        {
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: base64,
        },
      ]);
      return false;
    },
    onRemove: () => {
      form.setFieldsValue({ imageUrl: undefined });
      setFileList([]);
    },
    onPreview: async (file) => {
      const src = file.url ?? (file.originFileObj ? await fileToBase64(file.originFileObj as File) : '');
      if (src) {
        const image = new Image();
        image.src = src;
        const newWindow = window.open(src);
        if (newWindow) {
          newWindow.document.write(image.outerHTML);
        }
      }
    },
  }), [fileList, form]);

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
        <Form.Item name="imageUrl" hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item name="sku" hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item label="物料图片">
          <Upload {...uploadProps}>
            {fileList.length >= 1 ? null : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传</div>
              </div>
            )}
          </Upload>
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
            <Form.Item label="空差" name="tolerance">
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
