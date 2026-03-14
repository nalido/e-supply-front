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
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
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
import type { MaterialBasicType, MaterialItem } from '../types/material';
import type {
  StyleBomMaterialDraft,
  StyleColorImageMap,
  StyleDetailData,
  StyleDetailSavePayload,
  StyleFormMeta,
  StyleWeeklySalesSource,
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
  weeklySalesSource: StyleWeeklySalesSource;
  manualWeeklySales?: number;
  autoSalesWeeks?: number;
  coverageWeeks?: number;
  overrideReason?: string;
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
  weeklySalesSource: detail?.weeklySalesConfig?.source ?? 'AUTO',
  manualWeeklySales: detail?.weeklySalesConfig?.manualWeeklySales,
  autoSalesWeeks: detail?.weeklySalesConfig?.autoSalesWeeks ?? 4,
  coverageWeeks: detail?.weeklySalesConfig?.coverageWeeks ?? 2,
  overrideReason: detail?.weeklySalesConfig?.overrideReason,
});

const formatDecimal = (value?: number, digits = 2): string => {
  if (value == null || Number.isNaN(value)) {
    return '--';
  }
  return `${Number(value).toFixed(digits)}`;
};

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
  unitPrice: item.price,
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
  const [detail, setDetail] = useState<StyleDetailData>();
  const [materials, setMaterials] = useState<StyleBomMaterialDraft[]>([]);
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
  const normalizedColors = useMemo(() => watchedColors ?? [], [watchedColors]);
  const colorImagesEnabled = Form.useWatch('colorImagesEnabled', form);
  const weeklySalesSource = Form.useWatch('weeklySalesSource', form) ?? 'AUTO';
  const manualWeeklySales = Form.useWatch('manualWeeklySales', form);
  const autoSalesWeeks = Form.useWatch('autoSalesWeeks', form);
  const coverageWeeks = Form.useWatch('coverageWeeks', form);

  const autoWeeklySales = detail?.weeklySalesConfig?.autoWeeklySales;
  const effectiveWeeklySales = useMemo(() => {
    if (weeklySalesSource === 'MANUAL') {
      return manualWeeklySales;
    }
    return detail?.weeklySalesConfig?.effectiveWeeklySales ?? autoWeeklySales;
  }, [autoWeeklySales, detail?.weeklySalesConfig?.effectiveWeeklySales, manualWeeklySales, weeklySalesSource]);

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
        } else {
          setDetail(undefined);
          setColorImages({});
          setMaterials([]);
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

  const handleValuesChange = useCallback(() => {
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
                fallback={<div className="sample-order-material-placeholder" />}
              />
              <div className="sample-order-material-text">
                <Text strong className="sample-order-material-name">
                  {record.name || '未命名物料'}
                </Text>
                <Text type="secondary" className="sample-order-material-meta">
                  {[record.sku, record.unit ? `单位：${record.unit}` : null, record.unitPrice !== undefined ? `单价 ¥${record.unitPrice.toFixed(2)}` : null]
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
                <div className="sample-order-material-input-with-addon">
                  <InputNumber
                    min={0}
                    precision={2}
                    value={record.lossRate}
                    style={{ width: '100%' }}
                    onChange={(value) => handleBomFieldChange(record.uid, { lossRate: Number(value ?? 0) })}
                  />
                  <span className="sample-order-material-addon">%</span>
                </div>
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

  const handleOpenSalesStockingReport = useCallback(() => {
    const styleNo = form.getFieldValue('styleNo')?.trim();
    const params = new URLSearchParams({
      mode: 'sales',
      materialType: 'fabric',
    });
    if (styleNo) {
      params.set('keyword', styleNo);
    }
    navigate(`/orders/report/material-need?${params.toString()}`);
  }, [form, navigate]);

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
        weeklySalesConfig: {
          source: values.weeklySalesSource,
          manualWeeklySales: values.weeklySalesSource === 'MANUAL' ? values.manualWeeklySales : undefined,
          autoSalesWeeks: values.autoSalesWeeks,
          coverageWeeks: values.coverageWeeks,
          overrideReason: values.overrideReason,
        },
      };
      const savedDetail = isEditing && styleId
        ? await styleDetailApi.update(styleId, payload)
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
      }
      setIsDirty(false);
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) {
        return;
      }
      console.error('保存款式资料失败', error);
      message.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [colorImages, form, isEditing, load, materials, styleId]);

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
                    <Form.Item name="styleNo" label="款号" rules={[{ required: true, message: '请输入款号' }]}>
                      <Input placeholder="例如 STY-2024-001" disabled={isEditing} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="styleName" label="款名" rules={[{ required: true, message: '请输入款式名称' }]}>
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

          <Card variant="borderless" className="style-detail-card">
            <div className="style-detail-materials-header" style={{ marginBottom: 16 }}>
              <div>
                <Title level={5} style={{ marginBottom: 4 }}>备料参数 / 周销量设置</Title>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">用于驱动“销量备料建议”模式的周销量、覆盖周期与人工覆盖口径。</Text>
                  <Button type="link" style={{ paddingInline: 0 }} onClick={handleOpenSalesStockingReport}>
                    查看订单物料需求报表中的销量备料建议
                  </Button>
                </Space>
              </div>
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Form.Item name="weeklySalesSource" label="周销量来源" rules={[{ required: true, message: '请选择周销量来源' }]}>
                  <Radio.Group optionType="button" buttonStyle="solid">
                    <Radio.Button value="AUTO">自动</Radio.Button>
                    <Radio.Button value="MANUAL">手工覆盖</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} lg={10}>
                <Form.Item name="coverageWeeks" label="备料覆盖周数" rules={[{ required: true, message: '请输入覆盖周数' }]}>
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="例如 2" />
                </Form.Item>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="autoSalesWeeks"
                  label="自动销量回看周数"
                  extra="AUTO 模式下用于说明自动销量的统计周期。"
                  rules={[{ required: true, message: '请输入自动销量回看周数' }]}
                >
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="例如 4" />
                </Form.Item>
              </Col>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="manualWeeklySales"
                  label="手工周销量"
                  rules={weeklySalesSource === 'MANUAL' ? [{ required: true, message: '请输入手工周销量' }] : []}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="例如 120"
                    disabled={weeklySalesSource !== 'MANUAL'}
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="overrideReason" label="覆盖说明">
                  <Input.TextArea
                    rows={3}
                    placeholder="如手工覆盖，请说明原因，例如直播活动预计放量、渠道备货等"
                    maxLength={200}
                    showCount
                    allowClear
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic title="自动周销量" value={formatDecimal(autoWeeklySales)} suffix="件/周" />
                  <Text type="secondary">回看 {autoSalesWeeks ?? '--'} 周</Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic title="生效周销量" value={formatDecimal(effectiveWeeklySales)} suffix="件/周" />
                  <Text type="secondary">来源：{weeklySalesSource === 'MANUAL' ? '手工覆盖' : '自动'}</Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic title="备料覆盖周期" value={coverageWeeks ?? '--'} suffix="周" />
                  <Text type="secondary">用于推导建议库存</Text>
                </Card>
              </Col>
            </Row>
          </Card>

          {isEditing && (
            <Card variant="borderless" className="style-detail-card">
              <div className="style-detail-materials-header">
                <div>
                  <Title level={5} style={{ marginBottom: 4 }}>关联面辅料</Title>
                  <Text type="secondary">与样板单共用同一份款式物料数据，便于下大货与款式资料保持一致。</Text>
                </div>
                <Space>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => openMaterialPicker('fabric')}>
                    选择面料
                  </Button>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => openMaterialPicker('accessory')}>
                    选择辅料/包材
                  </Button>
                </Space>
              </div>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card size="small" title="面料">
                    {renderBomList(fabricMaterials, '当前款式还没有面料 BOM')}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card size="small" title="辅料/包材">
                    {renderBomList(accessoryMaterials, '当前款式还没有辅料 BOM')}
                  </Card>
                </Col>
              </Row>
            </Card>
          )}
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

      <Drawer
        title={materialPicker.materialType === 'fabric' ? '选择面料' : '选择辅料/包材'}
        open={materialPicker.open}
        width={520}
        onClose={() => setMaterialPicker((prev) => ({ ...prev, open: false }))}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Input.Search
            placeholder="搜索物料名称或编号"
            allowClear
            enterButton={<SearchOutlined />}
            value={materialPicker.keyword}
            onChange={(event) => setMaterialPicker((prev) => ({ ...prev, keyword: event.target.value }))}
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
                      fallback={<div style={{ width: '100%', height: '100%', borderRadius: 8, background: '#f5f5f5' }} />}
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
