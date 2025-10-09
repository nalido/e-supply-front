import { useEffect, useMemo, useState } from 'react';
import {
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  TreeSelect,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type { UploadProps } from 'antd/es/upload';
import { PlusOutlined } from '@ant-design/icons';
import ColorTagsInput from './ColorTagsInput';
import type { CreateMaterialPayload, MaterialCategory, MaterialUnit } from '../../types';

type MaterialFormValues = {
  name: string;
  categoryValue: string;
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
  initialValues?: Partial<CreateMaterialPayload> & {
    category?: MaterialCategory;
    categoryPath?: string[];
  };
  onSubmit: (values: CreateMaterialPayload & { categoryPath?: string[] }) => void;
  onCancel: () => void;
};

const categoryTree = [
  {
    title: '面料',
    value: 'fabric|面料',
    selectable: false,
    children: [
      {
        title: '针织面料',
        value: 'fabric|面料/针织面料',
        selectable: false,
        children: [
          { title: '罗纹', value: 'fabric|面料/针织面料/罗纹' },
          { title: '卫衣布', value: 'fabric|面料/针织面料/卫衣布' },
          { title: '汗布', value: 'fabric|面料/针织面料/汗布' },
        ],
      },
      {
        title: '梭织面料',
        value: 'fabric|面料/梭织面料',
        selectable: false,
        children: [
          { title: '牛仔', value: 'fabric|面料/梭织面料/牛仔' },
          { title: '棉布', value: 'fabric|面料/梭织面料/棉布' },
          { title: '府绸', value: 'fabric|面料/梭织面料/府绸' },
        ],
      },
      {
        title: '功能面料',
        value: 'fabric|面料/功能面料',
        selectable: false,
        children: [
          { title: '防绒面料', value: 'fabric|面料/功能面料/防绒面料' },
          { title: '胆布', value: 'fabric|面料/功能面料/胆布' },
          { title: '涂层面料', value: 'fabric|面料/功能面料/涂层面料' },
        ],
      },
    ],
  },
  {
    title: '辅料/包材',
    value: 'accessory|辅料/包材',
    selectable: false,
    children: [
      {
        title: '拉链',
        value: 'accessory|辅料/包材/拉链',
      },
      {
        title: '扣子',
        value: 'accessory|辅料/包材/扣子',
      },
      {
        title: '里料',
        value: 'accessory|辅料/包材/里料',
      },
      {
        title: '线带绳',
        value: 'accessory|辅料/包材/线带绳',
      },
      {
        title: '包装材料',
        value: 'accessory|辅料/包材/包装材料',
      },
    ],
  },
];

const units: MaterialUnit[] = ['kg', '米', '件', '个', '码', '张', '套'];

const buildCategoryValue = (
  category: MaterialCategory = 'fabric',
  path?: string[],
): string => {
  const fallback = category === 'fabric' ? '面料' : '辅料/包材';
  const segments = path && path.length > 0 ? path : [fallback];
  return `${category}|${segments.join('/')}`;
};

const parseCategoryValue = (
  value: string,
): { category: MaterialCategory; categoryPath: string[] } => {
  const [categoryPart, pathPart] = value.split('|');
  const category = categoryPart === 'accessory' ? 'accessory' : 'fabric';
  const path = pathPart ? pathPart.split('/').filter(Boolean) : [];
  return { category, categoryPath: path };
};

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
  initialValues,
  onSubmit,
  onCancel,
}: MaterialFormModalProps) => {
  const [form] = Form.useForm<MaterialFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (open) {
      const categoryValue = buildCategoryValue(initialValues?.category, initialValues?.categoryPath);
      form.resetFields();
      form.setFieldsValue({
        name: initialValues?.name ?? '',
        categoryValue,
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
    const { categoryValue, colors, ...rest } = values;
    const { category, categoryPath } = parseCategoryValue(categoryValue);
    onSubmit({
      ...rest,
      category,
      categoryPath,
      colors: colors ?? [],
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
              label="物料分类"
              name="categoryValue"
              rules={[{ required: true, message: '请选择物料分类' }]}
            >
              <TreeSelect
                treeData={categoryTree}
                placeholder="请选择分类"
                treeDefaultExpandAll
                allowClear
              />
            </Form.Item>
          </Col>
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
