import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { styleDetailApi } from '../api/style-detail';
import type {
  StyleColorImageMap,
  StyleDraft,
  StyleFormMeta,
  StyleFormValues,
  StyleOperation,
  StyleOperationTemplate,
} from '../types/style';
import '../styles/style-detail.css';

const { Title, Text } = Typography;

type UploadItemWrapperProps = {
  children: ReactNode;
  size: number;
  extraClass: string;
};

const UploadItemWrapper = ({ children, size, extraClass }: UploadItemWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = wrapperRef.current?.parentElement;
    if (container) {
      container.style.width = `${size}px`;
      container.style.height = `${size}px`;
    }
  }, [size]);

  return (
    <div ref={wrapperRef} className={`style-detail-upload-item ${extraClass}`.trim()}>
      {children}
    </div>
  );
};

const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const buildOperation = (index: number): StyleOperation => ({
  id: `op-${Date.now()}-${index}`,
  sequence: index + 1,
  operationName: '',
  stage: undefined,
  processDepartment: undefined,
  parts: [],
  specificationUnitPrice: undefined,
  specificationEnabled: false,
  specificationNotes: '',
  isKeyProcess: false,
  processUnitPrice: undefined,
});

const recalcSequence = (rows: StyleOperation[]): StyleOperation[] =>
  rows.map((item, idx) => ({ ...item, sequence: idx + 1 }));

