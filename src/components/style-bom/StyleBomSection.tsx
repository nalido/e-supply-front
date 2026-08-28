import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Button, Empty, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import type { StyleBomLineDraft, StyleBomValidationIssue } from '../../types/style';
import ListImage from '../common/ListImage';
import StyleBomEditorDrawer from './StyleBomEditorDrawer';
import '../../styles/matrix-table.css';

const { Text, Title } = Typography;
const materialColumnWidth = 360;
const sizeColumnWidth = 160;

type Props = {
  lines: StyleBomLineDraft[];
  colors: string[];
  sizes: string[];
  validationIssues: StyleBomValidationIssue[];
  onAdd: (line: Omit<StyleBomLineDraft, 'uid' | 'id'>) => void;
  onUpdate: (uid: string, line: StyleBomLineDraft) => void;
  onRemove: (uid: string) => void;
  onUpdateSizeConsumption: (uid: string, size: string, consumption: number | null) => void;
  onCopySizeConsumptions: (sourceSize: string, targetSize: string, color: string) => void;
};

export default function StyleBomSection({
  lines,
  colors,
  sizes,
  validationIssues,
  onAdd,
  onUpdate,
  onRemove,
  onUpdateSizeConsumption,
  onCopySizeConsumptions,
}: Props) {
  const { message } = AntdApp.useApp();
  const configuredColors = useMemo(() => Array.from(new Set(lines.flatMap((line) => line.applicableColors))), [lines]);
  const visibleColors = useMemo(
    () => [...colors, ...configuredColors.filter((color) => !colors.includes(color))],
    [colors, configuredColors],
  );
  const [activeColor, setActiveColor] = useState(visibleColors[0] ?? '');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string>();
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceSize, setCopySourceSize] = useState<string>();
  const [copyTargetSize, setCopyTargetSize] = useState<string>();
  const editingLine = lines.find((item) => item.uid === editingUid);
  const activeLines = useMemo(
    () => lines.filter((line) => line.applicableColors.includes(activeColor)),
    [activeColor, lines],
  );

  useEffect(() => {
    if (!visibleColors.includes(activeColor)) {
      setActiveColor(visibleColors[0] ?? '');
    }
  }, [activeColor, visibleColors]);

  const issueMap = useMemo(() => validationIssues.reduce<Record<string, StyleBomValidationIssue[]>>((acc, issue) => {
    acc[issue.uid] = [...(acc[issue.uid] ?? []), issue];
    return acc;
  }, {}), [validationIssues]);

  const openNew = () => {
    if (!activeColor || !colors.includes(activeColor)) {
      return;
    }
    setEditingUid(undefined);
    setEditorOpen(true);
  };

  const openEdit = (uid: string) => {
    setEditingUid(uid);
    setEditorOpen(true);
  };

  const locateIssue = (issue: StyleBomValidationIssue) => {
    const line = lines.find((item) => item.uid === issue.uid);
    const targetColor = issue.color || line?.applicableColors[0];
    if (targetColor) {
      setActiveColor(targetColor);
    }
  };

  const renderMaterial = (line: StyleBomLineDraft) => (
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
  );

  const bindingColumns: ColumnsType<StyleBomLineDraft> = [
    {
      title: '物料规格',
      key: 'material',
      render: (_, line) => renderMaterial(line),
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
      width: 150,
      render: (_, line) => (
        <Space className="oc-excel-row-actions" size={0}>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(line.uid)}>设置</Button>
          <Popconfirm
            title={`从 ${activeColor} 用料中移除？`}
            description={`只会移除这项物料在 ${activeColor} 各尺码下的用量，不影响其他颜色。`}
            onConfirm={() => onRemove(line.uid)}
          >
            <Button type="text" danger icon={<DeleteOutlined />}>移除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sizeMatrixColumns: ColumnsType<StyleBomLineDraft> = [
    {
      title: '物料规格',
      key: 'material',
      width: materialColumnWidth,
      fixed: 'left',
      render: (_, line) => renderMaterial(line),
    },
    ...sizes.map((size) => {
      const completed = activeLines.filter((line) => (
        line.sizeConsumptions.find((item) => item.size === size)?.consumption != null
      )).length;
      return {
        title: (
          <span className="style-bom-size-matrix-column-title">
            <Text strong>{size} 码</Text>
            <Tag color={activeLines.length > 0 && completed === activeLines.length ? 'success' : 'default'}>
              {completed}/{activeLines.length}
            </Tag>
          </span>
        ),
        key: `consumption-${size}`,
        width: sizeColumnWidth,
        render: (_: unknown, line: StyleBomLineDraft) => {
          const value = line.sizeConsumptions.find((item) => item.size === size)?.consumption ?? null;
          return (
            <InputNumber
              key={`${line.uid}-${size}`}
              aria-label={`${activeColor} ${size} 码单件用量`}
              className="oc-excel-cell-input style-bom-size-input"
              min={0}
              precision={4}
              controls={false}
              suffix={line.unit || undefined}
              value={value}
              placeholder="必填"
              status={value == null ? 'error' : undefined}
              onChange={(next) => onUpdateSizeConsumption(line.uid, size, next == null ? null : Number(next))}
            />
          );
        },
      };
    }),
  ];

  const copySourceOptions = sizes.map((size) => ({ value: size, label: `${size} 码` }));
  const copyTargetOptions = sizes
    .filter((size) => size !== copySourceSize)
    .map((size) => ({ value: size, label: `${size} 码` }));
  const activeColorAvailable = colors.includes(activeColor);

  return (
    <div className="style-bom-section" data-testid="style-bom-section">
      <div className="style-bom-section-header">
        <div className="style-bom-title-row">
          <Title level={5}>款式用料</Title>
          <Tooltip title="先按款式颜色（SKC）维护各自的物料清单，再分别填写各尺码的单件用量。">
            <QuestionCircleOutlined className="style-bom-help-icon" aria-label="款式用料说明" />
          </Tooltip>
        </div>
      </div>

      {validationIssues.length ? (
        <Alert
          className="style-bom-validation-summary"
          type="warning"
          showIcon
          message={`还有 ${validationIssues.length} 项用料信息需要处理`}
          action={validationIssues[0]?.uid !== '__bom__' ? (
            <Button size="small" onClick={() => locateIssue(validationIssues[0])}>定位处理</Button>
          ) : undefined}
        />
      ) : null}

      {!visibleColors.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先维护款式颜色，再配置各颜色用料" />
      ) : (
        <div className="style-bom-color-workspace">
          <div className="style-bom-color-heading">
            <Text strong>颜色（SKC）</Text>
            <Tooltip title="每个颜色拥有独立的物料清单和尺码用量，修改当前颜色不会影响其他颜色。">
              <QuestionCircleOutlined className="style-bom-help-icon" aria-label="颜色用料说明" />
            </Tooltip>
          </div>
          <Tabs
            className="style-bom-color-tabs"
            activeKey={activeColor}
            onChange={setActiveColor}
            items={visibleColors.map((color) => {
              const materialCount = lines.filter((line) => line.applicableColors.includes(color)).length;
              return {
                key: color,
                label: (
                  <span className="style-bom-color-tab-label">
                    <Text strong>{color}</Text>
                    <Tag>{materialCount} 项</Tag>
                    {!colors.includes(color) ? <Tag color="error">已移除</Tag> : null}
                  </span>
                ),
              };
            })}
          />

          <div className="style-bom-color-content">
            {!activeColorAvailable ? (
              <Alert type="error" showIcon message={`${activeColor} 已不在款式颜色中，请移除该颜色下的用料或恢复这个颜色。`} />
            ) : null}

            <div className="style-bom-binding-panel">
              <div className="style-bom-binding-header">
                <div className="style-bom-title-row">
                  <Text strong>物料清单</Text>
                  <Tag>{activeLines.length} 项</Tag>
                  <Tooltip title={`这里只维护 ${activeColor} 使用的物料规格、损耗率和备注。`}>
                    <QuestionCircleOutlined className="style-bom-help-icon" aria-label={`${activeColor}物料清单说明`} />
                  </Tooltip>
                </div>
                <Space className="style-bom-binding-actions" size={8}>
                  <Button icon={<PlusOutlined />} disabled={!activeColorAvailable} onClick={openNew}>添加面辅料</Button>
                </Space>
              </div>
              {activeLines.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${activeColor} 还没有绑定物料`} />
              ) : (
                <Table<StyleBomLineDraft>
                  className="style-bom-binding-table"
                  rowKey="uid"
                  columns={bindingColumns}
                  dataSource={activeLines}
                  pagination={false}
                  size="small"
                  scroll={{ x: 680 }}
                  rowClassName={(line) => (issueMap[line.uid]?.some((issue) => !issue.size)
                    ? 'style-bom-size-material-row--error'
                    : '')}
                />
              )}
            </div>

            {!sizes.length ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先维护款式尺码，再配置各尺码用量" />
            ) : (
              <div className="style-bom-size-workspace">
                <div className="style-bom-size-toolbar">
                  <div className="style-bom-title-row">
                    <Text strong>各尺码单件用量</Text>
                    <Tooltip title={`横向查看并编辑 ${activeColor} 各物料在全部尺码下的单件用量。`}>
                      <QuestionCircleOutlined className="style-bom-help-icon" aria-label="各尺码用量说明" />
                    </Tooltip>
                  </div>
                  <Button
                    icon={<CopyOutlined />}
                    disabled={!activeLines.length || sizes.length < 2}
                    onClick={() => {
                      setCopySourceSize(undefined);
                      setCopyTargetSize(undefined);
                      setCopyOpen(true);
                    }}
                  >
                    复制尺码用量
                  </Button>
                </div>

                {activeLines.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`请先为 ${activeColor} 添加物料`} />
                ) : (
                  <Table<StyleBomLineDraft>
                    className="oc-excel-entry-table style-bom-size-material-table"
                    rowKey="uid"
                    columns={sizeMatrixColumns}
                    dataSource={activeLines}
                    pagination={false}
                    size="small"
                    scroll={{ x: Math.max(640, materialColumnWidth + sizes.length * sizeColumnWidth) }}
                    rowClassName={(line) => (issueMap[line.uid]?.length
                      ? 'style-bom-size-material-row--error'
                      : '')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <StyleBomEditorDrawer
        open={editorOpen}
        initialValue={editingLine}
        color={activeColor}
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

      <Modal
        title={`复制 ${activeColor} 尺码用量`}
        open={copyOpen}
        okText="复制并覆盖"
        cancelText="取消"
        okButtonProps={{ disabled: !copySourceSize || !copyTargetSize || copySourceSize === copyTargetSize }}
        onCancel={() => setCopyOpen(false)}
        onOk={() => {
          if (!copySourceSize || !copyTargetSize || copySourceSize === copyTargetSize) return;
          onCopySizeConsumptions(copySourceSize, copyTargetSize, activeColor);
          setCopyOpen(false);
          message.success(`已将 ${activeColor} · ${copySourceSize} 码用量复制到 ${copyTargetSize} 码`);
        }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>系统会按 {activeColor} 已绑定的物料，把来源尺码的用量逐项覆盖到目标尺码。</Text>
          <div className="style-bom-copy-size-grid">
            <label>
              <Text type="secondary">来源尺码</Text>
              <Select
                value={copySourceSize}
                placeholder="请选择来源尺码"
                options={copySourceOptions}
                onChange={(value) => {
                  setCopySourceSize(value);
                  if (copyTargetSize === value) setCopyTargetSize(undefined);
                }}
              />
            </label>
            <label>
              <Text type="secondary">目标尺码</Text>
              <Select
                value={copyTargetSize}
                placeholder="请选择目标尺码"
                options={copyTargetOptions}
                onChange={setCopyTargetSize}
              />
            </label>
          </div>
          <Alert type="warning" showIcon message={`只会覆盖 ${activeColor} · 目标尺码的用量，不影响其他颜色和物料绑定。`} />
        </Space>
      </Modal>
    </div>
  );
}
