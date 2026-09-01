import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { podProductTemplateApi } from "../../api/pod-design";
import partnersApi from "../../api/partners";
import type { Partner } from "../../types/partners";
import type {
  PodProductTemplate,
  PodProductTemplateDraft,
  PodTemplateImageRole,
  PodTemplateSupplierSkuDraft,
  PodTemplateWorkflow,
} from "../../types/pod-design";
import TemplateWorkflowEditor from "./TemplateWorkflowEditor";
import { emptyWorkflow, parseWorkflow } from "./template-workflow";

const roleOptions = [
  { value: "FRONT", label: "正面图" },
  { value: "BACK", label: "背面图" },
  { value: "SIDE", label: "侧面图" },
  { value: "MODEL", label: "模特效果图" },
  { value: "MATERIAL", label: "材质图" },
  { value: "DETAIL", label: "细节图" },
];

const ProductTemplateWorkspace = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const templateId = Number(id);
  const [template, setTemplate] = useState<PodProductTemplate>();
  const [role, setRole] = useState<PodTemplateImageRole>("FRONT");
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [skuOpen, setSkuOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [workflow, setWorkflow] = useState<PodTemplateWorkflow>(emptyWorkflow());
  const [workflowDirty, setWorkflowDirty] = useState(false);
  const [form] = Form.useForm<PodProductTemplateDraft>();
  const [skuForm] = Form.useForm<PodTemplateSupplierSkuDraft>();
  const hasUnsavedChanges = templateDirty || workflowDirty;

  useEffect(() => {
    void podProductTemplateApi
      .get(templateId)
      .then((value) => {
        setTemplate(value);
        setWorkflow(parseWorkflow(value.workflowConfig));
      })
      .catch(() => message.error("款式模板无法加载"));
  }, [message, templateId]);
  useEffect(() => {
    void partnersApi
      .list({ type: "supplier", page: 1, pageSize: 200 })
      .then((value) =>
        setSuppliers(value.list.filter((item) => !item.disabled)),
      )
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (template) form.setFieldsValue(template);
  }, [form, template]);
  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const save = async () => {
    if (!template) return;
    const formValues = await form.validateFields();
    const values: PodProductTemplateDraft = {
      templateNo: formValues.templateNo ?? template.templateNo,
      templateName: formValues.templateName ?? template.templateName,
      categoryName: formValues.categoryName ?? template.categoryName,
      description: formValues.description ?? template.description,
      printTechnique: formValues.printTechnique ?? template.printTechnique,
      minDpi: formValues.minDpi ?? template.minDpi,
      bleedMm: formValues.bleedMm ?? template.bleedMm,
      safeMarginMm: formValues.safeMarginMm ?? template.safeMarginMm,
    };
    setSaving(true);
    try {
      const printAreas: never[] = [];
      const result = await podProductTemplateApi.save(
        templateId,
        values,
        printAreas,
        JSON.stringify(workflow),
      );
      setTemplate(result);
      setTemplateDirty(false);
      setWorkflowDirty(false);
      message.success("模板资料与生成流程已保存");
    } catch {
      message.error("保存失败，所有修改均未生效，请检查设计区域是否超出商品图");
    } finally {
      setSaving(false);
    }
  };

  const changeWorkflow = (value: PodTemplateWorkflow) => {
    setWorkflow(value);
    setWorkflowDirty(true);
  };

  const deleteImage = (imageId: number) => {
    const image = template?.images.find(item => item.id === imageId);
    if (!image) return;
    const affected = workflow.nodes.filter(node => node.imageId === imageId).length;
    modal.confirm({
      title: `删除“${image.imageName}”？`,
      content: affected > 0 ? `这张底图关联的 ${affected} 个流程节点也会从当前草稿中移除。` : "删除后无法继续用它生成商品图。",
      okText: "删除底图",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await podProductTemplateApi.deleteImage(templateId, imageId);
          setTemplate(result);
          changeWorkflow({ ...workflow, nodes: workflow.nodes.filter(node => node.imageId !== imageId) });
          message.success("商品底图已删除");
        } catch { message.error("商品底图删除失败，请先停用模板并检查是否已被使用"); }
      },
    });
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const result = await podProductTemplateApi.uploadImage(
        templateId,
        role,
        name.trim() ||
          roleOptions.find((item) => item.value === role)?.label ||
          "",
        file,
      );
      setTemplate(result);
      setName("");
      message.success("商品底图已加入模板");
    } catch {
      message.error("商品底图上传失败");
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE;
  };

  const goBack = () => {
    if (!hasUnsavedChanges) {
      navigate("/customization/templates");
      return;
    }
    modal.confirm({
      title: "还有未保存的模板修改",
      content: "离开后，本次调整的设计区域和模板资料将丢失。",
      okText: "放弃修改并离开",
      cancelText: "继续编辑",
      okButtonProps: { danger: true },
      onOk: () => navigate("/customization/templates"),
    });
  };

  const updateStatus = async (status: "ACTIVE" | "INACTIVE") => {
    setStatusSaving(true);
    try {
      const result = await podProductTemplateApi.updateStatus(
        templateId,
        status,
      );
      setTemplate(result);
      message.success(status === "ACTIVE" ? "模板已启用" : "模板已停用");
    } catch {
      message.error("模板尚未满足启用条件，请补全页面列出的资料");
    } finally {
      setStatusSaving(false);
    }
  };

  const saveSku = async () => {
    const values = await skuForm.validateFields();
    try {
      setTemplate(
        await podProductTemplateApi.createSupplierSku(templateId, {
          ...values,
          active: true,
        }),
      );
      setSkuOpen(false);
      skuForm.resetFields();
      message.success("供应 SKU 已加入模板");
    } catch {
      message.error("供应 SKU 保存失败，请检查是否重复");
    }
  };

  if (!template)
    return (
      <div className="pod-page">
        <Spin />
      </div>
    );
  return (
    <div className="pod-page pod-template-page">
      <div className="pod-editor-heading">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={goBack}>
            返回
          </Button>
          <div>
            <Space>
              <Typography.Title level={2}>
                {template.templateName}
              </Typography.Title>
              <Tag
                color={
                  template.status === "ACTIVE"
                    ? "green"
                    : template.status === "INACTIVE"
                      ? "default"
                      : "orange"
                }
              >
                {template.status === "ACTIVE"
                  ? "已启用"
                  : template.status === "INACTIVE"
                    ? "已停用"
                    : "待完善"}
              </Tag>
              <Tag>配置版本 V{template.configVersion}</Tag>
              {hasUnsavedChanges && <Tag color="orange">有未保存修改</Tag>}
            </Space>
            <Typography.Text type="secondary">
              配置商品图、通用工艺与供应规格；每张商品图分别维护自己的印区尺寸
            </Typography.Text>
          </div>
        </Space>
        <Space>
          <Button
            disabled={hasUnsavedChanges}
            loading={statusSaving}
            onClick={() =>
              void updateStatus(
                template.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
              )
            }
          >
            {template.status === "ACTIVE" ? "停用模板" : "启用模板"}
          </Button>
          <Button type="primary" loading={saving} onClick={() => void save()}>
            保存全部修改
          </Button>
        </Space>
      </div>
      <Tabs
        className="pod-template-tabs"
        defaultActiveKey="settings"
        items={[
          {
            key: "settings",
            label: "模板资料与工艺",
            forceRender: true,
            children: <div className="pod-template-settings-grid">
              <Card className="pod-panel" title="模板资料与通用工艺">
                <Form
                  form={form}
                  layout="vertical"
                  onValuesChange={() => setTemplateDirty(true)}
                >
                  <Row gutter={16}>
                    <Col xs={24} lg={8}><Form.Item name="templateNo" label="模板编号" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} lg={8}><Form.Item name="templateName" label="模板名称" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} lg={8}><Form.Item name="categoryName" label="商品品类"><Input /></Form.Item></Col>
                  </Row>
                  <Form.Item name="description" label="模板说明"><Input.TextArea rows={2} /></Form.Item>
                  <Row gutter={16}>
                    <Col xs={24} sm={12} xl={6}><Form.Item name="printTechnique" label="印花工艺"><Select options={[{ value: "DTG", label: "数码直喷 DTG" }, { value: "DTF", label: "热转印 DTF" }, { value: "SCREEN_PRINT", label: "丝网印刷" }, { value: "SUBLIMATION", label: "热升华" }]} /></Form.Item></Col>
                    <Col xs={24} sm={12} xl={6}><Form.Item name="minDpi" label="最低 DPI"><InputNumber min={72} style={{ width: "100%" }} /></Form.Item></Col>
                    <Col xs={24} sm={12} xl={6}><Form.Item name="bleedMm" label="出血"><InputNumber min={0} suffix="mm" style={{ width: "100%" }} /></Form.Item></Col>
                    <Col xs={24} sm={12} xl={6}><Form.Item name="safeMarginMm" label="安全边距"><InputNumber min={0} suffix="mm" style={{ width: "100%" }} /></Form.Item></Col>
                  </Row>
                </Form>
              </Card>
              <div className="pod-template-readiness">
                <Alert type="info" showIcon icon={<InfoCircleOutlined />} message="模板决定商品图的构成和设计位置" description="正面、背面和模特图分别规划生成流程；材质图可以直接作为最终输出。" />
                {template.readinessBlockers.length > 0 && <Alert type="warning" showIcon message="启用前还需要完成" description={<Space direction="vertical">{template.readinessBlockers.map(item => <span key={item}>• {item}</span>)}</Space>} />}
              </div>
            </div>,
          },
          {
            key: "workflow",
            label: "图片与生成流程",
            children: <Card className="pod-panel pod-template-workbench" bodyStyle={{ padding: 0 }}>
              <div className="pod-template-uploadbar">
                <Select value={role} options={roleOptions} onChange={setRole} />
                <Input value={name} placeholder="图片名称，例如：正面白底图" onChange={(event) => setName(event.target.value)} />
                <Upload showUploadList={false} accept="image/png,image/jpeg" beforeUpload={upload}>
                  <Button icon={<CloudUploadOutlined />} loading={uploading}>上传底图</Button>
                </Upload>
              </div>
              <TemplateWorkflowEditor template={template} value={workflow} onChange={changeWorkflow} onDeleteImage={deleteImage} />
            </Card>,
          },
          {
            key: "skus",
            label: `供应规格（可选 · ${template.supplierSkus.length}）`,
            children: <Card className="pod-panel" title="供应商品与 SKU 映射" extra={<Button type="primary" onClick={() => setSkuOpen(true)}>添加供应 SKU</Button>}>
              <Alert className="pod-state-alert" type="info" showIcon message="供应规格用于订单进入生产后匹配供应商的空白商品，不影响模板启用和设计审核。" />
              <Table rowKey="id" pagination={false} dataSource={template.supplierSkus} columns={[
                { title: "供应商", dataIndex: "supplierName" }, { title: "供应商货号", dataIndex: "supplierProductNo" },
                { title: "供应 SKU", dataIndex: "supplierSku" }, { title: "颜色", dataIndex: "colorName" },
                { title: "尺码", dataIndex: "sizeName" }, { title: "材质", dataIndex: "materialName" },
                { title: "操作", render: (_, record) => <Button type="link" danger onClick={() => void podProductTemplateApi.deleteSupplierSku(templateId, record.id).then(value => { setTemplate(value); message.success("供应 SKU 已移除") })}>移除</Button> },
              ]} />
            </Card>,
          },
        ]}
      />
      <Modal
        title="添加供应 SKU"
        open={skuOpen}
        okText="保存"
        cancelText="取消"
        onOk={() => void saveSku()}
        onCancel={() => setSkuOpen(false)}
      >
        <Form form={skuForm} layout="vertical">
          <Form.Item
            name="supplierId"
            label="供应商"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={suppliers.map((item) => ({
                value: Number(item.id),
                label: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="supplierProductNo"
            label="供应商货号"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="supplierSku"
            label="供应 SKU"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="colorName" label="颜色">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sizeName" label="尺码">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="materialName" label="材质">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductTemplateWorkspace;
