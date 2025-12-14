import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios from 'axios';
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
import dayjs, { type Dayjs } from 'dayjs';
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
import type { SampleOrderDetailResponse } from '../../api/adapters/sample-order';
import materialApi from '../../api/material';
import stylesApi from '../../api/styles';
import styleDetailApi from '../../api/style-detail';
import storageApi from '../../api/storage';
import ImageUploader from '../upload/ImageUploader';
import '../../styles/sample-order-form.css';
import type { MaterialItem, MaterialBasicType } from '../../types/material';

const { Text } = Typography;
const { TextArea } = Input;

interface SampleOrderFormModalProps {
  visible: boolean;
  mode?: 'create' | 'edit';
  orderId?: string;
  onCancel: () => void;
  onOk: (result: { mode: 'create' | 'edit'; orderId?: string }) => void;
  initialSection?: SampleOrderFormSection;
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

type BomEntry = {
  uid: string;
  materialId?: string;
  materialType: MaterialBasicType;
  name: string;
  sku: string;
  unit: string;
  imageUrl?: string;
  consumption: number;
  lossRate: number;
  unitPrice?: number;
  remark?: string;
};

type OtherCostEntry = {
  uid: string;
  costType: string;
  amount: number;
};

export type SampleOrderFormSection =
  | 'core'
  | 'attachments'
  | 'attributes'
  | 'process'
  | 'materials'
  | 'otherCosts'
  | 'skuDefinitions'
  | 'skuMatrix'
  | 'sizeChart';

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

const COVER_SECTION_HEIGHT = 420;
const FALLBACK_COLOR = '未指定颜色';
const FALLBACK_SIZE = '均码';

const deriveSkuStateFromDetail = (
  skus?: SampleOrderDetailResponse['skus'],
): { colors: string[]; sizes: string[]; matrix: SampleQuantityMatrix } => {
  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();
  const seed: SampleQuantityMatrix = {};
  (skus ?? []).forEach((sku) => {
    const color = sku.color || FALLBACK_COLOR;
    const size = sku.size || FALLBACK_SIZE;
    colorSet.add(color);
    sizeSet.add(size);
    if (!seed[color]) {
      seed[color] = {};
    }
    seed[color][size] = (seed[color][size] ?? 0) + Number(sku.quantity ?? 0);
  });
  const colors = Array.from(colorSet);
  const sizes = Array.from(sizeSet);
  return {
    colors,
    sizes,
    matrix: colors.length && sizes.length ? buildQuantityMatrix(colors, sizes, seed) : {},
  };
};

const extractFileNameFromUrl = (url: string): string | undefined => {
  try {
    const cleanUrl = url.split('?')[0];
    const segments = cleanUrl.split('/');
    return segments[segments.length - 1];
  } catch (_error) {
    return undefined;
  }
};

const mapAttachmentsFromDetail = (
  assets?: SampleOrderDetailResponse['attachments'],
): SampleCreationAttachment[] => {
  const attachments = (assets ?? []).map((asset) => ({
    id: String(asset.id ?? `${asset.url}-${Math.random().toString(36).slice(2, 8)}`),
    url: asset.url,
    name: asset.name || extractFileNameFromUrl(asset.url),
    fileType: asset.fileType,
    fileSize: asset.fileSize,
    isMain: Boolean(asset.isMain),
    createdAt: new Date().toISOString(),
  }));
  if (attachments.length > 0 && !attachments.some((item) => item.isMain)) {
    attachments[0].isMain = true;
  }
  return attachments;
};

const mapColorImagesFromDetail = (
  colorImages?: SampleOrderDetailResponse['colorImages'],
): Record<string, string | undefined> => {
  return (colorImages ?? []).reduce<Record<string, string | undefined>>((acc, asset) => {
    if (asset.color) {
      acc[asset.color] = asset.url;
    }
    return acc;
  }, {});
};

const toDayjsValue = (value?: string | null) => (value ? dayjs(value) : undefined);

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

const MaterialSelectorDrawer: React.FC<{
  open: boolean;
  materialType: MaterialBasicType;
  onClose: () => void;
  onSelect: (material: MaterialItem) => void;
  messageApi: MessageInstance;
}> = ({ open, materialType, onClose, onSelect, messageApi }) => {
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<MaterialItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const appliedKeywordRef = useRef('');

  const fetchList = useCallback(async (nextPage: number = 1, keywordValue?: string) => {
    if (!open) {
      return;
    }
    setLoading(true);
    try {
      const response = await materialApi.list({
        page: nextPage,
        pageSize,
        materialType,
        keyword: keywordValue?.trim()
          ? keywordValue.trim()
          : appliedKeywordRef.current.trim()
            ? appliedKeywordRef.current.trim()
            : undefined,
      });
      setList(response.list);
      setTotal(response.total);
      setPage(nextPage);
    } catch (error) {
      console.error('加载物料失败', error);
      messageApi.error('加载物料失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [materialType, pageSize, messageApi, open]);

  useEffect(() => {
    if (open) {
      void fetchList(1);
    } else {
      setKeyword('');
    }
  }, [fetchList, open]);

  const handleSearch = useCallback(() => {
    appliedKeywordRef.current = keyword;
    void fetchList(1, keyword);
  }, [fetchList, keyword]);

  const handlePageChange = useCallback((nextPage: number, nextSize?: number) => {
    if (nextSize && nextSize !== pageSize) {
      setPageSize(nextSize);
    }
    void fetchList(nextPage);
  }, [fetchList, pageSize]);

  return (
    <Drawer
      title={materialType === 'fabric' ? '选择面料' : '选择辅料/包材'}
      open={open}
      width={520}
      onClose={onClose}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Input.Search
          placeholder="搜索物料名称或编号"
          allowClear
          enterButton={<SearchOutlined />}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={handleSearch}
        />
        <Spin spinning={loading}>
          <List
            dataSource={list}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[<Button type="link" onClick={() => onSelect(item)}>选择</Button>]}
              >
                <Space align="center" size={12}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f5f5f5' }} />
                  )}
                  <Space direction="vertical" size={2} style={{ minWidth: 0 }}>
                    <Text strong>{item.name}</Text>
                    <Text type="secondary">编号：{item.sku}</Text>
                    <Text type="secondary">单位：{item.unit}</Text>
                  </Space>
                </Space>
              </List.Item>
            )}
            locale={{ emptyText: '暂无物料' }}
          />
        </Spin>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          showQuickJumper
          onChange={handlePageChange}
        />
      </Space>
    </Drawer>
  );
};

