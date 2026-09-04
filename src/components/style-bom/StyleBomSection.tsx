import { DeleteOutlined, EditOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, InputNumber, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import type { MaterialBasicType } from '../../types/material';
import type { StyleBomLineDraft, StyleBomValidationIssue } from '../../types/style';
import ListImage from '../common/ListImage';
import StyleBomEditorDrawer from './StyleBomEditorDrawer';
import '../../styles/matrix-table.css';

const { Text, Title } = Typography;

type Props = {
  lines: StyleBomLineDraft[];
  colors: string[];
  sizes: string[];
  validationIssues: StyleBomValidationIssue[];
  onAdd: (line: Omit<StyleBomLineDraft, 'uid' | 'id'>) => void;
  onUpdate: (uid: string, line: StyleBomLineDraft) => void;
  onRemove: (uid: string) => void;
  onUpdateAverageConsumption: (uid: string, consumption: number | null) => void;
};

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string>();
  const [initialMaterialType, setInitialMaterialType] = useState<MaterialBasicType>('fabric');
  const editingLine = lines.find((item) => item.uid === editingUid);
  const fabricLines = useMemo(() => lines.filter((line) => line.materialType === 'fabric'), [lines]);
  const accessoryLines = useMemo(() => lines.filter((line) => line.materialType === 'accessory'), [lines]);

  const issueMap = useMemo(() => validationIssues.reduce<Record<string, StyleBomValidationIssue[]>>((acc, issue) => {
    acc[issue.uid] = [...(acc[issue.uid] ?? []), issue];
    return acc;
  }, {}), [validationIssues]);

  const openNew = (materialType: MaterialBasicType) => {
    setEditingUid(undefined);
    setInitialMaterialType(materialType);
    setEditorOpen(true);
  };

  const openEdit = (uid: string) => {
    const line = lines.find((item) => item.uid === uid);
    setEditingUid(uid);
    setInitialMaterialType(line?.materialType ?? 'fabric');
    setEditorOpen(true);
  };

  const renderMaterial = (line: StyleBomLineDraft) => (
    <div className="oc-excel-cell-readonly">
      <div className="style-bom-material-cell">
        <ListImage src={line.imageUrl} alt={line.materialName} width={36} height={36} borderRadius={6} />
        <div className="style-bom-list-main">
          <div className="style-bom-list-title">
            <Text strong>{line.materialName || '未选择物料'}</Text>
            <Tag color={line.materialType === 'fabric' ? 'blue' : 'purple'}>
              {line.materialType === 'fabric' ? '面料' : '辅料/包材'}
            </Tag>
          </div>
          <Text type="secondary">{line.minimumSpecification.label || '未选择规格'} · {line.materialSku || '未配置编号'}</Text>
        </div>
      </div>
    </div>
  );

  const columns: ColumnsType<StyleBomLineDraft> = [
    {
      title: '物料规格',
      key: 'material',
      width: 360,
      render: (_, line) => renderMaterial(line),
    },
    {
      title: '适用颜色',
      key: 'colors',
      width: 260,
      render: (_, line) => (
        <div className="style-bom-color-scope oc-excel-cell-readonly">
          {line.applyToAllColors ? (
            <Tag color="success">全部颜色</Tag>
          ) : line.applicableColors.length ? (
            line.applicableColors.map((color) => <Tag key={color}>{color}</Tag>)
          ) : (
            <Text type="danger">请选择颜色</Text>
          )}
        </div>
      ),
    },
    {
      title: '平均单件用量',
      key: 'averageConsumption',
      width: 190,
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
      render: (_, line) => <span className="oc-excel-cell-readonly">{line.lossRate}%</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, line) => (
        <Space className="oc-excel-row-actions" size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(line.uid)}>设置</Button>
          <Popconfirm
            title="移除这项款式用料？"
            description="移除后，所选颜色和尺码将不再使用这项物料。"
            onConfirm={() => onRemove(line.uid)}
          >
            <Button type="text" danger icon={<DeleteOutlined />}>移除</Button>
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
        <Button icon={<PlusOutlined />} onClick={() => openNew(materialType)}>
          {materialType === 'fabric' ? '添加面料' : '添加辅料/包材'}
        </Button>
      </div>
      {dataSource.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
      ) : (
        <Table<StyleBomLineDraft>
          className="oc-excel-entry-table style-bom-summary-table"
          rowKey="uid"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          scroll={{ x: 1050 }}
          rowClassName={(line) => (issueMap[line.uid]?.length ? 'style-bom-summary-row--error' : '')}
        />
      )}
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
          action={validationIssues[0]?.uid !== '__bom__' ? (
            <Button size="small" onClick={() => openEdit(validationIssues[0].uid)}>定位处理</Button>
          ) : undefined}
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

      <StyleBomEditorDrawer
        open={editorOpen}
        initialValue={editingLine}
        initialMaterialType={initialMaterialType}
        colors={colors}
        sizes={sizes}
        onClose={() => setEditorOpen(false)}
        onApply={(line) => {
          if (editingUid) {
            onUpdate(editingUid, line);
          } else {
            const { uid, id, ...newLine } = line;
            void uid;
            void id;
            onAdd(newLine);
          }
          setEditorOpen(false);
        }}
      />
    </div>
  );
}