const StyleDetail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<StyleFormValues>();
  const [meta, setMeta] = useState<StyleFormMeta>();
  const [operations, setOperations] = useState<StyleOperation[]>([]);
  const [templates, setTemplates] = useState<StyleOperationTemplate[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [colorUploadMap, setColorUploadMap] = useState<Record<string, UploadFile[]>>({});
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);

  const isEditing = searchParams.get('mode') === 'edit';
  const draftId = searchParams.get('id') ?? undefined;

  const watchedColors = Form.useWatch('colors', form) as string[] | undefined;
  const colors = useMemo(() => watchedColors ?? [], [watchedColors]);
  const colorImagesEnabled = Form.useWatch('colorImagesEnabled', form);

  useEffect(() => {
    setColorUploadMap((prev) => {
      const next: Record<string, UploadFile[]> = {};
      let changed = false;
      colors.forEach((color) => {
        if (!prev[color]) {
          changed = true;
          next[color] = [];
        } else {
          next[color] = prev[color];
        }
      });
      Object.keys(prev).forEach((color) => {
        if (!colors.includes(color)) {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [colors]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [metaPayload, draftPayload, templatePayload] = await Promise.all([
          styleDetailApi.fetchMeta(),
          styleDetailApi.fetchDraft(draftId),
          styleDetailApi.fetchOperationTemplates(),
        ]);
        setMeta(metaPayload);
        setTemplates(templatePayload);
        form.setFieldsValue(draftPayload.form);
        setOperations(draftPayload.operations);
        setCoverFileList(
          draftPayload.coverImage
            ? [
                {
                  uid: draftPayload.coverImage.id,
                  name: draftPayload.coverImage.filename,
                  url: draftPayload.coverImage.url,
                  status: 'done',
                },
              ]
            : [],
        );
        setColorUploadMap(
          Object.entries(draftPayload.colorImages).reduce<Record<string, UploadFile[]>>((acc, [color, image]) => {
            acc[color] = image
              ? [
                  {
                    uid: image.id,
                    name: image.filename,
                    url: image.url,
                    status: 'done',
                  },
                ]
              : [];
            return acc;
          }, {}),
        );
      } catch (error) {
        console.error('Failed to load style detail', error);
        message.error('加载款式资料失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [draftId, form]);

  const handleOperationChange = useCallback(
    (id: string, changes: Partial<StyleOperation>) => {
      setOperations((prev) =>
        recalcSequence(
          prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
        ),
      );
    },
    [],
  );

  const handleAddOperation = useCallback(() => {
    setOperations((prev) => recalcSequence([...prev, buildOperation(prev.length)]));
  }, []);

  const handleDuplicateOperation = useCallback((id: string) => {
    setOperations((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target) {
        message.warning('未找到对应工序，无法复制');
        return prev;
      }
      const clone: StyleOperation = {
        ...target,
        id: `op-${Date.now()}`,
      };
      return recalcSequence([...prev, clone]);
    });
  }, []);

  const handleResetOperation = useCallback((id: string) => {
    setOperations((prev) =>
      recalcSequence(
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                operationName: '',
                stage: undefined,
                processDepartment: undefined,
                parts: [],
                specificationUnitPrice: undefined,
                specificationEnabled: false,
                specificationNotes: '',
                isKeyProcess: false,
                processUnitPrice: undefined,
              }
            : item,
        ),
      ),
    );
  }, []);

  const handleDeleteOperations = useCallback(() => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择需要删除的工序');
      return;
    }
    setOperations((prev) => recalcSequence(prev.filter((item) => !selectedRowKeys.includes(item.id))));
    setSelectedRowKeys([]);
  }, [selectedRowKeys]);

  const handleApplyTemplate = useCallback(() => {
    if (!selectedTemplateId) {
      message.warning('请选择一个工序模板');
      return;
    }
    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) {
      message.error('未找到对应的工序模板');
      return;
    }
    setOperations(
      recalcSequence(
        template.operations.map((item, index) => ({
          ...item,
          id: `${item.id}-${Date.now()}-${index}`,
        })),
      ),
    );
    setTemplateModalOpen(false);
    setSelectedTemplateId(undefined);
    message.success('已应用工序模板');
  }, [selectedTemplateId, templates]);

  const resolveUploadFile = useCallback(async (file: UploadFile, associatedColor?: string) => {
    let url = file.url || file.thumbUrl;
    if (!url && file.originFileObj) {
      url = await getBase64(file.originFileObj as RcFile);
    }
    return {
      id: file.uid,
      filename: file.name,
      url: url || '',
      associatedColor,
    };
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!operations.length) {
        message.warning('请至少配置一条工序');
        return;
      }
      setSaving(true);
      const coverImage = coverFileList[0] ? await resolveUploadFile(coverFileList[0]) : undefined;
      const colorImages: StyleColorImageMap = {};
      if (values.colorImagesEnabled) {
        await Promise.all(
          colors.map(async (color) => {
            const files = colorUploadMap[color];
            if (files?.[0]) {
              colorImages[color] = await resolveUploadFile(files[0], color);
            }
          }),
        );
      }
      const payload: StyleDraft = {
        form: values,
        operations: recalcSequence(operations),
        coverImage,
        colorImages,
      };
      await styleDetailApi.save(payload);
      message.success('款式资料已保存');
      if (!isEditing) {
        navigate('/basic/styles');
      }
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) {
        return;
      }
      console.error('Failed to save style draft', error);
      message.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [colorUploadMap, colors, coverFileList, form, isEditing, navigate, operations, resolveUploadFile]);

  const handlePreview: UploadProps['onPreview'] = async (file) => {
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj as RcFile);
    }
    setPreviewUrl(file.url || (file.preview as string) || '');
    setPreviewTitle(file.name || '图片预览');
    setPreviewVisible(true);
  };

  const buildItemRenderer = useCallback(
    (extraClass: string, size: number): NonNullable<UploadProps['itemRender']> =>
      (originNode) => {
        if (!isValidElement(originNode)) {
          return originNode;
        }
        const className = `${originNode.props.className ?? ''} ${extraClass}`.trim();
        const style = {
          ...(originNode.props.style ?? {}),
          width: '100%',
          height: '100%',
        };
        return (
          <UploadItemWrapper size={size} extraClass={extraClass}>
            {cloneElement(originNode, { className, style })}
          </UploadItemWrapper>
        );
      },
    [],
  );

  const coverUploadProps: UploadProps = {
    listType: 'picture-card',
    maxCount: 1,
    fileList: coverFileList,
    beforeUpload: () => false,
    onPreview: handlePreview,
    onChange: ({ fileList: next }) => setCoverFileList(next),
    itemRender: buildItemRenderer('style-detail-upload-node', 260),
  };

  const createColorUploadProps = (color: string): UploadProps => ({
    listType: 'picture-card',
    maxCount: 1,
    fileList: colorUploadMap[color] ?? [],
    beforeUpload: () => false,
    onPreview: handlePreview,
    onChange: ({ fileList: next }) =>
      setColorUploadMap((prev) => ({
        ...prev,
        [color]: next,
      })),
    itemRender: buildItemRenderer('style-detail-upload-node', 160),
  });

  const columns: ColumnsType<StyleOperation> = useMemo(() => {
    const optionNodes = (list?: string[]): ReactNode =>
      list?.map((value) => (
        <Select.Option key={value} value={value}>
          {value}
        </Select.Option>
      ));

    return [
      {
        title: '序号',
        dataIndex: 'sequence',
        width: 72,
        render: (_value, _record, index) => index + 1,
      },
      {
        title: '工序名称',
        dataIndex: 'operationName',
        width: 180,
        render: (_value, record) => (
          <Input
            value={record.operationName}
            placeholder="请输入"
            onChange={(event) => handleOperationChange(record.id, { operationName: event.target.value })}
          />
        ),
      },
      {
        title: '环节',
        dataIndex: 'stage',
        width: 140,
        render: (_value, record) => (
          <Select
            value={record.stage}
            placeholder="选择环节"
            allowClear
            onChange={(value) => handleOperationChange(record.id, { stage: value })}
          >
            {optionNodes(meta?.operationStages)}
          </Select>
        ),
      },
      {
        title: '工序(部)',
        dataIndex: 'processDepartment',
        width: 160,
        render: (_value, record) => (
          <Select
            value={record.processDepartment}
            placeholder="选择部门"
            allowClear
            onChange={(value) => handleOperationChange(record.id, { processDepartment: value })}
          >
            {optionNodes(meta?.processDepartments)}
          </Select>
        ),
      },
      {
        title: '部位',
        dataIndex: 'parts',
        width: 200,
        render: (_value, record) => (
          <Select
            mode="multiple"
            value={record.parts}
            placeholder="关联部位"
            onChange={(value) => handleOperationChange(record.id, { parts: value })}
          >
            {optionNodes(meta?.partOptions)}
          </Select>
        ),
      },
      {
        title: '规格工价',
        dataIndex: 'specificationUnitPrice',
        width: 140,
        render: (_value, record) => (
          <InputNumber
            min={0}
            precision={2}
            value={record.specificationUnitPrice}
            style={{ width: '100%' }}
            onChange={(value) => handleOperationChange(record.id, { specificationUnitPrice: value ?? undefined })}
          />
        ),
      },
      {
        title: '开启规格',
        dataIndex: 'specificationEnabled',
        width: 120,
        render: (_value, record) => (
          <Switch
            checked={record.specificationEnabled}
            onChange={(checked) => handleOperationChange(record.id, { specificationEnabled: checked })}
          />
        ),
      },
      {
        title: '备注规格',
        dataIndex: 'specificationNotes',
        width: 200,
        render: (_value, record) => (
          <Input.TextArea
            value={record.specificationNotes}
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="填写规格说明"
            onChange={(event) => handleOperationChange(record.id, { specificationNotes: event.target.value })}
          />
        ),
      },
      {
        title: '关键工序',
        dataIndex: 'isKeyProcess',
        width: 120,
        render: (_value, record) => (
          <Switch
            checked={record.isKeyProcess}
            onChange={(checked) => handleOperationChange(record.id, { isKeyProcess: checked })}
          />
        ),
      },
      {
        title: '工序工价',
        dataIndex: 'processUnitPrice',
        width: 140,
        render: (_value, record) => (
          <InputNumber
            min={0}
            precision={2}
            value={record.processUnitPrice}
            style={{ width: '100%' }}
            onChange={(value) => handleOperationChange(record.id, { processUnitPrice: value ?? undefined })}
          />
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        fixed: 'right',
        width: 100,
        render: (_value, record) => (
          <Space size="small">
            <Button type="link" onClick={() => handleDuplicateOperation(record.id)}>
              复制
            </Button>
            <Button type="link" danger onClick={() => handleResetOperation(record.id)}>
              清空
            </Button>
          </Space>
        ),
      },
    ];
  }, [handleDuplicateOperation, handleOperationChange, handleResetOperation, meta]);

  const disabledSave = loading || saving;

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="style-detail-page">
        <div className="style-detail-header">
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>
              款式资料
              <Tag color="blue" style={{ marginLeft: 12 }}>
                {isEditing ? '编辑' : '新建'}
              </Tag>
            </Title>
            <Text type="secondary">基础资料 &gt; 款式资料</Text>
          </div>
        </div>

        <Card title="基础信息" bordered={false} className="style-detail-card">
          <Form form={form} layout="vertical">
            <div className="style-detail-basic">
                <div className="style-detail-cover">
                  <Text className="style-detail-cover-label">主图</Text>
                  <div className="style-detail-cover-upload">
                    <Upload {...coverUploadProps}>
                      {coverFileList.length >= 1 ? null : (
                        <div className="style-detail-cover-trigger">
                          <PlusOutlined />
                          <div>上传主图</div>
                        </div>
                      )}
                    </Upload>
                  </div>
                  <Text type="secondary" className="style-detail-cover-tip">
                    建议尺寸 1200×1800，支持 JPG/PNG，单张不超过 5MB
                  </Text>
                </div>
              <div className="style-detail-basic-fields">
                <Row gutter={24}>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="styleNumber" label="款号" rules={[{ required: true, message: '请输入款号' }]}> 
                      <Input placeholder="输入款号" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="styleName" label="款名" rules={[{ required: true, message: '请输入款名' }]}> 
                      <Input placeholder="输入款名" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="unit" label="单位" rules={[{ required: true, message: '请选择单位' }]}> 
                      <Select placeholder="选择单位">
                        {meta?.units.map((unit) => (
                          <Select.Option key={unit} value={unit}>
                            {unit}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={24}>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="designer" label="设计师">
                      <Select allowClear placeholder="选择设计师">
                        {meta?.designers.map((designer) => (
                          <Select.Option key={designer.id} value={designer.id}>
                            {designer.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="designNumber" label="设计号">
                      <Input placeholder="输入设计号" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="remarks" label="备注">
                      <Input placeholder="输入备注" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={24}>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="colors" label="颜色">
                      <Select mode="tags" placeholder="输入颜色后回车" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="sizes" label="尺码">
                      <Select mode="tags" placeholder="输入尺码后回车" tokenSeparators={[',']} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} lg={8}>
                    <Form.Item name="colorImagesEnabled" label="颜色图片" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>
          </Form>

          {colorImagesEnabled && colors.length > 0 && (
            <div className="style-detail-color-images">
              {colors.map((color) => (
                <div key={color} className="style-detail-color-item">
                  <Text className="style-detail-color-label">{color}</Text>
                  <Upload {...createColorUploadProps(color)}>
                    {(colorUploadMap[color]?.length ?? 0) >= 1 ? null : (
                      <div className="style-detail-color-trigger">
                        <PlusOutlined />
                        <div>上传图片</div>
                      </div>
                    )}
                  </Upload>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="款式工序"
          bordered={false}
          className="style-detail-card"
          extra={
            <Space wrap>
              <Button type="primary" onClick={() => setTemplateModalOpen(true)}>
                指定工序
              </Button>
              <Button onClick={() => message.info('设置环节功能开发中')}>设置环节</Button>
              <Button onClick={() => message.info('设置部位功能开发中')}>设置部位</Button>
              <Button onClick={() => message.info('设置尺码部位功能开发中')}>设置尺码部位</Button>
              <Button danger onClick={handleDeleteOperations}>
                删除
              </Button>
              <Button onClick={() => message.info('复制工序功能开发中')}>复制工序</Button>
              <Button onClick={() => message.info('保存到工序库功能开发中')}>保存到工序库</Button>
              <Button onClick={() => message.info('查看工序库功能开发中')}>查看工序库</Button>
              <Button onClick={() => message.info('分配规格功能开发中')}>分配规格</Button>
              <Button onClick={() => message.info('排序功能开发中')}>排序</Button>
              <Button onClick={() => message.info('导入Excel功能开发中')}>导入Excel</Button>
              <Button onClick={() => message.info('导出Excel功能开发中')}>导出Excel</Button>
              <Button type="dashed" onClick={handleAddOperation}>
                新增工序
              </Button>
            </Space>
          }
        >
          <Table
            size="small"
            rowKey="id"
            dataSource={operations}
            columns={columns}
            scroll={{ x: 1500 }}
            pagination={false}
            locale={{ emptyText: '暂无数据' }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
          />
          <Divider style={{ margin: '16px 0' }} />
          <Text type="secondary">共 {operations.length} 条工序</Text>
        </Card>

        <div className="style-detail-footer">
          <Space>
            <Button onClick={() => message.info('功能开发中')}>查看环节单价</Button>
            <Button type="primary" loading={saving} disabled={disabledSave} onClick={handleSave}>
              保存
            </Button>
            <Button onClick={() => navigate('/basic/styles')}>返回列表</Button>
          </Space>
        </div>

        <Modal
          open={templateModalOpen}
          title="选择工序模板"
          onCancel={() => setTemplateModalOpen(false)}
          onOk={handleApplyTemplate}
        >
          <Select
            style={{ width: '100%' }}
            placeholder="选择模板"
            value={selectedTemplateId}
            onChange={(value) => setSelectedTemplateId(value)}
          >
            {templates.map((template) => (
              <Select.Option key={template.id} value={template.id}>
                {template.name}
              </Select.Option>
            ))}
          </Select>
        </Modal>

        <Modal open={previewVisible} title={previewTitle} footer={null} onCancel={() => setPreviewVisible(false)}>
          {previewUrl && <img alt={previewTitle} style={{ width: '100%' }} src={previewUrl} />}
        </Modal>
      </div>
    </Spin>
  );
};

export default StyleDetail;
