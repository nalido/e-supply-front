import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Space, Switch, Table, Typography } from 'antd';
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

export default function MaterialSpecificationEditor({ materialType, value = [], onChange }: Props) {
  const rows = useMemo<SpecificationDraft[]>(
    () => value.map((item, index) => ({ ...item, rowKey: item.id ? `id-${item.id}` : `draft-${index}` })),
    [value],
  );

  const emit = (next: SpecificationDraft[]) => {
    onChange?.(next.map(({ rowKey, ...item }) => {
      void rowKey;
      return { ...item, label: buildLabel(item) };
    }));
  };

  const patchRow = (rowKey: string, patch: Partial<MaterialMinimumSpecification>) => {
    emit(rows.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row)));
  };

  const columns: ColumnsType<SpecificationDraft> = [
    {
      title: '规格编码', dataIndex: 'code', width: 140,
      render: (text, row) => <Input className="oc-excel-cell-text-input" value={text} placeholder="可选" onChange={(event) => patchRow(row.rowKey, { code: event.target.value })} />,
    },
    {
      title: '颜色', dataIndex: 'color', width: 140,
      render: (text, row) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 黑色" onChange={(event) => patchRow(row.rowKey, { color: event.target.value })} />,
    },
    ...(materialType === 'fabric' ? [
      {
        title: '幅宽', dataIndex: 'width', width: 130,
        render: (text: string | undefined, row: SpecificationDraft) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 150cm" onChange={(event) => patchRow(row.rowKey, { width: event.target.value })} />,
      },
      {
        title: '克重', dataIndex: 'grammage', width: 130,
        render: (text: string | undefined, row: SpecificationDraft) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 180g/m²" onChange={(event) => patchRow(row.rowKey, { grammage: event.target.value })} />,
      },
    ] : [
      {
        title: '规格', dataIndex: 'specification', width: 180,
        render: (text: string | undefined, row: SpecificationDraft) => <Input className="oc-excel-cell-text-input" value={text} placeholder="如 20mm" onChange={(event) => patchRow(row.rowKey, { specification: event.target.value })} />,
      },
    ]),
    {
      title: '状态', dataIndex: 'active', width: 90, align: 'center',
      render: (active, row) => <Switch size="small" checked={active !== false} checkedChildren="启用" unCheckedChildren="停用" onChange={(checked) => patchRow(row.rowKey, { active: checked })} />,
    },
    {
      title: '操作', key: 'actions', width: 104, fixed: 'right',
      render: (_, row) => (
        <Space className="oc-excel-row-actions" size={0}>
          <Button type="text" aria-label="复制规格" icon={<CopyOutlined />} onClick={() => emit([...rows, { ...row, id: undefined, code: undefined, rowKey: createRowKey() }])} />
          <Button type="text" danger aria-label="删除规格" icon={<DeleteOutlined />} onClick={() => emit(rows.filter((item) => item.rowKey !== row.rowKey))} />
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Text type="secondary">每一行代表一种可以单独采购、库存和领用的真实规格。</Text>
      <Table<SpecificationDraft>
        className="oc-excel-entry-table material-specification-editor"
        rowKey="rowKey"
        columns={columns}
        dataSource={rows}
        pagination={false}
        size="small"
        scroll={{ x: materialType === 'fabric' ? 760 : 660 }}
        locale={{ emptyText: '请添加至少一个最小规格' }}
      />
      <Button icon={<PlusOutlined />} onClick={() => emit([...rows, { rowKey: createRowKey(), label: '通用规格', active: true }])}>
        添加规格
      </Button>
    </Space>
  );
}
