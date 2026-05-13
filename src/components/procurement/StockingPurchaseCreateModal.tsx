import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
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
import SearchField from '../page/SearchField';
import { renderSelectDropdownWithSetup, type SelectSetupConfig } from '../../utils/select-setup-hint';

const { Text } = Typography;

type SelectedMaterialRow = {
  rowId: string;
  material: MaterialItem;
};

type BulkApplyRow = {
  rowId: '__bulk_apply__';
  kind: 'bulk';
};

type MaterialTableRow =
  | (SelectedMaterialRow & { kind: 'item' })
  | BulkApplyRow;

type MaterialDrawerRow = {
  rowId: string;
  material: MaterialItem;
  color?: string;
};

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
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [supplierSearchText, setSupplierSearchText] = useState('');
  const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false);
  const [materialOptions, setMaterialOptions] = useState<MaterialDrawerRow[]>([]);
  const [materialOptionsPage, setMaterialOptionsPage] = useState(1);
  const [materialOptionsTotal, setMaterialOptionsTotal] = useState(0);
  const [materialDrawerKeyword, setMaterialDrawerKeyword] = useState('');
  const [materialDrawerInput, setMaterialDrawerInput] = useState('');
  const [materialDrawerLoading, setMaterialDrawerLoading] = useState(false);
  const [drawerSelectedRowKeys, setDrawerSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkQuantityValue, setBulkQuantityValue] = useState<number | null>(null);
  const [bulkUnitPriceValue, setBulkUnitPriceValue] = useState<number | null>(null);
  const isEditMode = mode === 'edit';
  const isRemarkOnly = initialOrder?.editableScope === 'remark_only';
  const lockNonRemarkFields = isEditMode && isRemarkOnly;
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
    setMaterialDrawerOpen(false);
    setMaterialOptions([]);
    setMaterialOptionsPage(1);
    setMaterialOptionsTotal(0);
    setMaterialDrawerKeyword('');
    setMaterialDrawerInput('');
    setMaterialDrawerLoading(false);
    setDrawerSelectedRowKeys([]);
    setBulkQuantityValue(null);
    setBulkUnitPriceValue(null);
    setSupplierModalOpen(false);
    setSupplierSubmitting(false);
    setSupplierSearchText('');
    supplierForm.resetFields();
  }, [supplierForm]);

  const loadMaterialOptions = useCallback(async () => {
    if (!materialDrawerOpen) {
      return;
    }
    setMaterialDrawerLoading(true);
    try {
      const response = await materialApi.list({
        page: materialOptionsPage,
        pageSize: DEFAULT_PAGE_SIZE,
        materialType,
        keyword: materialDrawerKeyword ? materialDrawerKeyword.trim() : undefined,
      });
      setMaterialOptions(response.list.flatMap((material) => {
        const colors = material.colors?.length ? material.colors : [undefined];
        return colors.map((color, index) => ({
          rowId: `${material.id}::${color ?? `no-color-${index}`}`,
          material,
          color,
        }));
      }));
      setMaterialOptionsTotal(response.total);
    } catch (error) {
      console.error('failed to load materials', error);
      message.error('加载物料档案失败');
    } finally {
      setMaterialDrawerLoading(false);
    }
  }, [materialDrawerKeyword, materialDrawerOpen, materialOptionsPage, materialType]);

  useEffect(() => {
    if (!open) {
      return;
    }
    resetState();
    form.setFieldsValue({ orderDate: dayjs(), expectedArrival: undefined, remark: undefined });
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
  }, [form, initialDraft?.remark, initialDraft?.supplierName, initialOrder, loadSuppliers, open, resetState]);

  useEffect(() => {
    if (!open || !initialOrder?.lines?.length) {
      return;
    }
    const loadOrderLines = async () => {
      try {
        const matchedMaterials: SelectedMaterialRow[] = [];
        const nextQuantities: Record<string, number> = {};
        const nextColors: Record<string, string | undefined> = {};
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
          nextUnitPrices[row.rowId] = line.unitPrice == null
            ? getDefaultUnitPrice(matchedMaterial.referencePrice)
            : Number(line.unitPrice);
        }
        if (!matchedMaterials.length) return;
        setSelectedMaterials(matchedMaterials);
        setQuantities(nextQuantities);
        setSelectedColors(nextColors);
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
        }
        if (!matchedMaterials.length) {
          return;
        }
        setSelectedMaterials(matchedMaterials);
        setQuantities(nextQuantities);
        setSelectedColors(nextColors);
      } catch (error) {
        console.error('failed to load initial material draft', error);
        message.warning('已打开采购创建弹窗，但未能自动匹配物料，请手动选择');
      }
    };
    void loadInitialMaterial();
  }, [initialDraft, materialType, open]);

  useEffect(() => {
    if (materialDrawerOpen) {
      void loadMaterialOptions();
    }
  }, [loadMaterialOptions, materialDrawerOpen]);

  const handleQuantityChange = useCallback((recordId: string, value: number | null) => {
    setQuantities((prev) => ({ ...prev, [recordId]: value ?? 0 }));
  }, []);

  const handleUnitPriceChange = useCallback((recordId: string, value: number | null) => {
    setUnitPrices((prev) => ({ ...prev, [recordId]: value }));
  }, []);

  const handleColorChange = useCallback((recordId: string, value?: string) => {
    setSelectedColors((prev) => ({ ...prev, [recordId]: value }));
  }, []);

  const handleDuplicateMaterial = useCallback((record: SelectedMaterialRow) => {
    const duplicatedRow = buildSelectedMaterialRow(record.material);
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
        : getDefaultUnitPrice(record.material.referencePrice),
    }));
    setSelectedColors((prev) => ({
      ...prev,
      [duplicatedRow.rowId]: prev[record.rowId] ?? (record.material.colors?.length === 1 ? record.material.colors[0] : undefined),
    }));
  }, []);

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

  const columns: ColumnsType<MaterialTableRow> = useMemo(
    () => [
      {
        title: '物料',
        dataIndex: ['material', 'name'],
        key: 'name',
        render: (_value: string, record) => {
          if (record.kind === 'bulk') {
            return (
              <Space direction="vertical" size={2}>
                <Text strong>批量设置</Text>
                <Text type="secondary">在此统一设置采购数量与单价，并批量写入下方明细。</Text>
              </Space>
            );
          }
          return (
            <Space direction="vertical" size={2}>
              <Text strong>{record.material.name}</Text>
              <Text type="secondary">{record.material.sku}</Text>
            </Space>
          );
        },
      },
      {
        title: '颜色/备注',
        dataIndex: ['material', 'colors'],
        key: 'colors',
        width: 240,
        render: (_value: string[], record) => {
          if (record.kind === 'bulk') {
            return <Text type="secondary">颜色字段保留逐行维护，不参与统一批量设置。</Text>;
          }
          const colorOptions = (record.material.colors ?? []).map((color) => ({ label: color, value: color }));
          return (
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {colorOptions.length ? (
                <Select
                  allowClear
                  placeholder="请选择颜色"
                  value={selectedColors[record.rowId]}
                  onChange={(value) => handleColorChange(record.rowId, value)}
                  options={colorOptions}
                  style={{ width: '100%' }}
                />
              ) : (
                <Text type="secondary">未维护颜色</Text>
              )}
              <Text type="secondary">{record.material.remarks || '-'}</Text>
            </Space>
          );
        },
      },
      {
        title: '采购数量',
        dataIndex: 'orderQty',
        key: 'orderQty',
        width: 180,
        render: (_value, record) => {
          if (record.kind === 'bulk') {
            return (
              <InputNumber
                min={0}
                precision={2}
                disabled={lockNonRemarkFields}
                value={bulkQuantityValue}
                onChange={setBulkQuantityValue}
                placeholder="批量采购数量"
                style={{ width: '100%' }}
              />
            );
          }
          return (
            <InputNumber
              min={0}
              precision={2}
              disabled={lockNonRemarkFields}
              value={quantities[record.rowId] ?? 0}
              onChange={(val) => handleQuantityChange(record.rowId, val)}
              addonAfter={record.material.unit}
              style={{ width: '100%' }}
            />
          );
        },
      },
      {
        title: '采购单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 180,
        render: (_value, record) => {
          if (record.kind === 'bulk') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ minWidth: 12 }}>
                  ¥
                </Text>
                <InputNumber
                  min={0}
                  precision={2}
                  disabled={lockNonRemarkFields}
                  value={bulkUnitPriceValue}
                  onChange={setBulkUnitPriceValue}
                  style={{ width: '100%' }}
                  placeholder="批量采购单价"
                />
              </div>
            );
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary" style={{ minWidth: 12 }}>
                ¥
              </Text>
              <InputNumber
                min={0}
                precision={2}
                disabled={lockNonRemarkFields}
                value={getDisplayedUnitPrice(unitPrices, record.rowId, record.material.referencePrice)}
                onChange={(val) => handleUnitPriceChange(record.rowId, val)}
                style={{ width: '100%' }}
                placeholder="请输入采购单价"
              />
            </div>
          );
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        key: 'actions',
        width: 140,
        render: (_value, record) => {
          if (record.kind === 'bulk') {
            return (
              <Space size={0}>
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
            <Space size={0}>
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
      handleQuantityChange,
      handleRemoveMaterial,
      handleUnitPriceChange,
      lockNonRemarkFields,
      quantities,
      selectedColors,
      unitPrices,
    ],
  );

  const handleDrawerSearch = (value: string) => {
    const nextValue = value.trim();
    setMaterialDrawerInput(value);
    setMaterialOptionsPage(1);
    setMaterialDrawerKeyword(nextValue);
  };

  const handleDrawerKeywordChange = (value: string) => {
    setMaterialDrawerInput(value);
    if (!value) {
      setMaterialOptionsPage(1);
      setMaterialDrawerKeyword('');
    }
  };

  const handleAddSelectedMaterials = () => {
    if (!drawerSelectedRowKeys.length) {
      message.warning('请勾选需要添加的物料');
      return;
    }
    const selectedRecords = materialOptions.filter((item) => drawerSelectedRowKeys.includes(item.rowId));
    if (!selectedRecords.length) {
      message.warning('未找到勾选的物料，请刷新后重试');
      return;
    }
    const rowsToAdd = selectedRecords.map((item) => ({
      row: buildSelectedMaterialRow(item.material),
      color: item.color,
    }));
    setSelectedMaterials((prev) => [...prev, ...rowsToAdd.map((item) => item.row)]);
    setQuantities((quantitiesState) => {
      const nextQuantities = { ...quantitiesState };
      rowsToAdd.forEach(({ row }) => {
        nextQuantities[row.rowId] = 0;
      });
      return nextQuantities;
    });
    setUnitPrices((unitPriceState) => {
      const nextUnitPrices = { ...unitPriceState };
      rowsToAdd.forEach(({ row }) => {
        nextUnitPrices[row.rowId] = getDefaultUnitPrice(row.material.referencePrice);
      });
      return nextUnitPrices;
    });
    setSelectedColors((colorState) => {
      const nextColors = { ...colorState };
      rowsToAdd.forEach(({ row, color }) => {
        nextColors[row.rowId] = color ?? (row.material.colors?.length === 1 ? row.material.colors[0] : undefined);
      });
      return nextColors;
    });
    setDrawerSelectedRowKeys([]);
    setMaterialDrawerOpen(false);
  };

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
            materialName: line.materialName,
          }))
        : selectedMaterials
            .map((item) => ({
              materialId: item.material.id,
              quantity: quantities[item.rowId] ?? 0,
              unit: item.material.unit,
              unitPrice: getSubmitUnitPrice(unitPrices, item.rowId, item.material.referencePrice),
              color: selectedColors[item.rowId],
              materialName: item.material.name,
            }))
            .filter((line) => line.quantity > 0);
      if (!isRemarkOnly) {
        if (!selectedMaterials.length) {
          message.warning('请先添加需要采购的物料');
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
      width={960}
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
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            disabled={lockNonRemarkFields}
            onClick={() => {
              setMaterialDrawerOpen(true);
              setMaterialOptionsPage(1);
              if (!materialDrawerInput) {
                setMaterialDrawerKeyword('');
              }
            }}
          >
            添加物料
          </Button>
          <SelectSetupHint config={materialSetup} compact />
          <Text type="secondary">
            已添加的物料：<Text strong>{selectedMaterials.length}</Text> 项
          </Text>
        </Space>
        <Table<MaterialTableRow>
          rowKey="rowId"
          dataSource={tableDataSource}
          columns={columns}
          pagination={false}
          locale={{
            emptyText: '请点击“添加物料”选择物料档案',
          }}
          scroll={{ y: 360 }}
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
      <Drawer
        title="选择物料档案"
        placement="right"
        width={520}
        open={materialDrawerOpen}
        onClose={() => setMaterialDrawerOpen(false)}
        styles={{
          body: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          },
        }}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setMaterialDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleAddSelectedMaterials}>
              添加所选
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%', flex: 1, minHeight: 0 }}>
          <SelectSetupHint config={materialSetup} />
          <SearchField
            allowClear
            placeholder="搜索物料名称/编码"
            value={materialDrawerInput}
            onChange={handleDrawerKeywordChange}
            onSearch={handleDrawerSearch}
            enterButton="搜索"
          />
          <div style={{ flex: 1, minHeight: 0 }}>
          <Table<MaterialDrawerRow>
            rowKey="rowId"
            dataSource={materialOptions}
            columns={[
              {
                title: '物料',
                dataIndex: ['material', 'name'],
                key: 'name',
                render: (value: string, record) => (
                  <Space direction="vertical" size={2}>
                    <Text strong>{value}</Text>
                    <Text type="secondary">{record.material.sku}</Text>
                  </Space>
                ),
              },
              {
                title: '单位',
                dataIndex: ['material', 'unit'],
                key: 'unit',
                width: 100,
              },
              {
                title: '颜色',
                dataIndex: 'color',
                key: 'colors',
                width: 160,
                render: (value?: string) => value || <Text type="secondary">未维护颜色</Text>,
              },
            ]}
            loading={materialDrawerLoading}
            pagination={{
              current: materialOptionsPage,
              total: materialOptionsTotal,
              pageSize: DEFAULT_PAGE_SIZE,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page) => setMaterialOptionsPage(page),
            }}
            rowSelection={{
              selectedRowKeys: drawerSelectedRowKeys,
              onChange: (keys) => setDrawerSelectedRowKeys(keys),
            }}
            scroll={{ y: 'calc(100vh - 340px)' }}
            locale={{ emptyText: '请输入关键词后搜索物料档案' }}
          />
          </div>
        </Space>
      </Drawer>
    </Modal>
  );
};

export default StockingPurchaseCreateModal;
