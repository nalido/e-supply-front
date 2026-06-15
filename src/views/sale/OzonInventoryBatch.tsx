import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { Alert, App, Button, Card, Checkbox, Col, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import type { SaleAsyncTask, SaleChannelAccount, SaleOzonInventoryStock, SaleOzonWarehouse, SaleShopTag } from '../../types/sale'
import { getShopLabel } from './sale-center-helpers'
import OzonOperationTaskDrawer from './OzonOperationTaskDrawer'
import { getOzonGroupKey, resolveOzonProductDisplayInfo } from './ozon-product-display'
import { sortColorValues, sortSizeValues } from '../../utils/spec'

const { Text } = Typography

type InventoryProduct = {
  key: string
  channelAccountId: string
  shopName: string
  platformSpuId?: string | null
  platformSkcId?: string | null
  platformSkuId?: string | null
  spuKey?: string | null
  skcKey?: string | null
  spuLabel?: string | null
  skcLabel?: string | null
  offerId?: string | null
  factoryStyleNo?: string | null
  productId?: number | null
  name?: string | null
  imageUrl?: string | null
  color?: string | null
  colorName?: string | null
  size?: string | null
  makerSize?: string | null
  categoryName?: string | null
  platformStatus?: string | null
  price?: string | null
  currencyCode?: string | null
  stockPresent?: number | null
  stockReserved?: number | null
  updatedAt?: string | null
  targetStock?: number | null
}

type InventoryGroup = {
  key: string
  name?: string | null
  imageUrl?: string | null
  platformSpuId?: string | null
  platformSkcId?: string | null
  spuLabel?: string | null
  skcLabel?: string | null
  categoryName?: string | null
  platformStatus?: string | null
  colors: string[]
  sizes: string[]
  items: InventoryProduct[]
}

type InventoryDisplayRow = InventoryProduct & {
  groupKey: string
  groupHead: boolean
  groupRowSpan: number
  groupName?: string | null
  groupImageUrl?: string | null
  groupPlatformSpuId?: string | null
  groupPlatformSkcId?: string | null
  groupSpuLabel?: string | null
  groupSkcLabel?: string | null
  groupCategoryName?: string | null
  groupPlatformStatus?: string | null
  groupColors: string[]
  groupSizes: string[]
  groupItems: InventoryProduct[]
}

type Props = {
  accounts: SaleChannelAccount[]
  selectedAccountId?: string
  onAccountChange: (accountId: string) => void
}

const getAvatarText = (value?: string | null) => (value || '商').trim().slice(0, 1).toUpperCase()

const compareText = (left?: string | null, right?: string | null) =>
  (left || '').localeCompare(right || '', 'zh-CN', { numeric: true, sensitivity: 'base' })

const compareInventoryProducts = (left: InventoryProduct, right: InventoryProduct) => {
  const colorOrder = sortColorValues([left.color, right.color])
  const leftColorIndex = left.color ? colorOrder.indexOf(left.color) : Number.MAX_SAFE_INTEGER
  const rightColorIndex = right.color ? colorOrder.indexOf(right.color) : Number.MAX_SAFE_INTEGER
  if (leftColorIndex !== rightColorIndex) return leftColorIndex - rightColorIndex
  const sizeOrder = sortSizeValues([left.size, right.size])
  const leftSizeIndex = left.size ? sizeOrder.indexOf(left.size) : Number.MAX_SAFE_INTEGER
  const rightSizeIndex = right.size ? sizeOrder.indexOf(right.size) : Number.MAX_SAFE_INTEGER
  if (leftSizeIndex !== rightSizeIndex) return leftSizeIndex - rightSizeIndex
  return compareText(left.offerId, right.offerId)
}

const getMatrixGroupKey = (item: InventoryProduct) =>
  `${item.channelAccountId}::${getOzonGroupKey(
    {
      spuKey: item.spuKey || undefined,
      skcKey: item.skcKey || undefined,
      name: item.name || undefined,
    },
    item.key,
  )}`

const shallowEqualRecord = (left: Record<string, string>, right: Record<string, string>) => {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key])
}

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

