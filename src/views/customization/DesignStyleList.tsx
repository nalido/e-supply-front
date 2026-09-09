import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Image, Input, Progress, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import podDesignApi from '../../api/pod-design'
import type { PodDesignStatus, PodDesignStyle } from '../../types/pod-design'
import { PodDesignStatusTag } from './pod-design-display'
import { formatDuration, generationBatchDuration } from './pod-generation-time'

const hasActiveGeneration = (style: PodDesignStyle) => style.mockupImages?.some(result => result.status === 'QUEUED' || result.status === 'PROCESSING') ?? false

const GenerationProgress = ({ style }: { style: PodDesignStyle }) => {
  const results = style.mockupImages ?? []
  if (results.length === 0) return <Tag>未生成</Tag>

  const completed = results.filter(result => result.status === 'SUCCEEDED').length
  const failed = results.filter(result => result.status === 'FAILED').length
  const active = hasActiveGeneration(style)
  const label = active ? '生成中' : failed > 0 ? '部分失败' : '已完成'
  const color = active ? 'processing' : failed > 0 ? 'error' : 'success'
  const duration = generationBatchDuration(results)

  return <div style={{ minWidth: 150 }}>
    <Space size={6}><Tag color={color}>{label}</Tag><Typography.Text type="secondary">{completed}/{results.length} 张</Typography.Text></Space>
    <Progress percent={Math.round(completed / results.length * 100)} showInfo={false} size="small" status={failed > 0 && !active ? 'exception' : active ? 'active' : 'success'} />
    {duration != null && <Typography.Text type="secondary">整批用时 {formatDuration(duration)}{active ? '（进行中）' : ''}</Typography.Text>}
  </div>
}

const DesignStyleList = () => {
  const navigate = useNavigate()
  const [keywordInput, setKeywordInput] = useState('')
  const [query, setQuery] = useState({ keyword: '', status: undefined as PodDesignStatus | undefined, page: 1, size: 20 })
  const [data, setData] = useState<PodDesignStyle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const result = await podDesignApi.list(query)
      setData(result.items ?? [])
      setTotal(result.total ?? 0)
    } catch {
      setError('设计款式暂时无法加载，请稍后重试。')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [query])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!data.some(hasActiveGeneration)) return
    const timer = window.setInterval(() => void load(true), 5000)
    return () => window.clearInterval(timer)
  }, [data, load])

  const columns: ColumnsType<PodDesignStyle> = [
    {
      title: '效果图', dataIndex: 'mockupImage', width: 92,
      render: (_, record) => {
        const url = record.mockupImage?.deliveryUrl ?? record.baseImage?.deliveryUrl
        return url ? <Image className="pod-list-image" src={url} width={58} height={58} preview={{ mask: '预览' }} /> : <div className="pod-list-image pod-list-image--empty">暂无</div>
      },
    },
    { title: '设计款号', dataIndex: 'styleNo', width: 170, render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: '设计款式', dataIndex: 'styleName', ellipsis: true, render: (value, record) => <div><Typography.Text strong>{value}</Typography.Text>{record.description && <Typography.Text type="secondary" className="pod-table-subtitle">{record.description}</Typography.Text>}</div> },
    { title: '状态', dataIndex: 'status', width: 120, render: (status: PodDesignStatus) => <PodDesignStatusTag status={status} /> },
    { title: '生成进度', key: 'generationProgress', width: 190, render: (_, record) => <GenerationProgress style={record} /> },
    { title: '最近更新', dataIndex: 'updatedAt', width: 180, render: (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—' },
    {
      title: '操作', key: 'action', fixed: 'right', width: 140,
      render: (_, record) => <Space><Button type="link" icon={record.status === 'DRAFT' || record.status === 'REJECTED' ? <EditOutlined /> : <EyeOutlined />} onClick={() => navigate(`/customization/styles/${record.id}`)}>{record.status === 'DRAFT' || record.status === 'REJECTED' ? '继续设计' : '查看'}</Button></Space>,
    },
  ]

  return (
    <div className="pod-page">
      <div className="pod-page-heading">
        <div><Typography.Text className="pod-eyebrow">DESIGN LIBRARY</Typography.Text><Typography.Title level={2}>设计款式</Typography.Title><Typography.Paragraph>选择商品模板，上传设计图，批量生成并冻结整套商品效果图。</Typography.Paragraph></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customization/styles/new')}>创建设计款式</Button>
      </div>
      <Card className="pod-panel">
        <div className="pod-filterbar">
          <Input allowClear value={keywordInput} prefix={<SearchOutlined />} placeholder="搜索设计款号或名称" onChange={(event) => setKeywordInput(event.target.value)} onPressEnter={() => setQuery((value) => ({ ...value, keyword: keywordInput.trim(), page: 1 }))} aria-label="搜索设计款式" />
          <Select allowClear placeholder="全部状态" value={query.status} options={[
            { value: 'DRAFT', label: '设计中' }, { value: 'PENDING_REVIEW', label: '待审核' }, { value: 'APPROVED', label: '已通过' }, { value: 'REJECTED', label: '已驳回' },
          ]} onChange={(status) => setQuery((value) => ({ ...value, status, page: 1 }))} aria-label="按审核状态筛选" />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => setQuery((value) => ({ ...value, keyword: keywordInput.trim(), page: 1 }))}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { setKeywordInput(''); setQuery({ keyword: '', status: undefined, page: 1, size: 20 }) }}>重置</Button>
        </div>
        {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void load()}>重新加载</Button>} className="pod-state-alert" />}
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1110 }} pagination={{ current: query.page, pageSize: query.size, total, showSizeChanger: true, showTotal: (count) => `共 ${count} 个设计款式`, onChange: (page, size) => setQuery((value) => ({ ...value, page, size })) }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={query.keyword || query.status ? '没有符合条件的设计款式' : '还没有设计款式'}><Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customization/styles/new')}>创建第一个设计</Button></Empty> }} />
      </Card>
    </div>
  )
}

export default DesignStyleList
