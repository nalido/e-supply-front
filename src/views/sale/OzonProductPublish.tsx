import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key, UIEvent } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  Layout,
  Menu,
  Popconfirm,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClearOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  HomeOutlined,
  LinkOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SearchOutlined,
  ShopOutlined,
  SyncOutlined,
  UndoOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { saleApi } from '../../api/sale';
import stylesApi from '../../api/styles';
import ListImage from '../../components/common/ListImage';
import { getSaleChannelAccountDisplayName } from '../../components/sale/sale-channel-account-helper';
import ImageUploader from '../../components/upload/ImageUploader';
import type {
  SaleChannelAccount,
  SaleAsyncTask,
  SaleProductPublishBatch,
  SaleProductPublishItem,
  SaleProductPublishSourceProduct,
  SaleShopTag,
} from '../../types/sale';
import type { StyleData } from '../../types/style';
import '../../styles/matrix-table.css';
import './sale-workspace.css';
import './ozon-product-publish.css';

const { Content, Header, Sider } = Layout;
const { Text, Title } = Typography;
const REFERENCE_PAGE_SIZE = 30;

type ProductPayload = Record<string, unknown>;

type WorkbenchTabKey = 'selection' | 'draft';
type PublishMode = 'local-reference' | 'ozon-copy';

type OzonProductPublishProps = {
  embedded?: boolean;
};

type AttributeEditorRow = {
  key: string;
  id?: string;
  complexId?: string;
  name?: string;
  nameZh?: string;
  groupName?: string;
  groupNameZh?: string;
  required?: boolean;
  type?: string;
  valueText: string;
};

const menuItems = [
  { key: '/sale/workbench', icon: <HomeOutlined />, label: <Link to="/sale/workbench">今日工作台</Link> },
  { key: '/sale/products/sync', icon: <SyncOutlined />, label: <Link to="/sale/products/sync">商品同步</Link> },
  { key: '/sale/ozon/listing', icon: <CloudUploadOutlined />, label: <Link to="/sale/ozon/listing">Ozon 铺货</Link> },
  { key: '/sale/ozon/listing-details', icon: <FileSearchOutlined />, label: <Link to="/sale/ozon/listing-details">铺货明细</Link> },
  { key: '/sale/products/bindings', icon: <LinkOutlined />, label: <Link to="/sale/products/bindings">商品绑定</Link> },
  { key: '/sale/orders/issues', icon: <FileSearchOutlined />, label: <Link to="/sale/orders/issues">FBS 订单</Link> },
  { key: '/sale/shops', icon: <ShopOutlined />, label: <Link to="/sale/shops">店铺管理</Link> },
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

const normalizeOfferSegment = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const getAccountSearchText = (account: SaleChannelAccount) => [
  getSaleChannelAccountDisplayName(account),
  account.accountName,
  account.shopName,
  account.shopId,
  account.regionCode,
  account.id,
].map(stringValue).filter(Boolean).join(' ');

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
  return attributes.map((attribute, index) => {
    const id = stringValue(attribute.id);
    const complexId = stringValue(attribute.complex_id || 0);
    const name = stringValue(attribute.attribute_name || attribute.name);
    const key = id ? `${id}-${complexId}` : `attr-${name || index}-${complexId}`;
    return {
      key,
      id,
      complexId,
      name,
      nameZh: stringValue(attribute.attribute_name_zh || attribute.name_zh || attribute.name_cn),
      groupName: stringValue(attribute.attribute_group_name || attribute.group_name),
      groupNameZh: stringValue(attribute.attribute_group_name_zh || attribute.group_name_zh || attribute.group_name_cn),
      required: Boolean(attribute.attribute_required ?? attribute.is_required),
      type: stringValue(attribute.attribute_type || attribute.type),
      valueText: getAttributeValueText(attribute),
    };
  });
};

const collectPayloadImages = (payload?: ProductPayload | null) => (
  Array.isArray(payload?.images) ? payload.images.map(stringValue).map((item) => item.trim()).filter(Boolean) : []
);

