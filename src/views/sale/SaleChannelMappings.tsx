import { type Key, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Alert, Button, Card, Image, Popconfirm, Popover, Select, Space, Table, Tag, Typography, message } from 'antd';
import { saleApi } from '../../api/sale';
import type { SaleChannelAccount, SaleProductSyncStatus, SaleProductSyncTaskSubmitResponse } from '../../types/sale';
import {
  SALE_ACTIVE_ACCOUNT_ID_KEY,
  publishSaleContextChanged,
  resolveSaleAccountSelection,
} from '../../utils/sale-menu-context';

type MappingStatus = 'UNMAPPED' | 'ACTIVE' | 'DISABLED' | 'CONFLICT';

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
  extCode?: string;
  productProperties?: SnapshotProperty[];
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

const MAPPING_STATUS_OPTIONS: Array<{ label: string; value: MappingStatus }> = [
  { label: '待绑定(UNMAPPED)', value: 'UNMAPPED' },
  { label: '已绑定(ACTIVE)', value: 'ACTIVE' },
  { label: '冲突(CONFLICT)', value: 'CONFLICT' },
  { label: '停用(DISABLED)', value: 'DISABLED' },
];

const sellerTypeTag = (sellerType?: string | null) => {
  if (sellerType === 'FULLY_MANAGED') {
    return <Tag color="blue">当前店铺：全托</Tag>;
  }
  if (sellerType === 'SEMI_MANAGED') {
    return <Tag color="green">当前店铺：半托</Tag>;
  }
  return <Tag>当前店铺：{sellerType || '--'}</Tag>;
};

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

const formatPropertyValue = (item: SnapshotProperty) => {
  if (item.numberInputValue && item.valueUnit) {
    return `${item.propValue || ''} ${item.numberInputValue}${item.valueUnit}`.trim();
  }
  if (item.numberInputValue) {
    return `${item.propValue || ''} ${item.numberInputValue}`.trim();
  }
  return item.propValue || '--';
};

const compareNullableText = (left?: string, right?: string) => {
  const leftValue = left?.trim() ?? '';
  const rightValue = right?.trim() ?? '';
  return leftValue.localeCompare(rightValue, 'zh-CN');
};

