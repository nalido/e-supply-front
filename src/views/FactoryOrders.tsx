import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Pagination,
  Progress,
  Row,
  Col,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  DownloadOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type {
  FactoryOrderItem,
  FactoryOrderMetric,
  FactoryOrderProgress,
  FactoryOrderStatusSummary,
  FactoryOrderTableRow,
} from '../types';
import { factoryOrdersApi, type FactoryOrderCostDetail, type FactoryOrderProgressNode } from '../api/factory-orders';
import { stylesApi } from '../api/styles';
import { partnersApi } from '../api/partners';
import sampleOrderApi from '../api/sample-order';
import dayjs from 'dayjs';
import '../styles/factory-orders.css';
import ListImage from '../components/common/ListImage';

type ViewMode = 'card' | 'table';
type OverallStatus = 'all' | 'unfinished' | 'completed';
const VIEW_MODE_STORAGE_KEY = 'factory-orders-view-mode';

const sortOptions = [
  { label: '更新时间（新 → 旧）', value: 'order-desc' },
  { label: '更新时间（旧 → 新）', value: 'order-asc' },
  { label: '预计交货（近 → 远）', value: 'delivery-asc' },
  { label: '预计交货（远 → 近）', value: 'delivery-desc' },
];

const getMaterialTagColor = (status: string) => {
  if (status.includes('未采购')) return 'volcano';
  if (status.includes('采购中')) return 'orange';
  if (status.includes('已入仓') || status.includes('齐备')) return 'green';
  return 'default';
};

const { Text } = Typography;

type SelectOption = {
  label: string;
  value: number;
  image?: string;
  colors?: string[];
  sizes?: string[];
};

type ImportRecord = {
  orderNo: string;
  styleId: number;
  merchandiserId?: number;
  factoryId?: number;
  totalQuantity: number;
  expectedDelivery?: string;
  status?: string;
  materialStatus?: string;
  remarks?: string;
};

type OrderActionSnapshot = {
  orderId: string;
  orderCode: string;
  styleCode?: string;
  styleName?: string;
  expectedDelivery?: string;
  materialStatus?: string;
  orderQuantity?: number;
  productionStage?: string;
};

type CreateQuantityMatrix = Record<string, Record<string, number>>;
type ProgressStatRow = {
  key: string;
  color: string;
  size: string;
  orderedQty: number;
  cuttingQty: number;
  sewingQty: number;
};
type AllocationQuantityMatrix = Record<string, Record<string, number>>;
type AllocationHistoryRow = {
  key: string;
  completedAt?: string;
  factoryId?: number;
  unitPrice?: number;
  totalQty: number;
  itemSummary: string;
  items: Array<{ color: string; size: string; quantity: number }>;
};
type InOutSummaryRow = {
  key: string;
  color: string;
  size: string;
  totalQty: number;
  pendingQty: number;
  doneQty: number;
};
type InOutDetailRow = {
  key: string;
  factoryId?: number;
  color: string;
  size: string;
  dispatchQty: number;
  doneQty: number;
};

const overallStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '未完成', value: 'unfinished' },
  { label: '已完成', value: 'completed' },
];