const combinePrimaryAndAdditionalImages = (primaryImage?: string, additionalImages?: string[]) => {
  const seen = new Set<string>();
  return [primaryImage, ...(additionalImages || [])]
    .map((url) => stringValue(url).trim())
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const getItemPrimaryImage = (record: SaleProductPublishItem) => stringValue(record.item?.primary_image || record.imageUrl).trim();

const getItemAdditionalImages = (record: SaleProductPublishItem) => {
  const primaryImage = getItemPrimaryImage(record);
  const seen = new Set<string>();
  return collectPayloadImages(record.item)
    .filter((url) => {
      if (!url || url === primaryImage || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const getRequiredDraftMissingFields = (record: SaleProductPublishItem) => {
  const payload = record.item || {};
  const missingFields: string[] = [];
  if (!stringValue(payload.name || record.productName).trim()) missingFields.push('商品标题');
  if (!stringValue(payload.offer_id || record.targetOfferId).trim()) missingFields.push('目标货号');
  if (!stringValue(payload.price || record.price).trim()) missingFields.push('价格');
  if (!getItemPrimaryImage(record)) missingFields.push('主图');
  parseAttributes(payload)
    .filter((attribute) => attribute.required && !attribute.valueText.trim())
    .forEach((attribute) => {
      const label = [attribute.nameZh, attribute.name].filter(Boolean).join(' / ') || `属性 ${attribute.id || ''}`.trim();
      missingFields.push(label);
    });
  return missingFields;
};

const getDraftItemLabel = (record: SaleProductPublishItem) => (
  stringValue(record.item?.name || record.productName || record.item?.offer_id || record.targetOfferId || record.itemId).trim() || String(record.itemId)
);

const isTaskActive = (task?: SaleAsyncTask) => {
  const status = (task?.status || '').toUpperCase();
  return ['PENDING', 'RUNNING', 'PROCESSING'].includes(status);
};

const OzonProductPublish = ({ embedded = false }: OzonProductPublishProps) => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [accountSearching, setAccountSearching] = useState(false);
  const [accountId, setAccountId] = useState<string>();
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const [targetTagIds, setTargetTagIds] = useState<string[]>([]);
  const [publishMode, setPublishMode] = useState<PublishMode>('local-reference');
  const [localProducts, setLocalProducts] = useState<StyleData[]>([]);
  const [referenceProducts, setReferenceProducts] = useState<SaleProductPublishSourceProduct[]>([]);
  const [referenceTotal, setReferenceTotal] = useState(0);
  const [referenceNextLastId, setReferenceNextLastId] = useState<string>();
  const [referenceHasMore, setReferenceHasMore] = useState(false);
  const [referenceLoadingMore, setReferenceLoadingMore] = useState(false);
  const [selectedLocalKeys, setSelectedLocalKeys] = useState<Key[]>([]);
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<Key[]>([]);
  const [selectedReferenceKey, setSelectedReferenceKey] = useState<Key>();
  const [localKeyword, setLocalKeyword] = useState('');
  const [referenceKeyword, setReferenceKeyword] = useState('');
  const [offerPrefix, setOfferPrefix] = useState(createOfferPrefix());
  const [currentBatch, setCurrentBatch] = useState<SaleProductPublishBatch>();
  const [latestTask, setLatestTask] = useState<SaleAsyncTask>();
  const [shopTags, setShopTags] = useState<SaleShopTag[]>([]);
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(() => new Set());
  const [dirtyCellKeys, setDirtyCellKeys] = useState<Set<string>>(() => new Set());
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<WorkbenchTabKey>('selection');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorText, setErrorText] = useState<string>();
  const [credentialMessage, setCredentialMessage] = useState<string>();
  const referenceLoadingMoreRef = useRef(false);

  const ozonAccounts = useMemo(
    () => accounts.filter((account) => account.platformCode?.toUpperCase() === 'OZON'),
    [accounts],
  );
  const selectedAccount = ozonAccounts.find((account) => account.id === accountId);
  const selectedTargetTags = useMemo(
    () => shopTags.filter((tag) => targetTagIds.includes(String(tag.tagId))),
    [shopTags, targetTagIds],
  );
  const targetConfigCount = targetAccountIds.length + targetTagIds.length;
  const estimatedTargetAccountCount = useMemo(() => {
    const countFromTags = selectedTargetTags.reduce((sum, tag) => sum + (tag.accountCount || 0), 0);
    return targetAccountIds.length + countFromTags;
  }, [selectedTargetTags, targetAccountIds.length]);
  const accountNameById = useMemo(() => {
    const result = new Map<string, string>();
    ozonAccounts.forEach((account) => result.set(String(account.id), getSaleChannelAccountDisplayName(account)));
    return result;
  }, [ozonAccounts]);
  const currentItems = currentBatch?.items || [];
  const dirtyItemCount = dirtyItemIds.size;
  const readyPercent = currentBatch?.totalCount ? Math.round(((currentBatch.readyCount || 0) / currentBatch.totalCount) * 100) : 0;

  const referenceRowKey = (record: SaleProductPublishSourceProduct) => String(record.offerId || record.productId);
  const mergeReferenceProducts = (
    current: SaleProductPublishSourceProduct[],
    incoming: SaleProductPublishSourceProduct[],
  ) => {
    const merged = [...current];
    const keys = new Set(current.map(referenceRowKey));
    incoming.forEach((item) => {
      const key = referenceRowKey(item);
      if (!keys.has(key)) {
        merged.push(item);
        keys.add(key);
      }
    });
    return merged;
  };
  const mergeAccounts = (current: SaleChannelAccount[], incoming: SaleChannelAccount[]) => {
    const merged = [...current];
    const ids = new Set(current.map((item) => String(item.id)));
    incoming.forEach((item) => {
      if (!ids.has(String(item.id))) {
        merged.push(item);
        ids.add(String(item.id));
      }
    });
    return merged;
  };
  const resetReferencePaging = () => {
    setReferenceProducts([]);
    setReferenceTotal(0);
    setReferenceNextLastId(undefined);
    setReferenceHasMore(false);
    referenceLoadingMoreRef.current = false;
    setReferenceLoadingMore(false);
  };
  const selectedReference = referenceProducts.find((item) => referenceRowKey(item) === selectedReferenceKey);
  const selectedSourceProducts = useMemo(
    () => referenceProducts.filter((item) => selectedSourceKeys.includes(referenceRowKey(item))),
    [referenceProducts, selectedSourceKeys],
  );
  const getBatchSourceAccountId = (batch?: SaleProductPublishBatch) => (
    stringValue(batch?.sourceChannelAccountId || batch?.channelAccountId)
  );
  const latestTaskProgressPercent = Math.max(0, Math.min(100, Math.round(Number(latestTask?.progressPercent || 0))));
  const buildDirtyCellKey = (itemId: string | number, cellKey: string) => `${String(itemId)}:${cellKey}`;

  const markItemDirty = (itemId: string | number, cellKey?: string) => {
    setDirtyItemIds((current) => {
      const next = new Set(current);
      next.add(String(itemId));
      return next;
    });
    if (cellKey) {
      setDirtyCellKeys((current) => {
        const next = new Set(current);
        next.add(buildDirtyCellKey(itemId, cellKey));
        return next;
      });
    }
  };

  const clearItemDirty = (itemId: string | number) => {
    const itemKey = String(itemId);
    setDirtyItemIds((current) => {
      if (!current.has(itemKey)) return current;
      const next = new Set(current);
      next.delete(itemKey);
      return next;
    });
    setDirtyCellKeys((current) => {
      const prefix = `${itemKey}:`;
      const next = new Set([...current].filter((key) => !key.startsWith(prefix)));
      return next.size === current.size ? current : next;
    });
  };

  const clearAllDirty = () => {
    setDirtyItemIds(new Set());
    setDirtyCellKeys(new Set());
  };

  const isDirtyCell = (record: SaleProductPublishItem, cellKey: string) => (
    dirtyCellKeys.has(buildDirtyCellKey(record.itemId, cellKey))
  );

  const dirtyCellClassName = (record: SaleProductPublishItem, cellKey: string, baseClassName = '') => (
    [baseClassName, isDirtyCell(record, cellKey) ? 'opp-dirty-cell' : ''].filter(Boolean).join(' ')
  );

  const dirtyInputClassName = (record: SaleProductPublishItem, cellKey: string, baseClassName = '') => (
    [baseClassName, isDirtyCell(record, cellKey) ? 'opp-dirty-input' : ''].filter(Boolean).join(' ')
  );

  const markItemsDirtyForCell = (itemIds: Set<string>, cellKey: string) => {
    if (!itemIds.size) return;
    setDirtyItemIds((current) => {
      const next = new Set(current);
      itemIds.forEach((itemId) => next.add(itemId));
      return next;
    });
    setDirtyCellKeys((current) => {
      const next = new Set(current);
      itemIds.forEach((itemId) => next.add(buildDirtyCellKey(itemId, cellKey)));
      return next;
    });
  };

  const loadShopTags = useCallback(async () => {
    try {
      const tags = await saleApi.listSaleShopTags();
      setShopTags(tags);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadAccounts = useCallback(async (keyword?: string) => {
    const searchKeyword = keyword?.trim();
    if (!searchKeyword) {
      setInitialLoading(true);
    }
    setAccountSearching(true);
    try {
      const list = await saleApi.listChannelAccounts({
        platformCode: 'OZON',
        keyword: searchKeyword || undefined,
        page: 1,
        pageSize: 200,
      });
      setAccounts((current) => {
        if (!searchKeyword) {
          return list;
        }
        const selectedAccountIds = new Set(
          [accountId, ...targetAccountIds].filter(Boolean).map((value) => String(value)),
        );
        const selectedAccounts = current.filter((account) => selectedAccountIds.has(String(account.id)));
        return mergeAccounts(list, selectedAccounts);
      });
      const firstOzon = list.find((account) => account.platformCode?.toUpperCase() === 'OZON');
      if (firstOzon) {
        setAccountId((current) => current || firstOzon.id);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '店铺列表读取失败');
    } finally {
      if (!searchKeyword) {
        setInitialLoading(false);
      }
      setAccountSearching(false);
    }
  }, [accountId, targetAccountIds]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadShopTags();
  }, [loadShopTags]);

  const guardedAccountId = () => {
    if (!accountId) {
      setErrorText('请选择 Ozon 店铺');
      return undefined;
    }
    return Number(accountId);
  };

  const handleAccountChange = (value: string) => {
    setAccountId(value);
    setTargetAccountIds((current) => current.filter((item) => publishMode !== 'ozon-copy' || String(item) !== String(value)));
    resetReferencePaging();
    setSelectedReferenceKey(undefined);
    setSelectedSourceKeys([]);
    setCurrentBatch(undefined);
    setLatestTask(undefined);
    clearAllDirty();
    setErrorText(undefined);
    setCredentialMessage(undefined);
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

  const loadLocalProducts = async (options?: { keyword?: string }) => {
    setLoading(true);
    setErrorText(undefined);
    try {
      const keyword = (options?.keyword ?? localKeyword).trim();
      const result = await stylesApi.list({ page: 1, pageSize: 50, keyword: keyword || undefined });
      setLocalProducts(result.list || []);
      setSelectedLocalKeys([]);
      messageApi.success(`已读取 ${result.list?.length || 0} 个本地商品`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '本地商品读取失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceProducts = async (options?: { append?: boolean; keyword?: string }) => {
    const channelAccountId = guardedAccountId();
    if (!channelAccountId) return;
    const append = Boolean(options?.append);
    if (append && (!referenceHasMore || referenceLoadingMoreRef.current || !referenceNextLastId)) {
      return;
    }
    if (append) {
      referenceLoadingMoreRef.current = true;
      setReferenceLoadingMore(true);
    } else {
      setLoading(true);
    }
    setErrorText(undefined);
    try {
      const keyword = (options?.keyword ?? referenceKeyword).trim();
      const result = await saleApi.listProductPublishSources({
        channelAccountId,
        limit: REFERENCE_PAGE_SIZE,
        keyword: keyword || undefined,
        lastId: append ? referenceNextLastId : undefined,
      });
      const nextList = result.list || [];
      setReferenceProducts((current) => (append ? mergeReferenceProducts(current, nextList) : nextList));
      setReferenceTotal(result.total || 0);
      setReferenceNextLastId(result.nextLastId || undefined);
      setReferenceHasMore(Boolean(result.hasMore && result.nextLastId));
      if (!append) {
        setSelectedReferenceKey(undefined);
        setSelectedSourceKeys([]);
        messageApi.success(keyword ? `已匹配 ${nextList.length} 个参考商品` : `已读取 ${nextList.length} 个参考商品`);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '参考商品读取失败');
    } finally {
      if (append) {
        referenceLoadingMoreRef.current = false;
        setReferenceLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleReferenceScroll = (event: UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight <= 96) {
      void loadReferenceProducts({ append: true });
    }
  };

  const handleLocalKeywordChange = (value: string) => {
    setLocalKeyword(value);
    if (!value.trim()) {
      void loadLocalProducts({ keyword: '' });
    }
  };

  const handleReferenceKeywordChange = (value: string) => {
    setReferenceKeyword(value);
    if (!value.trim()) {
      void loadReferenceProducts({ keyword: '' });
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
        targetChannelAccountIds: targetAccountIds.map(Number),
        targetTagIds: targetTagIds.map(Number),
        targetTagNames: selectedTargetTags.map((tag) => tag.tagName),
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
      setLatestTask(undefined);
      clearAllDirty();
      setActiveWorkbenchTab('draft');
      messageApi.success('铺货草稿已生成');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '铺货草稿生成失败');
    } finally {
      setLoading(false);
    }
  };

  const createCopyBatch = async () => {
    const channelAccountId = guardedAccountId();
    if (!channelAccountId) return;
    if (!selectedSourceKeys.length) {
      setErrorText('请选择要复制的 Ozon 商品');
      return;
    }
    if (selectedSourceKeys.length > 10) {
      setErrorText('单批次最多复制 10 个 Ozon 商品');
      return;
    }
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.createProductPublishBatchFromSources({
        channelAccountId,
        targetChannelAccountIds: targetAccountIds.map(Number),
        targetTagIds: targetTagIds.map(Number),
        targetTagNames: selectedTargetTags.map((tag) => tag.tagName),
        batchName: 'Ozon 商品复制批次',
        sources: selectedSourceProducts.map((item) => ({
          sourceOfferId: item.offerId || undefined,
          sourceProductId: item.productId ? Number(item.productId) : undefined,
        })),
      });
      setCurrentBatch(result);
      setLatestTask(undefined);
      clearAllDirty();
      setActiveWorkbenchTab('draft');
      messageApi.success('Ozon 商品复制草稿已生成');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Ozon 商品复制草稿生成失败');
    } finally {
      setLoading(false);
    }
  };

  const saveDraftItem = async (record: SaleProductPublishItem, showSuccess = true) => {
    if (!currentBatch?.batchId || !record.itemId || !record.item) return currentBatch;
    const missingFields = getRequiredDraftMissingFields(record);
    if (missingFields.length) {
      throw new Error(`${getDraftItemLabel(record)} 缺少必填项：${missingFields.join('、')}`);
    }
    const result = await saleApi.updateProductPublishDraft(currentBatch.batchId, record.itemId, {
      item: record.item,
    });
    setCurrentBatch(result);
    clearItemDirty(record.itemId);
    if (showSuccess) {
      messageApi.success('草稿已保存');
    }
    return result;
  };

  const saveDirtyDraftItems = async () => {
    const dirtyItems = currentItems.filter((item) => dirtyItemIds.has(String(item.itemId)));
    if (!dirtyItems.length) return currentBatch;
    const invalidItems = dirtyItems
      .map((item) => ({ item, missingFields: getRequiredDraftMissingFields(item) }))
      .filter((entry) => entry.missingFields.length);
    if (invalidItems.length) {
      const detail = invalidItems
        .slice(0, 3)
        .map((entry) => `${getDraftItemLabel(entry.item)}：${entry.missingFields.join('、')}`)
        .join('；');
      const suffix = invalidItems.length > 3 ? `；另有 ${invalidItems.length - 3} 条商品未填写完整` : '';
      throw new Error(`存在未填写的必填项，无法保存并提交。${detail}${suffix}`);
    }
    let latestBatch: SaleProductPublishBatch | undefined = currentBatch;
    for (const item of dirtyItems) {
      const batchId = latestBatch?.batchId || currentBatch?.batchId;
      if (!batchId || !item.item) continue;
      latestBatch = await saveDraftItem({ ...item, item: item.item || {} }, false);
    }
    messageApi.success(`已保存 ${dirtyItems.length} 条修改`);
    return latestBatch;
  };

  const validateBatch = async () => {
    if (!currentBatch?.batchId) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.validateProductPublishBatch(currentBatch.batchId);
      setCurrentBatch(result);
      const blockedCount = result.blockedCount || 0;
      if (blockedCount > 0) {
        const text = `发布前体检发现 ${blockedCount} 个阻塞项，请补充完善后再提交。`;
        setErrorText(text);
        messageApi.warning(text);
      } else {
        messageApi.success('发布前体检已通过');
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '发布前体检失败');
    } finally {
      setLoading(false);
    }
  };

  const saveAllDirtyDraftItems = async () => {
    if (!currentBatch?.batchId || !dirtyItemCount) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      await saveDirtyDraftItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存全部修改失败';
      setErrorText(message);
      messageApi.warning(message);
    } finally {
      setLoading(false);
    }
  };

  const discardAllDirtyDraftItems = async () => {
    if (!currentBatch?.batchId || !dirtyItemCount) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.getProductPublishBatch(currentBatch.batchId);
      setCurrentBatch(result);
      clearAllDirty();
      messageApi.success('已放弃全部未保存修改');
    } catch (error) {
      const message = error instanceof Error ? error.message : '放弃修改失败';
      setErrorText(message);
      messageApi.error(message);
    } finally {
      setLoading(false);
    }
  };

  const discardDirtyDraftItem = async (record: SaleProductPublishItem) => {
    if (!currentBatch?.batchId || !record.itemId) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const restoredBatch = await saleApi.getProductPublishBatch(currentBatch.batchId);
      const restoredItem = (restoredBatch.items || []).find((item) => String(item.itemId) === String(record.itemId));
      if (!restoredItem) {
        throw new Error('未找到可恢复的草稿商品');
      }
      setCurrentBatch((current) => {
        if (!current) return restoredBatch;
        return {
          ...current,
          items: (current.items || []).map((item) => (
            String(item.itemId) === String(record.itemId) ? restoredItem : item
          )),
        };
      });
      clearItemDirty(record.itemId);
      messageApi.success('已恢复该行修改');
    } catch (error) {
      const message = error instanceof Error ? error.message : '恢复该行修改失败';
      setErrorText(message);
      messageApi.error(message);
    } finally {
      setLoading(false);
    }
  };

  const submitBatch = async (saveUnsavedChanges = false) => {
    if (!currentBatch?.batchId) return;
    if (!targetConfigCount) {
      setErrorText('请选择目标店铺或店铺标签。参考店铺只用于读取模板，目标店铺才是本次发品范围。');
      return;
    }
    setLoading(true);
    setErrorText(undefined);
    try {
      let batchForSubmit = saveUnsavedChanges ? await saveDirtyDraftItems() : currentBatch;
      if (!batchForSubmit?.batchId) return;
      batchForSubmit = await saleApi.validateProductPublishBatch(batchForSubmit.batchId);
      setCurrentBatch(batchForSubmit);
      if ((batchForSubmit.blockedCount || 0) > 0) {
        setErrorText('当前草稿仍有阻塞项，不能提交 Ozon');
        return;
      }
      const task = await saleApi.submitProductListingsBulk({
        sourceBatchId: Number(batchForSubmit.batchId),
        targetChannelAccountIds: targetAccountIds.map(Number),
        targetTagIds: targetTagIds.map(Number),
      });
      setLatestTask(task);
      clearAllDirty();
      messageApi.success('Ozon 发品任务已提交，本页会实时刷新进度');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Ozon 发品任务提交失败');
    } finally {
      setLoading(false);
    }
  };

  const refreshLatestTask = useCallback(async (showSuccess = false) => {
    if (!latestTask?.taskId) return;
    try {
      const task = await saleApi.getSaleAsyncTask(latestTask.taskId);
      setLatestTask(task);
      if (showSuccess) {
        messageApi.success('发品任务进度已刷新');
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '发品任务进度刷新失败');
    }
  }, [latestTask?.taskId, messageApi]);

  useEffect(() => {
    if (!isTaskActive(latestTask)) return undefined;
    const timer = window.setInterval(() => {
      void refreshLatestTask(false);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [latestTask, refreshLatestTask]);

  const updateCurrentBatchItemPayload = (itemId: string | number, cellKey: string, updater: (payload: ProductPayload) => ProductPayload) => {
    markItemDirty(itemId, cellKey);
    setCurrentBatch((batch) => {
      if (!batch?.items) return batch;
      return {
        ...batch,
        items: batch.items.map((item) => {
          if (String(item.itemId) !== String(itemId)) return item;
          const nextPayload = updater({ ...(item.item || {}) });
          const nextImages = collectPayloadImages(nextPayload);
          return {
            ...item,
            productName: stringValue(nextPayload.name || item.productName),
            targetOfferId: stringValue(nextPayload.offer_id || item.targetOfferId),
            price: stringValue(nextPayload.price || item.price),
            currencyCode: stringValue(nextPayload.currency_code || item.currencyCode),
            imageUrl: stringValue(nextPayload.primary_image || item.imageUrl),
            imageCount: nextImages.length + (stringValue(nextPayload.primary_image).trim() ? 1 : 0),
            item: nextPayload,
          };
        }),
      };
    });
  };

  const updateInlineField = (record: SaleProductPublishItem, field: string, value: string) => {
    updateCurrentBatchItemPayload(record.itemId, field, (payload) => ({ ...payload, [field]: value }));
  };

  const updateInlinePrimaryImage = (record: SaleProductPublishItem, value?: string) => {
    updateCurrentBatchItemPayload(record.itemId, 'primary_image', (payload) => {
      const previousPrimaryImage = stringValue(payload.primary_image || record.imageUrl).trim();
      const additionalImages = collectPayloadImages(payload).filter((url) => url !== previousPrimaryImage && url !== value);
      return {
        ...payload,
        primary_image: value || '',
        images: combinePrimaryAndAdditionalImages(value, additionalImages),
      };
    });
  };

  const updateInlineImageList = (record: SaleProductPublishItem, images?: string[]) => {
    updateCurrentBatchItemPayload(record.itemId, 'images', (payload) => ({
      ...payload,
      images: combinePrimaryAndAdditionalImages(stringValue(payload.primary_image || record.imageUrl), images),
    }));
  };

  const updateInlineAttributeValue = (record: SaleProductPublishItem, rowKey: string, valueText: string) => {
    updateCurrentBatchItemPayload(record.itemId, `attr:${rowKey}`, (payload) => {
      const rows = parseAttributes(payload);
      const attributes = Array.isArray(payload.attributes) ? payload.attributes as Array<Record<string, unknown>> : [];
      const nextAttributes = rows.map((row, index) => {
        const original = attributes[index] || {};
        if (row.key !== rowKey) return original;
        const values = valueText
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => ({ value }));
        return { ...original, values };
      });
      return { ...payload, attributes: nextAttributes };
    });
  };

  const clearAttributeColumnValues = (rowKey: string) => {
    const changedItemIds = new Set<string>();
    setCurrentBatch((batch) => {
      if (!batch?.items) return batch;
      return {
        ...batch,
        items: batch.items.map((item) => {
          if (item.publishStatus !== 'DRAFT') return item;
          const payload = { ...(item.item || {}) };
          const rows = parseAttributes(payload);
          const attributes = Array.isArray(payload.attributes) ? payload.attributes as Array<Record<string, unknown>> : [];
          if (!rows.some((row) => row.key === rowKey && row.valueText.trim())) return item;
          changedItemIds.add(String(item.itemId));
          const nextAttributes = rows.map((row, index) => {
            const original = attributes[index] || {};
            return row.key === rowKey ? { ...original, values: [] } : original;
          });
          return {
            ...item,
            item: { ...payload, attributes: nextAttributes },
          };
        }),
      };
    });
    if (changedItemIds.size) {
      markItemsDirtyForCell(changedItemIds, `attr:${rowKey}`);
      messageApi.info(`已清空 ${changedItemIds.size} 条草稿的该列属性，请保存后生效`);
    }
  };

  const saveInlineDraft = async (record: SaleProductPublishItem) => {
    if (!currentBatch?.batchId || !record.itemId || !record.item) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      await saveDraftItem(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : '草稿保存失败';
      setErrorText(message);
      messageApi.warning(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (record: SaleProductPublishItem) => {
    if (!currentBatch?.batchId || !record.itemId) return;
    setLoading(true);
    setErrorText(undefined);
    try {
      const result = await saleApi.deleteProductPublishItem(currentBatch.batchId, record.itemId);
      setCurrentBatch(result.items?.length ? result : undefined);
      clearItemDirty(record.itemId);
      messageApi.success('草稿商品已删除');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '商品删除失败');
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

  const renderReferenceLoadFooter = () => (
    <div className="opp-reference-load-footer">
      {referenceLoadingMore ? <Spin size="small" /> : null}
      <Text type="secondary">
        {referenceLoadingMore
          ? '正在加载更多'
          : referenceHasMore
            ? `已加载 ${referenceProducts.length}/${referenceTotal || '--'}，继续下滑加载更多`
            : `已加载 ${referenceProducts.length}${referenceTotal ? `/${referenceTotal}` : ''}`}
      </Text>
    </div>
  );

  const renderReferenceProductList = () => (
    <div className="opp-reference-list" onScroll={handleReferenceScroll}>
      {referenceProducts.map((record) => {
        const key = referenceRowKey(record);
        const active = selectedReferenceKey === key;
        const categoryName = readRawText(record, 'description_category_name', 'category_name');
        const typeName = readRawText(record, 'type_name');
        const categoryId = readRawText(record, 'description_category_id', 'category_id');
        const stock = readRawNumber(record, 'stock', 'fbs_present');
        const categoryText = [categoryName, typeName].filter(Boolean).join(' / ') || '类目待识别';

        return (
          <button
            key={key}
            type="button"
            className={`opp-reference-row${active ? ' opp-reference-row--active' : ''}`}
            onClick={() => setSelectedReferenceKey(key)}
          >
            <span className="opp-reference-row__radio" aria-hidden="true" />
            <ListImage src={record.imageUrl} alt={record.name || record.offerId || 'Ozon 商品'} width={44} height={44} borderRadius={8} />
            <span className="opp-reference-row__body">
              <Text strong ellipsis={{ tooltip: record.name || '--' }}>{record.name || '--'}</Text>
              <span className="opp-reference-row__meta">
                <Text type="secondary" className="opp-mono">{record.offerId || '--'}</Text>
                <Text type="secondary" ellipsis={{ tooltip: categoryText }}>{categoryText}</Text>
                {categoryId ? <Text type="secondary" className="opp-mono">ID {categoryId}</Text> : null}
                <Text type="secondary">库存 {stock ?? '--'}</Text>
              </span>
            </span>
          </button>
        );
      })}
      {renderReferenceLoadFooter()}
    </div>
  );

  const sourceProductColumns: ColumnsType<SaleProductPublishSourceProduct> = [
    {
      title: 'Ozon 商品',
      dataIndex: 'name',
      render: (_, record) => (
        <div className="opp-product-cell">
          <ListImage src={record.imageUrl} alt={record.name || record.offerId || 'Ozon 商品'} width={44} height={44} borderRadius={8} />
          <div className="opp-product-cell__body">
            <Text strong ellipsis={{ tooltip: record.name || '--' }}>{record.name || '--'}</Text>
            <Text type="secondary" className="opp-mono">{record.offerId || '--'}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '类目/类型',
      width: 260,
      render: (_, record) => {
        const categoryName = readRawText(record, 'description_category_name', 'category_name');
        const typeName = readRawText(record, 'type_name');
        const categoryId = readRawText(record, 'description_category_id', 'category_id');
        return (
          <div className="opp-attribute-cell">
            <Text ellipsis={{ tooltip: [categoryName, typeName].filter(Boolean).join(' / ') || '类目待识别' }}>
              {[categoryName, typeName].filter(Boolean).join(' / ') || '类目待识别'}
            </Text>
            {categoryId ? <Text type="secondary" className="opp-mono">ID {categoryId}</Text> : null}
          </div>
        );
      },
    },
    { title: '库存', width: 90, render: (_, record) => <Text>{readRawNumber(record, 'stock', 'fbs_present') ?? '--'}</Text> },
  ];

  const dynamicAttributeColumns: ColumnsType<SaleProductPublishItem> = (() => {
    const attributeMap = new Map<string, AttributeEditorRow>();
    currentItems.forEach((item) => {
      parseAttributes(item.item || {}).forEach((row) => {
        if (!attributeMap.has(row.key)) {
          attributeMap.set(row.key, row);
        }
      });
    });
    return Array.from(attributeMap.values()).map((attribute) => {
      const clearableCount = currentItems.filter((item) => (
        item.publishStatus === 'DRAFT'
        && Boolean(parseAttributes(item.item || {}).find((row) => row.key === attribute.key && row.valueText.trim()))
      )).length;
      return {
        title: (
          <div className="opp-attr-column-title">
            <div className="opp-attr-column-title__main">
              <span>{attribute.name || '属性'}</span>
              <Popconfirm
                title="清空该属性列？"
                description={`将清空当前批次 ${clearableCount} 条草稿的该属性值，保存后生效。`}
                okText="清空"
                cancelText="取消"
                disabled={!clearableCount}
                onConfirm={() => clearAttributeColumnValues(attribute.key)}
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<ClearOutlined />}
                  aria-label="清空该列"
                  title="清空该列"
                  disabled={!clearableCount}
                  className="opp-attr-column-clear"
                />
              </Popconfirm>
            </div>
            {attribute.nameZh && attribute.nameZh !== attribute.name ? <Text type="secondary">{attribute.nameZh}</Text> : null}
            <Space size={4} wrap>
              {attribute.required ? <Tag color="red">必填</Tag> : null}
              {attribute.id ? <Tag>ID {attribute.id}</Tag> : null}
            </Space>
          </div>
        ),
        key: `attr-${attribute.key}`,
        width: 190,
        render: (_: unknown, record: SaleProductPublishItem) => {
          const row = parseAttributes(record.item || {}).find((item) => item.key === attribute.key);
          return (
            <Input.TextArea
              className={dirtyInputClassName(record, `attr:${attribute.key}`, 'opp-attr-cell-input')}
              autoSize={{ minRows: 1, maxRows: 3 }}
              value={row?.valueText || ''}
              disabled={record.publishStatus !== 'DRAFT'}
              onChange={(event) => updateInlineAttributeValue(record, attribute.key, event.target.value)}
            />
          );
        },
      };
    });
  })();

  const itemColumns: ColumnsType<SaleProductPublishItem> = [
    {
      title: '商品',
      dataIndex: 'productName',
      width: 320,
      fixed: 'left',
      render: (_, record) => (
        <div className="opp-product-cell">
          <ListImage src={record.imageUrl} alt={record.productName || record.targetOfferId || 'Ozon 草稿'} width={44} height={44} borderRadius={8} />
          <div className="opp-product-cell__body">
            <Input
              size="small"
              className={dirtyInputClassName(record, 'name', 'oc-excel-cell-text-input')}
              value={stringValue(record.item?.name || record.productName)}
              onChange={(event) => updateInlineField(record, 'name', event.target.value)}
              disabled={record.publishStatus !== 'DRAFT'}
            />
            <Input
              size="small"
              className={dirtyInputClassName(record, 'offer_id', 'oc-excel-cell-text-input opp-inline-mono-input')}
              value={stringValue(record.item?.offer_id || record.targetOfferId)}
              onChange={(event) => updateInlineField(record, 'offer_id', event.target.value)}
              disabled={record.publishStatus !== 'DRAFT'}
            />
          </div>
        </div>
      ),
    },
    { title: '参考店铺', width: 150, render: () => {
      const sourceAccountId = getBatchSourceAccountId(currentBatch);
      return <Text>{accountNameById.get(sourceAccountId) || sourceAccountId || '--'}</Text>;
    } },
    { title: '本地/参考', width: 172, render: (_, record) => (
      <div className="opp-attribute-cell">
        <Text className="opp-mono">{record.localStyleNo || '--'}</Text>
        <Text type="secondary" className="opp-mono">{record.referenceOfferId || record.sourceOfferId || '--'}</Text>
      </div>
    ) },
    { title: '体检', width: 110, render: (_, record) => <Tag color={statusColor(record.validationStatus)}>{statusLabel(record.validationStatus)}</Tag> },
    { title: '价格', width: 156, render: (_, record) => (
      <div className="opp-inline-price-cell">
        <Input
          size="small"
          className={dirtyInputClassName(record, 'price', 'oc-excel-cell-text-input')}
          value={stringValue(record.item?.price || record.price)}
          onChange={(event) => updateInlineField(record, 'price', event.target.value)}
          disabled={record.publishStatus !== 'DRAFT'}
        />
        <Input
          size="small"
          className={dirtyInputClassName(record, 'currency_code', 'oc-excel-cell-text-input opp-inline-currency-input')}
          value={stringValue(record.item?.currency_code || record.currencyCode || 'CNY')}
          onChange={(event) => updateInlineField(record, 'currency_code', event.target.value)}
          disabled={record.publishStatus !== 'DRAFT'}
        />
      </div>
    ) },
    {
      title: '主图',
      width: 76,
      render: (_, record) => (
        <ImageUploader
          className={dirtyCellClassName(record, 'primary_image', 'opp-table-image-uploader opp-table-image-uploader--single')}
          module="sale-products"
          compact
          value={getItemPrimaryImage(record)}
          disabled={record.publishStatus !== 'DRAFT'}
          onChange={(value) => updateInlinePrimaryImage(record, value)}
        />
      ),
    },
    {
      title: '附图',
      width: 210,
      render: (_, record) => (
        <ImageUploader
          className={dirtyCellClassName(record, 'images', 'opp-table-image-uploader opp-table-image-uploader--multi')}
          module="sale-products"
          compact
          multiple
          maxCount={10}
          maxVisibleCount={3}
          value={getItemAdditionalImages(record)}
          disabled={record.publishStatus !== 'DRAFT'}
          onChange={(value) => updateInlineImageList(record, value)}
        />
      ),
    },
    ...dynamicAttributeColumns,
    {
      title: '操作',
      width: 128,
      render: (_, record) => {
        const dirty = dirtyItemIds.has(String(record.itemId));
        return (
          <Space size={0} className="opp-row-actions">
            <Button
              type="text"
              size="small"
              icon={<SaveOutlined />}
              title="保存"
              aria-label="保存"
              onClick={() => void saveInlineDraft(record)}
              disabled={record.publishStatus !== 'DRAFT' || !dirty}
            />
            <Popconfirm
              title="恢复该行未保存修改？"
              description="确认后会恢复为最近一次保存的草稿内容。"
              okText="恢复"
              cancelText="取消"
              disabled={record.publishStatus !== 'DRAFT' || !dirty}
              onConfirm={() => void discardDirtyDraftItem(record)}
            >
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                title="恢复"
                aria-label="恢复"
                disabled={record.publishStatus !== 'DRAFT' || !dirty}
              />
            </Popconfirm>
            <Popconfirm
              title="删除该草稿？"
              okText="删除"
              cancelText="取消"
              disabled={record.publishStatus !== 'DRAFT'}
              onConfirm={() => void deleteItem(record)}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                title="删除"
                aria-label="删除"
                disabled={record.publishStatus !== 'DRAFT'}
              />
            </Popconfirm>
          </Space>
        );
      },
      fixed: 'right',
    },
  ];
  const itemTableScrollX = 1244 + dynamicAttributeColumns.length * 190;

  return (
    <Layout className={`opp-layout${embedded ? ' opp-layout--embedded' : ''}`}>
      {contextHolder}
      {!embedded ? <Sider width={228} breakpoint="lg" collapsedWidth={80} className="scw-sider">
        <div className="scw-brand">
          <img src="/assets/images/logo.png" alt="易供云" className="scw-brand__icon" />
          <div>
            <div className="scw-brand__title">销售中心 V1</div>
            <div className="scw-brand__subtitle">Ozon 铺货中心</div>
          </div>
        </div>
        <Menu className="scw-menu" mode="inline" selectedKeys={['/sale/ozon/listing']} defaultOpenKeys={['product-group']} items={menuItems} />
      </Sider> : null}
      <Layout className={embedded ? 'opp-embedded-main' : 'scw-main'}>
        {!embedded ? <Header className="opp-header">
          <div>
            <Title level={2} className="scw-page-title">Ozon 铺货中心</Title>
            <Text type="secondary">从本地商品库生成 Ozon 铺货草稿，参考已上架商品套用类目属性，提交前完成属性、图片、价格和货号体检。</Text>
          </div>
          <Space wrap className="opp-header-actions">
            <Button icon={<ShopOutlined />} onClick={() => navigate('/sale/shops')}>店铺管理</Button>
            <Button icon={<ReloadOutlined />} onClick={() => void loadAccounts()}>刷新</Button>
          </Space>
        </Header> : null}
        <Content className={`opp-content${embedded ? ' opp-content--embedded' : ''}`}>
          <Spin spinning={initialLoading || loading}>
            <section className="opp-toolbar">
              <Space wrap size={12}>
                <Segmented
                  value={publishMode}
                  onChange={(value) => {
                    const nextMode = value as PublishMode;
                    setPublishMode(nextMode);
                    setSelectedLocalKeys([]);
                    setSelectedReferenceKey(undefined);
                    setSelectedSourceKeys([]);
	                    if (nextMode === 'ozon-copy') {
	                      setTargetAccountIds((current) => current.filter((id) => String(id) !== String(accountId)));
	                    }
	                  }}
                  options={[
                    { label: '本地商品铺货', value: 'local-reference' },
                    { label: '复制 Ozon 商品', value: 'ozon-copy' },
                  ]}
                />
                <label className="opp-toolbar-field">
                  <span>参考店铺</span>
                  <Select
                    showSearch
                    value={accountId}
                    onChange={handleAccountChange}
                    placeholder="参考商品店铺"
                    optionFilterProp="searchText"
                    filterOption={false}
                    onSearch={(value) => void loadAccounts(value)}
                    loading={accountSearching}
                    style={{ width: 220 }}
                    options={ozonAccounts.map((account) => ({
                      value: account.id,
                      label: getSaleChannelAccountDisplayName(account),
                      searchText: getAccountSearchText(account),
                    }))}
                  />
                </label>
                <label className="opp-toolbar-field opp-toolbar-field--wide">
                  <span>目标店铺</span>
                  <Select
                    mode="multiple"
                    showSearch
                    value={targetAccountIds}
                    onChange={(values) => {
                      const nextValues = publishMode === 'ozon-copy'
                        ? values.filter((value) => String(value) !== String(accountId))
                        : values;
                      setTargetAccountIds(nextValues);
                      if (publishMode === 'ozon-copy' && values.some((value) => String(value) === String(accountId))) {
                        setErrorText('复制 Ozon 商品时，目标店铺不能包含原始店铺');
                      }
                    }}
                    placeholder="可多选"
                    optionFilterProp="searchText"
                    filterOption={false}
                    onSearch={(value) => void loadAccounts(value)}
                    loading={accountSearching}
                    maxTagCount="responsive"
                    style={{ width: 320 }}
                    options={ozonAccounts.map((account) => ({
                      value: String(account.id),
                      label: getSaleChannelAccountDisplayName(account),
                      searchText: getAccountSearchText(account),
                      disabled: publishMode === 'ozon-copy' && String(account.id) === String(accountId),
                    }))}
                  />
                </label>
                <label className="opp-toolbar-field opp-toolbar-field--wide">
                  <span>店铺标签</span>
                  <Select
                    mode="multiple"
                    allowClear
                    value={targetTagIds}
                    onChange={setTargetTagIds}
                    placeholder="按标签批量选择"
                    maxTagCount={1}
                    maxTagTextLength={12}
                    maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} 个标签`}
                    popupMatchSelectWidth={false}
                    style={{ width: 280 }}
                    options={shopTags.map((tag) => ({
                      value: String(tag.tagId),
                      label: `${tag.tagName}（${tag.accountCount || 0}）`,
                    }))}
                  />
                </label>
                {targetConfigCount ? (
                  <Tag className="opp-target-summary" color="blue">
                    目标配置 {targetConfigCount} 项，预计 {estimatedTargetAccountCount} 店
                  </Tag>
                ) : null}
                {publishMode === 'local-reference' ? (
                  <Input
                    className="opp-prefix-input"
                    value={offerPrefix}
                    onChange={(event) => setOfferPrefix(event.target.value)}
                    prefix={<CloudUploadOutlined />}
                    placeholder="目标货号前缀"
                  />
                ) : null}
                <Button icon={<SafetyCertificateOutlined />} disabled={!selectedAccount} onClick={() => void checkCredential()}>检查凭证</Button>
                {publishMode === 'local-reference' ? <Button icon={<ReloadOutlined />} onClick={() => void loadLocalProducts()}>读取本地商品</Button> : null}
                <Button type="primary" icon={<ReloadOutlined />} disabled={!selectedAccount} onClick={() => void loadReferenceProducts()}>
                  {publishMode === 'ozon-copy' ? '读取 Ozon 商品' : '读取参考商品'}
                </Button>
              </Space>
              <Tag color="processing">正式发品</Tag>
            </section>

            {!selectedAccount && !initialLoading ? (
              <Alert className="opp-state-banner" type="warning" showIcon message="暂无 Ozon 店铺" description="请先在店铺管理中绑定 Ozon 店铺凭证。" />
            ) : null}
            {credentialMessage ? <Alert className="opp-state-banner" type="info" showIcon message={credentialMessage} /> : null}
            {errorText ? <Alert className="opp-state-banner" type="error" showIcon message="当前流程存在问题" description={errorText} /> : null}

            <section className="opp-metrics">
              <div className="opp-metric"><Statistic title={publishMode === 'ozon-copy' ? '已选 Ozon' : '本地商品'} value={publishMode === 'ozon-copy' ? selectedSourceKeys.length : localProducts.length} /></div>
              <div className="opp-metric"><Statistic title={publishMode === 'ozon-copy' ? 'Ozon 商品' : '参考商品'} value={referenceProducts.length} /></div>
	              <div className="opp-metric"><Statistic title="草稿商品" value={currentBatch?.totalCount || 0} /></div>
	              <div className="opp-metric"><Statistic title="可发布" value={currentBatch?.readyCount || 0} /></div>
	              <div className="opp-metric"><Statistic title="阻塞项" value={currentBatch?.blockedCount || 0} valueStyle={{ color: (currentBatch?.blockedCount || 0) > 0 ? '#cf1322' : undefined }} /></div>
	              <div className="opp-metric"><Statistic title="本次成功/失败" value={`${latestTask?.successCount || 0}/${latestTask?.failedCount || 0}`} /></div>
            </section>

            <section className="opp-workbench">
              <Tabs
                activeKey={activeWorkbenchTab}
                onChange={(key) => setActiveWorkbenchTab(key as WorkbenchTabKey)}
                items={[
                  {
                    key: 'selection',
                    label: (
                      <span className="opp-tab-label">
                        {publishMode === 'ozon-copy' ? '复制商品' : '选品与参考'}
                        <Tag>
                          {publishMode === 'ozon-copy' ? selectedSourceKeys.length : selectedLocalKeys.length}/
                          {referenceTotal || referenceProducts.length}
                        </Tag>
                      </span>
                    ),
                    children: publishMode === 'ozon-copy' ? (
                      <div className="opp-selection-layout">
                        <section className="opp-panel opp-panel--wide">
                          <div className="opp-section-title">
                            <div className="opp-section-title__text">
                              <Text strong>选择要复制的 Ozon 商品</Text>
                              <Text type="secondary">从参考店铺读取已上架商品，多选后复制为目标店铺的铺货草稿，可继续微调属性、图片、价格和货号。</Text>
                            </div>
                            <Space wrap className="opp-section-actions">
                              <Input
                                className="opp-section-search"
                                allowClear
                                placeholder="搜索 offer_id / product_id / 标题"
                                suffix={<SearchOutlined />}
                                value={referenceKeyword}
                                onChange={(event) => handleReferenceKeywordChange(event.target.value)}
                                onPressEnter={(event) => void loadReferenceProducts({ keyword: event.currentTarget.value })}
                              />
                              <Button icon={<FileProtectOutlined />} disabled={!selectedSourceKeys.length} onClick={() => void createCopyBatch()}>
                                生成复制草稿
                              </Button>
                            </Space>
                          </div>
                          {referenceProducts.length ? (
                            <Table
                              rowKey={referenceRowKey}
                              size="middle"
                              columns={sourceProductColumns}
                              dataSource={referenceProducts}
                              rowSelection={{
                                selectedRowKeys: selectedSourceKeys,
                                onChange: setSelectedSourceKeys,
                                getCheckboxProps: (record) => ({
                                  disabled: selectedSourceKeys.length >= 10 && !selectedSourceKeys.includes(referenceRowKey(record)),
                                }),
                              }}
                              pagination={false}
                              scroll={{ x: 760, y: 420 }}
                              onScroll={handleReferenceScroll}
                              footer={renderReferenceLoadFooter}
                            />
                          ) : (
                            <Empty description={referenceProducts.length ? '没有匹配的 Ozon 商品' : '读取 Ozon 商品后选择要复制到目标店铺的商品'} />
                          )}
                        </section>
                      </div>
                    ) : (
                      <div className="opp-selection-layout">
                        <section className="opp-panel">
                          <div className="opp-section-title">
                            <div className="opp-section-title__text">
                              <Text strong>本地待铺货商品</Text>
                              <Text type="secondary">选择准备上架到 Ozon 的本地商品，系统会用本地标题、款号和图片生成铺货草稿。</Text>
                            </div>
                            <Space wrap className="opp-section-actions">
                              <Input
                                className="opp-section-search"
                                allowClear
                                placeholder="搜索款号 / 标题 / 颜色 / 尺码"
                                suffix={<SearchOutlined />}
                                value={localKeyword}
                                onChange={(event) => handleLocalKeywordChange(event.target.value)}
                                onPressEnter={(event) => void loadLocalProducts({ keyword: event.currentTarget.value })}
                              />
                              <Button icon={<FileProtectOutlined />} disabled={!selectedLocalKeys.length || !selectedReference} onClick={() => void createBatch()}>
                                生成铺货草稿
                              </Button>
                            </Space>
                          </div>
                          {localProducts.length ? (
                            <Table
                              rowKey={(record) => record.id}
                              size="middle"
                              columns={localColumns}
                              dataSource={localProducts}
                              rowSelection={{
                                selectedRowKeys: selectedLocalKeys,
                                onChange: setSelectedLocalKeys,
                                getCheckboxProps: (record) => ({
                                  disabled: selectedLocalKeys.length >= 10 && !selectedLocalKeys.includes(record.id),
                                }),
                              }}
                              pagination={{ pageSize: 6, showSizeChanger: false }}
                              scroll={{ x: 760 }}
                            />
                          ) : (
                            <Empty description={localProducts.length ? '没有匹配的本地商品' : '读取本地商品后开始选择'} />
                          )}
                        </section>

                        <section className="opp-panel">
                          <div className="opp-section-title">
                            <div className="opp-section-title__text">
                              <Text strong>Ozon 参考商品</Text>
                              <Text type="secondary">参考商品只用于套用类目、属性结构、尺寸重量字段。</Text>
                            </div>
                            <Input
                              className="opp-section-search opp-search-compact"
                              allowClear
                              placeholder="offer_id / product_id"
                              suffix={<SearchOutlined />}
                              value={referenceKeyword}
                              onChange={(event) => handleReferenceKeywordChange(event.target.value)}
                              onPressEnter={(event) => void loadReferenceProducts({ keyword: event.currentTarget.value })}
                            />
                          </div>
                          {referenceProducts.length ? (
                            renderReferenceProductList()
                          ) : (
                            <Empty description={referenceProducts.length ? '没有匹配的参考商品' : '读取 Ozon 参考商品后选择一个类目相近的商品'} />
                          )}
                        </section>
                      </div>
                    ),
                  },
                  {
                    key: 'draft',
                    label: (
                      <span className="opp-tab-label">
                        草稿编辑
                        <Tag color={currentItems.length ? 'processing' : undefined}>{currentItems.length}</Tag>
                      </span>
                    ),
                    children: (
                      <div className="opp-draft-layout">
	                        <section className="opp-panel opp-batch-panel">
	                          <div className="opp-section-title">
	                            <div className="opp-section-title__text">
	                              <Text strong>当前草稿</Text>
	                              <Text type="secondary">{currentBatch?.batchNo || '尚未生成本次铺货草稿'}</Text>
	                            </div>
	                            <Tag color={statusColor(currentBatch?.status)}>{statusLabel(currentBatch?.status)}</Tag>
	                          </div>
	                          {currentBatch ? (
	                            <Space direction="vertical" size={10} className="opp-full">
	                              <Progress percent={readyPercent} status={(currentBatch.blockedCount || 0) > 0 ? 'exception' : 'active'} />
	                              <Descriptions size="small" column={2}>
	                                <Descriptions.Item label="草稿名称">{currentBatch.batchName || '--'}</Descriptions.Item>
	                                <Descriptions.Item label="目标范围">{targetConfigCount ? `${targetConfigCount} 项，预计 ${estimatedTargetAccountCount} 店` : '未选择'}</Descriptions.Item>
	                                <Descriptions.Item label="可发布">{currentBatch.readyCount || 0}</Descriptions.Item>
	                                <Descriptions.Item label="阻塞项">{currentBatch.blockedCount || 0}</Descriptions.Item>
	                              </Descriptions>
	                              <Space wrap>
	                                <Button icon={<FileSearchOutlined />} onClick={() => void validateBatch()}>发布前体检</Button>
                                <Button icon={<SaveOutlined />} disabled={!dirtyItemCount} onClick={() => void saveAllDirtyDraftItems()}>
                                  保存全部修改{dirtyItemCount ? ` ${dirtyItemCount}` : ''}
                                </Button>
                                <Popconfirm
                                  title={`放弃 ${dirtyItemCount} 条未保存修改？`}
                                  description="确认后会恢复为最近一次已保存的草稿内容，当前前端修改不会保留。"
                                  okText="放弃修改"
                                  cancelText="取消"
                                  disabled={!dirtyItemCount}
                                  onConfirm={() => void discardAllDirtyDraftItems()}
                                >
                                  <Button icon={<UndoOutlined />} disabled={!dirtyItemCount}>
                                    放弃修改{dirtyItemCount ? ` ${dirtyItemCount}` : ''}
                                  </Button>
                                </Popconfirm>
                                {dirtyItemCount ? (
                                  <Popconfirm
                                    title={`当前存在 ${dirtyItemCount} 条未保存修改`}
                                    description="确认后会先保存全部修改，保存完成后再提交 Ozon。"
                                    okText="保存并提交"
                                    cancelText="取消"
                                    onConfirm={() => void submitBatch(true)}
	                                  >
	                                    <Button type="primary" icon={<CloudUploadOutlined />} disabled={!targetConfigCount || !currentBatch.readyCount || (!!currentBatch.blockedCount && !dirtyItemCount)}>
	                                      保存并提交
	                                    </Button>
	                                  </Popconfirm>
	                                ) : (
	                                  <Button type="primary" icon={<CloudUploadOutlined />} disabled={!targetConfigCount || !currentBatch.readyCount || !!currentBatch.blockedCount} onClick={() => void submitBatch()}>
	                                    提交 Ozon
	                                  </Button>
	                                )}
	                              </Space>
	                              {!targetConfigCount ? (
	                                <Alert type="warning" showIcon message="请选择目标店铺或标签" description="参考店铺只用于读取模板，目标店铺才是本次发品范围。" />
	                              ) : null}
	                            </Space>
	                          ) : (
	                            <Alert type="info" showIcon message="本次发品草稿" description="每次发品都重新生成草稿；修改后再次提交会产生新的发布批次号。" />
	                          )}
	                        </section>

                        <section className="opp-panel opp-validation-panel">
                          <div className="opp-section-title">
                            <div className="opp-section-title__text">
                              <Text strong>发布前体检</Text>
                              <Text type="secondary">阻塞项必须清零后才允许提交平台。</Text>
                            </div>
                            {(currentBatch?.blockedCount || 0) > 0 ? <WarningOutlined className="opp-warning-icon" /> : <CheckCircleOutlined className="opp-success-icon" />}
                          </div>
                          {currentItems.length ? (
                            <Space direction="vertical" className="opp-full" size={10}>
                              {currentItems.flatMap((item) => item.validationIssues || []).slice(0, 3).map((issue, index) => (
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

	                        <section className="opp-panel opp-async-task-panel">
	                          <div className="opp-section-title">
	                            <div className="opp-section-title__text">
	                              <Text strong>本次提交进度</Text>
	                              <Text type="secondary">每次提交都会生成新的发布批次号，当前页实时刷新数量进度。</Text>
	                            </div>
	                            {latestTask ? <Tag color={statusColor(latestTask.status)}>{statusLabel(latestTask.status)}</Tag> : null}
	                          </div>
	                          {latestTask ? (
	                            <Space direction="vertical" size={10} className="opp-full">
	                              <Progress
	                                percent={latestTaskProgressPercent}
	                                status={(latestTask.failedCount || 0) > 0 ? 'exception' : isTaskActive(latestTask) ? 'active' : 'success'}
	                              />
	                              <Descriptions size="small" column={3}>
	                                <Descriptions.Item label="发布批次号">{latestTask.taskName || latestTask.taskId}</Descriptions.Item>
	                                <Descriptions.Item label="目标店铺">{latestTask.targetShopCount ?? estimatedTargetAccountCount}</Descriptions.Item>
	                                <Descriptions.Item label="商品数">{latestTask.productCount ?? currentBatch?.totalCount ?? 0}</Descriptions.Item>
	                                <Descriptions.Item label="总任务">{latestTask.totalCount || 0}</Descriptions.Item>
	                                <Descriptions.Item label="处理中">{(latestTask.pendingCount || 0) + (latestTask.runningCount || 0)}</Descriptions.Item>
	                                <Descriptions.Item label="成功/失败">{latestTask.successCount || 0}/{latestTask.failedCount || 0}</Descriptions.Item>
	                              </Descriptions>
	                              <Space wrap>
	                                <Button icon={<ReloadOutlined />} onClick={() => void refreshLatestTask(true)}>刷新进度</Button>
	                                <Button icon={<FileSearchOutlined />} onClick={() => navigate(`/sale/ozon/listing-details?taskId=${latestTask.taskId}`)}>查看明细</Button>
	                              </Space>
	                            </Space>
	                          ) : (
	                            <Alert type="info" showIcon message="尚未提交本次发品" description="提交后这里会展示实时进度条、目标店铺数、商品数、成功和失败数量。" />
	                          )}
	                        </section>

	                        <section className="opp-panel opp-draft-table-panel">
	                          <div className="opp-section-title">
	                            <div className="opp-section-title__text">
	                              <Text strong>铺货草稿</Text>
	                              <Text type="secondary">草稿表格保持横向无限宽编辑；历史草稿不再管理，每次发品重新生成草稿。</Text>
	                            </div>
	                          </div>
                          {currentItems.length ? (
                            <Table
                              rowKey={(record) => String(record.itemId)}
                              size="middle"
                              className="oc-excel-entry-table opp-item-table"
                              columns={itemColumns}
                              dataSource={currentItems}
                              pagination={{ pageSize: 8, showSizeChanger: false }}
                              scroll={{ x: itemTableScrollX }}
                            />
                          ) : (
                            <Empty description="暂无铺货草稿" />
                          )}
                        </section>
                      </div>
	                    ),
	                  },
	                ]}
              />
            </section>
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
};

export default OzonProductPublish;
