import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd/es/upload/interface';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  DeleteOutlined,
  HolderOutlined,
  InboxOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';
import type { SampleProcessStep, SampleQuantityMatrix } from '../../types/sample';
import type {
  SampleCreationAttachment,
  SampleCreationMeta,
  StaffOption,
} from '../../types/sample-create';
import type { StyleData } from '../../types/style';
import sampleOrderApi, { type SampleOrderCreateInput } from '../../api/sample-order';
import stylesApi from '../../api/styles';

const { Text } = Typography;
const { TextArea } = Input;

interface SampleOrderFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
}

interface SampleOrderFormValues {
  styleId?: string;
  styleCode: string;
  styleName: string;
  unit: string;
  orderNo?: string;
  sampleTypeId?: string;
  customerId?: string;
  patternPrice?: number;
  orderDate?: Dayjs;
  deliveryDate?: Dayjs;
  merchandiserId?: string;
  patternMakerId?: string;
  patternNo?: string;
  sampleSewerId?: string;
  remarks?: string;
}

type StaffRole = 'merchandiser' | 'patternMaker' | 'sampleSewer';

type StyleListState = {
  open: boolean;
  loading: boolean;
  keyword: string;
  page: number;
  pageSize: number;
  total: number;
  data: StyleData[];
};

const generateId = () => `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const generateSampleNo = () => `SMP-${dayjs().format('YYYYMMDDHHmmss')}`;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const buildQuantityMatrix = (
  colors: string[],
  sizes: string[],
  prev?: SampleQuantityMatrix,
): SampleQuantityMatrix => {
  return colors.reduce<SampleQuantityMatrix>((matrix, color) => {
    matrix[color] = sizes.reduce<Record<string, number>>((row, size) => {
      row[size] = prev?.[color]?.[size] ?? 0;
      return row;
    }, {});
    return matrix;
  }, {});
};

const sumMatrix = (matrix: SampleQuantityMatrix): number => {
  return Object.values(matrix).reduce((grandTotal, row) => {
    return grandTotal + Object.values(row).reduce((rowTotal, value) => rowTotal + Number(value || 0), 0);
  }, 0);
};

const ProcessListItem: React.FC<{
  process: SampleProcessStep;
  onRemove: (id: string) => void;
}> = ({ process, onRemove }) => {
  const { attributes, listeners, transform, transition, setNodeRef } = useSortable({ id: process.id });
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 16px',
    border: '1px solid #f0f0f0',
    borderRadius: 8,
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={containerStyle}>
      <div style={{ display: 'flex', flex: 1, gap: 12 }}>
        <div
          style={{ cursor: 'grab', color: '#999', lineHeight: '24px' }}
          {...attributes}
          {...listeners}
        >
          <HolderOutlined />
        </div>
        <div style={{ flex: 1 }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>
              {process.order}. {process.name}
            </Text>
            <Space size={8} wrap>
              {process.department && <Tag>{process.department}</Tag>}
              {process.tags?.map((tag) => (
                <Tag key={tag} color="blue">
                  {tag}
                </Tag>
              ))}
              {process.defaultDuration ? (
                <Tag color="purple">{process.defaultDuration} 天</Tag>
              ) : null}
              {process.custom ? <Tag color="gold">自定义</Tag> : null}
            </Space>
            {process.description ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {process.description}
              </Text>
            ) : null}
          </Space>
        </div>
      </div>
      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(process.id)} />
    </div>
  );
};

const ProcessList: React.FC<{
  processes: SampleProcessStep[];
  onRemove: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}> = ({ processes, onRemove, onReorder }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: { active: { id: string }; over?: { id: string } }) => {
      if (!event.over || event.active.id === event.over.id) {
        return;
      }
      onReorder(event.active.id, event.over.id);
    },
    [onReorder],
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={processes.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {processes.length === 0 ? (
            <Empty description="拖拽或点击左侧工序以添加" style={{ margin: '24px 0' }} />
          ) : (
            processes.map((process) => (
              <ProcessListItem key={process.id} process={process} onRemove={onRemove} />
            ))
          )}
        </Space>
      </SortableContext>
    </DndContext>
  );
};

const SkuMatrixTable: React.FC<{
  colors: string[];
  sizes: string[];
  matrix: SampleQuantityMatrix;
  onChange: (matrix: SampleQuantityMatrix) => void;
}> = ({ colors, sizes, matrix, onChange }) => {
  const handleChange = useCallback(
    (color: string, size: string, value: number | null) => {
      const next: SampleQuantityMatrix = { ...matrix };
      next[color] = { ...next[color], [size]: Number(value ?? 0) };
      onChange(next);
    },
    [matrix, onChange],
  );

  const columnTotals = useMemo(() => {
    return sizes.map((size) => {
      return colors.reduce((total, color) => total + Number(matrix[color]?.[size] ?? 0), 0);
    });
  }, [colors, sizes, matrix]);

  const grandTotal = useMemo(() => sumMatrix(matrix), [matrix]);

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #f0f0f0', padding: '8px', background: '#fafafa' }}>颜色/尺码</th>
            {sizes.map((size) => (
              <th key={size} style={{ border: '1px solid #f0f0f0', padding: '8px', background: '#fafafa' }}>{size}</th>
            ))}
            <th style={{ border: '1px solid #f0f0f0', padding: '8px', background: '#fafafa' }}>合计</th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color) => {
            const rowTotal = sizes.reduce((total, size) => total + Number(matrix[color]?.[size] ?? 0), 0);
            return (
              <tr key={color}>
                <td style={{ border: '1px solid #f0f0f0', padding: '8px', background: '#fafafa' }}>{color}</td>
                {sizes.map((size) => (
                  <td key={size} style={{ border: '1px solid #f0f0f0', padding: '4px 8px' }}>
                    <InputNumber
                      min={0}
                      precision={0}
                      controls={false}
                      value={matrix[color]?.[size] ?? 0}
                      onChange={(value) => handleChange(color, size, value)}
                      style={{ width: '100%' }}
                    />
                  </td>
                ))}
                <td style={{ border: '1px solid #f0f0f0', padding: '8px' }}>
                  <Text strong>{rowTotal}</Text>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ border: '1px solid #f0f0f0', padding: '8px', background: '#fafafa' }}>合计</td>
            {columnTotals.map((total, index) => (
              <td key={sizes[index]} style={{ border: '1px solid #f0f0f0', padding: '8px' }}>
                <Text strong>{total}</Text>
              </td>
            ))}
            <td style={{ border: '1px solid #f0f0f0', padding: '8px' }}>
              <Text strong>{grandTotal}</Text>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const StaffSelect: React.FC<{
  role: StaffRole;
  label: string;
  options: StaffOption[];
}> = ({ role, label, options }) => (
  <Form.Item name={`${role}Id`} label={label}>
    <Select
      allowClear
      showSearch
      placeholder={`请选择${label}`}
      optionFilterProp="label"
      options={options.map((item) => ({
        label: item.name,
        value: item.id,
        item,
      }))}
    />
  </Form.Item>
);

const StyleSelectorDrawer: React.FC<{
  state: StyleListState;
  onStateChange: (updater: (prev: StyleListState) => StyleListState) => void;
  onClose: () => void;
  onSelect: (style: StyleData) => void;
  messageApi: MessageInstance;
}> = ({ state, onStateChange, onClose, onSelect, messageApi }) => {
  const handleSearch = useCallback(
    async (nextKeyword: string, page: number = 1) => {
      onStateChange((prev) => ({ ...prev, loading: true, keyword: nextKeyword, page }));
      try {
        const result = await stylesApi.list({
          page,
          pageSize: state.pageSize,
          keyword: nextKeyword,
        });
        onStateChange((prev) => ({
          ...prev,
          loading: false,
          data: result.list,
          total: result.total,
          page: result.page,
        }));
      } catch (error) {
        console.error(error);
        messageApi.error('加载款式失败，请稍后重试');
        onStateChange((prev) => ({ ...prev, loading: false }));
      }
    },
    [state.pageSize, onStateChange, messageApi],
  );

  useEffect(() => {
    if (state.open) {
      void handleSearch(state.keyword, state.page);
    }
  }, [state.open, state.keyword, state.page, handleSearch]);

  return (
    <Drawer
      title="选择款式"
      open={state.open}
      width={480}
      onClose={onClose}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Input.Search
          allowClear
          placeholder="输入款号或款名搜索"
          enterButton={<SearchOutlined />}
          onSearch={(value) => void handleSearch(value.trim(), 1)}
          defaultValue={state.keyword}
        />
        <Spin spinning={state.loading}>
          {state.data.length === 0 ? (
            <Empty description="未找到匹配的款式" style={{ marginTop: 80 }} />
          ) : (
            <List
              grid={{ gutter: 16, column: 1 }}
              dataSource={state.data}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <Card
                    hoverable
                    onClick={() => onSelect(item)}
                    cover={
                      item.image ? (
                        <div
                          style={{
                            height: 180,
                            background: '#fafafa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            padding: 8,
                          }}
                        >
                          <img
                            src={item.image}
                            alt={item.styleName}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      ) : (
                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                          <PictureOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
                        </div>
                      )
                    }
                  >
                    <Space direction="vertical" size={4}>
                      <Text strong>{item.styleName}</Text>
                      <Text type="secondary">款号：{item.styleNo}</Text>
                      <Space size={4} wrap>
                        {item.colors.slice(0, 6).map((color) => (
                          <Tag key={color}>{color}</Tag>
                        ))}
                      </Space>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Spin>
        <Pagination
          current={state.page}
          pageSize={state.pageSize}
          total={state.total}
          onChange={(page) => void handleSearch(state.keyword, page)}
        />
      </Space>
    </Drawer>
  );
};

const SampleOrderFormModal: React.FC<SampleOrderFormModalProps> = ({ visible, onCancel, onOk }) => {
  const [form] = Form.useForm<SampleOrderFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [meta, setMeta] = useState<SampleCreationMeta>();
  const [loading, setLoading] = useState(false);
  const [initializeLoading, setInitializeLoading] = useState(false);
  const [processes, setProcesses] = useState<SampleProcessStep[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<SampleQuantityMatrix>({});
  const [colorImagesEnabled, setColorImagesEnabled] = useState(false);
  const [colorImageMap, setColorImageMap] = useState<Record<string, string | undefined>>({});
  const [attachments, setAttachments] = useState<SampleCreationAttachment[]>([]);
  const [styleState, setStyleState] = useState<StyleListState>({
    open: false,
    loading: false,
    keyword: '',
    page: 1,
    pageSize: 8,
    total: 0,
    data: [],
  });
  const [customProcessVisible, setCustomProcessVisible] = useState(false);
  const [customProcessForm] = Form.useForm();

  const resetForm = useCallback((metaData: SampleCreationMeta) => {
    const defaultColors = metaData.colorPresets.slice(0, 2);
    const defaultSizes = metaData.sizePresets.slice(0, 4);
    setColors(defaultColors);
    setSizes(defaultSizes);
    const initialMatrix = buildQuantityMatrix(defaultColors, defaultSizes);
    setMatrix(initialMatrix);
    setColorImagesEnabled(false);
    setColorImageMap({});
    setAttachments([]);
    setProcesses(metaData.defaultProcesses.map((item, index) => ({ ...item, order: index + 1 })));
    form.resetFields();
    form.setFieldsValue({
      unit: metaData.units[0],
      sampleTypeId: metaData.sampleTypes[0]?.id ? String(metaData.sampleTypes[0]?.id) : undefined,
      orderDate: dayjs(),
      deliveryDate: dayjs().add(7, 'day'),
    });
  }, [form]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setInitializeLoading(true);
    void (async () => {
      try {
        const metaData = await sampleOrderApi.getMeta();
        setMeta(metaData);
        resetForm(metaData);
      } catch (error) {
        console.error(error);
        messageApi.error('加载样板单创建配置失败，请稍后重试');
      } finally {
        setInitializeLoading(false);
      }
    })();
  }, [visible, resetForm, messageApi]);

  const handleClose = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleMatrixChange = useCallback((nextMatrix: SampleQuantityMatrix) => {
    setMatrix(nextMatrix);
  }, []);

  const addProcess = useCallback((template: SampleProcessStep | { id: string; name: string; defaultDuration?: number; department?: string; description?: string; tags?: string[] }) => {
    setProcesses((prev) => {
      if (prev.some((item) => item.id === template.id)) {
        return prev;
      }
      const next = prev.concat({
        ...template,
        order: prev.length + 1,
        custom: 'custom' in template ? template.custom : template.id.startsWith('custom-'),
      } as SampleProcessStep);
      return next;
    });
  }, []);

  const removeProcess = useCallback((id: string) => {
    setProcesses((prev) => prev.filter((process) => process.id !== id).map((process, index) => ({
      ...process,
      order: index + 1,
    })));
  }, []);

  const reorderProcess = useCallback((activeId: string, overId: string) => {
    setProcesses((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === activeId);
      const newIndex = prev.findIndex((item) => item.id === overId);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }
      const reordered = arrayMove(prev, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index + 1,
      }));
      return reordered;
    });
  }, []);

  const handleColorsUpdate = useCallback((nextColors: string[]) => {
    const normalized = Array.from(new Set(nextColors.map((item) => item.trim()).filter(Boolean)));
    setColors(normalized);
    setMatrix((prev) => buildQuantityMatrix(normalized, sizes, prev));
    setColorImageMap((prev) => {
      const next: Record<string, string | undefined> = {};
      normalized.forEach((color) => {
        next[color] = prev[color];
      });
      return next;
    });
  }, [sizes]);

  const handleSizesUpdate = useCallback((nextSizes: string[]) => {
    const normalized = Array.from(new Set(nextSizes.map((item) => item.trim()).filter(Boolean)));
    setSizes(normalized);
    setMatrix((prev) => buildQuantityMatrix(colors, normalized, prev));
  }, [colors]);

  const handleAttachmentRemove = useCallback((id: string) => {
    setAttachments((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length > 0 && !filtered.some((item) => item.isMain)) {
        const [first, ...rest] = filtered;
        return [{ ...first, isMain: true }, ...rest];
      }
      return filtered;
    });
  }, []);

  const setAttachmentAsMain = useCallback((id: string) => {
    setAttachments((prev) => prev.map((item) => ({ ...item, isMain: item.id === id })));
  }, []);

  const appendAttachment = useCallback((url: string) => {
    setAttachments((prev) => {
      const next: SampleCreationAttachment[] = prev.map((item) => ({ ...item, isMain: false }));
      const id = generateId();
      next.unshift({ id, url, isMain: true, createdAt: new Date().toISOString() });
      return next;
    });
  }, []);

  const handleImagePaste = useCallback(async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
    if (imageItems.length === 0) {
      return;
    }
    event.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) {
        const base64 = await fileToBase64(file);
        appendAttachment(base64);
      }
    }
    messageApi.success('图片已粘贴到样板单');
  }, [appendAttachment, messageApi]);

  const uploadProps = useMemo<UploadProps>(() => ({
    multiple: true,
    listType: 'picture-card',
    showUploadList: false,
    beforeUpload: async (file) => {
      const base64 = await fileToBase64(file);
      appendAttachment(base64);
      return false;
    },
  }), [appendAttachment]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!meta) {
        messageApi.error('元数据加载失败，请刷新页面');
        return;
      }
      if (processes.length === 0) {
        messageApi.error('请至少添加一道加工工序');
        return;
      }
      if (colors.length === 0 || sizes.length === 0) {
        messageApi.error('请至少保留一个颜色和尺码');
        return;
      }
      if (!values.styleId) {
        messageApi.error('请选择款式');
        return;
      }
      if (!values.customerId) {
        messageApi.error('请选择客户');
        return;
      }

      setLoading(true);

      const totalQuantity = sumMatrix(matrix);
      const skus = colors.flatMap((color) =>
        sizes.map((size) => ({
          color,
          size,
          quantity: matrix[color]?.[size] ?? 0,
        })),
        ).filter((item) => item.quantity > 0);

      const baseAttachments = attachments.map((attachment, index) => ({
        type: 'ATTACHMENT' as const,
        url: attachment.url,
        name: attachment.id,
        fileType: 'image',
        isMain: attachment.isMain,
        sortOrder: index,
      }));

      const colorAttachments = colorImagesEnabled
        ? colors
            .map((color, index) => ({
              type: 'COLOR_IMAGE' as const,
              url: colorImageMap[color],
              color,
              sortOrder: index,
            }))
            .filter((asset) => Boolean(asset.url))
        : [];

      const payload: SampleOrderCreateInput = {
        sampleNo: values.orderNo?.trim() || generateSampleNo(),
        sampleTypeId: values.sampleTypeId,
        customerId: values.customerId,
        styleId: values.styleId,
        unit: values.unit,
        quantity: totalQuantity,
        unitPrice: values.patternPrice,
        totalAmount: values.patternPrice && totalQuantity ? values.patternPrice * totalQuantity : undefined,
        deadline: values.deliveryDate?.format('YYYY-MM-DD'),
        expectedFinishDate: values.deliveryDate?.format('YYYY-MM-DD'),
        orderDate: values.orderDate?.format('YYYY-MM-DD'),
        merchandiserId: values.merchandiserId,
        patternMakerId: values.patternMakerId,
        sampleSewerId: values.sampleSewerId,
        patternNo: values.patternNo,
        remarks: values.remarks,
        skus,
        processes: processes.map((process, index) => ({
          processCatalogId: process.id,
          sequence: index + 1,
          plannedDurationMinutes: process.defaultDuration,
        })),
        costs: [],
        assets: [...baseAttachments, ...colorAttachments],
      };

      await sampleOrderApi.create(payload);
      messageApi.success('样板单创建成功');
      onOk();
      handleClose();
    } catch (error) {
      const maybeValidation = error as { errorFields?: unknown };
      if (maybeValidation?.errorFields) {
        messageApi.error('请完善必填信息');
      } else {
        if (error instanceof Error) {
          console.error(error);
        }
        messageApi.error('创建失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }, [form, meta, processes, colors, sizes, matrix, colorImagesEnabled, colorImageMap, attachments, onOk, handleClose, messageApi]);

  const handleStyleSelect = useCallback((style: StyleData) => {
    form.setFieldsValue({
      styleId: style.id,
      styleCode: style.styleNo,
      styleName: style.styleName,
    });
    if (style.colors?.length) {
      handleColorsUpdate(style.colors);
    }
    if (style.sizes?.length) {
      handleSizesUpdate(style.sizes);
    }
    if (style.image) {
      appendAttachment(style.image);
    }
    setStyleState((prev) => ({ ...prev, open: false }));
  }, [appendAttachment, form, handleColorsUpdate, handleSizesUpdate]);

  const handleCustomProcessOk = useCallback(async () => {
    try {
      const values = await customProcessForm.validateFields();
      const newProcess: SampleProcessStep = {
        id: `custom-${Date.now()}`,
        name: values.name,
        order: processes.length + 1,
        defaultDuration: values.duration,
        department: values.department,
        description: values.description,
        tags: ['自定义'],
        custom: true,
      };
      addProcess(newProcess);
      setCustomProcessVisible(false);
      customProcessForm.resetFields();
    } catch (error) {
      console.error(error);
    }
  }, [customProcessForm, processes.length, addProcess]);

  const handleColorImageUpload = useCallback(async (color: string, file: File) => {
    const base64 = await fileToBase64(file);
    setColorImageMap((prev) => ({ ...prev, [color]: base64 }));
    return false;
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <>
      {messageContextHolder}
      <Modal
        open={visible}
        title="新建样板单"
        width={1080}
        okText="确定"
        cancelText="取消"
        confirmLoading={loading}
        onCancel={handleClose}
        onOk={handleSubmit}
        destroyOnHidden
        maskClosable={false}
      >
        <Spin spinning={initializeLoading}>
          <div>
            <Form form={form} layout="vertical" colon={false}>
              <Divider orientation="left">核心信息</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div
                      style={{
                        position: 'relative',
                        border: '1px dashed #d9d9d9',
                        borderRadius: 8,
                        padding: 16,
                        minHeight: 220,
                        background: '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                      onPaste={handleImagePaste}
                      role="presentation"
                    >
                      {attachments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 0' }}>
                          <InboxOutlined style={{ fontSize: 32, color: '#bfbfbf', marginBottom: 8 }} />
                          <Text type="secondary">可拖拽、粘贴或上传样板图片</Text>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {attachments.map((item) => (
                            <Dropdown
                              key={item.id}
                              trigger={['contextMenu']}
                              menu={{
                                items: [
                                  {
                                    key: 'main',
                                    label: '设为主图',
                                    onClick: () => setAttachmentAsMain(item.id),
                                  },
                                  {
                                    key: 'remove',
                                    label: '移除',
                                    danger: true,
                                    onClick: () => handleAttachmentRemove(item.id),
                                  },
                                ],
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  width: 96,
                                  height: 96,
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  border: item.isMain ? '2px solid #1677ff' : '1px solid #f0f0f0',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                }}
                              >
                                <img src={item.url} alt="样板图" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {item.isMain ? (
                                  <Tag color="processing" style={{ position: 'absolute', top: 8, left: 8 }}>
                                    主图
                                  </Tag>
                                ) : null}
                              </div>
                            </Dropdown>
                          ))}
                        </div>
                      )}
                      <Upload {...uploadProps}>
                        <Button type="dashed" block icon={<PlusOutlined />}>上传图片</Button>
                      </Upload>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        支持鼠标拖拽、文件上传或 Ctrl + V 粘贴图片，右键图片可设为主图
                      </Text>
                    </div>
                  </Space>
                </Col>
                <Col span={16}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="styleCode"
                        label="款号"
                        rules={[{ required: true, message: '请输入款号' }]}
                      >
                        <Input
                          placeholder="请输入款号"
                          addonAfter={<Button type="link" onClick={() => setStyleState((prev) => ({ ...prev, open: true }))}>选择</Button>}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="styleName"
                        label="款名"
                        rules={[{ required: true, message: '请输入款名' }]}
                      >
                        <Input placeholder="请输入款名" />
                      </Form.Item>
                    </Col>
                    <Form.Item name="styleId" hidden>
                      <Input />
                    </Form.Item>
                    <Col span={12}>
                      <Form.Item
                        name="unit"
                        label="单位"
                        rules={[{ required: true, message: '请选择单位' }]}
                      >
                        <Select
                          placeholder="请选择单位"
                          options={meta?.units.map((unit) => ({ label: unit, value: unit }))}
                          showSearch
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="orderNo" label="样板单号">
                        <Input placeholder="留空时自动生成" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="sampleTypeId" label="板类">
                        <Select
                          allowClear
                          placeholder="请选择板类"
                          options={meta?.sampleTypes.map((item) => ({ label: item.name, value: String(item.id) }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="customerId" label="客户">
                        <Select
                          allowClear
                          showSearch
                          placeholder="请选择客户"
                          optionFilterProp="label"
                          options={meta?.customers.map((item) => ({ label: item.name, value: String(item.id) }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>

              <Divider orientation="left">详细属性</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="patternPrice" label="打板价">
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      prefix="¥"
                      placeholder="请输入单价"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="orderDate" label="下板日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="deliveryDate" label="交板日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <StaffSelect role="merchandiser" label="跟单员" options={meta?.merchandisers ?? []} />
                </Col>
                <Col span={12}>
                  <StaffSelect role="patternMaker" label="纸样师" options={meta?.patternMakers ?? []} />
                </Col>
                <Col span={12}>
                  <Form.Item name="patternNo" label="纸样号">
                    <Input placeholder="请输入纸样号" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <StaffSelect role="sampleSewer" label="车板师" options={meta?.sampleSewers ?? []} />
                </Col>
                <Col span={24}>
                  <Form.Item name="remarks" label="备注">
                    <TextArea rows={2} placeholder="请输入备注" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">加工流程</Divider>
              <Row gutter={16}>
                <Col span={10}>
                  <Card size="small" title="可选工序" styles={{ body: { maxHeight: 320, overflow: 'auto' } }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {meta?.processLibrary.map((process) => (
                        <Card
                          key={process.id}
                          size="small"
                          hoverable
                          onClick={() => addProcess({ ...process, order: processes.length + 1 })}
                        >
                          <Space direction="vertical" size={4}>
                            <Text strong>{process.name}</Text>
                            <Space size={6} wrap>
                              {process.department && <Tag>{process.department}</Tag>}
                              {process.tags?.map((tag) => (
                                <Tag key={tag} color="blue">{tag}</Tag>
                              ))}
                              {process.defaultDuration ? <Tag color="purple">{process.defaultDuration} 天</Tag> : null}
                            </Space>
                            {process.description ? <Text type="secondary">{process.description}</Text> : null}
                          </Space>
                        </Card>
                      ))}
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => setCustomProcessVisible(true)}>
                        添加自定义工序
                      </Button>
                    </Space>
                  </Card>
                </Col>
                <Col span={14}>
                  <Card size="small" title="已选工序">
                    <ProcessList processes={processes} onRemove={removeProcess} onReorder={reorderProcess} />
                  </Card>
                </Col>
              </Row>

              <Divider orientation="left">SKU 定义</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="颜色">
                    <Select
                      mode="tags"
                      value={colors}
                      onChange={handleColorsUpdate}
                      placeholder="回车添加颜色"
                      tokenSeparators={[',', ' ', '、']}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="尺码">
                    <Select
                      mode="tags"
                      value={sizes}
                      onChange={handleSizesUpdate}
                      placeholder="回车添加尺码"
                      tokenSeparators={[',', ' ', '、']}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Space align="center" size={12}>
                    <Switch checked={colorImagesEnabled} onChange={setColorImagesEnabled} />
                    <Text>颜色图片</Text>
                    <Text type="secondary">开启后可为每个颜色上传配图</Text>
                  </Space>
                </Col>
                {colorImagesEnabled ? (
                  <Col span={24}>
                    <Space wrap size={16} style={{ marginTop: 12 }}>
                      {colors.map((color) => (
                        <Card key={color} size="small" style={{ width: 180 }}>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Text strong>{color}</Text>
                            {colorImageMap[color] ? (
                              <img src={colorImageMap[color]} alt={color} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                                <PictureOutlined style={{ fontSize: 36, color: '#bfbfbf' }} />
                              </div>
                            )}
                            <Upload
                              showUploadList={false}
                              accept="image/*"
                              beforeUpload={(file) => handleColorImageUpload(color, file)}
                            >
                              <Button block icon={<PlusOutlined />}>上传</Button>
                            </Upload>
                          </Space>
                        </Card>
                      ))}
                    </Space>
                  </Col>
                ) : null}
                <Col span={24}>
                  <Card size="small" title="数量矩阵">
                    <SkuMatrixTable colors={colors} sizes={sizes} matrix={matrix} onChange={handleMatrixChange} />
                  </Card>
                </Col>
              </Row>

              <Divider orientation="left">统计预览</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small">
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">SKU 数量</Text>
                      <Text strong style={{ fontSize: 20 }}>{colors.length * sizes.length}</Text>
                    </Space>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">总数量</Text>
                      <Text strong style={{ fontSize: 20 }}>{sumMatrix(matrix)}</Text>
                    </Space>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">流程节点</Text>
                      <Text strong style={{ fontSize: 20 }}>{processes.length}</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Form>
          </div>
        </Spin>
      </Modal>

      <StyleSelectorDrawer
        state={styleState}
        onStateChange={setStyleState}
        onClose={() => setStyleState((prev) => ({ ...prev, open: false }))}
        onSelect={handleStyleSelect}
        messageApi={messageApi}
      />

      <Modal
        open={customProcessVisible}
        title="添加自定义工序"
        onCancel={() => setCustomProcessVisible(false)}
        onOk={handleCustomProcessOk}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={customProcessForm} layout="vertical" colon={false}>
          <Form.Item
            name="name"
            label="工序名称"
            rules={[{ required: true, message: '请输入工序名称' }]}
          >
            <Input placeholder="例如：试穿评审" />
          </Form.Item>
          <Form.Item name="duration" label="预计耗时 (天)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="department" label="执行部门">
            <Input placeholder="请输入执行部门" />
          </Form.Item>
          <Form.Item name="description" label="工序说明">
            <TextArea rows={2} placeholder="填写工序说明" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SampleOrderFormModal;
