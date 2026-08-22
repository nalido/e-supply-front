import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { Alert, App, Button, Card, Col, Descriptions, Drawer, Empty, Input, Modal, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import styleDetailApi from '../../api/style-detail'
import type { SaleChannelAccount, SaleShopTag } from '../../types/sale'
import type { StyleDetailData } from '../../types/style'
import { getShopLabel, isMappedStatus } from './sale-center-helpers'
import { isSuspiciousHistoryRow, resolveOzonProductDisplayInfo, type OzonProductDisplayInfo } from './ozon-product-display'
import styleCompatibilityApi from '../../api/style-compatibility'
import type { ChannelStyleProfile } from '../../types/style-compatibility'

const { Text } = Typography

type ProductMappingRow = Awaited<ReturnType<typeof saleApi.listProductMappings>>[number]
type DisplayProductRow = ProductMappingRow &
  OzonProductDisplayInfo & {
    groupSkuCount: number;
  }

type Props = {
  accounts: SaleChannelAccount[]
  selectedAccountId?: string
  onAccountChange: (accountId?: string) => void
}

const parseSnapshot = (value?: string | null) => {
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

const getFactoryStyleNo = (row: { normalizedAttributesJson?: string | null }) => {
  const normalizedAttributes = parseSnapshot(row.normalizedAttributesJson)
  return textOf(
    normalizedAttributes?.factory_style_no,
    normalizedAttributes?.factoryStyleNo,
  )
}

const getAvatarText = (value?: string | null) => (value || '商').trim().slice(0, 1).toUpperCase()

const ProductThumb = ({ src, name, size = 56 }: { src?: string | null; name?: string | null; size?: number }) => {
  const normalizedSrc = src?.trim()
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [normalizedSrc])
  if (normalizedSrc && !failed) {
    return <img className="scw-thumb" src={normalizedSrc} alt={name || '商品图'} style={{ width: size, height: size }} onError={() => setFailed(true)} />
  }
  return (
    <div className="scw-thumb scw-thumb--placeholder" style={{ width: size, height: size }}>
      {getAvatarText(name)}
    </div>
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profiles, setProfiles] = useState<ChannelStyleProfile[]>([])
  const [profileStyle, setProfileStyle] = useState<{ id: string; styleNo?: string; styleName?: string } | null>(null)
  const [profileStyleDetail, setProfileStyleDetail] = useState<StyleDetailData | null>(null)
  const [profileRecord, setProfileRecord] = useState<DisplayProductRow | null>(null)

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
      const result = await saleApi.listProductMappingsPage({
        channelAccountIds: accountIds.length ? accountIds : undefined,
        tagIds: tagIds.length ? tagIds : undefined,
        keyword: keyword.trim() || undefined,
        offerId: offerId.trim() || undefined,
        platformSkuId: platformSkuId.trim() || undefined,
        mappingStatus: mappingStatus === 'ALL' ? undefined : mappingStatus,
        groupBy: 'SPU_SKC',
        page: tablePage,
        pageSize: tablePageSize,
      })
      setRows(result.list ?? [])
      setTotal(result.total ?? 0)
      setSelectedRowKeys([])
    } catch (error) {
      console.error(error)
      message.error(error instanceof Error ? error.message : '加载商品管理列表失败')
    } finally {
      setLoading(false)
    }
  }, [accountIds, keyword, mappingStatus, message, offerId, platformSkuId, tablePage, tablePageSize, tagIds])

  useEffect(() => {
    void loadTags()
  }, [loadTags])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    setTablePage(1)
  }, [accountIds, keyword, mappingStatus, offerId, platformSkuId, tagIds])

  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts])
  const visibleRows = rows
  const dirtyCount = useMemo(() => rows.filter(isSuspiciousHistoryRow).length, [rows])
  const mappedCount = useMemo(() => rows.filter((item) => isMappedStatus(item.mappingStatus)).length, [rows])
  const selectedRows = useMemo(() => visibleRows.filter((item) => selectedRowKeys.includes(item.id)), [selectedRowKeys, visibleRows])
  const currentSkuCount = useMemo(
    () => visibleRows.reduce((sum, item) => sum + (item.skus?.length || item.groupSkuCount || 1), 0),
    [visibleRows],
  )
  const getMappingIds = (items: ProductMappingRow[]) =>
    items.flatMap((item) => item.skus?.length ? item.skus.map((sku) => sku.id) : [item.id])
  const displayRows = useMemo<DisplayProductRow[]>(
    () => visibleRows.map((row) => {
      const display = resolveOzonProductDisplayInfo(row)
      return {
        ...row,
        ...display,
        platformSpuId: display.platformSpuId || row.platformSpuId,
        platformSkcId: display.platformSkcId || row.platformSkcId,
        platformSkuId: display.platformSkuId || row.platformSkuId,
        groupSkuCount: row.skus?.length || row.groupSkuCount || 1,
      }
    }),
    [visibleRows],
  )
  const hasScopedFilter = accountIds.length > 0
    || tagIds.length > 0
    || keyword.trim()
    || offerId.trim()
    || platformSkuId.trim()
    || mappingStatus !== 'ALL'

  const resetFilters = () => {
    setAccountIds(selectedAccountId ? [selectedAccountId] : [])
    setTagIds([])
    setKeyword('')
    setOfferId('')
    setPlatformSkuId('')
    setMappingStatus('ALL')
  }

  const handleDeleteSelected = () => {
    if (!selectedRows.length) {
      message.warning('请选择要删除的本地商品')
      return
    }
    Modal.confirm({
      title: '确认批量删除本地商品',
      content: `将清理 ${selectedRows.length} 条销售中心渠道记录及其待处理资料，Ozon 店铺中的商品不受影响。`,
      okText: '删除本地商品',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true)
        try {
          const result = await saleApi.bulkDeleteProductMappings(getMappingIds(selectedRows))
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
      content: `将清理当前筛选出的 ${visibleRows.length} 条销售中心渠道记录${shopNames ? `，店铺：${shopNames}` : ''}。Ozon 店铺中的商品不受影响。`,
      okText: '删除当前筛选结果',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setDeleting(true)
        try {
          const result = await saleApi.bulkDeleteProductMappings(getMappingIds(visibleRows))
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

  const openChannelProfiles = async (record: DisplayProductRow) => {
    setProfileRecord(record)
    setProfileStyle(record.styleId ? { id: record.styleId, styleNo: record.styleNo, styleName: record.styleName } : null)
    setProfileDrawerOpen(true)
    setProfiles([])
    setProfileStyleDetail(null)
    setProfileLoading(false)
    if (!record.styleId) return
    setProfileLoading(true)
    try {
      const [nextProfiles, nextStyleDetail] = await Promise.all([
        styleCompatibilityApi.getStyleProfiles(record.styleId),
        styleDetailApi.fetchDetail(record.styleId),
      ])
      setProfiles(nextProfiles)
      setProfileStyleDetail(nextStyleDetail)
    } catch (error) {
      setProfiles([])
      message.error(error instanceof Error ? error.message : '加载渠道款式资料失败')
    } finally {
      setProfileLoading(false)
    }
  }

  const columns: ColumnsType<DisplayProductRow> = [
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
      dataIndex: 'name',
      width: 380,
      render: (value: string | undefined, record) => (
        <Space align="start" size={12}>
          <ProductThumb src={record.imageUrl || record.platformMainImageUrl} name={value} size={64} />
          <Space direction="vertical" size={4}>
            <Text strong>{value || record.platformSkuCode || record.platformSkuId}</Text>
            <Space size={[4, 4]} wrap>
              <Tag color="geekblue">SPU {record.spuLabel || '--'}</Tag>
              <Tag color="magenta">SKC {record.skcLabel || record.platformSkcId || '--'}</Tag>
              <Tag>{record.groupSkuCount} 个 SKU</Tag>
              <Tag color={isMappedStatus(record.mappingStatus) ? 'green' : 'gold'}>
                {isMappedStatus(record.mappingStatus) ? '已绑定' : (record.mappingStatus || '待绑定')}
              </Tag>
              {isSuspiciousHistoryRow(record) ? <Tag color="red">疑似历史脏数据</Tag> : null}
            </Space>
            <Text type="secondary">类目：{record.categoryName || '--'}</Text>
            <Button type="link" size="small" style={{ padding: 0, width: 'fit-content' }} onClick={() => void openChannelProfiles(record)}>查看渠道款档</Button>
          </Space>
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
          <Text type="secondary">平台状态：{record.platformStatus || '--'}</Text>
        </Space>
      ),
    },
    {
      title: 'SKU 明细',
      key: 'skus',
      width: 560,
      render: (_, record) => (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {(record.skus?.length ? record.skus : [record]).map((sku) => {
            const skuDisplay = resolveOzonProductDisplayInfo({ ...record, ...sku })
            return (
              <div key={sku.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12, alignItems: 'start' }}>
                <Space direction="vertical" size={2}>
                  <Text copyable={{ text: sku.platformSkuId || '' }}>SKU：{sku.platformSkuId || '--'}</Text>
                  <Text type="secondary">渠道商品ID：{skuDisplay.productId || '--'}</Text>
                </Space>
                <Space direction="vertical" size={2}>
                  <Text>颜色：{skuDisplay.color || sku.normalizedColor || '--'}</Text>
                  <Text type="secondary">尺码：{skuDisplay.size || sku.normalizedSize || '--'}</Text>
                </Space>
                <Space direction="vertical" size={2}>
                  <Text copyable={{ text: sku.platformSkuCode || '' }}>卖家货号：{sku.platformSkuCode || '--'}</Text>
                  <Text type="secondary">工厂款号：{skuDisplay.factoryStyleNo || getFactoryStyleNo({ ...record, ...sku }) || '--'}</Text>
                </Space>
              </div>
            )
          })}
        </Space>
      ),
    },
    {
      title: '工厂款式映射',
      key: 'localBinding',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>{record.styleNo || '--'}</Text>
          <Text type="secondary">{record.styleName || '暂无本地款式'}</Text>
          <Tag color={record.styleId ? 'green' : 'gold'}>{record.styleId ? '已建立关联' : '待建立关联'}</Tag>
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
        type="info"
        message="Ozon 渠道款式"
        description="销售中心直接使用各店铺同步的 Ozon 名称、图片、类目和销售规格；生产资料独立维护，仅通过款式、颜色和 SKU 关联库存与销量。"
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
            <Input value={offerId} placeholder="按卖家货号过滤" onChange={(event) => setOfferId(event.target.value)} />
          </Col>
          <Col xs={24} xl={4}>
            <Input value={platformSkuId} placeholder="按渠道 SKU / 商品ID" onChange={(event) => setPlatformSkuId(event.target.value)} />
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
                删除选中渠道记录
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleting}
                disabled={!visibleRows.length || !hasScopedFilter}
                onClick={handleDeleteVisible}
              >
                删除筛选结果
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="当前页 SKC" value={visibleRows.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="疑似脏数据" value={dirtyCount} prefix={<WarningOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已绑定商品" value={mappedCount} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已选商品" value={selectedRows.length} /></Card></Col>
      </Row>
      <Card
        title="渠道商品列表"
        extra={<Text type="secondary">共 {total} 个商品组，当前页 {currentSkuCount} 条 SKU，可按店铺、卖家货号和店铺标签筛选。</Text>}
        className="scw-ops-panel"
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={displayRows}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          pagination={{
            current: tablePage,
            pageSize: tablePageSize,
            total,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setTablePage(page)
              setTablePageSize(pageSize)
            },
          }}
          scroll={{ x: 1320, y: 'calc(100vh - 420px)' }}
        />
      </Card>
      <Drawer
        title={<div><Text strong>Ozon 渠道款档</Text><br /><Text type="secondary">销售资料与工厂生产资料独立保存</Text></div>}
        width="min(900px, 100vw)"
        open={profileDrawerOpen}
        onClose={() => { setProfileDrawerOpen(false); setProfileRecord(null) }}
        destroyOnHidden
      >
        {profileRecord ? <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert showIcon type="info" message="当前销售页面直接读取此渠道款档" description="跨店铺铺货复用 Ozon 渠道资料，不从工厂款名或生产属性重新生成。工厂关联只用于库存、销量和生产联动。" />

          <Card size="small" title={<Space><Tag color="blue">Ozon</Tag><Text strong>{profileRecord.platformProductName || '未命名渠道款式'}</Text></Space>} extra={<Tag>{getShopLabel(accountMap.get(profileRecord.channelAccountId))}</Tag>}>
            <Space align="start" size={16} style={{ width: '100%' }}>
              <ProductThumb src={profileRecord.imageUrl || profileRecord.platformMainImageUrl} name={profileRecord.platformProductName} size={104} />
              <Descriptions size="small" column={2} style={{ flex: 1 }}>
                <Descriptions.Item label="Ozon SPU">{profileRecord.platformSpuId || '--'}</Descriptions.Item>
                <Descriptions.Item label="Ozon SKC">{profileRecord.platformSkcId || '--'}</Descriptions.Item>
                <Descriptions.Item label="渠道款号">{profileRecord.spuLabel || '--'}</Descriptions.Item>
                <Descriptions.Item label="渠道颜色">{profileRecord.color || profileRecord.normalizedColor || '--'}</Descriptions.Item>
                <Descriptions.Item label="渠道类目">{profileRecord.categoryName || profileRecord.platformCategoryPath || profileRecord.platformCategoryId || '--'}</Descriptions.Item>
                <Descriptions.Item label="渠道状态">{profileRecord.platformStatus || '--'}</Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>

          <Card size="small" title="SKU 明细" extra={<Text type="secondary">卖家货号是自动匹配工厂 SKU 的首要依据</Text>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(profileRecord.skus?.length ? profileRecord.skus : [profileRecord]).map((sku) => {
                const display = resolveOzonProductDisplayInfo({ ...profileRecord, ...sku })
                const factoryVariant = profileStyleDetail?.variants?.find((variant) => String(variant.id) === String(sku.styleVariantId))
                return <div key={sku.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.25fr)', gap: 12, padding: '10px 12px', border: '1px solid #eaecf0', borderRadius: 8, background: '#fcfcfd' }}>
                  <div><Text type="secondary">Ozon SKU</Text><br /><Text copyable={{ text: sku.platformSkuId || '' }}>{sku.platformSkuId || '--'}</Text></div>
                  <div><Text type="secondary">卖家货号</Text><br /><Text strong copyable={{ text: sku.platformSkuCode || '' }}>{sku.platformSkuCode || '--'}</Text></div>
                  <div><Text type="secondary">渠道规格</Text><br /><Text>{display.color || sku.normalizedColor || '--'} / {display.size || sku.normalizedSize || '--'}</Text></div>
                  <div><Text type="secondary">工厂 SKU 关联</Text><br />{sku.styleVariantId ? <Space direction="vertical" size={1}><Space size={4}><Tag color="green">已关联</Tag><Text strong>{factoryVariant?.systemSkuNo || factoryVariant?.skuNo || `SKU ${sku.styleVariantId}`}</Text></Space><Text type="secondary">{factoryVariant?.systemSkcNo || factoryVariant?.skcNo ? `工厂 SKC ${factoryVariant.systemSkcNo || factoryVariant.skcNo} · ` : ''}{sku.styleVariantColor || factoryVariant?.color || '--'} / {sku.styleVariantSize || factoryVariant?.size || '--'}</Text></Space> : <Tag color="gold">待关联</Tag>}</div>
                </div>
              })}
            </div>
          </Card>

          <Card size="small" title="生产关联" extra={<Tag color={profileStyle ? 'green' : 'gold'}>{profileStyle ? '已关联' : '待关联'}</Tag>}>
            {profileStyle ? <Descriptions size="small" column={2}>
              <Descriptions.Item label="工厂款号">{profileStyle.styleNo || '--'}</Descriptions.Item>
              <Descriptions.Item label="工厂款名">{profileStyle.styleName || '--'}</Descriptions.Item>
            </Descriptions> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未关联工厂款式，渠道资料仍可独立查看和使用" />}
          </Card>

          {profileStyle ? <Card size="small" title="同一工厂款关联的渠道款档" extra={<Text type="secondary">支持一个工厂款关联多个渠道款</Text>}>
            <Spin spinning={profileLoading}>
              {profiles.length ? <Space direction="vertical" size={10} style={{ width: '100%' }}>{profiles.map((profile) => <Card key={profile.profileId} size="small" type="inner" title={<Space><Tag color="blue">{profile.platformCode || 'Ozon'}</Tag><Text>{profile.platformTitle || '未命名渠道款式'}</Text></Space>} extra={<Tag>{profile.shopName || getShopLabel(accountMap.get(String(profile.channelAccountId)))}</Tag>}><Space align="start" size={12}><ProductThumb src={profile.platformImageUrl} name={profile.platformTitle} size={72} /><Descriptions size="small" column={2}><Descriptions.Item label="平台商品">{profile.platformProductId || profile.platformSpuId || '--'}</Descriptions.Item><Descriptions.Item label="语言">{profile.locale || '--'}</Descriptions.Item><Descriptions.Item label="SKU 关联">{profile.skuCount == null ? '--' : `${profile.mappedSkuCount || 0}/${profile.skuCount}`}</Descriptions.Item><Descriptions.Item label="渠道类目">{profile.platformCategoryPath || profile.platformCategoryId || '--'}</Descriptions.Item><Descriptions.Item label="渠道状态">{profile.platformStatus || '--'}</Descriptions.Item><Descriptions.Item label="更新时间">{profile.updatedAt || '--'}</Descriptions.Item></Descriptions></Space></Card>)}</Space> : (!profileLoading ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无其他渠道款档" /> : null)}
            </Spin>
          </Card> : null}
        </Space> : null}
      </Drawer>
    </div>
  )
}
