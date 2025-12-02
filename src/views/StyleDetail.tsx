import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
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
import DraggableOperationTable, { type TemplateOperationItem } from '../components/DraggableOperationTable';
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
  localId: string;
  processCatalogId?: string;
  unitPrice?: number;
  remarks?: string;
  sourceTemplateId?: string;
  sequence?: number;
};

type OperationModalFormValues = Pick<StyleProcessFormValue, 'processCatalogId' | 'unitPrice' | 'remarks'>;

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

const generateOperationLocalId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `style-operation-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildInitialOperations = (detail?: StyleDetailData): StyleProcessFormValue[] => {
  if (!detail?.processes?.length) {
    return [];
  }
  return [...detail.processes]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((process) => ({
      id: process.id,
      localId: process.id ?? generateOperationLocalId(),
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
  const [operationModalState, setOperationModalState] = useState<{ open: boolean; editingId?: string }>({
    open: false,
    editingId: undefined,
  });
  const [operationForm] = Form.useForm<OperationModalFormValues>();
  const [operationValues, setOperationValues] = useState<StyleProcessFormValue[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const initializingRef = useRef(false);

  const syncOperations = useCallback(
    (
      next: StyleProcessFormValue[],
      options?: { markDirty?: boolean; targetForm?: FormInstance<StyleFormValues> },
    ) => {
      const { markDirty = true, targetForm } = options ?? {};
      setOperationValues(next);
      (targetForm ?? form).setFieldsValue({ operations: next });
      if (markDirty && !initializingRef.current) {
        setIsDirty(true);
      }
    },
    [form],
  );

  const watchedColors = Form.useWatch('colors', form);
  const normalizedColors = useMemo(() => watchedColors ?? [], [watchedColors]);
  const colorImagesEnabled = Form.useWatch('colorImagesEnabled', form);
  const processOptionMap = useMemo(() => new Map(processOptions.map((option) => [option.id, option])), [processOptions]);
  const operationItems = useMemo<TemplateOperationItem[]>(() => {
    return operationValues.map((operation, index) => {
      const option = operation.processCatalogId ? processOptionMap.get(operation.processCatalogId) : undefined;
      return {
        id: operation.localId,
        processCatalogId: operation.processCatalogId,
        processName: option?.name ?? (operation.processCatalogId ? '未知工序' : '未选择工序'),
        processCode: option?.code,
        unitPrice: operation.unitPrice,
        remarks: operation.remarks,
        sortOrder: index + 1,
        sequenceNo: index + 1,
        sourceTemplateId: operation.sourceTemplateId,
      };
    });
  }, [operationValues, processOptionMap]);

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
      initializingRef.current = true;
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
        const initialValues = buildInitialValues(detailPayload);
        formRef.setFieldsValue(initialValues);
        syncOperations(initialValues.operations ?? [], { markDirty: false, targetForm: formRef });
        setIsDirty(false);
      } catch (error) {
        console.error('加载款式资料失败', error);
        message.error('加载款式资料失败，请稍后重试');
      } finally {
        setLoading(false);
        initializingRef.current = false;
      }
    },
    [styleId, ensureProcessOptionsFromDetail, syncOperations],
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
          localId: generateOperationLocalId(),
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
        const next = mode === 'replace' ? mapped : [...operationValues, ...mapped];
        syncOperations(next);
        closeTemplateModal();
        message.success(mode === 'replace' ? '已覆盖当前工序' : '已追加模板工序');
      },
      [closeTemplateModal, ensureProcessOptionsFromTemplates, operationValues, syncOperations],
    );

    const handleOperationsChange = useCallback(
      (items: TemplateOperationItem[]) => {
        const currentMap = new Map<string, StyleProcessFormValue>(operationValues.map((operation) => [operation.localId, operation]));
      const next = items.map((item, index) => {
        const existing = currentMap.get(item.id);
        return {
          ...(existing ?? { localId: item.id }),
          processCatalogId: item.processCatalogId,
          unitPrice: item.unitPrice,
          remarks: item.remarks,
          sourceTemplateId: existing?.sourceTemplateId,
          sequence: index + 1,
        };
      });
      syncOperations(next);
    },
    [operationValues, syncOperations],
  );

  const handleOperationDelete = useCallback(
    (id: string) => {
      const next = operationValues.filter((operation) => operation.localId !== id);
      syncOperations(next);
    },
    [operationValues, syncOperations],
  );

  const handleOperationAdd = useCallback(() => {
    setOperationModalState({ open: true, editingId: undefined });
    operationForm.resetFields();
  }, [operationForm]);

  const handleOperationEdit = useCallback(
    (operation: TemplateOperationItem) => {
      setOperationModalState({ open: true, editingId: operation.id });
      operationForm.setFieldsValue({
        processCatalogId: operation.processCatalogId,
        unitPrice: operation.unitPrice,
        remarks: operation.remarks,
      });
    },
    [operationForm],
  );

  const closeOperationModal = useCallback(() => {
    setOperationModalState({ open: false, editingId: undefined });
    operationForm.resetFields();
  }, [operationForm]);

  const editingOperationId = operationModalState.editingId;

  const handleOperationSubmit = useCallback(async () => {
    try {
      const values = await operationForm.validateFields();
      const current = operationValues;
      if (editingOperationId) {
        const next = current.map((operation) =>
          operation.localId === editingOperationId
            ? {
                ...operation,
                ...values,
              }
            : operation,
        );
        syncOperations(next);
        message.success('工序已更新');
      } else {
        const next = [
          ...current,
          {
            localId: generateOperationLocalId(),
            ...values,
          },
        ];
        syncOperations(next);
        message.success('已添加工序');
      }
      closeOperationModal();
    } catch {
      // ignore validation errors
    }
  }, [closeOperationModal, editingOperationId, operationForm, operationValues, syncOperations]);

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
      const currentOperations = (form.getFieldValue('operations') ?? operationValues ?? []) as StyleProcessFormValue[];
      const normalizedOperations = currentOperations
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
  }, [colorImages, form, isEditing, load, operationValues, setIsDirty, styleId]);

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

        <Form form={form} layout="vertical" className="style-detail-form" onValuesChange={handleValuesChange}>
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

          <Card title="款式工序" bordered={false} className="style-detail-card">
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 500 }}>工序列表</span>
              <Space size={4}>
                <Button type="link" icon={<PlusOutlined />} onClick={handleOperationAdd}>
                  添加工序
                </Button>
                <Button type="link" icon={<ApartmentOutlined />} onClick={openTemplateModal}>
                  引用工序模板
                </Button>
              </Space>
            </div>
            <DraggableOperationTable
              operations={operationItems}
              onOperationsChange={handleOperationsChange}
              onEditOperation={handleOperationEdit}
              onDeleteOperation={handleOperationDelete}
            />
          </Card>

        </Form>

        <Modal
          title={editingOperationId ? '编辑工序' : '添加工序'}
          open={operationModalState.open}
          onOk={handleOperationSubmit}
          onCancel={closeOperationModal}
          destroyOnClose
        >
          <Form form={operationForm} layout="vertical">
            <Form.Item
              name="processCatalogId"
              label="工序"
              rules={[{ required: true, message: '请选择工序' }]}
            >
              <Select
                showSearch
                placeholder="选择工序"
                options={processSelectOptions}
                loading={processLoading}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="unitPrice" label="工价（元）">
              <InputNumber
                min={0}
                precision={2}
                step={0.01}
                style={{ width: '100%' }}
                prefix="¥"
                placeholder="0.00"
              />
            </Form.Item>
            <Form.Item name="remarks" label="备注">
              <Input placeholder="可选" maxLength={200} />
            </Form.Item>
          </Form>
        </Modal>

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
