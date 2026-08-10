import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, DatePicker, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { stockingPurchaseInboundService } from '../../api/procurement';
import { partnersApi } from '../../api/partners';
import warehouseApi from '../../api/warehouse';
import { materialApi } from '../../api/material';
import type { MaterialItem } from '../../types/material';
import type { Partner } from '../../types/partners';
import type { Warehouse } from '../../types/warehouse';
import type {
  StockingMaterialType,
  StockingPurchaseCreatePayload,
  StockingPurchaseEditableScope,
  StockingPurchaseOrderDetail,
} from '../../types/stocking-purchase-inbound';
import '../../styles/matrix-table.css';

const { Text } = Typography;

type BatchEditRow = {
  key: string;
  orderId: string;
  orderNo: string;
  statusLabel: string;
  editableScope: StockingPurchaseEditableScope;
  lineId: string;
  materialId: string;
  materialName: string;
  unit: string;
  supplierId: string;
  warehouseId: string;
  orderDate: string;
  expectedArrival?: string;
  orderRemark?: string;
  quantity: number;
  actualReceivedQty: number;
  unitPrice?: number;
  color?: string;
  specification?: string;
  lineRemark?: string;
};

type Props = {
  open: boolean;
  orderIds: string[];
  lineIds: string[];
  materialType: StockingMaterialType;
  onClose: () => void;
  onSaved: () => void;
};

const canEditAll = (scope: StockingPurchaseEditableScope) => scope === 'full';
const canEditQuantity = (scope: StockingPurchaseEditableScope) => scope !== 'remark_only';

