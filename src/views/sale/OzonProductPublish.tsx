import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Layout,
  Menu,
  Progress,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  EditOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  HomeOutlined,
  LinkOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import stylesApi from '../../api/styles';
import ListImage from '../../components/common/ListImage';
import { getSaleChannelAccountDisplayName } from '../../components/sale/sale-channel-account-helper';
import type {
  SaleChannelAccount,
  SaleProductPublishBatch,
  SaleProductPublishItem,
  SaleProductPublishSourceProduct,
} from '../../types/sale';
import type { StyleData } from '../../types/style';
import './sale-workspace.css';
import './ozon-product-publish.css';

const { Content, Header, Sider } = Layout;
const { Text, Title } = Typography;

type FlowStage = 'idle' | 'sources' | 'draft' | 'published' | 'deleted' | 'error';

type OzonProductPublishProps = {
  demoState?: FlowStage;
};

type AttributeEditorRow = {
  key: string;
  id?: string;
  complexId?: string;
  name?: string;
  groupName?: string;
  required?: boolean;
  type?: string;
  valueText: string;
};

type DraftEditorState = {
  name: string;
  offerId: string;
  price: string;
  currencyCode: string;
  descriptionCategoryId: string;
  descriptionCategoryName: string;
  typeId: string;
  typeName: string;
  primaryImage: string;
  imagesText: string;
  width: string;
  height: string;
  depth: string;
  dimensionUnit: string;
  weight: string;
  weightUnit: string;
  attributes: AttributeEditorRow[];
};

const menuItems = [
  { key: '/sale/workbench', icon: <HomeOutlined />, label: <Link to="/sale/workbench">今日工作台</Link> },
  { key: '/sale/products/sync', icon: <SyncOutlined />, label: <Link to="/sale/products/sync">商品同步</Link> },
  { key: '/sale/ozon/listing', icon: <CloudUploadOutlined />, label: <Link to="/sale/ozon/listing">Ozon 铺货</Link> },
  { key: '/sale/products/bindings', icon: <LinkOutlined />, label: <Link to="/sale/products/bindings">商品绑定</Link> },
  { key: '/sale/orders/issues', icon: <FileSearchOutlined />, label: <Link to="/sale/orders/issues">FBS 订单</Link> },
  { key: '/sale/shops', icon: <ShopOutlined />, label: <Link to="/sale/shops">店铺管理</Link> },
];

const demoLocalRows: StyleData[] = [
  {
    id: '101',
    styleNo: 'JK-2026-001',
    styleName: '女士轻薄防晒夹克',
    image: '/operation-guide/48-basic-styles.png',
    colors: ['黑色', '米白'],
    sizes: ['S', 'M', 'L'],
    status: 'active',
    defaultUnit: '件',
  },
  {
    id: '102',
    styleNo: 'TS-2026-018',
    styleName: '男士速干圆领T恤',
    image: '/operation-guide/49-basic-material.png',
    colors: ['灰色', '藏青'],
    sizes: ['M', 'L', 'XL'],
    status: 'active',
    defaultUnit: '件',
  },
];

const demoReferenceRows: SaleProductPublishSourceProduct[] = [
  {
    productId: 4595303167,
    offerId: 'REF-JACKET-001',
    name: 'Ozon 同类目夹克参考商品',
    visibility: 'VISIBLE',
    raw: { price: '99.00', currency_code: 'CNY', description_category_id: '17028922', description_category_name: 'Одежда', type_id: '93134', type_name: 'Куртка', stock: 38 },
  },
  {
    productId: 4595303168,
    offerId: 'REF-TSHIRT-001',
    name: 'Ozon 同类目T恤参考商品',
    visibility: 'VISIBLE',
    raw: { price: '109.00', currency_code: 'CNY', description_category_id: '17028922', description_category_name: 'Одежда', type_id: '93134', type_name: 'Футболка', stock: 22 },
  },
];

const statusColor = (value?: string | null) => {
  const normalized = (value || '').toUpperCase();
  if (normalized.includes('FAILED') || normalized.includes('BLOCKED')) return 'error';
  if (normalized.includes('SUBMITTED') || normalized.includes('PROCESSING')) return 'processing';
  if (normalized.includes('SUCCESS') || normalized.includes('READY') || normalized.includes('CLEANED')) return 'success';
  if (normalized.includes('DRAFT') || normalized.includes('VALIDATED') || normalized.includes('PENDING')) return 'warning';
  return 'default';
};

const statusLabel = (value?: string | null) => {
  const normalized = (value || '').toUpperCase();
  const labels: Record<string, string> = {
    DRAFT: '草稿',
    VALIDATED: '已体检',
    SUBMITTED: '已提交',
    PARTIAL_SUCCESS: '部分成功',
    SUCCESS: '发布成功',
    FAILED: '发布失败',
    CLEANED: '已删除',
    READY: '可发布',
    BLOCKED: '阻塞',
    PROCESSING: '平台处理中',
    PENDING: '待处理',
  };
  return labels[normalized] || value || '--';
};

const createOfferPrefix = () => {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `OZON-${stamp}`;
};

const stringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const readRawText = (record: SaleProductPublishSourceProduct, ...keys: string[]) => {
  const raw = record.raw || {};
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
};

const readRawNumber = (record: SaleProductPublishSourceProduct, ...keys: string[]) => {
  const text = readRawText(record, ...keys);
  return text ? Number(text) : undefined;
};

const readPayloadText = (payload: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
};

