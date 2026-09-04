import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Button, Drawer, Input, InputNumber, Modal, Segmented, Select, Space, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import materialApi from '../../api/material';
import type { MaterialBasicType, MaterialItem, MaterialMinimumSpecification } from '../../types/material';
import type { StyleBomLineDraft } from '../../types/style';

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  initialValue?: StyleBomLineDraft;
  initialMaterialType?: MaterialBasicType;
  colors: string[];
  sizes: string[];
  onClose: () => void;
  onApply: (value: StyleBomLineDraft) => void;
};

const createUid = () => `bom-editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emptySpecification: MaterialMinimumSpecification = { label: '', active: true };

const expandAverageConsumption = (sizes: string[], averageConsumption: number | null) => (
  sizes.map((size) => ({ size, consumption: averageConsumption }))
);

const buildEmptyDraft = (
  materialType: MaterialBasicType,
  sizes: string[],
  colors: string[],
): StyleBomLineDraft => {
  const applyToAllColors = materialType === 'accessory';
  return {
    uid: createUid(),
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
  };
};

const cloneDraft = (
  value: StyleBomLineDraft,
  sizes: string[],
): StyleBomLineDraft => ({
  ...value,
  applyToAllColors: value.materialType === 'accessory' ? true : value.applyToAllColors,
  applicableColors: value.materialType === 'accessory' || value.applyToAllColors
    ? []
    : [...value.applicableColors],
  sizeConsumptions: expandAverageConsumption(sizes, value.averageConsumption),
  minimumSpecification: { ...value.minimumSpecification },
});

export default function StyleBomEditorDrawer({
  open,
  initialValue,
  initialMaterialType = 'fabric',
  colors,
  sizes,
  onClose,
  onApply,
}: Props) {
  const { message } = AntdApp.useApp();
  const [draft, setDraft] = useState<StyleBomLineDraft>(() => buildEmptyDraft(initialMaterialType, sizes, colors));
  const [materialType, setMaterialType] = useState<MaterialBasicType>(initialMaterialType);
  const [keyword, setKeyword] = useState('');
  const [materialOptions, setMaterialOptions] = useState<MaterialItem[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialTotal, setMaterialTotal] = useState(0);
  const requestSequenceRef = useRef(0);
  const initialDraftRef = useRef('');

  useEffect(() => {
    if (!open) {
      return;
    }
    const nextType = initialValue?.materialType ?? initialMaterialType;
    setMaterialType(nextType);
    const nextDraft = initialValue
      ? cloneDraft(initialValue, sizes)
      : buildEmptyDraft(nextType, sizes, colors);
    setDraft(nextDraft);
    initialDraftRef.current = JSON.stringify(nextDraft);
    setKeyword('');
  }, [colors, initialMaterialType, initialValue, open, sizes]);

  const loadMaterials = useCallback(async (page: number, append: boolean) => {
    const requestSequence = ++requestSequenceRef.current;
    setMaterialLoading(true);
    try {
      const response = await materialApi.list({
        page,
        pageSize: 30,
        materialType,
        keyword: keyword.trim() || undefined,
      });
      if (requestSequence === requestSequenceRef.current) {
        setMaterialOptions((previous) => {
          const source = append ? [...previous, ...response.list] : response.list;
          return Array.from(new Map(source.map((item) => [item.id, item])).values());
        });
        setMaterialPage(page);
        setMaterialTotal(response.total);
      }
    } catch (error) {
      if (requestSequence === requestSequenceRef.current) {
        console.error('加载物料规格失败', error);
        message.error('加载物料规格失败，请稍后重试');
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setMaterialLoading(false);
      }
    }
  }, [keyword, materialType, message]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => void loadMaterials(1, false), 300);
    return () => window.clearTimeout(timer);
  }, [loadMaterials, open]);

  const materialSpecificationOptions = useMemo(() => {
    const materials = new Map(materialOptions.map((item) => [item.id, item]));
    if (draft.materialId && !materials.has(draft.materialId)) {
      materials.set(draft.materialId, {
        id: draft.materialId,
        sku: draft.materialSku,
        name: draft.materialName,
        materialType: draft.materialType,
        unit: draft.unit as MaterialItem['unit'],
        imageUrl: draft.imageUrl,
        colors: [],
        specifications: [],
        minimumSpecifications: [draft.minimumSpecification],
      } satisfies MaterialItem);
    }

    return Array.from(materials.values()).flatMap((material) => material.minimumSpecifications
      .filter((specification) => specification.id)
      .map((specification) => ({
        value: specification.id as string,
        label: `${material.name} · ${specification.label}${specification.active === false ? '（已停用）' : ''}`,
        disabled: specification.active === false,
        material,
        specification,
      })));
  }, [draft, materialOptions]);

  const handleMaterialSpecificationChange = (value?: string) => {
    const selected = materialSpecificationOptions.find((item) => item.value === value);
    if (!selected) {
      setDraft((previous) => ({
        ...previous,
        materialId: '',
        materialName: '',
        materialSku: '',
        unit: '',
        imageUrl: undefined,
        materialMinimumSpecificationId: '',
        minimumSpecification: emptySpecification,
      }));
      return;
    }
    const { material, specification } = selected;
    setDraft((previous) => {
      const unitChanged = Boolean(previous.unit && previous.unit !== material.unit);
      const averageConsumption = unitChanged ? null : previous.averageConsumption;
      return {
        ...previous,
        materialId: material.id,
        materialName: material.name,
        materialSku: material.sku,
        materialType: material.materialType,
        unit: material.unit,
        imageUrl: material.imageUrl,
        materialMinimumSpecificationId: specification.id as string,
        minimumSpecification: specification,
        averageConsumption,
        sizeConsumptions: expandAverageConsumption(sizes, averageConsumption),
      };
    });
  };

  const localErrors = useMemo(() => {
    const errors: string[] = [];
    if (!draft.materialId || !draft.materialMinimumSpecificationId) errors.push('请选择物料规格');
    if (draft.materialType === 'fabric' && !draft.applyToAllColors && !draft.applicableColors.length) {
      errors.push('请选择适用颜色');
    }
    if (draft.averageConsumption == null || !Number.isFinite(draft.averageConsumption) || draft.averageConsumption < 0) {
      errors.push('请填写平均单件用量');
    }
    return errors;
  }, [draft]);

  const requestClose = () => {
    if (JSON.stringify(draft) === initialDraftRef.current) {
      onClose();
      return;
    }
    Modal.confirm({
      title: '放弃本次用料编辑？',
      content: '抽屉中的修改还没有应用到款式用料清单。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: onClose,
    });
  };

  const switchMaterialType = (value: string | number) => {
    const nextType = value as MaterialBasicType;
    setMaterialType(nextType);
    setKeyword('');
    setDraft((previous) => ({
      ...buildEmptyDraft(nextType, sizes, colors),
      uid: previous.uid,
      averageConsumption: previous.averageConsumption,
      sizeConsumptions: expandAverageConsumption(sizes, previous.averageConsumption),
      lossRate: previous.lossRate,
      remark: previous.remark,
    }));
  };

  return (
    <Drawer
      rootClassName="style-bom-editor-drawer-root"
      className="style-bom-editor-drawer"
      title={(
        <Space size={6}>
          <span>{initialValue ? '设置款式用料' : '添加款式用料'}</span>
          <Tooltip title="填写一次平均单耗，保存后会应用到所选颜色的全部尺码。">
            <QuestionCircleOutlined className="style-bom-help-icon" aria-label="物料编辑说明" />
          </Tooltip>
        </Space>
      )}
      open={open}
      styles={{ wrapper: { width: 'min(720px, 100vw)', maxWidth: '100vw' } }}
      destroyOnHidden
      onClose={requestClose}
      extra={(
        <Space>
          <Button onClick={requestClose}>取消</Button>
          <Button type="primary" disabled={localErrors.length > 0} onClick={() => onApply(draft)}>应用</Button>
        </Space>
      )}
    >
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        {localErrors.length ? <Alert type="warning" showIcon message={`还需完成：${localErrors.join('、')}`} /> : null}

        <section className="style-bom-editor-section">
          <Title level={5}>物料规格</Title>
          <div className="style-bom-editor-grid">
            <label>
              <Text strong>物料类型</Text>
              <Segmented
                block
                value={materialType}
                options={[{ label: '面料', value: 'fabric' }, { label: '辅料/包材', value: 'accessory' }]}
                onChange={switchMaterialType}
              />
            </label>
            <label className="style-bom-specification-field">
              <Text strong>物料规格</Text>
              <Select
                showSearch
                allowClear
                filterOption={false}
                loading={materialLoading}
                value={draft.materialMinimumSpecificationId || undefined}
                placeholder="输入物料名称、编号或规格搜索"
                onSearch={setKeyword}
                onChange={handleMaterialSpecificationChange}
                onPopupScroll={(event) => {
                  const target = event.currentTarget;
                  if (
                    !materialLoading
                    && materialOptions.length < materialTotal
                    && target.scrollTop + target.clientHeight >= target.scrollHeight - 24
                  ) {
                    void loadMaterials(materialPage + 1, true);
                  }
                }}
                options={materialSpecificationOptions}
                notFoundContent={materialLoading ? '搜索中…' : '未找到已维护最小规格的物料'}
              />
            </label>
          </div>
        </section>

        <section className="style-bom-editor-section">
          <Title level={5}>适用颜色</Title>
          {draft.materialType === 'accessory' ? (
            <Alert type="info" showIcon message="辅料/包材统一用于该款式的全部颜色。" />
          ) : (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Segmented
                value={draft.applyToAllColors ? 'all' : 'selected'}
                options={[{ label: '指定颜色', value: 'selected' }, { label: '全部颜色', value: 'all' }]}
                onChange={(scope) => setDraft((previous) => ({
                  ...previous,
                  applyToAllColors: scope === 'all',
                  applicableColors: scope === 'all'
                    ? []
                    : previous.applicableColors.length ? previous.applicableColors : colors.slice(0, 1),
                }))}
              />
              {!draft.applyToAllColors ? (
                <Select
                  mode="multiple"
                  value={draft.applicableColors}
                  options={colors.map((color) => ({ label: color, value: color }))}
                  placeholder="选择一个或多个颜色"
                  onChange={(applicableColors) => setDraft((previous) => ({ ...previous, applicableColors }))}
                />
              ) : null}
            </Space>
          )}
        </section>

        <section className="style-bom-editor-section">
          <Title level={5}>用量</Title>
          <div className="style-bom-editor-grid">
            <label>
              <Text strong>平均单件用量</Text>
              <InputNumber
                aria-label="平均单件用量"
                min={0}
                precision={4}
                controls={false}
                suffix={draft.unit || undefined}
                value={draft.averageConsumption}
                placeholder="必填"
                status={draft.averageConsumption == null ? 'error' : undefined}
                onChange={(averageConsumption) => setDraft((previous) => ({
                  ...previous,
                  averageConsumption: averageConsumption == null ? null : Number(averageConsumption),
                  sizeConsumptions: expandAverageConsumption(
                    sizes,
                    averageConsumption == null ? null : Number(averageConsumption),
                  ),
                }))}
              />
            </label>
            <label>
              <Text strong>损耗率</Text>
              <InputNumber
                min={0}
                max={100}
                precision={2}
                controls={false}
                suffix="%"
                value={draft.lossRate}
                onChange={(lossRate) => setDraft((previous) => ({ ...previous, lossRate: Number(lossRate ?? 0) }))}
              />
            </label>
            <label className="style-bom-editor-remark-field">
              <Text strong>备注</Text>
              <Input value={draft.remark} placeholder="可选" maxLength={500} onChange={(event) => setDraft((previous) => ({ ...previous, remark: event.target.value }))} />
            </label>
          </div>
        </section>
      </Space>
    </Drawer>
  );
}
