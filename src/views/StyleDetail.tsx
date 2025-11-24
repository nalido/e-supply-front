import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styleDetailApi from '../api/style-detail';
import operationTemplateApi from '../api/operation-template';
import processTypeApi from '../api/process-type';
import type {
  StyleColorImageMap,
  StyleDetailData,
  StyleDetailSavePayload,
  StyleFormMeta,
  StyleProcessItem,
} from '../types/style';
import type { OperationTemplate } from '../types/operation-template';
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
  operations: StyleProcessFormValue[];
};

type StyleProcessFormValue = {
  id?: string;
  processCatalogId?: string;
  unitPrice?: number;
  remarks?: string;
  sourceTemplateId?: string;
  sequence?: number;
};

type ProcessOption = {
  id: string;
  name: string;
  code?: string;
};

type TemplateModalState = {
  open: boolean;
  loading: boolean;
  templates: OperationTemplate[];
};

const buildInitialOperations = (detail?: StyleDetailData): StyleProcessFormValue[] => {
  if (!detail?.processes?.length) {
    return [{ processCatalogId: undefined, unitPrice: undefined, remarks: undefined }];
  }
  return detail.processes.map((process) => ({
    id: process.id,
    processCatalogId: process.processCatalogId,
    unitPrice: process.unitPrice,
    remarks: process.remarks,
    sourceTemplateId: process.sourceTemplateId,
    sequence: process.sequence,
  }));
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
  operations: buildInitialOperations(detail),
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
  const [processOptions, setProcessOptions] = useState<ProcessOption[]>([]);
  const [processLoading, setProcessLoading] = useState(false);
  const [templateModal, setTemplateModal] = useState<TemplateModalState>({
    open: false,
    loading: false,
    templates: [],
  });

  const watchedColors = Form.useWatch('colors', form);
  const normalizedColors = useMemo(() => watchedColors ?? [], [watchedColors]);
  const colorImagesEnabled = Form.useWatch('colorImagesEnabled', form);

  const mergeProcessOptions = useCallback((options: ProcessOption[]) => {
    if (!options.length) {
      return;
    }
    setProcessOptions((prev) => {
      const map = new Map(prev.map((option) => [option.id, option]));
      let changed = false;
      options.forEach((option) => {
        if (!option.id) {
          return;
        }
        const existing = map.get(option.id);
        if (!existing || existing.name !== option.name || existing.code !== option.code) {
          map.set(option.id, option);
          changed = true;
        }
      });
      return changed ? Array.from(map.values()) : prev;
    });
  }, []);

  const ensureProcessOptionsFromDetail = useCallback(
    (processes?: StyleProcessItem[]) => {
      if (!processes?.length) {
        return;
      }
      const detailOptions: ProcessOption[] = processes
        .filter((process) => Boolean(process.processCatalogId))
        .map((process) => ({
          id: process.processCatalogId!,
          name: process.processName ?? '未命名工序',
          code: process.processCode,
        }));
      mergeProcessOptions(detailOptions);
    },
    [mergeProcessOptions],
  );

  const ensureProcessOptionsFromTemplates = useCallback(
    (templates: OperationTemplate[]) => {
      if (!templates.length) {
        return;
      }
      const templateOptions: ProcessOption[] = templates
        .flatMap((template) => template.operations ?? [])
        .map((operation) => operation.processCatalog)
        .filter((catalog): catalog is NonNullable<typeof catalog> => Boolean(catalog))
        .map((catalog) => ({
          id: catalog.id,
          name: catalog.name ?? '未命名工序',
          code: catalog.code,
        }));
      mergeProcessOptions(templateOptions);
    },
    [mergeProcessOptions],
  );

  const loadProcessOptions = useCallback(async () => {
    setProcessLoading(true);
    try {
      const response = await processTypeApi.hot();
      mergeProcessOptions(response.map((item) => ({ id: item.id, name: item.name, code: item.code })));
    } catch (error) {
      console.error('加载工序选项失败', error);
      message.error('获取工序列表失败');
    } finally {
      setProcessLoading(false);
    }
  }, [mergeProcessOptions]);

  const load = useCallback(
    async (formRef: FormInstance<StyleFormValues>) => {
      setLoading(true);
      try {
        const metaPayload = await styleDetailApi.fetchMeta();
        setMeta(metaPayload);
        let detailPayload: StyleDetailData | undefined;
        if (styleId) {
          detailPayload = await styleDetailApi.fetchDetail(styleId);
          setDetail(detailPayload);
          setColorImages(detailPayload.colorImages ?? {});
          ensureProcessOptionsFromDetail(detailPayload.processes);
        } else {
          setColorImages({});
          ensureProcessOptionsFromDetail([]);
        }
        formRef.setFieldsValue(buildInitialValues(detailPayload));
      } catch (error) {
        console.error('加载款式资料失败', error);
        message.error('加载款式资料失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [styleId, ensureProcessOptionsFromDetail],
  );

  useEffect(() => {
    load(form);
  }, [form, load]);

  useEffect(() => {
    loadProcessOptions();
  }, [loadProcessOptions]);

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

  const openTemplateModal = useCallback(async () => {
    setTemplateModal((prev) => ({ ...prev, open: true, loading: true }));
    try {
      const response = await operationTemplateApi.list({ page: 1, pageSize: 50 });
      setTemplateModal({ open: true, loading: false, templates: response.list });
      ensureProcessOptionsFromTemplates(response.list);
    } catch (error) {
      console.error('加载工序模板失败', error);
      message.error('加载工序模板失败');
      setTemplateModal((prev) => ({ ...prev, loading: false }));
    }
  }, [ensureProcessOptionsFromTemplates]);

  const closeTemplateModal = useCallback(() => {
    setTemplateModal((prev) => ({ ...prev, open: false }));
  }, []);

  const handleTemplateApply = useCallback(
    (template: OperationTemplate, mode: 'append' | 'replace') => {
      const mapped = (template.operations ?? [])
        .filter((operation) => operation.processCatalog?.id)
        .map((operation) => ({
          processCatalogId: operation.processCatalog!.id,
          unitPrice: operation.unitPrice,
          remarks: operation.remarks,
          sourceTemplateId: template.id,
        }));
      if (!mapped.length) {
        message.warning('该模板没有可用的工序');
        return;
      }
      ensureProcessOptionsFromTemplates([template]);
      const current = form.getFieldValue('operations') ?? [];
      const next = mode === 'replace' ? mapped : [...current, ...mapped];
      form.setFieldsValue({ operations: next });
      closeTemplateModal();
      message.success(mode === 'replace' ? '已覆盖当前工序' : '已追加模板工序');
    },
    [closeTemplateModal, ensureProcessOptionsFromTemplates, form],
  );

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
      const normalizedOperations = (values.operations ?? [])
        .map((operation, index) => ({
          processCatalogId: operation?.processCatalogId,
          unitPrice:
            typeof operation?.unitPrice === 'number' && Number.isFinite(operation.unitPrice)
              ? Number(operation.unitPrice)
              : undefined,
          remarks: operation?.remarks,
          sequence: index + 1,
          sourceTemplateId: operation?.sourceTemplateId,
        }))
        .filter((operation) => operation.processCatalogId);
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
        colorImages: values.colorImagesEnabled ? colorImages : {},
        processes: normalizedOperations,
      };
      if (isEditing && styleId) {
        await styleDetailApi.update(styleId, payload);
        message.success('款式资料已更新');
      } else {
        await styleDetailApi.create(payload);
        message.success('款式资料已创建');
      }
      navigate('/basic/styles');
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) {
        return;
      }
      console.error('保存款式资料失败', error);
      message.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [colorImages, form, isEditing, navigate, styleId]);

  const designerOptions = useMemo(() => meta?.designers ?? [], [meta]);
  const processSelectOptions = useMemo(
    () =>
      processOptions.map((option) => ({
        label: option.code ? `${option.name}（${option.code}）` : option.name,
        value: option.id,
      })),
    [processOptions],
  );

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

        <Form form={form} layout="vertical" className="style-detail-form">
          <Card bordered={false} className="style-detail-card style-detail-overview-card">
            <div className="style-detail-overview">
              <div className="style-detail-gallery">
                <div className="style-detail-gallery-title">款式主图</div>
                <Form.Item name="coverImageUrl" valuePropName="value" className="style-detail-cover-item">
                  <ImageUploader module="styles" tips="建议尺寸 800x800px，JPG/PNG" />
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

          <Card
            title="款式工序"
            bordered={false}
            className="style-detail-card"
            extra={
              <Space>
                <Button icon={<ApartmentOutlined />} onClick={openTemplateModal}>
                  引用工序模板
                </Button>
              </Space>
            }
          >
            <Form.List name="operations">
              {(fields, { add, remove, move }) => (
                <div className="style-process-list">
                  {fields.length === 0 ? (
                    <Text type="secondary">暂无工序，请点击下方按钮添加。</Text>
                  ) : null}
                  {fields.map((field, index) => (
                    <div key={field.key} className="style-process-row">
                      <div className="style-process-index">{index + 1}</div>
                      <div className="style-process-form">
                        <Form.Item
                          name={[field.name, 'processCatalogId']}
                          label="工序"
                          rules={[{ required: true, message: '请选择工序' }]}
                        >
                          <Select
                            placeholder="选择工序"
                            showSearch
                            loading={processLoading}
                            options={processSelectOptions}
                            filterOption={(input, option) =>
                              typeof option?.label === 'string'
                                ? option.label.toLowerCase().includes(input.toLowerCase())
                                : false
                            }
                          />
                        </Form.Item>
                        <Form.Item name={[field.name, 'unitPrice']} label="单价" className="style-process-price-item">
                          <InputNumber
                            min={0}
                            step={0.01}
                            style={{ width: '100%' }}
                            prefix="¥"
                            placeholder="0.00"
                          />
                        </Form.Item>
                        <Form.Item name={[field.name, 'remarks']} label="备注">
                          <Input placeholder="备注信息" maxLength={200} />
                        </Form.Item>
                      </div>
                      <div className="style-process-actions">
                        <Tooltip title="上移">
                          <Button
                            icon={<ArrowUpOutlined />}
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                          />
                        </Tooltip>
                        <Tooltip title="下移">
                          <Button
                            icon={<ArrowDownOutlined />}
                            disabled={index === fields.length - 1}
                            onClick={() => move(index, index + 1)}
                          />
                        </Tooltip>
                        <Tooltip title="删除">
                          <Button
                            icon={<DeleteOutlined />}
                            danger
                            onClick={() => remove(field.name)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({})}>
                    添加工序
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>

        </Form>

        <Modal
          open={templateModal.open}
          onCancel={closeTemplateModal}
          title="引用工序模板"
          footer={null}
          width={720}
          destroyOnClose
        >
          <List
            dataSource={templateModal.templates}
            loading={templateModal.loading}
            locale={{ emptyText: templateModal.loading ? '加载中...' : '暂无模板' }}
            renderItem={(template) => (
              <List.Item
                key={template.id}
                actions={[
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    onClick={() => handleTemplateApply(template, 'append')}
                  >
                    追加
                  </Button>,
                  <Button type="link" danger onClick={() => handleTemplateApply(template, 'replace')}>
                    覆盖当前
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{template.name}</span>
                      {template.defaultTemplate ? <Tag color="blue">默认</Tag> : null}
                    </Space>
                  }
                  description={template.updatedAt ? `最近更新：${template.updatedAt}` : undefined}
                />
                <div className="style-process-template-operations">
                  {(template.operations ?? []).map((operation) => (
                    <Tag key={operation.id ?? `${template.id}-${operation.processCatalog?.id}`} color="processing">
                      {operation.processCatalog?.name ?? '未知工序'}
                    </Tag>
                  ))}
                </div>
              </List.Item>
            )}
          />
        </Modal>

        <div className="style-detail-footer">
          <Space>
            <Button onClick={() => navigate('/basic/styles')}>返回列表</Button>
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
