import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefSelectProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { partnersApi } from '../../api/partners';
import warehouseApi from '../../api/warehouse';
import { stockingPurchaseInboundService } from '../../api/procurement';
import { materialApi } from '../../api/material';
import type { MaterialStockType } from '../../types/material-stock';
import type {
  ProcurementOrderSummary,
  StockingPurchaseCreatePayload,
  StockingPurchaseOrderDetail,
} from '../../types/stocking-purchase-inbound';
import type { Partner, SavePartnerPayload } from '../../types/partners';
import type { Warehouse } from '../../types/warehouse';
import type { MaterialItem } from '../../types/material';
import { SelectSetupHint } from '../common/SelectSetupHint';
import ListImage from '../common/ListImage';
import { renderSelectDropdownWithSetup, type SelectSetupConfig } from '../../utils/select-setup-hint';
import '../../styles/matrix-table.css';

const { Text } = Typography;

type SelectedMaterialRow = {
  rowId: string;
  material?: MaterialItem;
};

type BulkApplyRow = {
  rowId: '__bulk_apply__';
  kind: 'bulk';
};

type MaterialTableRow =
  | (SelectedMaterialRow & { kind: 'item' })
  | BulkApplyRow;

export type StockingPurchaseCreateModalProps = {
  open: boolean;
  materialType: MaterialStockType;
  mode?: 'create' | 'edit';
  initialDraft?: {
    materialCode?: string;
    materialName?: string;
    quantity?: number;
    supplierName?: string;
    remark?: string;
    items?: Array<{
      materialCode?: string;
      materialName?: string;
      quantity?: number;
      supplierName?: string;
    }>;
  };
  initialOrder?: StockingPurchaseOrderDetail;
  onClose: () => void;
  onCreated?: (summary: ProcurementOrderSummary) => void;
  onUpdated?: (detail: StockingPurchaseOrderDetail) => void;
};

const DEFAULT_PAGE_SIZE = 10;
const MODAL_VIEWPORT_GUTTER = 32;
const DEFAULT_SUPPLIER_FORM_VALUES: SavePartnerPayload = {
  name: '',
  type: 'supplier',
  contact: undefined,
  phone: undefined,
  address: undefined,
  remarks: undefined,
};

