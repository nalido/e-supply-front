import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { Alert, App, Button, Card, Checkbox, Col, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import type { SaleChannelAccount, SaleShopTag } from '../../types/sale'
import { getShopLabel, isMappedStatus } from './sale-center-helpers'

const { Text } = Typography

type ProductMappingRow = Awaited<ReturnType<typeof saleApi.listProductMappings>>[number]

type Props = {
  accounts: SaleChannelAccount[]
  selectedAccountId?: string
  onAccountChange: (accountId?: string) => void
}

const parseSnapshot = (value?: string) => {
  if (!value) return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

const textOf = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const isSuspiciousHistoryRow = (row: ProductMappingRow) => {
  const snapshot = parseSnapshot(row.platformSnapshotJson)
  const snapshotProductId = textOf(
    snapshot?.product_id,
    snapshot?.productId,
    typeof snapshot?.raw === 'object' && snapshot?.raw && 'list' in snapshot.raw
      ? (snapshot.raw as Record<string, unknown>).list && typeof (snapshot.raw as Record<string, unknown>).list === 'object'
        ? (snapshot.raw as Record<string, unknown>).list && ((snapshot.raw as Record<string, unknown>).list as Record<string, unknown>).product_id
        : undefined
      : undefined,
  )
  const offerId = textOf(row.platformSkuCode, snapshot?.offer_id, snapshot?.offerId)
  return Boolean(
    row.platformSkuId
    && snapshotProductId
    && row.platformSkuId === snapshotProductId
    && !textOf(row.platformProductName)
    && offerId,
  )
}

const getFactoryStyleNo = (row: ProductMappingRow) => {
  const normalizedAttributes = parseSnapshot(row.normalizedAttributesJson)
  return textOf(
    normalizedAttributes?.factory_style_no,
    normalizedAttributes?.factoryStyleNo,
  )
}

export default function SaleProductManagement({ accounts, selectedAccountId, onAccountChange }: Props) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shopTags, setShopTags] = useState<SaleShopTag[]>([])
  const [rows, setRows] = useState<ProductMappingRow[]>([])
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [tagIds, setTagIds] = useState<string[]>([])
  const [keyword, setKeyword] = useState('')
  const [offerId, setOfferId] = useState('')
  const [platformSkuId, setPlatformSkuId] = useState('')
  const [mappingStatus, setMappingStatus] = useState('ALL')
  const [dirtyOnly, setDirtyOnly] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])

  useEffect(() => {
    if (selectedAccountId && !accountIds.length) {
      setAccountIds([selectedAccountId])
    }
  }, [accountIds.length, selectedAccountId])

  const loadTags = useCallback(async () => {
    try {
      setShopTags(await saleApi.listSaleShopTags())
    } catch (error) {
      console.error(error)
    }
  }, [])

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const list = await saleApi.listProductMappings({
        channelAccountIds: accountIds.length ? accountIds : undefined,
        tagIds: tagIds.length ? tagIds : undefined,
        keyword: keyword.trim() || undefined,
        offerId: offerId.trim() || undefined,
        platformSkuId: platformSkuId.trim() || undefined,
        mappingStatus: mappingStatus === 'ALL' ? undefined : mappingStatus,
      })
      setRows(list)
      setSelectedRowKeys([])
    } catch (error) {
      console.error(error)
      message.error(error instanceof Error ? error.message : '加载商品管理列表失败')
    } finally {
      setLoading(false)
    }
  }, [accountIds, keyword, mappingStatus, message, offerId, platformSkuId, tagIds])

  useEffect(() => {
    void loadTags()
  }, [loadTags])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts])
  const visibleRows = useMemo(
    () => (dirtyOnly ? rows.filter(isSuspiciousHistoryRow) : rows),
    [dirtyOnly, rows],
  )
  const dirtyCount = useMemo(() => rows.filter(isSuspiciousHistoryRow).length, [rows])
  const mappedCount = useMemo(() => rows.filter((item) => isMappedStatus(item.mappingStatus)).length, [rows])
  const selectedRows = useMemo(() => visibleRows.filter((item) => selectedRowKeys.includes(item.id)), [selectedRowKeys, visibleRows])
  const hasScopedFilter = accountIds.length > 0
    || tagIds.length > 0
    || keyword.trim()
    || offerId.trim()
    || platformSkuId.trim()
    || mappingStatus !== 'ALL'
    || dirtyOnly

  const resetFilters = () => {
    setAccountIds(selectedAccountId ? [selectedAccountId] : [])
    setTagIds([])
    setKeyword('')
    setOfferId('')
    setPlatformSkuId('')
    setMappingStatus('ALL')
    setDirtyOnly(false)
  }

  const handleDeleteSelected = () => {
    if (!selectedRows.length) {
      message.warning('请选择要删除的本地商品')
      return
    }
    Modal.confirm({
      title: '确认批量删除本地商品',
      content: `将删除 ${selectedRows.length} 条本地商品映射及其草稿数据，不会调用平台删品接口。该操作主要用于清理错误同步和历史脏数据。`,
      okText: '删除本地商品',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true)
        try {
          const result = await saleApi.bulkDeleteProductMappings(selectedRows.map((item) => item.id))
          message.success(`已删除 ${result.deletedCount} 条本地商品`)
          await loadRows()
        } catch (error) {
          console.error(error)
          message.error(error instanceof Error ? error.message : '批量删除本地商品失败')
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  const handleDeleteVisible = () => {
    if (!visibleRows.length) {
      message.warning('当前筛选结果没有可删除的本地商品')
      return
    }
    if (!hasScopedFilter) {
      message.warning('请先选择店铺、店铺标签或其他筛选条件，再删除当前筛选结果')
      return
    }
    const shopNames = accountIds
      .map((accountId) => getShopLabel(accountMap.get(accountId)))
      .filter(Boolean)
      .join(' / ')
    Modal.confirm({
      title: '确认删除当前筛选结果',
      content: `将删除当前筛选出的 ${visibleRows.length} 条本地商品映射及其草稿数据${shopNames ? `，店铺：${shopNames}` : ''}。不会调用平台删品接口。`,
      okText: '删除当前筛选结果',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true)
        try {
          const result = await saleApi.bulkDeleteProductMappings(visibleRows.map((item) => item.id))
          message.success(`已删除 ${result.deletedCount} 条本地商品`)
          await loadRows()
        } catch (error) {
          console.error(error)
          message.error(error instanceof Error ? error.message : '删除当前筛选结果失败')
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  const columns: ColumnsType<ProductMappingRow> = [
    {
      title: '店铺',
      dataIndex: 'channelAccountId',
      width: 180,
      render: (value: string) => {
        const account = accountMap.get(value)
        return (
          <Space direction="vertical" size={4}>
            <Text strong>{getShopLabel(account)}</Text>
            <Text type="secondary">店铺 ID：{value}</Text>
          </Space>
        )
      },
    },
    {
      title: '商品',
      dataIndex: 'platformProductName',
      width: 320,
      render: (value: string | undefined, record) => (
        <Space direction="vertical" size={4}>
          <Text strong>{value || record.platformSkuCode || record.platformSkuId}</Text>
          <Space size={[4, 4]} wrap>
            <Tag color={isMappedStatus(record.mappingStatus) ? 'green' : 'gold'}>
              {isMappedStatus(record.mappingStatus) ? '已绑定' : (record.mappingStatus || '待绑定')}
            </Tag>
            {isSuspiciousHistoryRow(record) ? <Tag color="red">疑似历史脏数据</Tag> : null}
          </Space>
          <Text type="secondary">颜色：{record.normalizedColor || '--'} / 尺码：{record.normalizedSize || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '平台标识',
      key: 'platformIdentity',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text copyable={{ text: record.platformSpuId || '' }}>{`SPU：${record.platformSpuId || '--'}`}</Text>
          <Text copyable={{ text: record.platformSkcId || '' }}>{`SKC：${record.platformSkcId || '--'}`}</Text>
          <Text copyable={{ text: record.platformSkuId }}>{`SKU：${record.platformSkuId}`}</Text>
        </Space>
      ),
    },
    {
      title: '工厂货品',
      dataIndex: 'platformSkuCode',
      width: 220,
      render: (value: string | undefined, record) => (
        <Space direction="vertical" size={4}>
          {value ? <Text copyable={{ text: value }}>货品ID：{value}</Text> : <Text>货品ID：--</Text>}
          <Text type="secondary">款号：{getFactoryStyleNo(record) || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '本地映射',
      key: 'localBinding',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>{record.styleNo || '--'}</Text>
          <Text type="secondary">{record.styleName || '暂无本地款式'}</Text>
        </Space>
      ),
    },
    {
      title: '同步时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (value: string | undefined, record) => value || record.lastSyncedAt || '--',
    },
  ]

  return (
    <div className="scw-ops-page">
      <Alert
        showIcon
        type="warning"
        message="商品管理用于治理本地同步商品，不直接修改平台商品"
        description="适合处理错误同步、历史脏数据、重复本地映射等问题。批量删除只影响本地商品映射和草稿，不会调用 Ozon 删品接口。"
      />
      <Card className="scw-ops-toolbar scw-ops-toolbar--sticky">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} xl={6}>
            <Select
              mode="multiple"
              allowClear
              value={accountIds}
              placeholder="按店铺过滤"
              style={{ width: '100%' }}
              options={accounts.map((item) => ({ label: getShopLabel(item), value: item.id }))}
              onChange={(values) => {
                setAccountIds(values)
                onAccountChange(values[0])
              }}
            />
          </Col>
          <Col xs={24} xl={4}>
            <Select
              mode="multiple"
              allowClear
              value={tagIds}
              placeholder="按店铺标签过滤"
              style={{ width: '100%' }}
              options={shopTags.map((item) => ({ label: item.tagName, value: item.tagId }))}
              onChange={setTagIds}
            />
          </Col>
          <Col xs={24} xl={4}>
            <Input value={offerId} placeholder="按 offer_id 过滤" onChange={(event) => setOfferId(event.target.value)} />
          </Col>
          <Col xs={24} xl={4}>
            <Input value={platformSkuId} placeholder="按平台 SKU / product_id" onChange={(event) => setPlatformSkuId(event.target.value)} />
          </Col>
          <Col xs={24} xl={4}>
            <Input value={keyword} placeholder="搜索商品名 / 规格 / 备注" onChange={(event) => setKeyword(event.target.value)} />
          </Col>
          <Col xs={24} xl={2}>
            <Select
              value={mappingStatus}
              style={{ width: '100%' }}
              options={[
                { label: '全部状态', value: 'ALL' },
                { label: '已绑定', value: 'ACTIVE' },
                { label: '待绑定', value: 'UNMAPPED' },
                { label: '冲突', value: 'CONFLICT' },
              ]}
              onChange={setMappingStatus}
            />
          </Col>
          <Col span={24}>
            <Space wrap>
              <Checkbox checked={dirtyOnly} onChange={(event) => setDirtyOnly(event.target.checked)}>
                只看疑似历史脏数据
              </Checkbox>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadRows()}>
                刷新列表
              </Button>
              <Button onClick={resetFilters}>重置筛选</Button>
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                loading={deleting}
                disabled={!selectedRows.length}
                onClick={handleDeleteSelected}
              >
                批量删除本地商品
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleting}
                disabled={!visibleRows.length || !hasScopedFilter}
                onClick={handleDeleteVisible}
              >
                删除当前筛选结果
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="当前列表商品" value={visibleRows.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="疑似脏数据" value={dirtyCount} prefix={<WarningOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已绑定商品" value={mappedCount} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已选商品" value={selectedRows.length} /></Card></Col>
      </Row>
      <Card
        title="本地商品列表"
        extra={<Text type="secondary">共 {rows.length} 条，支持按店铺、offer_id、店铺标签筛选并批量删除本地商品。</Text>}
        className="scw-ops-panel"
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={visibleRows}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 1260, y: 'calc(100vh - 420px)' }}
        />
      </Card>
    </div>
  )
}