const normalizeOfferSegment = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const getAttributeValueText = (attribute: Record<string, unknown>) => {
  const values = Array.isArray(attribute.values) ? attribute.values : [];
  return values
    .map((value) => {
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return stringValue(record.value || record.dictionary_value_id);
      }
      return stringValue(value);
    })
    .filter(Boolean)
    .join('\n');
};

const parseAttributes = (item?: Record<string, unknown> | null): AttributeEditorRow[] => {
  const attributes = Array.isArray(item?.attributes) ? item?.attributes as Array<Record<string, unknown>> : [];
  return attributes.map((attribute, index) => ({
    key: `${attribute.id || 'attr'}-${attribute.complex_id || 0}-${index}`,
    id: stringValue(attribute.id),
    complexId: stringValue(attribute.complex_id),
    name: stringValue(attribute.attribute_name || attribute.name),
    groupName: stringValue(attribute.attribute_group_name || attribute.group_name),
    required: Boolean(attribute.attribute_required ?? attribute.is_required),
    type: stringValue(attribute.attribute_type || attribute.type),
    valueText: getAttributeValueText(attribute),
  }));
};

const collectDraftImageUrls = (draftEditor: DraftEditorState) => {
  const seen = new Set<string>();
  return [
    draftEditor.primaryImage,
    ...draftEditor.imagesText.split('\n'),
  ]
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
};

const createDemoBatch = (state: FlowStage): SaleProductPublishBatch | undefined => {
  if (!['draft', 'published', 'deleted', 'error'].includes(state)) return undefined;
  const blocked = state === 'error';
  return {
    batchId: '90001',
    channelAccountId: '9001',
    platformCode: 'OZON',
    batchNo: 'OZON-20260520103000',
    batchName: 'Ozon 铺货批次',
    mode: 'PRODUCTION',
    sourceType: 'LOCAL_STYLE_WITH_OZON_REFERENCE',
    status: state === 'deleted' ? 'CLEANED' : state === 'published' ? 'SUCCESS' : blocked ? 'DRAFT' : 'VALIDATED',
    totalCount: 2,
    readyCount: blocked ? 1 : 2,
    blockedCount: blocked ? 1 : 0,
    submittedCount: ['published', 'deleted'].includes(state) ? 2 : 0,
    successCount: ['published', 'deleted'].includes(state) ? 2 : 0,
    failedCount: 0,
    cleanedCount: state === 'deleted' ? 2 : 0,
    taskId: ['published', 'deleted'].includes(state) ? 4482776225 : undefined,
    requestId: ['published', 'deleted'].includes(state) ? 'demo-request-id' : undefined,
    items: demoLocalRows.map((local, index) => ({
      itemId: index + 1,
      localStyleId: local.id,
      localStyleNo: local.styleNo,
      referenceProductId: demoReferenceRows[0].productId,
      referenceOfferId: demoReferenceRows[0].offerId,
      sourceProductId: demoReferenceRows[0].productId,
      sourceOfferId: demoReferenceRows[0].offerId,
      targetProductId: ['published', 'deleted'].includes(state) ? 4627913883 + index : undefined,
      targetOfferId: `OZON-20260520103000-${index + 1}`,
      productName: local.styleName,
      imageUrl: local.image,
      categoryId: '17028922',
      attributeCount: blocked && index === 1 ? 0 : 18,
      imageCount: 6,
      price: index === 0 ? '99.00' : '109.00',
      currencyCode: 'CNY',
      validationStatus: blocked && index === 1 ? 'BLOCKED' : 'READY',
      validationIssueCount: blocked && index === 1 ? 1 : 0,
      validationIssues: blocked && index === 1 ? [{ field: 'attributes', severity: 'BLOCKER', message: '关键属性缺少有效值' }] : [],
      publishStatus: ['published', 'deleted'].includes(state) ? 'SUCCESS' : 'DRAFT',
      platformStatus: ['published', 'deleted'].includes(state) ? 'imported' : undefined,
      platformErrors: [],
      cleanupStatus: state === 'deleted' ? 'CLEANED' : 'PENDING',
      cleanupMessage: state === 'deleted' ? '已归档并删除' : undefined,
      item: {
        offer_id: `OZON-20260520103000-${index + 1}`,
        name: local.styleName,
        price: index === 0 ? '99.00' : '109.00',
        currency_code: 'CNY',
        description_category_id: 17028922,
        description_category_name: 'Одежда',
        category_name: 'Одежда',
        type_id: 93134,
        type_name: index === 0 ? 'Куртка' : 'Футболка',
        primary_image: local.image,
        images: local.image ? [local.image] : [],
        width: 300,
        height: 20,
        depth: 240,
        dimension_unit: 'mm',
        weight: 450,
        weight_unit: 'g',
        attributes: [
          { id: 85, complex_id: 0, attribute_name: '颜色', attribute_group_name: '基础属性', attribute_required: true, attribute_type: 'String', values: [{ value: local.colors[0] || '黑色' }] },
          { id: 9048, complex_id: 0, attribute_name: '尺码', attribute_group_name: '基础属性', attribute_required: true, attribute_type: 'String', values: [{ value: local.sizes.join(', ') }] },
          { id: 10096, complex_id: 0, attribute_name: '材质', attribute_group_name: '商品特征', attribute_required: false, attribute_type: 'String', values: [{ value: 'polyester' }] },
        ],
      },
    })),
  };
};

