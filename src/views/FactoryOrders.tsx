import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile } from 'antd/es/upload';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Col,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  ExportOutlined,
  DownloadOutlined,
  EditOutlined,
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
import { finishedGoodsReceivedService } from '../api/finished-goods';
import { outsourcingManagementApi } from '../api/outsourcing-management';
import { pieceworkService } from '../api/piecework';
import { stylesApi } from '../api/styles';
import { styleDetailApi } from '../api/style-detail';
import { partnersApi } from '../api/partners';
import sampleOrderApi from '../api/sample-order';
import { SampleStatus as SampleStatusEnum } from '../types/sample';
import type { FinishedGoodsReceivedRecord } from '../types/finished-goods-received';
import dayjs from 'dayjs';
import { SearchField } from '../components/page';
import '../styles/factory-orders.css';
import { sortColorValues, sortSizeValues, sortSpecRows } from '../utils/spec';
import CreateOrderModal from './factory-orders/CreateOrderModal';
import ImportOrdersModal from './factory-orders/ImportOrdersModal';
import CostDetailModal from './factory-orders/CostDetailModal';
import PrintPreviewModal from './factory-orders/PrintPreviewModal';
import FactoryOrderCardList from './factory-orders/CardList';
import AllocationCreateModal from './factory-orders/AllocationCreateModal';
import ProgressActionModal from './factory-orders/ProgressActionModal';
import type {
  AllocationHistoryRow,
  AllocationQuantityMatrix,
  CreateQuantityMatrix,
  CreateStyleMaterial,
  CuttingSheetTarget,
  ImportModalState,
  ImportRecord,
  InOutDataState,
  InOutSummaryRow,
  OrderActionSnapshot,
  OverallStatus,
  PendingSampleProduceContext,
  ProgressActionModalState,
  ProgressNodeQuantitySnapshot,
  ProgressStatsState,
  SelectOption,
  ViewMode,
} from './factory-orders/types';
import {
  CUTTING_SHEET_START_SOURCE,
  VIEW_MODE_STORAGE_KEY,
  buildCreateMatrix,
  formatProgressPercent,
  getMaterialStatusLabel,
  getMaterialTagColor,
  getOverallStatusMeta,
  materialStatusOptions,
  normalizeProgressLabel,
  normalizeQtyValue,
  normalizeTagValues,
  overallStatusOptions,
  parseProgressNodePayload,
  progressNodeCodeMap,
  resolveOverallStatusParam,
  sortOptions,
  statusQueryMap,
  statusTabDefaults,
} from './factory-orders/utils';

const { Text } = Typography;

