import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import materialApi from '../../api/material';
import type { MaterialBasicType, MaterialItem, MaterialMinimumSpecification } from '../../types/material';
import type { StyleBomLineDraft, StyleBomValidationIssue } from '../../types/style';
import {
  findMinimumSpecification,
  getActiveMinimumSpecifications,
  getDefaultMinimumSpecificationId,
} from '../../utils/material-minimum-specification';
import ListImage from '../common/ListImage';
import '../../styles/matrix-table.css';

const { Text, Title } = Typography;

type Props = {
  lines: StyleBomLineDraft[];
  colors: string[];
  sizes: string[];
  validationIssues: StyleBomValidationIssue[];
  onAdd: (line: Omit<StyleBomLineDraft, 'uid' | 'id'>) => string;
  onUpdate: (uid: string, line: StyleBomLineDraft) => void;
  onRemove: (uid: string) => void;
  onUpdateAverageConsumption: (uid: string, consumption: number | null) => void;
};

const emptySpecification: MaterialMinimumSpecification = { label: '', active: true };

const expandAverageConsumption = (sizes: string[], averageConsumption: number | null) => (
  sizes.map((size) => ({ size, consumption: averageConsumption }))
);

const toMaterialItem = (line: StyleBomLineDraft): MaterialItem => ({
  id: line.materialId,
  sku: line.materialSku,
  name: line.materialName,
  materialType: line.materialType,
  unit: line.unit as MaterialItem['unit'],
  imageUrl: line.imageUrl,
  colors: [],
  specifications: [],
  minimumSpecifications: line.materialMinimumSpecificationId ? [line.minimumSpecification] : [],
});

