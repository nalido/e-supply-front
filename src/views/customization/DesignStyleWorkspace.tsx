import { ApartmentOutlined, ArrowLeftOutlined, CheckCircleOutlined, CloudUploadOutlined, DownloadOutlined, LinkOutlined, LockOutlined, QuestionCircleOutlined, RedoOutlined, RobotOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Col, Empty, Form, Image, Input, Modal, Radio, Row, Select, Space, Steps, Tag, Timeline, Tooltip, Typography, Upload } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import podDesignApi, { podProductTemplateApi } from '../../api/pod-design'
import stylesApi from '../../api/styles'
import type { StyleData } from '../../types/style'
import type { PodAsset, PodDesignDraft, PodDesignStyle, PodFactoryStyleBindingDraft, PodProductTemplate } from '../../types/pod-design'
import { PodDesignStatusTag } from './pod-design-display'
import { parseWorkflow } from './template-workflow'
import { formatDuration, generationResultDuration } from './pod-generation-time'

type FormValues = Pick<PodDesignDraft, 'productTemplateId' | 'styleNo' | 'styleName' | 'categoryName' | 'description'>
type FactoryFormValues = PodFactoryStyleBindingDraft
const MAX_ARTWORK_FILE_BYTES = 10 * 1024 * 1024
const ARTWORK_FILE_TOO_LARGE_MESSAGE = '透明设计图不能超过 10MB，请压缩后重新上传'

