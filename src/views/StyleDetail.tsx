import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styleBomApi from '../api/style-bom';
import styleDetailApi from '../api/style-detail';
import ImageUploader from '../components/upload/ImageUploader';
import StyleCodeMatrixEditor from '../components/style/StyleCodeMatrixEditor';
import StyleBomSection from '../components/style-bom/StyleBomSection';
import StyleBomSaveImpactModal, { type StyleBomImpactDecision } from '../components/style-bom/StyleBomSaveImpactModal';
import { PageHeader, PageSection } from '../components/page';
import useStyleBomDraft from '../hooks/useStyleBomDraft';
import type {
  StyleColorImageMap,
  StyleCodeVariantDraft,
  StyleDetailData,
  StyleDetailSavePayload,
  StyleFormMeta,
  StyleVariantImpact,
  StyleBomImpactPreview,
} from '../types/style';
import '../styles/style-detail.css';
import '../styles/style-bom.css';

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

const normalizeTagValues = (values?: string[]) => {
  const seen = new Set<string>();
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
};

const buildVariantKey = (color?: string, size?: string) => `${color ?? ''}|${size ?? ''}`;

const formatVariantImpactLabel = (impact: StyleVariantImpact) =>
  `${impact.color || '-'} / ${impact.size || '-'}`;

const formatVariantImpactReferences = (impact: StyleVariantImpact) =>
  impact.references
    .filter((reference) => reference.count > 0)
    .map((reference) => `${reference.label} ${reference.count} 条`)
    .join('、');

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