const StockingPurchaseBatchEditModal = ({ open, orderIds, lineIds, materialType, onClose, onSaved }: Props) => {
  const [rows, setRows] = useState<BatchEditRow[]>([]);
  const [details, setDetails] = useState<StockingPurchaseOrderDetail[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materialOptions, setMaterialOptions] = useState<MaterialItem[]>([]);
  const [materialsById, setMaterialsById] = useState<Record<string, MaterialItem>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !orderIds.length) return;
    const load = async () => {
      setLoading(true);
      try {
        const [loadedDetails, supplierResult, warehouseResult] = await Promise.all([
          Promise.all(orderIds.map((id) => stockingPurchaseInboundService.getOrderDetail(id))),
          partnersApi.list({ page: 1, pageSize: 100, type: 'supplier' }),
          warehouseApi.list({ page: 1, pageSize: 100 }),
        ]);
        const uniqueLines = loadedDetails
          .flatMap((detail) => detail.lines)
          .filter((line, index, list) => list.findIndex((item) => item.materialId === line.materialId) === index);
        const currentMaterials = await Promise.all(uniqueLines.map(async (line) => {
          const result = await materialApi.list({ page: 1, pageSize: 10, materialType, keyword: line.materialCode || line.materialName });
          return result.list.find((item) => item.id === line.materialId);
        }));
        setMaterialsById(Object.fromEntries(currentMaterials.filter((item): item is MaterialItem => Boolean(item)).map((item) => [item.id, item])));
        setDetails(loadedDetails);
        setSuppliers(supplierResult.list);
        setWarehouses(warehouseResult.list);
        const selectedLineIds = new Set(lineIds);
        setRows(loadedDetails.flatMap((detail) => detail.lines
          .filter((line) => selectedLineIds.has(line.lineId))
          .map((line) => ({
          key: `${detail.id}-${line.lineId}`,
          orderId: detail.id,
          orderNo: detail.orderNo,
          statusLabel: detail.statusLabel,
          editableScope: detail.editableScope,
          lineId: line.lineId,
          materialId: line.materialId,
          materialName: line.materialName,
          unit: line.unit,
          supplierId: detail.supplierId ?? '',
          warehouseId: detail.warehouseId ?? '',
          orderDate: detail.orderDate ?? dayjs().format('YYYY-MM-DD'),
          expectedArrival: detail.expectedArrival,
          orderRemark: detail.remark,
          quantity: Number(line.quantity ?? 0),
          actualReceivedQty: Number(line.actualReceivedQty ?? 0),
          unitPrice: line.unitPrice,
          color: line.color,
          specification: line.specification,
          lineRemark: line.remark,
          }))));
      } catch (error) {
        console.error('failed to load stocking batch edit data', error);
        message.error('加载批量修改数据失败');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [lineIds, materialType, onClose, open, orderIds]);

  const updateOrderRows = useCallback((orderId: string, patch: Partial<BatchEditRow>) => {
    setRows((current) => current.map((row) => row.orderId === orderId ? { ...row, ...patch } : row));
  }, []);

  const updateRow = useCallback((key: string, patch: Partial<BatchEditRow>) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }, []);

  const searchMaterials = useCallback(async (keyword: string) => {
    const result = await materialApi.list({ page: 1, pageSize: 30, materialType, keyword: keyword.trim() || undefined });
    setMaterialOptions(result.list);
    setMaterialsById((current) => ({ ...current, ...Object.fromEntries(result.list.map((item) => [item.id, item])) }));
  }, [materialType]);

  const columns = useMemo<ColumnsType<BatchEditRow>>(() => [
    { title: '采购单号', dataIndex: 'orderNo', width: 138, fixed: 'left', render: (value, row) => <Space direction="vertical" size={0}><Text strong>{value}</Text><Text type="secondary" className="stocking-purchase-batch-edit__status">{row.statusLabel}</Text></Space> },
    { title: '物料', dataIndex: 'materialId', width: 205, render: (value, row) => (
      <Select className="oc-excel-cell-select" size="small" showSearch filterOption={false} style={{ width: '100%' }} value={value} disabled={!canEditAll(row.editableScope)}
        onFocus={() => void searchMaterials(row.materialName)} onSearch={(text) => void searchMaterials(text)}
        onChange={(id) => {
          const material = materialOptions.find((item) => item.id === id);
          if (material) updateRow(row.key, { materialId: material.id, materialName: material.name, unit: material.unit, color: undefined, specification: undefined });
        }}
        options={[{ value: row.materialId, label: row.materialName }, ...materialOptions.filter((item) => item.id !== row.materialId).map((item) => ({ value: item.id, label: `${item.name}${item.sku ? ` / ${item.sku}` : ''}` }))]} />
    ) },
    { title: '供应商', dataIndex: 'supplierId', width: 145, render: (value, row) => <Select className="oc-excel-cell-select" size="small" style={{ width: '100%' }} value={value} disabled={!canEditAll(row.editableScope)} onChange={(supplierId) => updateOrderRows(row.orderId, { supplierId })} options={suppliers.map((item) => ({ value: item.id, label: item.name }))} /> },
    { title: '仓库', dataIndex: 'warehouseId', width: 145, render: (value, row) => <Select className="oc-excel-cell-select" size="small" style={{ width: '100%' }} value={value} disabled={!canEditAll(row.editableScope)} onChange={(warehouseId) => updateOrderRows(row.orderId, { warehouseId })} options={warehouses.map((item) => ({ value: item.id, label: item.name }))} /> },
    { title: '采购日期', dataIndex: 'orderDate', width: 124, render: (value, row) => <DatePicker className="oc-excel-cell-picker" size="small" value={value ? dayjs(value) : undefined} disabled={!canEditAll(row.editableScope)} onChange={(date) => updateOrderRows(row.orderId, { orderDate: date?.format('YYYY-MM-DD') ?? '' })} /> },
    { title: '预计到货', dataIndex: 'expectedArrival', width: 124, render: (value, row) => <DatePicker className="oc-excel-cell-picker" size="small" value={value ? dayjs(value) : undefined} disabled={!canEditAll(row.editableScope)} onChange={(date) => updateOrderRows(row.orderId, { expectedArrival: date?.format('YYYY-MM-DD') })} /> },
    { title: '颜色', dataIndex: 'color', width: 115, render: (value, row) => {
      const colors = materialsById[row.materialId]?.colors ?? [];
      const options = Array.from(new Set([value, ...colors].filter(Boolean))).map((item) => ({ value: item, label: item }));
      return <Select className="oc-excel-cell-select" size="small" allowClear placeholder={options.length ? '选择颜色' : '未维护颜色'} value={value} disabled={!canEditAll(row.editableScope)} onChange={(color) => updateRow(row.key, { color })} options={options} />;
    } },
    ...(materialType === 'accessory' ? [{ title: '规格', dataIndex: 'specification', width: 115, render: (value: string, row: BatchEditRow) => {
      const specifications = materialsById[row.materialId]?.specifications ?? [];
      const options = Array.from(new Set([value, ...specifications].filter(Boolean))).map((item) => ({ value: item, label: item }));
      return <Select className="oc-excel-cell-select" size="small" allowClear placeholder={options.length ? '选择规格' : '未维护规格'} value={value} disabled={!canEditAll(row.editableScope)} onChange={(specification) => updateRow(row.key, { specification })} options={options} />;
    } }] : []),
    { title: '采购数量', dataIndex: 'quantity', width: 150, render: (value, row) => {
      const quantityInvalid = row.quantity < row.actualReceivedQty;
      return (
        <div className="stocking-purchase-quantity-cell">
          <InputNumber className="oc-excel-cell-input" size="small" min={1} precision={0} status={quantityInvalid ? 'error' : undefined} value={value} disabled={!canEditQuantity(row.editableScope)} onChange={(quantity) => updateRow(row.key, { quantity: Number(quantity ?? 0) })} addonAfter={row.unit} />
          {quantityInvalid ? <Text type="danger" className="stocking-purchase-quantity-cell__error">不能小于累计实收 {row.actualReceivedQty}</Text> : null}
        </div>
      );
    } },
    { title: '采购单价', dataIndex: 'unitPrice', width: 112, render: (value, row) => <InputNumber className="oc-excel-cell-input" size="small" min={0} precision={2} value={value} disabled={!canEditAll(row.editableScope)} onChange={(unitPrice) => updateRow(row.key, { unitPrice: unitPrice == null ? undefined : Number(unitPrice) })} prefix="¥" /> },
    { title: '明细备注', dataIndex: 'lineRemark', width: 145, render: (value, row) => <Input className="oc-excel-cell-text-input" size="small" value={value} onChange={(event) => updateRow(row.key, { lineRemark: event.target.value })} /> },
    { title: '整单备注', dataIndex: 'orderRemark', width: 145, render: (value, row) => <Input className="oc-excel-cell-text-input" size="small" value={value} onChange={(event) => updateOrderRows(row.orderId, { orderRemark: event.target.value })} /> },
  ], [materialOptions, materialsById, materialType, searchMaterials, suppliers, updateOrderRows, updateRow, warehouses]);

  const handleSubmit = async () => {
    const invalid = rows.find((row) => !row.supplierId || !row.warehouseId || !row.orderDate || !row.materialId || row.quantity <= 0);
    if (invalid) {
      message.warning(`请补全采购单 ${invalid.orderNo} 的必填字段`);
      return;
    }
    const belowReceived = rows.find((row) => row.quantity < row.actualReceivedQty);
    if (belowReceived) {
      message.warning('请先修正标红的采购数量');
      return;
    }
    const payloadOrders = details.map((detail) => {
      const orderRows = rows.filter((row) => row.orderId === detail.id);
      const first = orderRows[0];
      const order: StockingPurchaseCreatePayload = {
        supplierId: first.supplierId,
        warehouseId: first.warehouseId,
        orderDate: first.orderDate,
        expectedArrival: first.expectedArrival,
        remark: first.orderRemark,
        lines: detail.lines.map((line) => {
          const edited = orderRows.find((row) => row.lineId === line.lineId);
          return edited
            ? { lineId: edited.lineId, materialId: edited.materialId, quantity: edited.quantity, unit: edited.unit, unitPrice: edited.unitPrice, color: edited.color, specification: edited.specification, remark: edited.lineRemark }
            : { lineId: line.lineId, materialId: line.materialId, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice, color: line.color, specification: line.specification, remark: line.remark };
        }),
      };
      return { orderId: detail.id, order };
    });
    try {
      setSubmitting(true);
      await stockingPurchaseInboundService.batchUpdateOrders({ orders: payloadOrders });
      message.success(`已更新 ${payloadOrders.length} 张备料采购单`);
      onSaved();
    } catch (error) {
      console.error('failed to batch update stocking orders', error);
      message.error('批量修改失败，请检查填写内容');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal className="stocking-purchase-batch-edit-modal" width="calc(100vw - 24px)" title={`批量修改备料采购明细（${lineIds.length} 条 / ${orderIds.length} 张）`} open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={submitting} okText="保存全部修改" destroyOnHidden>
      <Alert showIcon type="info" className="stocking-purchase-batch-edit__alert" message="未收料单可修改全部字段；收料中的单据仅可修改采购数量和备注；已完成单仅可修改备注。" />
      <Table className="oc-excel-entry-table stocking-purchase-batch-edit__table" rowKey="key" loading={loading} dataSource={rows} columns={columns} pagination={false} size="small" scroll={{ x: 1600, y: '62vh' }} />
    </Modal>
  );
};

export default StockingPurchaseBatchEditModal;