const buildSelectedMaterialRow = (material: MaterialItem): SelectedMaterialRow => ({
  rowId: `${material.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  material,
});

const buildEmptyMaterialRow = (): SelectedMaterialRow => ({
  rowId: `empty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

const hasUnitPriceValue = (unitPrices: Record<string, number | null>, rowId: string) =>
  Object.prototype.hasOwnProperty.call(unitPrices, rowId);

const getDefaultUnitPrice = (referencePrice?: number) => referencePrice ?? null;

const getDisplayedUnitPrice = (
  unitPrices: Record<string, number | null>,
  rowId: string,
  referencePrice?: number,
) => (hasUnitPriceValue(unitPrices, rowId) ? unitPrices[rowId] : getDefaultUnitPrice(referencePrice));

const getSubmitUnitPrice = (
  unitPrices: Record<string, number | null>,
  rowId: string,
  referencePrice?: number,
) => {
  if (!hasUnitPriceValue(unitPrices, rowId)) {
    return referencePrice;
  }
  const value = unitPrices[rowId];
  return value == null ? undefined : value;
};

const formatMaterialOptionLabel = (material: MaterialItem) => {
  const parts = [material.name, material.sku].filter(Boolean);
  return parts.join(' / ');
};

const StockingPurchaseCreateModal = ({
  open,
  materialType,
  mode = 'create',
  initialDraft,
  initialOrder,
  onClose,
  onCreated,
  onUpdated,
}: StockingPurchaseCreateModalProps) => {
  const [form] = Form.useForm<{ supplierId: string; warehouseId: string; orderDate: dayjs.Dayjs; expectedArrival?: dayjs.Dayjs; remark?: string }>();
  const [supplierForm] = Form.useForm<SavePartnerPayload>();
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialRow[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [unitPrices, setUnitPrices] = useState<Record<string, number | null>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string | undefined>>({});
  const [selectedSpecifications, setSelectedSpecifications] = useState<Record<string, string | undefined>>({});
  const [lineRemarks, setLineRemarks] = useState<Record<string, string | undefined>>({});
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [supplierSearchText, setSupplierSearchText] = useState('');
  const [materialOptions, setMaterialOptions] = useState<MaterialItem[]>([]);
  const [materialOptionsLoading, setMaterialOptionsLoading] = useState(false);
  const [bulkQuantityValue, setBulkQuantityValue] = useState<number | null>(null);
  const [bulkUnitPriceValue, setBulkUnitPriceValue] = useState<number | null>(null);
  const [modalWidth, setModalWidth] = useState<number | string>('calc(100vw - 32px)');
  const materialSelectRefs = useRef<Record<string, RefSelectProps | null>>({});
  const pendingFocusRowId = useRef<string | null>(null);
  const isEditMode = mode === 'edit';
  const isRemarkOnly = initialOrder?.editableScope === 'remark_only';
  const lockNonRemarkFields = isEditMode && isRemarkOnly;

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return;
    }
    const updateModalWidth = () => {
      setModalWidth(Math.max(window.innerWidth - MODAL_VIEWPORT_GUTTER, 0));
    };
    updateModalWidth();
    window.addEventListener('resize', updateModalWidth);
    return () => {
      window.removeEventListener('resize', updateModalWidth);
    };
  }, [open]);

  const loadSuppliers = useCallback(async () => {
    const supplierResult = await partnersApi.list({ page: 1, pageSize: 50, type: 'supplier' });
    setSuppliers(supplierResult.list);
    return supplierResult.list;
  }, []);
  const warehouseSetup: SelectSetupConfig = {
    entityLabel: '仓库',
    pageLabel: '仓库',
    buttonText: '去新建仓库',
    path: '/basic/warehouse',
  };
  const materialSetup: SelectSetupConfig = {
    entityLabel: '物料',
    pageLabel: '物料档案',
    buttonText: '去新建物料',
    path: '/basic/material',
  };

  const resetState = useCallback(() => {
    setSelectedMaterials([]);
    setQuantities({});
    setUnitPrices({});
    setSelectedColors({});
    setSelectedSpecifications({});
    setLineRemarks({});
    setMaterialOptions([]);
    setMaterialOptionsLoading(false);
    setBulkQuantityValue(null);
    setBulkUnitPriceValue(null);
    setSupplierModalOpen(false);
    setSupplierSubmitting(false);
    setSupplierSearchText('');
    supplierForm.resetFields();
  }, [supplierForm]);

  const ensureInitialEmptyRow = useCallback(() => {
    const row = buildEmptyMaterialRow();
    pendingFocusRowId.current = row.rowId;
    setSelectedMaterials([row]);
    setQuantities({ [row.rowId]: 0 });
    setUnitPrices({ [row.rowId]: null });
    setSelectedColors({});
    setSelectedSpecifications({});
    setLineRemarks({});
  }, []);

  const loadMaterialOptions = useCallback(async (keyword?: string) => {
    setMaterialOptionsLoading(true);
    try {
      const response = await materialApi.list({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        materialType,
        keyword: keyword?.trim() ? keyword.trim() : undefined,
      });
      setMaterialOptions(response.list);
    } catch (error) {
      console.error('failed to load materials', error);
      message.error('加载物料档案失败');
    } finally {
      setMaterialOptionsLoading(false);
    }
  }, [materialType]);

  useEffect(() => {
    if (!open) {
      return;
    }
    resetState();
    form.setFieldsValue({ orderDate: dayjs(), expectedArrival: undefined, remark: undefined });
    if (!initialOrder && !initialDraft?.items?.length && !initialDraft?.materialCode && !initialDraft?.materialName) {
      ensureInitialEmptyRow();
    }
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const [supplierResult, warehouseResult] = await Promise.all([
          loadSuppliers(),
          warehouseApi.list({ page: 1, pageSize: 50, type: 'material', status: 'active' }),
        ]);
        const nextSuppliers = [...supplierResult];
        if (
          initialOrder?.supplierId
          && initialOrder.supplierName
          && !nextSuppliers.some((item) => item.id === initialOrder.supplierId)
        ) {
          nextSuppliers.unshift({
            id: initialOrder.supplierId,
            name: initialOrder.supplierName,
            type: 'supplier',
            status: 'bound',
            tags: [],
            disabled: false,
            updatedAt: '',
            createdAt: '',
          });
        }
        setSuppliers(nextSuppliers);
        const nextWarehouses = [...warehouseResult.list];
        if (
          initialOrder?.warehouseId
          && initialOrder.warehouseName
          && !nextWarehouses.some((item) => item.id === initialOrder.warehouseId)
        ) {
          nextWarehouses.unshift({
            id: initialOrder.warehouseId,
            name: initialOrder.warehouseName,
            type: 'material',
            status: 'active',
          });
        }
        setWarehouses(nextWarehouses);
        if (nextWarehouses.length) {
          form.setFieldValue('warehouseId', nextWarehouses[0].id);
        }
        if (initialOrder) {
          form.setFieldsValue({
            supplierId: initialOrder.supplierId,
            warehouseId: initialOrder.warehouseId,
            orderDate: initialOrder.orderDate ? dayjs(initialOrder.orderDate) : dayjs(),
            expectedArrival: initialOrder.expectedArrival ? dayjs(initialOrder.expectedArrival) : undefined,
            remark: initialOrder.remark,
          });
        } else {
          if (initialDraft?.supplierName) {
            const matchedSupplier = supplierResult.find((item) => item.name === initialDraft.supplierName);
            if (matchedSupplier) {
              form.setFieldValue('supplierId', matchedSupplier.id);
            }
          }
          if (initialDraft?.remark) {
            form.setFieldValue('remark', initialDraft.remark);
          }
        }
      } catch (error) {
        console.error('failed to load suppliers/warehouses', error);
        message.error('加载供应商或仓库失败');
      } finally {
        setMetaLoading(false);
      }
    };
    void loadMeta();
  }, [
    ensureInitialEmptyRow,
    form,
    initialDraft?.items,
    initialDraft?.materialCode,
    initialDraft?.materialName,
    initialDraft?.remark,
    initialDraft?.supplierName,
    initialOrder,
    loadSuppliers,
    open,
    resetState,
  ]);

  useEffect(() => {
    if (!open || !initialOrder?.lines?.length) {
      return;
    }
    const loadOrderLines = async () => {
      try {
        const matchedMaterials: SelectedMaterialRow[] = [];
        const nextQuantities: Record<string, number> = {};
        const nextColors: Record<string, string | undefined> = {};
        const nextSpecifications: Record<string, string | undefined> = {};
        const nextLineRemarks: Record<string, string | undefined> = {};
        const nextUnitPrices: Record<string, number | null> = {};
        for (const line of initialOrder.lines) {
          const materialKeyword = line.materialCode || line.materialName;
          if (!materialKeyword) continue;
          const response = await materialApi.list({ page: 1, pageSize: DEFAULT_PAGE_SIZE, materialType, keyword: materialKeyword });
          const matchedMaterial = response.list.find((item) => item.id === line.materialId) ?? response.list.find((item) => item.sku === line.materialCode) ?? response.list.find((item) => item.name === line.materialName) ?? response.list[0];
          if (!matchedMaterial) continue;
          const row = buildSelectedMaterialRow(matchedMaterial);
          matchedMaterials.push(row);
          nextQuantities[row.rowId] = Number(line.quantity ?? 0);
          nextColors[row.rowId] = line.color;
          nextSpecifications[row.rowId] = line.specification;
          nextLineRemarks[row.rowId] = line.remark;
          nextUnitPrices[row.rowId] = line.unitPrice == null
            ? getDefaultUnitPrice(matchedMaterial.referencePrice)
            : Number(line.unitPrice);
        }
        if (!matchedMaterials.length) return;
        setSelectedMaterials(matchedMaterials);
        setQuantities(nextQuantities);
        setSelectedColors(nextColors);
        setSelectedSpecifications(nextSpecifications);
        setLineRemarks(nextLineRemarks);
        setUnitPrices(nextUnitPrices);
      } catch (error) {
        console.error('failed to load initial order lines', error);
        message.warning('编辑单据时未能自动回填物料，请手动检查');
      }
    };
    void loadOrderLines();
  }, [initialOrder, materialType, open]);

  useEffect(() => {
    const draft = initialDraft;
    const draftItems = (draft?.items && draft.items.length > 0)
      ? draft.items
      : [{
          materialCode: draft?.materialCode,
          materialName: draft?.materialName,
          quantity: draft?.quantity,
          supplierName: draft?.supplierName,
        }];
    if (!open || !draftItems.some((item) => item.materialCode || item.materialName)) {
      return;
    }
    const loadInitialMaterial = async () => {
      try {
        const matchedMaterials: SelectedMaterialRow[] = [];
        const nextQuantities: Record<string, number> = {};
        const nextColors: Record<string, string | undefined> = {};
        const nextSpecifications: Record<string, string | undefined> = {};
        for (const draftItem of draftItems) {
          const materialKeyword =
            draftItem.materialCode && draftItem.materialCode !== '--'
              ? draftItem.materialCode
              : draftItem.materialName;
          if (!materialKeyword) {
            continue;
          }
          const response = await materialApi.list({
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            materialType,
            keyword: materialKeyword,
          });
          const matchedMaterial =
            response.list.find((item) => item.sku === draftItem.materialCode)
            ?? response.list.find((item) => item.name === draftItem.materialName)
            ?? response.list[0];
          if (!matchedMaterial) {
            continue;
          }
          const row = buildSelectedMaterialRow(matchedMaterial);
          matchedMaterials.push(row);
          nextQuantities[row.rowId] = Math.max(0, Number(draftItem.quantity ?? 0));
          nextColors[row.rowId] = matchedMaterial.colors?.length === 1 ? matchedMaterial.colors[0] : undefined;
          nextSpecifications[row.rowId] = matchedMaterial.specifications?.length === 1 ? matchedMaterial.specifications[0] : undefined;
        }
        if (!matchedMaterials.length) {
          ensureInitialEmptyRow();
          return;
        }
        setSelectedMaterials(matchedMaterials);
        setQuantities(nextQuantities);
        setSelectedColors(nextColors);
        setSelectedSpecifications(nextSpecifications);
      } catch (error) {
        console.error('failed to load initial material draft', error);
        message.warning('已打开采购创建弹窗，但未能自动匹配物料，请手动选择');
      }
    };
    void loadInitialMaterial();
  }, [ensureInitialEmptyRow, initialDraft, materialType, open]);

  const handleQuantityChange = useCallback((recordId: string, value: number | null) => {
    setQuantities((prev) => ({ ...prev, [recordId]: value ?? 0 }));
  }, []);

  const handleUnitPriceChange = useCallback((recordId: string, value: number | null) => {
    setUnitPrices((prev) => ({ ...prev, [recordId]: value }));
  }, []);

  const handleColorChange = useCallback((recordId: string, value?: string) => {
    setSelectedColors((prev) => ({ ...prev, [recordId]: value }));
  }, []);

  const handleSpecificationChange = useCallback((recordId: string, value?: string) => {
    setSelectedSpecifications((prev) => ({ ...prev, [recordId]: value }));
  }, []);

  const handleLineRemarkChange = useCallback((recordId: string, value?: string) => {
    setLineRemarks((prev) => ({ ...prev, [recordId]: value }));
  }, []);

  const handleDuplicateMaterial = useCallback((record: SelectedMaterialRow) => {
    const duplicatedRow = record.material ? buildSelectedMaterialRow(record.material) : buildEmptyMaterialRow();
    pendingFocusRowId.current = duplicatedRow.rowId;
    setSelectedMaterials((prev) => {
      const currentIndex = prev.findIndex((item) => item.rowId === record.rowId);
      if (currentIndex < 0) {
        return [...prev, duplicatedRow];
      }
      const next = [...prev];
      next.splice(currentIndex + 1, 0, duplicatedRow);
      return next;
    });
    setQuantities((prev) => ({
      ...prev,
      [duplicatedRow.rowId]: prev[record.rowId] ?? 0,
    }));
    setUnitPrices((prev) => ({
      ...prev,
      [duplicatedRow.rowId]: hasUnitPriceValue(prev, record.rowId)
        ? prev[record.rowId]
        : getDefaultUnitPrice(record.material?.referencePrice),
    }));
    setSelectedColors((prev) => ({
      ...prev,
      [duplicatedRow.rowId]: prev[record.rowId] ?? (record.material?.colors?.length === 1 ? record.material.colors[0] : undefined),
    }));
    setSelectedSpecifications((prev) => ({
      ...prev,
      [duplicatedRow.rowId]: prev[record.rowId] ?? (record.material?.specifications?.length === 1 ? record.material.specifications[0] : undefined),
    }));
    setLineRemarks((prev) => ({
      ...prev,
      [duplicatedRow.rowId]: prev[record.rowId],
    }));
  }, []);

  const handleAddMaterialRow = useCallback((options?: { afterRowId?: string }) => {
    const row = buildEmptyMaterialRow();
    pendingFocusRowId.current = row.rowId;
    setSelectedMaterials((prev) => {
      if (!options?.afterRowId) {
        return [...prev, row];
      }
      const currentIndex = prev.findIndex((item) => item.rowId === options.afterRowId);
      if (currentIndex < 0) {
        return [...prev, row];
      }
      const next = [...prev];
      next.splice(currentIndex + 1, 0, row);
      return next;
    });
    setQuantities((prev) => ({ ...prev, [row.rowId]: 0 }));
    setUnitPrices((prev) => ({ ...prev, [row.rowId]: null }));
  }, []);

  const handleSelectMaterial = useCallback((recordId: string, materialId?: string) => {
    const material = materialOptions.find((item) => item.id === materialId);
    setSelectedMaterials((prev) => prev.map((item) => (
      item.rowId === recordId ? { ...item, material } : item
    )));
    setUnitPrices((prev) => ({
      ...prev,
      [recordId]: getDefaultUnitPrice(material?.referencePrice),
    }));
    setSelectedColors((prev) => ({
      ...prev,
      [recordId]: material?.colors?.length === 1 ? material.colors[0] : undefined,
    }));
    setSelectedSpecifications((prev) => ({
      ...prev,
      [recordId]: material?.specifications?.length === 1 ? material.specifications[0] : undefined,
    }));
  }, [materialOptions]);

  const handleRemoveMaterial = useCallback((recordId: string) => {
    setSelectedMaterials((prev) => prev.filter((item) => item.rowId !== recordId));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
    setUnitPrices((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
    setSelectedColors((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
    setSelectedSpecifications((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
    setLineRemarks((prev) => {
      const next = { ...prev };
      delete next[recordId];
      return next;
    });
  }, []);

  const handleApplyBulkValues = useCallback(() => {
    if (!selectedMaterials.length) {
      message.warning('请先添加需要批量设置的物料');
      return;
    }
    if (bulkQuantityValue == null && bulkUnitPriceValue == null) {
      message.warning('请至少填写一个批量应用值');
      return;
    }
    if (bulkQuantityValue != null) {
      setQuantities((prev) => {
        const next = { ...prev };
        selectedMaterials.forEach((item) => {
          next[item.rowId] = bulkQuantityValue;
        });
        return next;
      });
    }
    if (bulkUnitPriceValue != null) {
      setUnitPrices((prev) => {
        const next = { ...prev };
        selectedMaterials.forEach((item) => {
          next[item.rowId] = bulkUnitPriceValue;
        });
        return next;
      });
    }
    message.success(`已将批量设置应用到 ${selectedMaterials.length} 条采购明细`);
  }, [bulkQuantityValue, bulkUnitPriceValue, selectedMaterials]);

  const handleClearBulkValues = useCallback(() => {
    setBulkQuantityValue(null);
    setBulkUnitPriceValue(null);
  }, []);

  const tableDataSource: MaterialTableRow[] = useMemo(() => {
    if (!selectedMaterials.length) {
      return [];
    }
    return [
      { rowId: '__bulk_apply__', kind: 'bulk' },
      ...selectedMaterials.map((item) => ({ ...item, kind: 'item' as const })),
    ];
  }, [selectedMaterials]);

  const materialSelectOptions = useMemo(() => {
    const merged = new Map<string, MaterialItem>();
    materialOptions.forEach((material) => merged.set(material.id, material));
    selectedMaterials.forEach((row) => {
      if (row.material) {
        merged.set(row.material.id, row.material);
      }
    });
    return Array.from(merged.values()).map((material) => ({
      value: material.id,
      label: formatMaterialOptionLabel(material),
    }));
  }, [materialOptions, selectedMaterials]);

  useEffect(() => {
    const rowId = pendingFocusRowId.current;
    if (!rowId) {
      return;
    }
    const timer = window.setTimeout(() => {
      materialSelectRefs.current[rowId]?.focus();
      pendingFocusRowId.current = null;
    }, 80);
    return () => window.clearTimeout(timer);
  }, [selectedMaterials]);

  const columns: ColumnsType<MaterialTableRow> = useMemo(
    () => [
      {
        title: '物料图片',
        dataIndex: ['material', 'imageUrl'],
        key: 'imageUrl',
        width: 96,
        render: (_value: string | undefined, record) => {
          if (record.kind === 'bulk') {
            return <span className="oc-excel-cell-readonly">-</span>;
          }
          return (
            <div className="oc-excel-image-cell">
              <ListImage
                src={record.material?.imageUrl}
                alt={record.material?.name}
                width={52}
                height={52}
                borderRadius={6}
                fallbackText={record.material ? '暂无图片' : '未选物料'}
              />
            </div>
          );
        },
      },
      {
        title: '物料',
        dataIndex: ['material', 'name'],
        key: 'name',
        width: 260,
        render: (_value: string, record) => {
          if (record.kind === 'bulk') {
            return (
              <Space className="oc-excel-cell-readonly" direction="vertical" size={2}>
                <Text strong>批量设置</Text>
                <Text type="secondary">统一设置数量或单价后批量写入明细。</Text>
              </Space>
            );
          }
          return (
            <Select
              ref={(node) => {
                materialSelectRefs.current[record.rowId] = node;
              }}
              className="oc-excel-cell-select"
              showSearch
              allowClear
              placeholder="搜索物料名称/编号"
              value={record.material?.id}
              loading={materialOptionsLoading}
              disabled={lockNonRemarkFields}
              filterOption={false}
              onFocus={() => {
                if (!materialOptions.length) {
                  void loadMaterialOptions();
                }
              }}
              onSearch={(value) => loadMaterialOptions(value)}
              onChange={(value) => handleSelectMaterial(record.rowId, value)}
              options={materialSelectOptions}
              optionFilterProp="label"
            />
          );
        },
      },
      {
        title: '颜色',
        dataIndex: ['material', 'colors'],
        key: 'colors',
        width: 140,
        render: (_value: string[], record) => {
          if (record.kind === 'bulk') {
            return <Text type="secondary">逐行维护</Text>;
          }
          const colorOptions = (record.material?.colors ?? []).map((color) => ({ label: color, value: color }));
          if (!record.material) {
            return <Text className="oc-excel-cell-placeholder">请先选物料</Text>;
          }
          if (!colorOptions.length) {
            return <Text className="oc-excel-cell-placeholder">未维护颜色</Text>;
          }
          return (
            <Select
              className="oc-excel-cell-select"
              allowClear
              placeholder="请选择颜色"
              value={selectedColors[record.rowId]}
              onChange={(value) => handleColorChange(record.rowId, value)}
              options={colorOptions}
            />
          );
        },
      },
      ...(materialType === 'accessory' ? [{
        title: '规格',
        dataIndex: ['material', 'specifications'],
        key: 'specifications',
        width: 140,
        render: (_value: string[], record: MaterialTableRow) => {
          if (record.kind === 'bulk') {
            return <Text type="secondary">逐行维护</Text>;
          }
          const specificationOptions = (record.material?.specifications ?? []).map((spec) => ({ label: spec, value: spec }));
          if (!record.material) {
            return <Text className="oc-excel-cell-placeholder">请先选物料</Text>;
          }
          if (!specificationOptions.length) {
            return <Text className="oc-excel-cell-placeholder">未维护规格</Text>;
          }
          return (
            <Select
              className="oc-excel-cell-select"
              allowClear
              placeholder="请选择规格"
              value={selectedSpecifications[record.rowId]}
              onChange={(value) => handleSpecificationChange(record.rowId, value)}
              options={specificationOptions}
            />
          );
        },
      }] : []),
      {
        title: '采购数量',
        dataIndex: 'orderQty',
        key: 'orderQty',
        width: 150,
        render: (_value, record) => {
          if (record.kind === 'bulk') {
            return (
              <InputNumber
                className="oc-excel-cell-input"
                min={0}
                precision={2}
                controls={false}
                disabled={lockNonRemarkFields}
                value={bulkQuantityValue}
                onChange={setBulkQuantityValue}
                placeholder="批量采购数量"
              />
            );
          }
          return (
            <InputNumber
              className="oc-excel-cell-input"
              min={0}
              precision={2}
              controls={false}
              disabled={lockNonRemarkFields || !record.material}
              value={quantities[record.rowId] ?? 0}
              onChange={(val) => handleQuantityChange(record.rowId, val)}
              addonAfter={record.material?.unit ?? ''}
            />
          );
        },
      },
      {
        title: '采购单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 160,
        render: (_value, record) => {
          if (record.kind === 'bulk') {
            return (
              <div className="oc-excel-price-cell">
                <Text type="secondary" style={{ minWidth: 12 }}>
                  ¥
                </Text>
                <InputNumber
                  className="oc-excel-cell-input"
                  min={0}
                  precision={2}
                  controls={false}
                  disabled={lockNonRemarkFields}
                  value={bulkUnitPriceValue}
                  onChange={setBulkUnitPriceValue}
                  placeholder="批量采购单价"
                />
              </div>
            );
          }
          return (
            <div className="oc-excel-price-cell">
              <Text type="secondary" style={{ minWidth: 12 }}>
                ¥
              </Text>
              <InputNumber
                className="oc-excel-cell-input"
                min={0}
                precision={2}
                controls={false}
                disabled={lockNonRemarkFields || !record.material}
                value={getDisplayedUnitPrice(unitPrices, record.rowId, record.material?.referencePrice)}
                onChange={(val) => handleUnitPriceChange(record.rowId, val)}
                placeholder="请输入采购单价"
              />
            </div>
          );
        },
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        width: 190,
        render: (_value, record) => {
          if (record.kind === 'bulk') {
            return <Text type="secondary">逐行填写明细备注</Text>;
          }
          return (
            <Input
              className="oc-excel-cell-text-input"
              placeholder="备注"
              disabled={lockNonRemarkFields || !record.material}
              value={lineRemarks[record.rowId]}
              onChange={(event) => handleLineRemarkChange(record.rowId, event.target.value)}
            />
          );
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        key: 'actions',
        width: 170,
        fixed: 'right',
        render: (_value, record) => {
          if (record.kind === 'bulk') {
            return (
              <Space className="oc-excel-row-actions" size={0}>
                <Button type="link" disabled={lockNonRemarkFields} onClick={handleApplyBulkValues}>
                  批量应用
                </Button>
                <Button type="link" disabled={lockNonRemarkFields} onClick={handleClearBulkValues}>
                  重置
                </Button>
              </Space>
            );
          }
          return (
            <Space className="oc-excel-row-actions" size={0}>
              <Button type="link" disabled={lockNonRemarkFields} onClick={() => handleAddMaterialRow({ afterRowId: record.rowId })}>
                插入
              </Button>
              <Button type="link" disabled={lockNonRemarkFields} onClick={() => handleDuplicateMaterial(record)}>
                复制
              </Button>
              <Button type="link" danger disabled={lockNonRemarkFields} onClick={() => handleRemoveMaterial(record.rowId)}>
                移除
              </Button>
            </Space>
          );
        },
      },
    ],
    [
      bulkQuantityValue,
      bulkUnitPriceValue,
      handleApplyBulkValues,
      handleClearBulkValues,
      handleColorChange,
      handleDuplicateMaterial,
      handleAddMaterialRow,
      handleSelectMaterial,
      handleQuantityChange,
      handleRemoveMaterial,
      handleLineRemarkChange,
      handleSpecificationChange,
      handleUnitPriceChange,
      lineRemarks,
      loadMaterialOptions,
      lockNonRemarkFields,
      materialType,
      materialOptions.length,
      materialOptionsLoading,
      materialSelectOptions,
      quantities,
      selectedColors,
      selectedSpecifications,
      unitPrices,
    ],
  );

  const handleCreateSupplier = async () => {
    try {
      const values = await supplierForm.validateFields();
      setSupplierSubmitting(true);
      const createdSupplier = await partnersApi.create({
        ...values,
        type: 'supplier',
      });
      const latestSuppliers = await loadSuppliers();
      const currentExists = latestSuppliers.some((item) => item.id === createdSupplier.id);
      if (!currentExists) {
        setSuppliers((prev) => [createdSupplier, ...prev]);
      }
      form.setFieldValue('supplierId', createdSupplier.id);
      setSupplierModalOpen(false);
      supplierForm.resetFields();
      message.success('供应商已添加');
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'errorFields' in error) {
        return;
      }
      console.error('failed to create supplier', error);
      message.error('新增供应商失败，请稍后重试');
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const openSupplierQuickCreate = useCallback(() => {
    supplierForm.setFieldsValue({
      ...DEFAULT_SUPPLIER_FORM_VALUES,
      name: supplierSearchText.trim() || '',
      type: 'supplier',
    });
    setSupplierModalOpen(true);
  }, [supplierForm, supplierSearchText]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const selectedLines = isRemarkOnly && initialOrder
        ? initialOrder.lines.map((line) => ({
            materialId: line.materialId,
            quantity: Number(line.quantity ?? 0),
            unit: line.unit,
            unitPrice: line.unitPrice == null ? undefined : Number(line.unitPrice),
            color: line.color,
            specification: line.specification,
            remark: line.remark,
            materialName: line.materialName,
          }))
        : selectedMaterials
            .filter((item): item is SelectedMaterialRow & { material: MaterialItem } => Boolean(item.material))
            .map((item) => ({
              materialId: item.material.id,
              quantity: quantities[item.rowId] ?? 0,
              unit: item.material.unit,
              unitPrice: getSubmitUnitPrice(unitPrices, item.rowId, item.material.referencePrice),
              color: selectedColors[item.rowId],
              specification: selectedSpecifications[item.rowId],
              remark: lineRemarks[item.rowId]?.trim() || undefined,
              materialName: item.material.name,
            }))
            .filter((line) => line.quantity > 0);
      if (!isRemarkOnly) {
        if (!selectedMaterials.length) {
          message.warning('请先新增采购明细行');
          return;
        }
        if (selectedMaterials.some((item) => !item.material)) {
          message.warning('请为每一行选择物料');
          return;
        }
        if (!selectedLines.length) {
          message.warning('请为勾选的物料填写采购数量');
          return;
        }
      }
      const payload: StockingPurchaseCreatePayload = {
        supplierId: values.supplierId,
        warehouseId: values.warehouseId,
        orderDate: values.orderDate ? values.orderDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        expectedArrival: values.expectedArrival?.format('YYYY-MM-DD'),
        remark: values.remark,
        lines: selectedLines.map((line) => ({
          materialId: line.materialId,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          color: line.color,
          specification: line.specification,
          remark: line.remark,
        })),
      };
      setSubmitting(true);
      if (isEditMode && initialOrder) {
        const detail = await stockingPurchaseInboundService.updateOrder(initialOrder.id, payload);
        onUpdated?.(detail);
      } else {
        const summary = await stockingPurchaseInboundService.createOrder(payload);
        onCreated?.(summary);
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'errorFields' in error) {
        return;
      }
      console.error(isEditMode ? 'failed to update stocking order' : 'failed to create stocking order', error);
      message.error(isEditMode ? '更新采购单失败，请稍后重试' : '创建采购单失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      className="stocking-purchase-create-modal"
      width={modalWidth}
      title={isEditMode ? '编辑备料采购单' : '创建备料采购单'}
      open={open}
      onCancel={onClose}
      confirmLoading={submitting}
      okText={isEditMode ? '保存修改' : '创建采购单'}
      onOk={handleSubmit}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {isRemarkOnly ? (
          <Alert
            type="warning"
            showIcon
            message="该采购单已有收料记录，当前仅允许修改备注。"
          />
        ) : null}
        <Form
          form={form}
          layout="vertical"
          style={{ width: '100%' }}
          initialValues={{ orderDate: dayjs() }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              width: '100%',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Form.Item
                label="供应商"
                name="supplierId"
                rules={[{ required: true, message: '请选择供应商' }]}
              >
                <Select
                  loading={metaLoading}
                  disabled={lockNonRemarkFields}
                  placeholder="请选择供应商"
                  searchValue={supplierSearchText}
                  onSearch={setSupplierSearchText}
                  onClear={() => setSupplierSearchText('')}
                  popupRender={(menu) => (
                    <>
                      {menu}
                      <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                        <Space direction="vertical" size={4}>
                          <Button
                            type="link"
                            style={{ padding: 0, height: 'auto' }}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={openSupplierQuickCreate}
                          >
                            {supplierSearchText.trim() ? `直接新增“${supplierSearchText.trim()}”` : '快速新增供应商'}
                          </Button>
                          <Text type="secondary">
                            {supplierSearchText.trim() ? '会把当前输入直接带入新增表单。' : '找不到时可直接新增并回填当前采购单。'}
                          </Text>
                        </Space>
                      </div>
                    </>
                  )}
                  options={suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Space>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Form.Item
                label="仓库"
                name="warehouseId"
                rules={[{ required: true, message: '请选择仓库' }]}
              >
              <Select
                loading={metaLoading}
                disabled={lockNonRemarkFields}
                placeholder="请选择仓库"
                popupRender={(menu) => renderSelectDropdownWithSetup(menu, warehouseSetup)}
                options={warehouses.map((warehouse) => ({ label: warehouse.name, value: warehouse.id }))}
                showSearch
                optionFilterProp="label"
              />
              </Form.Item>
              <SelectSetupHint config={warehouseSetup} marginTop={-18} marginBottom={8} />
            </Space>
            <Form.Item
              label="采购日期"
              name="orderDate"
              rules={[{ required: true, message: '请选择采购日期' }]}
            >
            <DatePicker allowClear={false} disabled={lockNonRemarkFields} />
            </Form.Item>
            <Form.Item label="预计到货" name="expectedArrival">
            <DatePicker disabled={lockNonRemarkFields} />
            </Form.Item>
            <Form.Item label="备注" name="remark">
            <Input.TextArea rows={1} placeholder="可输入订单备注" />
            </Form.Item>
          </div>
        </Form>
        <Space
          align="center"
          className="stocking-purchase-entry-summary"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space>
            <SelectSetupHint config={materialSetup} compact />
          </Space>
          <Text type="secondary">
            已添加的物料：<Text strong>{selectedMaterials.filter((item) => item.material).length}</Text> 项
          </Text>
        </Space>
        <Table<MaterialTableRow>
          className="oc-excel-entry-table stocking-purchase-entry-table"
          rowKey="rowId"
          dataSource={tableDataSource}
          columns={columns}
          pagination={false}
          size="small"
          locale={{
            emptyText: '请新增一行后，在物料列搜索选择物料档案',
          }}
          scroll={{ y: 360, x: materialType === 'accessory' ? 1306 : 1166 }}
          footer={() => (
            <div className="oc-excel-table-footer">
              <Button type="dashed" block disabled={lockNonRemarkFields} onClick={() => handleAddMaterialRow()}>
                新增一行
              </Button>
            </div>
          )}
        />
      </Space>
      <Modal
        title="快速新增供应商"
        open={supplierModalOpen}
        onCancel={() => {
          setSupplierModalOpen(false);
          supplierForm.resetFields();
          setSupplierSearchText('');
        }}
        onOk={handleCreateSupplier}
        okText="保存并使用"
        confirmLoading={supplierSubmitting}
        destroyOnHidden
      >
        <Form
          form={supplierForm}
          layout="vertical"
          initialValues={DEFAULT_SUPPLIER_FORM_VALUES}
        >
          <Form.Item
            label="供应商名称"
            name="name"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input maxLength={128} placeholder="请输入供应商名称" />
          </Form.Item>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 16,
            }}
          >
            <Form.Item label="联系人" name="contact">
              <Input maxLength={128} placeholder="请输入联系人" />
            </Form.Item>
            <Form.Item label="联系电话" name="phone">
              <Input maxLength={32} placeholder="请输入联系电话" />
            </Form.Item>
          </div>
          <Form.Item label="联系地址" name="address">
            <Input maxLength={255} placeholder="请输入联系地址" />
          </Form.Item>
          <Form.Item label="备注" name="remarks">
            <Input.TextArea rows={3} maxLength={512} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default StockingPurchaseCreateModal;