const StyleDetail = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const styleId = searchParams.get('id') ?? undefined;
  const isEditing = Boolean(styleId);
  const [createdStyleId, setCreatedStyleId] = useState<string>();
  const effectiveStyleId = styleId ?? createdStyleId;
  const isPersisted = Boolean(effectiveStyleId);
  const [form] = Form.useForm<StyleFormValues>();
  const [meta, setMeta] = useState<StyleFormMeta>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorImages, setColorImages] = useState<StyleColorImageMap>({});
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [detail, setDetail] = useState<StyleDetailData>();
  const [variantDrafts, setVariantDrafts] = useState<Record<string, StyleCodeVariantDraft>>({});
  const [isDirty, setIsDirty] = useState(false);
  const initializingRef = useRef(false);
  const [impactOpen, setImpactOpen] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactPreview, setImpactPreview] = useState<StyleBomImpactPreview>();
  const [pendingSave, setPendingSave] = useState<{ payload: StyleDetailSavePayload; confirmCodeImpact: boolean }>();
  const impactRequestRef = useRef(0);
  const bomSaveIdempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);

  const watchedColors = Form.useWatch('colors', form);
  const watchedSizes = Form.useWatch('sizes', form);
  const watchedStyleNo = Form.useWatch('styleNo', form);
  const normalizedColors = useMemo(() => normalizeTagValues(watchedColors), [watchedColors]);
  const normalizedSizes = useMemo(() => normalizeTagValues(watchedSizes), [watchedSizes]);
  const colorImagesEnabled = Form.useWatch('colorImagesEnabled', form);
  const bomDraft = useStyleBomDraft(normalizedColors, normalizedSizes);
  const { reset: resetBomDraft } = bomDraft;

  useEffect(() => {
    if (!isDirty && !bomDraft.isDirty) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [bomDraft.isDirty, isDirty]);

  const load = useCallback(
    async (formRef: FormInstance<StyleFormValues>) => {
      setLoading(true);
      initializingRef.current = true;
      try {
        const metaPayload = await styleDetailApi.fetchMeta();
        setMeta(metaPayload);
        let detailPayload: StyleDetailData | undefined;
        if (styleId) {
          const [detailResult, bomConfiguration] = await Promise.all([
            styleDetailApi.fetchDetail(styleId),
            styleBomApi.fetchConfiguration(styleId),
          ]);
          detailPayload = detailResult;
          setDetail(detailPayload);
          resetBomDraft(bomConfiguration, detailResult.sizes, detailResult.colors);
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
          resetBomDraft({ revision: 0, items: [] }, [], []);
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
    [message, resetBomDraft, styleId],
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

  const handleBackClick = useCallback(() => {
    const goBack = () => navigate('/basic/styles');
    if (isDirty || bomDraft.isDirty) {
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
  }, [bomDraft.isDirty, isDirty, navigate]);

  const executeSave = useCallback(async (
    payload: StyleDetailSavePayload,
    confirmCodeImpact: boolean,
    decision?: StyleBomImpactDecision,
    previewToken?: string,
  ) => {
    setSaving(true);
    let stylePersisted = false;
    try {
      const savedDetail = isPersisted && effectiveStyleId
        ? isDirty
          ? await styleDetailApi.update(effectiveStyleId, payload, { confirmCodeImpact })
          : detail ?? await styleDetailApi.fetchDetail(effectiveStyleId)
        : await styleDetailApi.create(payload);
      stylePersisted = !isPersisted || isDirty;
      if (!isPersisted && savedDetail.id) {
        setCreatedStyleId(savedDetail.id);
        setDetail(savedDetail);
        setIsDirty(false);
      }

      if (bomDraft.isDirty && savedDetail.id) {
        const idempotencySignature = JSON.stringify({
          styleId: savedDetail.id,
          baseBomVersionId: bomDraft.bomVersionId,
          items: bomDraft.lines,
          colors: payload.colors,
          sizes: payload.sizes,
          handlingMode: decision?.handlingMode ?? 'FUTURE_ONLY',
          historyStart: decision?.historyStart,
          historyEnd: decision?.historyEnd,
        });
        if (bomSaveIdempotencyRef.current?.signature !== idempotencySignature) {
          bomSaveIdempotencyRef.current = {
            signature: idempotencySignature,
            key: crypto.randomUUID(),
          };
        }
        const idempotencyKey = bomSaveIdempotencyRef.current.key;
        if (isPersisted) {
          if (!decision || !previewToken) {
            throw new Error('用料影响检查结果已失效，请重新保存');
          }
          const updateResult = await styleBomApi.updateConfiguration(savedDetail.id, {
            baseBomVersionId: bomDraft.bomVersionId,
            previewToken,
            handlingMode: decision.handlingMode,
            historyStart: decision.historyStart,
            historyEnd: decision.historyEnd,
            idempotencyKey,
            items: bomDraft.lines,
            candidateColors: payload.colors,
            candidateSizes: payload.sizes,
          });
          bomDraft.reset(updateResult.configuration, payload.sizes, payload.colors);
          bomSaveIdempotencyRef.current = undefined;
          if (updateResult.correctionTaskId) {
            message.success(`历史用料差异核对任务 #${updateResult.correctionTaskId} 已生成，原出库记录未改动`);
          } else if (updateResult.synchronizedOrderCount > 0) {
            message.success(`已同步 ${updateResult.synchronizedOrderCount} 个尚未领料订单的用料需求`);
          }
        } else if (bomDraft.lines.length) {
          const newStylePreview = await styleBomApi.previewImpact(savedDetail.id, {
            items: bomDraft.lines,
            candidateColors: payload.colors,
            candidateSizes: payload.sizes,
          });
          const updateResult = await styleBomApi.updateConfiguration(savedDetail.id, {
            previewToken: newStylePreview.previewToken,
            handlingMode: 'FUTURE_ONLY',
            idempotencyKey,
            items: bomDraft.lines,
            candidateColors: payload.colors,
            candidateSizes: payload.sizes,
          });
          bomDraft.reset(updateResult.configuration, payload.sizes, payload.colors);
          bomSaveIdempotencyRef.current = undefined;
        }
      }

      setImpactOpen(false);
      setImpactPreview(undefined);
      setPendingSave(undefined);
      setIsDirty(false);
      if (isEditing && styleId) {
        message.success('款式资料和用料已更新');
        await load(form);
      } else {
        message.success(createdStyleId ? '款式资料和用料已更新' : '款式资料已创建');
        setDetail(savedDetail);
        setDetailImages(savedDetail.detailImageUrls ?? detailImages);
      }
    } catch (error) {
      console.error('保存款式资料失败', error);
      const backendMessage = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : error instanceof Error
          ? error.message
          : '';
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setImpactOpen(false);
        setImpactPreview(undefined);
        setPendingSave(undefined);
        message.error('款式用料或影响范围已变化，请核对当前内容后重新点击保存');
      } else if (backendMessage.includes('Style number already exists')) {
        message.error('款号已存在，请更换后重试');
      } else if (stylePersisted && bomDraft.isDirty) {
        message.error(`${isPersisted ? '款式资料已更新' : '款式已创建'}，但用料未保存；当前用料草稿仍保留，请重试`);
      } else {
        message.error(backendMessage || '保存失败，请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  }, [bomDraft, createdStyleId, detail, detailImages, effectiveStyleId, form, isDirty, isEditing, isPersisted, load, message, styleId]);

  const previewBomImpact = useCallback(async (historyStart?: string, historyEnd?: string) => {
    if (!effectiveStyleId || !pendingSave) {
      return;
    }
    const sequence = ++impactRequestRef.current;
    setImpactLoading(true);
    setImpactPreview(undefined);
    try {
      const preview = await styleBomApi.previewImpact(effectiveStyleId, {
        baseBomVersionId: bomDraft.bomVersionId,
        items: bomDraft.lines,
        historyStart,
        historyEnd,
        candidateColors: pendingSave.payload.colors,
        candidateSizes: pendingSave.payload.sizes,
      });
      if (sequence === impactRequestRef.current) {
        setImpactPreview(preview);
      }
    } catch (error) {
      if (sequence === impactRequestRef.current) {
        console.error('检查款式用料影响失败', error);
        message.error('无法检查受影响用料，请稍后重试');
      }
    } finally {
      if (sequence === impactRequestRef.current) {
        setImpactLoading(false);
      }
    }
  }, [bomDraft.bomVersionId, bomDraft.lines, effectiveStyleId, message, pendingSave]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const colors = normalizeTagValues(values.colors);
      const sizes = normalizeTagValues(values.sizes);
      if (!colors.length) {
        message.warning('请至少输入一个颜色');
        return;
      }
      if (!sizes.length) {
        message.warning('请至少输入一个尺码');
        return;
      }
      form.setFieldsValue({ colors, sizes });
      const payload: StyleDetailSavePayload = {
        styleNo: values.styleNo.trim(),
        styleName: values.styleName.trim(),
        defaultUnit: values.defaultUnit,
        designerId: values.designerId,
        remarks: values.remarks,
        colors,
        sizes,
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
      if (isDirty && isEditing && styleId) {
        const impact = await styleDetailApi.checkCodeImpact(styleId, payload);
        const blockedVariantImpacts = impact.variantImpacts.filter(
          (item) => item.references.length > 0,
        );
        if (impact.blocked || blockedVariantImpacts.length > 0) {
          Modal.warning({
            title: '这些颜色/尺码已经被使用，不能直接删除',
            content: (
              <div className="style-code-impact-confirm">
                <Text type="secondary">
                  请保留原颜色/尺码后新增其他颜色，或先处理相关业务记录再调整。
                </Text>
                <div className="style-code-impact-confirm__list">
                  {blockedVariantImpacts.slice(0, 8).map((item, index) => (
                    <div
                      key={`${item.styleVariantId ?? `${item.color}-${item.size}`}-${index}`}
                      className="style-code-impact-confirm__item"
                    >
                      <Text strong>{formatVariantImpactLabel(item)}</Text>
                      <Text type="secondary">
                        {formatVariantImpactReferences(item) || '已有业务记录'}
                      </Text>
                    </div>
                  ))}
                  {blockedVariantImpacts.length > 8 ? (
                    <Text type="secondary">
                      还有 {blockedVariantImpacts.length - 8} 个颜色/尺码也已被使用
                    </Text>
                  ) : null}
                </div>
              </div>
            ),
            okText: '知道了',
          });
          return;
        }
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
      if (bomDraft.validationIssues.length) {
        message.warning(`请先处理 ${bomDraft.validationIssues.length} 项款式用料问题`);
        return;
      }
      if (isPersisted && !isDirty && !bomDraft.isDirty) {
        message.info('没有需要保存的修改');
        return;
      }
      if (isPersisted && effectiveStyleId && bomDraft.isDirty) {
        setPendingSave({ payload, confirmCodeImpact });
        setImpactOpen(true);
        setImpactLoading(true);
        try {
          const preview = await styleBomApi.previewImpact(effectiveStyleId, {
            baseBomVersionId: bomDraft.bomVersionId,
            items: bomDraft.lines,
            candidateColors: payload.colors,
            candidateSizes: payload.sizes,
          });
          setImpactPreview(preview);
        } catch (error) {
          console.error('检查款式用料影响失败', error);
          setImpactOpen(false);
          setPendingSave(undefined);
          message.error('无法检查受影响用料，尚未保存任何修改');
        } finally {
          setImpactLoading(false);
        }
        return;
      }
      await executeSave(payload, confirmCodeImpact);
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
    }
  }, [bomDraft, colorImages, detailImages, effectiveStyleId, executeSave, form, isDirty, isEditing, isPersisted, message, styleId, variantRows]);

  const designerOptions = useMemo(() => meta?.designers ?? [], [meta]);
  const overviewStats = useMemo(
    () => [
      { label: '颜色', value: normalizedColors.length || 0 },
      { label: '尺码', value: normalizedSizes.length || 0 },
      { label: '细节图', value: detailImages.length || 0 },
      { label: '款式用料', value: bomDraft.lines.length || 0 },
    ],
    [bomDraft.lines.length, detailImages.length, normalizedColors.length, normalizedSizes.length],
  );

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="style-detail-page oc-page">
        <PageHeader
          className="oc-page-header--compact style-detail-identity-header"
          title={(
            <span className="style-detail-identity-title">
              <span className="style-detail-identity-label">款式资料</span>
              <span className="style-detail-current-no">{watchedStyleNo?.trim() || '新建款式'}</span>
            </span>
          )}
          subtitle={(
            <span className="style-detail-overview-tags">
              {overviewStats.map((item) => <Tag key={item.label}>{item.label} {item.value}</Tag>)}
            </span>
          )}
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
                      <Input placeholder="例如 STY-2024-001" disabled={isPersisted} />
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

          <PageSection className="oc-page-section--compact style-detail-card style-detail-bom-card">
            <StyleBomSection
              lines={bomDraft.lines}
              colors={normalizedColors}
              sizes={normalizedSizes}
              validationIssues={bomDraft.validationIssues}
              onAdd={bomDraft.addLine}
              onUpdate={bomDraft.updateLine}
              onRemove={bomDraft.removeLine}
              onUpdateSizeConsumption={bomDraft.updateSizeConsumption}
              onCopySizeConsumptions={bomDraft.copySizeConsumptions}
            />
          </PageSection>
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

      <StyleBomSaveImpactModal
        open={impactOpen}
        loading={impactLoading}
        saving={saving}
        preview={impactPreview}
        onCancel={() => {
          setImpactOpen(false);
          setImpactPreview(undefined);
          setPendingSave(undefined);
        }}
        onRangePreview={(historyStart, historyEnd) => void previewBomImpact(historyStart, historyEnd)}
        onConfirm={(decision) => {
          if (pendingSave && impactPreview) {
            void executeSave(pendingSave.payload, pendingSave.confirmCodeImpact, decision, impactPreview.previewToken);
          }
        }}
      />
    </Spin>
  );
};

export default StyleDetail;
