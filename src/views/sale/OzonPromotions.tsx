import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { Alert, App, Button, Card, Col, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { GiftOutlined, ReloadOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import type { SaleAsyncTask, SaleChannelAccount, SaleOzonPromotion, SaleOzonPromotionProduct } from '../../types/sale'
import { getShopLabel } from './sale-center-helpers'
import OzonOperationTaskDrawer from './OzonOperationTaskDrawer'

const { Text } = Typography

type PromotionProductRow = SaleOzonPromotionProduct & {
  key: string
  channelAccountId: string
  shopName: string
  inputActionPrice?: number | null
  inputStock?: number | null
}

type PromotionSummary = SaleOzonPromotion & {
  key: string
  channelAccountIds: string[]
  shopNames: string[]
}

type ProductCursorState = Record<string, string | undefined>

type Props = {
  accounts: SaleChannelAccount[]
  selectedAccountId?: string
  onAccountChange: (accountId: string) => void
}

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const getAvatarText = (value?: string | null) => (value || '商').trim().slice(0, 1).toUpperCase()

const ProductThumb = ({ src, name, size = 56 }: { src?: string | null; name?: string | null; size?: number }) => {
  if (src?.trim()) {
    return <img className="scw-thumb" src={src.trim()} alt={name || '商品图'} style={{ width: size, height: size }} />
  }
  return (
    <div className="scw-thumb scw-thumb--placeholder" style={{ width: size, height: size }}>
      {getAvatarText(name)}
    </div>
  )
}

export default function OzonPromotions({ accounts, selectedAccountId, onAccountChange }: Props) {
  const { message } = App.useApp()
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [promotions, setPromotions] = useState<PromotionSummary[]>([])
  const [selectedActionId, setSelectedActionId] = useState<string>()
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState<'CANDIDATE' | 'PARTICIPATING'>('CANDIDATE')
  const [candidateRows, setCandidateRows] = useState<PromotionProductRow[]>([])
  const [participatingRows, setParticipatingRows] = useState<PromotionProductRow[]>([])
  const [candidateLastIds, setCandidateLastIds] = useState<ProductCursorState>({})
  const [participatingLastIds, setParticipatingLastIds] = useState<ProductCursorState>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [task, setTask] = useState<SaleAsyncTask | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)

  const ozonAccounts = useMemo(() => accounts.filter((item) => item.platformCode?.toUpperCase() === 'OZON'), [accounts])
  const effectiveAccountIds = useMemo(() => (
    selectedAccountIds.length
      ? selectedAccountIds.filter((item) => ozonAccounts.some((account) => account.id === item))
      : selectedAccountId && ozonAccounts.some((item) => item.id === selectedAccountId)
        ? [selectedAccountId]
        : ozonAccounts[0]?.id ? [ozonAccounts[0].id] : []
  ), [ozonAccounts, selectedAccountId, selectedAccountIds])
  const selectedPromotion = promotions.find((item) => item.actionId === selectedActionId)
  const activeLastIds = activeTab === 'CANDIDATE' ? candidateLastIds : participatingLastIds
  const hasMoreActiveProducts = effectiveAccountIds.some((accountId) => !!activeLastIds[accountId])

  const toProductRow = useCallback((
    accountId: string,
    shopName: string,
    item: SaleOzonPromotionProduct,
    productType: 'CANDIDATE' | 'PARTICIPATING',
  ): PromotionProductRow => ({
    ...item,
    channelAccountId: accountId,
    shopName,
    key: `${accountId}:${item.productId || item.offerId}`,
    inputActionPrice: toNumber(item.actionPrice ?? item.maxActionPrice ?? item.price),
    inputStock: productType === 'PARTICIPATING' ? toNumber(item.stock) ?? 1 : toNumber(item.stock ?? item.minStock),
  }), [])

  const loadPromotions = useCallback(async () => {
    if (!effectiveAccountIds.length) return
    setLoading(true)
    try {
      const listByAccount = await Promise.all(
        effectiveAccountIds.map(async (accountId) => {
          const shopName = getShopLabel(ozonAccounts.find((item) => item.id === accountId))
          const list = await saleApi.listOzonPromotions(accountId)
          return list.map((item) => ({
            ...item,
            key: `${accountId}:${item.actionId}`,
            channelAccountIds: [accountId],
            shopNames: shopName ? [shopName] : [],
          }))
        }),
      )
      const flattened = listByAccount.flat()
      const counts = new Map<string, number>()
      flattened.forEach((item) => counts.set(item.actionId, (counts.get(item.actionId) || 0) + 1))
      const visible =
        effectiveAccountIds.length > 1
          ? flattened.filter((item) => counts.get(item.actionId) === effectiveAccountIds.length)
          : flattened
      setPromotions(visible)
      setSelectedActionId((current) => current || visible[0]?.actionId)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载 Ozon 活动失败')
    } finally {
      setLoading(false)
    }
  }, [effectiveAccountIds, message, ozonAccounts])

  const loadProducts = useCallback(async () => {
    if (!effectiveAccountIds.length || !selectedActionId) return
    setProductLoading(true)
    try {
      const productLists = await Promise.all(
        effectiveAccountIds.map(async (accountId) => {
          const shopName = getShopLabel(ozonAccounts.find((item) => item.id === accountId))
          const [candidates, participating] = await Promise.all([
            saleApi.listOzonPromotionProducts({ channelAccountId: accountId, actionId: selectedActionId, productType: 'CANDIDATE', limit: 100 }),
            saleApi.listOzonPromotionProducts({ channelAccountId: accountId, actionId: selectedActionId, productType: 'PARTICIPATING', limit: 100 }),
          ])
          return {
            accountId,
            shopName,
            candidates,
            participating,
          }
        }),
      )
      setCandidateRows(productLists.flatMap(({ accountId, shopName, candidates }) => candidates.list.map((item) => toProductRow(accountId, shopName, item, 'CANDIDATE'))))
      setParticipatingRows(productLists.flatMap(({ accountId, shopName, participating }) => participating.list.map((item) => toProductRow(accountId, shopName, item, 'PARTICIPATING'))))
      setCandidateLastIds(Object.fromEntries(productLists.map(({ accountId, candidates }) => [accountId, candidates.lastId || undefined])))
      setParticipatingLastIds(Object.fromEntries(productLists.map(({ accountId, participating }) => [accountId, participating.lastId || undefined])))
      setSelectedRowKeys([])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载 Ozon 活动商品失败')
    } finally {
      setProductLoading(false)
    }
  }, [effectiveAccountIds, message, ozonAccounts, selectedActionId, toProductRow])

  useEffect(() => {
    if (effectiveAccountIds[0] && effectiveAccountIds[0] !== selectedAccountId) {
      onAccountChange(effectiveAccountIds[0])
    }
  }, [effectiveAccountIds, onAccountChange, selectedAccountId])

  useEffect(() => {
    void loadPromotions()
  }, [loadPromotions])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const visiblePromotions = useMemo<PromotionSummary[]>(() => {
    const text = keyword.trim().toLowerCase()
    const list = promotions
    if (!text) return list
    return list.filter((item) => [item.title, item.actionId, item.actionType, item.shopNames.join(' ')].some((value) => (value || '').toLowerCase().includes(text)))
  }, [keyword, promotions])

  const activeRows = activeTab === 'CANDIDATE' ? candidateRows : participatingRows
  const selectedRows = activeRows.filter((item) => selectedRowKeys.includes(item.key))
  const invalidReason = !effectiveAccountIds.length
    ? '请选择类型为 Ozon 的店铺'
    : !selectedActionId
      ? '请选择活动'
      : selectedRows.length === 0
        ? '请选择商品'
        : activeTab === 'CANDIDATE' && selectedRows.some((item) => !item.inputActionPrice || item.inputActionPrice <= 0)
          ? '报名活动必须填写大于 0 的活动价'
          : activeTab === 'CANDIDATE' && selectedRows.some((item) => item.inputStock === null || item.inputStock === undefined || item.inputStock < (item.minStock ?? 0) || !Number.isInteger(item.inputStock))
            ? '活动库存必须是不低于最低库存的整数'
            : ''

  const updateRow = (key: string, patch: Partial<PromotionProductRow>) => {
    const setter = activeTab === 'CANDIDATE' ? setCandidateRows : setParticipatingRows
    setter((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item))
  }

  const loadMoreProducts = useCallback(async () => {
    if (!effectiveAccountIds.length || !selectedActionId || !hasMoreActiveProducts) return
    setProductLoading(true)
    try {
      const cursorState = activeTab === 'CANDIDATE' ? candidateLastIds : participatingLastIds
      const productLists = await Promise.all(
        effectiveAccountIds
          .filter((accountId) => !!cursorState[accountId])
          .map(async (accountId) => {
            const shopName = getShopLabel(ozonAccounts.find((item) => item.id === accountId))
            const result = await saleApi.listOzonPromotionProducts({
              channelAccountId: accountId,
              actionId: selectedActionId,
              productType: activeTab,
              limit: 100,
              lastId: cursorState[accountId],
            })
            return { accountId, shopName, result }
          }),
      )
      const rows = productLists.flatMap(({ accountId, shopName, result }) => result.list.map((item) => toProductRow(accountId, shopName, item, activeTab)))
      if (activeTab === 'CANDIDATE') {
        setCandidateRows((current) => [...current, ...rows])
        setCandidateLastIds((current) => ({
          ...current,
          ...Object.fromEntries(productLists.map(({ accountId, result }) => [accountId, result.lastId || undefined])),
        }))
      } else {
        setParticipatingRows((current) => [...current, ...rows])
        setParticipatingLastIds((current) => ({
          ...current,
          ...Object.fromEntries(productLists.map(({ accountId, result }) => [accountId, result.lastId || undefined])),
        }))
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载更多 Ozon 活动商品失败')
    } finally {
      setProductLoading(false)
    }
  }, [
    activeTab,
    candidateLastIds,
    effectiveAccountIds,
    hasMoreActiveProducts,
    message,
    ozonAccounts,
    participatingLastIds,
    selectedActionId,
    toProductRow,
  ])

  const submit = (operation: 'ACTIVATE' | 'DEACTIVATE') => {
    if (invalidReason) {
      message.warning(invalidReason)
      return
    }
    Modal.confirm({
      title: operation === 'ACTIVATE' ? '确认报名 Ozon 活动' : '确认退出 Ozon 活动',
      content: operation === 'ACTIVATE'
        ? `将向活动 ${selectedActionId} 提交 ${selectedRows.length} 个商品，请确认活动价和活动库存。`
        : `将从活动 ${selectedActionId} 退出 ${selectedRows.length} 个商品。`,
      okText: '提交任务',
      cancelText: '取消',
      onOk: async () => {
        setSubmitting(true)
        try {
          const created = await saleApi.submitOzonPromotion({
            taskName: `Ozon 活动${operation === 'ACTIVATE' ? '报名' : '退出'} - ${selectedPromotion?.title || selectedActionId}`,
            actionId: String(selectedActionId),
            operation,
            channelAccountIds: Array.from(new Set(selectedRows.map((item) => Number(item.channelAccountId)))),
            products: selectedRows.map((item) => ({
              channelAccountId: Number(item.channelAccountId),
              offerId: item.offerId,
              productId: item.productId,
              actionPrice: operation === 'ACTIVATE' ? item.inputActionPrice : undefined,
              stock: operation === 'ACTIVATE' ? item.inputStock : undefined,
            })),
          })
          setTask(created)
          setTaskOpen(true)
          message.success('已创建 Ozon 活动操作任务')
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  const productColumns: ColumnsType<PromotionProductRow> = [
    {
      title: '商品',
      dataIndex: 'name',
      render: (value, record) => (
        <Space align="start" size={12}>
          <ProductThumb src={record.imageUrl} name={value} />
          <Space direction="vertical" size={4}>
            <Text strong>{value || record.offerId || record.productId || '--'}</Text>
            <Space size={[4, 4]} wrap>
              <Tag>{record.shopName}</Tag>
              <Tag color="magenta">颜色：{record.color || '--'}</Tag>
              <Tag color="blue">尺码：{record.size || '--'}</Tag>
            </Space>
            <Text type="secondary">offer_id：{record.offerId || '--'} / product_id：{record.productId || '--'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '价格',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>当前：{record.price ?? '--'}</Text>
          <Text type="secondary">上限：{record.maxActionPrice ?? '--'}</Text>
        </Space>
      ),
    },
    {
      title: '活动价',
      width: 150,
      render: (_, record) => activeTab === 'CANDIDATE' ? (
        <InputNumber min={0.01} value={record.inputActionPrice} onChange={(value) => updateRow(record.key, { inputActionPrice: value })} style={{ width: 120 }} />
      ) : (
        record.actionPrice ?? '--'
      ),
    },
    {
      title: '活动库存',
      width: 140,
      render: (_, record) => activeTab === 'CANDIDATE' ? (
        <InputNumber min={0} precision={0} value={record.inputStock} onChange={(value) => updateRow(record.key, { inputStock: value })} style={{ width: 110 }} />
      ) : (
        record.stock ?? '--'
      ),
    },
    {
      title: '规则',
      width: 150,
      render: (_, record) => <Text type="secondary">最低库存：{record.minStock ?? '--'}</Text>,
    },
  ]

  const promotionColumns: ColumnsType<PromotionSummary> = [
    {
      title: '活动',
      dataIndex: 'title',
      render: (value, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{value || record.actionId}</Text>
          <Text type="secondary">ID：{record.actionId}</Text>
          <Text type="secondary">店铺：{record.shopNames.join(' / ') || '--'}</Text>
        </Space>
      ),
    },
    { title: '类型', dataIndex: 'actionType', width: 130, render: (value) => value || '--' },
    { title: '开始', dataIndex: 'dateStart', width: 160, render: (value) => value || '--' },
    { title: '结束', dataIndex: 'dateEnd', width: 160, render: (value) => value || '--' },
    { title: '可报名', dataIndex: 'potentialProductsCount', width: 100, render: (value) => value ?? '--' },
    { title: '已报名', dataIndex: 'participatingProductsCount', width: 100, render: (value) => value ?? '--' },
    {
      title: '状态',
      dataIndex: 'participating',
      width: 110,
      render: (value) => value ? <Tag color="green">已参与</Tag> : <Tag>未参与</Tag>,
    },
  ]

  return (
    <div className="scw-ops-page">
      <Alert showIcon type="info" message="活动报名按店铺和活动批量提交" description="活动价必须满足 Ozon 活动规则；未通过平台校验的商品会在任务结果中展示原因。" />
      <Card className="scw-ops-toolbar scw-ops-toolbar--sticky">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Select
              mode="multiple"
              value={effectiveAccountIds}
              placeholder="Ozon 店铺"
              style={{ width: '100%' }}
              options={ozonAccounts.map((item) => ({ label: getShopLabel(item), value: item.id }))}
              onChange={(values) => {
                setSelectedAccountIds(values)
                onAccountChange(values[0])
              }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Input value={keyword} placeholder="搜索活动名称 / ID" onChange={(event) => setKeyword(event.target.value)} />
          </Col>
          <Col xs={24} md={12}>
            <Space wrap>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={loadPromotions}>刷新活动</Button>
              <Button icon={<ReloadOutlined />} loading={productLoading} disabled={!selectedActionId} onClick={loadProducts}>刷新商品</Button>
              <Button loading={productLoading} disabled={!hasMoreActiveProducts} onClick={loadMoreProducts}>继续加载商品</Button>
              <Button type="primary" loading={submitting} disabled={activeTab !== 'CANDIDATE' || !!invalidReason} onClick={() => submit('ACTIVATE')}>报名选中商品</Button>
              <Button danger loading={submitting} disabled={activeTab !== 'PARTICIPATING' || !!invalidReason} onClick={() => submit('DEACTIVATE')}>退出选中商品</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="活动数量" value={promotions.length} prefix={<GiftOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="候选商品" value={candidateRows.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已报名商品" value={participatingRows.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已选商品" value={selectedRowKeys.length} /></Card></Col>
      </Row>
      <div className="scw-ops-grid scw-ops-grid--promotion">
        <Card title="活动列表" className="scw-ops-panel">
          <Table
            rowKey="actionId"
            loading={loading}
            columns={promotionColumns}
            dataSource={visiblePromotions}
            pagination={{ pageSize: 8 }}
            rowSelection={{ type: 'radio', selectedRowKeys: selectedActionId ? [selectedActionId] : [], onChange: (keys) => setSelectedActionId(String(keys[0])) }}
            onRow={(record) => ({ onClick: () => setSelectedActionId(record.actionId) })}
            scroll={{ x: 920, y: 'calc(100vh - 470px)' }}
          />
        </Card>
        <Card title={selectedPromotion ? `活动商品 - ${selectedPromotion.title}` : '活动商品'} className="scw-ops-panel">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as 'CANDIDATE' | 'PARTICIPATING')
              setSelectedRowKeys([])
            }}
            items={[
              { key: 'CANDIDATE', label: '候选商品', children: null },
              { key: 'PARTICIPATING', label: '已报名商品', children: null },
            ]}
          />
          <Table
            rowKey="key"
            loading={productLoading}
            columns={productColumns}
            dataSource={activeRows}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 880, y: 'calc(100vh - 530px)' }}
          />
        </Card>
      </div>
      <OzonOperationTaskDrawer open={taskOpen} task={task} onClose={() => setTaskOpen(false)} />
    </div>
  )
}
