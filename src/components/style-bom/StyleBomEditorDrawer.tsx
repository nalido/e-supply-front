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
  color: string;
  sizes: string[];
  onClose: () => void;
  onApply: (value: StyleBomLineDraft) => void;
};

const createUid = () => `bom-editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emptySpecification: MaterialMinimumSpecification = { label: '', active: true };

const buildEmptyDraft = (
  materialType: MaterialBasicType,
  sizes: string[],
  color: string,
): StyleBomLineDraft => ({
  uid: createUid(),
  materialId: '',
  materialName: '',
  materialSku: '',
  materialType,
  unit: '',
  materialMinimumSpecificationId: '',
  minimumSpecification: emptySpecification,
  applyToAllColors: false,
  applicableColors: color ? [color] : [],
  sizeConsumptions: sizes.map((size) => ({ size, consumption: null })),
  lossRate: 0,
  remark: '',
});

const cloneDraft = (value: StyleBomLineDraft, sizes: string[], color: string): StyleBomLineDraft => ({
  ...value,
  applyToAllColors: false,
  applicableColors: color ? [color] : [],
  sizeConsumptions: sizes.map((size) => ({
    size,
    consumption: value.sizeConsumptions.find((item) => item.size === size)?.consumption ?? null,
  })),
  minimumSpecification: { ...value.minimumSpecification },
});

export default function StyleBomEditorDrawer({
  open,
  initialValue,
  initialMaterialType = 'fabric',
  color,
  sizes,
  onClose,
  onApply,
}: Props) {
  const { message } = AntdApp.useApp();
  const [draft, setDraft] = useState<StyleBomLineDraft>(() => buildEmptyDraft(initialMaterialType, sizes, color));
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
    const nextDraft = initialValue ? cloneDraft(initialValue, sizes, color) : buildEmptyDraft(nextType, sizes, color);
    setDraft(nextDraft);
    initialDraftRef.current = JSON.stringify(nextDraft);
    setKeyword('');
  }, [color, initialMaterialType, initialValue, open, sizes]);

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
    setDraft((previous) => ({
      ...previous,
      materialId: material.id,
      materialName: material.name,
      materialSku: material.sku,
      materialType: material.materialType,
      unit: material.unit,
      imageUrl: material.imageUrl,
      materialMinimumSpecificationId: specification.id as string,
      minimumSpecification: specification,
      sizeConsumptions: previous.unit && previous.unit !== material.unit
        ? previous.sizeConsumptions.map((item) => ({ ...item, consumption: null }))
        : previous.sizeConsumptions,
    }));
  };

  const localErrors = useMemo(() => {
    const errors: string[] = [];
    if (!draft.materialId || !draft.materialMinimumSpecificationId) errors.push('请选择物料规格');
    if (!draft.applicableColors.length) errors.push('当前用料缺少款式颜色');
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

  return (
    <Drawer
      rootClassName="style-bom-editor-drawer-root"
      className="style-bom-editor-drawer"
      title={(
        <Space size={6}>
          <span>{color} · {initialValue ? '设置物料' : '添加物料'}</span>
          <Tooltip title={`本次编辑只作用于 ${color}，不会改变其他颜色的物料清单。`}>
            <QuestionCircleOutlined className="style-bom-help-icon" aria-label="物料编辑说明" />
          </Tooltip>
        </Space>
      )}
      open={open}
      styles={{ wrapper: { width: 'min(760px, 100vw)', maxWidth: '100vw' } }}
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
          <Title level={5}>选择物料规格</Title>
          <div className="style-bom-editor-grid">
            <label>
              <Text strong>物料类型</Text>
              <Segmented
                block
                value={materialType}
                options={[{ label: '面料', value: 'fabric' }, { label: '辅料/包材', value: 'accessory' }]}
                onChange={(value) => {
                  const nextType = value as MaterialBasicType;
                  setMaterialType(nextType);
                  setKeyword('');
                  setDraft((previous) => ({
                    ...buildEmptyDraft(nextType, sizes, color),
                    uid: previous.uid,
                    sizeConsumptions: previous.sizeConsumptions.map((item) => ({ ...item, consumption: null })),
                    lossRate: previous.lossRate,
                    remark: previous.remark,
                  }));
                }}
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
          <div className="style-bom-editor-grid">
            <label>
              <Text strong>损耗率</Text>
              <InputNumber min={0} max={100} precision={2} controls={false} suffix="%" value={draft.lossRate} onChange={(lossRate) => setDraft((previous) => ({ ...previous, lossRate: Number(lossRate ?? 0) }))} />
            </label>
            <label>
              <Text strong>备注</Text>
              <Input value={draft.remark} placeholder="可选" maxLength={500} onChange={(event) => setDraft((previous) => ({ ...previous, remark: event.target.value }))} />
            </label>
          </div>
        </section>

      </Space>
    </Drawer>
  );
}
