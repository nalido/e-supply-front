import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Key } from 'react'
import { Alert, App, Button, Card, Checkbox, Col, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import type { SaleAsyncTask, SaleChannelAccount, SaleOzonWarehouse } from '../../types/sale'
import { getShopLabel } from './sale-center-helpers'
import OzonOperationTaskDrawer from './OzonOperationTaskDrawer'
import { sortColorValues, sortSizeValues } from '../../utils/spec'

const { Text } = Typography

type InventoryProduct = {
  key: string
  platformSpuId?: string | null
  platformSkcId?: string | null
  platformSkuId?: string | null
  spuKey?: string | null
  skcKey?: string | null
  spuLabel?: string | null
  skcLabel?: string | null
  offerId?: string | null
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
  demoMode?: boolean
}

const parseSnapshot = (value?: string | null) => {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

const numberFrom = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const textFrom = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const arrayFrom = (value: unknown): unknown[] => Array.isArray(value) ? value : []

const valueFromAttribute = (attribute: Record<string, unknown>) => {
  const direct = textFrom(attribute.value)
  if (direct && !direct.startsWith('[')) return direct
  const values = arrayFrom(attribute.values)
  for (const item of values) {
    if (isRecord(item)) {
      const value = textFrom(item.value, item.name)
      if (value) return value
    }
    const value = textFrom(item)
    if (value) return value
  }
  return undefined
}

const collectAttributeMap = (...sources: Record<string, unknown>[]) => {
  const result = new Map<string, string>()
  sources.forEach((source) => {
    Object.entries(source).forEach(([key, value]) => {
      if (key === 'raw' || key === 'attributes' || key === 'price_info' || key === 'stock_info') return
      const text = textFrom(value)
      if (text) result.set(key.trim(), text)
    })
    arrayFrom(source.attributes).forEach((item) => {
      if (!isRecord(item)) return
      const name = textFrom(item.attribute_name_zh, item.attribute_name, item.name)
      const value = valueFromAttribute(item)
      if (name && value) result.set(name.trim(), value.trim())
    })
  })
  return result
}

const attributeText = (attributes: Map<string, string>, exactNames: string[], fuzzyNames: string[] = []) => {
  for (const name of exactNames) {
    const value = attributes.get(name)
    if (value) return value
  }
  for (const [key, value] of attributes.entries()) {
    const normalizedKey = key.toLowerCase()
    if (fuzzyNames.some((name) => normalizedKey.includes(name.toLowerCase()))) {
      return value
    }
  }
  return undefined
}

const firstImageFromSnapshot = (snapshot: Record<string, unknown>) => {
  const direct = textFrom(snapshot.primary_image, snapshot.primaryImage, snapshot.image, snapshot.image_url, snapshot.imageUrl)
  if (direct) return direct
  for (const image of arrayFrom(snapshot.images)) {
    if (isRecord(image)) {
      const value = textFrom(image.url, image.file_name, image.image, image.image_url)
      if (value) return value
    }
    const value = textFrom(image)
    if (value) return value
  }
  return undefined
}

const firstStockNumber = (snapshot: Record<string, unknown>, keys: string[]) => {
  const stockInfo = isRecord(snapshot.stock_info) ? snapshot.stock_info : {}
  const stocks = arrayFrom(stockInfo.stocks)
  for (const stock of stocks) {
    if (!isRecord(stock)) continue
    for (const key of keys) {
      const value = numberFrom(stock[key])
      if (value !== null) return value
    }
  }
  for (const key of keys) {
    const value = numberFrom(stockInfo[key])
    if (value !== null) return value
  }
  return null
}

const getAvatarText = (value?: string | null) => (value || '商').trim().slice(0, 1).toUpperCase()

const normalizeGroupText = (value?: string | null) => value?.trim().toLowerCase() || ''

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

const getGroupKey = (item: InventoryProduct) => {
  if (item.spuKey?.trim() && item.skcKey?.trim()) return `spu:${item.spuKey.trim()}::skc:${item.skcKey.trim()}`
  if (item.spuKey?.trim()) return `spu:${item.spuKey.trim()}::sku:${item.key}`
  if (item.name?.trim()) return `name:${normalizeGroupText(item.name)}`
  return `sku:${item.key}`
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

export default function OzonInventoryBatch({ accounts, selectedAccountId, onAccountChange, demoMode }: Props) {
  const { message } = App.useApp()
  const [warehouseId, setWarehouseId] = useState<string>()
  const [warehouses, setWarehouses] = useState<SaleOzonWarehouse[]>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [keyword, setKeyword] = useState('')
  const [batchTargetStock, setBatchTargetStock] = useState<number | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [task, setTask] = useState<SaleAsyncTask | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)

  const ozonAccounts = useMemo(() => accounts.filter((item) => item.platformCode?.toUpperCase() === 'OZON'), [accounts])
  const effectiveAccountId = ozonAccounts.some((item) => item.id === selectedAccountId) ? selectedAccountId : ozonAccounts[0]?.id
  const selectedWarehouse = warehouses.find((item) => item.warehouseId === warehouseId)

  const loadData = useCallback(async () => {
    if (!effectiveAccountId || demoMode) return
    setLoading(true)
    try {
      const [warehouseList, mappings] = await Promise.all([
        saleApi.listOzonWarehouses(effectiveAccountId),
        saleApi.listProductMappings({ channelAccountId: effectiveAccountId }),
      ])
      setWarehouses(warehouseList)
      setWarehouseId((current) => current || warehouseList[0]?.warehouseId)
      setProducts(mappings.map((item) => {
        const snapshot = parseSnapshot(item.platformSnapshotJson)
        const normalizedAttributes = parseSnapshot(item.normalizedAttributesJson)
        const attributes = collectAttributeMap(normalizedAttributes, snapshot)
        const productId = numberFrom(snapshot.product_id ?? snapshot.productId ?? item.platformSkuId)
        const offerId = textFrom(snapshot.offer_id, snapshot.offerId, item.platformSkuCode)
        const platformSkuId = textFrom(item.platformSkuId, snapshot.sku, snapshot.fbo_sku, snapshot.fbs_sku)
        const cardKey = attributeText(attributes, ['合并至一张卡片', 'Объединить на одной карточке'], ['合并', 'карточ'])
        const color = textFrom(
          item.normalizedColor,
          attributeText(attributes, ['商品颜色', 'Цвет товара'], ['颜色', 'цвет']),
          snapshot.color,
          snapshot.colour,
          snapshot.normalized_color,
          snapshot.normalizedColor,
        )
        const colorName = textFrom(attributeText(attributes, ['颜色名称', 'Название цвета']))
        const size = textFrom(
          item.normalizedSize,
          attributeText(attributes, ['俄罗斯尺码', 'Российский размер'], ['尺码', 'размер']),
          snapshot.size,
          snapshot.normalized_size,
          snapshot.normalizedSize,
        )
        const makerSize = textFrom(attributeText(attributes, ['由制造商规定尺码', 'Размер производителя']))
        const spuKey = textFrom(cardKey, item.platformProductName, snapshot.name, snapshot.title)
        const skcKey = textFrom(cardKey && color ? `${cardKey}:${color}` : undefined, color, colorName, offerId)
        return {
          key: item.id,
          platformSpuId: textFrom(item.platformSpuId, snapshot.spu_id, snapshot.spuId),
          platformSkcId: textFrom(item.platformSkcId, snapshot.skc_id, snapshot.skcId, snapshot.card_id, snapshot.cardId),
          platformSkuId,
          spuKey,
          skcKey,
          spuLabel: cardKey || spuKey,
          skcLabel: textFrom(colorName && color && colorName !== color ? `${color} / ${colorName}` : undefined, color, colorName),
          offerId,
          productId: productId ?? undefined,
          name: textFrom(item.platformProductName, snapshot.name, snapshot.title),
          imageUrl: textFrom(item.platformMainImageUrl, firstImageFromSnapshot(snapshot)),
          color,
          colorName,
          size,
          makerSize,
          categoryName: textFrom(item.platformCategoryPath, snapshot.description_category_name, snapshot.category_name, snapshot.type_name),
          platformStatus: textFrom(item.platformStatus, snapshot.visibility, snapshot.status, snapshot.state),
          price: textFrom(isRecord(snapshot.price_info) && isRecord(snapshot.price_info.price) ? snapshot.price_info.price.price : undefined, snapshot.price),
          currencyCode: textFrom(isRecord(snapshot.price_info) && isRecord(snapshot.price_info.price) ? snapshot.price_info.price.currency_code : undefined, snapshot.currency_code),
          stockPresent: firstStockNumber(snapshot, ['present', 'valid_stock_count', 'stock', 'available_stock_count']),
          stockReserved: firstStockNumber(snapshot, ['reserved', 'reserved_stock_count']),
          updatedAt: item.updatedAt,
          targetStock: null,
        }
      }).filter((item) => item.offerId || item.productId))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载 Ozon 库存数据失败')
    } finally {
      setLoading(false)
    }
  }, [demoMode, effectiveAccountId, message])

  useEffect(() => {
    if (!demoMode && effectiveAccountId && effectiveAccountId !== selectedAccountId) {
      onAccountChange(effectiveAccountId)
    }
  }, [demoMode, effectiveAccountId, onAccountChange, selectedAccountId])

  useEffect(() => {
    if (demoMode) {
      setWarehouses([
        { warehouseId: '100001', warehouseName: 'Ozon 默认仓', status: 'ACTIVE' },
        { warehouseId: '100002', warehouseName: '莫斯科前置仓', status: 'ACTIVE' },
      ])
      setWarehouseId('100001')
      setProducts([
        { key: 'demo-1', spuKey: 'ET0070+003-02', skcKey: 'ET0070+003-02:蓝色', spuLabel: 'ET0070+003-02', skcLabel: '蓝色', platformSkuId: '4472409140', offerId: 'ET0070-003-02-ZQ-140', productId: 4783514322, name: '儿童卫衣套装', color: '蓝色', size: '140', makerSize: '140cm', stockPresent: 20, targetStock: 12, updatedAt: '2026-06-04 08:30' },
        { key: 'demo-2', spuKey: 'ET0070+003-02', skcKey: 'ET0070+003-02:蓝色', spuLabel: 'ET0070+003-02', skcLabel: '蓝色', platformSkuId: '4472408357', offerId: 'ET0070-003-02-ZQ-160', productId: 4783512867, name: '儿童卫衣套装', color: '蓝色', size: '160', makerSize: '160cm', stockPresent: 8, targetStock: 0, updatedAt: '2026-06-04 08:30' },
        { key: 'demo-3', spuKey: 'ET0070+003-02', skcKey: 'ET0070+003-02:黑色', spuLabel: 'ET0070+003-02', skcLabel: '黑色', platformSkuId: '4472403039', offerId: 'ET0070-003-02-HS-140', productId: 4783513662, name: '儿童卫衣套装', color: '黑色', size: '140', makerSize: '140cm', stockPresent: 14, targetStock: 6, updatedAt: '2026-06-04 08:30' },
      ])
      setSelectedRowKeys(['spu:ET0070+003-02::skc:ET0070+003-02:蓝色'])
      return
    }
    void loadData()
  }, [demoMode, loadData])

  const filteredProducts = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    if (!text) return products
    return products.filter((item) =>
      [
        item.name,
        item.offerId,
        item.platformSkuId,
        item.productId ? String(item.productId) : '',
        item.spuLabel,
        item.skcLabel,
        item.color,
        item.size,
      ].some((value) => (value || '').toLowerCase().includes(text)),
    )
  }, [keyword, products])

  const inventoryGroups = useMemo<InventoryGroup[]>(() => {
    const groupMap = new Map<string, InventoryProduct[]>()
    filteredProducts.forEach((item) => {
      const key = getGroupKey(item)
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
  }, [filteredProducts])

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
  const selectedRows = products.filter((item) => selectedGroupKeys.has(getGroupKey(item)))
  const selectedSkuCount = selectedRows.length
  const allGroupKeys = inventoryGroups.map((group) => group.key)
  const spuCount = new Set(filteredProducts.map((item) => item.spuKey || item.name || item.key)).size
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

  const invalidReason = !effectiveAccountId
    ? '请选择类型为 Ozon 的店铺'
    : !warehouseId
      ? '请选择 Ozon 仓库'
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
    setProducts((current) => current.map((item) => selectedGroupKeys.has(getGroupKey(item)) ? { ...item, targetStock: batchTargetStock } : item))
    message.success(`已为 ${selectedRows.length} 个 SKU 设置目标库存`)
  }

  const submit = () => {
    if (invalidReason) {
      message.warning(invalidReason)
      return
    }
    if (demoMode) {
      setTask({
        taskId: 'DEMO-OZON-INVENTORY',
        taskType: 'OZON_INVENTORY_UPDATE',
        taskName: 'Ozon 库存设置 - Ozon 默认仓',
        status: 'SUCCESS',
        totalCount: selectedRows.length,
        successCount: selectedRows.length,
        failedCount: 0,
        skippedCount: 0,
        pendingCount: 0,
        runningCount: 0,
        progressPercent: 100,
      })
      setTaskOpen(true)
      return
    }
    Modal.confirm({
      title: '确认设置 Ozon 目标库存',
      content: `将向 ${selectedRows.length} 个商品写入目标库存，库存值会覆盖所选 Ozon 仓库当前可售库存。`,
      okText: '提交任务',
      cancelText: '取消',
      onOk: async () => {
        setSubmitting(true)
        try {
          const created = await saleApi.submitOzonInventoryUpdate({
            taskName: `Ozon 库存设置 - ${selectedWarehouse?.warehouseName || warehouseId}`,
            channelAccountIds: [Number(effectiveAccountId)],
            rows: selectedRows.map((item) => ({
              offerId: item.offerId,
              productId: item.productId,
              warehouseId: Number(warehouseId),
              warehouseName: selectedWarehouse?.warehouseName,
              stock: Number(item.targetStock),
            })),
          })
          setTask(created)
          setTaskOpen(true)
          message.success('已创建 Ozon 库存设置任务')
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
      width: 460,
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
      title: '本地货号',
      key: 'offerId',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text copyable={{ text: record.offerId || '' }}>{record.offerId || '--'}</Text>
          <Text type="secondary">offer_id</Text>
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
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        showIcon
        type="warning"
        message="库存调整会覆盖 Ozon 当前仓库可售库存"
        description="提交前请核对店铺、仓库、商品和目标库存；任务执行后可在结果明细中查看平台返回状态。"
      />
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={5}>
            <Select
              value={effectiveAccountId}
              placeholder="Ozon 店铺"
              style={{ width: '100%' }}
              options={ozonAccounts.map((item) => ({ label: getShopLabel(item), value: item.id }))}
              onChange={onAccountChange}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              value={warehouseId}
              placeholder="Ozon 仓库"
              style={{ width: '100%' }}
              options={warehouses.map((item) => ({ label: item.warehouseName, value: item.warehouseId }))}
              onChange={setWarehouseId}
            />
          </Col>
          <Col xs={24} md={6}>
            <Input value={keyword} placeholder="搜索商品名 / 本地货号 / product_id / Ozon SKU / SPU / SKC" onChange={(event) => setKeyword(event.target.value)} />
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
              <Button icon={<ReloadOutlined />} loading={loading} onClick={loadData}>刷新</Button>
              <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting} disabled={!!invalidReason} onClick={submit}>提交库存任务</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="SPU 款数" value={spuCount} prefix={<DatabaseOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="SKC 组数" value={inventoryGroups.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="仓库数量" value={warehouses.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已选 SKU" value={selectedSkuCount} /></Card></Col>
      </Row>
      <Card title="商品库存">
        <Table
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={displayRows}
          pagination={{ pageSize: 50 }}
          scroll={{ x: 1320 }}
        />
      </Card>
      <OzonOperationTaskDrawer open={taskOpen} task={task} onClose={() => setTaskOpen(false)} />
    </Space>
  )
}
