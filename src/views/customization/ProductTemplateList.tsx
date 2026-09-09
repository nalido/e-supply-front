import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Card, Empty, Form, Image, Input, Modal, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { podProductTemplateApi } from '../../api/pod-design'
import type { PodProductTemplate, PodProductTemplateDraft } from '../../types/pod-design'

const ProductTemplateList = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [data, setData] = useState<PodProductTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<PodProductTemplateDraft>()

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await podProductTemplateApi.list()) }
    catch { message.error('款式模板暂时无法加载') }
    finally { setLoading(false) }
  }, [message])
  useEffect(() => { void load() }, [load])

  const create = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const result = await podProductTemplateApi.create(values)
      setOpen(false)
      form.resetFields()
      navigate(`/customization/templates/${result.id}`)
    } catch (caught) {
      if (!(caught as { errorFields?: unknown }).errorFields) message.error('款式模板创建失败')
    } finally { setSaving(false) }
  }

  const columns: ColumnsType<PodProductTemplate> = [
    { title: '模板预览', width: 100, render: (_, record) => record.images[0] ? <Image src={record.images[0].deliveryUrl} width={64} height={64} className="pod-list-image" preview={false} /> : <div className="pod-list-image pod-list-image--empty">待上传</div> },
    { title: '模板编号', dataIndex: 'templateNo', width: 180, render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: '款式模板', dataIndex: 'templateName', render: (value, record) => <div><Typography.Text strong>{value}</Typography.Text><Typography.Text type="secondary" className="pod-table-subtitle">{record.categoryName || '未设置品类'} · {record.images.length} 张商品底图</Typography.Text></div> },
    { title: '状态', dataIndex: 'status', width: 100, render: (status: PodProductTemplate['status']) => <Tag color={status === 'ACTIVE' ? 'green' : status === 'DRAFT' ? 'orange' : 'default'}>{status === 'ACTIVE' ? '已启用' : status === 'DRAFT' ? '待完善' : '已停用'}</Tag> },
    { title: '图片构成', width: 240, render: (_, record) => record.images.length ? record.images.map(image => image.imageName).join('、') : '尚未上传商品底图' },
    { title: '操作', width: 140, render: (_, record) => <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/customization/templates/${record.id}`)}>配置模板</Button> },
  ]

  return <div className="pod-page">
    <div className="pod-page-heading"><div><Typography.Text className="pod-eyebrow">PRODUCT TEMPLATE</Typography.Text><Typography.Title level={2}>款式模板</Typography.Title><Typography.Paragraph>统一维护商品底图、图片用途和设计区域，后续设计直接复用模板生成整套商品图。</Typography.Paragraph></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建款式模板</Button></div>
    <Card className="pod-panel"><Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} locale={{ emptyText: <Empty description="还没有款式模板" /> }} /></Card>
    <Modal title="新建款式模板" open={open} okText="创建并配置" cancelText="取消" confirmLoading={saving} onOk={() => void create()} onCancel={() => setOpen(false)}>
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="templateNo" label="模板编号" rules={[{ required: true, message: '请输入模板编号' }]}><Input placeholder="例如 TSHIRT-HEAVY-001" /></Form.Item>
        <Form.Item name="templateName" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}><Input placeholder="例如 重磅圆领短袖" /></Form.Item>
        <Form.Item name="categoryName" label="商品品类"><Input placeholder="例如 T恤" /></Form.Item>
        <Form.Item name="description" label="模板说明"><Input.TextArea rows={3} placeholder="记录面料、版型和适用工艺" /></Form.Item>
      </Form>
    </Modal>
  </div>
}

export default ProductTemplateList
