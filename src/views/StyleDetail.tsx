import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
  message,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import materialApi from '../api/material';
import styleBomApi, { buildStyleBomUpdatePayload } from '../api/style-bom';
import styleDetailApi from '../api/style-detail';
import ListImage from '../components/common/ListImage';
import ImageUploader from '../components/upload/ImageUploader';
import StyleCodeMatrixEditor from '../components/style/StyleCodeMatrixEditor';
import { NumberWithUnitInput, PageHeader, PageSection, SearchField } from '../components/page';
import type { MaterialBasicType, MaterialItem } from '../types/material';
import type {
  StyleBomMaterialDraft,
  StyleColorImageMap,
  StyleCodeVariantDraft,
  StyleDetailData,
  StyleDetailSavePayload,
  StyleFormMeta,
} from '../types/style';
import '../styles/style-detail.css';
import '../styles/sample-order-form.css';

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

type MaterialPickerState = {
  open: boolean;
  loading: boolean;
  keyword: string;
  page: number;
  pageSize: number;
  total: number;
  materialType: MaterialBasicType;
  list: MaterialItem[];
};

const buildDefaultCode = (...parts: Array<string | undefined>) => {
  const normalized = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .map((part) => part.replace(/\s+/g, '-'));
  return normalized.length ? normalized.join('-') : undefined;
};

const normalizeOptionalText = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const buildVariantKey = (color?: string, size?: string) => `${color ?? ''}|${size ?? ''}`;

const buildDraftCodeValue = (
  sourceType: StyleCodeVariantDraft['sourceType'],
  actualValue?: string,
) => (sourceType === 'SYSTEM_DERIVED' ? undefined : actualValue);

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

const createUid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toBomDraft = (item: MaterialItem): StyleBomMaterialDraft => ({
  uid: `bom-${createUid()}`,
  materialId: item.id,
  materialType: item.materialType,
  name: item.name,
  sku: item.sku,
  unit: item.unit,
  imageUrl: item.imageUrl,
  consumption: 1,
  lossRate: 0,
  unitPrice: item.referencePrice,
  remark: '',
});

