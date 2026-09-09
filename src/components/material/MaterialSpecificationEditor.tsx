import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Grid, Input, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import type { MaterialBasicType, MaterialMinimumSpecification } from '../../types/material';
import '../../styles/matrix-table.css';

const { Text } = Typography;

type SpecificationDraft = MaterialMinimumSpecification & { rowKey: string };

type Props = {
  materialType: MaterialBasicType;
  value?: MaterialMinimumSpecification[];
  onChange?: (value: MaterialMinimumSpecification[]) => void;
};

const createRowKey = () => `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const buildLabel = (item: Partial<MaterialMinimumSpecification>) =>
  [item.color, item.specification, item.width, item.grammage].filter(Boolean).join(' · ') || '通用规格';

const RecoverySource = ({ row }: { row: SpecificationDraft }) => {
  if (row.recoveryBasis === 'business-record') {
    return (
      <Space size={4} wrap>
        <Tag color="blue">历史单据</Tag>
        {row.recoveryEvidenceCount ? <Text type="secondary">{row.recoveryEvidenceCount} 笔</Text> : null}
      </Space>
    );
  }
  if (row.recoveryBasis === 'original-data') {
    return <Tag color="gold">原档案</Tag>;
  }
  return <Text type="secondary">手工维护</Text>;
};

export default function MaterialSpecificationEditor({ materialType, value = [], onChange }: Props) {
  const screens = Grid.useBreakpoint();
  const compact = screens.md === false;
  const historicalRows = useMemo(() => value.filter((item) => item.legacyDefault), [value]);
  const rows = useMemo<SpecificationDraft[]>(
    () => value
      .filter((item) => !item.legacyDefault)
      .map((item, index) => ({
        ...item,
        rowKey: item.id ? `id-${item.id}` : `draft-${index}-${item.color ?? ''}-${item.specification ?? ''}`,
      })),
    [value],
  );
  const hasRecoveryCandidates = rows.some((row) => row.recoveryCandidate);

  const emit = (next: SpecificationDraft[]) => {
    const editableRows = next.map(({ rowKey, ...item }) => {
      void rowKey;
      return { ...item, label: buildLabel(item) };
    });
    onChange?.([...historicalRows, ...editableRows]);
  };

  const patchRow = (rowKey: string, patch: Partial<MaterialMinimumSpecification>) => {
    emit(rows.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row)));
  };

  const patchRecoveryCandidates = (active: boolean) => {
    emit(rows.map((row) => (row.recoveryCandidate ? { ...row, active } : row)));
  };

  const duplicateRow = (row: SpecificationDraft) => {
    emit([
      ...rows,
      {
        ...row,
        id: undefined,
        code: undefined,
        recoveryCandidate: false,
        recoveryBasis: undefined,
        recoveryEvidenceCount: undefined,
        rowKey: createRowKey(),
      },
    ]);
  };

  const columns: ColumnsType<SpecificationDraft> = [
    {
      title: '颜色', dataIndex: 'color', width: 150,
      render: (text, row) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 黑色" onChange={(event) => patchRow(row.rowKey, { color: event.target.value })} />,
    },
    ...(materialType === 'fabric' ? [
      {
        title: '幅宽', dataIndex: 'width', width: 150,
        render: (text: string | undefined, row: SpecificationDraft) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 150cm" onChange={(event) => patchRow(row.rowKey, { width: event.target.value })} />,
      },
      {
        title: '克重', dataIndex: 'grammage', width: 150,
        render: (text: string | undefined, row: SpecificationDraft) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 180g/m²" onChange={(event) => patchRow(row.rowKey, { grammage: event.target.value })} />,
      },
    ] : [
      {
        title: '规格', dataIndex: 'specification', width: 180,
        render: (text: string | undefined, row: SpecificationDraft) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 20mm" onChange={(event) => patchRow(row.rowKey, { specification: event.target.value })} />,
      },
    ]),
    ...(hasRecoveryCandidates ? [{
      title: '资料来源', key: 'source', width: 130,
      render: (_: unknown, row: SpecificationDraft) => <RecoverySource row={row} />,
    }] : []),
    {
      title: hasRecoveryCandidates ? '采用' : '状态', dataIndex: 'active', width: 82, align: 'center',
      render: (active, row) => <Switch size="small" checked={active !== false} checkedChildren={hasRecoveryCandidates ? '采用' : '启用'} unCheckedChildren={hasRecoveryCandidates ? '不用' : '停用'} onChange={(checked) => patchRow(row.rowKey, { active: checked })} />,
    },
    {
      title: '操作', key: 'actions', width: 82, align: 'center',
      render: (_, row) => (
        <Space className="oc-excel-row-actions" size={0}>
          <Button type="text" aria-label="复制规格" icon={<CopyOutlined />} onClick={() => duplicateRow(row)} />
          <Button type="text" danger aria-label="删除规格" icon={<DeleteOutlined />} onClick={() => emit(rows.filter((item) => item.rowKey !== row.rowKey))} />
        </Space>
      ),
    },
  ];

  const dimensionInput = (
    row: SpecificationDraft,
    field: 'specification' | 'width' | 'grammage',
    label: string,
    placeholder: string,
  ) => (
    <label className="material-specification-card__field">
      <Text type="secondary">{label}</Text>
      <Input value={row[field]} placeholder={placeholder} onChange={(event) => patchRow(row.rowKey, { [field]: event.target.value })} />
    </label>
  );

  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <Text type="secondary">每一种组合都可以单独采购、入库和领用。</Text>
      {historicalRows.length ? (
        <Alert
          type="success"
          showIcon
          message="历史单据关联资料已保留"
          description="尚不能准确归属到颜色和规格的历史数量会继续保留，不会在本次编辑中被清空或误分配。"
        />
      ) : null}
      {hasRecoveryCandidates ? (
        <div className="material-specification-editor__bulk-actions">
          <Text type="secondary">已预填 {rows.filter((row) => row.recoveryCandidate).length} 个可能组合</Text>
          <Space size={4}>
            <Button type="link" size="small" onClick={() => patchRecoveryCandidates(true)}>全部采用</Button>
            <Button type="link" size="small" onClick={() => patchRecoveryCandidates(false)}>全部不采用</Button>
          </Space>
        </div>
      ) : null}
      {compact ? (
        <div className="material-specification-card-list">
          {rows.length ? rows.map((row) => (
            <div className="material-specification-card" key={row.rowKey}>
              <label className="material-specification-card__field">
                <Text type="secondary">颜色</Text>
                <Input value={row.color} placeholder="如 黑色" onChange={(event) => patchRow(row.rowKey, { color: event.target.value })} />
              </label>
              {materialType === 'fabric' ? (
                <>
                  {dimensionInput(row, 'width', '幅宽', '如 150cm')}
                  {dimensionInput(row, 'grammage', '克重', '如 180g/m²')}
                </>
              ) : dimensionInput(row, 'specification', '规格', '如 20mm')}
              <div className="material-specification-card__footer">
                {hasRecoveryCandidates ? <RecoverySource row={row} /> : <span />}
                <Space size={4}>
                  <Switch size="small" checked={row.active !== false} checkedChildren={hasRecoveryCandidates ? '采用' : '启用'} unCheckedChildren={hasRecoveryCandidates ? '不用' : '停用'} onChange={(checked) => patchRow(row.rowKey, { active: checked })} />
                  <Button type="text" aria-label="复制规格" icon={<CopyOutlined />} onClick={() => duplicateRow(row)} />
                  <Button type="text" danger aria-label="删除规格" icon={<DeleteOutlined />} onClick={() => emit(rows.filter((item) => item.rowKey !== row.rowKey))} />
                </Space>
              </div>
            </div>
          )) : <Text type="secondary">请添加至少一个颜色与规格组合</Text>}
        </div>
      ) : (
        <Table<SpecificationDraft>
          className="oc-excel-entry-table material-specification-editor"
          rowKey="rowKey"
          columns={columns}
          dataSource={rows}
          pagination={false}
          size="small"
          tableLayout="fixed"
          locale={{ emptyText: '请添加至少一个颜色与规格组合' }}
        />
      )}
      <Button icon={<PlusOutlined />} onClick={() => emit([...rows, { rowKey: createRowKey(), label: '通用规格', active: true }])}>
        添加组合
      </Button>
    </Space>
  );
}