export default function OzonInventoryBatch({ accounts, selectedAccountId, onAccountChange }: Props) {
  const { message } = App.useApp()
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [shopTags, setShopTags] = useState<SaleShopTag[]>([])
  const [selectedWarehouseByAccountId, setSelectedWarehouseByAccountId] = useState<Record<string, string>>({})
  const [warehousesByAccountId, setWarehousesByAccountId] = useState<Record<string, SaleOzonWarehouse[]>>({})
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [batchTargetStock, setBatchTargetStock] = useState<number | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(false)
  const [stockRefreshing, setStockRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [task, setTask] = useState<SaleAsyncTask | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)
  const [stockRefreshedAt, setStockRefreshedAt] = useState<string>()

  const ozonAccounts = useMemo(() => accounts.filter((item) => item.platformCode?.toUpperCase() === 'OZON'), [accounts])
  const effectiveAccountIds = useMemo(
    () => selectedAccountIds.length
      ? selectedAccountIds.filter((item) => ozonAccounts.some((account) => account.id === item))
      : selectedAccountId && ozonAccounts.some((item) => item.id === selectedAccountId)
        ? [selectedAccountId]
        : ozonAccounts[0]?.id ? [ozonAccounts[0].id] : [],
    [ozonAccounts, selectedAccountId, selectedAccountIds],
  )

  const getSelectedWarehouse = useCallback(
    (accountId: string) => {
      const warehouseId = selectedWarehouseByAccountId[accountId]
      return warehouseId ? warehousesByAccountId[accountId]?.find((item) => item.warehouseId === warehouseId) : undefined
    },
    [selectedWarehouseByAccountId, warehousesByAccountId],
  )

  const applyLiveStocks = useCallback(
    async (items: InventoryProduct[], warehouseMap: Record<string, string>) => {
      if (!items.length) return items
      const stocksByAccountProduct = new Map<string, SaleOzonInventoryStock>()
      const itemsByAccount = new Map<string, InventoryProduct[]>()
      items.forEach((item) => {
        itemsByAccount.set(item.channelAccountId, [...(itemsByAccount.get(item.channelAccountId) || []), item])
      })
      await Promise.all(Array.from(itemsByAccount.entries()).map(async ([accountId, accountItems]) => {
        const queryRows = accountItems
          .filter((item) => item.offerId || item.productId)
          .slice(0, 100)
          .map((item) => ({ offerId: item.offerId, productId: item.productId }))
        if (!queryRows.length) return
        const liveStocks = await saleApi.queryOzonInventoryStocks({
          channelAccountId: accountId,
          warehouseId: warehouseMap[accountId] ? Number(warehouseMap[accountId]) : undefined,
          rows: queryRows,
        })
        liveStocks.forEach((stock) => {
          if (stock.productId) stocksByAccountProduct.set(`${accountId}:product:${stock.productId}`, stock)
          if (stock.offerId) stocksByAccountProduct.set(`${accountId}:offer:${stock.offerId}`, stock)
        })
      }))
      setStockRefreshedAt(new Date().toLocaleString('zh-CN', { hour12: false }))
      return items.map((item) => {
        const stock = (item.productId ? stocksByAccountProduct.get(`${item.channelAccountId}:product:${item.productId}`) : undefined) || (item.offerId ? stocksByAccountProduct.get(`${item.channelAccountId}:offer:${item.offerId}`) : undefined)
        if (!stock) return item
        return {
          ...item,
          stockPresent: stock.present ?? stock.stock ?? item.stockPresent,
          stockReserved: stock.reserved ?? item.stockReserved,
        }
      })
    },
    [],
  )

  const loadData = useCallback(async () => {
    if (!effectiveAccountIds.length) return
    setLoading(true)
    try {
      const mappingPage = await saleApi.listProductMappingsPage({
        channelAccountIds: effectiveAccountIds,
        tagIds: selectedTagIds.length ? selectedTagIds : undefined,
        keyword: keyword.trim() || undefined,
        groupBy: 'SPU_SKC',
        page,
        pageSize,
      })
      const mappings = mappingPage.list ?? []
      setTotal(mappingPage.total ?? mappings.length)
      const accountIdsForRows = Array.from(new Set(mappings.map((item) => item.channelAccountId).filter(Boolean)))
      const warehouseAccountIds = Array.from(new Set([...effectiveAccountIds, ...accountIdsForRows]))
      const warehouseEntries = await Promise.all(
        warehouseAccountIds.map(async (accountId) => [accountId, await saleApi.listOzonWarehouses(accountId)] as const),
      )
      const nextWarehousesByAccountId = Object.fromEntries(warehouseEntries)
      setWarehousesByAccountId(nextWarehousesByAccountId)
      setSelectedWarehouseByAccountId((current) => {
        const nextWarehouseByAccountId = { ...current }
        warehouseEntries.forEach(([accountId, warehouseList]) => {
          if (!nextWarehouseByAccountId[accountId] || !warehouseList.some((item) => item.warehouseId === nextWarehouseByAccountId[accountId])) {
            nextWarehouseByAccountId[accountId] = warehouseList[0]?.warehouseId
          }
        })
        return shallowEqualRecord(current, nextWarehouseByAccountId) ? current : nextWarehouseByAccountId
      })
      const mappedProducts = mappings.flatMap((item) => {
        const shopName = getShopLabel(ozonAccounts.find((account) => account.id === item.channelAccountId))
        const skuRows = item.skus?.length ? item.skus : [item]
        return skuRows.map((sku) => {
          const merged = { ...item, ...sku }
          const display = resolveOzonProductDisplayInfo(merged)
          const groupDisplay = resolveOzonProductDisplayInfo(item)
          return {
            key: `${item.channelAccountId}:${sku.id}`,
            channelAccountId: item.channelAccountId,
            shopName,
            platformSpuId: groupDisplay.platformSpuId || display.platformSpuId,
            platformSkcId: groupDisplay.platformSkcId || display.platformSkcId,
            platformSkuId: display.platformSkuId,
            spuKey: groupDisplay.spuKey || display.spuKey,
            skcKey: groupDisplay.skcKey || display.skcKey,
            spuLabel: groupDisplay.spuLabel || display.spuLabel,
            skcLabel: groupDisplay.skcLabel || display.skcLabel,
            offerId: display.offerId,
            factoryStyleNo: display.factoryStyleNo,
            productId: display.productId,
            name: groupDisplay.name || display.name,
            imageUrl: groupDisplay.imageUrl || display.imageUrl,
            color: display.color,
            colorName: display.colorName,
            size: display.size,
            makerSize: display.makerSize,
            categoryName: groupDisplay.categoryName || display.categoryName,
            platformStatus: groupDisplay.platformStatus || display.platformStatus,
            price: display.price,
            currencyCode: display.currencyCode,
            stockPresent: display.stockPresent ?? null,
            stockReserved: display.stockReserved ?? null,
            updatedAt: sku.updatedAt || item.updatedAt,
            targetStock: null,
          }
        })
      }).filter((item) => item.offerId || item.productId)
      setProducts(mappedProducts)
      setSelectedRowKeys([])
      setStockRefreshedAt(undefined)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载 Ozon 库存数据失败')
    } finally {
      setLoading(false)
    }
  }, [effectiveAccountIds, keyword, message, ozonAccounts, page, pageSize, selectedTagIds])

  const refreshLiveStocks = useCallback(async () => {
    if (!products.length) {
      message.warning('当前没有可刷新的本地商品')
      return
    }
    setStockRefreshing(true)
    try {
      setProducts(await applyLiveStocks(products, selectedWarehouseByAccountId))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '刷新 Ozon 平台库存失败')
    } finally {
      setStockRefreshing(false)
    }
  }, [applyLiveStocks, message, products, selectedWarehouseByAccountId])

  useEffect(() => {
    saleApi.listSaleShopTags()
      .then(setShopTags)
      .catch((error) => message.error(error instanceof Error ? error.message : '加载店铺标签失败'))
  }, [message])

  useEffect(() => {
    if (effectiveAccountIds[0] && effectiveAccountIds[0] !== selectedAccountId) {
      onAccountChange(effectiveAccountIds[0])
    }
  }, [effectiveAccountIds, onAccountChange, selectedAccountId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const inventoryGroups = useMemo<InventoryGroup[]>(() => {
    const groupMap = new Map<string, InventoryProduct[]>()
    products.forEach((item) => {
      const key = getMatrixGroupKey(item)
      groupMap.set(key, [...(groupMap.get(key) || []), item])
    })
    return Array.from(groupMap.entries())
      .map(([key, items]) => {
        const sortedItems = [...items].sort(compareInventoryProducts)
        const head = sortedItems[0]
        return {
          key,
          name: head?.name,
          imageUrl: head?.imageUrl,
          platformSpuId: head?.platformSpuId,
          platformSkcId: head?.platformSkcId,
          spuLabel: head?.spuLabel,
          skcLabel: head?.skcLabel,
          categoryName: head?.categoryName,
          platformStatus: head?.platformStatus,
          colors: sortColorValues(sortedItems.map((item) => item.color)),
          sizes: sortSizeValues(sortedItems.map((item) => item.size)),
          items: sortedItems,
        }
      })
      .sort((left, right) => compareText(left.spuLabel, right.spuLabel) || compareText(left.skcLabel, right.skcLabel) || compareText(left.name, right.name))
  }, [products])

  const displayRows = useMemo<InventoryDisplayRow[]>(
    () =>
      inventoryGroups.flatMap((group) =>
        group.items.map((item, index) => ({
          ...item,
          groupKey: group.key,
          groupHead: index === 0,
          groupRowSpan: index === 0 ? group.items.length : 0,
          groupName: group.name,
          groupImageUrl: group.imageUrl,
          groupPlatformSpuId: group.platformSpuId,
          groupPlatformSkcId: group.platformSkcId,
          groupSpuLabel: group.spuLabel,
          groupSkcLabel: group.skcLabel,
          groupCategoryName: group.categoryName,
          groupPlatformStatus: group.platformStatus,
          groupColors: group.colors,
          groupSizes: group.sizes,
          groupItems: group.items,
        })),
      ),
    [inventoryGroups],
  )

  const selectedGroupKeys = useMemo(() => new Set(selectedRowKeys.map((item) => String(item))), [selectedRowKeys])
  const selectedRows = products.filter((item) => selectedGroupKeys.has(getMatrixGroupKey(item)))
  const selectedSkuCount = selectedRows.length
  const allGroupKeys = inventoryGroups.map((group) => group.key)
  const spuCount = new Set(products.map((item) => item.spuKey || item.name || item.key)).size
  const accountCount = new Set(products.map((item) => item.channelAccountId)).size
  const warehouseCount = Object.values(warehousesByAccountId).reduce((count, list) => count + list.length, 0)
  const allGroupsSelected = allGroupKeys.length > 0 && allGroupKeys.every((key) => selectedGroupKeys.has(key))
  const partiallySelected = selectedGroupKeys.size > 0 && !allGroupsSelected

  const toggleGroupSelection = (groupKey: string, checked: boolean) => {
    setSelectedRowKeys((current) => {
      const next = new Set(current.map((item) => String(item)))
      if (checked) {
        next.add(groupKey)
      } else {
        next.delete(groupKey)
      }
      return Array.from(next)
    })
  }

  const toggleAllGroups = (checked: boolean) => {
    setSelectedRowKeys(checked ? allGroupKeys : [])
  }

  const updateSelectedWarehouse = (accountId: string, warehouseId: string) => {
    setSelectedWarehouseByAccountId((current) => ({ ...current, [accountId]: warehouseId }))
    setStockRefreshedAt(undefined)
  }

  const invalidReason = !effectiveAccountIds.length
    ? '请选择类型为 Ozon 的店铺'
    : selectedRows.some((item) => !selectedWarehouseByAccountId[item.channelAccountId])
      ? '请为所选商品对应店铺选择 Ozon 仓库'
      : selectedRows.length === 0
        ? '请选择商品'
        : selectedRows.some((item) => item.targetStock === null || item.targetStock === undefined || item.targetStock < 0 || !Number.isInteger(item.targetStock))
          ? '目标库存必须是大于等于 0 的整数'
          : ''

  const updateTargetStock = (key: string, value: number | null) => {
    setProducts((current) => current.map((item) => item.key === key ? { ...item, targetStock: value } : item))
  }

  const applyBatchTargetStock = () => {
    if (!selectedRowKeys.length) {
      message.warning('请选择商品')
      return
    }
    if (batchTargetStock === null || batchTargetStock === undefined || batchTargetStock < 0 || !Number.isInteger(batchTargetStock)) {
      message.warning('批量目标库存必须是大于等于 0 的整数')
      return
    }
    setProducts((current) => current.map((item) => selectedGroupKeys.has(getMatrixGroupKey(item)) ? { ...item, targetStock: batchTargetStock } : item))
    message.success(`已为 ${selectedRows.length} 个 SKU 设置目标库存`)
  }

  const submit = () => {
    if (invalidReason) {
      message.warning(invalidReason)
      return
    }
    Modal.confirm({
      title: '确认设置 Ozon 目标库存',
      content: `将向 ${new Set(selectedRows.map((item) => item.channelAccountId)).size} 个店铺的 ${selectedRows.length} 个商品写入目标库存，库存值会覆盖对应店铺所选 Ozon 仓库当前可售库存。`,
      okText: '提交任务',
      cancelText: '取消',
      onOk: async () => {
        setSubmitting(true)
        try {
          const created = await saleApi.submitOzonInventoryUpdate({
            taskName: `Ozon 库存矩阵设置 - ${selectedRows.length} 个 SKU`,
            channelAccountIds: Array.from(new Set(selectedRows.map((item) => Number(item.channelAccountId)))),
            rows: selectedRows.map((item) => ({
              channelAccountId: Number(item.channelAccountId),
              offerId: item.offerId,
              productId: item.productId,
              warehouseId: Number(selectedWarehouseByAccountId[item.channelAccountId]),
              warehouseName: getSelectedWarehouse(item.channelAccountId)?.warehouseName,
              stock: Number(item.targetStock),
            })),
          })
          setTask(created)
          setTaskOpen(true)
          message.success('已创建 Ozon 库存设置任务')
          window.setTimeout(() => {
            void loadData()
          }, 3000)
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  const columns: ColumnsType<InventoryDisplayRow> = [
    {
      title: (
        <Checkbox
          checked={allGroupsSelected}
          indeterminate={partiallySelected}
          onChange={(event) => toggleAllGroups(event.target.checked)}
        />
      ),
      key: 'selection',
      width: 48,
      fixed: 'left',
      align: 'center',
      onCell: (record) => ({ rowSpan: record.groupRowSpan }),
      render: (_, record) =>
        record.groupHead ? (
          <Checkbox
            checked={selectedGroupKeys.has(record.groupKey)}
            onChange={(event) => toggleGroupSelection(record.groupKey, event.target.checked)}
          />
        ) : null,
    },
    {
      title: 'SPU / SKC',
      dataIndex: 'name',
      width: 400,
      fixed: 'left',
      onCell: (record) => ({ rowSpan: record.groupRowSpan }),
      render: (value, record) => (
        record.groupHead ? (
          <Space align="start" size={12}>
            <ProductThumb src={record.groupImageUrl} name={value} size={72} />
            <Space direction="vertical" size={4}>
              <Text strong>{value || record.groupPlatformSkcId || '--'}</Text>
              <Space size={[4, 4]} wrap>
                <Tag color="geekblue">SPU {record.groupSpuLabel || '--'}</Tag>
                <Tag color="magenta">SKC {record.groupSkcLabel || record.groupColors.join(' / ') || '--'}</Tag>
                <Tag color="blue">尺码 {record.groupSizes.length ? record.groupSizes.join(' / ') : '--'}</Tag>
                <Tag>{record.shopName}</Tag>
                <Tag>{record.groupItems.length} 个 SKU</Tag>
              </Space>
              {record.groupCategoryName ? <Text type="secondary">类目：{record.groupCategoryName}</Text> : null}
              {record.groupPlatformStatus ? <Text type="secondary">状态：{record.groupPlatformStatus}</Text> : null}
            </Space>
          </Space>
        ) : null
      ),
    },
    {
      title: '平台身份',
      key: 'platformIdentity',
      width: 210,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text copyable={{ text: String(record.productId || '') }}>product_id：{record.productId || '--'}</Text>
          <Text copyable={{ text: record.platformSkuId || '' }}>Ozon SKU：{record.platformSkuId || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '工厂货品',
      key: 'offerId',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text copyable={{ text: record.offerId || '' }}>货品ID：{record.offerId || '--'}</Text>
          <Text type="secondary">款号：{record.factoryStyleNo || '--'}</Text>
        </Space>
      ),
    },
    {
      title: 'SKU 规格',
      key: 'spec',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>颜色：{record.color || '--'}</Text>
          {record.colorName && record.colorName !== record.color ? <Text type="secondary">色名：{record.colorName}</Text> : null}
          <Text>尺码：{record.size || '--'}</Text>
          {record.makerSize && record.makerSize !== record.size ? <Text type="secondary">厂家尺码：{record.makerSize}</Text> : null}
        </Space>
      ),
    },
    {
      title: '平台库存',
      key: 'stock',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>可售：{record.stockPresent ?? '--'}</Text>
          <Text type="secondary">锁定：{record.stockReserved ?? 0}</Text>
          {record.price ? <Text type="secondary">{record.price} {record.currencyCode || ''}</Text> : null}
        </Space>
      ),
    },
    {
      title: '目标库存',
      dataIndex: 'targetStock',
      width: 150,
      render: (value, record) => (
        <InputNumber min={0} precision={0} value={value} onChange={(next) => updateTargetStock(record.key, next)} style={{ width: 120 }} />
      ),
    },
    {
      title: '校验',
      width: 120,
      render: (_, record) => {
        const ok = (record.offerId || record.productId) && record.targetStock !== null && record.targetStock !== undefined && record.targetStock >= 0
        return ok ? <Tag color="green">可提交</Tag> : <Tag color="red">需修正</Tag>
      },
    },
  ]

  return (
    <div className="scw-ops-page">
      <Alert
        showIcon
        type="warning"
        message="库存调整会覆盖 Ozon 当前仓库可售库存"
        description={stockRefreshedAt ? `页面默认展示本地已同步商品及最近同步快照；最近一次平台实时库存刷新：${stockRefreshedAt}。提交任务后可在结果明细中查看平台返回状态。` : '页面默认展示本地已同步商品及最近同步快照；只有点击“刷新平台库存”时才会实时读取 Ozon 平台库存。'}
      />
      <Card className="scw-ops-toolbar scw-ops-toolbar--sticky">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Select
              mode="multiple"
              value={effectiveAccountIds}
              placeholder="Ozon 店铺"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              options={ozonAccounts.map((item) => ({ label: getShopLabel(item), value: item.id }))}
              onChange={(values) => {
                setSelectedAccountIds(values)
                setPage(1)
                setSelectedRowKeys([])
                if (values[0]) onAccountChange(values[0])
              }}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              mode="multiple"
              value={selectedTagIds}
              placeholder="店铺标签"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              allowClear
              options={shopTags.map((item) => ({ label: item.tagName, value: item.tagId }))}
              onChange={(values) => {
                setSelectedTagIds(values)
                setPage(1)
                setSelectedRowKeys([])
              }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Input
              value={keyword}
              placeholder="搜索商品名 / 本地货号 / product_id / Ozon SKU / SPU / SKC"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              onPressEnter={() => void loadData()}
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Space wrap>
              <InputNumber
                min={0}
                precision={0}
                value={batchTargetStock}
                placeholder="批量目标库存"
                onChange={setBatchTargetStock}
                style={{ width: 140 }}
              />
              <Button disabled={!selectedRowKeys.length} onClick={applyBatchTargetStock}>应用到选中商品</Button>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>刷新本地商品</Button>
              <Button icon={<ReloadOutlined />} loading={stockRefreshing} onClick={refreshLiveStocks}>刷新平台库存</Button>
              <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting} disabled={!!invalidReason} onClick={submit}>提交库存任务</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Card size="small" title="店铺仓库映射">
        <div className="scw-warehouse-matrix">
          {effectiveAccountIds.map((accountId) => {
            const account = ozonAccounts.find((item) => item.id === accountId)
            const warehouseList = warehousesByAccountId[accountId] || []
            return (
              <div className="scw-warehouse-matrix__item" key={accountId}>
                <Text strong>{getShopLabel(account)}</Text>
                <Select
                  value={selectedWarehouseByAccountId[accountId]}
                  placeholder="Ozon 仓库"
                  style={{ minWidth: 220 }}
                  options={warehouseList.map((item) => ({ label: item.warehouseName, value: item.warehouseId }))}
                  onChange={(value) => updateSelectedWarehouse(accountId, value)}
                />
              </div>
            )
          })}
        </div>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="店铺数量" value={accountCount} prefix={<DatabaseOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="SPU 款数" value={spuCount} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="仓库数量" value={warehouseCount} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已选 SKU" value={selectedSkuCount} /></Card></Col>
      </Row>
      <Card title="商品库存">
        <Table
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={displayRows}
          pagination={{ current: page, pageSize, total, showSizeChanger: true }}
          onChange={(nextPagination) => {
            setPage(nextPagination.current || 1)
            setPageSize(nextPagination.pageSize || 50)
            setSelectedRowKeys([])
          }}
          scroll={{ x: 1478, y: 'calc(100vh - 460px)' }}
        />
      </Card>
      <OzonOperationTaskDrawer open={taskOpen} task={task} onClose={() => setTaskOpen(false)} />
    </div>
  )
}