const toBomDrafts = (items: StyleDetailData['materials'] = []): StyleBomMaterialDraft[] =>
  items.map((item, index) => ({
    uid: `bom-${item.materialId}-${index}`,
    materialId: String(item.materialId),
    materialType: item.materialType === 'FABRIC' ? 'fabric' : 'accessory',
    name: item.materialName,
    sku: item.materialSku,
    unit: item.unit,
    imageUrl: item.imageUrl,
    consumption: Number(item.consumption ?? 0),
    lossRate: Number(item.lossRate ?? 0) * 100,
    unitPrice: item.unitPrice,
    remark: item.remark ?? '',
  }));

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
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [detail, setDetail] = useState<StyleDetailData>();
  const [materials, setMaterials] = useState<StyleBomMaterialDraft[]>([]);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, StyleCodeVariantDraft>>({});
  const [isDirty, setIsDirty] = useState(false);
  const initializingRef = useRef(false);
  const [materialPicker, setMaterialPicker] = useState<MaterialPickerState>({
    open: false,
    loading: false,
    keyword: '',
    page: 1,
    pageSize: 8,
    total: 0,
    materialType: 'fabric',
    list: [],
  });

  const watchedColors = Form.useWatch('colors', form);
  const watchedSizes = Form.useWatch('sizes', form);
  const watchedStyleNo = Form.useWatch('styleNo', form);
  const normalizedColors = useMemo(() => watchedColors ?? [], [watchedColors]);
  const normalizedSizes = useMemo(() => watchedSizes ?? [], [watchedSizes]);
  const colorImagesEnabled = Form.useWatch('colorImagesEnabled', form);

  const fabricMaterials = useMemo(
    () => materials.filter((item) => item.materialType === 'fabric'),
    [materials],
  );
  const accessoryMaterials = useMemo(
    () => materials.filter((item) => item.materialType === 'accessory'),
    [materials],
  );

  const load = useCallback(
    async (formRef: FormInstance<StyleFormValues>) => {
      setLoading(true);
      initializingRef.current = true;
      try {
        const metaPayload = await styleDetailApi.fetchMeta();
        setMeta(metaPayload);
        let detailPayload: StyleDetailData | undefined;
        if (styleId) {
          const [detailResult, materialResult] = await Promise.all([
            styleDetailApi.fetchDetail(styleId),
            styleBomApi.fetch(styleId),
          ]);
          detailPayload = { ...detailResult, materials: materialResult };
          setDetail(detailPayload);
          setMaterials(toBomDrafts(materialResult));
          setColorImages(detailPayload.colorImages ?? {});
          setDetailImages(detailPayload.detailImageUrls ?? []);
          setVariantDrafts(
            Object.fromEntries(
              (detailPayload.variants ?? []).map((variant) => [
                buildVariantKey(variant.color, variant.size),
                {
                  color: variant.color ?? '',
                  size: variant.size ?? '',
                  skcNo: buildDraftCodeValue(variant.sourceType, variant.skcNo),
                  systemSkcNo: variant.systemSkcNo,
                  skuNo: buildDraftCodeValue(variant.sourceType, variant.skuNo),
                  systemSkuNo: variant.systemSkuNo,
                  barcode: variant.barcode,
                  sourceType: variant.sourceType ?? 'SYSTEM_DERIVED',
                  attributes: variant.attributes,
                },
              ]),
            ),
          );
        } else {
          setDetail(undefined);
          setColorImages({});
          setDetailImages([]);
          setMaterials([]);
          setVariantDrafts({});
        }
        formRef.setFieldsValue(buildInitialValues(detailPayload));
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
    void load(form);
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

  useEffect(() => {
    setVariantDrafts((prev) => {
      const next: Record<string, StyleCodeVariantDraft> = {};
      normalizedColors.forEach((color) => {
        normalizedSizes.forEach((size) => {
          const key = buildVariantKey(color, size);
          const existing = prev[key];
          const systemSkcNo = buildDefaultCode(watchedStyleNo, color);
          const systemSkuNo = buildDefaultCode(watchedStyleNo, color, size);
          next[key] = {
            color,
            size,
            systemSkcNo,
            systemSkuNo,
            skcNo: existing?.skcNo,
            skuNo: existing?.skuNo,
            barcode: existing?.barcode,
            attributes: existing?.attributes,
          };
        });
      });
      return next;
    });
  }, [normalizedColors, normalizedSizes, watchedStyleNo]);

  const markDirty = useCallback(() => {
    if (!initializingRef.current) {
      setIsDirty(true);
    }
  }, []);

  const handleColorImageChange = useCallback((color: string, value?: string) => {
    setColorImages((prev) => ({
      ...prev,
      [color]: value,
    }));
    markDirty();
  }, [markDirty]);

  const handleDetailImagesChange = useCallback((value?: string[]) => {
    setDetailImages(value ?? []);
    markDirty();
  }, [markDirty]);

  const handleValuesChange = useCallback(() => {
    markDirty();
  }, [markDirty]);

  const variantRows = useMemo(
    () =>
      normalizedColors.flatMap((color) =>
        normalizedSizes.map((size) => variantDrafts[buildVariantKey(color, size)]).filter(Boolean),
      ),
    [normalizedColors, normalizedSizes, variantDrafts],
  );

  const handleSkcDraftChange = useCallback((color: string, value: string) => {
    setVariantDrafts((prev) => {
      const next = { ...prev };
      normalizedSizes.forEach((size) => {
        const key = buildVariantKey(color, size);
        const current = next[key];
        if (current) {
          next[key] = {
            ...current,
            skcNo: value,
          };
        }
      });
      return next;
    });
    markDirty();
  }, [markDirty, normalizedSizes]);

  const handleSkuDraftChange = useCallback((color: string, size: string, value: string) => {
    const key = buildVariantKey(color, size);
    setVariantDrafts((prev) => ({
      ...prev,
      [key]: prev[key]
        ? {
            ...prev[key],
            skuNo: value,
          }
        : prev[key],
    }));
    markDirty();
  }, [markDirty]);

  const loadMaterialOptions = useCallback(async (state: MaterialPickerState) => {
    setMaterialPicker((prev) => ({ ...prev, loading: true }));
    try {
      const result = await materialApi.list({
        page: state.page,
        pageSize: state.pageSize,
        keyword: state.keyword.trim() || undefined,
        materialType: state.materialType,
      });
      setMaterialPicker((prev) => ({
        ...prev,
        list: result.list,
        total: result.total,
        loading: false,
      }));
    } catch (error) {
      console.error('加载物料失败', error);
      message.error('加载物料失败，请稍后重试');
      setMaterialPicker((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const {
    open: isMaterialPickerOpen,
    page: materialPickerPage,
    pageSize: materialPickerPageSize,
    keyword: materialPickerKeyword,
    materialType: materialPickerType,
  } = materialPicker;

  useEffect(() => {
    if (!isMaterialPickerOpen) {
      return;
    }
    void loadMaterialOptions({
      open: isMaterialPickerOpen,
      loading: false,
      keyword: materialPickerKeyword,
      page: materialPickerPage,
      pageSize: materialPickerPageSize,
      total: 0,
      materialType: materialPickerType,
      list: [],
    });
  }, [
    isMaterialPickerOpen,
    loadMaterialOptions,
    materialPickerKeyword,
    materialPickerPage,
    materialPickerPageSize,
    materialPickerType,
  ]);

  const handleBomFieldChange = useCallback((uid: string, patch: Partial<StyleBomMaterialDraft>) => {
    setMaterials((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
    markDirty();
  }, [markDirty]);

  const handleBomRemove = useCallback((uid: string) => {
    setMaterials((prev) => prev.filter((item) => item.uid !== uid));
    markDirty();
  }, [markDirty]);

  const handleBomAdd = useCallback((item: MaterialItem) => {
    setMaterials((prev) => {
      if (item.id && prev.some((entry) => entry.materialId === item.id)) {
        message.warning('该物料已在清单中');
        return prev;
      }
      return [...prev, toBomDraft(item)];
    });
    setMaterialPicker((prev) => ({ ...prev, open: false }));
    markDirty();
  }, [markDirty]);

  const openMaterialPicker = useCallback((materialType: MaterialBasicType) => {
    setMaterialPicker((prev) => ({
      ...prev,
      open: true,
      materialType,
      page: 1,
      keyword: '',
    }));
  }, []);

  const renderBomList = useCallback((entries: StyleBomMaterialDraft[], emptyText: string) => {
    if (entries.length === 0) {
      return <Empty description={emptyText} style={{ margin: '12px 0' }} />;
    }
    return (
      <Space direction="vertical" size={12} className="sample-order-material-list">
        {entries.map((record) => (
          <div key={record.uid} className="sample-order-material-item">
            <div className="sample-order-material-info">
              <ListImage
                src={record.imageUrl}
                alt={record.name}
                width={56}
                height={56}
                borderRadius={8}
                background="#f5f5f5"
              />
              <div className="sample-order-material-text">
                <Text strong className="sample-order-material-name">
                  {record.name || '未命名物料'}
                </Text>
                <Text type="secondary" className="sample-order-material-meta">
                  {[record.sku, record.unit ? `单位：${record.unit}` : null, record.unitPrice !== undefined ? `参考单价 ¥${record.unitPrice.toFixed(2)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </div>
            </div>
            <div className="sample-order-material-fields">
              <div className="sample-order-material-field">
                <Text type="secondary">单耗</Text>
                <InputNumber
                  min={0}
                  precision={2}
                  value={record.consumption}
                  style={{ width: '100%' }}
                  onChange={(value) => handleBomFieldChange(record.uid, { consumption: Number(value ?? 0) })}
                />
              </div>
              <div className="sample-order-material-field">
                <Text type="secondary">损耗(%)</Text>
                <NumberWithUnitInput
                  min={0}
                  precision={2}
                  unit="%"
                  value={record.lossRate}
                  style={{ width: '100%' }}
                  onChange={(value) => handleBomFieldChange(record.uid, { lossRate: Number(value ?? 0) })}
                />
              </div>
              <div className="sample-order-material-field sample-order-material-field--remark">
                <Text type="secondary">备注</Text>
                <Input
                  value={record.remark}
                  placeholder="备注"
                  onChange={(event) => handleBomFieldChange(record.uid, { remark: event.target.value })}
                />
              </div>
            </div>
            <div className="sample-order-material-actions">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleBomRemove(record.uid)} />
            </div>
          </div>
        ))}
      </Space>
    );
  }, [handleBomFieldChange, handleBomRemove]);

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
        detailImageUrls: detailImages,
        sizeChartImageUrl: values.sizeChartImageUrl,
        colorImages: values.colorImagesEnabled ? colorImages : {},
        variants: variantRows.map((variant) => ({
          color: variant.color,
          size: variant.size,
          skcNo: normalizeOptionalText(variant.skcNo),
          skuNo: normalizeOptionalText(variant.skuNo),
          barcode: normalizeOptionalText(variant.barcode),
          attributes: variant.attributes,
        })),
      };
      let confirmCodeImpact = false;
      if (isEditing && styleId) {
        const impact = await styleDetailApi.checkCodeImpact(styleId, payload);
        if (impact.requiresConfirmation) {
          const confirmed = await new Promise<boolean>((resolve) => {
            Modal.confirm({
              title: '该款式已发布，确认继续修改编码吗？',
              content: (
                <div className="style-code-impact-confirm">
                  <Text type="secondary">
                    保存后会影响以下已发布范围，请确认是否继续：
                  </Text>
                  <div className="style-code-impact-confirm__list">
                    {impact.impactedLinks.map((item, index) => (
                      <div
                        key={`${item.channelAccountId ?? item.targetOfferId ?? index}`}
                        className="style-code-impact-confirm__item"
                      >
                        <Text strong>{item.platformCode ?? '平台'}</Text>
                        <Text>{item.shopName || item.accountName || '未命名店铺'}</Text>
                        <Text type="secondary">
                          商品：{item.targetOfferId || item.targetProductId || '-'}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              ),
              okText: '确认保存',
              cancelText: '继续检查',
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            });
          });
          if (!confirmed) {
            return;
          }
          confirmCodeImpact = true;
        }
      }
      setSaving(true);
      const savedDetail = isEditing && styleId
        ? await styleDetailApi.update(styleId, payload, { confirmCodeImpact })
        : await styleDetailApi.create(payload);

      if (savedDetail.id) {
        const savedMaterials = await styleBomApi.update(
          savedDetail.id,
          buildStyleBomUpdatePayload(materials),
        );
        setMaterials(toBomDrafts(savedMaterials));
      }

      if (isEditing && styleId) {
        message.success('款式资料已更新');
        await load(form);
      } else {
        message.success('款式资料已创建');
        setDetail(savedDetail);
        setDetailImages(savedDetail.detailImageUrls ?? detailImages);
      }
      setIsDirty(false);
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) {
        return;
      }
      console.error('保存款式资料失败', error);
      const backendMessage = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : error instanceof Error
          ? error.message
          : '';
      if (backendMessage.includes('Style number already exists')) {
        message.error('款号已存在，请更换后重试');
      } else {
        message.error(backendMessage || '保存失败，请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  }, [colorImages, detailImages, form, isEditing, load, materials, styleId, variantRows]);

  const designerOptions = useMemo(() => meta?.designers ?? [], [meta]);
  const overviewStats = useMemo(
    () => [
      { label: '颜色', value: normalizedColors.length || 0 },
      { label: '尺码', value: normalizedSizes.length || 0 },
      { label: '细节图', value: detailImages.length || 0 },
      { label: 'BOM 物料', value: materials.length || 0 },
    ],
    [detailImages.length, materials.length, normalizedColors.length, normalizedSizes.length],
  );

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="style-detail-page oc-page">
        <PageHeader
          className="oc-page-header--compact"
          title="款式资料"
          extra={detail?.styleNo ? <Text type="secondary">当前款号：{detail.styleNo}</Text> : null}
          stats={
            <div className="oc-summary-strip">
              {overviewStats.map((item) => (
                <div key={item.label} className="oc-summary-chip">
                  <div className="oc-summary-chip__label">{item.label}</div>
                  <div className="oc-summary-chip__value">{item.value}</div>
                </div>
              ))}
            </div>
          }
        />

        <Form form={form} layout="vertical" className="style-detail-form" onValuesChange={handleValuesChange} data-testid="style-detail-form">
          <PageSection className="oc-page-section--compact style-detail-card style-detail-overview-card">
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
                <div className="style-detail-gallery-title">细节图</div>
                <ImageUploader
                  module="styles"
                  multiple
                  maxCount={10}
                  value={detailImages}
                  onChange={handleDetailImagesChange}
                  tips="支持多张细节图上传；点击缩略图可在当前页预览，支持直接删除。"
                />
              </div>
              <div className="style-detail-info">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="styleNo" label="款号" rules={[{ required: true, message: '请输入款号' }]}>
                      <Input placeholder="例如 STY-2024-001" disabled={isEditing} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="styleName" label="款名" rules={[{ required: true, message: '请输入款式名称' }]}>
                      <Input placeholder="请输入款式名称" maxLength={1024} showCount />
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
                    <Form.Item name="colors" label="颜色" rules={[{ required: true, message: '请输入至少一个颜色' }]}>
                      <Select mode="tags" placeholder="输入颜色后按回车添加" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="sizes" label="尺码" rules={[{ required: true, message: '请输入至少一个尺码' }]}>
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
                {variantRows.length > 0 && (
                  <div className="style-detail-variant-rules">
                    <div className="style-detail-variant-rules__header">
                      <Title level={5} style={{ margin: 0 }}>编码规则</Title>
                    </div>
                    <div className="style-detail-variant-rules__table">
                      <StyleCodeMatrixEditor
                        colors={normalizedColors}
                        sizes={normalizedSizes}
                        variantDrafts={variantDrafts}
                        onSkcChange={handleSkcDraftChange}
                        onSkuChange={handleSkuDraftChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </PageSection>

          {isEditing && (
            <PageSection className="oc-page-section--compact style-detail-card">
              <div className="style-detail-materials-header">
                <div>
                  <Title level={5} style={{ marginBottom: 4 }}>关联面辅料</Title>
                  <Text type="secondary">与样板单共用同一份款式物料数据，便于下大货与款式资料保持一致。</Text>
                </div>
                <Space>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => openMaterialPicker('fabric')} data-testid="style-detail-add-fabric-button">
                    选择面料
                  </Button>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => openMaterialPicker('accessory')}>
                    选择辅料/包材
                  </Button>
                </Space>
              </div>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card size="small" title="面料" data-testid="style-detail-fabric-bom-card">
                    {renderBomList(fabricMaterials, '当前款式还没有面料 BOM')}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card size="small" title="辅料/包材">
                    {renderBomList(accessoryMaterials, '当前款式还没有辅料 BOM')}
                  </Card>
                </Col>
              </Row>
            </PageSection>
          )}
        </Form>

        <div className="style-detail-footer" data-testid="style-detail-footer">
          <Space>
            <Button onClick={handleBackClick}>返回列表</Button>
            <Button type="primary" loading={saving} onClick={handleSave} disabled={loading} data-testid="style-detail-save-button">
              保存
            </Button>
          </Space>
        </div>
      </div>

      <Drawer
        title={materialPicker.materialType === 'fabric' ? '选择面料' : '选择辅料/包材'}
        open={materialPicker.open}
        width={520}
        onClose={() => setMaterialPicker((prev) => ({ ...prev, open: false }))}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <SearchField
            placeholder="搜索物料名称或编号"
            allowClear
            enterButton={<SearchOutlined />}
            value={materialPicker.keyword}
            onChange={(value) => setMaterialPicker((prev) => ({ ...prev, keyword: value }))}
            onSearch={() => setMaterialPicker((prev) => ({ ...prev, page: 1 }))}
          />
          <Spin spinning={materialPicker.loading}>
            <List
              dataSource={materialPicker.list}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  actions={[<Button type="link" onClick={() => handleBomAdd(item)}>选择</Button>]}
                >
                  <Space align="center" size={12}>
                    <ListImage
                      src={item.imageUrl}
                      alt={item.name}
                      width={48}
                      height={48}
                      borderRadius={8}
                      background="#f5f5f5"
                    />
                    <Space direction="vertical" size={2} style={{ minWidth: 0 }}>
                      <Text strong>{item.name}</Text>
                      <Text type="secondary">编号：{item.sku}</Text>
                      <Text type="secondary">单位：{item.unit}</Text>
                    </Space>
                  </Space>
                </List.Item>
              )}
              locale={{ emptyText: '暂无物料' }}
            />
          </Spin>
          <Pagination
            current={materialPicker.page}
            pageSize={materialPicker.pageSize}
            total={materialPicker.total}
            showSizeChanger
            showQuickJumper
            onChange={(page, pageSize) => setMaterialPicker((prev) => ({ ...prev, page, pageSize }))}
          />
        </Space>
      </Drawer>
    </Spin>
  );
};

export default StyleDetail;
