import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  Empty,
  Form,
  Modal,
  Pagination,
  Skeleton,
  Space,
  Typography,
  message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type {
  CuttingSheetDetail,
  CuttingSheetMaterialCalculation,
  CuttingSheetMaterialUsage,
  CuttingSheetUnconfiguredItem,
  CuttingTask,
  CuttingTaskDataset,
  CuttingTaskMetric,
} from '../types';
import { pieceworkService } from '../api/piecework';
import { settingsApi } from '../api/settings';
import { SearchField } from '../components/page';
import '../styles/cutting-pending.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CuttingSheetDetailModal from '../components/CuttingSheetDetailModal';
import CuttingTaskCard from '../components/CuttingTaskCard';
import ListImage from '../components/common/ListImage';
import CuttingBedRecordModal from '../components/CuttingBedRecordModal';
import {
  buildFriendlyErrorFromUnknown,
  extractValidationFieldErrors,
  wasGlobalErrorShown,
} from '../utils/http-error';

const { Text } = Typography;

const initialDataset: CuttingTaskDataset = {
  summary: [],
  list: [],
  total: 0,
  page: 1,
  pageSize: 6,
};

type ColorPreviewState = {
  open: boolean;
  task?: CuttingTask;
};

type DetailModalState = {
  open: boolean;
  task?: CuttingTask;
};

type BedUsageEditState = {
  open: boolean;
  submitting: boolean;
  calculating: boolean;
  mode: 'create' | 'edit';
  record?: NonNullable<CuttingSheetDetail['bedRecords']>[number];
};

type MaterialUsageFormValue = {
  calculationKey?: string;
  stockOptionKey?: string;
  actualQty?: number;
};

const buildSpecKey = (color: string, size: string) => `${color}::${size}`;
const buildBedItemsFromQtyMap = (qtyMap: Record<string, number | null>) => Object.entries(qtyMap)
  .map(([key, quantity]) => {
    const [color, size] = key.split('::');
    return { color, size, quantity: Math.max(0, Math.round(Number(quantity) || 0)) };
  })
  .filter((item) => item.quantity > 0);

const CuttingCompletedPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchKeyword = searchParams.get('keyword')?.trim() ?? '';
  const [dataset, setDataset] = useState<CuttingTaskDataset>(initialDataset);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState(initialSearchKeyword);
  const [appliedKeyword, setAppliedKeyword] = useState(initialSearchKeyword);
  const [page, setPage] = useState(initialDataset.page);
  const [pageSize, setPageSize] = useState(initialDataset.pageSize);
  const [previewState, setPreviewState] = useState<ColorPreviewState>({ open: false });
  const [detailState, setDetailState] = useState<DetailModalState>({ open: false });
  const [sheetDetail, setSheetDetail] = useState<CuttingSheetDetail | null>(null);
  const [deletingBedKey, setDeletingBedKey] = useState<string | null>(null);
  const [bedUsageEditState, setBedUsageEditState] = useState<BedUsageEditState>({
    open: false,
    submitting: false,
    calculating: false,
    mode: 'create',
  });
  const [bedRecordQtyMap, setBedRecordQtyMap] = useState<Record<string, number | null>>({});
  const [bedUsageCalculations, setBedUsageCalculations] = useState<CuttingSheetMaterialCalculation[]>([]);
  const [bedUsageUnconfiguredItems, setBedUsageUnconfiguredItems] = useState<CuttingSheetUnconfiguredItem[]>([]);
  const [cutterOptions, setCutterOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [cutterLoading, setCutterLoading] = useState(false);
  const [bedUsageForm] = Form.useForm();
  const bedMaterialCalculationRequestRef = useRef(0);

  const navigateToFactoryOrder = (orderCode?: string) => {
    const normalized = orderCode?.trim();
    if (!normalized) {
      return;
    }
    navigate(`/orders/factory?keyword=${encodeURIComponent(normalized)}&status=all`);
  };

  const loadCompletedTasks = useCallback(async (options?: { targetPage?: number }) => {
    const targetPage = options?.targetPage ?? page;
    setLoading(true);
    try {
      const response = await pieceworkService.getCuttingCompleted({
        page: targetPage,
        pageSize,
        keyword: appliedKeyword,
        includeSummary: targetPage === 1,
      });
      setDataset(response);
      if (response.page !== page) {
        setPage(response.page);
      }
      if (response.pageSize !== pageSize) {
        setPageSize(response.pageSize);
      }
      return response;
    } catch (error) {
      console.error('failed to load completed cutting tasks', error);
      message.error('获取已裁数据失败，请稍后重试');
      return null;
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page, pageSize]);

  const loadSheetDetail = useCallback(async (task: CuttingTask, options?: { silent?: boolean }) => {
    if (!task.workOrderId) {
      setSheetDetail(null);
      return null;
    }
    setDetailLoading(true);
    try {
      const detail = await pieceworkService.getCuttingSheetDetail(task.workOrderId);
      setSheetDetail(detail);
      return detail;
    } catch (error) {
      console.error('failed to load cutting sheet detail', error);
      setSheetDetail(null);
      if (!options?.silent) {
        message.error('获取裁床单详情失败');
      }
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const response = await loadCompletedTasks();
      if (cancelled || response == null) {
        return;
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [appliedKeyword, loadCompletedTasks, page, pageSize]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    setKeyword(trimmed);
    setAppliedKeyword(trimmed);
    setPage(1);
  };

  const handleOpenPreview = (task: CuttingTask) => {
    setPreviewState({ open: true, task });
  };

  const handleViewDetail = useCallback((task: CuttingTask) => {
    setDetailState({ open: true, task });
    void loadSheetDetail(task);
  }, [loadSheetDetail]);

  const handleDeleteBed = async (record: NonNullable<CuttingSheetDetail['bedRecords']>[number]) => {
    if (!detailState.task?.workOrderId) {
      message.warning('当前裁床单缺少工单信息，无法删除床次');
      return;
    }
    if (!record.bedId) {
      message.warning('该床次缺少床次标识，暂时无法删除');
      return;
    }
    const deleteKey = record.bedId;
    setDeletingBedKey(deleteKey);
    try {
      await pieceworkService.deleteCuttingSheetBed(detailState.task.workOrderId, {
        bedId: record.bedId,
      });
      message.success('床次已删除');
      const nextDetail = await loadSheetDetail(detailState.task, { silent: true });
      await loadCompletedTasks();
      if (nextDetail && nextDetail.status !== 'COMPLETED') {
        setDetailState({ open: false });
        setSheetDetail(null);
        message.info('裁床单已回退到待裁列表');
      }
    } catch (error) {
      console.error('failed to delete cutting bed', error);
      message.error(error instanceof Error ? error.message : '删除床次失败');
    } finally {
      setDeletingBedKey(null);
    }
  };

  const loadCutterOptions = async () => {
    setCutterLoading(true);
    try {
      const membersRes = await settingsApi.organization.list({ page: 1, pageSize: 200 });
      setCutterOptions((membersRes.list ?? [])
        .filter((member) => member.status !== 'inactive')
        .map((member) => ({
          label: member.name || member.username || `用户${member.id}`,
          value: Number(member.id),
        }))
        .filter((option) => Number.isFinite(option.value)));
    } catch (error) {
      console.error('failed to load cutting member options', error);
      message.error('加载裁剪人选项失败');
    } finally {
      setCutterLoading(false);
    }
  };

  const setCalculatedMaterialFormValues = useCallback((
    calculations: CuttingSheetMaterialCalculation[],
    existingUsages: CuttingSheetMaterialUsage[] = [],
    preserveCurrentValues = false,
  ) => {
    const currentValues = preserveCurrentValues
      ? (bedUsageForm.getFieldValue('materialUsages') ?? []) as MaterialUsageFormValue[]
      : [];
    const currentByCalculationKey = new Map(
      currentValues
        .filter((usage) => usage?.calculationKey)
        .map((usage) => [usage.calculationKey as string, usage]),
    );
    bedUsageForm.setFieldValue('materialUsages', calculations.map((material) => {
      const current = currentByCalculationKey.get(material.calculationKey);
      const existing = existingUsages.find((usage) => usage.calculationKey === material.calculationKey);
      const matchedOption = material.stockOptions.find((option) => (
        Number(option.warehouseId) === Number(existing?.warehouseId)
        && Number(option.materialMinimumSpecificationId ?? 0) === Number(existing?.materialMinimumSpecificationId ?? 0)
      ));
      const currentOption = material.stockOptions.find((option) => (
        `${option.warehouseId}::${Number(option.materialMinimumSpecificationId) || 0}` === current?.stockOptionKey
      ));
      const defaultOption = currentOption
        ?? (existing ? matchedOption : material.stockOptions.length === 1 ? material.stockOptions[0] : undefined);
      return {
        calculationKey: material.calculationKey,
        stockOptionKey: defaultOption
          ? `${defaultOption.warehouseId}::${Number(defaultOption.materialMinimumSpecificationId) || 0}`
          : undefined,
        actualQty: current?.actualQty ?? existing?.actualQty,
      };
    }));
  }, [bedUsageForm]);

  useEffect(() => {
    if (!bedUsageEditState.open || !detailState.task?.workOrderId) return undefined;
    const items = buildBedItemsFromQtyMap(bedRecordQtyMap);
    const requestId = bedMaterialCalculationRequestRef.current + 1;
    bedMaterialCalculationRequestRef.current = requestId;
    if (items.length === 0) {
      setBedUsageCalculations([]);
      setBedUsageUnconfiguredItems([]);
      bedUsageForm.setFieldValue('materialUsages', []);
      setBedUsageEditState((prev) => ({ ...prev, calculating: false }));
      return undefined;
    }
    setBedUsageEditState((prev) => ({ ...prev, calculating: true }));
    const timer = window.setTimeout(() => {
      void pieceworkService.calculateCuttingSheetBedMaterials(
        detailState.task!.workOrderId!,
        items,
      ).then((result) => {
        if (bedMaterialCalculationRequestRef.current !== requestId) return;
        setBedUsageCalculations(result.materials);
        setBedUsageUnconfiguredItems(result.unconfiguredItems);
        setCalculatedMaterialFormValues(
          result.materials,
          bedUsageEditState.record?.materialUsages ?? bedUsageEditState.record?.fabricUsages ?? [],
          true,
        );
      }).catch((error) => {
        if (bedMaterialCalculationRequestRef.current !== requestId) return;
        console.error('failed to calculate completed cutting bed materials', error);
        message.error(error instanceof Error ? error.message : '计算面辅料失败');
      }).finally(() => {
        if (bedMaterialCalculationRequestRef.current === requestId) {
          setBedUsageEditState((prev) => ({ ...prev, calculating: false }));
        }
      });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      if (bedMaterialCalculationRequestRef.current === requestId) {
        bedMaterialCalculationRequestRef.current += 1;
      }
    };
  }, [bedRecordQtyMap, bedUsageEditState.open, bedUsageEditState.record, bedUsageForm, detailState.task, setCalculatedMaterialFormValues]);

  const openBedUsageEditor = (
    record: NonNullable<CuttingSheetDetail['bedRecords']>[number],
  ) => {
    if (!detailState.task?.workOrderId || !record.bedId) return;
    if (!record.materialUsageEditable) {
      message.info('该床次为历史记录，不纳入本次用量调整范围');
      return;
    }
    setBedUsageEditState({ open: true, submitting: false, calculating: true, mode: 'edit', record });
    setBedUsageUnconfiguredItems([]);
    setBedRecordQtyMap(record.items.reduce<Record<string, number>>((acc, item) => {
      acc[buildSpecKey(item.color, item.size)] = Number(item.quantity) || 0;
      return acc;
    }, {}));
    bedUsageForm.setFieldsValue({
      bedNumber: record.bedNumber,
      cutterId: record.cutterId,
      cuttingPieceRate: Number(record.cuttingPieceRate ?? 0),
      shortCutReason: sheetDetail?.shortCutReason,
      materialUsages: [],
    });
    void loadCutterOptions();
  };

  const openCompletedBedRecord = () => {
    if (!detailState.task?.workOrderId || !sheetDetail) return;
    const initialQtyMap = sheetDetail.rows.reduce<Record<string, number | null>>((acc, row) => {
      row.cells.forEach((cell) => {
        acc[buildSpecKey(row.color, cell.size)] = null;
      });
      return acc;
    }, {});
    setBedRecordQtyMap(initialQtyMap);
    setBedUsageCalculations([]);
    setBedUsageUnconfiguredItems([]);
    setBedUsageEditState({ open: true, submitting: false, calculating: false, mode: 'create' });
    bedUsageForm.setFieldsValue({
      bedNumber: `BED-${detailState.task.workOrderId}-${(sheetDetail.bedRecords?.length ?? 0) + 1}`,
      cutterId: undefined,
      cuttingPieceRate: undefined,
      materialUsages: [],
    });
    void loadCutterOptions();
  };

  const submitBedUsageUpdate = async () => {
    if (!detailState.task?.workOrderId) return;
    try {
      const values = await bedUsageForm.validateFields();
      const items = buildBedItemsFromQtyMap(bedRecordQtyMap);
      if (items.length === 0) {
        message.warning('请至少填写一个颜色尺码的裁剪数量');
        return;
      }
      const formUsages = (values.materialUsages ?? []) as Array<{ stockOptionKey?: string; actualQty?: number }>;
      const materialUsages = bedUsageCalculations.map((material, index) => {
        const formUsage = formUsages[index] ?? {};
        const option = material.stockOptions.find((candidate) => (
          `${candidate.warehouseId}::${Number(candidate.materialMinimumSpecificationId) || 0}` === formUsage.stockOptionKey
        ));
        return {
          calculationKey: material.calculationKey,
          materialType: material.materialType,
          applicableColors: material.applicableColors,
          warehouseId: option?.warehouseId,
          materialId: material.materialId,
          materialMinimumSpecificationId: option?.materialMinimumSpecificationId
            ?? material.materialMinimumSpecificationId,
          materialUnit: material.materialUnit,
          plannedQty: material.plannedQty,
          actualQty: Number(formUsage.actualQty),
        };
      });
      setBedUsageEditState((prev) => ({ ...prev, submitting: true }));
      if (bedUsageEditState.mode === 'edit' && bedUsageEditState.record?.bedId) {
        await pieceworkService.updateCuttingSheetBed(detailState.task.workOrderId, {
          bedId: bedUsageEditState.record.bedId,
          bedNumber: values.bedNumber,
          cutterId: values.cutterId,
          shortCutReason: values.shortCutReason?.trim(),
          cuttingPieceRate: Number(values.cuttingPieceRate),
          materialUsages,
          items,
        });
        message.success('床次数据、库存、费用和进度已同步调整');
      } else {
        await pieceworkService.recordCuttingSheetBed(detailState.task.workOrderId, {
          bedNumber: values.bedNumber,
          cutterId: values.cutterId,
          cuttingPieceRate: Number(values.cuttingPieceRate),
          materialUsages,
          fabricUsages: materialUsages,
          items,
        });
        message.success('床次已补录，库存、费用和进度已同步更新');
      }
      setBedUsageEditState({ open: false, submitting: false, calculating: false, mode: 'create' });
      bedUsageForm.resetFields();
      setBedRecordQtyMap({});
      setBedUsageCalculations([]);
      await loadSheetDetail(detailState.task, { silent: true });
      await loadCompletedTasks();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      const validationErrors = extractValidationFieldErrors(error);
      const formErrors = Object.entries(validationErrors)
        .filter(([field]) => ['bedNumber', 'cuttingPieceRate'].includes(field));
      if (formErrors.length > 0) {
        bedUsageForm.setFields(formErrors.map(([name, fieldError]) => ({ name, errors: [fieldError] })));
        message.warning(formErrors[0][1]);
        return;
      }
      console.error('failed to save completed cutting bed', error);
      if (!wasGlobalErrorShown(error)) {
        const friendlyError = buildFriendlyErrorFromUnknown(error);
        message.error(friendlyError.description ?? friendlyError.title);
      }
    } finally {
      setBedUsageEditState((prev) => ({ ...prev, submitting: false }));
    }
  };

  useEffect(() => {
    const nextKeyword = searchParams.get('keyword')?.trim() ?? '';
    setKeyword((current) => (current === nextKeyword ? current : nextKeyword));
    setAppliedKeyword((current) => (current === nextKeyword ? current : nextKeyword));
    setPage((current) => (current === 1 ? current : 1));
  }, [searchParams]);

  useEffect(() => {
    const rawWorkOrderId = Number(searchParams.get('workOrderId') ?? 0);
    const openDetail = searchParams.get('openDetail') === '1';
    if (!openDetail || !Number.isFinite(rawWorkOrderId) || rawWorkOrderId <= 0 || loading) {
      return;
    }
    const targetTask = dataset.list.find((task) => Number(task.workOrderId) === rawWorkOrderId);
    if (!targetTask) {
      return;
    }
    if (detailState.task?.workOrderId === rawWorkOrderId && detailState.open) {
      const next = new URLSearchParams(searchParams);
      next.delete('workOrderId');
      next.delete('openDetail');
      setSearchParams(next, { replace: true });
      return;
    }
    handleViewDetail(targetTask);
    const next = new URLSearchParams(searchParams);
    next.delete('workOrderId');
    next.delete('openDetail');
    setSearchParams(next, { replace: true });
  }, [dataset.list, detailState.open, detailState.task?.workOrderId, handleViewDetail, loading, searchParams, setSearchParams]);

  const renderMetric = (metric: CuttingTaskMetric) => (
    <Card
      key={metric.key}
      className={`cutting-metric-card${metric.tone === 'warning' ? ' warning' : ''}`}
    >
      <div className="cutting-metric-label">{metric.label}</div>
      <div className="cutting-metric-value">{metric.value}</div>
      {metric.description ? (
        <div className="cutting-metric-desc">{metric.description}</div>
      ) : null}
    </Card>
  );

  return (
    <div className="cutting-pending-page">
      <section className="cutting-summary-section">
        <Space size={16} wrap>
          {dataset.summary.length > 0 ? dataset.summary.map(renderMetric) : null}
        </Space>
      </section>

      <section className="cutting-toolbar">
        <SearchField
          allowClear
          placeholder="请输入订单号/款名/款号"
          value={keyword}
          onChange={setKeyword}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          style={{ maxWidth: 420, flex: 1 }}
        />
      </section>

      {loading ? (
        <div className="cutting-task-list">
          {Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton key={index} active paragraph={{ rows: 4 }} />
          ))}
        </div>
      ) : dataset.list.length === 0 ? (
        <Empty description={appliedKeyword ? '未找到匹配的已裁任务' : '暂无已裁任务'} />
      ) : (
        <div className="cutting-task-list">
          {dataset.list.map((task) => (
            <CuttingTaskCard
              key={task.workOrderId ?? task.id}
              task={task}
              onViewDetail={handleViewDetail}
              onPreview={handleOpenPreview}
              onNavigateToFactoryOrder={navigateToFactoryOrder}
              detailButtonType="link"
              colorButtonType="link"
              pendingLabel="剩余数量"
            />
          ))}
        </div>
      )}

      {dataset.total > 0 ? (
        <div className="cutting-pagination-wrap">
          <Pagination
            current={page}
            pageSize={pageSize}
            total={dataset.total}
            showSizeChanger
            showQuickJumper
            pageSizeOptions={[6, 10, 20]}
            showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            }}
          />
        </div>
      ) : null}

      <Modal
        title={previewState.task ? `${previewState.task.styleName} 颜色图` : '颜色图'}
        open={previewState.open}
        footer={null}
        onCancel={() => setPreviewState({ open: false })}
        width={760}
      >
        {previewState.task ? (
          <div className="cutting-color-grid">
            {previewState.task.colors.map((color) => (
              <div className="cutting-color-item" key={`${previewState.task?.id}-${color.name}`}>
                <ListImage
                  src={color.image}
                  alt={color.name}
                  width="100%"
                  height={180}
                  borderRadius={8}
                  objectFit="contain"
                  background="#fff"
                />
                <Text>{color.name}</Text>
                {color.fabric ? (
                  <Text type="secondary" style={{ display: 'block' }}>{color.fabric}</Text>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </Modal>

      <CuttingSheetDetailModal
        open={detailState.open}
        loading={detailLoading}
        task={detailState.task}
        detail={sheetDetail}
        zIndex={bedUsageEditState.open ? 1000 : undefined}
        onClose={() => {
          setDetailState({ open: false });
          setSheetDetail(null);
          setDeletingBedKey(null);
        }}
        onNavigateToFactoryOrder={navigateToFactoryOrder}
        onNavigate={navigate}
        onUpdateStartedAt={detailState.task?.workOrderId && sheetDetail?.startedAt
          ? async (startedAt) => {
              try {
                await pieceworkService.updateCuttingSheetStartTime(detailState.task!.workOrderId!, startedAt);
                message.success('裁剪开始时间已修改');
                await loadSheetDetail(detailState.task!, { silent: true });
                await loadCompletedTasks();
              } catch (error) {
                console.error('failed to update completed cutting start time', error);
                message.error(error instanceof Error ? error.message : '修改裁剪开始时间失败');
                throw error;
              }
            }
          : undefined}
        onDeleteBed={handleDeleteBed}
        onEditBedMaterialUsage={openBedUsageEditor}
        onRecordBed={openCompletedBedRecord}
        deletingBedKey={deletingBedKey}
      />

      <CuttingBedRecordModal
        open={bedUsageEditState.open}
        mode={bedUsageEditState.mode}
        task={detailState.task}
        detail={sheetDetail}
        qtyMap={bedRecordQtyMap}
        form={bedUsageForm}
        submitting={bedUsageEditState.submitting}
        calculating={bedUsageEditState.calculating}
        calculations={bedUsageCalculations}
        unconfiguredItems={bedUsageUnconfiguredItems}
        existingUsages={bedUsageEditState.record?.materialUsages ?? bedUsageEditState.record?.fabricUsages}
        cutterOptions={cutterOptions}
        cutterLoading={cutterLoading}
        zIndex={1100}
        onQtyChange={(key, value) => setBedRecordQtyMap((prev) => ({ ...prev, [key]: value }))}
        onFillPendingQty={() => {
          if (!sheetDetail) return;
          setBedRecordQtyMap(sheetDetail.rows.reduce<Record<string, number>>((acc, row) => {
            row.cells.forEach((cell) => {
              acc[buildSpecKey(row.color, cell.size)] = Math.max(0, Number(cell.pendingQty) || 0);
            });
            return acc;
          }, {}));
        }}
        onCancel={() => {
          bedUsageForm.resetFields();
          setBedRecordQtyMap({});
          setBedUsageCalculations([]);
          setBedUsageUnconfiguredItems([]);
          setBedUsageEditState({ open: false, submitting: false, calculating: false, mode: 'create' });
        }}
        onSubmit={() => void submitBedUsageUpdate()}
      />
    </div>
  );
};

export default CuttingCompletedPage;