const uploadErrorMessage = (caught: unknown) => {
  const responseMessage = (caught as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof responseMessage === 'string' && responseMessage.trim()
    ? responseMessage
    : '上传失败，请重新选择 PNG 图片'
}

const eventLabel: Record<string, string> = { SUBMIT: '提交审核', APPROVE: '审核通过', REJECT: '审核驳回' }

const DesignStyleWorkspace = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const [form] = Form.useForm<FormValues>()
  const [factoryForm] = Form.useForm<FactoryFormValues>()
  const [style, setStyle] = useState<PodDesignStyle>()
  const [templates, setTemplates] = useState<PodProductTemplate[]>([])
  const [artworks, setArtworks] = useState<Record<string, PodAsset>>({})
  const [saving, setSaving] = useState(false)
  const [uploadingPrintId, setUploadingPrintId] = useState<string>()
  const [rendering, setRendering] = useState(false)
  const [retryingImageId, setRetryingImageId] = useState<number>()
  const [mainAssetId, setMainAssetId] = useState<number>()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [factoryOpen, setFactoryOpen] = useState(false)
  const [factorySaving, setFactorySaving] = useState(false)
  const [factoryStyleLoading, setFactoryStyleLoading] = useState(false)
  const [factoryStyles, setFactoryStyles] = useState<StyleData[]>([])
  const [capability, setCapability] = useState<{ available: boolean; provider: string; model: string }>()
  const templateId = Form.useWatch('productTemplateId', form)
  const selectedTemplate = useMemo(() => templates.find(item => item.id === templateId), [templates, templateId])
  const workflow = useMemo(() => parseWorkflow(selectedTemplate?.workflowConfig), [selectedTemplate?.workflowConfig])
  const readOnly = style?.status === 'PENDING_REVIEW' || style?.status === 'APPROVED'
  const factoryMode = Form.useWatch('mode', factoryForm)

  const applyStyle = useCallback((value: PodDesignStyle) => {
    setStyle(value)
    const currentRevision = value.revisions.find(item => item.id === value.currentRevisionId)
    const sourceAssets = currentRevision?.assets.filter(item => item.assetType === 'SOURCE_IMAGE') ?? []
    setArtworks(Object.fromEntries(sourceAssets.filter(item => item.printId).map(item => [item.printId as string, item])))
    setMainAssetId(value.mockupImage?.id)
    setRendering(Boolean(value.mockupImages?.some(item => item.status === 'QUEUED' || item.status === 'PROCESSING')))
    form.setFieldsValue({
      productTemplateId: value.productTemplateId, styleNo: value.styleNo, styleName: value.styleName,
      categoryName: value.categoryName, description: value.description,
    })
  }, [form])

  const reload = useCallback(async () => {
    if (isNew) return undefined
    const value = await podDesignApi.get(Number(id))
    applyStyle(value)
    return value
  }, [applyStyle, id, isNew])

  useEffect(() => {
    void Promise.all([podProductTemplateApi.list(), podProductTemplateApi.renderCapability()])
      .then(([items, status]) => { setTemplates(items); setCapability(status) })
      .catch(() => message.error('设计工作台暂时无法加载'))
    if (!isNew) void reload().catch(() => message.error('设计款式无法加载'))
  }, [isNew, message, reload])

  useEffect(() => {
    if (!rendering || !style) return
    const timer = window.setInterval(() => {
      void podDesignApi.get(style.id).then(value => {
        applyStyle(value)
        const active = value.mockupImages?.some(item => item.status === 'QUEUED' || item.status === 'PROCESSING')
        if (!active) {
          window.clearInterval(timer)
          setRendering(false)
          setRetryingImageId(undefined)
          if (value.mockupImages?.every(item => item.status === 'SUCCEEDED')) message.success('整套商品效果图已生成，请选择主图并确认')
        }
      }).catch(() => undefined)
    }, 2500)
    return () => window.clearInterval(timer)
  }, [applyStyle, message, rendering, style])

  const save = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload: PodDesignDraft = { ...values }
      const result = style ? await podDesignApi.update(style.id, payload) : await podDesignApi.create(payload)
      applyStyle(result)
      message.success(style?.status === 'REJECTED' ? '已创建返修版本' : '设计款式已保存')
      if (!style) navigate(`/customization/styles/${result.id}`, { replace: true })
      return result
    } catch (caught) {
      if (!(caught as { errorFields?: unknown }).errorFields) message.error('保存失败，请检查模板状态和必填资料')
      return null
    } finally { setSaving(false) }
  }

  const upload = async (printId: string, file: File) => {
    if (file.size > MAX_ARTWORK_FILE_BYTES) {
      message.error(ARTWORK_FILE_TOO_LARGE_MESSAGE)
      return Upload.LIST_IGNORE
    }
    const target = await save()
    if (!target) return Upload.LIST_IGNORE
    setUploadingPrintId(printId)
    try {
      await podDesignApi.upload(target.id, 'SOURCE_IMAGE', file, printId)
      applyStyle(await podDesignApi.get(target.id))
      message.success('透明设计图已上传，旧生成结果已失效')
    } catch (caught) { message.error(uploadErrorMessage(caught)) }
    finally { setUploadingPrintId(undefined) }
    return Upload.LIST_IGNORE
  }

  const workflowConfigured = workflow.nodes.length > 0
  const imageHasOutput = (imageId: number) => workflow.nodes.some(node => node.type === 'OUTPUT' && node.imageId === imageId)
  const imageHasPrint = (imageId: number) => workflow.nodes.some(node => node.type === 'PRINT' && node.imageId === imageId)
  const renderableImages = selectedTemplate?.images.filter(image => image.imageRole !== 'MATERIAL'
    && (workflowConfigured ? imageHasOutput(image.id) : image.printX != null)) ?? []
  const printableAreaCount = workflowConfigured
    ? workflow.nodes.filter(node => node.type === 'PRINT').length
    : selectedTemplate?.images.filter(image => ['FRONT', 'BACK', 'SIDE'].includes(image.imageRole) && image.printX != null).length ?? 0
  const printableFileCount = workflow.sizes.length > 0 ? printableAreaCount * workflow.sizes.length : printableAreaCount
  const mockupImages = style?.mockupImages ?? []
  const completed = Boolean(style?.resultCurrent && renderableImages.length > 0 && renderableImages.every(image => mockupImages.some(result => result.templateImageId === image.id && result.status === 'SUCCEEDED')))
  const confirmed = completed && style?.confirmedBatchNo === style?.generationBatchNo
  const requiredPrints = workflow.prints.filter(print => workflow.nodes.some(node => node.type === 'PRINT' && node.printId === print.id))
  const allPrintsUploaded = requiredPrints.length > 0 && requiredPrints.every(print => artworks[print.id])
  const currentStep = style?.factoryBinding ? 5 : style?.status === 'APPROVED' ? 4 : style?.status === 'PENDING_REVIEW' ? 4 : confirmed ? 3 : allPrintsUploaded ? 2 : selectedTemplate ? 1 : 0

  const loadFactoryStyles = useCallback(async (keyword?: string) => {
    setFactoryStyleLoading(true)
    try {
      const result = await stylesApi.list({ page: 1, pageSize: 20, keyword: keyword?.trim() || undefined, status: 'active' })
      setFactoryStyles(result.list)
    } catch {
      message.error('工厂款式暂时无法加载')
    } finally {
      setFactoryStyleLoading(false)
    }
  }, [message])

  const openFactoryBinding = () => {
    if (!style) return
    factoryForm.setFieldsValue({
      mode: 'CREATE_NEW_STYLE',
      factoryStyleNo: `${style.styleNo}-F`,
      factoryStyleName: style.styleName,
      colorName: undefined,
      existingStyleId: undefined,
    })
    setFactoryOpen(true)
  }

  const bindFactoryStyle = async () => {
    if (!style) return
    try {
      const values = await factoryForm.validateFields()
      setFactorySaving(true)
      applyStyle(await podDesignApi.bindFactoryStyle(style.id, values))
      setFactoryOpen(false)
      message.success(`已创建新 SKC，并生成 ${workflow.sizes.length} 个尺码 SKU`)
    } catch (caught) {
      if (!(caught as { errorFields?: unknown }).errorFields) {
        const responseMessage = (caught as { response?: { data?: { message?: unknown } } })?.response?.data?.message
        message.error(typeof responseMessage === 'string' ? responseMessage : '工厂款式生成失败')
      }
    } finally {
      setFactorySaving(false)
    }
  }

  const render = async () => {
    const target = await save()
    if (!target) return
    setRendering(true)
    try {
      const result = await podDesignApi.generateAiMockups(target.id)
      applyStyle(result)
      message.success('生成任务已创建，可以离开页面后再回来查看')
    } catch { setRendering(false); message.error('AI 商品图任务创建失败，请检查模板是否已启用') }
  }

  const retryImage = async (templateImageId: number) => {
    if (!style) return
    setRetryingImageId(templateImageId)
    setRendering(true)
    try {
      applyStyle(await podDesignApi.retryAiMockup(style.id, templateImageId))
      message.success('这张商品图已重新进入生成队列')
    } catch {
      setRetryingImageId(undefined)
      setRendering(false)
      message.error('单张商品图重新生成失败，请稍后重试')
    }
  }

  const confirm = async () => {
    if (!style || !mainAssetId) return
    try { applyStyle(await podDesignApi.confirmMockups(style.id, mainAssetId)); message.success('整套效果图已确认') }
    catch { message.error('确认失败，模板或设计图可能已经变化') }
  }

  const submit = async () => {
    if (!style) return
    try { applyStyle(await podDesignApi.submitReview(style.id)); message.success('已提交审核，当前版本已冻结') }
    catch { message.error('提交失败，请先完成页面列出的发布准备资料') }
  }

  const approve = async () => {
    if (!style) return
    setReviewing(true)
    try { applyStyle(await podDesignApi.approve(style.id)); message.success('审核通过，已进入发布准备') }
    catch { message.error('审核失败，请确认当前账号拥有审核权限') }
    finally { setReviewing(false) }
  }

  const reject = async () => {
    if (!style || !rejectReason.trim()) return
    setReviewing(true)
    try { applyStyle(await podDesignApi.reject(style.id, rejectReason.trim())); setRejectOpen(false); setRejectReason(''); message.success('已驳回并记录返修原因') }
    catch { message.error('驳回失败，请确认审核权限') }
    finally { setReviewing(false) }
  }

  const exportPrintArtwork = async () => {
    if (!style) return
    setExporting(true)
    try {
      const result = await podDesignApi.exportPrintArtwork(style.id)
      const url = window.URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      message.success('CMYK 印刷文件包已导出')
    } catch {
      message.error('导出失败，请确认款式已审核通过且模板未发生变化')
    } finally {
      setExporting(false)
    }
  }

  const resultFor = (templateImageId: number) => mockupImages.find(result => result.templateImageId === templateImageId)

  return <div className="pod-page pod-ai-design-page">
    <div className="pod-editor-heading"><Space><Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customization/styles')}>返回</Button><div><Space wrap><Typography.Title level={2}>{style?.styleName || '创建定制设计'}</Typography.Title>{style && <PodDesignStatusTag status={style.status} />}</Space><Typography.Text type="secondary">从模板生成整套商品图，确认后提交审核并进入发布资料准备</Typography.Text></div></Space><Space wrap>
      {style && <Tooltip title={style.status === 'APPROVED' ? '按各印区尺寸和模板 DPI 导出 CMYK TIFF' : '审核通过后可导出印刷文件'}><span><Button icon={<DownloadOutlined />} loading={exporting} disabled={style.status !== 'APPROVED'} onClick={() => void exportPrintArtwork()}>导出印刷文件</Button></span></Tooltip>}
      <Button loading={saving} disabled={readOnly} onClick={() => void save()}>{style?.status === 'REJECTED' ? '开始返修' : '保存'}</Button>
      {style?.status === 'DRAFT' && <Button type="primary" icon={<LockOutlined />} disabled={!confirmed || !style.publishReadiness.ready} onClick={() => void submit()}>提交审核</Button>}
      {style?.status === 'PENDING_REVIEW' && <><Button danger loading={reviewing} onClick={() => setRejectOpen(true)}>驳回返修</Button><Button type="primary" loading={reviewing} onClick={() => void approve()}>审核通过</Button></>}
    </Space></div>
    <Steps current={currentStep} items={[{ title: '选择模板' }, { title: '上传设计图' }, { title: 'AI 生成' }, { title: '确认结果' }, { title: '审核完成' }, { title: '生成工厂款式' }]} />
    {style?.status === 'REJECTED' && <Alert type="error" showIcon message="审核未通过" description={style.reviewComment || '请按审核意见返修'} />}
    <Row gutter={[20, 20]}>
      <Col xs={24} xl={8}><Card className="pod-panel" title="设计信息"><Form form={form} layout="vertical" disabled={readOnly} requiredMark="optional">
        <Form.Item name="productTemplateId" label="款式模板" rules={[{ required: true, message: '请选择款式模板' }]}><Select showSearch optionFilterProp="label" placeholder="选择已启用的商品模板" options={templates.filter(item => item.status === 'ACTIVE').map(item => ({ value: item.id, label: `${item.templateNo} · ${item.templateName} · V${item.configVersion}` }))} /></Form.Item>
        <Form.Item name="styleNo" label="设计款号" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="styleName" label="设计款式名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="categoryName" label="商品品类"><Input placeholder="例如 T 恤" /></Form.Item>
        <Form.Item name="description" label="设计说明"><Input.TextArea rows={2} /></Form.Item>
      </Form>
      {selectedTemplate ? <div className="pod-selected-template"><div><Typography.Text strong>{selectedTemplate.templateName} · V{selectedTemplate.configVersion}</Typography.Text><Typography.Text type="secondary">{selectedTemplate.images.length} 张底图 · {renderableImages.length} 张参与生成</Typography.Text></div></div> : <Alert type="warning" showIcon message="请先选择已启用的模板" />}
      {style?.status === 'APPROVED' && (style.factoryBinding
        ? <div className="pod-factory-binding pod-factory-binding--complete"><div className="pod-factory-binding__icon"><CheckCircleOutlined /></div><div><Typography.Text type="secondary">已生成工厂 SKC</Typography.Text><Typography.Link strong onClick={() => navigate(`/foundation/product/detail?id=${style.factoryBinding?.styleId}&skcId=${style.factoryBinding?.skcId}`)}>{style.factoryBinding.styleNo} · {style.factoryBinding.styleName}</Typography.Link><Typography.Text>{style.factoryBinding.colorName} · {style.factoryBinding.skcNo || '系统 SKC'} · {style.factoryBinding.skuCount} 个尺码 SKU</Typography.Text></div><Button icon={<LinkOutlined />} onClick={() => navigate(`/foundation/product/detail?id=${style.factoryBinding?.styleId}&skcId=${style.factoryBinding?.skcId}`)}>查看工厂款式</Button></div>
        : <Alert className="pod-factory-binding-alert" type="success" showIcon icon={<ApartmentOutlined />} message="审核已完成，可以生成工厂款式" description="选择新建工厂款式，或连接已有款式并创建一个全新的颜色 SKC；图片和尺码 SKU 会一次同步完成。" action={<Button type="primary" icon={<ApartmentOutlined />} onClick={openFactoryBinding}>生成工厂款式</Button>} />)}
      </Card></Col>
      <Col xs={24} xl={7}><Card className="pod-panel" title="印花设计图">
        {!selectedTemplate ? <Empty description="选择模板后显示需要上传的印花" /> : requiredPrints.length === 0 ? <Empty description="这个模板尚未配置印花步骤" /> : <div className="pod-print-upload-list">{requiredPrints.map((print, index) => { const asset = artworks[print.id]; const uploading = uploadingPrintId === print.id; const usages = workflow.nodes.filter(node => node.type === 'PRINT' && node.printId === print.id).map(node => `${selectedTemplate.images.find(image => image.id === node.imageId)?.imageName ?? '商品图'} · ${node.name}`); return <Upload.Dragger key={print.id} showUploadList={false} disabled={readOnly || Boolean(uploadingPrintId)} accept="image/png" beforeUpload={file => upload(print.id, file)} className="pod-print-uploader" style={{ borderColor: print.color }}><div className="pod-print-uploader__heading"><span className="pod-print-number" style={{ background: print.color }}>{index + 1}</span><strong>{print.name}</strong><Tooltip trigger={['hover', 'click']} title={`使用位置：${usages.join('、')}`}><button type="button" className="pod-print-uploader__usage-help" aria-label={`查看${print.name}使用位置`} onClick={event => { event.preventDefault(); event.stopPropagation() }}><QuestionCircleOutlined /></button></Tooltip><Tag color={asset ? 'success' : 'default'}>{asset ? '已上传' : '待上传'}</Tag></div>{asset ? <img src={asset.deliveryUrl} alt={`${print.name}设计图`} /> : <CloudUploadOutlined className="pod-print-upload-icon" />}<p>{uploading ? '上传中…' : asset ? '点击更换设计图（透明 PNG，不超过 10MB）' : `上传${print.name}的透明 PNG（不超过 10MB）`}</p></Upload.Dragger>})}</div>}
        <Alert className="pod-ai-note" type="info" showIcon icon={<RobotOutlined />} message="生成任务在后台执行" description="刷新或离开页面不会重复创建任务；返回后可以继续查看每张图的状态。" />
        <Button block size="large" type="primary" icon={<RobotOutlined />} loading={rendering} disabled={readOnly || !selectedTemplate || !allPrintsUploaded || !capability?.available || renderableImages.length === 0 || rendering} onClick={() => void render()}>{rendering ? '生成中' : '生成'}</Button>
        {style && <Card size="small" title="发布准备检查" style={{ marginTop: 16 }}>{style.publishReadiness.ready ? <Alert type="success" showIcon message="资料完整，可提交审核" /> : <Space direction="vertical">{style.publishReadiness.blockers.map(item => <Tag color="orange" key={item}>{item}</Tag>)}</Space>}</Card>}
      </Card></Col>
      <Col xs={24} xl={9}><Card className="pod-panel" title="整套商品效果图" extra={<Typography.Text type="secondary">批次 {style?.generationBatchNo?.slice(0, 8) || '尚未生成'}</Typography.Text>}>
        {!selectedTemplate ? <Empty description="选择模板后显示商品图构成" /> : <Image.PreviewGroup><div className="pod-render-grid">{selectedTemplate.images.map(image => { const result = resultFor(image.id); const generated = result?.status === 'SUCCEEDED' ? result.asset : undefined; const isMain = generated?.id === mainAssetId; const active = result?.status === 'QUEUED' || result?.status === 'PROCESSING'; const directOutput = workflowConfigured && imageHasOutput(image.id) && !imageHasPrint(image.id); const statusText = image.imageRole === 'MATERIAL' ? '材质参考' : directOutput ? '模板直接输出' : result?.status === 'QUEUED' ? '排队中' : result?.status === 'PROCESSING' ? '生成中' : generated ? '已生成' : result?.status === 'FAILED' ? '生成失败' : '待生成'; const duration = !directOutput && result ? generationResultDuration(result) : undefined; const displayWidth = generated?.width || image.width; const displayHeight = generated?.height || image.height; return <div key={image.id} className="pod-render-slot" style={isMain ? { outline: '2px solid #1677ff', borderRadius: 8 } : undefined}><div className="pod-render-slot__image" style={{ aspectRatio: `${displayWidth} / ${displayHeight}` }}><Image src={generated?.deliveryUrl || image.referencePreviewUrl || image.deliveryUrl} alt={image.imageName} width="100%" height="100%" preview={{ mask: '预览' }} /></div><div><Typography.Text strong>{image.imageName}</Typography.Text><Typography.Text type={result?.status === 'FAILED' ? 'danger' : 'secondary'}>{directOutput ? statusText : result?.errorMessage || statusText}</Typography.Text>{duration != null && <Typography.Text type="secondary">AI 用时 {formatDuration(duration)}{active ? '（进行中）' : ''}</Typography.Text>}{generated?.id && <Radio checked={isMain} disabled={readOnly || Boolean(style?.confirmedBatchNo)} onChange={() => setMainAssetId(generated.id)}>设为发布主图</Radio>}{image.imageRole !== 'MATERIAL' && result && !directOutput && <Button type="link" size="small" icon={<RedoOutlined />} loading={retryingImageId === image.id && active} disabled={readOnly || active} onClick={() => void retryImage(image.id)}>{active ? '生成中' : '重新生成'}</Button>}</div></div> })}</div></Image.PreviewGroup>}
        {completed && !confirmed && <Button type="primary" block icon={<CheckCircleOutlined />} disabled={!mainAssetId} onClick={() => void confirm()}>确认整套效果图</Button>}
        {confirmed && <Alert className="pod-ai-result-hint" type="success" showIcon message="当前批次已确认" description="主图与整套结果已锁定；模板或源图变化时系统会要求重新生成。" />}
        {style?.status === 'APPROVED' && selectedTemplate && <Alert className="pod-print-export-hint" type="info" showIcon message="印刷文件可以导出" description={`系统会按 ${printableAreaCount} 个印花位置和 ${workflow.sizes.length || 1} 个尺码生成 ${printableFileCount} 份 CMYK TIFF，并使用模板设置的 ${selectedTemplate.minDpi} DPI。`} />}
        {style && style.reviewEvents.length > 0 && <Card size="small" title="审核记录" style={{ marginTop: 16 }}><Timeline items={style.reviewEvents.map(event => ({ children: <div><Typography.Text strong>{eventLabel[event.action] || event.action}</Typography.Text><br /><Typography.Text type="secondary">{new Date(event.createdAt).toLocaleString()} {event.comment || ''}</Typography.Text></div> }))} /></Card>}
      </Card></Col>
    </Row>
    <Modal title="驳回并要求返修" open={rejectOpen} confirmLoading={reviewing} okText="确认驳回" cancelText="取消" okButtonProps={{ danger: true, disabled: !rejectReason.trim() }} onOk={() => void reject()} onCancel={() => setRejectOpen(false)}><Input.TextArea rows={4} value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="请填写设计师可执行的返修原因" /></Modal>
    <Modal width={680} title="生成工厂款式与 SKC" open={factoryOpen} confirmLoading={factorySaving} okText="确认生成" cancelText="取消" onOk={() => void bindFactoryStyle()} onCancel={() => setFactoryOpen(false)} destroyOnHidden>
      <Form form={factoryForm} layout="vertical" initialValues={{ mode: 'CREATE_NEW_STYLE' }}>
        <Form.Item name="mode" label="生成方式" rules={[{ required: true }]}>
          <Radio.Group className="pod-factory-mode">
            <Radio.Button value="CREATE_NEW_STYLE">新建工厂款式</Radio.Button>
            <Radio.Button value="USE_EXISTING_STYLE">连接已有工厂款式</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {factoryMode === 'USE_EXISTING_STYLE' ? <>
          <Form.Item name="existingStyleId" label="已有工厂款式" extra="这里只选择工厂款式；提交后系统会在该款式下新建颜色 SKC。" rules={[{ required: true, message: '请选择工厂款式' }]}>
            <Select showSearch filterOption={false} placeholder="输入款号或款名搜索" loading={factoryStyleLoading} onFocus={() => { if (factoryStyles.length === 0) void loadFactoryStyles() }} onSearch={value => void loadFactoryStyles(value)} options={factoryStyles.map(item => ({ value: Number(item.id), label: `${item.styleNo} · ${item.styleName}` }))} />
          </Form.Item>
        </> : <Row gutter={16}>
          <Col span={10}><Form.Item name="factoryStyleNo" label="工厂款号" rules={[{ required: true, message: '请填写工厂款号' }]}><Input maxLength={64} /></Form.Item></Col>
          <Col span={14}><Form.Item name="factoryStyleName" label="工厂款名" rules={[{ required: true, message: '请填写工厂款名' }]}><Input maxLength={1024} /></Form.Item></Col>
        </Row>}
        <Form.Item name="colorName" label="新 SKC 颜色" extra="无论选择哪种方式，都会创建新的颜色 SKC，不会绑定已有 SKC。" rules={[{ required: true, whitespace: true, message: '请填写新 SKC 颜色' }]}><Input placeholder="例如：米白印花款" maxLength={64} /></Form.Item>
        <div className="pod-factory-summary">
          <div><Typography.Text type="secondary">将同步图片</Typography.Text><Typography.Text strong>{renderableImages.length} 张（主图和全部其他图片）</Typography.Text></div>
          <div><Typography.Text type="secondary">将生成尺码 SKU</Typography.Text><Space size={[4, 4]} wrap>{workflow.sizes.map(size => <Tag key={size.id}>{size.name}</Tag>)}</Space></div>
        </div>
      </Form>
    </Modal>
  </div>
}

export default DesignStyleWorkspace