const FactoryOrders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const keywordParam = searchParams.get('keyword')?.trim() ?? '';
  const statusParam = searchParams.get('status');
  const initialKeyword = keywordParam;
  const initialStatus = resolveOverallStatusParam(statusParam, keywordParam);
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
  const [searchValue, setSearchValue] = useState(initialKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState(initialKeyword);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<OverallStatus>(initialStatus);
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
  const [importModal, setImportModal] = useState<ImportModalState>({ open: false, records: [], fileList: [], uploading: false });
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderCode, setEditingOrderCode] = useState<string | null>(null);
  const [createOptionsLoading, setCreateOptionsLoading] = useState(false);
  const [styleOptions, setStyleOptions] = useState<SelectOption[]>([]);
  const [factoryOptions, setFactoryOptions] = useState<SelectOption[]>([]);
  const [merchandiserOptions, setMerchandiserOptions] = useState<SelectOption[]>([]);
  const [createColors, setCreateColors] = useState<string[]>([]);
  const [createSizes, setCreateSizes] = useState<string[]>([]);
  const [createMatrix, setCreateMatrix] = useState<CreateQuantityMatrix>({});
  const [createMatrixSeedStyleId, setCreateMatrixSeedStyleId] = useState<number | null>(null);
  const [createStyleMaterials, setCreateStyleMaterials] = useState<CreateStyleMaterial[]>([]);
  const [pendingSampleProduceContext, setPendingSampleProduceContext] = useState<PendingSampleProduceContext | null>(null);
  const [costDetailRecord, setCostDetailRecord] = useState<OrderActionSnapshot | null>(null);
  const [costDetailLoading, setCostDetailLoading] = useState(false);
  const [costDetailData, setCostDetailData] = useState<FactoryOrderCostDetail | null>(null);
  const [printPreviewRecord, setPrintPreviewRecord] = useState<OrderActionSnapshot | null>(null);
  const [progressActionModal, setProgressActionModal] = useState<ProgressActionModalState>({ open: false, submitting: false });
  const [progressStats, setProgressStats] = useState<ProgressStatsState>({
    loading: false,
    rows: [],
  });
  const [progressNodeQuantities, setProgressNodeQuantities] = useState<ProgressNodeQuantitySnapshot>({});
  const [cuttingSheetTarget, setCuttingSheetTarget] = useState<CuttingSheetTarget | null>(null);
  const [allocationColors, setAllocationColors] = useState<string[]>([]);
  const [allocationSizes, setAllocationSizes] = useState<string[]>([]);
  const [allocationMatrix, setAllocationMatrix] = useState<AllocationQuantityMatrix>({});
  const [allocationHistoryRows, setAllocationHistoryRows] = useState<AllocationHistoryRow[]>([]);
  const [outsourceStatusByOrderId, setOutsourceStatusByOrderId] = useState<Record<string, string>>({});
  const [allocationCreateModalOpen, setAllocationCreateModalOpen] = useState(false);
  const [allocationCreateSubmitting, setAllocationCreateSubmitting] = useState(false);
  const [allocationCreateForm] = Form.useForm();
  const [progressTabKey, setProgressTabKey] = useState<'stats' | 'allocation'>('stats');
  const [inOutTabKey, setInOutTabKey] = useState<'pending' | 'detail'>('pending');
  const [inOutData, setInOutData] = useState<InOutDataState>({ loading: false, summaryRows: [], detailRows: [] });
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
    const nextKeyword = keywordParam;
    const nextStatus = resolveOverallStatusParam(statusParam, keywordParam);
    setSearchValue(nextKeyword);
    setAppliedKeyword(nextKeyword);
    setActiveStatus(nextStatus);
    resetPagination();
  }, [keywordParam, resetPagination, statusParam]);

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
  }, [loadFactoryOptions]);

  const handleOpenCreate = useCallback((presetStyleId?: number) => {
    setCreateModalOpen(true);
    setEditingOrderId(null);
    setEditingOrderCode(null);
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

  const handleCloseCreate = useCallback(() => {
    setCreateModalOpen(false);
    setEditingOrderId(null);
    setEditingOrderCode(null);
    setCreateColors([]);
    setCreateSizes([]);
    setCreateMatrix({});
    setCreateMatrixSeedStyleId(null);
    setPendingSampleProduceContext(null);
    createForm.resetFields();
  }, [createForm]);

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
      ['物料状态', getMaterialStatusLabel(printPreviewRecord.materialStatus)],
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
    setEditingOrderId(null);
    setEditingOrderCode(null);
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

  const handleEditOrder = useCallback(async (record: OrderActionSnapshot) => {
    setCreateModalOpen(true);
    setCreateSubmitting(true);
    setEditingOrderId(record.orderId);
    setEditingOrderCode(record.orderCode);
    setCreateColors([]);
    setCreateSizes([]);
    setCreateMatrix({});
    setCreateMatrixSeedStyleId(null);
    try {
      await loadCreateOptions();
      const detail = await factoryOrdersApi.getDetail(record.orderId);
      const order = detail.order;
      if (!order?.styleId) {
        throw new Error('当前订单缺少款式信息，无法编辑');
      }
      const lineGroups = (detail.lines ?? []).filter((line) => Number(line.orderedQty ?? 0) > 0);
      const colors = sortColorValues(lineGroups.map((line) => normalizeSpecLabel(line.color)));
      const sizes = sortSizeValues(lineGroups.map((line) => normalizeSpecLabel(line.size)));
      const nextMatrix = buildCreateMatrix(colors, sizes);
      lineGroups.forEach((line) => {
        const color = normalizeSpecLabel(line.color);
        const size = normalizeSpecLabel(line.size);
        nextMatrix[color][size] = normalizeQtyValue(line.orderedQty);
      });
      setCreateColors(colors);
      setCreateSizes(sizes);
      setCreateMatrix(nextMatrix);
      setCreateMatrixSeedStyleId(order.styleId ?? null);
      createForm.setFieldsValue({
        orderNo: order.orderNo,
        styleId: order.styleId,
        expectedDelivery: order.expectedDelivery ? dayjs(order.expectedDelivery) : undefined,
        factoryId: order.factoryId,
        merchandiserId: order.merchandiserId,
        overallStatus: order.status === 'COMPLETED' ? 'completed' : 'unfinished',
        materialStatus: order.materialStatus ?? 'PENDING',
        remarks: order.remarks,
      });
    } catch (error) {
      console.error('failed to open edit factory order modal', error);
      message.error(error instanceof Error ? error.message : '加载订单详情失败');
      handleCloseCreate();
    } finally {
      setCreateSubmitting(false);
    }
  }, [createForm, handleCloseCreate, loadCreateOptions]);

  const handleDeleteOrder = useCallback((record: OrderActionSnapshot) => {
    if (record.deletable === false) {
      Modal.warning({
        title: `工厂订单不可删除：${record.orderCode}`,
        content: record.deleteBlockedReason || '当前工厂订单不允许删除。',
        okText: '知道了',
      });
      return;
    }
    Modal.confirm({
      title: `删除工厂订单：${record.orderCode}`,
      content: '仅未进入执行流程、且没有节点执行记录的订单允许删除。删除后不可恢复。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await factoryOrdersApi.deleteOrder(record.orderId);
        message.success(`已删除工厂订单：${record.orderCode}`);
        triggerReload();
      },
    });
  }, []);

  const buildSpecKey = (color?: string, size?: string) => `${(color ?? '').trim()}::${(size ?? '').trim()}`;

  const normalizeSpecLabel = (value?: string) => {
    const text = (value ?? '').trim();
    return text || '-';
  };

  const loadProgressStats = useCallback(async (orderId: string, stageKey: 'cutting' | 'sewing') => {
    setProgressStats({ loading: true, rows: [] });
    setProgressNodeQuantities({});
    setOutsourceStatusByOrderId({});
    try {
      type AllocationItem = { color: string; size: string; quantity: number };
      type AllocationEntry = {
        completedAt?: string;
        bedNumber?: string;
        source?: string;
        workOrderId?: number;
        outsourcingOrderId?: number;
        subcontractorId?: number;
        unitPrice?: number;
        items: AllocationItem[];
      };

      const shouldIncludeAllocation = (
        source: unknown,
        currentStageKey: 'cutting' | 'sewing',
      ) => !(currentStageKey === 'cutting' && source === CUTTING_SHEET_START_SOURCE);

      const normalizeAllocationItems = (
        items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>,
      ): AllocationItem[] => {
        const mergedMap = new Map<string, AllocationItem>();
        (items ?? []).forEach((item) => {
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
      };

      const parseNodeAllocations = (node?: FactoryOrderProgressNode, currentStageKey?: 'cutting' | 'sewing'): AllocationEntry[] => {
        if (!node?.payloadJson) {
          return [];
        }
        try {
          const payload = JSON.parse(node.payloadJson) as {
            allocations?: Array<{
              completedAt?: unknown;
              bedNumber?: unknown;
              source?: unknown;
              workOrderId?: unknown;
              outsourcingOrderId?: unknown;
              subcontractorId?: unknown;
              unitPrice?: unknown;
              items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>;
            }>;
            items?: Array<{ color?: unknown; size?: unknown; quantity?: unknown }>;
          };
          const sourceAllocations = Array.isArray(payload.allocations)
            ? payload.allocations.filter((allocation) => !currentStageKey || shouldIncludeAllocation(allocation.source, currentStageKey))
            : [];
          if (sourceAllocations.length > 0) {
            return sourceAllocations.map((allocation) => ({
              completedAt: typeof allocation.completedAt === 'string' ? allocation.completedAt : undefined,
              bedNumber: typeof allocation.bedNumber === 'string' ? allocation.bedNumber : undefined,
              source: typeof allocation.source === 'string' ? allocation.source : undefined,
              workOrderId: Number.isFinite(Number(allocation.workOrderId)) ? Number(allocation.workOrderId) : undefined,
              outsourcingOrderId: Number.isFinite(Number(allocation.outsourcingOrderId)) ? Number(allocation.outsourcingOrderId) : undefined,
              subcontractorId: Number.isFinite(Number(allocation.subcontractorId)) ? Number(allocation.subcontractorId) : undefined,
              unitPrice: Number.isFinite(Number(allocation.unitPrice)) ? Number(allocation.unitPrice) : undefined,
              items: normalizeAllocationItems(allocation.items),
            }));
          }
          const fallbackItems = normalizeAllocationItems(payload.items);
          return fallbackItems.length > 0 ? [{ items: fallbackItems }] : [];
        } catch {
          return [];
        }
      };

      const normalizeSewingAllocationsForDisplay = (
        allocations: AllocationEntry[],
        cuttingItems: AllocationItem[],
      ): AllocationEntry[] => {
        if (!allocations.length || !cuttingItems.length) {
          return allocations;
        }
        const remainingBySpec = new Map<string, number>();
        cuttingItems.forEach((item) => {
          const key = buildSpecKey(item.color, item.size);
          remainingBySpec.set(key, (remainingBySpec.get(key) ?? 0) + item.quantity);
        });
        const allocateFromRemaining = (requiredQty: number): AllocationItem[] => {
          const rebuilt: AllocationItem[] = [];
          let remaining = requiredQty;
          for (const [key, available] of remainingBySpec.entries()) {
            if (remaining <= 0) {
              break;
            }
            if (available <= 0) {
              continue;
            }
            const quantity = Math.min(available, remaining);
            const [color, size] = key.split('::');
            rebuilt.push({ color, size, quantity });
            remainingBySpec.set(key, available - quantity);
            remaining -= quantity;
          }
          if (remaining > 0) {
            rebuilt.push({ color: '-', size: '-', quantity: remaining });
          }
          return rebuilt;
        };
        return allocations.map((allocation) => {
          const isValid = allocation.items.every((item) => item.quantity <= (remainingBySpec.get(buildSpecKey(item.color, item.size)) ?? 0));
          if (isValid) {
            allocation.items.forEach((item) => {
              const key = buildSpecKey(item.color, item.size);
              remainingBySpec.set(key, Math.max((remainingBySpec.get(key) ?? 0) - item.quantity, 0));
            });
            return allocation;
          }
          const totalQty = allocation.items.reduce((sum, item) => sum + item.quantity, 0);
          return { ...allocation, items: allocateFromRemaining(totalQty) };
        });
      };

      const [nodes, detail] = await Promise.all([
        factoryOrdersApi.getProgress(orderId),
        factoryOrdersApi.getDetail(orderId),
      ]);
      const cuttingNode = nodes.find((item) => item.nodeCode === 'CUTTING');
      const sewingNode = nodes.find((item) => item.nodeCode === 'SEWING');
      const cuttingSheetAllocations = parseNodeAllocations(cuttingNode).filter(
        (allocation) =>
          typeof allocation.workOrderId === 'number'
          && allocation.workOrderId > 0
          && allocation.source?.startsWith('CUTTING_SHEET'),
      );
      const currentCuttingSheetTarget = cuttingSheetAllocations.find(
        (allocation) => allocation.source === CUTTING_SHEET_START_SOURCE,
      ) ?? cuttingSheetAllocations[0];
      setCuttingSheetTarget(
        currentCuttingSheetTarget?.workOrderId
          ? {
              workOrderId: currentCuttingSheetTarget.workOrderId,
              bedNumber: currentCuttingSheetTarget.bedNumber,
            }
          : null,
      );
      const cuttingAllocations = parseNodeAllocations(cuttingNode, 'cutting');
      const cuttingItems = cuttingAllocations.flatMap((allocation) => allocation.items);
      const sewingAllocations = normalizeSewingAllocationsForDisplay(
        parseNodeAllocations(sewingNode, 'sewing'),
        cuttingItems,
      );
      const cuttingNodePayload = parseProgressNodePayload(cuttingNode);
      const sewingNodePayload = parseProgressNodePayload(sewingNode);
      const stageNodeCode = stageKey === 'cutting' ? 'CUTTING' : 'SEWING';
      const historyRows: AllocationHistoryRow[] = [];
      const stageAllocations = stageKey === 'cutting' ? cuttingAllocations : sewingAllocations;
      stageAllocations.forEach((allocation, index) => {
        const totalQty = allocation.items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQty <= 0) {
          return;
        }
        historyRows.push({
          key: `${stageNodeCode}-${index}`,
          completedAt: allocation.completedAt,
          bedNumber: allocation.bedNumber,
          source: allocation.source,
          workOrderId: allocation.workOrderId,
          outsourcingOrderId: allocation.outsourcingOrderId,
          factoryId: allocation.subcontractorId,
          unitPrice: allocation.unitPrice,
          totalQty,
          itemSummary: allocation.items.map((item) => `${item.color}/${item.size}:${item.quantity}`).join('；'),
          items: allocation.items,
        });
      });
      setAllocationHistoryRows(historyRows.reverse());
      if (stageKey === 'sewing') {
        const outsourceOrderIds = Array.from(
          new Set(
            historyRows
              .map((record) => record.outsourcingOrderId)
              .filter((value): value is number => typeof value === 'number' && value > 0),
          ),
        );
        if (outsourceOrderIds.length > 0) {
          const detailResults = await Promise.allSettled(
            outsourceOrderIds.map(async (currentOrderId) => {
              const detail = await outsourcingManagementApi.getDetail(String(currentOrderId));
              return [String(currentOrderId), detail.status] as const;
            }),
          );
          setOutsourceStatusByOrderId(
            detailResults.reduce<Record<string, string>>((acc, result) => {
              if (result.status === 'fulfilled') {
                const [currentOrderId, status] = result.value;
                acc[currentOrderId] = status;
              }
              return acc;
            }, {}),
          );
        }
      }
      const specMap = new Map<string, { key: string; color: string; size: string; orderedQty: number; cuttingQty: number; sewingQty: number; sewingCompletedQty: number }>();
      (detail.lines ?? []).forEach((line) => {
        const color = normalizeSpecLabel(line.color);
        const size = normalizeSpecLabel(line.size);
        const key = buildSpecKey(color, size);
        if (!specMap.has(key)) {
          specMap.set(key, { key, color, size, orderedQty: 0, cuttingQty: 0, sewingQty: 0, sewingCompletedQty: 0 });
        }
        const row = specMap.get(key)!;
        row.orderedQty += Number(line.orderedQty ?? 0);
        row.sewingCompletedQty += Number(line.completedQuantity ?? 0);
      });

      cuttingItems.forEach((item) => {
        const key = buildSpecKey(item.color, item.size);
        if (!specMap.has(key)) {
          specMap.set(key, { key, color: item.color, size: item.size, orderedQty: 0, cuttingQty: 0, sewingQty: 0, sewingCompletedQty: 0 });
        }
        specMap.get(key)!.cuttingQty += item.quantity;
      });

      sewingAllocations.flatMap((allocation) => allocation.items).forEach((item) => {
        const key = buildSpecKey(item.color, item.size);
        if (!specMap.has(key)) {
          specMap.set(key, { key, color: item.color, size: item.size, orderedQty: 0, cuttingQty: 0, sewingQty: 0, sewingCompletedQty: 0 });
        }
        specMap.get(key)!.sewingQty += item.quantity;
      });

      const rows = sortSpecRows(Array.from(specMap.values()));
      setProgressStats({ loading: false, rows });
      setProgressNodeQuantities({
        cuttingCompletedQty: cuttingNodePayload.completedQuantity,
        sewingAllocatedQty: sewingNodePayload.allocatedQuantity,
        sewingCompletedQty: sewingNodePayload.completedQuantity,
      });
      const colors = sortColorValues(rows.map((row) => row.color));
      const sizes = sortSizeValues(rows.map((row) => row.size));
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
      setProgressNodeQuantities({});
      setAllocationColors([]);
      setAllocationSizes([]);
      setAllocationMatrix({});
      setAllocationHistoryRows([]);
      setCuttingSheetTarget(null);
    }
  }, []);

  const loadInOutData = useCallback(async (orderId: string) => {
    setInOutData({ loading: true, summaryRows: [], detailRows: [] });
    try {
      const [nodes, detail, received] = await Promise.all([
        factoryOrdersApi.getProgress(orderId),
        factoryOrdersApi.getDetail(orderId),
        finishedGoodsReceivedService.getList({
          page: 0,
          pageSize: 200,
          viewMode: 'spec',
          productionOrderId: orderId,
        }),
      ]);
      const inboundNode = nodes.find((item) => item.nodeCode === 'INBOUND');
      const targetNode = inboundNode;
      const doneMap = new Map<string, number>();
      const receiptRecords = received.list.filter((item): item is FinishedGoodsReceivedRecord => 'receiptNo' in item);
      receiptRecords.forEach((item) => {
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
            doneQty,
            pendingQty: Math.max(row.totalQty - doneQty, 0),
          };
        })
        .sort((a, b) => (a.color !== b.color ? a.color.localeCompare(b.color, 'zh-CN') : a.size.localeCompare(b.size, 'zh-CN')));
      setInOutData({
        loading: false,
        summaryRows,
        detailRows: receiptRecords
          .map((item) => ({
            key: item.id,
            receiptNo: item.receiptNo,
            receiptDate: item.receiptDate,
            warehouseName: item.warehouseName,
            processorName: item.processorName,
            color: normalizeSpecLabel(item.color),
            size: normalizeSpecLabel(item.size),
            quantity: Number(item.quantity ?? 0),
          }))
          .sort((a, b) => {
          if (a.receiptDate !== b.receiptDate) {
            return String(b.receiptDate).localeCompare(String(a.receiptDate), 'zh-CN');
          }
          if (a.receiptNo !== b.receiptNo) {
            return a.receiptNo.localeCompare(b.receiptNo, 'zh-CN');
          }
          if (a.color !== b.color) {
            return a.color.localeCompare(b.color, 'zh-CN');
          }
          return a.size.localeCompare(b.size, 'zh-CN');
        }),
      });
    } catch (error) {
      console.error('failed to load inbound data', error);
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
    } else if (stage.key === 'inbound') {
      void loadInOutData(record.orderId);
      void loadFactoryOptions()
        .then((options) => setFactoryOptions(options))
        .catch(() => undefined);
    } else {
      setProgressStats({ loading: false, rows: [] });
      setProgressNodeQuantities({});
      setAllocationColors([]);
      setAllocationSizes([]);
      setAllocationMatrix({});
      setAllocationHistoryRows([]);
      setCuttingSheetTarget(null);
      setInOutData({ loading: false, summaryRows: [], detailRows: [] });
    }
    if (stage.key === 'fabric_arrived' || stage.key === 'accessory_arrived') {
      progressActionForm.setFieldsValue({ arrivedAt: dayjs() });
    } else if (stage.key === 'cutting' || stage.key === 'sewing') {
      progressActionForm.setFieldsValue({
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
      if (nodeCode === 'INBOUND') {
        message.info('入库节点状态由成品入库记录自动联动，请到成品入库中处理。');
        return;
      }
      if (nodeCode === 'FABRIC_ARRIVED' || nodeCode === 'ACCESSORY_ARRIVED') {
        payload.arrivedAt = values.arrivedAt ? values.arrivedAt.toISOString() : dayjs().toISOString();
      }
      if (nodeCode === 'CUTTING' || nodeCode === 'SEWING') {
        payload.subcontractorId = values.factoryId;
        payload.unitPrice = values.unitPrice;
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
      if (error && typeof error === 'object' && 'response' in error) {
        return;
      }
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
    const sampleOrderId = searchParams.get('sampleOrderId');
    const sampleOrderNo = searchParams.get('sampleOrderNo') ?? undefined;
    setPendingSampleProduceContext(sampleOrderId ? { sampleOrderId, sampleOrderNo } : null);
    handleOpenCreate(presetStyleId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('quickCreate');
    nextParams.delete('styleId');
    nextParams.delete('sampleOrderId');
    nextParams.delete('sampleOrderNo');
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
    const styleColors = normalizeTagValues(style?.colors ?? []);
    const styleSizes = normalizeTagValues(style?.sizes ?? []);
    if (styleColors.length > 0 || styleSizes.length > 0) {
      setCreateColors(styleColors);
      setCreateSizes(styleSizes);
      setCreateMatrix(buildCreateMatrix(styleColors, styleSizes));
      setCreateMatrixSeedStyleId(styleId);
      return;
    }

    let cancelled = false;
    const fillFromStyleDetail = async () => {
      try {
        const [detail, materials] = await Promise.all([
          styleDetailApi.fetchDetail(String(styleId)),
          styleDetailApi.fetchMaterials(String(styleId)),
        ]);
        if (cancelled) {
          return;
        }
        const detailColors = normalizeTagValues(detail.colors ?? []);
        const detailSizes = normalizeTagValues(detail.sizes ?? []);
        setStyleOptions((prev) => {
          const current = prev.find((item) => item.value === styleId);
          const nextEntry: SelectOption = {
            value: styleId,
            label: current?.label ?? `${detail.styleNo} / ${detail.styleName}`,
            image: current?.image ?? detail.coverImageUrl,
            colors: detailColors,
            sizes: detailSizes,
          };
          if (current) {
            return prev.map((item) => (item.value === styleId ? { ...item, ...nextEntry } : item));
          }
          return [...prev, nextEntry];
        });
        setCreateColors(detailColors);
        setCreateSizes(detailSizes);
        setCreateMatrix(buildCreateMatrix(detailColors, detailSizes));
        setCreateStyleMaterials(materials);
        setCreateMatrixSeedStyleId(styleId);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error('failed to load style detail for quick create', error);
        setCreateStyleMaterials([]);
        setCreateMatrixSeedStyleId(styleId);
      }
    };

    void fillFromStyleDetail();
    return () => {
      cancelled = true;
    };
  }, [createMatrixSeedStyleId, createModalOpen, selectedCreateStyleId, styleOptions]);

  useEffect(() => {
    if (!createModalOpen || selectedCreateStyleId == null) {
      setCreateStyleMaterials([]);
      return;
    }
    const styleId = Number(selectedCreateStyleId);
    if (!Number.isFinite(styleId) || styleId <= 0) {
      setCreateStyleMaterials([]);
      return;
    }
    let cancelled = false;
    const loadMaterials = async () => {
      try {
        const materials = await styleDetailApi.fetchMaterials(String(styleId));
        if (!cancelled) {
          setCreateStyleMaterials(materials);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('failed to load style bom materials', error);
          setCreateStyleMaterials([]);
        }
      }
    };
    void loadMaterials();
    return () => {
      cancelled = true;
    };
  }, [createModalOpen, selectedCreateStyleId]);

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

  const progressStageKey = progressActionModal.stage?.key;
  const isCuttingProgressStage = progressStageKey === 'cutting';
  const isSewingProgressStage = progressStageKey === 'sewing';
  const isWideProgressStage = progressStageKey === 'cutting' || progressStageKey === 'sewing';
  const isInOutProgressStage = progressStageKey === 'inbound';
  const inOutIsInbound = progressStageKey === 'inbound';
  const inOutPendingLabel = inOutIsInbound ? '待收货' : '待处理';
  const inOutDetailLabel = inOutIsInbound ? '收货明细' : '处理明细';
  const inOutDoneLabel = inOutIsInbound ? '已收货' : '已处理';
  const inOutStageStatus = String(progressActionModal.stage?.status ?? '').toLowerCase();
  const inOutStageCompleted = isInOutProgressStage
    && (
      inOutStageStatus === 'success'
      || inOutStageStatus === 'completed'
      || (typeof progressActionModal.stage?.value === 'string' && progressActionModal.stage.value.includes('已完成'))
    );
  const progressModalWidth = isWideProgressStage ? 1360 : isInOutProgressStage ? 1400 : 560;

  const handleLoadRemainingAllocation = useCallback(() => {
    if (!allocationColors.length || !allocationSizes.length) {
      message.warning(isCuttingProgressStage ? '暂无可加载的颜色/尺码裁剪数据' : '暂无可加载的车缝可领取数据');
      return;
    }
    const capacityMatrix = progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
      if (!matrix[row.color]) {
        matrix[row.color] = {};
      }
      matrix[row.color][row.size] = isCuttingProgressStage ? row.orderedQty : row.cuttingQty;
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
    setAllocationMatrix((prev) => {
      const globalRemaining = isCuttingProgressStage
        ? Number.POSITIVE_INFINITY
        : Math.max(
          (progressNodeQuantities.cuttingCompletedQty ?? progressStats.rows.reduce((sum, row) => sum + row.cuttingQty, 0))
            - allocationHistoryRows.reduce((sum, row) => sum + row.totalQty, 0),
          0,
        );
      let distributableRemaining = globalRemaining;
      return allocationColors.reduce<AllocationQuantityMatrix>((matrix, color) => {
        matrix[color] = allocationSizes.reduce<Record<string, number>>((row, size) => {
          const capacity = capacityMatrix[color]?.[size] ?? 0;
          const historyAllocated = historyMatrix[color]?.[size] ?? 0;
          const current = normalizeQtyValue(prev[color]?.[size]);
          const specRemaining = Math.max(capacity - historyAllocated - current, 0);
          const loadable = isCuttingProgressStage
            ? specRemaining
            : Math.max(Math.min(specRemaining, distributableRemaining), 0);
          row[size] = current + loadable;
          if (!isCuttingProgressStage) {
            distributableRemaining = Math.max(distributableRemaining - loadable, 0);
          }
          return row;
        }, {});
        return matrix;
      }, {});
    });
    message.success(isCuttingProgressStage ? '已加载剩余未录入数量' : '已加载当前可继续领取数量');
  }, [allocationColors, allocationHistoryRows, allocationSizes, isCuttingProgressStage, progressNodeQuantities.cuttingCompletedQty, progressStats.rows]);

  const handleOpenFactoryGuide = useCallback(() => {
    navigate('/basic/partners?type=factory');
  }, [navigate]);

  const handleNavigateToCuttingSheetByWorkOrder = useCallback(async (workOrderId?: number) => {
    if (!workOrderId) {
      return;
    }
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(workOrderId);
      const targetPath =
        detail.status === 'COMPLETED'
          ? '/piecework/cutting/done'
          : '/piecework/cutting/pending';
      const nextSearchParams = new URLSearchParams({
        workOrderId: String(workOrderId),
        openDetail: '1',
      });
      if (detail.orderCode?.trim()) {
        nextSearchParams.set('keyword', detail.orderCode.trim());
      }
      navigate(`${targetPath}?${nextSearchParams.toString()}`);
    } catch (error) {
      console.error('failed to resolve cutting sheet route', error);
      message.error('跳转裁床单失败，请稍后重试');
    }
  }, [navigate]);

  const handleNavigateToCuttingSheet = useCallback(async (record: AllocationHistoryRow) => {
    if (!record.workOrderId || !record.source?.startsWith('CUTTING_SHEET')) {
      return;
    }
    await handleNavigateToCuttingSheetByWorkOrder(record.workOrderId);
  }, [handleNavigateToCuttingSheetByWorkOrder]);

  const handleNavigateToCurrentCuttingSheet = useCallback(() => {
    if (!cuttingSheetTarget?.workOrderId) {
      message.warning('当前节点还没有可跳转的裁床单');
      return;
    }
    void handleNavigateToCuttingSheetByWorkOrder(cuttingSheetTarget.workOrderId);
  }, [cuttingSheetTarget?.workOrderId, handleNavigateToCuttingSheetByWorkOrder]);

  const handleNavigateToOutsourceOrder = useCallback((record: AllocationHistoryRow) => {
    if (!record.outsourcingOrderId) {
      return;
    }
    navigate(`/piecework/outsource?orderId=${record.outsourcingOrderId}&openDetail=1`);
  }, [navigate]);

  const handleOpenAllocationCreate = useCallback(() => {
    if (!allocationColors.length || !allocationSizes.length) {
      message.warning(isCuttingProgressStage ? '暂无可录入的颜色/尺码数据' : '暂无可领取的颜色/尺码数据');
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
      bedNumber: isCuttingProgressStage
        ? `BED-${dayjs().format('MMDD-HHmmss')}`
        : undefined,
    });
    setAllocationCreateModalOpen(true);
  }, [allocationColors, allocationCreateForm, allocationSizes, isCuttingProgressStage]);

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
      if (isCuttingProgressStage) {
        payload.bedNumber = values.bedNumber;
      }
      const matrixItems = allocationColors.flatMap((color) =>
        allocationSizes.map((size) => ({
          color: color === '-' ? undefined : color,
          size: size === '-' ? undefined : size,
          quantity: normalizeQtyValue(allocationMatrix[color]?.[size]),
        })),
      ).filter((item) => item.quantity > 0);
      const totalAllocated = matrixItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalAllocated <= 0) {
        message.warning(isCuttingProgressStage ? '请在裁剪矩阵中填写大于 0 的数量' : '请在领取矩阵中填写大于 0 的数量');
        return;
      }
      if (!isCuttingProgressStage) {
        const currentCuttingCompletedTotal = progressNodeQuantities.cuttingCompletedQty
          ?? progressStats.rows.reduce((sum, row) => sum + row.cuttingQty, 0);
        const currentAllocationRemainingTotal = Math.max(currentCuttingCompletedTotal - allocationHistoryRows.reduce((sum, row) => sum + row.totalQty, 0), 0);
        const rowMap = new Map(progressStats.rows.map((row) => [buildSpecKey(row.color, row.size), row]));
        const historyMap = allocationHistoryRows.reduce<Map<string, number>>((map, row) => {
          row.items.forEach((item) => {
            const key = buildSpecKey(item.color, item.size);
            map.set(key, (map.get(key) ?? 0) + item.quantity);
          });
          return map;
        }, new Map<string, number>());
        const exceededItem = matrixItems.find((item) => {
          const color = normalizeSpecLabel(item.color);
          const size = normalizeSpecLabel(item.size);
          const row = rowMap.get(buildSpecKey(color, size));
          const capacityQty = row?.cuttingQty ?? 0;
          const historyAllocatedQty = historyMap.get(buildSpecKey(color, size)) ?? 0;
          return item.quantity > Math.max(capacityQty - historyAllocatedQty, 0);
        });
        if (exceededItem) {
          const color = normalizeSpecLabel(exceededItem.color);
          const size = normalizeSpecLabel(exceededItem.size);
          message.warning(`颜色 ${color} / 尺码 ${size} 的领取量超过当前可放量`);
          return;
        }
        if (totalAllocated > currentAllocationRemainingTotal) {
          message.warning(`本次最多还能领取 ${currentAllocationRemainingTotal}，当前填写为 ${totalAllocated}`);
          return;
        }
      }
      payload.items = matrixItems;

      setAllocationCreateSubmitting(true);
      await factoryOrdersApi.completeProgress(progressActionModal.order.orderId, nodeCode, { payload });
      message.success(isCuttingProgressStage ? '裁剪数据已提交' : '车缝领取已提交');
      setAllocationCreateModalOpen(false);
      allocationCreateForm.resetFields();
      await loadProgressStats(progressActionModal.order.orderId, progressActionModal.stage.key as 'cutting' | 'sewing');
      triggerReload();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('failed to submit allocation', error);
      message.error(error instanceof Error ? error.message : (isCuttingProgressStage ? '提交裁剪数据失败' : '提交车缝领取失败'));
    } finally {
      setAllocationCreateSubmitting(false);
    }
  }, [
    allocationHistoryRows,
    allocationColors,
    allocationCreateForm,
    allocationMatrix,
    allocationSizes,
    isCuttingProgressStage,
    loadProgressStats,
    progressNodeQuantities.cuttingCompletedQty,
    progressStats.rows,
    progressActionModal.order,
    progressActionModal.stage,
  ]);

  const handleCloseProgressActionModal = useCallback(() => {
    setProgressActionModal({ open: false, submitting: false });
    setAllocationCreateModalOpen(false);
    setAllocationCreateSubmitting(false);
    setProgressTabKey('stats');
    setProgressStats({ loading: false, rows: [] });
    setProgressNodeQuantities({});
    setAllocationColors([]);
    setAllocationSizes([]);
    setAllocationMatrix({});
    setAllocationHistoryRows([]);
    setCuttingSheetTarget(null);
    allocationCreateForm.resetFields();
    progressActionForm.resetFields();
  }, [allocationCreateForm, progressActionForm]);

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
      const payload = {
        orderNo: values.orderNo,
        sourceSampleOrderId: pendingSampleProduceContext?.sampleOrderId,
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
      };
      if (editingOrderId) {
        await factoryOrdersApi.updateOrder(editingOrderId, payload);
      } else {
        await factoryOrdersApi.createOrder(payload);
      }
      if (!editingOrderId && pendingSampleProduceContext?.sampleOrderId) {
        await sampleOrderApi.updateStatus(
          pendingSampleProduceContext.sampleOrderId,
          SampleStatusEnum.PRODUCING,
          '转大货生产',
        );
      }
      message.success(editingOrderId ? '工厂订单更新成功' : '工厂订单创建成功');
      setPendingSampleProduceContext(null);
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
        value && value !== 'PENDING' ? <Tag color={getMaterialTagColor(value)}>{getMaterialStatusLabel(value)}</Tag> : '-',
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
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => void handleEditOrder({
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
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteOrder({
              orderId: record.id,
              orderCode: record.orderCode,
              styleCode: record.styleCode,
              styleName: record.styleName,
              expectedDelivery: record.expectedDelivery,
              materialStatus: record.materialStatus,
              orderQuantity: record.orderQuantity,
              productionStage: record.productionStage,
              deletable: record.deletable,
              deleteBlockedReason: record.deleteBlockedReason,
            })}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ], [handleCopyOrder, handleDeleteOrder, handleEditOrder, handleOpenCostDetail, handleOpenPrintPreview]);

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
  const allocationCapacityMatrix = useMemo(
    () => progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
      if (!matrix[row.color]) {
        matrix[row.color] = {};
      }
      matrix[row.color][row.size] = isCuttingProgressStage ? row.orderedQty : row.cuttingQty;
      return matrix;
    }, {}),
    [isCuttingProgressStage, progressStats.rows],
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
  const orderedTotal = useMemo(
    () => progressStats.rows.reduce((sum, row) => sum + row.orderedQty, 0),
    [progressStats.rows],
  );
  const cuttingCompletedTotalFromRows = useMemo(
    () => progressStats.rows.reduce((sum, row) => sum + row.cuttingQty, 0),
    [progressStats.rows],
  );
  const sewingAllocatedTotalFromRows = useMemo(
    () => progressStats.rows.reduce((sum, row) => sum + row.sewingQty, 0),
    [progressStats.rows],
  );
  const sewingCompletedTotalFromRows = useMemo(
    () => progressStats.rows.reduce((sum, row) => sum + row.sewingCompletedQty, 0),
    [progressStats.rows],
  );
  const allocationDisplayColors = useMemo(() => {
    if (allocationColors.length > 0) {
      return allocationColors;
    }
    const historyColors = allocationHistoryRows.flatMap((row) => row.items.map((item) => item.color));
    return sortColorValues(historyColors);
  }, [allocationColors, allocationHistoryRows]);
  const allocationDisplaySizes = useMemo(() => {
    if (allocationSizes.length > 0) {
      return allocationSizes;
    }
    const historySizes = allocationHistoryRows.flatMap((row) => row.items.map((item) => item.size));
    return sortSizeValues(historySizes);
  }, [allocationHistoryRows, allocationSizes]);
  const statsDisplayColors = useMemo(
    () => sortColorValues(progressStats.rows.map((row) => row.color)),
    [progressStats.rows],
  );
  const statsDisplaySizes = useMemo(
    () => sortSizeValues(progressStats.rows.map((row) => row.size)),
    [progressStats.rows],
  );
  const statsDoneMatrix = useMemo(
    () =>
      progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
        if (!matrix[row.color]) {
          matrix[row.color] = {};
        }
        const doneQty = progressActionModal.stage?.key === 'sewing' ? row.sewingCompletedQty : row.cuttingQty;
        matrix[row.color][row.size] = doneQty;
        return matrix;
      }, {}),
    [progressActionModal.stage?.key, progressStats.rows],
  );
  const statsSecondaryMatrix = useMemo(
    () =>
      progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
        if (!matrix[row.color]) {
          matrix[row.color] = {};
        }
        matrix[row.color][row.size] = isCuttingProgressStage ? row.orderedQty : row.sewingQty;
        return matrix;
      }, {}),
    [isCuttingProgressStage, progressStats.rows],
  );
  const statsCapacityMatrix = useMemo(
    () =>
      progressStats.rows.reduce<Record<string, Record<string, number>>>((matrix, row) => {
        if (!matrix[row.color]) {
          matrix[row.color] = {};
        }
        matrix[row.color][row.size] = isCuttingProgressStage ? row.orderedQty : row.cuttingQty;
        return matrix;
      }, {}),
    [isCuttingProgressStage, progressStats.rows],
  );
  const statsDoneRowTotals = useMemo(
    () =>
      statsDisplayColors.reduce<Record<string, number>>((acc, color) => {
        acc[color] = statsDisplaySizes.reduce((sum, size) => sum + (statsDoneMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsDoneMatrix],
  );
  const statsCapacityRowTotals = useMemo(
    () =>
      statsDisplayColors.reduce<Record<string, number>>((acc, color) => {
        acc[color] = statsDisplaySizes.reduce((sum, size) => sum + (statsCapacityMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsCapacityMatrix, statsDisplayColors, statsDisplaySizes],
  );
  const statsDoneColumnTotals = useMemo(
    () =>
      statsDisplaySizes.reduce<Record<string, number>>((acc, size) => {
        acc[size] = statsDisplayColors.reduce((sum, color) => sum + (statsDoneMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsDoneMatrix],
  );
  const statsCapacityColumnTotals = useMemo(
    () =>
      statsDisplaySizes.reduce<Record<string, number>>((acc, size) => {
        acc[size] = statsDisplayColors.reduce((sum, color) => sum + (statsCapacityMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsCapacityMatrix, statsDisplayColors, statsDisplaySizes],
  );
  const statsDoneTotal = useMemo(
    () => Object.values(statsDoneColumnTotals).reduce((sum, value) => sum + value, 0),
    [statsDoneColumnTotals],
  );
  const statsSecondaryRowTotals = useMemo(
    () =>
      statsDisplayColors.reduce<Record<string, number>>((acc, color) => {
        acc[color] = statsDisplaySizes.reduce((sum, size) => sum + (statsSecondaryMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsSecondaryMatrix],
  );
  const statsSecondaryColumnTotals = useMemo(
    () =>
      statsDisplaySizes.reduce<Record<string, number>>((acc, size) => {
        acc[size] = statsDisplayColors.reduce((sum, color) => sum + (statsSecondaryMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [statsDisplayColors, statsDisplaySizes, statsSecondaryMatrix],
  );
  const statsSecondaryTotal = useMemo(
    () => Object.values(statsSecondaryColumnTotals).reduce((sum, value) => sum + value, 0),
    [statsSecondaryColumnTotals],
  );
  const allocationCapacityRowTotals = useMemo(
    () =>
      allocationDisplayColors.reduce<Record<string, number>>((acc, color) => {
        acc[color] = allocationDisplaySizes.reduce((sum, size) => sum + (allocationCapacityMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [allocationCapacityMatrix, allocationDisplayColors, allocationDisplaySizes],
  );
  const allocationCapacityColumnTotals = useMemo(
    () =>
      allocationDisplaySizes.reduce<Record<string, number>>((acc, size) => {
        acc[size] = allocationDisplayColors.reduce((sum, color) => sum + (allocationCapacityMatrix[color]?.[size] ?? 0), 0);
        return acc;
      }, {}),
    [allocationCapacityMatrix, allocationDisplayColors, allocationDisplaySizes],
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
  const cuttingCompletedTotal = progressNodeQuantities.cuttingCompletedQty ?? cuttingCompletedTotalFromRows;
  const sewingAllocatedTotal = progressNodeQuantities.sewingAllocatedQty ?? sewingAllocatedTotalFromRows;
  const sewingCompletedTotal = sewingCompletedTotalFromRows;
  const allocationCapacityTotal = isCuttingProgressStage ? orderedTotal : cuttingCompletedTotal;
  const allocationRemainingTotal = Math.max(allocationCapacityTotal - allocationHistoryTotal, 0);
  const progressPercentLabel = isCuttingProgressStage ? '裁床进度' : '车缝进度';
  const progressPercentValue = formatProgressPercent(
    isCuttingProgressStage ? cuttingCompletedTotal : sewingCompletedTotal,
    orderedTotal,
  );
  const statsPrimaryLabel = isCuttingProgressStage ? '已裁' : '已完成';
  const statsSecondaryLabel = isCuttingProgressStage ? undefined : '已领取';
  const statsCapacityLabel = isCuttingProgressStage ? '下单量' : '裁床已完成';
  const renderCardView = () => (
    <FactoryOrderCardList
      loading={loadingCards}
      orders={cardOrders}
      total={cardTotal}
      page={cardPage}
      pageSize={cardPageSize}
      appliedKeyword={appliedKeyword}
      selectedOrderIds={selectedOrderIds}
      onToggleOrder={handleToggleOrder}
      onPageChange={(page, size) => {
        setCardPage(page);
        if (size) {
          setCardPageSize(size);
        }
      }}
      onOpenCostDetail={(record) => void handleOpenCostDetail(record)}
      onCopyOrder={(record) => void handleCopyOrder(record)}
      onEditOrder={(record) => void handleEditOrder(record)}
      onDeleteOrder={handleDeleteOrder}
      onOpenPrintPreview={handleOpenPrintPreview}
      onOpenProgressAction={handleOpenProgressAction}
    />
  );

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
      <section className="factory-orders-hero">
        <div className="factory-orders-hero-copy">
          <div className="factory-orders-hero-eyebrow">Factory order cockpit</div>
          <div className="factory-orders-hero-title">工厂订单总览</div>
          <div className="factory-orders-hero-subtitle">
            聚合查看订单节奏、物料准备与交付压力，优先处理即将交期和仍在推进中的工单。
          </div>
        </div>
        <Row gutter={[16, 16]} className="factory-orders-hero-metrics">
          {(loadingSummary && metrics.length === 0 ? Array.from({ length: 4 }).map((_, index) => ({
            key: `loading-${index}`,
            label: '加载中',
            primaryValue: '...',
          })) : metrics).map((metric: FactoryOrderMetric | { key: string; label: string; primaryValue: string }) => (
            <Col key={metric.key} xs={12} sm={12} md={8} lg={6}>
              <div className={`factory-orders-metric-card${'tone' in metric && metric.tone === 'warning' ? ' warning' : ''}`}>
                <div className="factory-orders-metric-title">{metric.label}</div>
                <div className="factory-orders-metric-primary">{metric.primaryValue}</div>
                {'secondaryValue' in metric && metric.secondaryValue ? (
                  <div className="factory-orders-metric-secondary">{metric.secondaryValue}</div>
                ) : (
                  <div className="factory-orders-metric-secondary">实时汇总当前列表关键指标</div>
                )}
              </div>
            </Col>
          ))}
        </Row>
      </section>

      <Card className="factory-orders-panel">
        <div className="factory-orders-panel-header">
          <div>
            <div className="factory-orders-panel-title">订单列表</div>
            <div className="factory-orders-panel-subtitle">支持按完成状态、交期与更新时间筛选，适合运营和跟单协同查看。</div>
          </div>
        </div>
        <div className="factory-orders-toolbar">
          <Space size={12} wrap>
            <SearchField
              allowClear
              placeholder="搜索订单号、款号、款名、跟单员"
              enterButton
              value={searchValue}
              onSearch={handleSearch}
              onChange={handleSearchChange}
              style={{ width: 360 }}
              testId="factory-orders-search-input"
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

        <div className="factory-orders-selection-row">
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

        <div className="factory-orders-content">
          {viewMode === 'card' ? renderCardView() : renderTableView()}
        </div>
      </Card>

      <CreateOrderModal
        open={createModalOpen}
        title={editingOrderId ? `编辑工厂订单${editingOrderCode ? ` - ${editingOrderCode}` : ''}` : '新建工厂订单'}
        okText={editingOrderId ? '保存' : '创建'}
        isEditing={Boolean(editingOrderId)}
        confirmLoading={createSubmitting}
        onCancel={handleCloseCreate}
        onOk={handleSubmitCreate}
        form={createForm}
        createOptionsLoading={createOptionsLoading}
        styleOptions={styleOptions}
        factoryOptions={factoryOptions}
        merchandiserOptions={merchandiserOptions}
        selectedStyleOption={selectedStyleOption}
        createStyleMaterials={createStyleMaterials}
        createColors={createColors}
        createSizes={createSizes}
        createColorOptions={createColorOptions}
        createSizeOptions={createSizeOptions}
        createMatrix={createMatrix}
        createRowTotals={createRowTotals}
        createColumnTotals={createColumnTotals}
        createGrandTotal={createGrandTotal}
        onCreateColorsChange={handleCreateColorsChange}
        onCreateSizesChange={handleCreateSizesChange}
        onCreateMatrixQtyChange={handleCreateMatrixQtyChange}
      />

      <ImportOrdersModal
        state={importModal}
        onCancel={handleCloseImport}
        onOk={handleConfirmImport}
        onBeforeUpload={handleImportBeforeUpload}
        onRemove={() => setImportModal((prev) => ({ ...prev, fileList: [], records: [] }))}
      />

      <ProgressActionModal
        state={progressActionModal}
        form={progressActionForm}
        tabKey={progressTabKey}
        inOutTabKey={inOutTabKey}
        inOutData={inOutData}
        stats={progressStats}
        width={progressModalWidth}
        isWideProgressStage={isWideProgressStage}
        isInOutProgressStage={isInOutProgressStage}
        isInOutStageCompleted={inOutStageCompleted}
        isCuttingProgressStage={isCuttingProgressStage}
        isSewingProgressStage={isSewingProgressStage}
        orderedTotal={orderedTotal}
        cuttingCompletedTotal={cuttingCompletedTotal}
        sewingAllocatedTotal={sewingAllocatedTotal}
        sewingCompletedTotal={sewingCompletedTotal}
        allocationRemainingTotal={allocationRemainingTotal}
        allocationCapacityTotal={allocationCapacityTotal}
        progressPercentLabel={progressPercentLabel}
        progressPercentValue={progressPercentValue}
        statsPrimaryLabel={statsPrimaryLabel}
        statsSecondaryLabel={statsSecondaryLabel}
        statsCapacityLabel={statsCapacityLabel}
        statsDisplayColors={statsDisplayColors}
        statsDisplaySizes={statsDisplaySizes}
        statsDoneMatrix={statsDoneMatrix}
        statsSecondaryMatrix={statsSecondaryMatrix}
        statsCapacityMatrix={statsCapacityMatrix}
        statsDoneRowTotals={statsDoneRowTotals}
        statsSecondaryRowTotals={statsSecondaryRowTotals}
        statsCapacityRowTotals={statsCapacityRowTotals}
        statsDoneColumnTotals={statsDoneColumnTotals}
        statsSecondaryColumnTotals={statsSecondaryColumnTotals}
        statsCapacityColumnTotals={statsCapacityColumnTotals}
        statsDoneTotal={statsDoneTotal}
        statsSecondaryTotal={statsSecondaryTotal}
        allocationHistoryRows={allocationHistoryRows}
        allocationDisplayColors={allocationDisplayColors}
        allocationDisplaySizes={allocationDisplaySizes}
        allocationCapacityMatrix={allocationCapacityMatrix}
        allocationCapacityRowTotals={allocationCapacityRowTotals}
        allocationCapacityColumnTotals={allocationCapacityColumnTotals}
        factoryOptions={factoryOptions}
        outsourceStatusByOrderId={outsourceStatusByOrderId}
        cuttingSheetTarget={cuttingSheetTarget}
        inOutPendingLabel={inOutPendingLabel}
        inOutDoneLabel={inOutDoneLabel}
        inOutDetailLabel={inOutDetailLabel}
        onCancel={handleCloseProgressActionModal}
        onSubmit={handleSubmitProgressAction}
        onTabChange={setProgressTabKey}
        onInOutTabChange={setInOutTabKey}
        onOpenAllocationCreate={handleOpenAllocationCreate}
        onNavigateToCurrentCuttingSheet={handleNavigateToCurrentCuttingSheet}
        onNavigateToCuttingSheet={handleNavigateToCuttingSheet}
        onNavigateToOutsourceOrder={handleNavigateToOutsourceOrder}
      />

      <AllocationCreateModal
        open={allocationCreateModalOpen}
        isCuttingProgressStage={isCuttingProgressStage}
        submitting={allocationCreateSubmitting}
        form={allocationCreateForm}
        factoryOptions={factoryOptions}
        allocationHistoryTotal={allocationHistoryTotal}
        allocationCapacityTotal={allocationCapacityTotal}
        orderedTotal={orderedTotal}
        cuttingCompletedTotal={cuttingCompletedTotal}
        allocationGrandTotal={allocationGrandTotal}
        allocationColors={allocationColors}
        allocationSizes={allocationSizes}
        allocationCapacityMatrix={allocationCapacityMatrix}
        allocationHistoryMatrix={allocationHistoryMatrix}
        allocationMatrix={allocationMatrix}
        allocationRowTotals={allocationRowTotals}
        allocationColumnTotals={allocationColumnTotals}
        onCancel={() => {
          setAllocationCreateModalOpen(false);
          setAllocationCreateSubmitting(false);
          allocationCreateForm.resetFields();
        }}
        onOk={handleSubmitAllocationCreate}
        onOpenFactoryGuide={handleOpenFactoryGuide}
        onLoadRemainingAllocation={handleLoadRemainingAllocation}
        onAllocationMatrixQtyChange={handleAllocationMatrixQtyChange}
      />

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

      <CostDetailModal
        record={costDetailRecord}
        data={costDetailData}
        loading={costDetailLoading}
        onCancel={() => {
          setCostDetailRecord(null);
          setCostDetailData(null);
          setCostDetailLoading(false);
        }}
      />

      <PrintPreviewModal
        record={printPreviewRecord}
        onCancel={() => setPrintPreviewRecord(null)}
        onPrint={handlePrintInBrowser}
      />
    </div>
  );
};

export default FactoryOrders;
