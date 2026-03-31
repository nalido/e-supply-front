import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
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
} from '../../types/stocking-purchase-inbound';
import type { Partner, SavePartnerPayload } from '../../types/partners';
import type { Warehouse } from '../../types/warehouse';
import type { MaterialItem } from '../../types/material';
import { SelectSetupHint } from '../common/SelectSetupHint';
import SearchField from '../page/SearchField';
import { renderSelectDropdownWithSetup, type SelectSetupConfig } from '../../utils/select-setup-hint';

const { Text } = Typography;

export type StockingPurchaseCreateModalProps = {
  open: boolean;
  materialType: MaterialStockType;
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
  onClose: () => void;
  onCreated: (summary: ProcurementOrderSummary) => void;
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

const StockingPurchaseCreateModal = ({ open, materialType, initialDraft, onClose, onCreated }: StockingPurchaseCreateModalProps) => {
  const [form] = Form.useForm<{ supplierId: string; warehouseId: string; orderDate: dayjs.Dayjs; expectedArrival?: dayjs.Dayjs; remark?: string }>();
  const [supplierForm] = Form.useForm<SavePartnerPayload>();
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string | undefined>>({});
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [supplierSearchText, setSupplierSearchText] = useState('');
  const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false);
  const [materialOptions, setMaterialOptions] = useState<MaterialItem[]>([]);
  const [materialOptionsPage, setMaterialOptionsPage] = useState(1);
  const [materialOptionsTotal, setMaterialOptionsTotal] = useState(0);
  const [materialDrawerKeyword, setMaterialDrawerKeyword] = useState('');
  const [materialDrawerInput, setMaterialDrawerInput] = useState('');
  const [materialDrawerLoading, setMaterialDrawerLoading] = useState(false);
  const [drawerSelectedRowKeys, setDrawerSelectedRowKeys] = useState<React.Key[]>([]);
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
      setMaterialOptions(response.list);
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
        setWarehouses(warehouseResult.list);
        if (warehouseResult.list.length) {
          form.setFieldValue('warehouseId', warehouseResult.list[0].id);
        }
        if (initialDraft?.supplierName) {
          const matchedSupplier = supplierResult.find((item) => item.name === initialDraft.supplierName);
          if (matchedSupplier) {
            form.setFieldValue('supplierId', matchedSupplier.id);
          }
        }
        if (initialDraft?.remark) {
          form.setFieldValue('remark', initialDraft.remark);
        }
      } catch (error) {
        console.error('failed to load suppliers/warehouses', error);
        message.error('加载供应商或仓库失败');
      } finally {
        setMetaLoading(false);
      }
    };
    void loadMeta();
  }, [form, initialDraft?.remark, initialDraft?.supplierName, loadSuppliers, open, resetState]);

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
        const matchedMaterials: MaterialItem[] = [];
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
          if (!matchedMaterials.find((item) => item.id === matchedMaterial.id)) {
            matchedMaterials.push(matchedMaterial);
          }
          nextQuantities[matchedMaterial.id] = Math.max(0, Number(draftItem.quantity ?? 0));
          nextColors[matchedMaterial.id] = matchedMaterial.colors?.length === 1 ? matchedMaterial.colors[0] : undefined;
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
    setUnitPrices((prev) => ({ ...prev, [recordId]: value ?? 0 }));
  }, []);

  const handleColorChange = useCallback((recordId: string, value?: string) => {
    setSelectedColors((prev) => ({ ...prev, [recordId]: value }));
  }, []);

  const handleRemoveMaterial = useCallback((recordId: string) => {
    setSelectedMaterials((prev) => prev.filter((item) => item.id !== recordId));
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

  const columns: ColumnsType<MaterialItem> = useMemo(
    () => [
      {
        title: '物料',
        dataIndex: 'name',
        key: 'name',
        render: (value: string, record) => (
          <Space direction="vertical" size={2}>
            <Text strong>{value}</Text>
            <Text type="secondary">{record.sku}</Text>
          </Space>
        ),
      },
      {
        title: '颜色/备注',
        dataIndex: 'colors',
        key: 'colors',
        width: 240,
        render: (_value: string[], record) => {
          const colorOptions = (record.colors ?? []).map((color) => ({ label: color, value: color }));
          return (
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {colorOptions.length ? (
                <Select
                  allowClear
                  placeholder="请选择颜色"
                  value={selectedColors[record.id]}
                  onChange={(value) => handleColorChange(record.id, value)}
                  options={colorOptions}
                  style={{ width: '100%' }}
                />
              ) : (
                <Text type="secondary">未维护颜色</Text>
              )}
              <Text type="secondary">{record.remarks || '-'}</Text>
            </Space>
          );
        },
      },
      {
        title: '采购数量',
        dataIndex: 'orderQty',
        key: 'orderQty',
        width: 180,
        render: (_value, record) => (
          <InputNumber
            min={0}
            precision={2}
            value={quantities[record.id] ?? 0}
            onChange={(val) => handleQuantityChange(record.id, val)}
            addonAfter={record.unit}
            style={{ width: '100%' }}
          />
        ),
      },
      {
        title: '采购单价',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 180,
        render: (_value, record) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="secondary" style={{ minWidth: 12 }}>
              ¥
            </Text>
            <InputNumber
              min={0}
              precision={2}
              value={unitPrices[record.id] ?? record.referencePrice ?? 0}
              onChange={(val) => handleUnitPriceChange(record.id, val)}
              style={{ width: '100%' }}
              placeholder="请输入采购单价"
            />
          </div>
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        key: 'actions',
        width: 80,
        render: (_value, record) => (
          <Button type="link" danger onClick={() => handleRemoveMaterial(record.id)}>
            移除
          </Button>
        ),
      },
    ],
    [handleColorChange, handleQuantityChange, handleRemoveMaterial, handleUnitPriceChange, quantities, selectedColors, unitPrices],
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
    const selectedRecords = materialOptions.filter((item) => drawerSelectedRowKeys.includes(item.id));
    if (!selectedRecords.length) {
      message.warning('未找到勾选的物料，请刷新后重试');
      return;
    }
    let hasNewItems = false;
      setSelectedMaterials((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const itemsToAdd = selectedRecords.filter((item) => !existingIds.has(item.id));
      if (!itemsToAdd.length) {
        message.info('所选物料已在列表中');
        return prev;
      }
      hasNewItems = true;
      setQuantities((quantitiesState) => {
        const nextQuantities = { ...quantitiesState };
        itemsToAdd.forEach((item) => {
          if (nextQuantities[item.id] === undefined) {
            nextQuantities[item.id] = 0;
          }
        });
        return nextQuantities;
      });
      setUnitPrices((unitPriceState) => {
        const nextUnitPrices = { ...unitPriceState };
        itemsToAdd.forEach((item) => {
          if (nextUnitPrices[item.id] === undefined) {
            nextUnitPrices[item.id] = item.referencePrice ?? 0;
          }
        });
        return nextUnitPrices;
      });
      setSelectedColors((colorState) => {
        const nextColors = { ...colorState };
        itemsToAdd.forEach((item) => {
          if (nextColors[item.id] === undefined) {
            nextColors[item.id] = item.colors?.length === 1 ? item.colors[0] : undefined;
          }
        });
        return nextColors;
      });
      return [...prev, ...itemsToAdd];
    });
    setDrawerSelectedRowKeys([]);
    if (hasNewItems) {
      setMaterialDrawerOpen(false);
    }
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
      if (!selectedMaterials.length) {
        message.warning('请先添加需要采购的物料');
        return;
      }
      const selectedLines = selectedMaterials
        .map((item) => ({
          materialId: item.id,
          quantity: quantities[item.id] ?? 0,
          unit: item.unit,
          unitPrice: unitPrices[item.id] ?? item.referencePrice ?? 0,
          color: selectedColors[item.id],
        }))
        .filter((line) => line.quantity > 0);
      if (!selectedLines.length) {
        message.warning('请为勾选的物料填写采购数量');
        return;
      }
      const missingUnitPriceLine = selectedLines.find((line) => line.unitPrice <= 0);
      if (missingUnitPriceLine) {
        const material = selectedMaterials.find((item) => item.id === missingUnitPriceLine.materialId);
        message.warning(`请填写物料「${material?.name ?? missingUnitPriceLine.materialId}」的采购单价`);
        return;
      }
      const payload: StockingPurchaseCreatePayload = {
        supplierId: values.supplierId,
        warehouseId: values.warehouseId,
        orderDate: values.orderDate ? values.orderDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        expectedArrival: values.expectedArrival?.format('YYYY-MM-DD'),
        remark: values.remark,
        lines: selectedLines,
      };
      setSubmitting(true);
      const summary = await stockingPurchaseInboundService.createOrder(payload);
      onCreated(summary);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'errorFields' in error) {
        return;
      }
      console.error('failed to create stocking order', error);
      message.error('创建采购单失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      width={960}
      title="创建备料采购单"
      open={open}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="创建采购单"
      onOk={handleSubmit}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
                  placeholder="请选择供应商"
                  searchValue={supplierSearchText}
                  onSearch={setSupplierSearchText}
                  onClear={() => setSupplierSearchText('')}
                  dropdownRender={(menu) => (
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
                placeholder="请选择仓库"
                dropdownRender={(menu) => renderSelectDropdownWithSetup(menu, warehouseSetup)}
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
            <DatePicker allowClear={false} />
            </Form.Item>
            <Form.Item label="预计到货" name="expectedArrival">
            <DatePicker />
            </Form.Item>
            <Form.Item label="备注" name="remark">
            <Input.TextArea rows={1} placeholder="可输入订单备注" />
            </Form.Item>
          </div>
        </Form>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button type="primary" onClick={() => {
            setMaterialDrawerOpen(true);
            setMaterialOptionsPage(1);
            if (!materialDrawerInput) {
              setMaterialDrawerKeyword('');
            }
          }}>
            添加物料
          </Button>
          <SelectSetupHint config={materialSetup} compact />
          <Text type="secondary">
            已添加的物料：<Text strong>{selectedMaterials.length}</Text> 项
          </Text>
        </Space>
        <Table<MaterialItem>
          rowKey="id"
          dataSource={selectedMaterials}
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
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setMaterialDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleAddSelectedMaterials}>
              添加所选
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <SelectSetupHint config={materialSetup} />
          <SearchField
            allowClear
            placeholder="搜索物料名称/编码"
            value={materialDrawerInput}
            onChange={handleDrawerKeywordChange}
            onSearch={handleDrawerSearch}
            enterButton="搜索"
          />
          <Table<MaterialItem>
            rowKey="id"
            dataSource={materialOptions}
            columns={[
              {
                title: '物料',
                dataIndex: 'name',
                key: 'name',
                render: (value: string, record) => (
                  <Space direction="vertical" size={2}>
                    <Text strong>{value}</Text>
                    <Text type="secondary">{record.sku}</Text>
                  </Space>
                ),
              },
              {
                title: '单位',
                dataIndex: 'unit',
                key: 'unit',
                width: 100,
              },
              {
                title: '颜色',
                dataIndex: 'colors',
                key: 'colors',
                width: 160,
                render: (value?: string[]) => (value && value.length ? value.join(' / ') : '-'),
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
            scroll={{ y: 360 }}
            locale={{ emptyText: '请输入关键词后搜索物料档案' }}
          />
        </Space>
      </Drawer>
    </Modal>
  );
};

export default StockingPurchaseCreateModal;
