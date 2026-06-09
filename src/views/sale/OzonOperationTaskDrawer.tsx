import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Descriptions, Drawer, Empty, Progress, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import type { SaleAsyncTask, SaleAsyncTaskItem } from '../../types/sale'

const { Text } = Typography

const getTaskTone = (status?: string | null) => {
  const normalized = (status || '').toUpperCase()
  if (normalized.includes('FAIL')) return 'red'
  if (normalized.includes('RUNNING')) return 'blue'
  if (normalized.includes('PENDING')) return 'orange'
  if (normalized.includes('SUCCESS')) return 'green'
  if (normalized.includes('CANCEL')) return 'default'
  return 'default'
}

const parsePayload = (value?: string | null) => {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

type Props = {
  open: boolean
  task?: SaleAsyncTask | null
  onClose: () => void
}

export default function OzonOperationTaskDrawer({ open, task, onClose }: Props) {
  const [currentTask, setCurrentTask] = useState<SaleAsyncTask | null>(task ?? null)
  const [items, setItems] = useState<SaleAsyncTaskItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadTask = useCallback(async () => {
    if (!task?.taskId) return
    setLoading(true)
    try {
      const [detail, itemPage] = await Promise.all([
        saleApi.getSaleAsyncTask(task.taskId),
        saleApi.listSaleAsyncTaskItems(task.taskId, { pageSize: 100 }),
      ])
      setCurrentTask(detail)
      setItems(itemPage.list)
    } finally {
      setLoading(false)
    }
  }, [task?.taskId])

  useEffect(() => {
    setCurrentTask(task ?? null)
    if (open && task?.taskId) {
      void loadTask()
    }
  }, [open, task, loadTask])

  useEffect(() => {
    if (!open || !currentTask?.taskId || !['PENDING', 'RUNNING'].includes((currentTask.status || '').toUpperCase())) {
      return undefined
    }
    const timer = window.setInterval(() => {
      void loadTask()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [open, currentTask?.taskId, currentTask?.status, loadTask])

  const columns: ColumnsType<SaleAsyncTaskItem> = [
    {
      title: '对象',
      dataIndex: 'itemName',
      width: 220,
      render: (value) => <Text strong>{value || '--'}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value) => <Tag color={getTaskTone(value)}>{value || '--'}</Tag>,
    },
    {
      title: '请求摘要',
      dataIndex: 'requestPayloadJson',
      render: (value) => {
        const payload = parsePayload(value)
        const offerId = payload.offerId || payload.targetOfferId
        const productId = payload.productId
        const stock = payload.stock
        const actionId = payload.actionId
        return (
          <Space direction="vertical" size={2}>
            <Text>{offerId ? `offer_id：${offerId}` : productId ? `product_id：${productId}` : '--'}</Text>
            {stock !== undefined ? <Text type="secondary">库存：{String(stock)}</Text> : null}
            {actionId ? <Text type="secondary">活动：{String(actionId)}</Text> : null}
          </Space>
        )
      },
    },
    {
      title: '结果',
      width: 260,
      render: (_, record) => {
        const payload = parsePayload(record.responsePayloadJson)
        const requestId = payload.requestId
        return (
          <Space direction="vertical" size={2}>
            {requestId ? <Text>requestId：{String(requestId)}</Text> : <Text type="secondary">暂无 requestId</Text>}
            {record.errorMessage ? <Text type="danger">{record.errorMessage}</Text> : null}
          </Space>
        )
      },
    },
  ]

  return (
    <Drawer
      width={920}
      open={open}
      title={currentTask?.taskName || 'Ozon 操作任务'}
      onClose={onClose}
      extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={loadTask}>刷新</Button>}
    >
      {currentTask ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions bordered size="small" column={4}>
            <Descriptions.Item label="任务ID">{currentTask.taskId}</Descriptions.Item>
            <Descriptions.Item label="类型">{currentTask.taskType}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getTaskTone(currentTask.status)}>{currentTask.status || '--'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="进度">{currentTask.progressPercent ?? 0}%</Descriptions.Item>
            <Descriptions.Item label="总数">{currentTask.totalCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="成功">{currentTask.successCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="失败">{currentTask.failedCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="跳过">{currentTask.skippedCount ?? 0}</Descriptions.Item>
          </Descriptions>
          <Progress percent={currentTask.progressPercent ?? 0} status={(currentTask.failedCount ?? 0) > 0 ? 'exception' : undefined} />
          {currentTask.errorMessage ? <Alert type="error" showIcon message={currentTask.errorMessage} /> : null}
          <Table rowKey="itemId" loading={loading} columns={columns} dataSource={items} pagination={{ pageSize: 20 }} scroll={{ x: 860 }} />
        </Space>
      ) : (
        <Empty description="暂无任务" />
      )}
    </Drawer>
  )
}
