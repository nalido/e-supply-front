import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styleDetailApi from '../api/style-detail';
import type {
  StyleColorImageMap,
  StyleDetailData,
  StyleDetailSavePayload,
  StyleFormMeta,
} from '../types/style';
import ImageUploader from '../components/upload/ImageUploader';
import '../styles/style-detail.css';

const { Title, Text } = Typography;

type StyleFormValues = {
  styleNo: string;
  styleName: string;
  defaultUnit?: string;
  designerId?: string;
  remarks?: string;
  colors: string[];
  sizes: string[];
  status: 'active' | 'inactive';
  colorImagesEnabled: boolean;
  coverImageUrl?: string;
  sizeChartImageUrl?: string;
};

const buildInitialValues = (detail?: StyleDetailData): StyleFormValues => ({
  styleNo: detail?.styleNo ?? '',
  styleName: detail?.styleName ?? '',
  defaultUnit: detail?.defaultUnit,
  designerId: detail?.designerId,
  remarks: detail?.remarks,
  colors: detail?.colors ?? [],
  sizes: detail?.sizes ?? [],
  status: detail?.status ?? 'active',
  colorImagesEnabled: Boolean(detail?.colorImages && Object.values(detail.colorImages).some(Boolean)),
  coverImageUrl: detail?.coverImageUrl,
  sizeChartImageUrl: detail?.sizeChartImageUrl,
});

const StyleDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const styleId = searchParams.get('id') ?? undefined;
  const isEditing = Boolean(styleId);
  const [form] = Form.useForm<StyleFormValues>();
  const [meta, setMeta] = useState<StyleFormMeta>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorImages, setColorImages] = useState<StyleColorImageMap>({});
  const [detail, setDetail] = useState<StyleDetailData>();
  const [isDirty, setIsDirty] = useState(false);
  const initializingRef = useRef(false);

  const watchedColors = Form.useWatch('colors', form);
  const normalizedColors = useMemo(() => watchedColors ?? [], [watchedColors]);
  const colorImagesEnabled = Form.useWatch('colorImagesEnabled', form);

  const load = useCallback(
    async (formRef: FormInstance<StyleFormValues>) => {
      setLoading(true);
      initializingRef.current = true;
      try {
        const metaPayload = await styleDetailApi.fetchMeta();
        setMeta(metaPayload);
        let detailPayload: StyleDetailData | undefined;
        if (styleId) {
          detailPayload = await styleDetailApi.fetchDetail(styleId);
          setDetail(detailPayload);
          setColorImages(detailPayload.colorImages ?? {});
        } else {
          setColorImages({});
        }
        const initialValues = buildInitialValues(detailPayload);
        formRef.setFieldsValue(initialValues);
        setIsDirty(false);
      } catch (error) {
        console.error('加载款式资料失败', error);
        message.error('加载款式资料失败，请稍后重试');
      } finally {
        setLoading(false);
        initializingRef.current = false;
      }
    },
    [styleId],
  );

  useEffect(() => {
    load(form);
  }, [form, load]);

  useEffect(() => {
    setColorImages((prev) => {
      const next: StyleColorImageMap = {};
      normalizedColors.forEach((color) => {
        next[color] = prev[color];
      });
      return next;
    });
  }, [normalizedColors]);

  const handleColorImageChange = useCallback((color: string, value?: string) => {
    setColorImages((prev) => ({
      ...prev,
      [color]: value,
    }));
  }, []);

  const handleValuesChange = useCallback(() => {
    if (!initializingRef.current) {
      setIsDirty(true);
    }
  }, []);

  const handleBackClick = useCallback(() => {
    const goBack = () => navigate('/basic/styles');
    if (isDirty) {
      Modal.confirm({
        title: '尚未保存的修改',
        content: '离开前是否确认放弃当前修改？',
        okText: '仍然离开',
        cancelText: '继续编辑',
        onOk: goBack,
      });
    } else {
      goBack();
    }
  }, [isDirty, navigate]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!values.colors?.length) {
        message.warning('请至少输入一个颜色');
        return;
      }
      if (!values.sizes?.length) {
        message.warning('请至少输入一个尺码');
        return;
      }
      setSaving(true);
      const payload: StyleDetailSavePayload = {
        styleNo: values.styleNo.trim(),
        styleName: values.styleName.trim(),
        defaultUnit: values.defaultUnit,
        designerId: values.designerId,
        remarks: values.remarks,
        colors: values.colors,
        sizes: values.sizes,
        status: values.status,
        coverImageUrl: values.coverImageUrl,
        sizeChartImageUrl: values.sizeChartImageUrl,
        colorImages: values.colorImagesEnabled ? colorImages : {},
      };
      if (isEditing && styleId) {
        await styleDetailApi.update(styleId, payload);
        message.success('款式资料已更新');
        setIsDirty(false);
        load(form);
      } else {
        await styleDetailApi.create(payload);
        message.success('款式资料已创建');
        setIsDirty(false);
      }
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) {
        return;
      }
      console.error('保存款式资料失败', error);
      message.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [colorImages, form, isEditing, load, setIsDirty, styleId]);

  const designerOptions = useMemo(() => meta?.designers ?? [], [meta]);

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="style-detail-page">
        <div className="style-detail-header">
          <div>
            <Title level={3}>款式资料</Title>
            <Text type="secondary">基础资料 &gt; 款式资料</Text>
          </div>
          <Space>
            {detail?.styleNo && (
              <Text type="secondary">当前款号：{detail.styleNo}</Text>
            )}
          </Space>
        </div>

        <Form form={form} layout="vertical" className="style-detail-form" onValuesChange={handleValuesChange}>
          <Card variant="borderless" className="style-detail-card style-detail-overview-card">
            <div className="style-detail-overview">
              <div className="style-detail-gallery">
                <div className="style-detail-gallery-title">款式主图</div>
                <Form.Item name="coverImageUrl" valuePropName="value" className="style-detail-cover-item">
                  <ImageUploader module="styles" tips="建议尺寸 800x800px，JPG/PNG" />
                </Form.Item>
                <div className="style-detail-gallery-title">尺寸图</div>
                <Form.Item name="sizeChartImageUrl" valuePropName="value" className="style-detail-cover-item">
                  <ImageUploader module="styles" tips="建议尺寸 1200x800px，JPG/PNG" />
                </Form.Item>
              </div>
              <div className="style-detail-info">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="styleNo"
                      label="款号"
                      rules={[{ required: true, message: '请输入款号' }]}
                    >
                      <Input placeholder="例如 STY-2024-001" disabled={isEditing} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="styleName"
                      label="款名"
                      rules={[{ required: true, message: '请输入款式名称' }]}
                    >
                      <Input placeholder="请输入款式名称" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="designerId" label="设计师">
                      <Select placeholder="请选择设计师" allowClear>
                        {designerOptions.map((designer) => (
                          <Select.Option key={designer.id} value={designer.id}>
                            {designer.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="defaultUnit" label="单位">
                      <Select
                        placeholder="选择单位"
                        allowClear
                        options={meta?.units?.map((unit) => ({ label: unit, value: unit }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                      <Select>
                        <Select.Option value="active">启用</Select.Option>
                        <Select.Option value="inactive">停用</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item name="remarks" label="备注">
                      <Input.TextArea rows={3} placeholder="填写款式备注" maxLength={500} showCount allowClear />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} className="style-detail-info-row">
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="colors"
                      label="颜色"
                      rules={[{ required: true, message: '请输入至少一个颜色' }]}
                    >
                      <Select mode="tags" placeholder="输入颜色后按回车添加" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="sizes"
                      label="尺码"
                      rules={[{ required: true, message: '请输入至少一个尺码' }]}
                    >
                      <Select mode="tags" placeholder="输入尺码后按回车添加" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                </Row>
                <div className="style-detail-color-toggle">
                  <span className="style-detail-color-toggle-label">颜色图片</span>
                  <Form.Item name="colorImagesEnabled" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            </div>
            {colorImagesEnabled && normalizedColors.length > 0 && (
              <div className="style-detail-color-images">
                {normalizedColors.map((color) => (
                  <div key={color} className="style-detail-color-item">
                    <Text className="style-detail-color-label">{color}</Text>
                    <ImageUploader
                      module="styles"
                      value={colorImages[color]}
                      onChange={(value) => handleColorImageChange(color, value)}
                      tips="为该颜色上传一张展示图"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

        </Form>

        <div className="style-detail-footer">
          <Space>
            <Button onClick={handleBackClick}>返回列表</Button>
            <Button type="primary" loading={saving} onClick={handleSave} disabled={loading}>
              保存
            </Button>
          </Space>
        </div>
      </div>
    </Spin>
  );
};

export default StyleDetail;
