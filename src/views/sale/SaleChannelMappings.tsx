import { type Key, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Button, Card, Checkbox, Empty, Image, Modal, Popconfirm, Popover, Select, Space, Spin, Table, Tag, Tooltip, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import SaleChannelAccountSelect from '../../components/sale/SaleChannelAccountSelect';
import stylesApi from '../../api/styles';
import styleDetailApi from '../../api/style-detail';
import {
  type SaleChannelAccount,
  type SaleProductSyncStatus,
  type SaleProductSyncTaskSubmitResponse,
} from '../../types/sale';
import type { StyleData, StyleDetailData } from '../../types/style';
import {
  SALE_ACTIVE_ACCOUNT_ID_KEY,
  publishSaleContextChanged,
  resolveSaleAccountSelection,
} from '../../utils/sale-menu-context';

type MappingStatus = 'ALL' | 'UNMAPPED' | 'ACTIVE' | 'DISABLED' | 'CONFLICT';

type MappingRow = {
  id: string;
  channelAccountId: string;
  platformSpuId?: string;
  platformSkcId?: string;
  platformSkuId: string;
  platformSkuCode?: string;
  platformProductName?: string;
  platformMainImageUrl?: string;
  platformCategoryId?: string;
  platformCategoryPath?: string;
  platformStatus?: string;
  normalizedColor?: string;
  normalizedSize?: string;
  normalizedSpecSummary?: string;
  normalizedAttributesJson?: string;
  platformSnapshotJson?: string;
  styleId?: string;
  styleNo?: string;
  styleName?: string;
  styleImageUrl?: string;
  styleVariantId?: string;
  styleVariantColor?: string;
  styleVariantSize?: string;
  styleVariantAttributesJson?: string;
  warehouseId?: string;
  mappingStatus?: string;
  lastSyncedAt?: string;
  updatedAt?: string;
  remark?: string;
};

type DisplayMappingRow = MappingRow & {
  spuGroupRowSpan: number;
  skcGroupRowSpan: number;
  skcGroupHead: boolean;
};

type SnapshotProperty = {
  propName?: string;
  propValue?: string;
  numberInputValue?: string;
  valueUnit?: string;
};

type SnapshotPayload = {
  offer_id?: string;
  product_id?: string | number;
  sku?: string | number;
  extCode?: string;
  productExtCode?: string;
  skuExtCode?: string;
  productProperties?: SnapshotProperty[];
  attributes?: Array<{
    name?: string;
    attribute_name?: string;
    attribute_name_zh?: string;
    values?: Array<{ value?: string; name?: string }>;
    value?: string;
  }>;
  stock?: number;
  stock_info?: {
    stocks?: Array<Record<string, unknown>>;
    items?: Array<Record<string, unknown>>;
  };
  raw?: Record<string, unknown>;
};

type DraftRow = {
  id: string;
  productMappingId: string;
  channelAccountId: string;
  platformSkuId: string;
  candidateStyleId?: string;
  candidateStyleNo?: string;
  candidateStyleName?: string;
  candidateStyleImageUrl?: string;
  candidateVariantId?: string;
  candidateColor?: string;
  candidateSize?: string;
  candidateAttributesJson?: string;
  matchSource?: string;
  matchReason?: string;
  confidence?: string;
};

type DraftGenerateResult = {
  channelAccountId: string;
  generatedCount: number;
  pendingCount: number;
};

type StyleOption = {
  label: string;
  value: string;
  style: StyleData;
};

type MappingModalState = {
  open: boolean;
  record: MappingRow | null;
  styleKeyword: string;
  selectedStyleId?: string;
  selectedVariantId?: string;
  sourceDraftId?: string;
};

const MAPPING_STATUS_OPTIONS: Array<{ label: string; value: MappingStatus }> = [
  { label: '全部', value: 'ALL' },
  { label: '待绑定(UNMAPPED)', value: 'UNMAPPED' },
  { label: '已绑定(ACTIVE)', value: 'ACTIVE' },
  { label: '冲突(CONFLICT)', value: 'CONFLICT' },
  { label: '停用(DISABLED)', value: 'DISABLED' },
];

const renderImage = (src?: string, alt?: string) => (
  <Image
    src={src}
    alt={alt}
    width={64}
    height={64}
    style={{ borderRadius: 10, objectFit: 'cover', background: '#f5f5f5' }}
    fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
    preview={Boolean(src)}
  />
);

const renderSingleLineEllipsisText = (value?: string) => {
  const displayValue = value || '--';
  return (
    <Tooltip title={displayValue}>
      <div
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        {displayValue}
      </div>
    </Tooltip>
  );
};

const parseAttributeEntries = (payload?: string) => {
  if (!payload) {
    return [];
  }
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .slice(0, 4)
      .map(([key, value]) => `${key}: ${String(value)}`);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const parsePlatformSnapshot = (payload?: string): SnapshotPayload | null => {
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(payload) as SnapshotPayload;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const filterSpecAttributeEntries = (entries: string[]) =>
  entries.filter((item) => !item.startsWith('color:') && !item.startsWith('size:'));

const formatPropertyValue = (item: SnapshotProperty) => {
  if (item.numberInputValue && item.valueUnit) {
    return `${item.propValue || ''} ${item.numberInputValue}${item.valueUnit}`.trim();
  }
  if (item.numberInputValue) {
    return `${item.propValue || ''} ${item.numberInputValue}`.trim();
  }
  return item.propValue || '--';
};

const formatOzonAttributeValue = (item: NonNullable<SnapshotPayload['attributes']>[number]) => {
  if (item.value) {
    return item.value;
  }
  const firstValue = item.values?.[0];
  return firstValue?.value || firstValue?.name || '--';
};

const parseOzonAttributeEntries = (snapshot?: SnapshotPayload | null) =>
  (snapshot?.attributes ?? [])
    .map((item) => {
      const name = item.attribute_name_zh || item.attribute_name || item.name;
      return name ? `${name}: ${formatOzonAttributeValue(item)}` : null;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);

const resolveOzonStock = (snapshot?: SnapshotPayload | null) => {
  if (typeof snapshot?.stock === 'number') {
    return snapshot.stock;
  }
  const stockRows = snapshot?.stock_info?.stocks ?? snapshot?.stock_info?.items ?? [];
  if (!stockRows.length) {
    return null;
  }
  return stockRows.reduce((sum, item) => {
    const rawValue = item.present ?? item.valid_stock_count ?? item.stock ?? item.available_stock_count;
    const value = Number(rawValue);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
};

const compareNullableText = (left?: string, right?: string) => {
  const leftValue = left?.trim() ?? '';
  const rightValue = right?.trim() ?? '';
  return leftValue.localeCompare(rightValue, 'zh-CN');
};

const ACTIVE_SYNC_STATUSES = new Set(['QUEUED', 'RUNNING']);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
};

const SaleChannelMappings = () => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncCancelling, setSyncCancelling] = useState(false);
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [batchApplyingDrafts, setBatchApplyingDrafts] = useState(false);
  const [draftActionId, setDraftActionId] = useState<string>();
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [mappingStatus, setMappingStatus] = useState<MappingStatus>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [syncStatus, setSyncStatus] = useState<SaleProductSyncStatus | null>(null);
  const [syncSubmission, setSyncSubmission] = useState<SaleProductSyncTaskSubmitResponse | null>(null);
  const [draftResult, setDraftResult] = useState<DraftGenerateResult | null>(null);
  const [mappingModal, setMappingModal] = useState<MappingModalState>({
    open: false,
    record: null,
    styleKeyword: '',
  });
  const [styleSearchLoading, setStyleSearchLoading] = useState(false);
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([]);
  const [styleDetailLoading, setStyleDetailLoading] = useState(false);
  const [selectedStyleDetail, setSelectedStyleDetail] = useState<StyleDetailData | null>(null);
  const [mappingSaving, setMappingSaving] = useState(false);
  const previousActiveTaskIdRef = useRef<string | null>(null);
  const styleSearchRequestRef = useRef(0);

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId),
    [accounts, selectedAccountId],
  );
  const isOzonAccount = selectedAccount?.platformCode?.toUpperCase() === 'OZON';

  const draftsByMappingId = useMemo(() => {
    const result = new Map<string, DraftRow[]>();
    drafts.forEach((item) => {
      const current = result.get(item.productMappingId) ?? [];
      current.push(item);
      result.set(item.productMappingId, current);
    });
    return result;
  }, [drafts]);

  const displayRows = useMemo<DisplayMappingRow[]>(() => {
    if (!rows.length) {
      return [];
    }
    const sorted = [...rows].sort((left, right) => {
      const spuCompare = compareNullableText(left.platformSpuId ?? left.id, right.platformSpuId ?? right.id);
      if (spuCompare !== 0) {
        return spuCompare;
      }
      const productCompare = compareNullableText(left.platformProductName, right.platformProductName);
      if (productCompare !== 0) {
        return productCompare;
      }
      const skcCompare = compareNullableText(left.platformSkcId, right.platformSkcId);
      if (skcCompare !== 0) {
        return skcCompare;
      }
      const colorCompare = compareNullableText(left.normalizedColor, right.normalizedColor);
      if (colorCompare !== 0) {
        return colorCompare;
      }
      const sizeCompare = compareNullableText(left.normalizedSize, right.normalizedSize);
      if (sizeCompare !== 0) {
        return sizeCompare;
      }
      return compareNullableText(left.platformSkuId, right.platformSkuId);
    });

    const result: DisplayMappingRow[] = sorted.map((item) => ({
      ...item,
      spuGroupRowSpan: 1,
      skcGroupRowSpan: 1,
      skcGroupHead: true,
    }));
    for (let index = 0; index < result.length; ) {
      const groupKey = result[index].platformSpuId || `__${result[index].id}`;
      let cursor = index + 1;
      while (cursor < result.length && (result[cursor].platformSpuId || `__${result[cursor].id}`) === groupKey) {
        cursor += 1;
      }
      result[index].spuGroupRowSpan = cursor - index;
      for (let hiddenIndex = index + 1; hiddenIndex < cursor; hiddenIndex += 1) {
        result[hiddenIndex].spuGroupRowSpan = 0;
      }
      index = cursor;
    }
    for (let index = 0; index < result.length; ) {
      const groupKey =
        `${result[index].platformSpuId || `__spu_${result[index].id}`}::${result[index].platformSkcId || `__skc_${result[index].id}`}`;
      let cursor = index + 1;
      while (
        cursor < result.length &&
        `${result[cursor].platformSpuId || `__spu_${result[cursor].id}`}::${result[cursor].platformSkcId || `__skc_${result[cursor].id}`}` ===
          groupKey
      ) {
        cursor += 1;
      }
      result[index].skcGroupRowSpan = cursor - index;
      for (let hiddenIndex = index + 1; hiddenIndex < cursor; hiddenIndex += 1) {
        result[hiddenIndex].skcGroupRowSpan = 0;
        result[hiddenIndex].skcGroupHead = false;
      }
      index = cursor;
    }
    return result;
  }, [rows]);

  const skcSelectableRowIds = useMemo(
    () => displayRows.filter((item) => item.skcGroupHead).map((item) => item.id),
    [displayRows],
  );
  const selectedSkcRowSet = useMemo(() => new Set(selectedRowKeys.map((item) => String(item))), [selectedRowKeys]);
  const isAllSkcSelected = skcSelectableRowIds.length > 0 && skcSelectableRowIds.every((id) => selectedRowKeys.includes(id));
  const isPartiallySelected = selectedRowKeys.length > 0 && !isAllSkcSelected;
  const selectedMappingRows = useMemo(
    () =>
      displayRows.filter((item) => {
        const groupHeadId = displayRows.find(
          (candidate) =>
            candidate.skcGroupHead &&
            candidate.platformSpuId === item.platformSpuId &&
            candidate.platformSkcId === item.platformSkcId,
        )?.id;
        return Boolean(groupHeadId && selectedSkcRowSet.has(groupHeadId));
      }),
    [displayRows, selectedSkcRowSet],
  );
  const selectedDrafts = useMemo(() => {
    const mappingIds = new Set(selectedMappingRows.map((item) => item.id));
    return drafts.filter((item) => mappingIds.has(item.productMappingId));
  }, [drafts, selectedMappingRows]);
  const applicableSelectedDrafts = useMemo(() => {
    const firstDraftByMappingId = new Map<string, DraftRow>();
    selectedDrafts.forEach((item) => {
      if (!firstDraftByMappingId.has(item.productMappingId)) {
        firstDraftByMappingId.set(item.productMappingId, item);
      }
    });
    return Array.from(firstDraftByMappingId.values());
  }, [selectedDrafts]);

  const currentSyncTask = syncStatus?.currentTask ?? null;
  const latestFinishedSyncTask = syncStatus?.latestFinishedTask ?? null;
  const hasActiveSyncTask = Boolean(currentSyncTask && currentSyncTask.status && ACTIVE_SYNC_STATUSES.has(currentSyncTask.status));

  const syncStatusAlert = useMemo(() => {
    if (hasActiveSyncTask && currentSyncTask) {
      return {
        type: 'info' as const,
        message: `商品同步任务进行中：${currentSyncTask.status === 'QUEUED' ? '等待执行' : '后台执行中'}`,
        description: [
          `任务ID：${currentSyncTask.taskId}`,
          `开始时间：${formatDateTime(currentSyncTask.startedAt)}`,
          currentSyncTask.remark ? `说明：${currentSyncTask.remark}` : '',
        ]
          .filter(Boolean)
          .join(' / '),
      };
    }
    if (latestFinishedSyncTask?.status === 'SUCCESS') {
      return {
        type: 'success' as const,
        message: '最近一次商品同步已完成',
        description: [
          `完成时间：${formatDateTime(latestFinishedSyncTask.finishedAt)}`,
          `处理SKU：${latestFinishedSyncTask.processedCount ?? 0}`,
          `实际写入：${latestFinishedSyncTask.successCount ?? 0}`,
          latestFinishedSyncTask.remark || '',
        ]
          .filter(Boolean)
          .join(' / '),
      };
    }
    if (latestFinishedSyncTask?.status === 'CANCELLED') {
      return {
        type: 'warning' as const,
        message: '最近一次商品同步已终止',
        description: [
          `结束时间：${formatDateTime(latestFinishedSyncTask.finishedAt)}`,
          `处理SKU：${latestFinishedSyncTask.processedCount ?? 0}`,
          `实际写入：${latestFinishedSyncTask.successCount ?? 0}`,
          latestFinishedSyncTask.remark || '',
        ]
          .filter(Boolean)
          .join(' / '),
      };
    }
    if (latestFinishedSyncTask?.status === 'FAILED') {
      return {
        type: 'error' as const,
        message: '最近一次商品同步失败',
        description: [
          `结束时间：${formatDateTime(latestFinishedSyncTask.finishedAt)}`,
          latestFinishedSyncTask.errorMessage || '',
          latestFinishedSyncTask.remark || '',
        ]
          .filter(Boolean)
          .join(' / '),
      };
    }
    return null;
  }, [currentSyncTask, hasActiveSyncTask, latestFinishedSyncTask]);

  const shouldShowSyncSubmission = Boolean(
    syncSubmission &&
      !syncStatusAlert &&
      (!syncStatus ||
        (!syncStatus.currentTask && !syncStatus.latestFinishedTask)),
  );

  const variantOptions = useMemo(() => {
    const variants = selectedStyleDetail?.variants ?? [];
    return variants.map((variant) => ({
      label: [variant.color || '无颜色', variant.size || '无尺码'].join(' / '),
      value: variant.id,
    }));
  }, [selectedStyleDetail]);

  const loadStyleOptions = useCallback(async (keyword?: string, preferredStyleId?: string) => {
    const requestId = styleSearchRequestRef.current + 1;
    styleSearchRequestRef.current = requestId;
    setStyleSearchLoading(true);
    try {
      const result = await stylesApi.list({
        page: 0,
        pageSize: 20,
        keyword: keyword?.trim() || undefined,
      });
      if (styleSearchRequestRef.current !== requestId) {
        return;
      }
      let options = result.list.map((style) => ({
        label: `${style.styleNo} / ${style.styleName}`,
        value: style.id,
        style,
      }));
      if (preferredStyleId && !options.some((item) => item.value === preferredStyleId)) {
        try {
          const detail = await styleDetailApi.fetchDetail(preferredStyleId);
          const fallbackStyle: StyleData = {
            id: preferredStyleId,
            styleNo: detail.styleNo,
            styleName: detail.styleName,
            image: detail.coverImageUrl,
            colors: detail.colors,
            sizes: detail.sizes,
            status: detail.status,
          };
          options = [
            {
              label: `${fallbackStyle.styleNo} / ${fallbackStyle.styleName}`,
              value: fallbackStyle.id,
              style: fallbackStyle,
            },
            ...options,
          ];
        } catch (error) {
          console.error(error);
        }
      }
      setStyleOptions(options);
    } catch (error) {
      console.error(error);
    } finally {
      if (styleSearchRequestRef.current === requestId) {
        setStyleSearchLoading(false);
      }
    }
  }, []);

  const loadStyleDetail = useCallback(async (styleId: string, preferredVariantId?: string) => {
    setStyleDetailLoading(true);
    try {
      const detail = await styleDetailApi.fetchDetail(styleId);
      setSelectedStyleDetail(detail);
      setMappingModal((previous) => {
        const hasPreferredVariant =
          preferredVariantId && (detail.variants ?? []).some((variant) => variant.id === preferredVariantId);
        return {
          ...previous,
          selectedStyleId: styleId,
          selectedVariantId: hasPreferredVariant ? preferredVariantId : detail.variants?.[0]?.id,
        };
      });
    } catch (error) {
      console.error(error);
    } finally {
      setStyleDetailLoading(false);
    }
  }, []);

  const loadDrafts = useCallback(async (accountId?: string) => {
    if (!accountId) {
      setDrafts([]);
      return;
    }
    try {
      const list = await saleApi.listProductMappingDrafts(accountId);
      setDrafts(list);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadRows = useCallback(async (accountId?: string, status?: MappingStatus) => {
    if (!accountId) {
      setRows([]);
      setDrafts([]);
      return;
    }
    setLoading(true);
    try {
      const [list, draftList] = await Promise.all([
        saleApi.listProductMappings({
          channelAccountId: accountId,
          mappingStatus: status && status !== 'ALL' ? status : undefined,
        }),
        saleApi.listProductMappingDrafts(accountId),
      ]);
      setRows(list);
      setDrafts(draftList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSyncStatus = useCallback(async (accountId?: string) => {
    if (!accountId) {
      setSyncStatus(null);
      return;
    }
    try {
      const status = await saleApi.getProductSyncStatus(accountId);
      setSyncStatus(status);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await saleApi.listChannelAccounts();
      setAccounts(list);
      const preferred = resolveSaleAccountSelection(
        list,
        selectedAccountId ?? window.localStorage.getItem(SALE_ACTIVE_ACCOUNT_ID_KEY),
      );
      if (preferred?.id !== selectedAccountId) {
        setSelectedAccountId(preferred?.id);
      }
      if (preferred) {
        publishSaleContextChanged({
          accountId: preferred.id,
          sellerType: preferred.sellerType,
        });
      } else {
        publishSaleContextChanged({});
      }
    } catch (error) {
      console.error(error);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadRows(selectedAccountId, mappingStatus);
  }, [mappingStatus, selectedAccountId, loadRows]);

  useEffect(() => {
    void loadSyncStatus(selectedAccountId);
  }, [selectedAccountId, loadSyncStatus]);

  useEffect(() => {
    setSelectedRowKeys([]);
    setSyncSubmission(null);
  }, [mappingStatus, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId || !hasActiveSyncTask) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadSyncStatus(selectedAccountId);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasActiveSyncTask, loadSyncStatus, selectedAccountId]);

  useEffect(() => {
    const activeTaskId = hasActiveSyncTask ? currentSyncTask?.taskId ?? null : null;
    const previousActiveTaskId = previousActiveTaskIdRef.current;
    if (previousActiveTaskId && !activeTaskId && selectedAccountId) {
      void loadRows(selectedAccountId, mappingStatus);
    }
    previousActiveTaskIdRef.current = activeTaskId;
  }, [currentSyncTask?.taskId, hasActiveSyncTask, loadRows, mappingStatus, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId) {
      return;
    }
    publishSaleContextChanged({
      accountId: selectedAccountId,
      sellerType: selectedAccount?.sellerType,
    });
  }, [selectedAccount?.sellerType, selectedAccountId]);

  const handleSync = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    setSyncing(true);
    try {
      const result = await saleApi.syncProducts({
        channelAccountId: Number(selectedAccountId),
        page: 1,
        pageSize: 50,
      });
      setSyncSubmission(result);
      message.success(result.message || (result.alreadyRunning ? '当前已有同步任务在执行' : '商品同步任务已提交'));
      await loadSyncStatus(selectedAccountId);
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleCancelSync = async () => {
    if (!currentSyncTask?.taskId) {
      message.warning('当前没有可终止的同步任务');
      return;
    }
    setSyncCancelling(true);
    try {
      const result = await saleApi.cancelProductSync(currentSyncTask.taskId);
      message.success(result.status === 'CANCELLED' ? '已提交终止指令' : '同步任务状态已刷新');
      await loadSyncStatus(selectedAccountId);
    } catch (error) {
      console.error(error);
    } finally {
      setSyncCancelling(false);
    }
  };

  const handleGenerateDrafts = async () => {
    if (!selectedAccountId) {
      message.warning('请先选择渠道账号');
      return;
    }
    setDraftGenerating(true);
    try {
      const result = await saleApi.generateProductMappingDrafts({
        channelAccountId: Number(selectedAccountId),
      });
      setDraftResult(result);
      message.success(`推荐映射生成完成：新增 ${result.generatedCount} 条推荐，当前待确认 ${result.pendingCount} 条`);
      await loadDrafts(selectedAccountId);
    } catch (error) {
      console.error(error);
    } finally {
      setDraftGenerating(false);
    }
  };

  const openMappingModal = useCallback(
    async (record: MappingRow, draft?: DraftRow) => {
      const preferredStyleId = draft?.candidateStyleId || record.styleId;
      const preferredVariantId = draft?.candidateVariantId || record.styleVariantId;
      setMappingModal({
        open: true,
        record,
        styleKeyword: '',
        selectedStyleId: preferredStyleId,
        selectedVariantId: preferredVariantId,
        sourceDraftId: draft?.id,
      });
      setSelectedStyleDetail(null);
      await loadStyleOptions(undefined, preferredStyleId);
      if (preferredStyleId) {
        await loadStyleDetail(preferredStyleId, preferredVariantId);
      }
    },
    [loadStyleDetail, loadStyleOptions],
  );

  const closeMappingModal = useCallback(() => {
    setMappingModal({
      open: false,
      record: null,
      styleKeyword: '',
      sourceDraftId: undefined,
    });
    setSelectedStyleDetail(null);
    setStyleOptions([]);
  }, []);

  const handleStyleSearch = useCallback(
    async (keyword: string) => {
      setMappingModal((previous) => ({
        ...previous,
        styleKeyword: keyword,
      }));
      await loadStyleOptions(keyword, mappingModal.selectedStyleId);
    },
    [loadStyleOptions, mappingModal.selectedStyleId],
  );

  const handleStyleChange = useCallback(
    async (styleId: string) => {
      setMappingModal((previous) => ({
        ...previous,
        selectedStyleId: styleId,
        selectedVariantId: undefined,
      }));
      await loadStyleDetail(styleId);
    },
    [loadStyleDetail],
  );

  const handleSaveMapping = useCallback(async () => {
    if (!mappingModal.record) {
      return;
    }
    if (!mappingModal.selectedStyleId || !mappingModal.selectedVariantId) {
      message.warning('请先选择本地款式和规格');
      return;
    }
    setMappingSaving(true);
    try {
      await saleApi.updateProductMapping(mappingModal.record.id, {
        styleId: Number(mappingModal.selectedStyleId),
        styleVariantId: Number(mappingModal.selectedVariantId),
        mappingStatus: 'ACTIVE',
      });
      if (mappingModal.sourceDraftId) {
        try {
          await saleApi.rejectProductMappingDraft(mappingModal.sourceDraftId);
        } catch (error) {
          console.error(error);
        }
      }
      message.success('商品映射已保存');
      closeMappingModal();
      await loadRows(selectedAccountId, mappingStatus);
    } catch (error) {
      console.error(error);
    } finally {
      setMappingSaving(false);
    }
  }, [
    closeMappingModal,
    loadRows,
    mappingModal.record,
    mappingModal.selectedStyleId,
    mappingModal.selectedVariantId,
    mappingModal.sourceDraftId,
    mappingStatus,
    selectedAccountId,
  ]);

  const handleDeleteMapping = useCallback(
    async (record: MappingRow) => {
      try {
        await saleApi.deleteProductMapping(record.id);
        message.success('已解除商品映射');
        await loadRows(selectedAccountId, mappingStatus);
      } catch (error) {
        console.error(error);
      }
    },
    [loadRows, mappingStatus, selectedAccountId],
  );

  const handleBatchApplyDrafts = useCallback(async () => {
    if (!applicableSelectedDrafts.length) {
      message.warning('当前选中的 SKC 没有可应用的推荐映射');
      return;
    }
    setBatchApplyingDrafts(true);
    try {
      for (const draft of applicableSelectedDrafts) {
        await saleApi.approveProductMappingDraft(draft.id);
      }
      message.success(`已批量应用 ${applicableSelectedDrafts.length} 条推荐映射`);
      await loadRows(selectedAccountId, mappingStatus);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error(error);
    } finally {
      setBatchApplyingDrafts(false);
    }
  }, [applicableSelectedDrafts, loadRows, mappingStatus, selectedAccountId]);

  const handleApproveDraft = useCallback(async (draftId: string) => {
    setDraftActionId(draftId);
    try {
      await saleApi.approveProductMappingDraft(draftId);
      message.success('已确认正式映射');
      await loadRows(selectedAccountId, mappingStatus);
    } catch (error) {
      console.error(error);
    } finally {
      setDraftActionId(undefined);
    }
  }, [loadRows, mappingStatus, selectedAccountId]);

  const handleRejectDraft = useCallback(async (draftId: string) => {
    setDraftActionId(draftId);
    try {
      await saleApi.rejectProductMappingDraft(draftId);
      message.success('已驳回该推荐');
      await loadDrafts(selectedAccountId);
    } catch (error) {
      console.error(error);
    } finally {
      setDraftActionId(undefined);
    }
  }, [loadDrafts, selectedAccountId]);

  const columns: ColumnsType<DisplayMappingRow> = useMemo(
    () => [
      {
        title: (
          <Checkbox
            checked={isAllSkcSelected}
            indeterminate={isPartiallySelected}
            onChange={(event) => {
              setSelectedRowKeys(event.target.checked ? skcSelectableRowIds : []);
            }}
          />
        ),
        key: 'selection',
        width: 52,
        fixed: 'left',
        align: 'center',
        onCell: (record) => ({ rowSpan: record.skcGroupRowSpan }),
        render: (_, record) => {
          if (!record.skcGroupHead) {
            return null;
          }
          return (
            <Checkbox
              checked={selectedRowKeys.includes(record.id)}
              onChange={(event) => {
                setSelectedRowKeys((current) =>
                  event.target.checked
                    ? Array.from(new Set([...current, record.id]))
                    : current.filter((item) => item !== record.id),
                );
              }}
            />
          );
        },
      },
      {
        title: '商品信息',
        key: 'product',
        width: 340,
        fixed: 'left',
        onCell: (record) => ({ rowSpan: record.skcGroupRowSpan }),
        render: (_, record) => {
          const snapshot = parsePlatformSnapshot(record.platformSnapshotJson);
          const categoryLabel = record.platformCategoryPath?.split(' / ').at(-1);
          const offerId = snapshot?.offer_id || record.platformSkuCode;
          const productId = snapshot?.product_id || record.platformSpuId;
          const platformSku = snapshot?.sku || record.platformSkuId;
          return (
            <Space align="start" size={12}>
              {renderImage(record.platformMainImageUrl, record.platformProductName)}
              <Space direction="vertical" size={4}>
                <Typography.Text strong style={{ fontSize: 16, lineHeight: 1.5 }}>
                  {record.platformProductName || record.platformSkuId}
                </Typography.Text>
                <Typography.Text type="secondary">类目：{categoryLabel || record.platformCategoryPath || '--'}</Typography.Text>
                {isOzonAccount ? (
                  <>
                    <Typography.Text type="secondary" copyable={{ text: String(productId || '') }}>
                      product_id：{productId || '--'}
                    </Typography.Text>
                    <Typography.Text type="secondary" copyable={{ text: String(offerId || '') }}>
                      offer_id：{offerId || '--'}
                    </Typography.Text>
                    <Typography.Text type="secondary" copyable={{ text: String(platformSku || '') }}>
                      sku：{platformSku || '--'}
                    </Typography.Text>
                  </>
                ) : (
                  <>
                    <Typography.Text type="secondary" copyable={{ text: record.platformSpuId || '' }}>
                      SPU ID：{record.platformSpuId || '--'}
                    </Typography.Text>
                    <Typography.Text type="secondary" copyable={{ text: record.platformSkcId || '' }}>
                      SKC ID：{record.platformSkcId || '--'}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      货号：{snapshot?.productExtCode || '--'}
                    </Typography.Text>
                  </>
                )}
                <Space size={[4, 4]} wrap>
                  {record.platformStatus ? <Tag color="processing">平台状态：{record.platformStatus}</Tag> : null}
                  {record.normalizedColor ? <Tag color="magenta">{record.normalizedColor}</Tag> : null}
                </Space>
              </Space>
            </Space>
          );
        },
      },
      {
        title: '商品属性',
        key: 'attributes',
        width: 280,
        onCell: (record) => ({ rowSpan: record.skcGroupRowSpan }),
        render: (_, record) => {
          const snapshot = parsePlatformSnapshot(record.platformSnapshotJson);
          const properties = (snapshot?.productProperties ?? []).filter((item) => item.propName);
          const ozonAttributes = parseOzonAttributeEntries(snapshot);
          const preview = properties.slice(0, 4);
          if (isOzonAccount && ozonAttributes.length) {
            return (
              <Space direction="vertical" size={4}>
                {ozonAttributes.slice(0, 4).map((item) => (
                  <Typography.Text key={item}>{item}</Typography.Text>
                ))}
                {ozonAttributes.length > 4 ? (
                  <Popover
                    content={
                      <Space direction="vertical" size={4}>
                        {ozonAttributes.map((item) => (
                          <Typography.Text key={item}>{item}</Typography.Text>
                        ))}
                      </Space>
                    }
                    title="全部 Ozon 属性"
                  >
                    <Button type="link" size="small" style={{ paddingInline: 0 }}>
                      全部
                    </Button>
                  </Popover>
                ) : null}
              </Space>
            );
          }
          if (!preview.length) {
            return <Typography.Text type="secondary">暂无商品属性</Typography.Text>;
          }
          return (
            <Space direction="vertical" size={4}>
              {preview.map((item) => (
                <Typography.Text key={`${item.propName}-${item.propValue}`}>
                  {item.propName}：{formatPropertyValue(item)}
                </Typography.Text>
              ))}
              {properties.length > 4 ? (
                <Popover
                  content={
                    <Space direction="vertical" size={4}>
                      {properties.map((item) => (
                        <Typography.Text key={`${item.propName}-${item.propValue}`}>
                          {item.propName}：{formatPropertyValue(item)}
                        </Typography.Text>
                      ))}
                    </Space>
                  }
                  title="全部属性"
                >
                  <Button type="link" size="small" style={{ paddingInline: 0 }}>
                    全部
                  </Button>
                </Popover>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: '尺码表',
        key: 'sizeChart',
        width: 120,
        onCell: (record) => ({ rowSpan: record.skcGroupRowSpan }),
        render: () => (
          <Space direction="vertical" size={4}>
            <Button type="link" size="small" style={{ paddingInline: 0 }}>
              查看
            </Button>
            <Typography.Text type="secondary">待接入</Typography.Text>
          </Space>
        ),
      },
      {
        title: '商品规格',
        key: 'normalized',
        width: 230,
        render: (_, record) => {
          const attributes = filterSpecAttributeEntries(parseAttributeEntries(record.normalizedAttributesJson));
          return (
            <Space direction="vertical" size={6}>
              <Typography.Text>颜色：{record.normalizedColor || '--'}</Typography.Text>
              <Typography.Text>尺码：{record.normalizedSize || '--'}</Typography.Text>
              {attributes.length ? (
                <Space size={[4, 4]} wrap>
                  {attributes.map((item) => (
                    <Tag key={item}>{item}</Tag>
                  ))}
                </Space>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: isOzonAccount ? 'Ozon SKU' : 'SKU ID',
        key: 'sku',
        width: 180,
        render: (_, record) => (
          <Typography.Text strong copyable={{ text: record.platformSkuId }}>
            {record.platformSkuId}
          </Typography.Text>
        ),
      },
      {
        title: isOzonAccount ? 'offer_id' : 'SKU货号',
        key: 'skuCode',
        width: 160,
        render: (_, record) => {
          const snapshot = parsePlatformSnapshot(record.platformSnapshotJson);
          return (
            <Typography.Text>
              {isOzonAccount ? snapshot?.offer_id || record.platformSkuCode || '--' : snapshot?.skuExtCode || record.platformSkuCode || '--'}
            </Typography.Text>
          );
        },
      },
      {
        title: '映射信息',
        children: [
          {
            title: '正式映射',
            key: 'confirmed',
            width: 280,
            render: (_, record) => {
              const attributes = parseAttributeEntries(record.styleVariantAttributesJson);
              if (!record.styleVariantId) {
                return (
                  <Space direction="vertical" size={8}>
                    <Typography.Text type="secondary">未确认</Typography.Text>
                    <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => void openMappingModal(record)}>
                      手动映射
                    </Button>
                  </Space>
                );
              }
              return (
                <Space direction="vertical" size={6} style={{ width: '100%', minWidth: 0 }}>
                  {renderSingleLineEllipsisText(`${record.styleNo || '--'} / ${record.styleName || '--'}`)}
                  <Typography.Text>
                    规格：{record.styleVariantColor || '--'} / {record.styleVariantSize || '--'}
                  </Typography.Text>
                  {attributes.length ? (
                    <Space size={[4, 4]} wrap>
                      {attributes.map((item) => (
                        <Tag key={item} color="blue">
                          {item}
                        </Tag>
                      ))}
                    </Space>
                  ) : null}
                  <Space>
                    <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => void openMappingModal(record)}>
                      修改映射
                    </Button>
                    <Popconfirm
                      title="确认解除当前商品映射？"
                      description="解除后该平台商品会恢复为待绑定状态。"
                      okText="确认解除"
                      cancelText="取消"
                      onConfirm={() => void handleDeleteMapping(record)}
                    >
                      <Button type="link" danger size="small" style={{ paddingInline: 0 }}>
                        删除映射
                      </Button>
                    </Popconfirm>
                  </Space>
                </Space>
              );
            },
          },
          {
            title: '推荐映射',
            key: 'drafts',
            width: 300,
            render: (_, record) => {
              const candidates = draftsByMappingId.get(record.id) ?? [];
              if (!candidates.length) {
                return <Typography.Text type="secondary">暂无推荐</Typography.Text>;
              }
              const draft = candidates[0];
              const attributeTags = parseAttributeEntries(draft.candidateAttributesJson);
              return (
                <Space direction="vertical" size={6} style={{ width: '100%', minWidth: 0 }}>
                  <Space size={[4, 4]} wrap>
                    <Tag color="gold">置信度 {draft.confidence || '--'}</Tag>
                    <Tag>{draft.matchSource || '--'}</Tag>
                  </Space>
                  {renderSingleLineEllipsisText(
                    `${draft.candidateStyleNo || '--'} / ${draft.candidateStyleName || '--'}`,
                  )}
                  <Typography.Text>
                    规格：{draft.candidateColor || '--'} / {draft.candidateSize || '--'}
                  </Typography.Text>
                  <Typography.Text type="secondary">{draft.matchReason || '--'}</Typography.Text>
                  {attributeTags.length ? (
                    <Space size={[4, 4]} wrap>
                      {attributeTags.map((item) => (
                        <Tag key={item}>{item}</Tag>
                      ))}
                    </Space>
                  ) : null}
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      loading={draftActionId === draft.id}
                      onClick={() => void handleApproveDraft(draft.id)}
                      style={{ paddingInline: 0 }}
                    >
                      确认
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      loading={draftActionId === draft.id}
                      onClick={() => void openMappingModal(record, draft)}
                      style={{ paddingInline: 0 }}
                    >
                      修改映射
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      loading={draftActionId === draft.id}
                      onClick={() => void handleRejectDraft(draft.id)}
                      style={{ paddingInline: 0 }}
                    >
                      驳回
                    </Button>
                  </Space>
                </Space>
              );
            },
          },
        ],
      },
      {
        title: '库存',
        key: 'inventory',
        width: 100,
        render: (_, record) => {
          const snapshot = parsePlatformSnapshot(record.platformSnapshotJson);
          const stock = resolveOzonStock(snapshot);
          return <Typography.Text>{stock ?? '-'}</Typography.Text>;
        },
      },
      {
        title: '状态',
        key: 'status',
        width: 220,
        render: (_, record) => {
          const color =
            record.mappingStatus === 'ACTIVE'
              ? 'green'
              : record.mappingStatus === 'CONFLICT'
                ? 'red'
                : record.mappingStatus === 'DISABLED'
                  ? 'default'
                  : 'gold';
          return (
            <Space direction="vertical" size={2}>
              <Tag color={color} style={{ marginInlineEnd: 0 }}>
                {record.mappingStatus || '--'}
              </Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
                最近同步：{record.lastSyncedAt || '--'}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.3 }}>
                更新时间：{record.updatedAt || '--'}
              </Typography.Text>
            </Space>
          );
        },
      },
    ],
    [
      draftActionId,
      draftsByMappingId,
      handleApproveDraft,
      handleDeleteMapping,
      handleRejectDraft,
      isAllSkcSelected,
      isPartiallySelected,
      isOzonAccount,
      openMappingModal,
      selectedRowKeys,
      skcSelectableRowIds,
    ],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            商品绑定
          </Typography.Title>
          <Space>
            <SaleChannelAccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="选择渠道账号"
            />
            <Button onClick={() => void loadRows(selectedAccountId, mappingStatus)}>刷新</Button>
          </Space>
        </Space>
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          message="流程改为：先同步平台商品，再生成推荐映射，最后由人工逐条确认正式映射。系统不会自动写入正式款式关系。"
        />
      </Card>

      <Card title="步骤 1：同步平台商品">
        <Space>
          <Popconfirm
            title={`确认提交 ${selectedAccount?.platformCode || '平台'} 商品后台同步任务？`}
            onConfirm={() => void handleSync()}
            okText="确认"
            cancelText="取消"
          >
            <Button type="primary" loading={syncing} disabled={hasActiveSyncTask}>
              {hasActiveSyncTask ? '同步进行中' : '一键同步商品'}
            </Button>
          </Popconfirm>
          {hasActiveSyncTask ? (
            <Popconfirm
              title="确认终止当前商品同步任务？"
              onConfirm={() => void handleCancelSync()}
              okText="终止"
              cancelText="取消"
            >
              <Button danger loading={syncCancelling}>
                终止同步
              </Button>
            </Popconfirm>
          ) : null}
          <Button loading={draftGenerating} onClick={() => void handleGenerateDrafts()}>
            生成推荐映射
          </Button>
        </Space>
        {shouldShowSyncSubmission && syncSubmission ? (
          <Alert
            style={{ marginTop: 12 }}
            type="success"
            showIcon
            message={syncSubmission.alreadyRunning ? '当前已有商品同步任务在后台执行' : '商品同步任务已提交'}
            description={[
              `任务ID：${syncSubmission.taskId}`,
              `状态：${syncSubmission.status || '--'}`,
              syncSubmission.message || '',
            ].filter(Boolean).join(' / ')}
          />
        ) : null}
        {syncStatusAlert ? (
          <Alert
            style={{ marginTop: 12 }}
            type={syncStatusAlert.type}
            showIcon
            message={syncStatusAlert.message}
            description={syncStatusAlert.description}
          />
        ) : null}
        {draftResult ? (
          <Alert
            style={{ marginTop: 12 }}
            type="success"
            showIcon
            message={`推荐映射生成完成：新增 ${draftResult.generatedCount} 条推荐，当前待确认 ${draftResult.pendingCount} 条`}
          />
        ) : null}
      </Card>

      <Card
        title="步骤 2：评审商品与本地款式关系"
        extra={
          <Space>
            <Popconfirm
              title="确认批量应用推荐映射？"
              description={`会将当前勾选的 SKC 下 ${applicableSelectedDrafts.length} 条有效推荐直接转为正式映射。`}
              okText="确认应用"
              cancelText="取消"
              onConfirm={() => void handleBatchApplyDrafts()}
              disabled={!applicableSelectedDrafts.length}
            >
              <Button disabled={!applicableSelectedDrafts.length} loading={batchApplyingDrafts}>
                批量应用推荐映射
              </Button>
            </Popconfirm>
            <Typography.Text type="secondary">状态筛选</Typography.Text>
            <Select
              style={{ width: 180 }}
              value={mappingStatus}
              onChange={(value: MappingStatus) => setMappingStatus(value)}
              options={MAPPING_STATUS_OPTIONS}
            />
          </Space>
        }
      >
        <Table<DisplayMappingRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={displayRows}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 2410 }}
        />
      </Card>

      <Modal
        title="手动确认商品映射"
        open={mappingModal.open}
        onCancel={closeMappingModal}
        onOk={() => void handleSaveMapping()}
        okText="保存映射"
        cancelText="取消"
        confirmLoading={mappingSaving}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small">
            <Space direction="vertical" size={4}>
              <Typography.Text strong>{mappingModal.record?.platformProductName || '--'}</Typography.Text>
              <Typography.Text type="secondary">
                平台 SKU：{mappingModal.record?.platformSkuId || '--'}
              </Typography.Text>
              <Typography.Text type="secondary">
                规格：{mappingModal.record?.normalizedColor || '--'} / {mappingModal.record?.normalizedSize || '--'}
              </Typography.Text>
            </Space>
          </Card>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text strong>选择本地款式</Typography.Text>
            <Select
              showSearch
              filterOption={false}
              placeholder="搜索款号或款式名称"
              value={mappingModal.selectedStyleId}
              onSearch={(value) => void handleStyleSearch(value)}
              onChange={(value) => void handleStyleChange(value)}
              notFoundContent={styleSearchLoading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无款式" />}
              options={styleOptions}
              style={{ width: '100%' }}
            />
          </Space>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text strong>选择本地规格</Typography.Text>
            <Select
              placeholder={mappingModal.selectedStyleId ? '请选择款式规格' : '请先选择本地款式'}
              value={mappingModal.selectedVariantId}
              onChange={(value) =>
                setMappingModal((previous) => ({
                  ...previous,
                  selectedVariantId: value,
                }))
              }
              disabled={!mappingModal.selectedStyleId || styleDetailLoading}
              notFoundContent={styleDetailLoading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无规格" />}
              options={variantOptions}
              style={{ width: '100%' }}
            />
            {selectedStyleDetail ? (
              <Typography.Text type="secondary">
                已选款式：{selectedStyleDetail.styleNo} / {selectedStyleDetail.styleName}
              </Typography.Text>
            ) : null}
          </Space>
        </Space>
      </Modal>
    </Space>
  );
};

export default SaleChannelMappings;
