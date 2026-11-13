import { useMemo, useState } from 'react';
import {
  App as AntdApp,
  Badge,
  Button,
  Drawer,
  Form,
  Grid,
  Input,
  InputNumber,
  Popover,
  Select,
  Space,
} from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import type {
  MaterialStockAdvancedFilters,
  MaterialStockWarehouse,
} from '../../types/material-stock';

type MaterialStockAdvancedFilterProps = {
  value: MaterialStockAdvancedFilters;
  warehouses: MaterialStockWarehouse[];
  onApply: (filters: MaterialStockAdvancedFilters) => void;
  onReset: () => void;
};

const TEXT_FIELDS: Array<keyof MaterialStockAdvancedFilters> = [
  'materialCode',
  'materialName',
  'color',
  'specification',
  'unit',
  'remark',
];

const FILTER_GROUPS: Array<Array<keyof MaterialStockAdvancedFilters>> = [
  ['materialCode'],
  ['materialName'],
  ['color'],
  ['specification'],
  ['unit'],
  ['warehouseId'],
  ['stockQtyMin', 'stockQtyMax'],
  ['availableQtyMin', 'availableQtyMax'],
  ['inTransitQtyMin', 'inTransitQtyMax'],
  ['remark'],
];

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const normalizeFilters = (
  filters: MaterialStockAdvancedFilters,
): MaterialStockAdvancedFilters => {
  const normalized = { ...filters };
  TEXT_FIELDS.forEach((field) => {
    const value = normalized[field];
    if (typeof value === 'string') {
      normalized[field] = (value.trim() || undefined) as never;
    }
  });
  return normalized;
};

const MaterialStockAdvancedFilter = ({
  value,
  warehouses,
  onApply,
  onReset,
}: MaterialStockAdvancedFilterProps) => {
  const { message } = AntdApp.useApp();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm<MaterialStockAdvancedFilters>();
  const [open, setOpen] = useState(false);
  const isDesktop = screens.md === true;

  const activeCount = useMemo(
    () => FILTER_GROUPS.filter((fields) => fields.some((field) => hasValue(value[field]))).length,
    [value],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      form.setFieldsValue(value);
    }
    setOpen(nextOpen);
  };

  const handleApply = async () => {
    const filters = normalizeFilters(await form.validateFields());
    const ranges: Array<[number | undefined, number | undefined, string]> = [
      [filters.stockQtyMin, filters.stockQtyMax, '库存数量'],
      [filters.availableQtyMin, filters.availableQtyMax, '可用数量'],
      [filters.inTransitQtyMin, filters.inTransitQtyMax, '采购在途'],
    ];
    const invalidRange = ranges.find(([minimum, maximum]) => (
      minimum !== undefined && maximum !== undefined && minimum > maximum
    ));
    if (invalidRange) {
      message.warning(`${invalidRange[2]}最小值不能大于最大值`);
      return;
    }
    onApply(filters);
    setOpen(false);
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
    setOpen(false);
  };

  const filterForm = (
    <Form<MaterialStockAdvancedFilters>
      form={form}
      layout="vertical"
      initialValues={value}
      className="material-stock-advanced-filter"
    >
      <div className="material-stock-filter-grid">
        <Form.Item label="物料编码" name="materialCode">
          <Input allowClear placeholder="输入物料编码" />
        </Form.Item>
        <Form.Item label="物料名称" name="materialName">
          <Input allowClear placeholder="输入物料名称" />
        </Form.Item>
        <Form.Item label="颜色" name="color">
          <Input allowClear placeholder="输入颜色" />
        </Form.Item>
        <Form.Item label="规格" name="specification">
          <Input allowClear placeholder="输入规格" />
        </Form.Item>
        <Form.Item label="单位" name="unit">
          <Input allowClear placeholder="输入单位" />
        </Form.Item>
        <Form.Item label="仓库" name="warehouseId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="选择仓库"
            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
            options={warehouses.map((warehouse) => ({
              label: warehouse.name,
              value: warehouse.id,
            }))}
          />
        </Form.Item>
      </div>

      <Form.Item label="库存数量">
        <div className="material-stock-filter-range">
          <Form.Item name="stockQtyMin" noStyle><InputNumber placeholder="最小值" /></Form.Item>
          <span>至</span>
          <Form.Item name="stockQtyMax" noStyle><InputNumber placeholder="最大值" /></Form.Item>
        </div>
      </Form.Item>
      <Form.Item label="可用数量">
        <div className="material-stock-filter-range">
          <Form.Item name="availableQtyMin" noStyle><InputNumber placeholder="最小值" /></Form.Item>
          <span>至</span>
          <Form.Item name="availableQtyMax" noStyle><InputNumber placeholder="最大值" /></Form.Item>
        </div>
      </Form.Item>
      <Form.Item label="采购在途">
        <div className="material-stock-filter-range">
          <Form.Item name="inTransitQtyMin" noStyle><InputNumber placeholder="最小值" /></Form.Item>
          <span>至</span>
          <Form.Item name="inTransitQtyMax" noStyle><InputNumber placeholder="最大值" /></Form.Item>
        </div>
      </Form.Item>
      <Form.Item label="备注" name="remark">
        <Input allowClear placeholder="输入备注" />
      </Form.Item>

      <Space className="material-stock-filter-actions">
        <Button type="primary" onClick={() => void handleApply()}>搜索</Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
    </Form>
  );

  const trigger = (
    <Badge count={activeCount} size="small" offset={[-2, 2]}>
      <Button
        icon={<FilterOutlined />}
        aria-label="高级筛选"
        onClick={isDesktop ? undefined : () => handleOpenChange(!open)}
      >
        高级筛选
      </Button>
    </Badge>
  );

  if (isDesktop) {
    return (
      <Popover
        open={open}
        onOpenChange={handleOpenChange}
        trigger="click"
        placement="bottomRight"
        content={filterForm}
        overlayClassName="material-stock-filter-popover"
      >
        {trigger}
      </Popover>
    );
  }

  return (
    <>
      {trigger}
      <Drawer
        title="高级筛选"
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom"
        height="86vh"
        destroyOnHidden
      >
        {filterForm}
      </Drawer>
    </>
  );
};

export default MaterialStockAdvancedFilter;
