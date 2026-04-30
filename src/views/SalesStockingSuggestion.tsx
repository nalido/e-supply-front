import { useCallback, useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Radio,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
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
import { PageHeader } from '../components/page';

const { Text, Title } = Typography;

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

type QuerySnapshot = {
  materialType: SalesStockingMaterialType;
  coverageWeeks: number;
  autoSalesWeeks: number;
  keyword: string;
  restockOnly: boolean;
  styles: Array<{
    styleId: string;
    weeklySalesMode: SalesStockingWeeklySalesMode;
    manualWeeklySales?: number;
  }>;
};

const renderQuantity = (value: number): string => quantityFormatter.format(value ?? 0);

const normalizeStylesForSnapshot = (styles: SelectedStyleDraft[]) =>
  styles
    .map((style) => ({
      styleId: style.styleId,
      weeklySalesMode: style.weeklySalesMode,
      manualWeeklySales: style.weeklySalesMode === 'MANUAL' ? style.manualWeeklySales ?? 0 : undefined,
    }))
    .sort((a, b) => a.styleId.localeCompare(b.styleId));

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
  const [lastQuerySnapshot, setLastQuerySnapshot] = useState<QuerySnapshot | null>(null);

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

  const currentSnapshot = useMemo<QuerySnapshot>(
    () => ({
      materialType,
      coverageWeeks,
      autoSalesWeeks,
      keyword: keyword.trim(),
      restockOnly,
      styles: normalizeStylesForSnapshot(selectedStyles),
    }),
    [autoSalesWeeks, coverageWeeks, keyword, materialType, restockOnly, selectedStyles],
  );

  const hasResults = materialRows.length > 0 || resultStyles.length > 0;
  const isResultStale = useMemo(() => {
    if (!lastQuerySnapshot) {
      return false;
    }
    return JSON.stringify(lastQuerySnapshot) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot, lastQuerySnapshot]);
  const hasValidResults = hasResults && !isResultStale;

  const liveSummary = useMemo(() => {
    const manualStyleCount = selectedStyles.filter((item) => item.weeklySalesMode === 'MANUAL').length;
    const effectiveWeeklySales = selectedStyles.reduce((total, style) => {
      if (style.weeklySalesMode === 'MANUAL') {
        return total + (style.manualWeeklySales ?? 0);
      }
      const matchedResult = resultStyleMap.get(style.styleId);
      return total + (matchedResult?.autoWeeklySales ?? 0);
    }, 0);

    return {
      selectedStyleCount: selectedStyles.length,
      manualStyleCount,
      effectiveWeeklySales,
      hasAutoPendingRefresh:
        selectedStyles.some((item) => item.weeklySalesMode === 'AUTO') && (!lastQuerySnapshot || isResultStale),
    };
  }, [isResultStale, lastQuerySnapshot, resultStyleMap, selectedStyles]);

  const generateButtonLabel = querying ? '生成中' : hasResults ? (isResultStale ? '重新生成建议' : '生成建议') : '生成建议';
  const canQuery = selectedStyles.length > 0;
  const selectedValidRows = useMemo(
    () => materialRows.filter((item) => selectedMaterialRowKeys.includes(item.materialId) && item.suggestedReplenishQty > 0),
    [materialRows, selectedMaterialRowKeys],
  );

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

  const updateStyleDraft = useCallback((styleId: string, patch: Partial<SelectedStyleDraft>) => {
    setSelectedStyles((previous) => previous.map((item) => (item.styleId === styleId ? { ...item, ...patch } : item)));
  }, []);

  const resetWorkbench = useCallback(() => {
    setSelectedStyles([]);
    setResultStyles([]);
    setMaterialRows([]);
    setSelectedMaterialRowKeys([]);
    setSummary({
      selectedStyleCount: 0,
      materialCount: 0,
      totalSuggestedStockQty: 0,
      totalSuggestedReplenishQty: 0,
    });
    setLastQuerySnapshot(null);
  }, []);

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
      setLastQuerySnapshot(currentSnapshot);
    } catch (error) {
      console.error('failed to query sales stocking suggestions', error);
      message.error('计算销量备料建议失败');
    } finally {
      setQuerying(false);
    }
  }, [autoSalesWeeks, coverageWeeks, currentSnapshot, keyword, materialType, restockOnly, selectedStyles]);

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
    if (!hasValidResults) {
      message.warning(isResultStale ? '结果已过期，请重新生成建议后再发起采购' : '请先生成有效建议');
      return;
    }
    if (!selectedValidRows.length) {
      message.warning('请先勾选要采购的物料建议');
      return;
    }
    const styleTagSet = new Set<string>();
    selectedValidRows.forEach((row) => {
      row.styleContributions.forEach((item) => {
        if (item.styleNo || item.styleName) {
          styleTagSet.add([item.styleNo, item.styleName].filter(Boolean).join('/'));
        }
      });
    });
    const remark = styleTagSet.size > 0 ? `来自销量备料建议：${Array.from(styleTagSet).join('、')}` : '来自销量备料建议';
    const first = selectedValidRows[0];
    openCreateWithPrefill(first.materialType ?? materialType, {
      remark,
      supplierName: first.supplier,
      items: selectedValidRows.map((row) => ({
        materialCode: row.materialCode,
        materialName: row.materialName,
        quantity: row.suggestedReplenishQty,
        supplierName: row.supplier,
      })),
    });
  }, [hasValidResults, isResultStale, materialType, openCreateWithPrefill, selectedValidRows]);

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
        width: 148,
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
        title: '当前生效周销量',
        key: 'effectiveWeeklySales',
        width: 140,
        align: 'right',
        render: (_, record) => {
          const value =
            record.weeklySalesMode === 'MANUAL'
              ? record.manualWeeklySales ?? 0
              : resultStyleMap.get(record.styleId)?.autoWeeklySales ?? 0;
          return <Text strong>{renderQuantity(value)}</Text>;
        },
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
        render: (_, record) => {
          if (record.weeklySalesMode === 'AUTO' && (!hasValidResults || isResultStale)) {
            return <Text type="warning">自动销量待刷新</Text>;
          }
          return resultStyleMap.get(record.styleId)?.note ?? '--';
        },
      },
    ],
    [hasValidResults, isResultStale, resultStyleMap, updateStyleDraft],
  );

  const materialColumns: ColumnsType<SalesStockingSuggestionMaterial> = useMemo(
    () => [
      {
        title: '物料',
        width: 300,
        fixed: 'left',
        render: (_, record) => (
          <Space align="start" size={12}>
            <ListImage src={record.imageUrl} alt={record.materialName} />
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
            disabled={!hasValidResults || record.suggestedReplenishQty <= 0}
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
    [hasValidResults, materialType, openCreateWithPrefill],
  );

  const materialSelection: TableRowSelection<SalesStockingSuggestionMaterial> = useMemo(
    () => ({
      selectedRowKeys: selectedMaterialRowKeys,
      onChange: (keys) => setSelectedMaterialRowKeys(keys),
      getCheckboxProps: (record) => ({
        disabled: !hasValidResults || record.suggestedReplenishQty <= 0,
      }),
    }),
    [hasValidResults, selectedMaterialRowKeys],
  );

  return (
    <div className="oc-page">
      <PageHeader
        className="oc-page-header--compact"
        title="销量备料建议"
        subtitle="按连续工作台完成：选款式 → 配销量 → 看摘要 → 生成建议 → 勾选结果 → 生成采购单。"
      />

      <Card variant="borderless" style={{ marginBottom: 16, borderRadius: 16 }}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>主工作台</Title>
            <Text type="secondary">所有生成前输入、联动反馈和主操作都集中在一个区域内，避免来回跳转。</Text>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(620px, 1.9fr) minmax(360px, 1fr)',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <Card size="small" title="A. 款式选择" style={{ borderRadius: 12 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Text type="secondary">支持多选；选择后销量配置表与联动摘要立即刷新。</Text>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="请选择款式（可多选）"
                  filterOption={false}
                  loading={styleSearchLoading}
                  value={selectedStyles.map((item) => item.styleId)}
                  options={styleOptions}
                  style={{ width: '100%' }}
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
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>物料类型</Text>
                    <Segmented
                      block
                      value={materialType}
                      options={materialTabs.map((item) => ({ label: item.label, value: item.key }))}
                      onChange={(value) => setMaterialType(value as SalesStockingMaterialType)}
                    />
                  </div>
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>已选概览</Text>
                    <div
                      style={{
                        minHeight: 32,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Text>{selectedStyles.length ? `已选 ${selectedStyles.length} 个款式` : '尚未选择款式'}</Text>
                    </div>
                  </div>
                </div>
              </Space>
            </Card>

            <Card size="small" title="A. 测算参数" style={{ borderRadius: 12 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>覆盖周数</Text>
                  <InputNumber
                    min={1}
                    precision={0}
                    addonAfter="周"
                    style={{ width: '100%' }}
                    value={coverageWeeks}
                    onChange={(value) => setCoverageWeeks(typeof value === 'number' ? value : 2)}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>自动回看周数</Text>
                  <InputNumber
                    min={1}
                    precision={0}
                    addonAfter="周"
                    style={{ width: '100%' }}
                    value={autoSalesWeeks}
                    onChange={(value) => setAutoSalesWeeks(typeof value === 'number' ? value : 4)}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>结果筛选口径</Text>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Checkbox checked={restockOnly} onChange={(event) => setRestockOnly(event.target.checked)}>
                      仅显示建议备货量 &gt; 0
                    </Checkbox>
                    <Input
                      allowClear
                      value={keyword}
                      placeholder="物料名称 / 编号 / 款号"
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      onChange={(event) => setKeyword(event.target.value)}
                    />
                  </Space>
                </div>
              </div>
            </Card>
          </div>

          <Card size="small" title="B. 款式销量配置" style={{ borderRadius: 12 }}>
            <Table<SelectedStyleDraft>
              rowKey="styleId"
              columns={styleColumns}
              dataSource={selectedStyles}
              loading={querying}
              pagination={false}
              locale={{ emptyText: '请选择款式后配置周销量参数' }}
              scroll={{ x: 1080 }}
            />
          </Card>

          <Card size="small" title="C. 生成前联动摘要" style={{ borderRadius: 12 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                <Statistic title="已选款式数" value={liveSummary.selectedStyleCount} />
                <Statistic title="手工款式数" value={liveSummary.manualStyleCount} />
                <Statistic title="生效总周销量" value={renderQuantity(liveSummary.effectiveWeeklySales)} />
                <Statistic title="物料类型" value={materialTabs.find((item) => item.key === materialType)?.label ?? materialType} />
                <Statistic title="覆盖周数" value={`${coverageWeeks} 周`} />
              </div>
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="配置状态">
                  {isResultStale ? <Tag color="orange">结果已过期，需重新生成</Tag> : hasValidResults ? <Tag color="green">结果有效</Tag> : <Tag>待生成</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="自动销量状态">
                  {liveSummary.hasAutoPendingRefresh ? <Text type="warning">存在 AUTO 款式待刷新自动销量</Text> : '已同步'}
                </Descriptions.Item>
              </Descriptions>
              {isResultStale ? <Alert showIcon type="warning" message="结果已过期，请重新生成建议；采购动作已暂时禁用。" /> : null}
            </Space>
          </Card>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              paddingTop: 4,
            }}
          >
            <Text type="secondary">D. 主操作区：生成建议是当前一阶动作；采购动作仅在结果区提供。</Text>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={resetWorkbench}>重置</Button>
              <Button type="primary" loading={querying} disabled={!canQuery} onClick={() => void querySuggestions()}>
                {generateButtonLabel}
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>结果区</Title>
            <Text type="secondary">结果摘要、筛选与采购动作集中在下方，避免与生成建议抢主操作。</Text>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <Statistic title="已生成款式数" value={summary.selectedStyleCount} />
              <Statistic title="物料数" value={summary.materialCount} />
              <Statistic title="建议库存合计" value={renderQuantity(summary.totalSuggestedStockQty)} />
              <Statistic title="建议备货合计" value={renderQuantity(summary.totalSuggestedReplenishQty)} />
            </div>
            <Space align="center">
              {hasValidResults ? <Tag color="green">结果有效</Tag> : hasResults ? <Tag color="orange">结果已过期</Tag> : <Tag>暂无结果</Tag>}
            </Space>
          </div>

          {isResultStale ? <Alert showIcon type="warning" message="当前筛选/参数/销量配置已变化，以下结果仅供参考，请先重新生成建议。" /> : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <Space wrap>
              <Text type="secondary">已勾选 {selectedValidRows.length} 条可采购建议</Text>
              <Text type="secondary">采购单生成仅基于当前有效结果</Text>
            </Space>
            <Space>
              <Button type="primary" disabled={!hasValidResults || selectedValidRows.length === 0} onClick={handleBatchCreateStockingOrder}>
                生成采购单
              </Button>
            </Space>
          </div>

          {materialRows.length === 0 ? (
            <Empty description={selectedStyles.length ? '请点击上方“生成建议”获取物料结果' : '请先在工作台选择款式并配置销量'} />
          ) : (
            <Table<SalesStockingSuggestionMaterial>
              rowKey="materialId"
              columns={materialColumns}
              dataSource={materialRows}
              loading={querying}
              rowSelection={materialSelection}
              scroll={{ x: 1180 }}
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
          )}
        </Space>
      </Card>
    </div>
  );
};

export default SalesStockingSuggestion;