const SampleOrderFormModal: React.FC<SampleOrderFormModalProps> = ({
  visible,
  mode = 'create',
  orderId,
  onCancel,
  onOk,
  initialSection,
}) => {
  const [form] = Form.useForm<SampleOrderFormValues>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const isEditMode = mode === 'edit';
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
  const mainAttachment = useMemo(() => attachments.find((attachment) => attachment.isMain), [attachments]);
  const [bomItems, setBomItems] = useState<BomEntry[]>([]);
  const [materialPickerState, setMaterialPickerState] = useState<{ open: boolean; type: MaterialBasicType }>({
    open: false,
    type: 'fabric',
  });
  const [otherCosts, setOtherCosts] = useState<OtherCostEntry[]>([]);
  const [sizeChartImage, setSizeChartImage] = useState<string>();
  const sectionRefs = useRef<Record<SampleOrderFormSection, HTMLDivElement | null>>({
    core: null,
    attachments: null,
    attributes: null,
    process: null,
    materials: null,
    otherCosts: null,
    skuDefinitions: null,
    skuMatrix: null,
    sizeChart: null,
  });
  const [highlightSection, setHighlightSection] = useState<SampleOrderFormSection | null>(null);
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
  const createUid = useCallback(() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);
  const fabricBomItems = useMemo(() => bomItems.filter((item) => item.materialType === 'fabric'), [bomItems]);
  const accessoryBomItems = useMemo(() => bomItems.filter((item) => item.materialType === 'accessory'), [bomItems]);
  const handleBomFieldChange = useCallback((uid: string, patch: Partial<BomEntry>) => {
    setBomItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  }, []);
  const handleBomRemove = useCallback((uid: string) => {
    setBomItems((prev) => prev.filter((item) => item.uid !== uid));
  }, []);
  const handleMaterialPickerOpen = useCallback((type: MaterialBasicType) => {
    setMaterialPickerState({ open: true, type });
  }, []);
  const handleMaterialPickerClose = useCallback(() => {
    setMaterialPickerState((prev) => ({ ...prev, open: false }));
  }, []);
  const handleMaterialSelected = useCallback((material: MaterialItem) => {
    setBomItems((prev) => {
      if (material.id && prev.some((entry) => entry.materialId === material.id)) {
        messageApi.warning('该物料已在清单中');
        return prev;
      }
      const entry: BomEntry = {
        uid: `bom-${createUid()}`,
        materialId: material.id,
        materialType: material.materialType,
        name: material.name,
        sku: material.sku,
        unit: material.unit,
        imageUrl: material.imageUrl,
        consumption: 1,
        lossRate: 0,
        unitPrice: material.price,
        remark: '',
      };
      return [...prev, entry];
    });
    setMaterialPickerState((prev) => ({ ...prev, open: false }));
  }, [createUid, messageApi]);
  const handleAddOtherCost = useCallback(() => {
    setOtherCosts((prev) => [...prev, { uid: `cost-${createUid()}`, costType: '', amount: 0 }]);
  }, [createUid]);
  const handleOtherCostChange = useCallback(
    (uid: string, field: 'costType' | 'amount', value: string | number | null) => {
      setOtherCosts((prev) =>
        prev.map((item) =>
          item.uid === uid
            ? {
                ...item,
                [field]: field === 'amount'
                  ? Number(value ?? 0)
                  : typeof value === 'string'
                    ? value
                    : '',
              }
            : item,
        ));
    },
    [],
  );
  const handleOtherCostRemove = useCallback((uid: string) => {
    setOtherCosts((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  const renderBomList = useCallback((entries: BomEntry[], emptyText: string) => {
    if (entries.length === 0) {
      return <Empty description={emptyText} style={{ margin: '12px 0' }} />;
    }
    return (
      <Space direction="vertical" size={12} className="sample-order-material-list">
        {entries.map((record) => (
          <div key={record.uid} className="sample-order-material-item">
            <div className="sample-order-material-info">
              {record.imageUrl ? (
                <img src={record.imageUrl} alt={record.name} />
              ) : (
                <div className="sample-order-material-placeholder" />
              )}
              <div className="sample-order-material-text">
                <Text strong className="sample-order-material-name">
                  {record.name || '未命名物料'}
                </Text>
                <Text type="secondary" className="sample-order-material-meta">
                  {[record.sku, record.unit ? `单位：${record.unit}` : null, record.unitPrice !== undefined ? `单价 ¥${record.unitPrice.toFixed(2)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </div>
            </div>
            <div className="sample-order-material-fields">
              <div className="sample-order-material-field">
                <Text type="secondary">单耗</Text>
                <InputNumber
                  min={0}
                  precision={2}
                  value={record.consumption}
                  style={{ width: '100%' }}
                  onChange={(value) => handleBomFieldChange(record.uid, { consumption: Number(value ?? 0) })}
                />
              </div>
              <div className="sample-order-material-field">
                <Text type="secondary">损耗(%)</Text>
                <div className="sample-order-material-input-with-addon">
                  <InputNumber
                    min={0}
                    precision={2}
                    value={record.lossRate}
                    style={{ width: '100%' }}
                    onChange={(value) => handleBomFieldChange(record.uid, { lossRate: Number(value ?? 0) })}
                  />
                  <span className="sample-order-material-addon">%</span>
                </div>
              </div>
              <div className="sample-order-material-field sample-order-material-field--remark">
                <Text type="secondary">备注</Text>
                <Input
                  value={record.remark}
                  placeholder="备注"
                  onChange={(event) => handleBomFieldChange(record.uid, { remark: event.target.value })}
                />
              </div>
            </div>
            <div className="sample-order-material-actions">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleBomRemove(record.uid)} />
            </div>
          </div>
        ))}
      </Space>
    );
  }, [handleBomFieldChange, handleBomRemove]);

  const registerSection = useCallback((section: SampleOrderFormSection) => (
    node: HTMLDivElement | null,
  ) => {
    sectionRefs.current[section] = node;
  }, []);

  const getSectionClassName = useCallback((section: SampleOrderFormSection, extraClass?: string) => {
    return [extraClass, 'sample-order-form-section', highlightSection === section ? 'sample-order-form-section--highlight' : '']
      .filter(Boolean)
      .join(' ');
  }, [highlightSection]);

  const resetForm = useCallback(() => {
    setColors([]);
    setSizes([]);
    setMatrix({});
    setColorImagesEnabled(false);
    setColorImageMap({});
    setAttachments([]);
    setProcesses([]);
    setBomItems([]);
    setOtherCosts([]);
    setSizeChartImage(undefined);
    setMaterialPickerState({ open: false, type: 'fabric' });
    form.resetFields();
  }, [form]);

  const hydrateFormFromDetail = useCallback((metaData: SampleCreationMeta, detail: SampleOrderDetailResponse) => {
    const skuState = deriveSkuStateFromDetail(detail.skus);
    const fallbackColors = skuState.colors.length > 0 ? skuState.colors : metaData.colorPresets.slice(0, 2);
    const fallbackSizes = skuState.sizes.length > 0 ? skuState.sizes : metaData.sizePresets.slice(0, 4);
    setColors(fallbackColors);
    setSizes(fallbackSizes);
    const nextMatrix = skuState.colors.length > 0 && skuState.sizes.length > 0
      ? skuState.matrix
      : buildQuantityMatrix(fallbackColors, fallbackSizes);
    setMatrix(nextMatrix);

    const attachmentList = mapAttachmentsFromDetail(detail.attachments);
    setAttachments(attachmentList);

    const processesFromDetail: SampleProcessStep[] = (detail.processes ?? []).map((process, index) => ({
      id: process.processCatalogId ? String(process.processCatalogId) : `custom-${process.id ?? index}`,
      name: process.processCatalogName || `工序${index + 1}`,
      order: process.sequence ?? index + 1,
      defaultDuration: process.plannedDurationMinutes ?? undefined,
      custom: !process.processCatalogId,
    }));
    setProcesses(processesFromDetail.length > 0
      ? processesFromDetail
      : metaData.defaultProcesses.map((item, index) => ({ ...item, order: index + 1 })));

    const nextColorImageMap = mapColorImagesFromDetail(detail.colorImages);
    setColorImageMap(nextColorImageMap);
    setColorImagesEnabled(Object.keys(nextColorImageMap).length > 0);

    const materialEntries: BomEntry[] = (detail.materials ?? []).map((material, index) => ({
      uid: `bom-${material.id ?? index}-${material.materialId ?? 'virtual'}`,
      materialId: material.materialId ? String(material.materialId) : undefined,
      materialType: material.materialType === 'FABRIC' ? 'fabric' : 'accessory',
      name: material.materialName ?? `物料${index + 1}`,
      sku: material.materialSku ?? '--',
      unit: material.unit ?? '件',
      imageUrl: material.imageUrl ?? undefined,
      consumption: Number(material.consumption ?? 0),
      lossRate: Number((material.lossRate ?? 0) * 100),
      unitPrice: material.unitPrice ? Number(material.unitPrice) : undefined,
      remark: material.remark ?? '',
    }));
    setBomItems(materialEntries);

    const nextCosts: OtherCostEntry[] = (detail.costs ?? []).map((cost, index) => ({
      uid: String(cost.id ?? `cost-${index}`),
      costType: cost.costItem,
      amount: Number(cost.amount ?? 0),
    }));
    setOtherCosts(nextCosts);
    setSizeChartImage(detail.sizeChartImageUrl ?? undefined);

    form.setFieldsValue({
      styleId: detail.styleId ? String(detail.styleId) : undefined,
      styleCode: detail.styleNo ?? '',
      styleName: detail.styleName ?? '',
      unit: detail.unit || metaData.units[0],
      orderNo: detail.sampleNo,
      sampleTypeId: detail.sampleTypeId ? String(detail.sampleTypeId) : undefined,
      customerId: detail.customerId ? String(detail.customerId) : undefined,
      patternPrice: detail.unitPrice ?? undefined,
      orderDate: toDayjsValue(detail.orderDate),
      deliveryDate: toDayjsValue(detail.deadline),
      merchandiserId: detail.merchandiserId ? String(detail.merchandiserId) : undefined,
      patternMakerId: detail.patternMakerId ? String(detail.patternMakerId) : undefined,
      patternNo: detail.patternNo,
      sampleSewerId: detail.sampleSewerId ? String(detail.sampleSewerId) : undefined,
      remarks: detail.remarks,
    });
  }, [form]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setInitializeLoading(true);
    void (async () => {
      try {
        const metaData = await sampleOrderApi.getMeta();
        if (cancelled) {
          return;
        }
        setMeta(metaData);
        if (isEditMode) {
          if (!orderId) {
            messageApi.error('缺少样板单 ID，无法编辑');
            onCancel();
            return;
          }
          try {
            const detailData = await sampleOrderApi.detailRaw(orderId);
            if (cancelled) {
              return;
            }
            hydrateFormFromDetail(metaData, detailData);
          } catch (detailError) {
            console.error(detailError);
            const rawMessage = detailError instanceof Error ? detailError.message : '';
            if (rawMessage.includes('Mock')) {
              messageApi.error('当前为 Mock 数据模式，暂不支持编辑样板单');
            } else {
              messageApi.error('加载样板单详情失败，请稍后重试');
            }
            onCancel();
            return;
          }
        } else {
          resetForm();
        }
      } catch (error) {
        console.error(error);
        messageApi.error('加载样板单创建配置失败，请稍后重试');
        if (isEditMode) {
          onCancel();
        }
      } finally {
        if (!cancelled) {
          setInitializeLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, resetForm, messageApi, isEditMode, orderId, hydrateFormFromDetail, onCancel]);

  useEffect(() => {
    if (!visible || !initialSection) {
      setHighlightSection(null);
      return;
    }
    const target = sectionRefs.current[initialSection];
    if (!target) {
      setHighlightSection(null);
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightSection(initialSection);
    const timer = window.setTimeout(() => setHighlightSection(null), 1600);
    return () => window.clearTimeout(timer);
  }, [initialSection, visible]);

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

  const appendAttachment = useCallback((file: { url: string; name?: string; fileType?: string; fileSize?: number; isMain?: boolean }) => {
    setAttachments((prev) => {
      const hasMain = prev.some((item) => item.isMain);
      const shouldBeMain = file.isMain ?? !hasMain;
      const others = shouldBeMain ? prev.map((item) => ({ ...item, isMain: false })) : [...prev];
      const id = generateId();
      const createdAt = new Date().toISOString();
      const attachment: SampleCreationAttachment = {
        id,
        url: file.url,
        name: file.name ?? extractFileNameFromUrl(file.url),
        fileType: file.fileType,
        fileSize: file.fileSize,
        isMain: shouldBeMain,
        createdAt,
      };
      return shouldBeMain ? [attachment, ...others] : [...others, attachment];
    });
  }, []);

  const handleMainImageChange = useCallback((value?: string) => {
    setAttachments((prev) => {
      const others = prev.filter((item) => !item.isMain);
      if (!value) {
        if (others.length === 0) {
          return [];
        }
        const [nextMain, ...rest] = others;
        return [{ ...nextMain, isMain: true }, ...rest];
      }
      const existingMain = prev.find((item) => item.isMain);
      if (existingMain) {
        return [{ ...existingMain, url: value }, ...others];
      }
      return [
        {
          id: generateId(),
          url: value,
          name: extractFileNameFromUrl(value),
          isMain: true,
          createdAt: new Date().toISOString(),
        },
        ...others,
      ];
    });
  }, []);

  const handleAttachmentUpload = useCallback(async (file: File) => {
    try {
      const result = await storageApi.upload(file, { module: 'sample-orders' });
      appendAttachment({
        url: result.url,
        name: result.fileName || file.name,
        fileType: result.contentType || file.type,
        fileSize: result.size || file.size,
      });
      return true;
    } catch (error) {
      console.error('上传样板图片失败', error);
      messageApi.error('上传图片失败，请稍后再试');
      return false;
    }
  }, [appendAttachment, messageApi]);

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
    let successCount = 0;
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) {
        const success = await handleAttachmentUpload(file);
        if (success) {
          successCount += 1;
        }
      }
    }
    if (successCount > 0) {
      messageApi.success(`已添加 ${successCount} 张图片`);
    }
  }, [handleAttachmentUpload, messageApi]);

  const uploadProps = useMemo<UploadProps>(() => ({
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      void (async () => {
        const success = await handleAttachmentUpload(file as File);
        if (success) {
          messageApi.success('图片上传成功');
        }
      })();
      return false;
    },
  }), [handleAttachmentUpload, messageApi]);

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
        name: attachment.name || extractFileNameFromUrl(attachment.url) || `附件${index + 1}`,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
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

      const normalizedCosts = otherCosts
        .filter((item) => item.costType.trim())
        .map((item) => ({ costItem: item.costType.trim(), amount: Number(item.amount ?? 0) }));

      const materialsPayload = bomItems
        .filter((item) => item.materialId)
        .map((item) => ({
          materialId: item.materialId!,
          consumption: item.consumption,
          lossRate: item.lossRate ? item.lossRate / 100 : undefined,
          remark: item.remark,
        }));

      const sizeChartAssets = sizeChartImage
        ? [{
          type: 'SIZE_IMAGE' as const,
          url: sizeChartImage,
          name: '尺寸表',
          sortOrder: baseAttachments.length + colorAttachments.length,
        }]
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
        costs: normalizedCosts,
        materials: materialsPayload,
        assets: [...baseAttachments, ...colorAttachments, ...sizeChartAssets],
      };

      if (isEditMode) {
        if (!orderId) {
          messageApi.error('缺少样板单 ID，无法保存');
          return;
        }
        await sampleOrderApi.update(orderId, payload);
        messageApi.success('样板单更新成功');
        onOk({ mode: 'edit', orderId });
      } else {
        await sampleOrderApi.create(payload);
        messageApi.success('样板单创建成功');
        onOk({ mode: 'create' });
      }
      handleClose();
    } catch (error) {
      const maybeValidation = error as { errorFields?: unknown };
      if (maybeValidation?.errorFields) {
        messageApi.error('请完善必填信息');
      } else if (axios.isAxiosError(error)) {
        // 全局错误提醒组件会统一提示
        console.warn(isEditMode ? '更新样板单失败' : '创建样板单失败', error.response?.data ?? error.message);
      } else {
        if (error instanceof Error) {
          console.error(error);
        }
        messageApi.error(isEditMode ? '更新失败，请稍后重试' : '创建失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }, [form, meta, processes, colors, sizes, matrix, colorImagesEnabled, colorImageMap, attachments, onOk, handleClose, messageApi, isEditMode, orderId, otherCosts, bomItems, sizeChartImage]);

  const handleStyleSelect = useCallback((style: StyleData) => {
    form.setFieldsValue({
      styleId: style.id,
      styleCode: style.styleNo,
      styleName: style.styleName,
    });
    handleColorsUpdate(style.colors?.length ? style.colors : []);
    handleSizesUpdate(style.sizes?.length ? style.sizes : []);
    setColorImageMap({});
    setColorImagesEnabled(false);
    if (style.image) {
      appendAttachment({
        url: style.image,
        name: style.styleName ? `${style.styleName}主图` : undefined,
      });
    }
    setStyleState((prev) => ({ ...prev, open: false }));
    if (!style.id) {
      return;
    }
    void (async () => {
      try {
        const detail = await styleDetailApi.fetchDetail(style.id);
        if (detail.colors?.length) {
          handleColorsUpdate(detail.colors);
        }
        if (detail.sizes?.length) {
          handleSizesUpdate(detail.sizes);
        }
        const images = detail.colorImages ?? {};
        setColorImageMap(images);
        setColorImagesEnabled(Object.values(images).some((value) => Boolean(value)));
      } catch (error) {
        console.error('加载颜色图片失败', error);
        messageApi.warning('加载颜色图片失败，请稍后重试');
      }
    })();
  }, [appendAttachment, form, handleColorsUpdate, handleSizesUpdate, messageApi]);

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

  if (!visible) {
    return null;
  }

  const styleSelectTrigger = !isEditMode ? (
    <Button type="link" onClick={() => setStyleState((prev) => ({ ...prev, open: true }))}>选择</Button>
  ) : (
    <Button type="link" disabled>选择</Button>
  );

  return (
    <>
      {messageContextHolder}
      <Modal
        open={visible}
        title={isEditMode ? '编辑样板单' : '新建样板单'}
        width={1080}
        okText={isEditMode ? '保存' : '确定'}
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
              <div ref={registerSection('core')} className={getSectionClassName('core')}>
                <Divider orientation="left">核心信息</Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <div
                      ref={registerSection('attachments')}
                      className={getSectionClassName('attachments', 'sample-order-cover-card')}
                      style={{
                        minHeight: COVER_SECTION_HEIGHT,
                        height: '100%',
                      }}
                    >
                      <div className="sample-order-cover-title">样板主图</div>
                      <div className="sample-order-cover-item">
                        <ImageUploader
                          module="sample-orders"
                          value={mainAttachment?.url}
                          onChange={handleMainImageChange}
                          tips="建议尺寸 800x800px，支持 JPG/PNG，大小不超过 5MB"
                        />
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        该图片将作为列表主图展示，可上传或替换为高清图，右键其他图片可重新设为主图
                      </Text>
                    </div>
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
                          disabled={isEditMode}
                          addonAfter={styleSelectTrigger}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="styleName"
                        label="款名"
                        rules={[{ required: true, message: '请输入款名' }]}
                      >
                        <Input placeholder="请输入款名" disabled={isEditMode} />
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
                        <Input placeholder="留空时自动生成" disabled={isEditMode} />
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
                    <Col span={24}>
                      <div
                        style={{
                          position: 'relative',
                          border: '1px dashed #d9d9d9',
                          borderRadius: 12,
                          padding: 16,
                          background: '#fafafa',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                        onPaste={handleImagePaste}
                        role="presentation"
                      >
                        <Space direction="vertical" size={4}>
                          <Text strong>附加图片</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>支持拖拽、粘贴或批量上传，右键管理主图</Text>
                        </Space>
                        {attachments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <InboxOutlined style={{ fontSize: 32, color: '#bfbfbf', marginBottom: 8 }} />
                            <Text type="secondary">暂未上传图片</Text>
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
                                    background: '#fff',
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
                          支持鼠标拖拽、文件上传或 Ctrl + V 粘贴图片
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>
              </div>

              <div ref={registerSection('attributes')} className={getSectionClassName('attributes')}>
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
              </div>

              <div ref={registerSection('materials')} className={getSectionClassName('materials')}>
                <Divider orientation="left">物料清单</Divider>
                <Row gutter={16}>
                  <Col span={24} lg={12}>
                    <Card
                      size="small"
                      title="面料"
                      extra={<Button type="dashed" icon={<PlusOutlined />} onClick={() => handleMaterialPickerOpen('fabric')}>选择面料</Button>}
                    >
                      {renderBomList(fabricBomItems, '暂未选择面料')}
                    </Card>
                  </Col>
                  <Col span={24} lg={12}>
                    <Card
                      size="small"
                      title="辅料/包材"
                      extra={<Button type="dashed" icon={<PlusOutlined />} onClick={() => handleMaterialPickerOpen('accessory')}>选择辅料</Button>}
                    >
                      {renderBomList(accessoryBomItems, '暂未选择辅料')}
                    </Card>
                  </Col>
                </Row>
              </div>

              <div ref={registerSection('process')} className={getSectionClassName('process')}>
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
              </div>

              <div ref={registerSection('skuDefinitions')} className={getSectionClassName('skuDefinitions')}>
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
                  <Space align="start" size={12}>
                    <Switch checked={colorImagesEnabled} onChange={setColorImagesEnabled} />
                    <Space direction="vertical" size={0}>
                      <Text>颜色图片</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>开关仅控制显示，图片来自款式基础资料</Text>
                    </Space>
                  </Space>
                </Col>
                  {colorImagesEnabled ? (
                    <Col span={24}>
                      <Space wrap size={16} style={{ marginTop: 12 }}>
                      {colors.map((color) => {
                        const image = colorImageMap[color];
                        return (
                          <Card key={color} size="small" style={{ width: 200 }}>
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                              <Text strong>{color}</Text>
                              {image ? (
                                <img src={image} alt={color} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 4 }} />
                              ) : (
                                <div style={{ width: '100%', height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 4 }}>
                                  <PictureOutlined style={{ fontSize: 36, color: '#bfbfbf' }} />
                                  <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>暂无图片</Text>
                                </div>
                              )}
                              <Text type="secondary" style={{ fontSize: 12 }}>如需调整请到款式资料维护</Text>
                            </Space>
                          </Card>
                        );
                      })}
                    </Space>
                    </Col>
                  ) : null}
                  <Col span={24}>
                    <div ref={registerSection('skuMatrix')} className={getSectionClassName('skuMatrix')}>
                      <Card size="small" title="数量矩阵">
                        <SkuMatrixTable colors={colors} sizes={sizes} matrix={matrix} onChange={handleMatrixChange} />
                      </Card>
                    </div>
                  </Col>
                </Row>
              </div>

              <div ref={registerSection('sizeChart')} className={getSectionClassName('sizeChart')}>
                <Divider orientation="left">尺寸表</Divider>
                <Card size="small">
                  <ImageUploader
                    module="sample-orders"
                    value={sizeChartImage}
                    onChange={setSizeChartImage}
                    tips="上传尺寸表图片，建议 1200x800px，支持 JPG/PNG"
                  />
                </Card>
              </div>

              <div ref={registerSection('otherCosts')} className={getSectionClassName('otherCosts')}>
                <Divider orientation="left">其他费用</Divider>
                <Card
                  size="small"
                  extra={<Button type="dashed" icon={<PlusOutlined />} onClick={handleAddOtherCost}>添加费用</Button>}
                >
                  {otherCosts.length === 0 ? (
                    <Empty description="暂无费用" style={{ margin: '12px 0' }} />
                  ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {otherCosts.map((cost) => (
                        <Row key={cost.uid} gutter={12} align="middle">
                          <Col span={10}>
                            <Input
                              value={cost.costType}
                              placeholder="费用名称"
                              onChange={(event) => handleOtherCostChange(cost.uid, 'costType', event.target.value)}
                            />
                          </Col>
                          <Col span={10}>
                            <InputNumber
                              min={0}
                              precision={2}
                              value={cost.amount}
                              style={{ width: '100%' }}
                              prefix="¥"
                              onChange={(value) => handleOtherCostChange(cost.uid, 'amount', value ?? 0)}
                            />
                          </Col>
                          <Col span={4} style={{ textAlign: 'right' }}>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleOtherCostRemove(cost.uid)} />
                          </Col>
                        </Row>
                      ))}
                    </Space>
                  )}
                </Card>
              </div>

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

      <MaterialSelectorDrawer
        open={materialPickerState.open}
        materialType={materialPickerState.type}
        onClose={handleMaterialPickerClose}
        onSelect={handleMaterialSelected}
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