export default function StyleBomSection({
  lines,
  colors,
  sizes,
  validationIssues,
  onAdd,
  onUpdate,
  onRemove,
  onUpdateAverageConsumption,
}: Props) {
  const { message } = AntdApp.useApp();
  const [materialOptions, setMaterialOptions] = useState<Record<MaterialBasicType, MaterialItem[]>>({
    fabric: [],
    accessory: [],
  });
  const [materialLoading, setMaterialLoading] = useState<Record<MaterialBasicType, boolean>>({
    fabric: false,
    accessory: false,
  });
  const requestSequenceRef = useRef<Record<MaterialBasicType, number>>({ fabric: 0, accessory: 0 });
  const searchTimerRef = useRef<Partial<Record<MaterialBasicType, number>>>({});
  const fabricLines = useMemo(() => lines.filter((line) => line.materialType === 'fabric'), [lines]);
  const accessoryLines = useMemo(() => lines.filter((line) => line.materialType === 'accessory'), [lines]);

  const issueMap = useMemo(() => validationIssues.reduce<Record<string, StyleBomValidationIssue[]>>((acc, issue) => {
    acc[issue.uid] = [...(acc[issue.uid] ?? []), issue];
    return acc;
  }, {}), [validationIssues]);

  const loadMaterials = useCallback(async (materialType: MaterialBasicType, keyword?: string) => {
    const requestSequence = ++requestSequenceRef.current[materialType];
    setMaterialLoading((previous) => ({ ...previous, [materialType]: true }));
    try {
      const response = await materialApi.list({
        page: 1,
        pageSize: 30,
        materialType,
        keyword: keyword?.trim() || undefined,
      });
      if (requestSequence === requestSequenceRef.current[materialType]) {
        setMaterialOptions((previous) => ({ ...previous, [materialType]: response.list }));
      }
    } catch (error) {
      if (requestSequence === requestSequenceRef.current[materialType]) {
        console.error('加载物料档案失败', error);
        message.error('加载物料档案失败，请稍后重试');
      }
    } finally {
      if (requestSequence === requestSequenceRef.current[materialType]) {
        setMaterialLoading((previous) => ({ ...previous, [materialType]: false }));
      }
    }
  }, [message]);

  const searchMaterials = useCallback((materialType: MaterialBasicType, keyword: string) => {
    const activeTimer = searchTimerRef.current[materialType];
    if (activeTimer) {
      window.clearTimeout(activeTimer);
    }
    searchTimerRef.current[materialType] = window.setTimeout(() => {
      void loadMaterials(materialType, keyword);
    }, 250);
  }, [loadMaterials]);

  useEffect(() => () => {
    Object.values(searchTimerRef.current).forEach((timer) => {
      if (timer) window.clearTimeout(timer);
    });
  }, []);

  const mergedMaterials = useMemo(() => {
    const result: Record<MaterialBasicType, MaterialItem[]> = { fabric: [], accessory: [] };
    (['fabric', 'accessory'] as const).forEach((materialType) => {
      const merged = new Map(materialOptions[materialType].map((material) => [material.id, material]));
      lines.filter((line) => line.materialType === materialType && line.materialId).forEach((line) => {
        if (!merged.has(line.materialId)) merged.set(line.materialId, toMaterialItem(line));
      });
      result[materialType] = Array.from(merged.values());
    });
    return result;
  }, [lines, materialOptions]);

  const updateLine = useCallback((line: StyleBomLineDraft, patch: Partial<StyleBomLineDraft>) => {
    const nextAverageConsumption = Object.prototype.hasOwnProperty.call(patch, 'averageConsumption')
      ? patch.averageConsumption ?? null
      : line.averageConsumption;
    onUpdate(line.uid, {
      ...line,
      ...patch,
      sizeConsumptions: expandAverageConsumption(sizes, nextAverageConsumption),
    });
  }, [onUpdate, sizes]);

  const handleMaterialChange = useCallback((line: StyleBomLineDraft, materialId?: string) => {
    const selected = mergedMaterials[line.materialType].find((material) => material.id === materialId);
    if (!selected) {
      updateLine(line, {
        materialId: '',
        materialName: '',
        materialSku: '',
        unit: '',
        imageUrl: undefined,
        materialMinimumSpecificationId: '',
        minimumSpecification: emptySpecification,
      });
      return;
    }
    const defaultSpecificationId = getDefaultMinimumSpecificationId(selected);
    const defaultSpecification = findMinimumSpecification(selected, defaultSpecificationId);
    updateLine(line, {
      materialId: selected.id,
      materialName: selected.name,
      materialSku: selected.sku,
      unit: selected.unit,
      imageUrl: selected.imageUrl,
      materialMinimumSpecificationId: defaultSpecificationId ?? '',
      minimumSpecification: defaultSpecification ?? emptySpecification,
      averageConsumption: line.unit && line.unit !== selected.unit ? null : line.averageConsumption,
    });
  }, [mergedMaterials, updateLine]);

  const handleSpecificationChange = useCallback((line: StyleBomLineDraft, specificationId?: string) => {
    const material = mergedMaterials[line.materialType].find((item) => item.id === line.materialId);
    const specification = findMinimumSpecification(material, specificationId);
    updateLine(line, {
      materialMinimumSpecificationId: specificationId ?? '',
      minimumSpecification: specification ?? emptySpecification,
    });
  }, [mergedMaterials, updateLine]);

  const addEmptyLine = useCallback((materialType: MaterialBasicType) => {
    const applyToAllColors = materialType === 'accessory';
    onAdd({
      materialId: '',
      materialName: '',
      materialSku: '',
      materialType,
      unit: '',
      materialMinimumSpecificationId: '',
      minimumSpecification: emptySpecification,
      applyToAllColors,
      applicableColors: applyToAllColors ? [] : colors.slice(0, 1),
      averageConsumption: null,
      sizeConsumptions: expandAverageConsumption(sizes, null),
      lossRate: 0,
      remark: '',
    });
  }, [colors, onAdd, sizes]);

  const columns: ColumnsType<StyleBomLineDraft> = [
    {
      title: '物料',
      key: 'material',
      width: 250,
      render: (_, line) => (
        <div className="style-bom-inline-material-cell">
          <ListImage
            src={line.imageUrl}
            alt={line.materialName}
            width={36}
            height={36}
            borderRadius={5}
            fallbackText=""
          />
          <Select
            aria-label={`${line.materialType === 'fabric' ? '面料' : '辅料/包材'}物料`}
            className="oc-excel-cell-select"
            showSearch
            allowClear
            filterOption={false}
            loading={materialLoading[line.materialType]}
            value={line.materialId || undefined}
            status={!line.materialId ? 'error' : undefined}
            placeholder="搜索物料名称/编号"
            onFocus={() => void loadMaterials(line.materialType)}
            onSearch={(keyword) => searchMaterials(line.materialType, keyword)}
            onChange={(value) => handleMaterialChange(line, value)}
            options={mergedMaterials[line.materialType].map((material) => ({
              value: material.id,
              label: [material.name, material.sku].filter(Boolean).join(' / '),
            }))}
            notFoundContent={materialLoading[line.materialType] ? '搜索中…' : '未找到匹配物料'}
          />
        </div>
      ),
    },
    {
      title: '最小规格',
      key: 'minimumSpecification',
      width: 180,
      render: (_, line) => {
        if (!line.materialId) {
          return <Text className="oc-excel-cell-placeholder">请先选物料</Text>;
        }
        const material = mergedMaterials[line.materialType].find((item) => item.id === line.materialId);
        const specifications = material?.minimumSpecifications ?? [];
        const options = specifications.map((specification) => ({
          value: specification.id as string,
          label: `${specification.label}${specification.active === false ? '（已停用）' : ''}`,
          disabled: !specification.id || specification.active === false,
        }));
        return (
          <Select
            aria-label={`${line.materialName || '物料'}最小规格`}
            className="oc-excel-cell-select"
            showSearch
            optionFilterProp="label"
            allowClear={getActiveMinimumSpecifications(material).length > 1}
            value={line.materialMinimumSpecificationId || undefined}
            status={!line.materialMinimumSpecificationId || line.minimumSpecification.active === false ? 'error' : undefined}
            placeholder="选择规格"
            onOpenChange={(open) => {
              const loadedMaterial = materialOptions[line.materialType].find((item) => item.id === line.materialId);
              if (open && !loadedMaterial) void loadMaterials(line.materialType, line.materialName);
            }}
            onChange={(value) => handleSpecificationChange(line, value)}
            options={options}
            notFoundContent="该物料未维护启用规格"
          />
        );
      },
    },
    {
      title: '适用颜色',
      key: 'colors',
      width: 210,
      render: (_, line) => (
        line.materialType === 'accessory' ? (
          <div className="style-bom-color-scope oc-excel-cell-readonly"><Tag color="success">全部颜色</Tag></div>
        ) : (
          <Select
            aria-label={`${line.materialName || '面料'}适用颜色`}
            className="oc-excel-cell-select"
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            value={line.applyToAllColors ? colors : line.applicableColors}
            status={!line.applyToAllColors && !line.applicableColors.length ? 'error' : undefined}
            placeholder="选择适用颜色"
            maxTagCount="responsive"
            options={colors.map((color) => ({ value: color, label: color }))}
            onChange={(applicableColors) => updateLine(line, {
              applyToAllColors: applicableColors.length === colors.length,
              applicableColors: applicableColors.length === colors.length ? [] : applicableColors,
            })}
          />
        )
      ),
    },
    {
      title: '平均单件用量',
      key: 'averageConsumption',
      width: 160,
      render: (_, line) => (
        <InputNumber
          aria-label={`${line.materialName || '物料'} 平均单件用量`}
          className="oc-excel-cell-input style-bom-average-input"
          min={0}
          precision={4}
          controls={false}
          suffix={line.unit || undefined}
          value={line.averageConsumption}
          placeholder="必填"
          status={line.averageConsumption == null ? 'error' : undefined}
          onChange={(next) => onUpdateAverageConsumption(
            line.uid,
            next == null ? null : Number(next),
          )}
        />
      ),
    },
    {
      title: '损耗率',
      key: 'lossRate',
      width: 100,
      render: (_, line) => (
        <InputNumber
          aria-label={`${line.materialName || '物料'} 损耗率`}
          className="oc-excel-cell-input"
          min={0}
          max={100}
          precision={2}
          controls={false}
          suffix="%"
          value={line.lossRate}
          onChange={(lossRate) => updateLine(line, { lossRate: Number(lossRate ?? 0) })}
        />
      ),
    },
    {
      title: '备注',
      key: 'remark',
      width: 150,
      render: (_, line) => (
        <Input
          className="oc-excel-cell-text-input"
          value={line.remark}
          maxLength={500}
          placeholder="可选"
          onChange={(event) => updateLine(line, { remark: event.target.value })}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 64,
      fixed: 'right',
      render: (_, line) => (
        <Space className="oc-excel-row-actions" size={0}>
          <Popconfirm
            title="移除这项款式用料？"
            description="移除后，所选颜色和尺码将不再使用这项物料。"
            onConfirm={() => onRemove(line.uid)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} aria-label="移除用料" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderPanel = (
    title: string,
    materialType: MaterialBasicType,
    dataSource: StyleBomLineDraft[],
    emptyDescription: string,
  ) => (
    <div className="style-bom-summary-panel">
      <div className="style-bom-binding-header">
        <div className="style-bom-title-row">
          <Text strong>{title}</Text>
          <Tag>{dataSource.length} 项</Tag>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => addEmptyLine(materialType)}>
          {materialType === 'fabric' ? '添加面料' : '添加辅料/包材'}
        </Button>
      </div>
      <Table<StyleBomLineDraft>
        className="oc-excel-entry-table style-bom-summary-table"
        rowKey="uid"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        scroll={{ x: 1114 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} /> }}
        rowClassName={(line) => (issueMap[line.uid]?.length ? 'style-bom-summary-row--error' : '')}
      />
    </div>
  );

  return (
    <div className="style-bom-section" data-testid="style-bom-section">
      <div className="style-bom-section-header">
        <div className="style-bom-title-row">
          <Title level={5}>款式用料</Title>
          <Tooltip title="每项物料只需填写一次平均单耗，系统会应用到适用颜色的全部尺码。">
            <QuestionCircleOutlined className="style-bom-help-icon" aria-label="款式用料说明" />
          </Tooltip>
        </div>
        <Text type="secondary">按物料维护平均单件用量，共 {lines.length} 项</Text>
      </div>

      {validationIssues.length ? (
        <Alert
          className="style-bom-validation-summary"
          type="warning"
          showIcon
          message={`还有 ${validationIssues.length} 项用料信息需要处理`}
        />
      ) : null}

      {!colors.length || !sizes.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先维护款式颜色和尺码，再配置款式用料" />
      ) : (
        <div className="style-bom-summary-workspace">
          {renderPanel('面料', 'fabric', fabricLines, '暂无面料')}
          {renderPanel('辅料/包材', 'accessory', accessoryLines, '暂无辅料/包材')}
        </div>
      )}
    </div>
  );
}
