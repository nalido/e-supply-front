import { useCallback, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Radio,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import stylesApi from '../api/styles';
import salesStockingSuggestionService from '../api/sales-stocking-suggestion';
import type {
  SalesStockingMaterialType,
  SalesStockingSuggestionMaterial,
  SalesStockingSuggestionStyle,
  SalesStockingWeeklySalesMode,
} from '../types/sales-stocking-suggestion';
import ListImage from '../components/common/ListImage';

const { Text } = Typography;

const quantityFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
});

const materialTabs = [
  { key: 'fabric', label: '面料' },
  { key: 'accessory', label: '辅料/包材' },
] as const satisfies { key: SalesStockingMaterialType; label: string }[];

type SelectedStyleDraft = {
  styleId: string;
  styleNo: string;
  styleName: string;
  weeklySalesMode: SalesStockingWeeklySalesMode;
  manualWeeklySales?: number;
};

type StyleOption = {
  value: string;
  label: string;
  styleNo: string;
  styleName: string;
};

type StockingCreatePrefill = {
  remark?: string;
  supplierName?: string;
  items: Array<{
    materialCode?: string;
    materialName?: string;
    quantity?: number;
    supplierName?: string;
  }>;
};

const renderQuantity = (value: number): string => quantityFormatter.format(value ?? 0);