const resolveSyncErrorMessage = (error: unknown) => {
  const status = (error as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
  const messageText =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || '商品同步失败';
  if (status === 409) {
    if (messageText.includes('同步进行中')) {
      return '当前店铺已有同步任务在执行，请稍后再试。';
    }
    if (messageText.includes('并发更新')) {
      return '商品同步时发生并发写入冲突，请稍后重新同步。';
    }
    return messageText;
  }
  if (status === 502) {
    return `Temu 商品接口调用失败：${messageText}`;
  }
  if (status === 408) {
    return '商品同步执行时间过长，系统已自动终止本次同步，请稍后重试。';
  }
  if (status === 401 || status === 403) {
    return `店铺授权信息不可用：${messageText}`;
  }
  return messageText;
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
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [draftActionId, setDraftActionId] = useState<string>();
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [mappingStatus, setMappingStatus] = useState<MappingStatus>('UNMAPPED');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [syncStatus, setSyncStatus] = useState<SaleProductSyncStatus | null>(null);
  const [syncSubmission, setSyncSubmission] = useState<SaleProductSyncTaskSubmitResponse | null>(null);
  const [draftResult, setDraftResult] = useState<DraftGenerateResult | null>(null);
  const previousActiveTaskIdRef = useRef<string | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const accountOptions = useMemo(
    () => accounts.map((item) => ({ label: `${item.accountName} (${item.id})`, value: item.id })),
    [accounts],
  );

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
          `成功写入：${latestFinishedSyncTask.successCount ?? 0}`,
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
      message.error('加载草稿映射失败');
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
          mappingStatus: status || undefined,
        }),
        saleApi.listProductMappingDrafts(accountId),
      ]);
      setRows(list);
      setDrafts(draftList);
    } catch (error) {
      console.error(error);
      message.error('加载商品绑定列表失败');
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
      message.error('加载渠道账号失败');
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
      message.error(resolveSyncErrorMessage(error));
    } finally {
      setSyncing(false);
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
      message.success(`草稿生成完成：新增 ${result.generatedCount} 条候选，当前待评审 ${result.pendingCount} 条`);
      await loadDrafts(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('生成草稿映射失败');
    } finally {
      setDraftGenerating(false);
    }
  };

  const handleApproveDraft = useCallback(async (draftId: string) => {
    setDraftActionId(draftId);
    try {
      await saleApi.approveProductMappingDraft(draftId);
      message.success('已确认正式映射');
      await loadRows(selectedAccountId, mappingStatus);
    } catch (error) {
      console.error(error);
      message.error('确认映射失败');
    } finally {
      setDraftActionId(undefined);
    }
  }, [loadRows, mappingStatus, selectedAccountId]);

  const handleRejectDraft = useCallback(async (draftId: string) => {
    setDraftActionId(draftId);
    try {
      await saleApi.rejectProductMappingDraft(draftId);
      message.success('已驳回该候选');
      await loadDrafts(selectedAccountId);
    } catch (error) {
      console.error(error);
      message.error('驳回草稿失败');
    } finally {
      setDraftActionId(undefined);
    }
  }, [loadDrafts, selectedAccountId]);

  const columns: ColumnsType<DisplayMappingRow> = useMemo(
    () => [
      {
        title: '商品信息',
        key: 'product',
        width: 340,
        fixed: 'left',
        onCell: (record) => ({ rowSpan: record.skcGroupRowSpan }),
        render: (_, record) => {
          const snapshot = parsePlatformSnapshot(record.platformSnapshotJson);
          const categoryLabel = record.platformCategoryPath?.split(' / ').at(-1);
          return (
            <Space align="start" size={12}>
              {renderImage(record.platformMainImageUrl, record.platformProductName)}
              <Space direction="vertical" size={4}>
                <Typography.Text strong style={{ fontSize: 16, lineHeight: 1.5 }}>
                  {record.platformProductName || record.platformSkuId}
                </Typography.Text>
                <Typography.Text type="secondary">类目：{categoryLabel || record.platformCategoryPath || '--'}</Typography.Text>
                <Typography.Text type="secondary" copyable={{ text: record.platformSpuId || '' }}>
                  SPU ID：{record.platformSpuId || '--'}
                </Typography.Text>
                <Typography.Text type="secondary" copyable={{ text: record.platformSkcId || '' }}>
                  SKC ID：{record.platformSkcId || '--'}
                </Typography.Text>
                <Typography.Text type="secondary">货号：{snapshot?.extCode || record.platformSkuCode || '--'}</Typography.Text>
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
          const preview = properties.slice(0, 4);
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
        title: '映射信息',
        children: [
          {
            title: '草稿候选',
            key: 'drafts',
            width: 300,
            render: (_, record) => {
              const candidates = draftsByMappingId.get(record.id) ?? [];
              if (!candidates.length) {
                return <Typography.Text type="secondary">暂无候选</Typography.Text>;
              }
              const draft = candidates[0];
              const attributeTags = parseAttributeEntries(draft.candidateAttributesJson);
              return (
                <Space direction="vertical" size={6}>
                  <Space size={[4, 4]} wrap>
                    <Tag color="gold">置信度 {draft.confidence || '--'}</Tag>
                    <Tag>{draft.matchSource || '--'}</Tag>
                  </Space>
                  <Typography.Text strong>
                    {draft.candidateStyleNo || '--'} / {draft.candidateStyleName || '--'}
                  </Typography.Text>
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
          {
            title: '正式映射',
            key: 'confirmed',
            width: 280,
            render: (_, record) => {
              const attributes = parseAttributeEntries(record.styleVariantAttributesJson);
              if (!record.styleVariantId) {
                return <Typography.Text type="secondary">未确认</Typography.Text>;
              }
              return (
                <Space direction="vertical" size={6}>
                  <Typography.Text strong>
                    {record.styleNo || '--'} / {record.styleName || '--'}
                  </Typography.Text>
                  <Typography.Text>
                    规格：{record.styleVariantColor || '--'} / {record.styleVariantSize || '--'}
                  </Typography.Text>
                  <Typography.Text type="secondary">variantId：{record.styleVariantId || '--'}</Typography.Text>
                  {attributes.length ? (
                    <Space size={[4, 4]} wrap>
                      {attributes.map((item) => (
                        <Tag key={item} color="blue">
                          {item}
                        </Tag>
                      ))}
                    </Space>
                  ) : null}
                </Space>
              );
            },
          },
        ],
      },
      {
        title: 'SKU ID',
        key: 'sku',
        width: 180,
        render: (_, record) => (
          <Typography.Text strong copyable={{ text: record.platformSkuId }}>
            {record.platformSkuId}
          </Typography.Text>
        ),
      },
      {
        title: '商品规格',
        key: 'normalized',
        width: 230,
        render: (_, record) => {
          const attributes = parseAttributeEntries(record.normalizedAttributesJson);
          return (
            <Space direction="vertical" size={6}>
              <Typography.Text>颜色：{record.normalizedColor || '--'}</Typography.Text>
              <Typography.Text>尺码：{record.normalizedSize || '--'}</Typography.Text>
              {record.normalizedSpecSummary ? (
                <Typography.Text type="secondary">{record.normalizedSpecSummary}</Typography.Text>
              ) : null}
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
        title: '库存',
        key: 'inventory',
        width: 100,
        render: () => <Typography.Text>-</Typography.Text>,
      },
      {
        title: '状态',
        key: 'status',
        width: 170,
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
            <Space direction="vertical" size={4}>
              <Tag color={color}>{record.mappingStatus || '--'}</Tag>
              <Typography.Text type="secondary">最近同步：{record.lastSyncedAt || '--'}</Typography.Text>
              <Typography.Text type="secondary">更新时间：{record.updatedAt || '--'}</Typography.Text>
            </Space>
          );
        },
      },
    ],
    [draftActionId, draftsByMappingId, handleApproveDraft, handleRejectDraft],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            商品绑定
          </Typography.Title>
          <Space>
            <Select
              style={{ width: 320 }}
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="选择渠道账号"
            />
            {sellerTypeTag(selectedAccount?.sellerType)}
            <Button onClick={() => void loadRows(selectedAccountId, mappingStatus)}>刷新</Button>
          </Space>
        </Space>
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          message="流程改为：先同步平台商品，再生成草稿映射，最后由人工逐条确认正式映射。系统不会自动写入正式款式关系。"
        />
      </Card>

      <Card title="步骤 1：同步平台商品">
        <Space>
          <Popconfirm
            title="确认提交 Temu 商品后台同步任务？"
            onConfirm={() => void handleSync()}
            okText="确认"
            cancelText="取消"
          >
            <Button type="primary" loading={syncing} disabled={hasActiveSyncTask}>
              {hasActiveSyncTask ? '同步进行中' : '一键同步商品'}
            </Button>
          </Popconfirm>
          <Button loading={draftGenerating} onClick={() => void handleGenerateDrafts()}>
            生成草稿候选
          </Button>
        </Space>
        {shouldShowSyncSubmission ? (
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
            message={`草稿生成完成：新增 ${draftResult.generatedCount} 条候选，当前待评审 ${draftResult.pendingCount} 条`}
          />
        ) : null}
      </Card>

      <Card
        title="步骤 2：评审商品与本地款式关系"
        extra={
          <Space>
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
          rowSelection={{
            selectedRowKeys,
            onSelect: (record, selected) => {
              if (!record.skcGroupHead) {
                return;
              }
              setSelectedRowKeys((current) =>
                selected ? Array.from(new Set([...current, record.id])) : current.filter((item) => item !== record.id),
              );
            },
            onSelectAll: (selected) => {
              setSelectedRowKeys(selected ? skcSelectableRowIds : []);
            },
            getCheckboxProps: (record) => ({
              disabled: !record.skcGroupHead,
            }),
            renderCell: (_checked, record, _index, originNode) => {
              if (!record.skcGroupHead) {
                return null;
              }
              return originNode;
            },
          }}
          loading={loading}
          columns={columns}
          dataSource={displayRows}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 2410 }}
        />
      </Card>
    </Space>
  );
};

export default SaleChannelMappings;