const statusQueryMap: Record<OverallStatus, string[]> = {
  all: ['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  unfinished: ['DRAFT', 'RELEASED', 'IN_PROGRESS'],
  completed: ['COMPLETED', 'CANCELLED'],
};

const statusTabDefaults: Array<{ key: string; label: string }> = [
  { key: 'DRAFT', label: '草稿' },
  { key: 'RELEASED', label: '已下发' },
  { key: 'IN_PROGRESS', label: '生产中' },
  { key: 'COMPLETED', label: '已完工' },
  { key: 'CANCELLED', label: '已取消' },
];

const materialStatusOptions = [
  { label: '待齐备', value: 'PENDING' },
  { label: '齐备中', value: 'ALLOCATING' },
  { label: '已齐备（已发料）', value: 'ALLOCATED' },
];

const progressNodeCodeMap: Record<string, string> = {
  order_placed: 'ORDER_PLACED',
  fabric_arrived: 'FABRIC_ARRIVED',
  accessory_arrived: 'ACCESSORY_ARRIVED',
  cutting: 'CUTTING',
  sewing: 'SEWING',
  inbound: 'INBOUND',
  outbound: 'OUTBOUND',
  completed: 'COMPLETED',
};

const resolveOverallCompleted = (isCompleted?: boolean, statusKey?: string) =>
  Boolean(isCompleted || statusKey === 'COMPLETED' || statusKey === 'CANCELLED');

const getOverallStatusMeta = (isCompleted?: boolean, statusKey?: string) =>
  resolveOverallCompleted(isCompleted, statusKey)
    ? { label: '已完成', color: '#52c41a' }
    : { label: '未完成', color: '#1890ff' };

const normalizeProgressLabel = (stage: FactoryOrderProgress): string => {
  if (stage.key === 'accessory_arrived') {
    return '辅料是否到货';
  }
  if (stage.key === 'fabric_arrived') {
    return '面料是否到货';
  }
  return stage.label;
};

const parseAllocationCompletionValue = (value?: string) => {
  if (!value) {
    return null;
  }
  const matched = value.match(/分配\s*(\d+)%\s*\/\s*完成\s*(\d+)%/);
  if (!matched) {
    return null;
  }
  return {
    allocatedPercent: Number(matched[1] ?? 0),
    completedPercent: Number(matched[2] ?? 0),
  };
};

const normalizeTagValues = (values?: string[]) =>
  Array.from(
    new Set(
      (values ?? [])
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  );

const normalizeQtyValue = (value?: number | null) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
};

const buildCreateMatrix = (
  colors: string[],
  sizes: string[],
  prev?: CreateQuantityMatrix,
): CreateQuantityMatrix =>
  colors.reduce<CreateQuantityMatrix>((matrix, color) => {
    matrix[color] = sizes.reduce<Record<string, number>>((row, size) => {
      row[size] = normalizeQtyValue(prev?.[color]?.[size]);
      return row;
    }, {});
    return matrix;
  }, {});

const FactoryOrders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [metrics, setMetrics] = useState<FactoryOrderMetric[]>([]);
  const [statusTabs, setStatusTabs] = useState<FactoryOrderStatusSummary[]>([]);
  const [cardOrders, setCardOrders] = useState<FactoryOrderItem[]>([]);
  const [cardTotal, setCardTotal] = useState(0);
  const [cardPage, setCardPage] = useState(1);
  const [cardPageSize, setCardPageSize] = useState(6);
  const [tableOrders, setTableOrders] = useState<FactoryOrderTableRow[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<OverallStatus>('unfinished');
  const [sortKey, setSortKey] = useState('order-desc');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === 'card' || stored === 'table') {
        return stored;
      }
    }
    return 'card';
  });
  const [reloadFlag, setReloadFlag] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importModal, setImportModal] = useState<{
    open: boolean;
    records: ImportRecord[];
    fileList: UploadFile[];
    uploading: boolean;
    error?: string;
  }>({ open: false, records: [], fileList: [], uploading: false });
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const [createOptionsLoading, setCreateOptionsLoading] = useState(false);
  const [styleOptions, setStyleOptions] = useState<SelectOption[]>([]);
  const [factoryOptions, setFactoryOptions] = useState<SelectOption[]>([]);
  const [merchandiserOptions, setMerchandiserOptions] = useState<SelectOption[]>([]);
  const [createColors, setCreateColors] = useState<string[]>([]);
  const [createSizes, setCreateSizes] = useState<string[]>([]);
  const [createMatrix, setCreateMatrix] = useState<CreateQuantityMatrix>({});
  const [createMatrixSeedStyleId, setCreateMatrixSeedStyleId] = useState<number | null>(null);
  const [costDetailRecord, setCostDetailRecord] = useState<OrderActionSnapshot | null>(null);
  const [costDetailLoading, setCostDetailLoading] = useState(false);
  const [costDetailData, setCostDetailData] = useState<FactoryOrderCostDetail | null>(null);
  const [printPreviewRecord, setPrintPreviewRecord] = useState<OrderActionSnapshot | null>(null);
  const [progressActionModal, setProgressActionModal] = useState<{
    open: boolean;
    submitting: boolean;
    order?: OrderActionSnapshot;
    stage?: FactoryOrderProgress;
  }>({ open: false, submitting: false });
  const [progressStats, setProgressStats] = useState<{ loading: boolean; rows: ProgressStatRow[] }>({
    loading: false,
    rows: [],
  });
  const [allocationColors, setAllocationColors] = useState<string[]>([]);
  const [allocationSizes, setAllocationSizes] = useState<string[]>([]);
  const [allocationMatrix, setAllocationMatrix] = useState<AllocationQuantityMatrix>({});
  const [allocationHistoryRows, setAllocationHistoryRows] = useState<AllocationHistoryRow[]>([]);
  const [allocationCreateModalOpen, setAllocationCreateModalOpen] = useState(false);
  const [allocationCreateSubmitting, setAllocationCreateSubmitting] = useState(false);
  const [allocationCreateForm] = Form.useForm();
  const [progressTabKey, setProgressTabKey] = useState<'stats' | 'allocation'>('stats');
  const [inOutTabKey, setInOutTabKey] = useState<'pending' | 'detail'>('pending');
  const [inOutData, setInOutData] = useState<{
    loading: boolean;
    summaryRows: InOutSummaryRow[];
    detailRows: InOutDetailRow[];
  }>({ loading: false, summaryRows: [], detailRows: [] });
  const [progressActionForm] = Form.useForm();
  const selectedCreateStyleId = Form.useWatch('styleId', createForm);

  const loadFactoryOptions = useCallback(async () => {
    const [factoryResp, subcontractorResp] = await Promise.all([
      partnersApi.list({ type: 'factory', page: 1, pageSize: 200 }),
      partnersApi.list({ type: 'subcontractor', page: 1, pageSize: 200 }),
    ]);
    const optionMap = new Map<number, SelectOption>();
    [...(factoryResp.list ?? []), ...(subcontractorResp.list ?? [])].forEach((item) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) {
        return;
      }
      optionMap.set(id, {
        value: id,
        label: item.name,
      });
    });
    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
  }, []);

  const fetchSummary = useCallback(() => {
    let cancelled = false;
    const loadSummary = async () => {
      setLoadingSummary(true);
      try {
        const data = await factoryOrdersApi.getSummary();
        if (cancelled) {
          return;
        }
        setMetrics(data.metrics);
        setStatusTabs(data.statusTabs);
      } catch (err) {
        console.error('failed to fetch factory order summary', err);
        if (!cancelled) {
          message.error('获取工厂订单概览失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    };
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = fetchSummary();
    return cancel;
  }, [fetchSummary, reloadFlag]);

  useEffect(() => {
    let cancelled = false;
    const loadCards = async () => {
      setLoadingCards(true);
      try {
        const backendStatuses = statusQueryMap[activeStatus];
        const response = await factoryOrdersApi.getCards({
          status: backendStatuses,
          keyword: appliedKeyword,
          includeCompleted: activeStatus !== 'unfinished',
          sort: sortKey,
          page: cardPage,
          pageSize: cardPageSize,
        });
        if (cancelled) {
          return;
        }
        setCardOrders(response.list);
        setCardTotal(response.total);
      } catch (err) {
        console.error('failed to fetch factory order cards', err);
        if (!cancelled) {
          message.error('获取工厂订单卡片失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoadingCards(false);
        }
      }
    };
    void loadCards();
    return () => {
      cancelled = true;
    };
  }, [activeStatus, appliedKeyword, sortKey, cardPage, cardPageSize, reloadFlag]);

  useEffect(() => {
    let cancelled = false;
    const loadTable = async () => {
      setLoadingTable(true);
      try {
        const backendStatuses = statusQueryMap[activeStatus];
        const response = await factoryOrdersApi.getTable({
          status: backendStatuses,
          keyword: appliedKeyword,
          includeCompleted: activeStatus !== 'unfinished',
          sort: sortKey,
          page: tablePage,
          pageSize: tablePageSize,
        });
        if (cancelled) {
          return;
        }
        setTableOrders(response.list);
        setTableTotal(response.total);
      } catch (err) {
        console.error('failed to fetch factory order table rows', err);
        if (!cancelled) {
          message.error('获取工厂订单表格失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoadingTable(false);
        }
      }
    };
    void loadTable();
    return () => {
      cancelled = true;
    };
  }, [activeStatus, appliedKeyword, sortKey, tablePage, tablePageSize, reloadFlag]);

  const currentVisibleIds = useMemo(
    () => (viewMode === 'card'
      ? cardOrders.map((order) => order.id)
      : tableOrders.map((record) => record.id)),
    [viewMode, cardOrders, tableOrders],
  );

  const visibleSelectedCount = currentVisibleIds.filter((id) => selectedOrderIds.includes(id)).length;
  const allVisibleSelected = currentVisibleIds.length > 0 && visibleSelectedCount === currentVisibleIds.length;
  const indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < currentVisibleIds.length;

  const resetPagination = useCallback(() => {
    setCardPage(1);
    setTablePage(1);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setAppliedKeyword(value.trim());
    resetPagination();
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (!value) {
      setAppliedKeyword('');
      resetPagination();
    }
  };

  const handleRefresh = () => {
    triggerReload();
  };

  const handleToggleOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      if (checked) {
        if (prev.includes(orderId)) return prev;
        return [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });
  };

  const handleToggleVisible = (event: CheckboxChangeEvent) => {
    const { checked } = event.target;
    if (checked) {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...currentVisibleIds])));
      return;
    }
    const visibleSet = new Set(currentVisibleIds);
    setSelectedOrderIds((prev) => prev.filter((id) => !visibleSet.has(id)));
  };

  const triggerReload = () => {
    setReloadFlag((flag) => flag + 1);
  };

  const handleExport = async (selectedOnly: boolean) => {
    if (selectedOnly && selectedOrderIds.length === 0) {
      message.warning('请先勾选需要导出的订单');
      return;
    }
    try {
      setExporting(true);
      const backendStatuses = statusQueryMap[activeStatus];
      const response = await factoryOrdersApi.exportOrders({
        status: backendStatuses,
        keyword: appliedKeyword,
        includeCompleted: activeStatus !== 'unfinished',
        sort: sortKey,
        orderIds: selectedOnly ? selectedOrderIds : undefined,
      });
      if (response.fileUrl) {
        message.success(`已生成导出文件：${response.fileUrl}`);
      } else {
        message.success('已生成导出任务，请稍后在下载中心查看');
      }
    } catch (error) {
      console.error('failed to export factory orders', error);
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const loadCreateOptions = useCallback(async () => {
    setCreateOptionsLoading(true);
    try {
      const [stylesResponse, factoriesOptions, sampleMeta] = await Promise.all([
        stylesApi.list({ page: 1, pageSize: 200 }),
        loadFactoryOptions(),
        sampleOrderApi.getMeta().catch(() => undefined),
      ]);

      setStyleOptions((stylesResponse.list ?? []).map((item) => ({
        value: Number(item.id),
        label: `${item.styleNo} / ${item.styleName}`,
        image: item.image,
        colors: item.colors ?? [],
        sizes: item.sizes ?? [],
      })));
      setFactoryOptions(factoriesOptions);
      setMerchandiserOptions((sampleMeta?.merchandisers ?? []).map((item) => ({
        value: Number(item.id),
        label: item.title ? `${item.name}（${item.title}）` : item.name,
      })));
    } catch (error) {
      console.error('failed to fetch create-order options', error);
      message.error(error instanceof Error ? error.message : '加载下拉选项失败，请稍后重试');
      setStyleOptions([]);
      setFactoryOptions([]);
      setMerchandiserOptions([]);
    } finally {
      setCreateOptionsLoading(false);
    }
  }, [createForm, loadFactoryOptions]);

  const handleOpenCreate = useCallback((presetStyleId?: number) => {
    setCreateModalOpen(true);
    setCreateColors([]);
    setCreateSizes([]);
    setCreateMatrix({});
    setCreateMatrixSeedStyleId(null);
    createForm.setFieldsValue({
      overallStatus: 'unfinished',
      materialStatus: 'PENDING',
      ...(presetStyleId && Number.isFinite(presetStyleId) ? { styleId: presetStyleId } : {}),
    });
    void loadCreateOptions();
  }, [createForm, loadCreateOptions]);

  const handleCloseCreate = () => {
    setCreateModalOpen(false);
    setCreateColors([]);
    setCreateSizes([]);
    setCreateMatrix({});
    setCreateMatrixSeedStyleId(null);
    createForm.resetFields();
  };

  const handleOpenCostDetail = useCallback(async (record: OrderActionSnapshot) => {
    setCostDetailRecord(record);
    setCostDetailLoading(true);
    try {
      const detail = await factoryOrdersApi.getCostDetail(record.orderId);
      setCostDetailData(detail);
    } catch (error) {
      console.error('failed to fetch factory order cost detail', error);
      setCostDetailData(null);
      message.error('获取大货成本明细失败，请稍后重试');
    } finally {
      setCostDetailLoading(false);
    }
  }, []);

  const handleOpenPrintPreview = useCallback((record: OrderActionSnapshot) => {
    setPrintPreviewRecord(record);
  }, []);

  const escapeHtml = (value?: string) => {
    if (!value) {
      return '-';
    }
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  const handlePrintInBrowser = useCallback(() => {
    if (!printPreviewRecord) {
      return;
    }
    const rows = [
      ['订单号', printPreviewRecord.orderCode],
      ['款号', printPreviewRecord.styleCode ?? '-'],
      ['款名', printPreviewRecord.styleName ?? '-'],
      [
        '下单数量',
        typeof printPreviewRecord.orderQuantity === 'number'
          ? `${printPreviewRecord.orderQuantity.toLocaleString()} 件`
          : '-',
      ],
      ['预计交货', printPreviewRecord.expectedDelivery ?? '-'],
      ['物料状态', printPreviewRecord.materialStatus ?? '-'],
      ['生产阶段', printPreviewRecord.productionStage ?? '-'],
    ];
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>工厂订单打印 - ${escapeHtml(printPreviewRecord.orderCode)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 24px;
        color: #111827;
        font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Heiti SC", sans-serif;
      }
      h1 {
        margin: 0 0 16px;
        font-size: 22px;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #e5e7eb;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 10px 12px;
        text-align: left;
        font-size: 14px;
        line-height: 1.5;
      }
      th {
        width: 160px;
        background: #f9fafb;
        font-weight: 600;
      }
      @media print {
        body { margin: 0; }
      }
    </style>
  </head>
  <body>
    <h1>工厂订单打印预览</h1>
    <table>
      <tbody>
        ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}
      </tbody>
    </table>
  </body>
</html>`;
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const cleanup = () => {
        window.setTimeout(() => {
          iframe.remove();
        }, 800);
      };

      const triggerPrint = () => {
        const frameWindow = iframe.contentWindow;
        if (!frameWindow) {
          cleanup();
          message.error('打印失败，请稍后重试');
          return;
        }
        frameWindow.focus();
        frameWindow.print();
        cleanup();
      };

      iframe.onload = () => {
        window.setTimeout(triggerPrint, 120);
      };

      iframe.srcdoc = html;
    } catch (error) {
      console.error('failed to print factory order', error);
      message.error('打印失败，请稍后重试');
    }
  }, [printPreviewRecord]);

  const handleCopyOrder = useCallback(async (record: OrderActionSnapshot) => {
    setCreateModalOpen(true);
    setCreateColors([]);
    setCreateSizes([]);
    setCreateMatrix({});
    setCreateMatrixSeedStyleId(null);
    await loadCreateOptions();
    createForm.setFieldsValue({
      orderNo: undefined,
      overallStatus: 'unfinished',
      materialStatus: 'PENDING',
      expectedDelivery: record.expectedDelivery ? dayjs(record.expectedDelivery) : undefined,
      remarks: `复制自订单 ${record.orderCode}`,
    });
    message.success(`已打开复制创建弹窗：${record.orderCode}`);
  }, [createForm, loadCreateOptions]);

  const buildSpecKey = (color?: string, size?: string) => `${(color ?? '').trim()}::${(size ?? '').trim()}`;

  const normalizeSpecLabel = (value?: string) => {
    const text = (value ?? '').trim();
    return text || '-';
  };

  const loadProgressStats = useCallback(async (orderId: string, stageKey: 'cutting' | 'sewing') => {
    setProgressStats({ loading: true, rows: [] });
    try {
      const parseAllocationNodeItems = (node?: FactoryOrderProgressNode): Array<{ color: string; size: string; quantity: number }> => {
        if (!node?.payloadJson) {
          return [];
        }
        try {
          const payload = JSON.parse(node.payloadJson) as {
            allocations?: Array<{
              items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>;
            }>;
            items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>;
          };
          const sourceAllocations = Array.isArray(payload.allocations) ? payload.allocations : [];
          const normalizedItems = sourceAllocations.flatMap((allocation) => allocation.items ?? []);
          const fallbackItems = normalizedItems.length > 0 ? normalizedItems : (payload.items ?? []);
          const mergedMap = new Map<string, { color: string; size: string; quantity: number }>();
          fallbackItems.forEach((item) => {
            const color = normalizeSpecLabel(typeof item.color === 'string' ? item.color : undefined);
            const size = normalizeSpecLabel(typeof item.size === 'string' ? item.size : undefined);
            const quantity = Number(item.quantity ?? 0);
            if (!Number.isFinite(quantity) || quantity <= 0) {
              return;
            }
            const key = buildSpecKey(color, size);
            const prev = mergedMap.get(key);
            if (prev) {
              prev.quantity += quantity;
            } else {
              mergedMap.set(key, { color, size, quantity });
            }
          });
          return Array.from(mergedMap.values());
        } catch {
          return [];
        }
      };

      const [nodes, detail] = await Promise.all([
        factoryOrdersApi.getProgress(orderId),
        factoryOrdersApi.getDetail(orderId),
      ]);
      const stageNodeCode = stageKey === 'cutting' ? 'CUTTING' : 'SEWING';
      const stageNode = nodes.find((item) => item.nodeCode === stageNodeCode);
      const historyRows: AllocationHistoryRow[] = [];
      if (stageNode?.payloadJson) {
        try {
          const payload = JSON.parse(stageNode.payloadJson) as {
            allocations?: Array<{
              completedAt?: unknown;
              subcontractorId?: unknown;
              unitPrice?: unknown;
              items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>;
            }>;
            completedAt?: unknown;
            subcontractorId?: unknown;
            unitPrice?: unknown;
            items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>;
          };
          const allocations = Array.isArray(payload.allocations) && payload.allocations.length
            ? payload.allocations
            : [payload];
          allocations.forEach((allocation, index) => {
            const items = (allocation.items ?? [])
              .map((item) => ({
                color: typeof item.color === 'string' ? item.color : '-',
                size: typeof item.size === 'string' ? item.size : '-',
                quantity: Number(item.quantity ?? 0),
              }))
              .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
            const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
            if (totalQty <= 0) {
              return;
            }
            historyRows.push({
              key: `${stageNodeCode}-${index}`,
              completedAt: typeof allocation.completedAt === 'string' ? allocation.completedAt : undefined,
              factoryId: Number.isFinite(Number(allocation.subcontractorId))
                ? Number(allocation.subcontractorId)
                : undefined,
              unitPrice: Number.isFinite(Number(allocation.unitPrice))
                ? Number(allocation.unitPrice)
                : undefined,
              totalQty,
              itemSummary: items.map((item) => `${item.color}/${item.size}:${item.quantity}`).join('；'),
              items,
            });
          });
        } catch {
          // ignore invalid payload history
        }
      }
      setAllocationHistoryRows(historyRows.reverse());
      const specMap = new Map<string, { key: string; color: string; size: string; orderedQty: number; cuttingQty: number; sewingQty: number }>();
      (detail.lines ?? []).forEach((line) => {
        const color = normalizeSpecLabel(line.color);
        const size = normalizeSpecLabel(line.size);
        const key = buildSpecKey(color, size);
        if (!specMap.has(key)) {
          specMap.set(key, { key, color, size, orderedQty: 0, cuttingQty: 0, sewingQty: 0 });
        }
        const row = specMap.get(key)!;
        row.orderedQty += Number(line.orderedQty ?? 0);
      });

      parseAllocationNodeItems(nodes.find((item) => item.nodeCode === 'CUTTING')).forEach((item) => {
        const key = buildSpecKey(item.color, item.size);
        if (!specMap.has(key)) {
          specMap.set(key, { key, color: item.color, size: item.size, orderedQty: 0, cuttingQty: 0, sewingQty: 0 });
        }
        specMap.get(key)!.cuttingQty += item.quantity;
      });

      parseAllocationNodeItems(nodes.find((item) => item.nodeCode === 'SEWING')).forEach((item) => {
        const key = buildSpecKey(item.color, item.size);
        if (!specMap.has(key)) {
          specMap.set(key, { key, color: item.color, size: item.size, orderedQty: 0, cuttingQty: 0, sewingQty: 0 });
        }
        specMap.get(key)!.sewingQty += item.quantity;
      });

      const rows = Array.from(specMap.values()).sort((a, b) => {
        if (a.color !== b.color) {
          return a.color.localeCompare(b.color, 'zh-CN');
        }
        return a.size.localeCompare(b.size, 'zh-CN');
      });
      setProgressStats({ loading: false, rows });
      const colors = Array.from(new Set(rows.map((row) => row.color)));
      const sizes = Array.from(new Set(rows.map((row) => row.size)));
      setAllocationColors(colors);
      setAllocationSizes(sizes);
      setAllocationMatrix(
        colors.reduce<AllocationQuantityMatrix>((matrix, color) => {
          matrix[color] = sizes.reduce<Record<string, number>>((row, size) => {
            row[size] = 0;
            return row;
          }, {});
          return matrix;
        }, {}),
      );
    } catch (error) {
      console.error('failed to load progress stats', error);
      setProgressStats({ loading: false, rows: [] });
      setAllocationColors([]);
      setAllocationSizes([]);
      setAllocationMatrix({});
      setAllocationHistoryRows([]);
    }
  }, []);

  const loadInOutData = useCallback(async (orderId: string, stageKey: 'inbound' | 'outbound') => {
    setInOutData({ loading: true, summaryRows: [], detailRows: [] });
    try {
      const parseNodeItems = (node?: FactoryOrderProgressNode): Array<{ color: string; size: string; quantity: number }> => {
        if (!node?.payloadJson) {
          return [];
        }
        try {
          const payload = JSON.parse(node.payloadJson) as { items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }> };
          return (payload.items ?? [])
            .map((item) => ({
              color: normalizeSpecLabel(typeof item.color === 'string' ? item.color : undefined),
              size: normalizeSpecLabel(typeof item.size === 'string' ? item.size : undefined),
              quantity: Number(item.quantity ?? 0),
            }))
            .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
        } catch {
          return [];
        }
      };

      const [nodes, detail] = await Promise.all([
        factoryOrdersApi.getProgress(orderId),
        factoryOrdersApi.getDetail(orderId),
      ]);
      const inboundNode = nodes.find((item) => item.nodeCode === 'INBOUND');
      const outboundNode = nodes.find((item) => item.nodeCode === 'OUTBOUND');
      const targetNode = stageKey === 'inbound' ? inboundNode : outboundNode;
      const doneMap = new Map<string, number>();
      parseNodeItems(targetNode).forEach((item) => {
        const key = buildSpecKey(item.color, item.size);
        doneMap.set(key, (doneMap.get(key) ?? 0) + item.quantity);
      });
      const isDone = targetNode?.status === 'COMPLETED';

      const summaryMap = new Map<string, InOutSummaryRow>();
      (detail.lines ?? []).forEach((line) => {
        const color = normalizeSpecLabel(line.color);
        const size = normalizeSpecLabel(line.size);
        const key = buildSpecKey(color, size);
        const totalQty = Number(line.orderedQty ?? 0);
        const existing = summaryMap.get(key);
        if (existing) {
          existing.totalQty += totalQty;
        } else {
          summaryMap.set(key, {
            key,
            color,
            size,
            totalQty,
            pendingQty: 0,
            doneQty: 0,
          });
        }
      });
      const summaryRows = Array.from(summaryMap.values())
        .map((row) => {
          const rawDoneQty = doneMap.get(row.key);
          const doneQty = Number.isFinite(rawDoneQty) ? Number(rawDoneQty) : (isDone ? row.totalQty : 0);
          return {
            ...row,
            doneQty: Math.min(doneQty, row.totalQty),
            pendingQty: Math.max(row.totalQty - doneQty, 0),
          };
        })
        .sort((a, b) => (a.color !== b.color ? a.color.localeCompare(b.color, 'zh-CN') : a.size.localeCompare(b.size, 'zh-CN')));

      const sewingNode = nodes.find((item) => item.nodeCode === 'SEWING');
      const detailMap = new Map<string, InOutDetailRow>();
      if (sewingNode?.payloadJson) {
        try {
          const payload = JSON.parse(sewingNode.payloadJson) as {
            allocations?: Array<{
              subcontractorId?: unknown;
              items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>;
            }>;
          };
          (payload.allocations ?? []).forEach((allocation, index) => {
            const factoryId = Number.isFinite(Number(allocation.subcontractorId))
              ? Number(allocation.subcontractorId)
              : undefined;
            (allocation.items ?? []).forEach((item, itemIndex) => {
              const dispatchQty = Number(item.quantity ?? 0);
              if (!Number.isFinite(dispatchQty) || dispatchQty <= 0) {
                return;
              }
              const color = normalizeSpecLabel(typeof item.color === 'string' ? item.color : undefined);
              const size = normalizeSpecLabel(typeof item.size === 'string' ? item.size : undefined);
              const key = `${factoryId ?? '-'}::${buildSpecKey(color, size)}`;
              const existing = detailMap.get(key);
              if (existing) {
                existing.dispatchQty += dispatchQty;
                return;
              }
              detailMap.set(key, {
                key: `${index}-${itemIndex}`,
                factoryId,
                color,
                size,
                dispatchQty,
                doneQty: isDone ? dispatchQty : 0,
              });
            });
          });
        } catch {
          // ignore parse failure
        }
      }
      setInOutData({
        loading: false,
        summaryRows,
        detailRows: Array.from(detailMap.values()).sort((a, b) => {
          const leftFactory = String(a.factoryId ?? '');
          const rightFactory = String(b.factoryId ?? '');
          if (leftFactory !== rightFactory) {
            return leftFactory.localeCompare(rightFactory, 'zh-CN');
          }
          if (a.color !== b.color) {
            return a.color.localeCompare(b.color, 'zh-CN');
          }
          return a.size.localeCompare(b.size, 'zh-CN');
        }),
      });
    } catch (error) {
      console.error('failed to load inbound/outbound data', error);
      setInOutData({ loading: false, summaryRows: [], detailRows: [] });
    }
  }, []);

  const handleOpenProgressAction = useCallback((record: OrderActionSnapshot, stage: FactoryOrderProgress) => {
    setProgressActionModal({ open: true, submitting: false, order: record, stage });
    setAllocationCreateModalOpen(false);
    allocationCreateForm.resetFields();
    setProgressTabKey(stage.key === 'cutting' || stage.key === 'sewing' ? 'stats' : 'allocation');
    setInOutTabKey('pending');
    if (stage.key === 'cutting' || stage.key === 'sewing') {
      void loadProgressStats(record.orderId, stage.key);
      void loadFactoryOptions()
        .then((options) => setFactoryOptions(options))
        .catch((error) => {
          console.error('failed to load factory options for progress action', error);
          setFactoryOptions([]);
          message.error('加载工厂列表失败，请稍后重试');
        });
      setInOutData({ loading: false, summaryRows: [], detailRows: [] });
    } else if (stage.key === 'inbound' || stage.key === 'outbound') {
      void loadInOutData(record.orderId, stage.key);
      void loadFactoryOptions()
        .then((options) => setFactoryOptions(options))
        .catch(() => undefined);
    } else {
      setProgressStats({ loading: false, rows: [] });
      setAllocationColors([]);
      setAllocationSizes([]);
      setAllocationMatrix({});
      setAllocationHistoryRows([]);
      setInOutData({ loading: false, summaryRows: [], detailRows: [] });
    }
    if (stage.key === 'fabric_arrived' || stage.key === 'accessory_arrived') {
      progressActionForm.setFieldsValue({ arrivedAt: dayjs() });
    } else if (stage.key === 'cutting' || stage.key === 'sewing') {
      progressActionForm.setFieldsValue({
        unitPrice: 0,
        items: [{ quantity: 1 }],
      });
    } else {
      progressActionForm.resetFields();
    }
  }, [allocationCreateForm, loadFactoryOptions, loadInOutData, loadProgressStats, progressActionForm]);

  const handleSubmitProgressAction = useCallback(async () => {
    if (!progressActionModal.order || !progressActionModal.stage) {
      return;
    }
    const nodeCode = progressNodeCodeMap[progressActionModal.stage.key];
    if (!nodeCode) {
      message.warning('当前节点不支持直接执行');
      return;
    }
    try {
      const values = await progressActionForm.validateFields();
      const payload: Record<string, unknown> = {};
      if (nodeCode === 'FABRIC_ARRIVED' || nodeCode === 'ACCESSORY_ARRIVED') {
        payload.arrivedAt = values.arrivedAt ? values.arrivedAt.toISOString() : dayjs().toISOString();
      }
      if (nodeCode === 'CUTTING' || nodeCode === 'SEWING') {
        payload.subcontractorId = values.factoryId;
        payload.unitPrice = values.unitPrice ?? 0;
        const requiredTotal = progressStats.rows.reduce((sum, row) => sum + row.orderedQty, 0);
        const matrixItems = allocationColors.flatMap((color) =>
          allocationSizes.map((size) => ({
            color: color === '-' ? undefined : color,
            size: size === '-' ? undefined : size,
            quantity: normalizeQtyValue(allocationMatrix[color]?.[size]),
          })),
        ).filter((item) => item.quantity > 0);
        const totalAllocated = matrixItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalAllocated <= 0) {
          message.warning('请在分配矩阵中填写大于 0 的数量');
          return;
        }
        if (requiredTotal > 0 && totalAllocated > requiredTotal) {
          message.warning(`分配总量不能超过下单总量（${requiredTotal}），当前为 ${totalAllocated}`);
          return;
        }
        payload.items = matrixItems;
      }
      setProgressActionModal((prev) => ({ ...prev, submitting: true }));
      await factoryOrdersApi.completeProgress(
        progressActionModal.order.orderId,
        nodeCode,
        { payload },
      );
      message.success(`${normalizeProgressLabel(progressActionModal.stage)} 已执行`);
      setProgressActionModal({ open: false, submitting: false });
      progressActionForm.resetFields();
      triggerReload();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to complete progress node', error);
      message.error(error instanceof Error ? error.message : '节点执行失败');
    } finally {
      setProgressActionModal((prev) => ({ ...prev, submitting: false }));
    }
  }, [allocationColors, allocationMatrix, allocationSizes, progressActionForm, progressActionModal, progressStats.rows]);

  useEffect(() => {
    if (searchParams.get('quickCreate') !== '1') {
      return;
    }
    const styleIdRaw = searchParams.get('styleId');
    const parsedStyleId = styleIdRaw ? Number(styleIdRaw) : NaN;
    const presetStyleId = Number.isFinite(parsedStyleId) && parsedStyleId > 0 ? parsedStyleId : undefined;
    handleOpenCreate(presetStyleId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('quickCreate');
    nextParams.delete('styleId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, handleOpenCreate]);

  useEffect(() => {
    if (!createModalOpen) {
      return;
    }
    const styleId = Number(selectedCreateStyleId);
    if (!Number.isFinite(styleId) || styleId <= 0) {
      setCreateColors([]);
      setCreateSizes([]);
      setCreateMatrix({});
      setCreateMatrixSeedStyleId(null);
      return;
    }
    if (createMatrixSeedStyleId === styleId) {
      return;
    }
    const style = styleOptions.find((item) => item.value === styleId);
    const defaultColors = normalizeTagValues(style?.colors ?? []);
    const defaultSizes = normalizeTagValues(style?.sizes ?? []);
    setCreateColors(defaultColors);
    setCreateSizes(defaultSizes);
    setCreateMatrix(buildCreateMatrix(defaultColors, defaultSizes));
    setCreateMatrixSeedStyleId(styleId);
  }, [createMatrixSeedStyleId, createModalOpen, selectedCreateStyleId, styleOptions]);

  const handleCreateColorsChange = useCallback((values: string[]) => {
    const nextColors = normalizeTagValues(values);
    setCreateColors(nextColors);
    setCreateMatrix((prev) => buildCreateMatrix(nextColors, createSizes, prev));
  }, [createSizes]);

  const handleCreateSizesChange = useCallback((values: string[]) => {
    const nextSizes = normalizeTagValues(values);
    setCreateSizes(nextSizes);
    setCreateMatrix((prev) => buildCreateMatrix(createColors, nextSizes, prev));
  }, [createColors]);

  const handleCreateMatrixQtyChange = useCallback((color: string, size: string, value?: number | null) => {
    const qty = normalizeQtyValue(value);
    setCreateMatrix((prev) => ({
      ...prev,
      [color]: {
        ...(prev[color] ?? {}),
        [size]: qty,
      },
    }));
  }, []);

  const handleAllocationMatrixQtyChange = useCallback((color: string, size: string, value?: number | null) => {
    const qty = normalizeQtyValue(value);
    setAllocationMatrix((prev) => ({
      ...prev,
      [color]: {
        ...(prev[color] ?? {}),
        [size]: qty,
      },
    }));
  }, []);

  const handleLoadRemainingAllocation = useCallback(() => {
    if (!allocationColors.length || !allocationSizes.length) {
      message.warning('暂无可加载的颜色/尺码分配数据');
      return;
    }
    const orderedMatrix = progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
      if (!matrix[row.color]) {
        matrix[row.color] = {};
      }
      matrix[row.color][row.size] = row.orderedQty;
      return matrix;
    }, {});
    const historyMatrix = allocationHistoryRows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
      row.items.forEach((item) => {
        if (!matrix[item.color]) {
          matrix[item.color] = {};
        }
        matrix[item.color][item.size] = (matrix[item.color][item.size] ?? 0) + item.quantity;
      });
      return matrix;
    }, {});
    setAllocationMatrix((prev) =>
      allocationColors.reduce<AllocationQuantityMatrix>((matrix, color) => {
        matrix[color] = allocationSizes.reduce<Record<string, number>>((row, size) => {
          const ordered = orderedMatrix[color]?.[size] ?? 0;
          const historyAllocated = historyMatrix[color]?.[size] ?? 0;
          const current = normalizeQtyValue(prev[color]?.[size]);
          const remaining = Math.max(ordered - historyAllocated - current, 0);
          row[size] = current + remaining;
          return row;
        }, {});
        return matrix;
      }, {}),
    );
    message.success('已加载剩余未分配数量');
  }, [allocationColors, allocationHistoryRows, allocationSizes, progressStats.rows]);

  const handleOpenFactoryGuide = useCallback(() => {
    navigate('/basic/partners?type=factory');
  }, [navigate]);

  const handleOpenAllocationCreate = useCallback(() => {
    if (!allocationColors.length || !allocationSizes.length) {
      message.warning('暂无可分配的颜色/尺码数据');
      return;
    }
    setAllocationMatrix(
      allocationColors.reduce<AllocationQuantityMatrix>((matrix, color) => {
        matrix[color] = allocationSizes.reduce<Record<string, number>>((row, size) => {
          row[size] = 0;
          return row;
        }, {});
        return matrix;
      }, {}),
    );
    allocationCreateForm.setFieldsValue({
      unitPrice: 0,
    });
    setAllocationCreateModalOpen(true);
  }, [allocationColors, allocationCreateForm, allocationSizes]);

  const handleSubmitAllocationCreate = useCallback(async () => {
    if (!progressActionModal.order || !progressActionModal.stage) {
      return;
    }
    const nodeCode = progressNodeCodeMap[progressActionModal.stage.key];
    if (nodeCode !== 'CUTTING' && nodeCode !== 'SEWING') {
      return;
    }
    try {
      const values = await allocationCreateForm.validateFields();
      const payload: Record<string, unknown> = {
        subcontractorId: values.factoryId,
        unitPrice: values.unitPrice ?? 0,
      };
      const requiredTotal = progressStats.rows.reduce((sum, row) => sum + row.orderedQty, 0);
      const historyAllocatedTotal = allocationHistoryRows.reduce((sum, row) => sum + row.totalQty, 0);
      const matrixItems = allocationColors.flatMap((color) =>
        allocationSizes.map((size) => ({
          color: color === '-' ? undefined : color,
          size: size === '-' ? undefined : size,
          quantity: normalizeQtyValue(allocationMatrix[color]?.[size]),
        })),
      ).filter((item) => item.quantity > 0);
      const totalAllocated = matrixItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalAllocated <= 0) {
        message.warning('请在分配矩阵中填写大于 0 的数量');
        return;
      }
      if (requiredTotal > 0 && historyAllocatedTotal + totalAllocated > requiredTotal) {
        message.warning(
          `分配后总量不能超过下单总量（${requiredTotal}），当前已分配 ${historyAllocatedTotal}，本次 ${totalAllocated}`,
        );
        return;
      }
      payload.items = matrixItems;

      setAllocationCreateSubmitting(true);
      await factoryOrdersApi.completeProgress(progressActionModal.order.orderId, nodeCode, { payload });
      message.success('分配已提交');
      setAllocationCreateModalOpen(false);
      allocationCreateForm.resetFields();
      await loadProgressStats(progressActionModal.order.orderId, progressActionModal.stage.key as 'cutting' | 'sewing');
      triggerReload();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to submit allocation', error);
      message.error(error instanceof Error ? error.message : '提交分配失败');
    } finally {
      setAllocationCreateSubmitting(false);
    }
  }, [
    allocationColors,
    allocationCreateForm,
    allocationHistoryRows,
    allocationMatrix,
    allocationSizes,
    loadProgressStats,
    progressActionModal.order,
    progressActionModal.stage,
    progressStats.rows,
  ]);

  const handleSubmitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      if (!createColors.length || !createSizes.length) {
        message.warning('请选择颜色和尺码后再填写下单数量');
        return;
      }
      const lineItems = createColors.flatMap((color) => createSizes.map((size) => {
        const quantity = normalizeQtyValue(createMatrix[color]?.[size]);
        return {
          color,
          size,
          quantity,
        };
      })).filter((item) => item.quantity > 0);
      const totalQuantity = lineItems.reduce(
        (sum: number, item) => sum + item.quantity,
        0,
      );
      if (!lineItems.length || totalQuantity <= 0) {
        message.warning('请在颜色/尺码数量矩阵中至少填写一个大于 0 的数量');
        return;
      }
      setCreateSubmitting(true);
      await factoryOrdersApi.createOrder({
        orderNo: values.orderNo,
        styleId: values.styleId,
        totalQuantity,
        unitPrice: values.unitPrice,
        expectedDelivery: values.expectedDelivery ? values.expectedDelivery.format('YYYY-MM-DD') : undefined,
        status: values.overallStatus === 'completed' ? 'COMPLETED' : 'RELEASED',
        materialStatus: values.materialStatus,
        merchandiserId: values.merchandiserId,
        factoryId: values.factoryId,
        remarks: values.remarks,
        lines: lineItems,
      });
      message.success('工厂订单创建成功');
      handleCloseCreate();
      triggerReload();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      const errMsg = error instanceof Error ? error.message : '创建失败，请稍后重试';
      message.error(errMsg);
      console.error('failed to create factory order', error);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenImport = () => {
    setImportModal((prev) => ({ ...prev, open: true }));
  };

  const handleCloseImport = () => {
    setImportModal({ open: false, records: [], fileList: [], uploading: false });
  };

  const handleImportBeforeUpload = (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = typeof reader.result === 'string' ? reader.result : '';
        const parsed = JSON.parse(content);
        const normalized: ImportRecord[] = Array.isArray(parsed)
          ? parsed
              .map((item) => ({
                orderNo: String(item.orderNo ?? '').trim(),
                styleId: Number(item.styleId),
                merchandiserId: item.merchandiserId ? Number(item.merchandiserId) : undefined,
                factoryId: item.factoryId ? Number(item.factoryId) : undefined,
                totalQuantity: Number(item.totalQuantity ?? 0),
                expectedDelivery: item.expectedDelivery,
                status: item.status,
                materialStatus: item.materialStatus,
                remarks: item.remarks,
              }))
              .filter((record) => record.orderNo && Number.isFinite(record.styleId) && Number.isFinite(record.totalQuantity) && record.totalQuantity > 0)
          : [];
        if (!normalized.length) {
          throw new Error('文件内容为空或格式不正确');
        }
        setImportModal((prev) => ({
          ...prev,
          records: normalized,
          fileList: [{ uid: file.uid, name: file.name, status: 'done' }],
          error: undefined,
        }));
      } catch (error) {
        const messageText = error instanceof Error ? error.message : '无法解析文件内容';
        setImportModal((prev) => ({ ...prev, error: messageText, records: [], fileList: [] }));
      }
    };
    reader.readAsText(file, 'utf-8');
    return false;
  };

  const handleConfirmImport = async () => {
    if (!importModal.records.length) {
      message.warning('请先上传包含订单数据的 JSON 文件');
      return;
    }
    setImportModal((prev) => ({ ...prev, uploading: true }));
    try {
      const result = await factoryOrdersApi.importOrders({ orders: importModal.records });
      message.success(`导入完成：新增 ${result.created} 条，更新 ${result.updated} 条`);
      handleCloseImport();
      triggerReload();
    } catch (error) {
      console.error('failed to import factory orders', error);
      message.error('导入失败，请稍后重试');
      setImportModal((prev) => ({ ...prev, uploading: false }));
    }
  };

  const handleOpenStatusModal = () => {
    if (!selectedOrderIds.length) {
      message.warning('请先勾选需要设置状态的订单');
      return;
    }
    setStatusModalOpen(true);
  };

  const handleSubmitStatus = async () => {
    try {
      const values = await statusForm.validateFields();
      setStatusSubmitting(true);
      await factoryOrdersApi.batchUpdateStatus({
        orderIds: selectedOrderIds,
        status: values.overallStatus
          ? (values.overallStatus === 'completed' ? 'COMPLETED' : 'RELEASED')
          : undefined,
        materialStatus: values.materialStatus,
        completedQuantity: values.completedQuantity,
        note: values.note,
      });
      message.success('批量更新状态成功');
      setStatusModalOpen(false);
      statusForm.resetFields();
      triggerReload();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else if (error && typeof error === 'object' && 'errorFields' in error) {
        // 表单校验错误，忽略
      } else {
        console.error('failed to batch update factory order status', error);
        message.error('批量更新状态失败，请稍后重试');
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  useEffect(() => {
    if (loadingCards || loadingTable) {
      return;
    }
    if (!cardOrders.length && !tableOrders.length) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds((prev) => {
      const validIds = new Set([
        ...cardOrders.map((order) => order.id),
        ...tableOrders.map((record) => record.id),
      ]);
      return prev.filter((id) => validIds.has(id));
    });
  }, [cardOrders, tableOrders, loadingCards, loadingTable]);

  const mergedStatusTabs = useMemo<FactoryOrderStatusSummary[]>(
    () => statusTabDefaults.map((defaultTab) => {
      const tab = statusTabs.find((item) => item.key === defaultTab.key);
      return tab ?? {
        key: defaultTab.key,
        label: defaultTab.label,
        styles: 0,
        orders: 0,
        quantity: 0,
      };
    }),
    [statusTabs],
  );

  const statusFilterOptions = useMemo(
    () => {
      const completedOrders = mergedStatusTabs
        .filter((tab) => tab.key === 'COMPLETED' || tab.key === 'CANCELLED')
        .reduce((sum, tab) => sum + tab.orders, 0);
      const unfinishedOrders = mergedStatusTabs
        .filter((tab) => tab.key !== 'COMPLETED' && tab.key !== 'CANCELLED')
        .reduce((sum, tab) => sum + tab.orders, 0);
      const totalOrders = mergedStatusTabs.reduce((sum, tab) => sum + tab.orders, 0);
      return [
        { label: `全部（${totalOrders}）`, value: 'all' },
        { label: `未完成（${unfinishedOrders}）`, value: 'unfinished' },
        { label: `已完成（${completedOrders}）`, value: 'completed' },
      ] as Array<{ label: string; value: OverallStatus }>;
    },
    [mergedStatusTabs],
  );

  const viewOptions = useMemo(() => [
    { label: <span><AppstoreOutlined /> 卡片</span>, value: 'card' },
    { label: <span><TableOutlined /> 列表</span>, value: 'table' },
  ], []);

  const tableColumns: ColumnsType<FactoryOrderTableRow> = useMemo(() => [
    {
      title: '订单号',
      dataIndex: 'orderCode',
      width: 160,
      fixed: 'left',
      render: (value: string, record) => (
        <Space size={4}>
          <span>{value}</span>
          {(() => {
            const meta = getOverallStatusMeta(record.isCompleted, record.statusKey);
            return <Tag color={meta.color}>{meta.label}</Tag>;
          })()}
        </Space>
      ),
    },
    { title: '款号', dataIndex: 'styleCode', width: 140 },
    { title: '款名', dataIndex: 'styleName', width: 220, ellipsis: true },
    {
      title: '下单数量',
      dataIndex: 'orderQuantity',
      width: 120,
      align: 'right',
      render: (value: number) => `${value.toLocaleString()} 件`,
    },
    {
      title: '物料状态',
      dataIndex: 'materialStatus',
      width: 140,
      render: (value: string) =>
        value && value !== 'PENDING' ? <Tag color={getMaterialTagColor(value)}>{value}</Tag> : '-',
    },
    {
      title: '生产进度',
      dataIndex: 'productionPercent',
      width: 200,
      render: (_value: number, record) => (
        <div className="factory-orders-table-progress">
          <Progress percent={record.productionPercent} showInfo={false} size="small" />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.productionStage}</Text>
        </div>
      ),
    },
    { title: '预计交货日期', dataIndex: 'expectedDelivery', width: 160 },
    { title: '跟单员', dataIndex: 'merchandiser', width: 120 },
    {
      title: '操作',
      dataIndex: 'actions',
      fixed: 'right',
      width: 180,
      render: (_value, record) => (
        <Space size={8}>
          <Button
            type="link"
            size="small"
            onClick={() => void handleOpenCostDetail({
              orderId: record.id,
              orderCode: record.orderCode,
              styleCode: record.styleCode,
              styleName: record.styleName,
              expectedDelivery: record.expectedDelivery,
              materialStatus: record.materialStatus,
              orderQuantity: record.orderQuantity,
              productionStage: record.productionStage,
            })}
          >
            大货成本
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => void handleCopyOrder({
              orderId: record.id,
              orderCode: record.orderCode,
              styleCode: record.styleCode,
              styleName: record.styleName,
              expectedDelivery: record.expectedDelivery,
              materialStatus: record.materialStatus,
              orderQuantity: record.orderQuantity,
              productionStage: record.productionStage,
            })}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleOpenPrintPreview({
              orderId: record.id,
              orderCode: record.orderCode,
              styleCode: record.styleCode,
              styleName: record.styleName,
              expectedDelivery: record.expectedDelivery,
              materialStatus: record.materialStatus,
              orderQuantity: record.orderQuantity,
              productionStage: record.productionStage,
            })}
          >
            打印
          </Button>
        </Space>
      ),
    },
  ], [handleCopyOrder, handleOpenCostDetail, handleOpenPrintPreview]);

  const rowSelection = useMemo(() => ({
    selectedRowKeys: selectedOrderIds,
    onChange: (keys: React.Key[]) => setSelectedOrderIds(keys.map(String)),
  }), [selectedOrderIds]);

  const selectedStyleOption = useMemo(
    () => styleOptions.find((item) => item.value === Number(selectedCreateStyleId)),
    [selectedCreateStyleId, styleOptions],
  );
  const createColorOptions = useMemo(
    () => (selectedStyleOption?.colors ?? []).map((color) => ({ label: color, value: color })),
    [selectedStyleOption],
  );
  const createSizeOptions = useMemo(
    () => (selectedStyleOption?.sizes ?? []).map((size) => ({ label: size, value: size })),
    [selectedStyleOption],
  );
  const createRowTotals = useMemo(
    () => createColors.reduce<Record<string, number>>((acc, color) => {
      acc[color] = createSizes.reduce((sum, size) => sum + normalizeQtyValue(createMatrix[color]?.[size]), 0);
      return acc;
    }, {}),
    [createColors, createMatrix, createSizes],
  );
  const createColumnTotals = useMemo(
    () => createSizes.reduce<Record<string, number>>((acc, size) => {
      acc[size] = createColors.reduce((sum, color) => sum + normalizeQtyValue(createMatrix[color]?.[size]), 0);
      return acc;
    }, {}),
    [createColors, createMatrix, createSizes],
  );
  const createGrandTotal = useMemo(
    () => Object.values(createColumnTotals).reduce((sum, value) => sum + value, 0),
    [createColumnTotals],
  );
  const allocationOrderedMatrix = useMemo(
    () => progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
      if (!matrix[row.color]) {
        matrix[row.color] = {};
      }
      matrix[row.color][row.size] = row.orderedQty;
      return matrix;
    }, {}),
    [progressStats.rows],
  );
  const allocationRowTotals = useMemo(
    () => allocationColors.reduce<Record<string, number>>((acc, color) => {
      acc[color] = allocationSizes.reduce((sum, size) => sum + normalizeQtyValue(allocationMatrix[color]?.[size]), 0);
      return acc;
    }, {}),
    [allocationColors, allocationMatrix, allocationSizes],
  );
  const allocationColumnTotals = useMemo(
    () => allocationSizes.reduce<Record<string, number>>((acc, size) => {
      acc[size] = allocationColors.reduce((sum, color) => sum + normalizeQtyValue(allocationMatrix[color]?.[size]), 0);
      return acc;
    }, {}),
    [allocationColors, allocationMatrix, allocationSizes],
  );
  const allocationGrandTotal = useMemo(
    () => Object.values(allocationColumnTotals).reduce((sum, value) => sum + value, 0),
    [allocationColumnTotals],
  );
  const allocationRequiredTotal = useMemo(
    () => progressStats.rows.reduce((sum, row) => sum + row.orderedQty, 0),
    [progressStats.rows],
  );
  const allocationDisplayColors = useMemo(() => {
    if (allocationColors.length > 0) {
      return allocationColors;
    }
    const historyColors = allocationHistoryRows.flatMap((row) => row.items.map((item) => item.color));
    return Array.from(new Set(historyColors));
  }, [allocationColors, allocationHistoryRows]);
  const allocationDisplaySizes = useMemo(() => {
    if (allocationSizes.length > 0) {
      return allocationSizes;
    }
    const historySizes = allocationHistoryRows.flatMap((row) => row.items.map((item) => item.size));
    return Array.from(new Set(historySizes));
  }, [allocationHistoryRows, allocationSizes]);
  const statsDisplayColors = useMemo(
    () => Array.from(new Set(progressStats.rows.map((row) => row.color))),
    [progressStats.rows],
  );
  const statsDisplaySizes = useMemo(
    () => Array.from(new Set(progressStats.rows.map((row) => row.size))),
    [progressStats.rows],
  );
  const statsDoneMatrix = useMemo(
    () =>
      progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
        if (!matrix[row.color]) {
          matrix[row.color] = {};
        }
        const doneQty = progressActionModal.stage?.key === 'sewing' ? row.sewingQty : row.cuttingQty;
        matrix[row.color][row.size] = doneQty;
        return matrix;
      }, {}),
    [progressActionModal.stage?.key, progressStats.rows],
  );
  const statsOrderedMatrix = useMemo(
    () =>
      progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
        if (!matrix[row.color]) {
          matrix[row.color] = {};
        }
        matrix[row.color][row.size] = row.orderedQty;
        return matrix;
      }, {}),
    [progressStats.rows],
  );
  const statsDoneRowTotals = useMemo(
    () =>
      statsDisplayColors.reduce<Record<string, number>>((acc, color) => {
        acc[color] = statsDisplaySizes.reduce((sum, size) => sum + (statsDoneMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsDoneMatrix],
  );
  const statsOrderedRowTotals = useMemo(
    () =>
      statsDisplayColors.reduce<Record<string, number>>((acc, color) => {
        acc[color] = statsDisplaySizes.reduce((sum, size) => sum + (statsOrderedMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsOrderedMatrix],
  );
  const statsDoneColumnTotals = useMemo(
    () =>
      statsDisplaySizes.reduce<Record<string, number>>((acc, size) => {
        acc[size] = statsDisplayColors.reduce((sum, color) => sum + (statsDoneMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsDoneMatrix],
  );
  const statsOrderedColumnTotals = useMemo(
    () =>
      statsDisplaySizes.reduce<Record<string, number>>((acc, size) => {
        acc[size] = statsDisplayColors.reduce((sum, color) => sum + (statsOrderedMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsOrderedMatrix],
  );
  const statsDoneTotal = useMemo(
    () => Object.values(statsDoneColumnTotals).reduce((sum, value) => sum + value, 0),
    [statsDoneColumnTotals],
  );
  const allocationOrderedRowTotals = useMemo(
    () =>
      allocationDisplayColors.reduce<Record<string, number>>((acc, color) => {
        acc[color] = allocationDisplaySizes.reduce((sum, size) => sum + (allocationOrderedMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [allocationDisplayColors, allocationDisplaySizes, allocationOrderedMatrix],
  );
  const allocationOrderedColumnTotals = useMemo(
    () =>
      allocationDisplaySizes.reduce<Record<string, number>>((acc, size) => {
        acc[size] = allocationDisplayColors.reduce((sum, color) => sum + (allocationOrderedMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [allocationDisplayColors, allocationDisplaySizes, allocationOrderedMatrix],
  );
  const allocationHistoryMatrix = useMemo(
    () =>
      allocationHistoryRows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
        row.items.forEach((item) => {
          if (!matrix[item.color]) {
            matrix[item.color] = {};
          }
          matrix[item.color][item.size] = (matrix[item.color][item.size] ?? 0) + item.quantity;
        });
        return matrix;
      }, {}),
    [allocationHistoryRows],
  );
  const allocationHistoryTotal = useMemo(
    () => allocationHistoryRows.reduce((sum, row) => sum + row.totalQty, 0),
    [allocationHistoryRows],
  );
  const progressStageKey = progressActionModal.stage?.key;
  const isWideProgressStage = progressStageKey === 'cutting' || progressStageKey === 'sewing';
  const isInOutProgressStage = progressStageKey === 'inbound' || progressStageKey === 'outbound';
  const inOutIsInbound = progressStageKey === 'inbound';
  const inOutPendingLabel = inOutIsInbound ? '待收货' : '待出货';
  const inOutDetailLabel = inOutIsInbound ? '收货明细' : '出货明细';
  const inOutDoneLabel = inOutIsInbound ? '已收货' : '已出货';
  const inOutStageStatus = String(progressActionModal.stage?.status ?? '').toLowerCase();
  const inOutStageCompleted = isInOutProgressStage
    && (
      inOutStageStatus === 'success'
      || inOutStageStatus === 'completed'
      || (typeof progressActionModal.stage?.value === 'string' && progressActionModal.stage.value.includes('已完成'))
    );
  const progressModalWidth = isWideProgressStage ? 1360 : isInOutProgressStage ? 1400 : 560;

  const renderCardView = () => {
    if (loadingCards && cardOrders.length === 0) {
      return (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
          dataSource={Array.from({ length: cardPageSize }, (_v, index) => ({ id: `factory-skeleton-${index}` }))}
          rowKey="id"
          renderItem={(item) => (
            <List.Item key={item.id}>
              <Card>
                <Skeleton active paragraph={{ rows: 6 }} />
              </Card>
            </List.Item>
          )}
        />
      );
    }

    if (!loadingCards && cardOrders.length === 0) {
      return <Empty description={appliedKeyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />;
    }

    return (
      <>
        <List
          rowKey="id"
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
          dataSource={cardOrders}
          renderItem={(order) => {
            const isChecked = selectedOrderIds.includes(order.id);
            const meta = getOverallStatusMeta(order.isCompleted, order.statusKey);
            return (
              <List.Item key={order.id}>
                <Card styles={{ body: { display: 'flex', flexDirection: 'column', gap: 12, padding: 16 } }}>
                  <div className="factory-order-card-header">
                    <div className="factory-order-card-main">
                      <div className="factory-order-checkbox">
                        <Checkbox
                          checked={isChecked}
                          onChange={(event) => handleToggleOrder(order.id, event.target.checked)}
                        />
                      </div>
                      <div className="factory-order-card-info">
                        <ListImage
                          src={order.thumbnail}
                          alt={order.name}
                          wrapperClassName="factory-order-thumbnail"
                          width={null}
                          height={null}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="factory-order-title">{order.name}</div>
                          <Space size={8} wrap>
                            <span className="factory-order-subtitle">订单号：{order.code}</span>
                            <Tag color={meta.color}>{meta.label}</Tag>
                            {order.expectedDelivery ? <span className="factory-order-subtitle">预计交货：{order.expectedDelivery}</span> : null}
                          </Space>
                          {order.materialStatus && order.materialStatus !== 'PENDING' ? (
                            <div style={{ marginTop: 4 }}>
                              <Tag color={getMaterialTagColor(order.materialStatus)}>{order.materialStatus}</Tag>
                            </div>
                          ) : null}
                          <div className="factory-order-tags">
                            <Tag color="blue" bordered={false}>
                              {order.quantityLabel}：{order.quantityValue}
                            </Tag>
                            {order.tags?.map((tag) => (
                              <Tag key={`${order.id}-${tag}`} bordered={false}>
                                {tag}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="factory-order-actions">
                      <Space size={8} wrap>
                        <Button
                          size="small"
                          type="text"
                          onClick={() => void handleOpenCostDetail({
                            orderId: order.id,
                            orderCode: order.code,
                            styleName: order.name,
                            expectedDelivery: order.expectedDelivery,
                            materialStatus: order.materialStatus,
                          })}
                        >
                          大货成本
                        </Button>
                        <Button
                          size="small"
                          type="text"
                          onClick={() => void handleCopyOrder({
                            orderId: order.id,
                            orderCode: order.code,
                            styleName: order.name,
                            expectedDelivery: order.expectedDelivery,
                            materialStatus: order.materialStatus,
                          })}
                        >
                          复制
                        </Button>
                        <Button
                          size="small"
                          type="text"
                          onClick={() => handleOpenPrintPreview({
                            orderId: order.id,
                            orderCode: order.code,
                            styleName: order.name,
                            expectedDelivery: order.expectedDelivery,
                            materialStatus: order.materialStatus,
                          })}
                        >
                          打印
                        </Button>
                      </Space>
                    </div>
                  </div>

                  <div className="factory-order-progress">
                    <div className="factory-order-progress-track">
                      {order.progress.map((stage, index) => {
                        const status = stage.status ?? 'default';
                        const isOrderPlaced = stage.key === 'order_placed';
                        const normalizedStatus = String(status).toLowerCase();
                        const isPartial =
                          normalizedStatus === 'warning'
                          || (typeof stage.value === 'string' && stage.value.includes('部分完成'));
                        const isCompleted =
                          isOrderPlaced ||
                          normalizedStatus === 'success' ||
                          normalizedStatus === 'completed' ||
                          (typeof stage.value === 'string' && stage.value.includes('已完成'));
                        const predecessorBlockedStage = order.progress
                          .slice(0, index)
                          .find((prev) => {
                            if (prev.key === 'order_placed') {
                              return false;
                            }
                            const prevStatus = String(prev.status ?? '').toLowerCase();
                            return !(
                              prevStatus === 'success' ||
                              prevStatus === 'completed' ||
                              (typeof prev.value === 'string' && prev.value.includes('已完成'))
                            );
                          });
                        const predecessorBlockedName = predecessorBlockedStage
                          ? normalizeProgressLabel(predecessorBlockedStage)
                          : '';
                        const alwaysViewable = stage.key === 'inbound' || stage.key === 'outbound';
                        const repeatOpen = stage.key === 'cutting'
                          || stage.key === 'sewing'
                          || stage.key === 'fabric_arrived'
                          || stage.key === 'accessory_arrived'
                          || alwaysViewable;
                        const clickable = Boolean(
                          progressNodeCodeMap[stage.key]
                          && (!isCompleted || repeatOpen)
                          && (!predecessorBlockedStage || alwaysViewable),
                        );
                        const stageBreakdown = parseAllocationCompletionValue(stage.value);
                        const nodeStatusContent = isOrderPlaced ? (
                          <span>{`下单数量：${order.quantityValue}`}</span>
                        ) : stageBreakdown ? (
                          <div className="factory-order-progress-status-grid">
                            <span>{`分配 ${stageBreakdown.allocatedPercent}%`}</span>
                            <span>{`完成 ${stageBreakdown.completedPercent}%`}</span>
                            {stage.date ? <span className="date">{stage.date}</span> : null}
                          </div>
                        ) : (
                          <span>{stage.date ? `${stage.value} · ${stage.date}` : stage.value}</span>
                        );
                        return (
                          <div className="factory-order-progress-step" key={`${order.id}-${stage.key}`}>
                            <div
                              className={`factory-order-progress-node${clickable ? ' clickable' : ''}`}
                              onClick={() => {
                                if (predecessorBlockedStage && !alwaysViewable) {
                                  message.warning(`请先完成前置节点：${predecessorBlockedName}`);
                                  return;
                                }
                                if (!clickable) {
                                  return;
                                }
                                handleOpenProgressAction({
                                  orderId: order.id,
                                  orderCode: order.code,
                                  styleName: order.name,
                                  expectedDelivery: order.expectedDelivery,
                                  materialStatus: order.materialStatus,
                                  orderQuantity: Number(order.quantityValue),
                                }, stage);
                              }}
                            >
                              <div className={`factory-order-progress-icon${isCompleted ? ' completed' : isPartial ? ' partial' : ''}`}>
                                {isCompleted ? <CheckOutlined /> : <ClockCircleOutlined />}
                              </div>
                              <div className="factory-order-progress-content">
                                <div className="factory-order-progress-name">{normalizeProgressLabel(stage)}</div>
                                <div className={`factory-order-progress-status${isCompleted ? ' completed' : isPartial ? ' partial' : ''}`}>
                                  {nodeStatusContent}
                                </div>
                              </div>
                            </div>
                            {index < order.progress.length - 1 ? (
                              <div
                                className={`factory-order-progress-arrow${isCompleted ? ' completed' : isPartial ? ' partial' : ''}`}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
        {cardTotal > cardPageSize ? (
          <div className="factory-orders-pagination">
            <Pagination
              current={cardPage}
              pageSize={cardPageSize}
              total={cardTotal}
              showQuickJumper
              showSizeChanger
              pageSizeOptions={['6', '9', '12']}
              showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 单`}
              onChange={(page, size) => {
                setCardPage(page);
                if (size) {
                  setCardPageSize(size);
                }
              }}
            />
          </div>
        ) : null}
      </>
    );
  };

  const renderTableView = () => {
    if (!loadingTable && tableOrders.length === 0) {
      return <Empty description={appliedKeyword ? '未找到匹配的工厂订单' : '暂无工厂订单'} />;
    }

    return (
      <Table<FactoryOrderTableRow>
        bordered
        rowKey={(record) => record.id}
        columns={tableColumns}
        dataSource={tableOrders}
        loading={loadingTable}
        rowSelection={rowSelection}
        pagination={{
          current: tablePage,
          pageSize: tablePageSize,
          total: tableTotal,
          showQuickJumper: true,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '40'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 单`,
          onChange: (page, size) => {
            setTablePage(page);
            if (size) {
              setTablePageSize(size);
            }
          },
        }}
        scroll={{ x: 1200 }}
      />
    );
  };

  return (
    <div className="factory-orders-page">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {(loadingSummary && metrics.length === 0 ? Array.from({ length: 4 }).map((_, index) => ({
          key: `loading-${index}`,
          label: '加载中',
          primaryValue: '...',
        })) : metrics).map((metric: FactoryOrderMetric | { key: string; label: string; primaryValue: string }) => (
          <Col key={metric.key} xs={12} sm={12} md={8} lg={6}>
            <Card
              hoverable
              loading={loadingSummary && metrics.length === 0}
              styles={{ body: { padding: 16 } }}
              style={('tone' in metric && metric.tone === 'warning') ? { borderColor: '#ffccc7', background: '#fff2f0' } : undefined}
            >
              <Statistic
                title={metric.label}
                value={metric.primaryValue}
                valueStyle={{ fontSize: 20, fontWeight: 600 }}
              />
              {'secondaryValue' in metric && metric.secondaryValue ? (
                <Text type="secondary" style={{ fontSize: 12 }}>{metric.secondaryValue}</Text>
              ) : null}
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Space size={12} wrap>
            <Input.Search
              allowClear
              placeholder="搜索订单号、款号、款名、跟单员"
              enterButton
              value={searchValue}
              onSearch={handleSearch}
              onChange={(event) => handleSearchChange(event.target.value)}
              style={{ width: 260 }}
            />
            <Select
              style={{ width: 180 }}
              options={statusFilterOptions}
              value={activeStatus}
              placeholder="状态"
              onChange={(value) => {
                setActiveStatus(value as OverallStatus);
                resetPagination();
              }}
            />
            <Select
              className="factory-orders-sort-select"
              style={{ width: 220 }}
              options={sortOptions}
              value={sortKey}
              onChange={(value) => {
                setSortKey(value);
                resetPagination();
              }}
            />
            <Button onClick={() => {
              setSearchValue('');
              setAppliedKeyword('');
              setSortKey('order-desc');
              setActiveStatus('unfinished');
              resetPagination();
            }}>
              重置
            </Button>
          </Space>
          <Space size={12} wrap>
            <Segmented options={viewOptions} value={viewMode} onChange={(value) => setViewMode(value as ViewMode)} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate()}>新建工厂订单</Button>
            <Button icon={<ImportOutlined />} onClick={handleOpenImport}>导入</Button>
            <Button icon={<ExportOutlined />} loading={exporting} onClick={() => handleExport(false)}>导出</Button>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => handleExport(true)}>导出所选</Button>
            <Button icon={<SettingOutlined />} onClick={handleOpenStatusModal}>设置状态</Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>刷新</Button>
          </Space>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Checkbox
            indeterminate={indeterminate}
            checked={allVisibleSelected}
            onChange={handleToggleVisible}
          >
            仅勾选当前视图列表
          </Checkbox>
          <Text type="secondary">
            当前状态：{statusFilterOptions.find((item) => item.value === activeStatus)?.label ?? activeStatus}
          </Text>
        </div>

        <div style={{ marginTop: 20 }}>
          {viewMode === 'card' ? renderCardView() : renderTableView()}
        </div>
      </Card>

      <Modal
        open={createModalOpen}
        title="新建工厂订单"
        onCancel={handleCloseCreate}
        onOk={handleSubmitCreate}
        confirmLoading={createSubmitting}
        width={1120}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="订单号" name="orderNo">
                <Input placeholder="留空自动生成（可手动覆盖）" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="款式" name="styleId" rules={[{ required: true, message: '请选择款式' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  loading={createOptionsLoading}
                  options={styleOptions}
                  placeholder="请选择款式"
                  notFoundContent={createOptionsLoading ? '加载中...' : '暂无款式数据'}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="单价（元/件）" name="unitPrice">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="可选，不填按 0 处理" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="预计交货日期" name="expectedDelivery">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="请选择预计交货日期" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="工厂" name="factoryId">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  loading={createOptionsLoading}
                  options={factoryOptions}
                  placeholder="可选"
                  notFoundContent={createOptionsLoading ? '加载中...' : '暂无工厂数据'}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="跟单员" name="merchandiserId">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  loading={createOptionsLoading}
                  options={merchandiserOptions}
                  placeholder="可选"
                  notFoundContent={createOptionsLoading ? '加载中...' : '暂无跟单员数据'}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="整体状态" name="overallStatus">
                <Select options={overallStatusOptions} placeholder="请选择整体状态" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="物料状态" name="materialStatus">
                <Select allowClear options={materialStatusOptions} placeholder="可选" />
              </Form.Item>
            </Col>
            {selectedStyleOption ? (
              <Col span={24}>
                <div className="factory-create-style-preview">
                  <ListImage
                    src={selectedStyleOption.image}
                    alt={selectedStyleOption.label}
                    width={88}
                    height={88}
                    borderRadius={6}
                  />
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">款式图片</Text>
                    <Text>{selectedStyleOption.label}</Text>
                  </Space>
                </div>
              </Col>
            ) : null}
            <Col span={12}>
              <Form.Item label="颜色" required>
                <Select
                  mode="tags"
                  value={createColors}
                  onChange={handleCreateColorsChange}
                  options={createColorOptions}
                  tokenSeparators={[',', '，', '、', ' ']}
                  placeholder={selectedStyleOption ? '回车添加或选择颜色' : '请先选择款式'}
                  disabled={!selectedStyleOption}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="尺码" required>
                <Select
                  mode="tags"
                  value={createSizes}
                  onChange={handleCreateSizesChange}
                  options={createSizeOptions}
                  tokenSeparators={[',', '，', '、', ' ']}
                  placeholder={selectedStyleOption ? '回车添加或选择尺码' : '请先选择款式'}
                  disabled={!selectedStyleOption}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="下单数量（颜色 × 尺码）" required>
                {!selectedStyleOption ? (
                  <Text type="secondary">请先选择款式，系统将自动带出该款颜色和尺码。</Text>
                ) : createColors.length === 0 || createSizes.length === 0 ? (
                  <Text type="secondary">请先补全颜色和尺码，再录入数量。</Text>
                ) : (
                  <div className="factory-create-matrix-wrap">
                    <table className="factory-create-matrix-table">
                      <thead>
                        <tr>
                          <th>颜色 \\ 尺码</th>
                          {createSizes.map((size) => (
                            <th key={`head-${size}`}>{size}</th>
                          ))}
                          <th>小计</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createColors.map((color) => (
                          <tr key={`row-${color}`}>
                            <td>{color}</td>
                            {createSizes.map((size) => (
                              <td key={`${color}-${size}`}>
                                <InputNumber
                                  min={0}
                                  precision={0}
                                  value={normalizeQtyValue(createMatrix[color]?.[size])}
                                  onChange={(value) => handleCreateMatrixQtyChange(color, size, value)}
                                  controls={false}
                                  style={{ width: '100%' }}
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td>{createRowTotals[color] ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>合计</td>
                          {createSizes.map((size) => (
                            <td key={`sum-${size}`}>{createColumnTotals[size] ?? 0}</td>
                          ))}
                          <td>{createGrandTotal}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="备注" name="remarks">
                <Input.TextArea rows={2} placeholder="可选" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        open={importModal.open}
        title="导入工厂订单"
        onCancel={handleCloseImport}
        onOk={handleConfirmImport}
        confirmLoading={importModal.uploading}
        destroyOnHidden
        width={720}
      >
        <Upload.Dragger
          accept=".json,application/json"
          multiple={false}
          beforeUpload={handleImportBeforeUpload}
          fileList={importModal.fileList}
          onRemove={() => {
            setImportModal((prev) => ({ ...prev, fileList: [], records: [] }));
            return true;
          }}
        >
          <p className="ant-upload-drag-icon">
            <ImportOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 JSON 文件到此处完成导入</p>
          <p className="ant-upload-hint">支持字段：orderNo、styleId、merchandiserId、factoryId、totalQuantity、expectedDelivery、status、materialStatus、remarks</p>
        </Upload.Dragger>
        {importModal.error ? (
          <Alert type="error" showIcon style={{ marginTop: 16 }} message={importModal.error} />
        ) : null}
        {importModal.records.length ? (
          <Table<ImportRecord>
            style={{ marginTop: 16 }}
            size="small"
            bordered
            rowKey={(record) => record.orderNo}
            dataSource={importModal.records}
            pagination={false}
            columns={[
              { title: '订单号', dataIndex: 'orderNo' },
              { title: '款式 ID', dataIndex: 'styleId' },
              { title: '数量', dataIndex: 'totalQuantity' },
              { title: '预计交期', dataIndex: 'expectedDelivery' },
              { title: '状态', dataIndex: 'status' },
              { title: '物料状态', dataIndex: 'materialStatus' },
            ]}
          />
        ) : null}
      </Modal>

      <Modal
        open={progressActionModal.open}
        title={progressActionModal.stage ? `执行节点：${normalizeProgressLabel(progressActionModal.stage)}` : '执行节点'}
        onCancel={() => {
          setProgressActionModal({ open: false, submitting: false });
          setAllocationCreateModalOpen(false);
          setAllocationCreateSubmitting(false);
          setProgressTabKey('stats');
          setProgressStats({ loading: false, rows: [] });
          setAllocationColors([]);
          setAllocationSizes([]);
          setAllocationMatrix({});
          setAllocationHistoryRows([]);
          allocationCreateForm.resetFields();
          progressActionForm.resetFields();
        }}
        onOk={inOutStageCompleted ? undefined : handleSubmitProgressAction}
        confirmLoading={progressActionModal.submitting}
        footer={
          progressActionModal.stage?.key === 'cutting' || progressActionModal.stage?.key === 'sewing'
            ? null
            : inOutStageCompleted
              ? [
                <Button
                  key="close"
                  onClick={() => {
                    setProgressActionModal({ open: false, submitting: false });
                    setAllocationCreateModalOpen(false);
                    setAllocationCreateSubmitting(false);
                    setProgressTabKey('stats');
                    setProgressStats({ loading: false, rows: [] });
                    setAllocationColors([]);
                    setAllocationSizes([]);
                    setAllocationMatrix({});
                    setAllocationHistoryRows([]);
                    allocationCreateForm.resetFields();
                    progressActionForm.resetFields();
                  }}
                >
                  关闭
                </Button>,
              ]
              : undefined
        }
        width={progressModalWidth}
        styles={isWideProgressStage || isInOutProgressStage ? { body: { maxHeight: '72vh', overflow: 'auto' } } : undefined}
        destroyOnHidden
      >
        <Form form={progressActionForm} layout="vertical">
          {progressActionModal.stage?.key === 'fabric_arrived' || progressActionModal.stage?.key === 'accessory_arrived' ? (
            <Form.Item label="到货时间" name="arrivedAt" rules={[{ required: true, message: '请选择到货时间' }]}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          {progressActionModal.stage?.key === 'cutting' || progressActionModal.stage?.key === 'sewing' ? (
            <Tabs
              activeKey={progressTabKey}
              onChange={(key: string) => setProgressTabKey(key as 'stats' | 'allocation')}
              items={[
                {
                  key: 'stats',
                  label: '统计信息',
                  children: (
                    <>
                      <div className="factory-allocation-summary-title">汇总信息</div>
                      {progressStats.loading ? (
                        <Skeleton active paragraph={{ rows: 4 }} />
                      ) : statsDisplayColors.length === 0 || statsDisplaySizes.length === 0 ? (
                        <Text type="secondary">暂无统计数据</Text>
                      ) : (
                        <div className="factory-create-matrix-wrap">
                          <table className="factory-create-matrix-table">
                            <thead>
                              <tr>
                                <th>颜色</th>
                                {statsDisplaySizes.map((size) => (
                                  <th key={`stats-head-${size}`}>{size}</th>
                                ))}
                                <th>小计</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statsDisplayColors.map((color) => (
                                <tr key={`stats-row-${color}`}>
                                  <td>{color}</td>
                                  {statsDisplaySizes.map((size) => (
                                    <td key={`stats-${color}-${size}`}>
                                      {(statsDoneMatrix[color]?.[size] ?? 0)}
                                      {' / '}
                                      {(statsOrderedMatrix[color]?.[size] ?? 0)}
                                    </td>
                                  ))}
                                  <td>
                                    {(statsDoneRowTotals[color] ?? 0)}
                                    {' / '}
                                    {(statsOrderedRowTotals[color] ?? 0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td>合计</td>
                                {statsDisplaySizes.map((size) => (
                                  <td key={`stats-sum-${size}`}>
                                    {(statsDoneColumnTotals[size] ?? 0)}
                                    {' / '}
                                    {(statsOrderedColumnTotals[size] ?? 0)}
                                  </td>
                                ))}
                                <td>
                                  {statsDoneTotal}
                                  {' / '}
                                  {allocationRequiredTotal}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </>
                  ),
                },
                {
                  key: 'allocation',
                  label: '分配信息',
                  children: (
                    <>
                      {allocationHistoryRows.length === 0 ? (
                        <Text type="secondary">暂无分配记录</Text>
                      ) : allocationHistoryRows.map((record) => {
                        const recordMatrix = record.items.reduce<Record<string, Record<string, number>>>((matrix, item) => {
                          if (!matrix[item.color]) {
                            matrix[item.color] = {};
                          }
                          matrix[item.color][item.size] = (matrix[item.color][item.size] ?? 0) + item.quantity;
                          return matrix;
                        }, {});
                        const recordTotal = record.items.reduce((sum, item) => sum + item.quantity, 0);
                        const factoryLabel = record.factoryId
                          ? (factoryOptions.find((item) => item.value === record.factoryId)?.label ?? `工厂ID:${record.factoryId}`)
                          : '-';
                        return (
                          <div key={record.key} style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 6 }}>
                              <Text strong>工厂：{factoryLabel}</Text>
                              <Text type="secondary" style={{ marginLeft: 12 }}>
                                分配时间：{record.completedAt ? dayjs(record.completedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                              </Text>
                              <Text type="secondary" style={{ marginLeft: 12 }}>
                                工价：{typeof record.unitPrice === 'number' ? record.unitPrice : '-'}
                              </Text>
                            </div>
                            <div className="factory-create-matrix-wrap">
                              <table className="factory-create-matrix-table">
                                <thead>
                                  <tr>
                                    <th>颜色</th>
                                    {allocationDisplaySizes.map((size) => (
                                      <th key={`${record.key}-head-${size}`}>{size}</th>
                                    ))}
                                    <th>小计</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allocationDisplayColors.map((color) => {
                                    const rowAssigned = allocationDisplaySizes.reduce((sum, size) => sum + (recordMatrix[color]?.[size] ?? 0), 0);
                                    const rowOrdered = allocationOrderedRowTotals[color] ?? 0;
                                    return (
                                      <tr key={`${record.key}-row-${color}`}>
                                        <td>{color}</td>
                                        {allocationDisplaySizes.map((size) => (
                                          <td key={`${record.key}-${color}-${size}`}>
                                            {(recordMatrix[color]?.[size] ?? 0)}
                                            {' / '}
                                            {(allocationOrderedMatrix[color]?.[size] ?? 0)}
                                          </td>
                                        ))}
                                        <td>
                                          {rowAssigned}
                                          {' / '}
                                          {rowOrdered}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td>合计</td>
                                    {allocationDisplaySizes.map((size) => {
                                      const assigned = allocationDisplayColors.reduce((sum, color) => sum + (recordMatrix[color]?.[size] ?? 0), 0);
                                      return (
                                        <td key={`${record.key}-sum-${size}`}>
                                          {assigned}
                                          {' / '}
                                          {(allocationOrderedColumnTotals[size] ?? 0)}
                                        </td>
                                      );
                                    })}
                                    <td>
                                      {recordTotal}
                                      {' / '}
                                      {allocationRequiredTotal}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" onClick={handleOpenAllocationCreate}>
                          新建分配
                        </Button>
                      </div>
                    </>
                  ),
                },
              ]}
            />
          ) : null}
          {progressActionModal.stage?.key === 'inbound' || progressActionModal.stage?.key === 'outbound' ? (
            <>
              <Tabs
                activeKey={inOutTabKey}
                onChange={(key: string) => setInOutTabKey(key as 'pending' | 'detail')}
                items={[
                  {
                    key: 'pending',
                    label: inOutPendingLabel,
                    children: (
                      inOutData.loading ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                      ) : (
                        <Table<InOutSummaryRow>
                          rowKey="key"
                          size="middle"
                          bordered
                          pagination={false}
                          dataSource={inOutData.summaryRows}
                          locale={{ emptyText: `暂无${inOutPendingLabel}数据` }}
                          columns={[
                            { title: '颜色', dataIndex: 'color', width: 140 },
                            { title: '尺码', dataIndex: 'size', width: 140 },
                            { title: '下货数量', dataIndex: 'totalQty', width: 140 },
                            { title: inOutPendingLabel, dataIndex: 'pendingQty', width: 140 },
                            { title: inOutDoneLabel, dataIndex: 'doneQty', width: 140 },
                          ]}
                        />
                      )
                    ),
                  },
                  {
                    key: 'detail',
                    label: inOutDetailLabel,
                    children: (
                      inOutData.loading ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                      ) : (
                        <Table<InOutDetailRow>
                          rowKey="key"
                          size="middle"
                          bordered
                          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
                          dataSource={inOutData.detailRows}
                          locale={{ emptyText: `暂无${inOutDetailLabel}数据` }}
                          columns={[
                            {
                              title: '工厂',
                              dataIndex: 'factoryId',
                              width: 220,
                              render: (value: number | undefined) => {
                                if (!Number.isFinite(value)) {
                                  return '-';
                                }
                                return factoryOptions.find((item) => item.value === value)?.label ?? `工厂ID:${value}`;
                              },
                            },
                            { title: '颜色', dataIndex: 'color', width: 140 },
                            { title: '尺码', dataIndex: 'size', width: 140 },
                            { title: '下货数量', dataIndex: 'dispatchQty', width: 140 },
                            { title: inOutDoneLabel, dataIndex: 'doneQty', width: 140 },
                          ]}
                        />
                      )
                    ),
                  },
                ]}
              />
            </>
          ) : null}
        </Form>
      </Modal>

      <Modal
        open={allocationCreateModalOpen}
        title="新建分配"
        onCancel={() => {
          setAllocationCreateModalOpen(false);
          setAllocationCreateSubmitting(false);
          allocationCreateForm.resetFields();
        }}
        onOk={handleSubmitAllocationCreate}
        confirmLoading={allocationCreateSubmitting}
        width={1360}
        styles={{ body: { maxHeight: '72vh', overflow: 'auto' } }}
        destroyOnHidden
      >
        <Form form={allocationCreateForm} layout="vertical">
          <Form.Item label="工厂" name="factoryId" rules={[{ required: true, message: '请选择工厂' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={factoryOptions}
              placeholder="请选择工厂"
              notFoundContent="暂无工厂，请先新增合作方工厂"
            />
          </Form.Item>
          <div style={{ marginTop: -8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">没有可选工厂？请先到合作方页面新增工厂。</Text>
            <Button type="link" size="small" onClick={handleOpenFactoryGuide}>
              去新建工厂
            </Button>
          </div>
          <Form.Item label="工价（元/件）" name="unitPrice">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <div className="factory-allocation-toolbar">
            <Text strong>颜色/尺码数量矩阵</Text>
            <Button type="link" size="small" onClick={handleLoadRemainingAllocation}>
              加载剩余数量
            </Button>
          </div>
          {allocationColors.length === 0 || allocationSizes.length === 0 ? (
            <Text type="secondary">暂无可分配的颜色/尺码数据</Text>
          ) : (
            <>
              <Alert
                type={allocationHistoryTotal + allocationGrandTotal > allocationRequiredTotal ? 'error' : 'info'}
                showIcon
                style={{ marginBottom: 8 }}
                message={`下单总量：${allocationRequiredTotal}，已分配：${allocationHistoryTotal}，本次分配：${allocationGrandTotal}，分配后：${allocationHistoryTotal + allocationGrandTotal}`}
              />
              <div className="factory-create-matrix-wrap">
                <table className="factory-create-matrix-table">
                  <thead>
                    <tr>
                      <th>颜色 \\ 尺码</th>
                      {allocationSizes.map((size) => (
                        <th key={`alloc-create-head-${size}`}>{size}</th>
                      ))}
                      <th>小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationColors.map((color) => (
                      <tr key={`alloc-create-row-${color}`}>
                        <td>{color}</td>
                        {allocationSizes.map((size) => {
                          const orderedQty = allocationOrderedMatrix[color]?.[size] ?? 0;
                          const historyAllocatedQty = allocationHistoryMatrix[color]?.[size] ?? 0;
                          const allocatedQty = normalizeQtyValue(allocationMatrix[color]?.[size]);
                          const remainingQty = Math.max(orderedQty - historyAllocatedQty - allocatedQty, 0);
                          const availableQty = Math.max(orderedQty - historyAllocatedQty, 0);
                          return (
                            <td key={`alloc-create-${color}-${size}`}>
                              <div style={{ display: 'grid', gap: 4 }}>
                                <InputNumber
                                  min={0}
                                  precision={0}
                                  max={availableQty > 0 ? availableQty : undefined}
                                  value={allocatedQty}
                                  onChange={(value) => handleAllocationMatrixQtyChange(color, size, value)}
                                  controls={false}
                                  style={{ width: '100%' }}
                                  placeholder={`最多 ${availableQty}`}
                                />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {orderedQty}/{remainingQty}
                                </Text>
                              </div>
                            </td>
                          );
                        })}
                        <td>{allocationRowTotals[color] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>合计</td>
                      {allocationSizes.map((size) => (
                        <td key={`alloc-create-sum-${size}`}>{allocationColumnTotals[size] ?? 0}</td>
                      ))}
                      <td>{allocationGrandTotal}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        open={statusModalOpen}
        title="批量设置状态"
        onCancel={() => setStatusModalOpen(false)}
        onOk={handleSubmitStatus}
        confirmLoading={statusSubmitting}
        destroyOnHidden
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item label="整体状态" name="overallStatus">
            <Select allowClear options={overallStatusOptions} placeholder="请选择需要设置的整体状态" />
          </Form.Item>
          <Form.Item label="物料状态" name="materialStatus">
            <Select allowClear options={materialStatusOptions} placeholder="请选择物料状态" />
          </Form.Item>
          <Form.Item label="已完成数量" name="completedQuantity">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="填写时将覆盖当前完成数量" />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={3} placeholder="可选，方便记录操作人" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(costDetailRecord)}
        title={costDetailRecord ? `大货成本明细 - ${costDetailRecord.orderCode}` : '大货成本明细'}
        footer={null}
        onCancel={() => {
          setCostDetailRecord(null);
          setCostDetailData(null);
          setCostDetailLoading(false);
        }}
        destroyOnHidden
        width={900}
      >
        {costDetailRecord ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="订单号">{costDetailRecord.orderCode}</Descriptions.Item>
              <Descriptions.Item label="款号">{costDetailRecord.styleCode ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="款名">{costDetailRecord.styleName ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="下单数量">
                {typeof costDetailRecord.orderQuantity === 'number' ? `${costDetailRecord.orderQuantity.toLocaleString()} 件` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预计交货">{costDetailRecord.expectedDelivery ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="物料状态">{costDetailRecord.materialStatus ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="生产阶段">{costDetailRecord.productionStage ?? '-'}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              bordered
              loading={costDetailLoading}
              pagination={false}
              rowKey="key"
              dataSource={costDetailData ? [
                {
                  key: 'estimated',
                  label: '预计总成本',
                  material: costDetailData.estimatedCost.material,
                  processing: costDetailData.estimatedCost.processing,
                  outsourcing: costDetailData.estimatedCost.outsourcing,
                  fee: costDetailData.estimatedCost.fee,
                  total: costDetailData.estimatedCost.total,
                },
                {
                  key: 'actual',
                  label: '实际总成本',
                  material: costDetailData.actualCost.material,
                  processing: costDetailData.actualCost.processing,
                  outsourcing: costDetailData.actualCost.outsourcing,
                  fee: costDetailData.actualCost.fee,
                  total: costDetailData.actualCost.total,
                },
                {
                  key: 'estimated-unit',
                  label: '预计单件成本',
                  material: costDetailData.estimatedUnitCost.material,
                  processing: costDetailData.estimatedUnitCost.processing,
                  outsourcing: costDetailData.estimatedUnitCost.outsourcing,
                  fee: costDetailData.estimatedUnitCost.fee,
                  total: costDetailData.estimatedUnitCost.total,
                },
                {
                  key: 'actual-unit',
                  label: '实际单件成本',
                  material: costDetailData.actualUnitCost.material,
                  processing: costDetailData.actualUnitCost.processing,
                  outsourcing: costDetailData.actualUnitCost.outsourcing,
                  fee: costDetailData.actualUnitCost.fee,
                  total: costDetailData.actualUnitCost.total,
                },
              ] : []}
              columns={[
                { title: '成本类型', dataIndex: 'label', width: 140 },
                { title: '物料', dataIndex: 'material', align: 'right', render: (value: number) => value.toFixed(2) },
                { title: '加工', dataIndex: 'processing', align: 'right', render: (value: number) => value.toFixed(2) },
                { title: '外协', dataIndex: 'outsourcing', align: 'right', render: (value: number) => value.toFixed(2) },
                { title: '费用', dataIndex: 'fee', align: 'right', render: (value: number) => value.toFixed(2) },
                { title: '合计', dataIndex: 'total', align: 'right', render: (value: number) => value.toFixed(2) },
              ]}
            />
            <Table
              size="small"
              bordered
              pagination={{ pageSize: 5, showSizeChanger: false }}
              rowKey={(_record, index) => `entry-${index}`}
              dataSource={costDetailData?.entries ?? []}
              columns={[
                {
                  title: '类型',
                  dataIndex: 'entryType',
                  width: 100,
                  render: (value: string) => (value === 'ESTIMATED' ? '预计' : value === 'ACTUAL' ? '实际' : value || '-'),
                },
                {
                  title: '类别',
                  dataIndex: 'costCategory',
                  width: 120,
                  render: (value: string) => ({
                    MATERIAL: '物料',
                    PROCESSING: '加工',
                    OUTSOURCING: '外协',
                    FEE: '费用',
                  }[value] ?? value ?? '-'),
                },
                {
                  title: '金额',
                  dataIndex: 'amount',
                  width: 120,
                  align: 'right',
                  render: (value: number) => value.toFixed(2),
                },
                {
                  title: '引用单号',
                  dataIndex: 'referenceNo',
                  render: (value: string | undefined) => value || '-',
                },
                {
                  title: '记录时间',
                  dataIndex: 'recordedAt',
                  width: 190,
                  render: (value: string | undefined) => value || '-',
                },
              ]}
            />
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(printPreviewRecord)}
        title={printPreviewRecord ? `打印预览 - ${printPreviewRecord.orderCode}` : '打印预览'}
        onCancel={() => setPrintPreviewRecord(null)}
        onOk={handlePrintInBrowser}
        okText="打印"
        cancelText="关闭"
        destroyOnHidden
      >
        {printPreviewRecord ? (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="订单号">{printPreviewRecord.orderCode}</Descriptions.Item>
            <Descriptions.Item label="款号">{printPreviewRecord.styleCode ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="款名">{printPreviewRecord.styleName ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="下单数量">
              {typeof printPreviewRecord.orderQuantity === 'number' ? `${printPreviewRecord.orderQuantity.toLocaleString()} 件` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预计交货">{printPreviewRecord.expectedDelivery ?? '-'}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
};

export default FactoryOrders;