const SalesStockingSuggestion = () => {
  const navigate = useNavigate();
  const [materialType, setMaterialType] = useState<SalesStockingMaterialType>('fabric');
  const [coverageWeeks, setCoverageWeeks] = useState(2);
  const [autoSalesWeeks, setAutoSalesWeeks] = useState(4);
  const [keyword, setKeyword] = useState('');
  const [restockOnly, setRestockOnly] = useState(true);
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([]);
  const [styleSearchLoading, setStyleSearchLoading] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<SelectedStyleDraft[]>([]);
  const [resultStyles, setResultStyles] = useState<SalesStockingSuggestionStyle[]>([]);
  const [materialRows, setMaterialRows] = useState<SalesStockingSuggestionMaterial[]>([]);
  const [selectedMaterialRowKeys, setSelectedMaterialRowKeys] = useState<React.Key[]>([]);
  const [querying, setQuerying] = useState(false);
  const [summary, setSummary] = useState({
    selectedStyleCount: 0,
    materialCount: 0,
    totalSuggestedStockQty: 0,
    totalSuggestedReplenishQty: 0,
  });

  const styleOptionMap = useMemo(() => {
    const map = new Map<string, StyleOption>();
    styleOptions.forEach((option) => map.set(option.value, option));
    return map;
  }, [styleOptions]);

  const resultStyleMap = useMemo(() => {
    const map = new Map<string, SalesStockingSuggestionStyle>();
    resultStyles.forEach((item) => map.set(item.styleId, item));
    return map;
  }, [resultStyles]);

  const loadStyleOptions = useCallback(async (searchText: string) => {
    setStyleSearchLoading(true);
    try {
      const response = await stylesApi.list({
        page: 1,
        pageSize: 20,
        keyword: searchText.trim() || undefined,
      });
      setStyleOptions(
        response.list.map((item) => ({
          value: item.id,
          label: `${item.styleNo} / ${item.styleName}`,
          styleNo: item.styleNo,
          styleName: item.styleName,
        })),
      );
    } catch (error) {
      console.error('failed to search styles', error);
      message.error('加载款式失败');
    } finally {
      setStyleSearchLoading(false);
    }
  }, []);

  const handleStyleSelectionChange = useCallback(
    (styleIds: string[]) => {
      setSelectedStyles((previous) => {
        const previousMap = new Map(previous.map((item) => [item.styleId, item]));
        return styleIds
          .map((styleId) => {
            const existing = previousMap.get(styleId);
            if (existing) {
              return existing;
            }
            const option = styleOptionMap.get(styleId);
            if (!option) {
              return null;
            }
            return {
              styleId,
              styleNo: option.styleNo,
              styleName: option.styleName,
              weeklySalesMode: 'AUTO' as const,
              manualWeeklySales: undefined,
            };
          })
          .filter((item): item is SelectedStyleDraft => item != null);
      });
    },
    [styleOptionMap],
  );

  const updateStyleDraft = useCallback(
    (styleId: string, patch: Partial<SelectedStyleDraft>) => {
      setSelectedStyles((previous) =>
        previous.map((item) => (item.styleId === styleId ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const querySuggestions = useCallback(async () => {
    if (selectedStyles.length === 0) {
      message.warning('请先选择至少一个款式');
      return;
    }
    setQuerying(true);
    try {
      const result = await salesStockingSuggestionService.query({
        materialType,
        coverageWeeks,
        autoSalesWeeks,
        restockNeeded: restockOnly,
        keyword: keyword.trim() || undefined,
        styles: selectedStyles.map((style) => ({
          styleId: style.styleId,
          weeklySalesMode: style.weeklySalesMode,
          manualWeeklySales: style.weeklySalesMode === 'MANUAL' ? style.manualWeeklySales : undefined,
        })),
      });
      setResultStyles(result.styles);
      setMaterialRows(result.materials);
      setSelectedMaterialRowKeys([]);
      setSummary(result.summary);
    } catch (error) {
      console.error('failed to query sales stocking suggestions', error);
      message.error('计算销量备料建议失败');
    } finally {
      setQuerying(false);
    }
  }, [autoSalesWeeks, coverageWeeks, keyword, materialType, restockOnly, selectedStyles]);

  const openCreateWithPrefill = useCallback(
    (targetMaterialType: SalesStockingMaterialType, prefill: StockingCreatePrefill) => {
      const prefillKey = `sales-stocking-prefill-${Date.now()}`;
      try {
        window.sessionStorage.setItem(prefillKey, JSON.stringify(prefill));
      } catch (error) {
        console.error('failed to persist stocking prefill', error);
        message.error('准备采购单草稿失败，请重试');
        return;
      }
      const params = new URLSearchParams({
        openCreate: 'true',
        materialType: targetMaterialType === 'packaging' ? 'accessory' : targetMaterialType,
        prefillKey,
      });
      navigate(`/material/purchase-prep?${params.toString()}`);
    },
    [navigate],
  );

  const handleBatchCreateStockingOrder = useCallback(() => {
    const selectedRows = materialRows.filter((item) => selectedMaterialRowKeys.includes(item.materialId));
    if (!selectedRows.length) {
      message.warning('请先勾选要采购的物料建议');
      return;
    }
    const validRows = selectedRows.filter((row) => row.suggestedReplenishQty > 0);
    if (!validRows.length) {
      message.warning('勾选项的建议备货量均为 0');
      return;
    }
    const styleTagSet = new Set<string>();
    validRows.forEach((row) => {
      row.styleContributions.forEach((item) => {
        if (item.styleNo || item.styleName) {
          styleTagSet.add([item.styleNo, item.styleName].filter(Boolean).join('/'));
        }
      });
    });
    const remark =
      styleTagSet.size > 0
        ? `来自销量备料建议：${Array.from(styleTagSet).join('、')}`
        : '来自销量备料建议';
    const first = validRows[0];
    openCreateWithPrefill(first.materialType ?? materialType, {
      remark,
      supplierName: first.supplier,
      items: validRows.map((row) => ({
        materialCode: row.materialCode,
        materialName: row.materialName,
        quantity: row.suggestedReplenishQty,
        supplierName: row.supplier,
      })),
    });
  }, [materialRows, materialType, openCreateWithPrefill, selectedMaterialRowKeys]);

  const styleColumns: ColumnsType<SelectedStyleDraft> = useMemo(
    () => [
      {
        title: '款式',
        key: 'style',
        width: 260,
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>{record.styleNo}</Text>
            <Text type="secondary">{record.styleName}</Text>
          </Space>
        ),
      },
      {
        title: '周销量模式',
        key: 'mode',
        width: 180,
        render: (_, record) => (
          <Radio.Group
            value={record.weeklySalesMode}
            optionType="button"
            buttonStyle="solid"
            onChange={(event) => {
              const mode = event.target.value as SalesStockingWeeklySalesMode;
              updateStyleDraft(record.styleId, {
                weeklySalesMode: mode,
                manualWeeklySales: mode === 'MANUAL' ? record.manualWeeklySales : undefined,
              });
            }}
          >
            <Radio.Button value="AUTO">自动</Radio.Button>
            <Radio.Button value="MANUAL">手工</Radio.Button>
          </Radio.Group>
        ),
      },
      {
        title: '手工周销量',
        key: 'manual',
        width: 140,
        render: (_, record) => (
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            value={record.manualWeeklySales}
            disabled={record.weeklySalesMode !== 'MANUAL'}
            onChange={(value) => {
              updateStyleDraft(record.styleId, { manualWeeklySales: typeof value === 'number' ? value : undefined });
            }}
          />
        ),
      },
      {
        title: '自动周销量',
        key: 'autoWeeklySales',
        width: 120,
        align: 'right',
        render: (_, record) => renderQuantity(resultStyleMap.get(record.styleId)?.autoWeeklySales ?? 0),
      },
      {
        title: '生效周销量',
        key: 'effectiveWeeklySales',
        width: 120,
        align: 'right',
        render: (_, record) => (
          <Text strong>{renderQuantity(resultStyleMap.get(record.styleId)?.effectiveWeeklySales ?? 0)}</Text>
        ),
      },
      {
        title: 'BOM物料数',
        key: 'bomMaterialCount',
        width: 100,
        align: 'right',
        render: (_, record) => resultStyleMap.get(record.styleId)?.bomMaterialCount ?? '--',
      },
      {
        title: '说明',
        key: 'note',
        render: (_, record) => resultStyleMap.get(record.styleId)?.note ?? '--',
      },
    ],
    [resultStyleMap, updateStyleDraft],
  );

  const materialColumns: ColumnsType<SalesStockingSuggestionMaterial> = useMemo(
    () => [
      {
        title: '物料',
        width: 280,
        fixed: 'left',
        render: (_, record) => (
          <Space align="start" size={12}>
            <ListImage src={record.imageUrl} alt={record.materialName} fallback={<Text type="secondary">暂无图片</Text>} />
            <Space direction="vertical" size={0}>
              <Text strong>{record.materialName}</Text>
              <Text type="secondary">{record.materialCode || '--'}</Text>
              <Text type="secondary">供应商：{record.supplier || '--'}</Text>
            </Space>
          </Space>
        ),
      },
      {
        title: '建议库存',
        dataIndex: 'suggestedStockQty',
        width: 120,
        align: 'right',
        render: (value, record) => `${renderQuantity(value)} ${record.unit ?? ''}`.trim(),
      },
      {
        title: '当前在库',
        dataIndex: 'stockInventoryQty',
        width: 120,
        align: 'right',
        render: (value, record) => `${renderQuantity(value)} ${record.unit ?? ''}`.trim(),
      },
      {
        title: '建议备货量',
        dataIndex: 'suggestedReplenishQty',
        width: 140,
        align: 'right',
        render: (value, record) => (
          <Text strong type={value > 0 ? 'danger' : 'secondary'}>{`${renderQuantity(value)} ${record.unit ?? ''}`.trim()}</Text>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="link"
            disabled={record.suggestedReplenishQty <= 0}
            onClick={() => {
              const styleTag = record.styleContributions
                .map((item) => [item.styleNo, item.styleName].filter(Boolean).join('/'))
                .filter(Boolean)
                .join('、');
              const remark = styleTag ? `来自销量备料建议：${styleTag}` : '来自销量备料建议';
              openCreateWithPrefill(record.materialType ?? materialType, {
                supplierName: record.supplier,
                remark,
                items: [
                  {
                    materialCode: record.materialCode,
                    materialName: record.materialName,
                    quantity: record.suggestedReplenishQty,
                    supplierName: record.supplier,
                  },
                ],
              });
            }}
          >
            发起采购
          </Button>
        ),
      },
    ],
    [materialType, openCreateWithPrefill],
  );

  const materialSelection: TableRowSelection<SalesStockingSuggestionMaterial> = useMemo(
    () => ({
      selectedRowKeys: selectedMaterialRowKeys,
      onChange: (keys) => setSelectedMaterialRowKeys(keys),
      getCheckboxProps: (record) => ({
        disabled: record.suggestedReplenishQty <= 0,
      }),
    }),
    [selectedMaterialRowKeys],
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap size={12} style={{ width: '100%' }}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              style={{ minWidth: 420, flex: 1 }}
              placeholder="请选择款式（可多选）"
              filterOption={false}
              loading={styleSearchLoading}
              value={selectedStyles.map((item) => item.styleId)}
              options={styleOptions}
              onSearch={(value) => {
                void loadStyleOptions(value);
              }}
              onFocus={() => {
                if (styleOptions.length === 0) {
                  void loadStyleOptions('');
                }
              }}
              onChange={handleStyleSelectionChange}
            />
            <InputNumber
              min={1}
              precision={0}
              value={coverageWeeks}
              addonBefore="覆盖周数"
              onChange={(value) => setCoverageWeeks(typeof value === 'number' ? value : 2)}
            />
            <InputNumber
              min={1}
              precision={0}
              value={autoSalesWeeks}
              addonBefore="自动回看"
              addonAfter="周"
              onChange={(value) => setAutoSalesWeeks(typeof value === 'number' ? value : 4)}
            />
          </Space>

          <Space wrap size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space direction="vertical" size={4}>
              <Space size={8} align="center">
                <Text strong>物料类型</Text>
                <Text type="secondary">切换后请重新点击“生成建议”</Text>
              </Space>
              <Segmented
                value={materialType}
                options={materialTabs.map((item) => ({ label: item.label, value: item.key }))}
                onChange={(value) => setMaterialType(value as SalesStockingMaterialType)}
              />
            </Space>
            <Space wrap size={12}>
              <Checkbox checked={restockOnly} onChange={(event) => setRestockOnly(event.target.checked)}>
                仅显示建议备货量 &gt; 0
              </Checkbox>
              <Input
                allowClear
                value={keyword}
                placeholder="物料名称 / 编号 / 款号"
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                onChange={(event) => setKeyword(event.target.value)}
                style={{ width: 220 }}
              />
              <Button type="primary" loading={querying} onClick={() => void querySuggestions()}>
                生成建议
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

      <Card title="款式销量参数">
        <Table<SelectedStyleDraft>
          rowKey="styleId"
          columns={styleColumns}
          dataSource={selectedStyles}
          loading={querying}
          pagination={false}
          locale={{ emptyText: '请选择款式后配置周销量参数' }}
          scroll={{ x: 980 }}
        />
      </Card>

      <Card title="物料维度建议结果">
        <Space size={24} style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space size={24} wrap>
            <Statistic title="已选款式" value={summary.selectedStyleCount} />
            <Statistic title="物料数" value={summary.materialCount} />
            <Statistic title="建议库存合计" value={renderQuantity(summary.totalSuggestedStockQty)} />
            <Statistic title="建议备货合计" value={renderQuantity(summary.totalSuggestedReplenishQty)} />
          </Space>
          <Button type="primary" onClick={handleBatchCreateStockingOrder}>
            生成备料采购单
          </Button>
        </Space>
        <Table<SalesStockingSuggestionMaterial>
          rowKey="materialId"
          columns={materialColumns}
          dataSource={materialRows}
          loading={querying}
          rowSelection={materialSelection}
          scroll={{ x: 1080 }}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                rowKey={(row) => `${record.materialId}-${row.styleId}`}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '款式',
                    render: (_, row) => (
                      <Space direction="vertical" size={0}>
                        <Text>{row.styleNo}</Text>
                        <Text type="secondary">{row.styleName}</Text>
                      </Space>
                    ),
                  },
                  { title: '销量模式', dataIndex: 'weeklySalesMode', width: 100 },
                  { title: '周销量', dataIndex: 'weeklySalesQty', width: 100, align: 'right', render: renderQuantity },
                  { title: '单耗', dataIndex: 'bomConsumption', width: 100, align: 'right', render: renderQuantity },
                  {
                    title: '损耗率',
                    dataIndex: 'lossRate',
                    width: 100,
                    align: 'right',
                    render: (value: number) => `${(value * 100).toFixed(1)}%`,
                  },
                  {
                    title: '贡献建议库存',
                    dataIndex: 'suggestedStockQty',
                    width: 130,
                    align: 'right',
                    render: (value: number) => `${renderQuantity(value)} ${record.unit ?? ''}`.trim(),
                  },
                ]}
                dataSource={record.styleContributions}
              />
            ),
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </Space>
  );
};

export default SalesStockingSuggestion;