const OzonProductPublish = ({ demoState }: OzonProductPublishProps) => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [accountId, setAccountId] = useState<string>();
  const [localProducts, setLocalProducts] = useState<StyleData[]>([]);
  const [referenceProducts, setReferenceProducts] = useState<SaleProductPublishSourceProduct[]>([]);
  const [selectedLocalKeys, setSelectedLocalKeys] = useState<Key[]>([]);
  const [selectedReferenceKey, setSelectedReferenceKey] = useState<Key>();
  const [localKeyword, setLocalKeyword] = useState('');
  const [referenceKeyword, setReferenceKeyword] = useState('');
  const [offerPrefix, setOfferPrefix] = useState(createOfferPrefix());
  const [currentBatch, setCurrentBatch] = useState<SaleProductPublishBatch>();
  const [batches, setBatches] = useState<SaleProductPublishBatch[]>([]);
  const [detailItem, setDetailItem] = useState<SaleProductPublishItem>();
  const [draftEditor, setDraftEditor] = useState<DraftEditorState>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorText, setErrorText] = useState<string>();
  const [credentialMessage, setCredentialMessage] = useState<string>();

  const ozonAccounts = useMemo(
    () => accounts.filter((account) => account.platformCode?.toUpperCase() === 'OZON'),
    [accounts],
  );
  const selectedAccount = ozonAccounts.find((account) => account.id === accountId);
  const currentItems = currentBatch?.items || [];
  const readyPercent = currentBatch?.totalCount ? Math.round(((currentBatch.readyCount || 0) / currentBatch.totalCount) * 100) : 0;

  const referenceRowKey = (record: SaleProductPublishSourceProduct) => String(record.offerId || record.productId);
  const selectedReference = referenceProducts.find((item) => referenceRowKey(item) === selectedReferenceKey);

  const filteredLocalProducts = useMemo(() => {
    const keyword = localKeyword.trim().toLowerCase();
    if (!keyword) return localProducts;
    return localProducts.filter((item) =>
      [item.styleName, item.styleNo, item.colors.join(','), item.sizes.join(',')].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [localKeyword, localProducts]);

  const filteredReferenceProducts = useMemo(() => {
    const keyword = referenceKeyword.trim().toLowerCase();
    if (!keyword) return referenceProducts;
    return referenceProducts.filter((item) =>
      [item.name, item.offerId, String(item.productId || '')].some((value) => (value || '').toLowerCase().includes(keyword)),
    );
  }, [referenceKeyword, referenceProducts]);

  const loadBatches = useCallback(async (nextAccountId?: string) => {
    const targetAccountId = nextAccountId || accountId;
    if (!targetAccountId || demoState) return;
    try {
      const result = await saleApi.listProductPublishBatches(Number(targetAccountId));
      setBatches(result.list || []);
      setCurrentBatch((current) => current || result.list?.[0]);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '铺货批次读取失败');
    }
  }, [accountId, demoState]);

  const loadAccounts = useCallback(async () => {
    if (demoState) return;
    setInitialLoading(true);
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
      const firstOzon = list.find((account) => account.platformCode?.toUpperCase() === 'OZON');
      if (firstOzon) {
        setAccountId((current) => current || firstOzon.id);
        await loadBatches(firstOzon.id);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '店铺列表读取失败');
    } finally {
      setInitialLoading(false);
    }
  }, [demoState, loadBatches]);

  useEffect(() => {
    if (demoState) {
      const demoAccount: SaleChannelAccount = {
        id: '9001',
        platformCode: 'OZON',
        accountName: 'Ozon 店铺',
        shopName: 'Ozon 店铺',
        regionCode: 'RU',
        status: 'ACTIVE',
      };
      const demoBatch = createDemoBatch(demoState);
      setAccounts([demoAccount]);
      setAccountId(demoAccount.id);
      setLocalProducts(demoState === 'idle' ? [] : demoLocalRows);
      setReferenceProducts(demoState === 'idle' ? [] : demoReferenceRows);
      setSelectedLocalKeys(demoState === 'idle' ? [] : demoLocalRows.map((item) => item.id));
      setSelectedReferenceKey(demoState === 'idle' ? undefined : referenceRowKey(demoReferenceRows[0]));
      setCurrentBatch(demoBatch);
      setBatches(demoBatch ? [demoBatch] : []);
      setErrorText(demoState === 'error' ? '1 个商品存在发布前阻塞项，请先修正后再提交。' : undefined);
      setInitialLoading(false);
      return;
    }
    void loadAccounts();
  }, [demoState, loadAccounts]);

  const guardedAccountId = () => {
    if (!accountId) {
      setErrorText('请选择 Ozon 店铺');
      return undefined;
    }
    return Number(accountId);
  };

  const handleAccountChange = (value: string) => {
    setAccountId(value);
    setReferenceProducts([]);
    setSelectedReferenceKey(undefined);
    setCurrentBatch(undefined);
    setBatches([]);
    setErrorText(undefined);
    setCredentialMessage(undefined);
    void loadBatches(value);
  };

  const checkCredential = async () => {
    if (!accountId) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.checkToken(accountId);
      setCredentialMessage(result.message || (result.passed ? 'Ozon 凭证可用' : 'Ozon 凭证检查未通过'));
      if (!result.passed) setErrorText(result.message || 'Ozon 凭证检查未通过');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Ozon 凭证检查失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLocalProducts = async () => {
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await stylesApi.list({ page: 1, pageSize: 50, keyword: localKeyword.trim() || undefined });
      setLocalProducts(result.list || []);
      setSelectedLocalKeys([]);
      messageApi.success(`已读取 ${result.list?.length || 0} 个本地商品`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '本地商品读取失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceProducts = async () => {
    const channelAccountId = guardedAccountId();
    if (!channelAccountId) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const keyword = referenceKeyword.trim();
      const result = await saleApi.listProductPublishSources({
        channelAccountId,
        limit: 30,
        keyword: keyword || undefined,
      });
      setReferenceProducts(result.list || []);
      setSelectedReferenceKey(undefined);
      messageApi.success(keyword ? `已匹配 ${result.list?.length || 0} 个参考商品` : `已读取 ${result.list?.length || 0} 个参考商品`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '参考商品读取失败');
    } finally {
      setLoading(false);
    }
  };

  const createBatch = async () => {
    const channelAccountId = guardedAccountId();
    if (!channelAccountId) return;
    if (!selectedLocalKeys.length) {
      setErrorText('请先选择准备铺到 Ozon 的本地商品');
      return;
    }
    if (!selectedReference) {
      setErrorText('请选择一个 Ozon 参考商品，用于套用类目和属性结构');
      return;
    }
    if (selectedLocalKeys.length > 10) {
      setErrorText('单批次最多提交 10 个商品');
      return;
    }
    const selectedLocals = localProducts.filter((item) => selectedLocalKeys.includes(item.id));
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.createProductPublishBatchFromReference({
        channelAccountId,
        batchName: 'Ozon 铺货批次',
        offerPrefix,
        referenceOfferId: selectedReference.offerId || undefined,
        referenceProductId: selectedReference.productId ? Number(selectedReference.productId) : undefined,
        products: selectedLocals.map((item) => {
          const offerSegment = normalizeOfferSegment(item.styleNo || item.id);
          return {
            localStyleId: Number(item.id),
            targetOfferId: `${offerPrefix}-${offerSegment}`,
            name: item.styleName,
            primaryImageUrl: item.image,
            images: item.image ? [item.image] : [],
          };
        }),
      });
      setCurrentBatch(result);
      await loadBatches(String(channelAccountId));
      messageApi.success('铺货草稿已生成');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '铺货草稿生成失败');
    } finally {
      setLoading(false);
    }
  };

  const validateBatch = async () => {
    if (!currentBatch?.batchId) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.validateProductPublishBatch(currentBatch.batchId);
      setCurrentBatch(result);
      messageApi.success('发布前体检已完成');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '发布前体检失败');
    } finally {
      setLoading(false);
    }
  };

  const submitBatch = async () => {
    if (!currentBatch?.batchId) return;
    if ((currentBatch.blockedCount || 0) > 0) {
      setErrorText('当前批次仍有阻塞项，不能提交 Ozon');
      return;
    }
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.submitProductPublishBatch(currentBatch.batchId);
      setCurrentBatch(result);
      messageApi.success('Ozon 发品任务已提交');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Ozon 发品任务提交失败');
    } finally {
      setLoading(false);
    }
  };

  const queryTask = async () => {
    if (!currentBatch?.batchId) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.queryProductPublishBatchTask(currentBatch.batchId);
      setCurrentBatch(result);
      messageApi.success('发品任务状态已更新');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '发品任务查询失败');
    } finally {
      setLoading(false);
    }
  };

  const openDraftEditor = (item: SaleProductPublishItem) => {
    const payload = item.item || {};
    setDetailItem(item);
    setDraftEditor({
      name: stringValue(payload.name || item.productName),
      offerId: stringValue(payload.offer_id || item.targetOfferId),
      price: stringValue(payload.price || item.price),
      currencyCode: stringValue(payload.currency_code || item.currencyCode || 'CNY'),
      descriptionCategoryId: stringValue(payload.description_category_id || item.categoryId),
      descriptionCategoryName: readPayloadText(payload, 'description_category_name', 'category_name'),
      typeId: stringValue(payload.type_id),
      typeName: readPayloadText(payload, 'type_name'),
      primaryImage: stringValue(payload.primary_image || item.imageUrl),
      imagesText: Array.isArray(payload.images) ? payload.images.map(stringValue).join('\n') : '',
      width: stringValue(payload.width),
      height: stringValue(payload.height),
      depth: stringValue(payload.depth),
      dimensionUnit: stringValue(payload.dimension_unit || 'mm'),
      weight: stringValue(payload.weight),
      weightUnit: stringValue(payload.weight_unit || 'g'),
      attributes: parseAttributes(payload),
    });
  };

  const updateDraftField = (field: keyof DraftEditorState, value: string) => {
    setDraftEditor((current) => current ? { ...current, [field]: value } : current);
  };

  const updateAttributeValue = (rowKey: string, valueText: string) => {
    setDraftEditor((current) => current ? {
      ...current,
      attributes: current.attributes.map((row) => row.key === rowKey ? { ...row, valueText } : row),
    } : current);
  };

  const buildEditedPayload = () => {
    const base = { ...(detailItem?.item || {}) };
    const originalAttributes = Array.isArray(base.attributes) ? base.attributes as Array<Record<string, unknown>> : [];
    const nextAttributes = draftEditor?.attributes.map((row, index) => {
      const original = originalAttributes[index] || {};
      const originalText = getAttributeValueText(original);
      if (row.valueText === originalText) return original;
      const values = row.valueText
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => ({ value }));
      return {
        ...original,
        id: row.id ? Number(row.id) : original.id,
        complex_id: row.complexId ? Number(row.complexId) : original.complex_id,
        values,
      };
    }) || [];
    return {
      ...base,
      offer_id: draftEditor?.offerId.trim(),
      name: draftEditor?.name.trim(),
      price: draftEditor?.price.trim(),
      currency_code: draftEditor?.currencyCode.trim(),
      description_category_id: draftEditor?.descriptionCategoryId ? Number(draftEditor.descriptionCategoryId) : undefined,
      description_category_name: draftEditor?.descriptionCategoryName.trim() || base.description_category_name,
      category_name: draftEditor?.descriptionCategoryName.trim() || base.category_name,
      type_id: draftEditor?.typeId ? Number(draftEditor.typeId) : undefined,
      type_name: draftEditor?.typeName.trim() || base.type_name,
      primary_image: draftEditor?.primaryImage.trim(),
      images: draftEditor?.imagesText.split('\n').map((item) => item.trim()).filter(Boolean),
      width: draftEditor?.width ? Number(draftEditor.width) : undefined,
      height: draftEditor?.height ? Number(draftEditor.height) : undefined,
      depth: draftEditor?.depth ? Number(draftEditor.depth) : undefined,
      dimension_unit: draftEditor?.dimensionUnit.trim(),
      weight: draftEditor?.weight ? Number(draftEditor.weight) : undefined,
      weight_unit: draftEditor?.weightUnit.trim(),
      attributes: nextAttributes,
    };
  };

  const saveDraft = async () => {
    if (!currentBatch?.batchId || !detailItem?.itemId || !draftEditor) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.updateProductPublishDraft(currentBatch.batchId, detailItem.itemId, {
        item: buildEditedPayload(),
      });
      setCurrentBatch(result);
      const nextItem = (result.items || []).find((item) => String(item.itemId) === String(detailItem.itemId));
      setDetailItem(nextItem);
      if (nextItem) openDraftEditor(nextItem);
      messageApi.success('铺货草稿已保存');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '铺货草稿保存失败');
    } finally {
      setLoading(false);
    }
  };

  const localColumns: ColumnsType<StyleData> = [
    {
      title: '本地商品',
      dataIndex: 'styleName',
      render: (_, record) => (
        <div className="opp-product-cell">
          <ListImage src={record.image} alt={record.styleName || record.styleNo} width={44} height={44} borderRadius={8} />
          <div className="opp-product-cell__body">
            <Text strong ellipsis={{ tooltip: record.styleName }}>{record.styleName || '--'}</Text>
            <Text type="secondary" className="opp-mono">{record.styleNo || '--'}</Text>
          </div>
        </div>
      ),
    },
    { title: '颜色', width: 160, render: (_, record) => <Text>{record.colors.length ? record.colors.join(' / ') : '--'}</Text> },
    { title: '尺码', width: 160, render: (_, record) => <Text>{record.sizes.length ? record.sizes.join(' / ') : '--'}</Text> },
    { title: '单位', width: 90, render: (_, record) => <Text>{record.defaultUnit || '--'}</Text> },
  ];

  const referenceColumns: ColumnsType<SaleProductPublishSourceProduct> = [
    {
      title: '参考商品',
      dataIndex: 'name',
      render: (_, record) => (
        <div className="opp-product-cell">
          <ListImage src={record.imageUrl} alt={record.name || record.offerId || 'Ozon 商品'} width={40} height={40} borderRadius={8} />
          <div className="opp-product-cell__body">
            <Text strong ellipsis={{ tooltip: record.name || '--' }}>{record.name || '--'}</Text>
            <Text type="secondary" className="opp-mono">{record.offerId || '--'}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '类目/类型',
      width: 170,
      render: (_, record) => {
        const categoryName = readRawText(record, 'description_category_name', 'category_name');
        const typeName = readRawText(record, 'type_name');
        const categoryId = readRawText(record, 'description_category_id', 'category_id');
        return (
          <div className="opp-attribute-cell">
            <Text>{[categoryName, typeName].filter(Boolean).join(' / ') || '类目待识别'}</Text>
            {categoryId ? <Text type="secondary" className="opp-mono">ID {categoryId}</Text> : null}
          </div>
        );
      },
    },
    { title: '库存', width: 82, render: (_, record) => <Text>{readRawNumber(record, 'stock', 'fbs_present') ?? '--'}</Text> },
  ];

  const itemColumns: ColumnsType<SaleProductPublishItem> = [
    {
      title: '铺货草稿',
      dataIndex: 'productName',
      render: (_, record) => (
        <div className="opp-product-cell">
          <ListImage src={record.imageUrl} alt={record.productName || record.targetOfferId || 'Ozon 草稿'} width={44} height={44} borderRadius={8} />
          <div className="opp-product-cell__body">
            <Text strong ellipsis={{ tooltip: record.productName || '--' }}>{record.productName || '--'}</Text>
            <Text type="secondary" className="opp-mono">{record.targetOfferId || '--'}</Text>
          </div>
        </div>
      ),
    },
    { title: '本地款号', width: 132, render: (_, record) => <Text className="opp-mono">{record.localStyleNo || '--'}</Text> },
    { title: '参考 offer', width: 138, render: (_, record) => <Text className="opp-mono">{record.referenceOfferId || record.sourceOfferId || '--'}</Text> },
    { title: '体检', width: 110, render: (_, record) => <Tag color={statusColor(record.validationStatus)}>{statusLabel(record.validationStatus)}</Tag> },
    { title: '属性/图片', width: 118, render: (_, record) => <Text>{record.attributeCount || 0} / {record.imageCount || 0}</Text> },
    { title: '价格', width: 110, render: (_, record) => <Text>{record.price || '--'} {record.currencyCode || ''}</Text> },
    { title: '发布', width: 120, render: (_, record) => <Tag color={statusColor(record.publishStatus)}>{statusLabel(record.publishStatus)}</Tag> },
    { title: '操作', width: 108, render: (_, record) => <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openDraftEditor(record)}>编辑属性</Button> },
  ];

  const attributeColumns: ColumnsType<AttributeEditorRow> = [
    {
      title: '属性',
      dataIndex: 'name',
      width: 220,
      render: (_, record) => (
        <div className="opp-attribute-cell">
          <Space size={6} wrap>
            <Text strong>{record.name || '属性名称待同步'}</Text>
            {record.required ? <Tag color="red">必填</Tag> : null}
            {record.type ? <Tag>{record.type}</Tag> : null}
          </Space>
          <Text type="secondary" className="opp-mono">ID {record.id || '--'}</Text>
        </div>
      ),
    },
    {
      title: '分组',
      dataIndex: 'groupName',
      width: 150,
      render: (_, record) => (
        <div className="opp-attribute-cell">
          <Text>{record.groupName || '默认分组'}</Text>
          <Text type="secondary" className="opp-mono">组 {record.complexId || '0'}</Text>
        </div>
      ),
    },
    {
      title: '属性值',
      dataIndex: 'valueText',
      render: (_, record) => (
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={record.valueText}
          onChange={(event) => updateAttributeValue(record.key, event.target.value)}
          placeholder="一行一个属性值"
        />
      ),
    },
  ];

  const draftImagePreviewUrls = draftEditor ? collectDraftImageUrls(draftEditor) : [];

  return (
    <Layout className="opp-layout">
      {contextHolder}
      <Sider width={228} breakpoint="lg" collapsedWidth={80} className="scw-sider">
        <div className="scw-brand">
          <img src="/assets/images/logo.png" alt="易供云" className="scw-brand__icon" />
          <div>
            <div className="scw-brand__title">销售中心 V1</div>
            <div className="scw-brand__subtitle">Ozon 铺货中心</div>
          </div>
        </div>
        <Menu className="scw-menu" mode="inline" selectedKeys={['/sale/ozon/listing']} defaultOpenKeys={['product-group']} items={menuItems} />
      </Sider>
      <Layout className="scw-main">
        <Header className="opp-header">
          <div>
            <Title level={2} className="scw-page-title">Ozon 铺货中心</Title>
            <Text type="secondary">从本地商品库生成 Ozon 铺货草稿，参考已上架商品套用类目属性，提交前完成属性、图片、价格和货号体检。</Text>
          </div>
          <Space wrap className="opp-header-actions">
            <Button icon={<ShopOutlined />} onClick={() => navigate('/sale/shops')}>店铺管理</Button>
            <Button icon={<ReloadOutlined />} onClick={() => void loadAccounts()}>刷新</Button>
          </Space>
        </Header>
        <Content className="opp-content">
          <Spin spinning={initialLoading || loading}>
            <section className="opp-toolbar">
              <Space wrap size={12}>
                <Select
                  value={accountId}
                  onChange={handleAccountChange}
                  placeholder="选择 Ozon 店铺"
                  style={{ width: 260 }}
                  options={ozonAccounts.map((account) => ({ value: account.id, label: getSaleChannelAccountDisplayName(account) }))}
                />
                <Input
                  className="opp-prefix-input"
                  value={offerPrefix}
                  onChange={(event) => setOfferPrefix(event.target.value)}
                  prefix={<CloudUploadOutlined />}
                  placeholder="目标货号前缀"
                />
                <Button icon={<SafetyCertificateOutlined />} disabled={!selectedAccount} onClick={() => void checkCredential()}>检查凭证</Button>
                <Button icon={<ReloadOutlined />} onClick={() => void loadLocalProducts()}>读取本地商品</Button>
                <Button type="primary" icon={<ReloadOutlined />} disabled={!selectedAccount} onClick={() => void loadReferenceProducts()}>读取参考商品</Button>
              </Space>
              <Tag color="processing">正式发品</Tag>
            </section>

            {!selectedAccount && !initialLoading ? (
              <Alert className="opp-state-banner" type="warning" showIcon message="暂无 Ozon 店铺" description="请先在店铺管理中绑定 Ozon 店铺凭证。" />
            ) : null}
            {credentialMessage ? <Alert className="opp-state-banner" type="info" showIcon message={credentialMessage} /> : null}
            {errorText ? <Alert className="opp-state-banner" type="error" showIcon message="当前流程存在问题" description={errorText} /> : null}

            <section className="opp-metrics">
              <div className="opp-metric"><Statistic title="本地商品" value={localProducts.length} /></div>
              <div className="opp-metric"><Statistic title="参考商品" value={referenceProducts.length} /></div>
              <div className="opp-metric"><Statistic title="草稿商品" value={currentBatch?.totalCount || 0} /></div>
              <div className="opp-metric"><Statistic title="可发布" value={currentBatch?.readyCount || 0} /></div>
              <div className="opp-metric"><Statistic title="阻塞项" value={currentBatch?.blockedCount || 0} valueStyle={{ color: (currentBatch?.blockedCount || 0) > 0 ? '#cf1322' : undefined }} /></div>
              <div className="opp-metric"><Statistic title="发布成功" value={currentBatch?.successCount || 0} /></div>
            </section>

            <div className="opp-grid">
              <section className="opp-panel opp-panel--wide">
                <div className="opp-section-title">
                  <div>
                    <Text strong>本地待铺货商品</Text>
                    <Text type="secondary">选择准备上架到 Ozon 的本地商品，系统会用本地标题、款号和图片生成铺货草稿。</Text>
                  </div>
                  <Space wrap>
                    <Input.Search allowClear placeholder="搜索款号 / 标题 / 颜色 / 尺码" value={localKeyword} onChange={(event) => setLocalKeyword(event.target.value)} onSearch={() => void loadLocalProducts()} />
                    <Button icon={<FileProtectOutlined />} disabled={!selectedLocalKeys.length || !selectedReference} onClick={() => void createBatch()}>
                      生成铺货草稿
                    </Button>
                  </Space>
                </div>
                {filteredLocalProducts.length ? (
                  <Table
                    rowKey={(record) => record.id}
                    size="middle"
                    columns={localColumns}
                    dataSource={filteredLocalProducts}
                    rowSelection={{
                      selectedRowKeys: selectedLocalKeys,
                      onChange: setSelectedLocalKeys,
                      getCheckboxProps: (record) => ({
                        disabled: selectedLocalKeys.length >= 10 && !selectedLocalKeys.includes(record.id),
                      }),
                    }}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                    scroll={{ x: 760 }}
                  />
                ) : (
                  <Empty description={localProducts.length ? '没有匹配的本地商品' : '读取本地商品后开始选择'} />
                )}
              </section>

              <section className="opp-panel opp-panel--wide">
                <div className="opp-section-title">
                  <div>
                    <Text strong>Ozon 参考商品</Text>
                    <Text type="secondary">参考商品只用于套用类目、属性结构、尺寸重量字段，不作为铺货商品来源。</Text>
                  </div>
                  <Input.Search
                    className="opp-search-compact"
                    allowClear
                    enterButton="精准搜索"
                    placeholder="输入 offer_id 或 product_id"
                    value={referenceKeyword}
                    onChange={(event) => setReferenceKeyword(event.target.value)}
                    onSearch={() => void loadReferenceProducts()}
                  />
                </div>
                {filteredReferenceProducts.length ? (
                  <Table
                    rowKey={referenceRowKey}
                    size="middle"
                    columns={referenceColumns}
                    dataSource={filteredReferenceProducts}
                    rowSelection={{
                      type: 'radio',
                      selectedRowKeys: selectedReferenceKey ? [selectedReferenceKey] : [],
                      onChange: (keys) => setSelectedReferenceKey(keys[0]),
                    }}
                    pagination={{ pageSize: 6, showSizeChanger: false }}
                    scroll={{ x: 720 }}
                  />
                ) : (
                  <Empty description={referenceProducts.length ? '没有匹配的参考商品' : '读取 Ozon 参考商品后选择一个类目相近的商品'} />
                )}
              </section>

              <section className="opp-panel">
                <div className="opp-section-title">
                  <div>
                    <Text strong>当前批次</Text>
                    <Text type="secondary">{currentBatch?.batchNo || '尚未生成铺货草稿'}</Text>
                  </div>
                  <Tag color={statusColor(currentBatch?.status)}>{statusLabel(currentBatch?.status)}</Tag>
                </div>
                {currentBatch ? (
                  <Space direction="vertical" size={12} className="opp-full">
                    <Progress percent={readyPercent} status={(currentBatch.blockedCount || 0) > 0 ? 'exception' : 'active'} />
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="批次名称">{currentBatch.batchName || '--'}</Descriptions.Item>
                      <Descriptions.Item label="任务号">{currentBatch.taskId || '--'}</Descriptions.Item>
                      <Descriptions.Item label="请求 ID">{currentBatch.requestId || '--'}</Descriptions.Item>
                      <Descriptions.Item label="最后查询">{currentBatch.lastPolledAt || '--'}</Descriptions.Item>
                    </Descriptions>
                    <Space wrap>
                      <Button icon={<FileSearchOutlined />} onClick={() => void validateBatch()}>发布前体检</Button>
                      <Button type="primary" icon={<CloudUploadOutlined />} disabled={!currentBatch.readyCount || !!currentBatch.blockedCount} onClick={() => void submitBatch()}>提交 Ozon</Button>
                      <Button icon={<ReloadOutlined />} disabled={!currentBatch.taskId} onClick={() => void queryTask()}>查询任务</Button>
                    </Space>
                  </Space>
                ) : (
                  <Alert type="info" showIcon message="批次流程" description="先选择本地商品和参考商品，再生成可编辑的 Ozon 铺货草稿。" />
                )}
              </section>

              <section className="opp-panel">
                <div className="opp-section-title">
                  <div>
                    <Text strong>发布前体检</Text>
                    <Text type="secondary">阻塞项必须清零后才允许提交平台。</Text>
                  </div>
                  {(currentBatch?.blockedCount || 0) > 0 ? <WarningOutlined className="opp-warning-icon" /> : <CheckCircleOutlined className="opp-success-icon" />}
                </div>
                {currentItems.length ? (
                  <Space direction="vertical" className="opp-full" size={12}>
                    {currentItems.flatMap((item) => item.validationIssues || []).slice(0, 4).map((issue, index) => (
                      <Alert key={`${issue.field}-${index}`} type="warning" showIcon message={issue.message || '存在阻塞项'} description={issue.field || undefined} />
                    ))}
                    {!currentItems.some((item) => (item.validationIssues || []).length) ? (
                      <Alert type="success" showIcon message="当前批次暂无阻塞项" description="可以提交体检通过的商品。" />
                    ) : null}
                  </Space>
                ) : (
                  <Empty description="生成草稿后查看体检结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </section>

              <section className="opp-panel opp-panel--wide">
                <div className="opp-section-title">
                  <div>
                    <Text strong>铺货草稿与任务结果</Text>
                    <Text type="secondary">草稿按商品维度保存，属性修改后会重新参与发布前体检。</Text>
                  </div>
                  <Select
                    placeholder="切换历史批次"
                    value={currentBatch?.batchId ? String(currentBatch.batchId) : undefined}
                    style={{ width: 260 }}
                    allowClear
                    onChange={(value) => setCurrentBatch(batches.find((batch) => String(batch.batchId) === value))}
                    options={batches.map((batch) => ({ value: String(batch.batchId), label: `${batch.batchNo || batch.batchId} · ${statusLabel(batch.status)}` }))}
                  />
                </div>
                {currentItems.length ? (
                  <Table
                    rowKey={(record) => String(record.itemId)}
                    size="middle"
                    columns={itemColumns}
                    dataSource={currentItems}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                    scroll={{ x: 1160 }}
                  />
                ) : (
                  <Empty description="暂无铺货草稿" />
                )}
              </section>
            </div>
          </Spin>
        </Content>
      </Layout>

      <Drawer
        title="编辑 Ozon 铺货草稿"
        open={!!detailItem}
        width={760}
        onClose={() => {
          setDetailItem(undefined);
          setDraftEditor(undefined);
        }}
        extra={<Button type="primary" onClick={() => void saveDraft()}>保存草稿</Button>}
      >
        {detailItem && draftEditor ? (
          <Space direction="vertical" size={16} className="opp-full">
            <div className="opp-draft-head">
              <ListImage src={draftEditor.primaryImage || detailItem.imageUrl} alt={draftEditor.name || detailItem.targetOfferId || 'Ozon 草稿'} width={64} height={64} borderRadius={8} />
              <div>
                <Text strong>{draftEditor.name || '--'}</Text>
                <Text type="secondary" className="opp-mono">{draftEditor.offerId || '--'}</Text>
              </div>
            </div>

            <div className="opp-edit-grid">
              <label><span>商品标题</span><Input value={draftEditor.name} onChange={(event) => updateDraftField('name', event.target.value)} /></label>
              <label><span>目标货号</span><Input value={draftEditor.offerId} onChange={(event) => updateDraftField('offerId', event.target.value)} /></label>
              <label><span>售价</span><Input value={draftEditor.price} onChange={(event) => updateDraftField('price', event.target.value)} /></label>
              <label><span>币种</span><Input value={draftEditor.currencyCode} onChange={(event) => updateDraftField('currencyCode', event.target.value)} /></label>
              <div className="opp-meta-field">
                <span>Ozon 类目</span>
                <Text strong>{draftEditor.descriptionCategoryName || '类目待识别'}</Text>
                <Text type="secondary" className="opp-mono">ID {draftEditor.descriptionCategoryId || '--'}</Text>
              </div>
              <div className="opp-meta-field">
                <span>商品类型</span>
                <Text strong>{draftEditor.typeName || '类型待识别'}</Text>
                <Text type="secondary" className="opp-mono">ID {draftEditor.typeId || '--'}</Text>
              </div>
              <label><span>宽度</span><Input value={draftEditor.width} onChange={(event) => updateDraftField('width', event.target.value)} /></label>
              <label><span>高度</span><Input value={draftEditor.height} onChange={(event) => updateDraftField('height', event.target.value)} /></label>
              <label><span>深度</span><Input value={draftEditor.depth} onChange={(event) => updateDraftField('depth', event.target.value)} /></label>
              <label><span>尺寸单位</span><Input value={draftEditor.dimensionUnit} onChange={(event) => updateDraftField('dimensionUnit', event.target.value)} /></label>
              <label><span>重量</span><Input value={draftEditor.weight} onChange={(event) => updateDraftField('weight', event.target.value)} /></label>
              <label><span>重量单位</span><Input value={draftEditor.weightUnit} onChange={(event) => updateDraftField('weightUnit', event.target.value)} /></label>
              <div className="opp-edit-grid__wide">
                <div className="opp-subsection-title">
                  <Text strong>商品图片</Text>
                  <Text type="secondary">缩略图用于核对图片内容，地址可继续编辑。</Text>
                </div>
                {draftImagePreviewUrls.length ? (
                  <div className="opp-image-preview-grid">
                    {draftImagePreviewUrls.map((url, index) => (
                      <div className="opp-image-preview-card" key={url}>
                        <ListImage src={url} alt={`${index === 0 ? '主图' : `附图 ${index}`}`} width={76} height={76} borderRadius={8} />
                        <div className="opp-image-preview-card__body">
                          <Text strong>{index === 0 ? '主图' : `附图 ${index}`}</Text>
                          <Text type="secondary" className="opp-mono" ellipsis={{ tooltip: url }}>{url}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="暂无商品图片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
              <label className="opp-edit-grid__wide"><span>主图地址</span><Input value={draftEditor.primaryImage} onChange={(event) => updateDraftField('primaryImage', event.target.value)} /></label>
              <label className="opp-edit-grid__wide"><span>附图地址</span><Input.TextArea rows={4} value={draftEditor.imagesText} onChange={(event) => updateDraftField('imagesText', event.target.value)} placeholder="每行一个图片地址" /></label>
            </div>

            <div>
              <div className="opp-subsection-title">
                <Text strong>类目属性</Text>
                <Text type="secondary">属性来自参考商品，可按新商品实际材质、颜色、适用场景等信息调整。</Text>
              </div>
              {draftEditor.attributes.length ? (
                <Table rowKey="key" size="small" columns={attributeColumns} dataSource={draftEditor.attributes} pagination={false} scroll={{ x: 760 }} />
              ) : (
                <Empty description="当前草稿没有可编辑属性" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Space>
        ) : null}
      </Drawer>
    </Layout>
  );
};

export default OzonProductPublish;
