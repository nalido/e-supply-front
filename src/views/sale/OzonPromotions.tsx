import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Key } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Collapse,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { GiftOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import type { SaleAsyncTask, SaleChannelAccount, SaleOzonPromotion, SaleProductMapping, SaleShopTag } from '../../types/sale'
import { getShopLabel } from './sale-center-helpers'
import OzonOperationTaskDrawer from './OzonOperationTaskDrawer'
import { resolveOzonProductDisplayInfo } from './ozon-product-display'
import '../../styles/matrix-table.css'

const { Text } = Typography

const PRODUCT_PAGE_SIZE = 200
const MAX_PRODUCT_PAGES = 50
const DEFAULT_ACCOUNT_PROBE_LIMIT = 12

type PromotionSummary = SaleOzonPromotion & {
  key: string
  channelAccountIds: string[]
  shopNames: string[]
}

type ShopScopedProduct = {
  key: string
  businessKey: string
  channelAccountId: string
  shopName: string
  styleNo?: string | null
  styleName?: string | null
  styleVariantId?: string | null
  name?: string | null
  imageUrl?: string | null
  offerId?: string | null
  productId?: number | null
  platformSkuId?: string | null
  platformSpuId?: string | null
  platformSkcId?: string | null
  normalizedColor?: string | null
  normalizedSize?: string | null
  normalizedSpecSummary?: string | null
  price?: number | null
  stockPresent?: number | null
}

type BusinessProductRow = {
  key: string
  name?: string | null
  imageUrl?: string | null
  styleNo?: string | null
  styleName?: string | null
  platformSpuId?: string | null
  platformSkcId?: string | null
  specSummary?: string | null
  colors: string[]
  sizes: string[]
  syncedAccountIds: string[]
  syncedShopNames: string[]
  shopRows: ShopScopedProduct[]
}

type RequestInput = {
  actionPrice?: number | null
  stock?: number | null
}

type SkippedCombination = {
  key: string
  rowKey: string
  productName?: string | null
  shopName: string
  offerId?: string | null
  productId?: number | null
  reason: string
}

type RequestDraftRow = {
  key: string
  product: BusinessProductRow
  legalItems: ShopScopedProduct[]
  skippedItems: SkippedCombination[]
  currentPriceSuggestion?: number | null
  currentStockSuggestion?: number | null
}

type PromotionSuggestion = {
  actionPrice?: number | null
  stock?: number | null
}

type Props = {
  accounts: SaleChannelAccount[]
  selectedAccountId?: string
  onAccountChange: (accountId: string, options?: { persist?: boolean }) => void
}

const compareText = (left?: string | null, right?: string | null) =>
  (left || '').localeCompare(right || '', 'zh-CN', { numeric: true, sensitivity: 'base' })

const getAvatarText = (value?: string | null) => (value || '商').trim().slice(0, 1).toUpperCase()

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

const numberFrom = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const parseJson = (value?: string | null): Record<string, unknown> => {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

const firstNumber = (raw: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = numberFrom(raw[key])
    if (value !== null) {
      return value
    }
  }
  return null
}

type BusinessKeySource = {
  id: string
  styleNo?: string | null
  styleVariantId?: string | null
}

const buildBusinessKey = (
  mapping: BusinessKeySource,
  row: ShopScopedProduct,
) => {
  if (mapping.styleVariantId?.trim()) {
    return `variant:${mapping.styleVariantId.trim()}`
  }
  if (mapping.styleNo?.trim() && row.normalizedColor?.trim() && row.normalizedSize?.trim()) {
    return `style-sku:${mapping.styleNo.trim()}:${row.normalizedColor.trim()}:${row.normalizedSize.trim()}`
  }
  if (row.offerId?.trim()) {
    return `offer:${row.offerId.trim()}`
  }
  if (row.productId) {
    return `product:${row.productId}`
  }
  return `mapping:${mapping.id}`
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

const mergePromotions = (listByAccount: Array<{ accountId: string; shopName: string; promotions: SaleOzonPromotion[] }>) => {
  const grouped = new Map<string, PromotionSummary>()
  listByAccount.forEach(({ accountId, shopName, promotions }) => {
    promotions.forEach((promotion) => {
      const current = grouped.get(promotion.actionId)
      if (!current) {
        grouped.set(promotion.actionId, {
          ...promotion,
          key: promotion.actionId,
          channelAccountIds: [accountId],
          shopNames: shopName ? [shopName] : [],
        })
        return
      }
      if (!current.channelAccountIds.includes(accountId)) {
        current.channelAccountIds = [...current.channelAccountIds, accountId]
      }
      if (shopName && !current.shopNames.includes(shopName)) {
        current.shopNames = [...current.shopNames, shopName]
      }
    })
  })
  return Array.from(grouped.values()).sort(
    (left, right) =>
      compareText(left.dateEnd, right.dateEnd)
      || compareText(left.dateStart, right.dateStart)
      || compareText(left.title, right.title),
  )
}

const buildBusinessRows = (mappings: SaleProductMapping[], accountsById: Map<string, SaleChannelAccount>) => {
  const grouped = new Map<string, BusinessProductRow>()
  mappings.forEach((mapping) => {
    const account = accountsById.get(mapping.channelAccountId)
    const shopName = getShopLabel(account)
    const groupDisplay = resolveOzonProductDisplayInfo(mapping)
    const skuRows = mapping.skus?.length ? mapping.skus : [mapping]
    skuRows.forEach((sku) => {
      const merged = { ...mapping, ...sku }
      const display = resolveOzonProductDisplayInfo(merged)
      const shopRow: ShopScopedProduct = {
        key: `${mapping.channelAccountId}:${sku.id}`,
        businessKey: '',
        channelAccountId: mapping.channelAccountId,
        shopName,
        styleNo: merged.styleNo,
        styleName: merged.styleName,
        styleVariantId: merged.styleVariantId,
        name: groupDisplay.name || display.name || merged.platformProductName,
        imageUrl: groupDisplay.imageUrl || display.imageUrl || merged.platformMainImageUrl,
        offerId: display.offerId,
        productId: display.productId,
        platformSkuId: display.platformSkuId,
        platformSpuId: groupDisplay.platformSpuId || display.platformSpuId,
        platformSkcId: groupDisplay.platformSkcId || display.platformSkcId,
        normalizedColor: display.color,
        normalizedSize: display.size,
        normalizedSpecSummary: merged.normalizedSpecSummary || [display.color, display.size].filter(Boolean).join(' / '),
        price: numberFrom(display.price),
        stockPresent: display.stockPresent ?? null,
      }
      const businessKey = buildBusinessKey(merged, shopRow)
      shopRow.businessKey = businessKey
      const current = grouped.get(businessKey)
      if (!current) {
        grouped.set(businessKey, {
          key: businessKey,
          name: shopRow.name,
          imageUrl: shopRow.imageUrl,
          styleNo: shopRow.styleNo,
          styleName: shopRow.styleName,
          platformSpuId: shopRow.platformSpuId,
          platformSkcId: shopRow.platformSkcId,
          specSummary: shopRow.normalizedSpecSummary,
          colors: shopRow.normalizedColor ? [shopRow.normalizedColor] : [],
          sizes: shopRow.normalizedSize ? [shopRow.normalizedSize] : [],
          syncedAccountIds: [shopRow.channelAccountId],
          syncedShopNames: shopName ? [shopName] : [],
          shopRows: [shopRow],
        })
        return
      }
      current.shopRows = [...current.shopRows, shopRow]
      if (shopRow.normalizedColor && !current.colors.includes(shopRow.normalizedColor)) {
        current.colors = [...current.colors, shopRow.normalizedColor]
      }
      if (shopRow.normalizedSize && !current.sizes.includes(shopRow.normalizedSize)) {
        current.sizes = [...current.sizes, shopRow.normalizedSize]
      }
      if (!current.syncedAccountIds.includes(shopRow.channelAccountId)) {
        current.syncedAccountIds = [...current.syncedAccountIds, shopRow.channelAccountId]
      }
      if (shopName && !current.syncedShopNames.includes(shopName)) {
        current.syncedShopNames = [...current.syncedShopNames, shopName]
      }
      current.name = current.name || shopRow.name
      current.imageUrl = current.imageUrl || shopRow.imageUrl
      current.styleNo = current.styleNo || shopRow.styleNo
      current.styleName = current.styleName || shopRow.styleName
      current.platformSpuId = current.platformSpuId || shopRow.platformSpuId
      current.platformSkcId = current.platformSkcId || shopRow.platformSkcId
      current.specSummary = current.specSummary || shopRow.normalizedSpecSummary
    })
  })
  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      shopRows: [...row.shopRows].sort(
        (left, right) =>
          compareText(left.shopName, right.shopName)
          || compareText(left.normalizedColor, right.normalizedColor)
          || compareText(left.normalizedSize, right.normalizedSize),
      ),
      syncedAccountIds: [...row.syncedAccountIds].sort(compareText),
      syncedShopNames: [...row.syncedShopNames].sort(compareText),
      colors: [...row.colors].sort(compareText),
      sizes: [...row.sizes].sort(compareText),
    }))
    .sort(
      (left, right) =>
        compareText(left.styleNo, right.styleNo)
        || compareText(left.name, right.name)
        || compareText(left.specSummary, right.specSummary)
        || compareText(left.key, right.key),
    )
}

const summarizeRowScope = (row: BusinessProductRow, accountIds: string[], selectedPromotion?: PromotionSummary) => {
  if (!selectedPromotion) {
    return {
      legalCount: 0,
      missingActivityCount: 0,
      missingSyncCount: 0,
      missingIdentityCount: 0,
    }
  }
  const activityAccountSet = new Set(selectedPromotion.channelAccountIds)
  const productByAccount = new Map(row.shopRows.map((item) => [item.channelAccountId, item]))
  let legalCount = 0
  let missingActivityCount = 0
  let missingSyncCount = 0
  let missingIdentityCount = 0
  accountIds.forEach((accountId) => {
    if (!activityAccountSet.has(accountId)) {
      missingActivityCount += 1
      return
    }
    const product = productByAccount.get(accountId)
    if (!product) {
      missingSyncCount += 1
      return
    }
    if (!product.offerId && !product.productId) {
      missingIdentityCount += 1
      return
    }
    legalCount += 1
  })
  return { legalCount, missingActivityCount, missingSyncCount, missingIdentityCount }
}

const resolvePromotionSuggestion = (promotion?: PromotionSummary): PromotionSuggestion => {
  if (!promotion?.rawPayloadJson) {
    return {}
  }
  const raw = parseJson(promotion.rawPayloadJson)
  return {
    actionPrice: firstNumber(raw, ['action_price', 'actionPrice', 'recommended_action_price', 'suggested_action_price', 'max_action_price']),
    stock: firstNumber(raw, ['stock', 'recommended_stock', 'suggested_stock', 'min_stock', 'minStock']),
  }
}

export default function OzonPromotions({ accounts, selectedAccountId, onAccountChange }: Props) {
  const { message } = App.useApp()
  const messageRef = useRef(message)
  const defaultAccountProbeKeyRef = useRef<string>()
  const defaultAccountProbeRunIdRef = useRef(0)
  const prefetchedPromotionScopeRef = useRef<{
    scopeKey: string
    listByAccount: Array<{ accountId: string; shopName: string; promotions: SaleOzonPromotion[] }>
    failedAccounts: Array<{ shopName: string; message: string }>
  } | null>(null)
  const promotionAutoLoadKeyRef = useRef<string>()
  const productAutoLoadKeyRef = useRef<string>()
  messageRef.current = message
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [shopTags, setShopTags] = useState<SaleShopTag[]>([])
  const [activityKeyword, setActivityKeyword] = useState('')
  const [productKeyword, setProductKeyword] = useState('')
  const [promotions, setPromotions] = useState<PromotionSummary[]>([])
  const [selectedActionId, setSelectedActionId] = useState<string>()
  const [allBusinessRows, setAllBusinessRows] = useState<BusinessProductRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [requestInputs, setRequestInputs] = useState<Record<string, RequestInput>>({})
  const [batchActionPrice, setBatchActionPrice] = useState<number | null>(null)
  const [batchStock, setBatchStock] = useState<number | null>(null)
  const [loadingPromotions, setLoadingPromotions] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [promotionLoadNotice, setPromotionLoadNotice] = useState('')
  const [resolvedDefaultAccountId, setResolvedDefaultAccountId] = useState<string>()
  const [resolvingDefaultAccount, setResolvingDefaultAccount] = useState(false)
  const [task, setTask] = useState<SaleAsyncTask | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)

  const ozonAccounts = useMemo(() => accounts.filter((item) => item.platformCode?.toUpperCase() === 'OZON'), [accounts])
  const accountsById = useMemo(() => new Map(ozonAccounts.map((item) => [item.id, item])), [ozonAccounts])
  const validOzonAccountIds = useMemo(() => new Set(ozonAccounts.map((item) => item.id)), [ozonAccounts])
  const autoDefaultProbeAccounts = useMemo(
    () => [...ozonAccounts]
      .sort((left, right) => {
        const leftId = Number(left.id)
        const rightId = Number(right.id)
        if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
          return leftId - rightId
        }
        return compareText(getShopLabel(left), getShopLabel(right))
      })
      .slice(0, DEFAULT_ACCOUNT_PROBE_LIMIT),
    [ozonAccounts],
  )
  const explicitAccountIds = useMemo(
    () => selectedAccountIds.filter((accountId) => validOzonAccountIds.has(accountId)),
    [selectedAccountIds, validOzonAccountIds],
  )

  const taggedAccountIds = useMemo(() => {
    return Array.from(
      new Set(
        selectedTagIds.flatMap((tagId) => shopTags.find((item) => item.tagId === tagId)?.accountIds ?? [])
          .filter((accountId) => validOzonAccountIds.has(accountId)),
      ),
    )
  }, [selectedTagIds, shopTags, validOzonAccountIds])

  const hasExplicitScopeSelection = Boolean(explicitAccountIds.length || selectedTagIds.length)
  const manualSelectedAccountId = useMemo(() => {
    if (!selectedAccountId || !validOzonAccountIds.has(selectedAccountId)) {
      return undefined
    }
    if (!hasExplicitScopeSelection && resolvedDefaultAccountId && selectedAccountId === resolvedDefaultAccountId) {
      return undefined
    }
    return selectedAccountId
  }, [hasExplicitScopeSelection, resolvedDefaultAccountId, selectedAccountId, validOzonAccountIds])

  const effectiveAccountIds = useMemo(() => {
    if (explicitAccountIds.length && taggedAccountIds.length) {
      return explicitAccountIds.filter((accountId) => taggedAccountIds.includes(accountId))
    }
    if (explicitAccountIds.length) {
      return explicitAccountIds
    }
    if (taggedAccountIds.length) {
      return taggedAccountIds
    }
    if (manualSelectedAccountId) {
      return [manualSelectedAccountId]
    }
    if (resolvedDefaultAccountId && validOzonAccountIds.has(resolvedDefaultAccountId)) {
      return [resolvedDefaultAccountId]
    }
    return []
  }, [explicitAccountIds, manualSelectedAccountId, resolvedDefaultAccountId, taggedAccountIds, validOzonAccountIds])

  const selectedPromotion = useMemo(
    () => promotions.find((item) => item.actionId === selectedActionId),
    [promotions, selectedActionId],
  )
  const promotionSuggestion = useMemo(() => resolvePromotionSuggestion(selectedPromotion), [selectedPromotion])
  const selectedRowKeySet = useMemo(() => new Set(selectedRowKeys.map((item) => String(item))), [selectedRowKeys])
  const selectedProducts = useMemo(
    () => allBusinessRows.filter((row) => selectedRowKeySet.has(row.key)),
    [allBusinessRows, selectedRowKeySet],
  )
  const effectiveAccountScopeKey = useMemo(() => effectiveAccountIds.join(','), [effectiveAccountIds])
  const scopedAccountIds = useMemo(
    () => (effectiveAccountScopeKey ? effectiveAccountScopeKey.split(',').filter(Boolean) : []),
    [effectiveAccountScopeKey],
  )
  const productQueryKey = useMemo(
    () => `${effectiveAccountScopeKey}|${productKeyword.trim()}`,
    [effectiveAccountScopeKey, productKeyword],
  )
  const scopeReady = Boolean(explicitAccountIds.length || selectedTagIds.length || manualSelectedAccountId || resolvedDefaultAccountId)

  const applyPromotionLoadResult = useCallback((
    listByAccount: Array<{ accountId: string; shopName: string; promotions: SaleOzonPromotion[] }>,
    failedAccounts: Array<{ shopName: string; message: string }>,
  ) => {
    const merged = mergePromotions(listByAccount)
    setPromotions(merged)
    setSelectedActionId((current) => merged.some((item) => item.actionId === current) ? current : merged[0]?.actionId)
    if (!failedAccounts.length) {
      setPromotionLoadNotice('')
      return
    }
    const failedSummary = failedAccounts
      .slice(0, 3)
      .map((item) => `${item.shopName || '未命名店铺'}：${item.message}`)
      .join('；')
    setPromotionLoadNotice(
      listByAccount.length
        ? `已跳过 ${failedAccounts.length} 个活动加载失败的店铺。${failedSummary}`
        : `当前选中的店铺活动暂时加载失败。${failedSummary}`,
    )
    if (!listByAccount.length) {
      messageRef.current.warning('当前店铺活动暂时加载失败，请切换其他店铺或扩大店铺范围后重试')
    }
  }, [])

  const loadPromotions = useCallback(async () => {
    if (!scopedAccountIds.length) {
      setPromotions([])
      setSelectedActionId(undefined)
      setPromotionLoadNotice('')
      return
    }
    setLoadingPromotions(true)
    setPromotionLoadNotice('')
    try {
      const prefetchedScope = prefetchedPromotionScopeRef.current
      if (prefetchedScope?.scopeKey === effectiveAccountScopeKey) {
        prefetchedPromotionScopeRef.current = null
        applyPromotionLoadResult(prefetchedScope.listByAccount, prefetchedScope.failedAccounts)
        return
      }
      const settled = await Promise.allSettled(
        scopedAccountIds.map(async (accountId) => ({
          accountId,
          shopName: getShopLabel(accountsById.get(accountId)),
          promotions: await saleApi.listOzonPromotions(accountId, { suppressGlobalError: true }),
        })),
      )
      const listByAccount: Array<{ accountId: string; shopName: string; promotions: SaleOzonPromotion[] }> = []
      const failedAccounts: Array<{ shopName: string; message: string }> = []
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          listByAccount.push(result.value)
          return
        }
        failedAccounts.push({
          shopName: getShopLabel(accountsById.get(scopedAccountIds[index])),
          message: getErrorMessage(result.reason, '加载失败'),
        })
      })
      applyPromotionLoadResult(listByAccount, failedAccounts)
    } catch (error) {
      messageRef.current.error(getErrorMessage(error, '加载 Ozon 活动失败'))
    } finally {
      setLoadingPromotions(false)
    }
  }, [accountsById, applyPromotionLoadResult, effectiveAccountScopeKey, scopedAccountIds])

  const loadProducts = useCallback(async () => {
    if (!scopedAccountIds.length) {
      setAllBusinessRows([])
      setSelectedRowKeys([])
      return
    }
    setLoadingProducts(true)
    try {
      const allMappings: SaleProductMapping[] = []
      let currentPage = 1
      let total = 0
      while (currentPage <= MAX_PRODUCT_PAGES) {
        const response = await saleApi.listProductMappingsPage({
          channelAccountIds: scopedAccountIds,
          keyword: productKeyword.trim() || undefined,
          groupBy: 'SPU_SKC',
          view: 'DETAIL',
          page: currentPage,
          pageSize: PRODUCT_PAGE_SIZE,
        })
        const pageRows = response.list ?? []
        allMappings.push(...pageRows)
        total = response.total ?? allMappings.length
        if (!pageRows.length || allMappings.length >= total) {
          break
        }
        currentPage += 1
      }
      setAllBusinessRows(buildBusinessRows(allMappings, accountsById))
      setPage(1)
      setSelectedRowKeys([])
      setRequestInputs({})
    } catch (error) {
      messageRef.current.error(getErrorMessage(error, '加载本地商品失败'))
    } finally {
      setLoadingProducts(false)
    }
  }, [accountsById, productKeyword, scopedAccountIds])

  useEffect(() => {
    saleApi.listSaleShopTags()
      .then(setShopTags)
      .catch((error) => messageRef.current.error(getErrorMessage(error, '加载店铺标签失败')))
  }, [])

  useEffect(() => {
    if (resolvedDefaultAccountId && !validOzonAccountIds.has(resolvedDefaultAccountId)) {
      setResolvedDefaultAccountId(undefined)
    }
  }, [resolvedDefaultAccountId, validOzonAccountIds])

  useEffect(() => {
    if (!autoDefaultProbeAccounts.length) {
      defaultAccountProbeRunIdRef.current += 1
      defaultAccountProbeKeyRef.current = undefined
      prefetchedPromotionScopeRef.current = null
      setResolvedDefaultAccountId(undefined)
      setResolvingDefaultAccount(false)
      return
    }
    if (hasExplicitScopeSelection || manualSelectedAccountId) {
      defaultAccountProbeRunIdRef.current += 1
      defaultAccountProbeKeyRef.current = undefined
      setResolvingDefaultAccount(false)
      return
    }
    if (resolvedDefaultAccountId && validOzonAccountIds.has(resolvedDefaultAccountId)) {
      return
    }
    const probeKey = autoDefaultProbeAccounts.map((item) => item.id).join(',')
    if (!probeKey || defaultAccountProbeKeyRef.current === probeKey) {
      return
    }
    defaultAccountProbeKeyRef.current = probeKey
    const runId = defaultAccountProbeRunIdRef.current + 1
    defaultAccountProbeRunIdRef.current = runId
    setResolvingDefaultAccount(true)
    void (async () => {
      let preferredAccount: { accountId: string; shopName: string; promotions: SaleOzonPromotion[] } | null = null
      let firstSuccessfulEmptyAccount: { accountId: string; shopName: string; promotions: SaleOzonPromotion[] } | null = null
      for (const account of autoDefaultProbeAccounts) {
        if (runId !== defaultAccountProbeRunIdRef.current) {
          return
        }
        try {
          const promotions = await saleApi.listOzonPromotions(account.id, { suppressGlobalError: true })
          const result = {
            accountId: account.id,
            shopName: getShopLabel(account),
            promotions,
          }
          if (promotions.length > 0) {
            preferredAccount = result
            break
          }
          if (!firstSuccessfulEmptyAccount) {
            firstSuccessfulEmptyAccount = result
          }
        } catch {
          // ignore and continue probing the next older Ozon account
        }
      }
      if (runId !== defaultAccountProbeRunIdRef.current) {
        return
      }
      const chosenAccount = preferredAccount || firstSuccessfulEmptyAccount
      if (chosenAccount) {
        setResolvedDefaultAccountId(chosenAccount.accountId)
        prefetchedPromotionScopeRef.current = {
          scopeKey: chosenAccount.accountId,
          listByAccount: [chosenAccount],
          failedAccounts: [],
        }
        setPromotionLoadNotice('')
        onAccountChange(chosenAccount.accountId, { persist: false })
        return
      }
      prefetchedPromotionScopeRef.current = null
      setResolvedDefaultAccountId(undefined)
      setPromotions([])
      setSelectedActionId(undefined)
      setPromotionLoadNotice(`当前未找到可正常加载的默认 Ozon 店铺。系统已按优先顺序尝试前 ${autoDefaultProbeAccounts.length} 家店铺，请手动选择店铺或店铺标签后重试。`)
    })().finally(() => {
      if (runId === defaultAccountProbeRunIdRef.current) {
        setResolvingDefaultAccount(false)
      }
    })
  }, [
    autoDefaultProbeAccounts,
    hasExplicitScopeSelection,
    manualSelectedAccountId,
    onAccountChange,
    resolvedDefaultAccountId,
    validOzonAccountIds,
  ])

  useEffect(() => {
    if (!effectiveAccountIds[0] || effectiveAccountIds[0] === selectedAccountId) {
      return
    }
    const primaryAccountId = effectiveAccountIds[0]
    const shouldPersist = Boolean(explicitAccountIds.length || selectedTagIds.length || primaryAccountId !== resolvedDefaultAccountId)
    onAccountChange(primaryAccountId, { persist: shouldPersist })
  }, [effectiveAccountIds, explicitAccountIds.length, onAccountChange, resolvedDefaultAccountId, selectedAccountId, selectedTagIds.length])

  useEffect(() => {
    if (!scopeReady) {
      return
    }
    if (promotionAutoLoadKeyRef.current === effectiveAccountScopeKey) {
      return
    }
    promotionAutoLoadKeyRef.current = effectiveAccountScopeKey
    void loadPromotions()
  }, [effectiveAccountScopeKey, loadPromotions, scopeReady])

  useEffect(() => {
    if (!scopeReady) {
      return
    }
    if (productAutoLoadKeyRef.current === productQueryKey) {
      return
    }
    productAutoLoadKeyRef.current = productQueryKey
    void loadProducts()
  }, [loadProducts, productQueryKey, scopeReady])

  const visiblePromotions = useMemo(() => {
    const keyword = activityKeyword.trim().toLowerCase()
    if (!keyword) {
      return promotions
    }
    return promotions.filter((item) =>
      [item.title, item.actionId, item.actionType, item.shopNames.join(' ')]
        .some((value) => (value || '').toLowerCase().includes(keyword)))
  }, [activityKeyword, promotions])

  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return allBusinessRows.slice(start, start + pageSize)
  }, [allBusinessRows, page, pageSize])

  const skippedItems = useMemo<SkippedCombination[]>(() => {
    if (!selectedPromotion) {
      return []
    }
    const activityAccountSet = new Set(selectedPromotion.channelAccountIds)
    return selectedProducts.flatMap((row) => {
      const byAccount = new Map(row.shopRows.map((item) => [item.channelAccountId, item]))
      return effectiveAccountIds.flatMap((accountId) => {
        const product = byAccount.get(accountId)
        const shopName = getShopLabel(accountsById.get(accountId))
        if (!activityAccountSet.has(accountId)) {
          return [{
            key: `${row.key}:${accountId}:missing-activity`,
            rowKey: row.key,
            productName: row.name,
            shopName,
            reason: '该店铺没有这个活动',
          }]
        }
        if (!product) {
          return [{
            key: `${row.key}:${accountId}:missing-sync`,
            rowKey: row.key,
            productName: row.name,
            shopName,
            reason: '该商品未同步到这个店铺',
          }]
        }
        if (!product.offerId && !product.productId) {
          return [{
            key: `${row.key}:${accountId}:missing-identity`,
            rowKey: row.key,
            productName: row.name,
            shopName,
            offerId: product.offerId,
            productId: product.productId,
            reason: '缺少 offer_id 或 product_id',
          }]
        }
        return []
      })
    })
  }, [accountsById, effectiveAccountIds, selectedProducts, selectedPromotion])

  const requestDraftRows = useMemo<RequestDraftRow[]>(() => {
    if (!selectedPromotion) {
      return []
    }
    const activityAccountSet = new Set(selectedPromotion.channelAccountIds)
    return selectedProducts.map((row) => {
      const byAccount = new Map(row.shopRows.map((item) => [item.channelAccountId, item]))
      const legalItems = effectiveAccountIds.flatMap((accountId) => {
        const product = byAccount.get(accountId)
        if (!activityAccountSet.has(accountId) || !product || (!product.offerId && !product.productId)) {
          return []
        }
        return [product]
      })
      const rowSkippedItems = skippedItems.filter((item) => item.rowKey === row.key)
      return {
        key: row.key,
        product: row,
        legalItems,
        skippedItems: rowSkippedItems,
        currentPriceSuggestion: legalItems.find((item) => item.price !== null && item.price !== undefined)?.price ?? null,
        currentStockSuggestion: legalItems.find((item) => item.stockPresent !== null && item.stockPresent !== undefined)?.stockPresent ?? null,
      }
    })
  }, [effectiveAccountIds, selectedProducts, selectedPromotion, skippedItems])

  const totalLegalItemCount = useMemo(
    () => requestDraftRows.reduce((sum, item) => sum + item.legalItems.length, 0),
    [requestDraftRows],
  )

  const submitInvalidReason = useMemo(() => {
    if (!effectiveAccountIds.length) {
      return '请选择作用域内的 Ozon 店铺'
    }
    if (!selectedPromotion) {
      return '请选择活动'
    }
    if (!selectedProducts.length) {
      return '请选择商品'
    }
    if (!totalLegalItemCount) {
      return '当前选择下没有可提交的店铺商品组合'
    }
    const incompleteRow = requestDraftRows.find((row) => {
      if (!row.legalItems.length) {
        return false
      }
      const input = requestInputs[row.key]
      return !input || !input.actionPrice || input.actionPrice <= 0 || input.stock === null || input.stock === undefined || input.stock < 0 || !Number.isInteger(input.stock)
    })
    if (incompleteRow) {
      return '请为全部合法待请求商品填写活动价和活动库存'
    }
    return ''
  }, [effectiveAccountIds.length, requestDraftRows, requestInputs, selectedProducts.length, selectedPromotion, totalLegalItemCount])

  const applyInputPatch = (rowKey: string, patch: Partial<RequestInput>) => {
    setRequestInputs((current) => ({
      ...current,
      [rowKey]: {
        actionPrice: current[rowKey]?.actionPrice ?? null,
        stock: current[rowKey]?.stock ?? null,
        ...patch,
      },
    }))
  }

  const applyBatchInputs = () => {
    if (!requestDraftRows.length) {
      message.warning('当前没有合法待请求商品')
      return
    }
    if ((batchActionPrice === null || batchActionPrice === undefined || batchActionPrice <= 0)
      && (batchStock === null || batchStock === undefined || batchStock < 0 || !Number.isInteger(batchStock))) {
      message.warning('请至少填写一个批量带入值')
      return
    }
    setRequestInputs((current) => {
      const next = { ...current }
      requestDraftRows.forEach((row) => {
        if (!row.legalItems.length) {
          return
        }
        next[row.key] = {
          actionPrice: batchActionPrice !== null && batchActionPrice !== undefined && batchActionPrice > 0
            ? batchActionPrice
            : current[row.key]?.actionPrice ?? null,
          stock: batchStock !== null && batchStock !== undefined && batchStock >= 0 && Number.isInteger(batchStock)
            ? batchStock
            : current[row.key]?.stock ?? null,
        }
      })
      return next
    })
    message.success('已将批量参数带入合法待请求列表')
  }

  const submit = () => {
    if (submitInvalidReason) {
      message.warning(submitInvalidReason)
      return
    }
    Modal.confirm({
      title: '确认提交 Ozon 活动报名任务',
      content: `将向活动 ${selectedPromotion?.title || selectedActionId} 提交 ${requestDraftRows.length} 个商品行、${totalLegalItemCount} 个店铺商品组合。平台若拒绝报名，会在任务明细中返回失败原因。`,
      okText: '提交任务',
      cancelText: '取消',
      onOk: async () => {
        setSubmitting(true)
        try {
          const products = requestDraftRows.flatMap((row) => {
            const input = requestInputs[row.key]
            return row.legalItems.map((item) => ({
              channelAccountId: Number(item.channelAccountId),
              offerId: item.offerId,
              productId: item.productId,
              actionPrice: input?.actionPrice,
              stock: input?.stock,
            }))
          })
          const created = await saleApi.submitOzonPromotion({
            taskName: `Ozon 活动报名 - ${selectedPromotion?.title || selectedActionId} - ${products.length} 个店铺商品组合`,
            actionId: String(selectedActionId),
            operation: 'ACTIVATE',
            channelAccountIds: Array.from(new Set(products.map((item) => item.channelAccountId).filter(Boolean))),
            products,
          })
          setTask(created)
          setTaskOpen(true)
          message.success(created.message || (created.alreadyRunning ? '当前已有相同活动任务在后台执行' : '已创建 Ozon 活动报名任务'))
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  const promotionColumns: ColumnsType<PromotionSummary> = [
    {
      title: '活动',
      dataIndex: 'title',
      render: (value, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{value || record.actionId}</Text>
          <Text type="secondary">ID：{record.actionId}</Text>
          <Text type="secondary">覆盖店铺：{record.shopNames.join(' / ') || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '覆盖',
      key: 'coverage',
      width: 110,
      render: (_, record) => `${record.channelAccountIds.length} / ${effectiveAccountIds.length || 0}`,
    },
    {
      title: '时间',
      key: 'time',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.dateStart || '--'}</Text>
          <Text type="secondary">至 {record.dateEnd || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '平台统计',
      key: 'stats',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>可报名：{record.potentialProductsCount ?? '--'}</Text>
          <Text type="secondary">已报名：{record.participatingProductsCount ?? '--'}</Text>
        </Space>
      ),
    },
  ]

  const productColumns: ColumnsType<BusinessProductRow> = [
    {
      title: '商品',
      dataIndex: 'name',
      width: 360,
      render: (value, record) => (
        <Space align="start" size={12}>
          <ProductThumb src={record.imageUrl} name={value} size={64} />
          <Space direction="vertical" size={4}>
            <Text strong>{value || record.platformSkcId || '--'}</Text>
            <Space size={[4, 4]} wrap>
              {record.styleNo ? <Tag color="geekblue">款号 {record.styleNo}</Tag> : null}
              {record.platformSpuId ? <Tag>SPU {record.platformSpuId}</Tag> : null}
              {record.platformSkcId ? <Tag color="magenta">SKC {record.platformSkcId}</Tag> : null}
            </Space>
            {record.styleName ? <Text type="secondary">{record.styleName}</Text> : null}
          </Space>
        </Space>
      ),
    },
    {
      title: '规格',
      key: 'spec',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>{record.specSummary || [record.colors.join(' / '), record.sizes.join(' / ')].filter(Boolean).join(' · ') || '--'}</Text>
          <Text type="secondary">颜色：{record.colors.join(' / ') || '--'}</Text>
          <Text type="secondary">尺码：{record.sizes.join(' / ') || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '已同步店铺',
      key: 'shops',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>{record.syncedAccountIds.length} 个店铺</Text>
          <Text type="secondary">{record.syncedShopNames.join(' / ') || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '作用域摘要',
      key: 'scope',
      width: 280,
      render: (_, record) => {
        const summary = summarizeRowScope(record, effectiveAccountIds, selectedPromotion)
        const chips = [
          { label: '可提交', value: summary.legalCount, tone: 'green' },
          { label: '无活动', value: summary.missingActivityCount, tone: 'default' },
          { label: '未同步', value: summary.missingSyncCount, tone: 'orange' },
          { label: '缺身份', value: summary.missingIdentityCount, tone: 'red' },
        ]
        return (
          <div className="scw-promo-status-grid">
            {chips.map((chip) => (
              <button className="scw-promo-status-chip" type="button" disabled key={`${record.key}:${chip.label}`}>
                <span>{chip.label}</span>
                <Tag color={chip.tone}>{chip.value}</Tag>
              </button>
            ))}
          </div>
        )
      },
    },
  ]

  const requestColumns: ColumnsType<RequestDraftRow> = [
    {
      title: '合法待请求商品',
      key: 'product',
      width: 360,
      render: (_, record) => (
        <Space align="start" size={12}>
          <ProductThumb src={record.product.imageUrl} name={record.product.name} size={56} />
          <Space direction="vertical" size={4}>
            <Text strong>{record.product.name || record.product.platformSkcId || '--'}</Text>
            <Space size={[4, 4]} wrap>
              {record.product.styleNo ? <Tag color="geekblue">款号 {record.product.styleNo}</Tag> : null}
              <Tag color="green">可提交 {record.legalItems.length}</Tag>
              {record.skippedItems.length ? <Tag color="default">跳过 {record.skippedItems.length}</Tag> : null}
            </Space>
            <Text type="secondary">{record.legalItems.map((item) => item.shopName).join(' / ') || '--'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '参数参考',
      key: 'suggestions',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>当前售价：{record.currentPriceSuggestion ?? '--'}</Text>
          <Text type="secondary">当前库存：{record.currentStockSuggestion ?? '--'}</Text>
          <Space size={[4, 4]} wrap>
            {promotionSuggestion.actionPrice ? (
              <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { actionPrice: promotionSuggestion.actionPrice ?? null })}>
                使用活动建议价
              </Button>
            ) : null}
            {promotionSuggestion.stock !== null && promotionSuggestion.stock !== undefined ? (
              <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { stock: promotionSuggestion.stock ?? null })}>
                使用活动建议库存
              </Button>
            ) : null}
            {record.currentPriceSuggestion ? (
              <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { actionPrice: record.currentPriceSuggestion ?? null })}>
                带入当前售价
              </Button>
            ) : null}
            {record.currentStockSuggestion !== null && record.currentStockSuggestion !== undefined ? (
              <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { stock: record.currentStockSuggestion ?? null })}>
                带入当前库存
              </Button>
            ) : null}
          </Space>
        </Space>
      ),
    },
    {
      title: '活动价',
      key: 'actionPrice',
      width: 160,
      render: (_, record) => (
        <InputNumber
          min={0.01}
          disabled={!record.legalItems.length}
          value={requestInputs[record.key]?.actionPrice ?? null}
          onChange={(value) => applyInputPatch(record.key, { actionPrice: value })}
          className="oc-excel-cell-input"
        />
      ),
    },
    {
      title: '活动库存',
      key: 'stock',
      width: 160,
      render: (_, record) => (
        <InputNumber
          min={0}
          precision={0}
          disabled={!record.legalItems.length}
          value={requestInputs[record.key]?.stock ?? null}
          onChange={(value) => applyInputPatch(record.key, { stock: value })}
          className="oc-excel-cell-input"
        />
      ),
    },
  ]

  const skippedColumns: ColumnsType<SkippedCombination> = [
    {
      title: '商品',
      dataIndex: 'productName',
      width: 260,
      render: (value) => value || '--',
    },
    {
      title: '店铺',
      dataIndex: 'shopName',
      width: 200,
    },
    {
      title: '平台身份',
      key: 'identity',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>offer_id：{record.offerId || '--'}</Text>
          <Text type="secondary">product_id：{record.productId || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '跳过原因',
      dataIndex: 'reason',
      render: (value) => <Text type="secondary">{value}</Text>,
    },
  ]

  return (
    <div className="scw-ops-page">
      <Alert
        showIcon
        type="info"
        message="活动页现在按“活动并集 + 合法待请求列表”工作"
        description="系统不会再重复请求候选 / 已报名资格接口做前置校验。当前页面只基于活动-店铺关系和商品-店铺映射关系，生成结构合法的待提交列表；真正不可报名、重复报名或平台拒绝原因，会在异步任务结果里回写。"
      />
      {resolvingDefaultAccount && !effectiveAccountIds.length ? (
        <Alert
          showIcon
          type="info"
          message="正在选择可正常加载的默认 Ozon 店铺"
          description="当前还没有用户明确选择的店铺，系统会优先选一个活动接口可正常返回的 Ozon 店铺作为首屏默认范围。"
          style={{ marginTop: 12 }}
        />
      ) : null}
      {promotionLoadNotice ? (
        <Alert
          showIcon
          type="warning"
          message="部分店铺活动暂未加载成功"
          description={promotionLoadNotice}
          style={{ marginTop: 12 }}
        />
      ) : null}
      <Card className="scw-ops-toolbar scw-ops-toolbar--sticky">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} xl={5}>
            <Select
              mode="multiple"
              value={selectedAccountIds}
              placeholder="Ozon 店铺"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              options={ozonAccounts.map((item) => ({ label: getShopLabel(item), value: item.id }))}
              onChange={(values) => {
                setSelectedAccountIds(values)
                setSelectedRowKeys([])
              }}
            />
          </Col>
          <Col xs={24} xl={4}>
            <Select
              mode="multiple"
              allowClear
              value={selectedTagIds}
              placeholder="店铺标签"
              style={{ width: '100%' }}
              maxTagCount="responsive"
              options={shopTags.map((item) => ({ label: item.tagName, value: item.tagId }))}
              onChange={(values) => {
                setSelectedTagIds(values)
                setSelectedRowKeys([])
              }}
            />
          </Col>
          <Col xs={24} xl={4}>
            <Input
              value={activityKeyword}
              placeholder="搜索活动名称 / ID"
              onChange={(event) => setActivityKeyword(event.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} xl={5}>
            <Input
              value={productKeyword}
              placeholder="搜索商品名 / 款号 / offer_id / product_id"
              onChange={(event) => setProductKeyword(event.target.value)}
              onPressEnter={() => void loadProducts()}
              allowClear
            />
          </Col>
          <Col xs={24} xl={6}>
            <Space wrap>
              <Button icon={<ReloadOutlined />} loading={loadingPromotions} onClick={loadPromotions}>
                刷新活动
              </Button>
              <Button icon={<ReloadOutlined />} loading={loadingProducts} onClick={loadProducts}>
                刷新商品
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                disabled={!!submitInvalidReason}
                onClick={submit}
              >
                提交报名任务
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {!effectiveAccountIds.length ? (
        <Alert
          showIcon
          type="warning"
          message="当前店铺范围为空"
          description="请检查店铺和标签筛选条件是否相互交叉后没有可用的 Ozon 店铺。"
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="作用域店铺" value={effectiveAccountIds.length} prefix={<GiftOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="进行中活动" value={promotions.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="本地商品" value={allBusinessRows.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="已选商品" value={selectedProducts.length} /></Card></Col>
      </Row>

      <Card
        title="活动列表"
        extra={selectedPromotion ? <Text type="secondary">当前活动覆盖 {selectedPromotion.channelAccountIds.length} / {effectiveAccountIds.length} 个店铺</Text> : null}
      >
        <Table
          rowKey="actionId"
          loading={loadingPromotions}
          columns={promotionColumns}
          dataSource={visiblePromotions}
          pagination={{ pageSize: 8 }}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedActionId ? [selectedActionId] : [],
            onChange: (keys) => setSelectedActionId(String(keys[0] || '')),
          }}
          onRow={(record) => ({ onClick: () => setSelectedActionId(record.actionId) })}
          scroll={{ x: 980 }}
        />
      </Card>

      <Card
        title="本地商品工作台"
        extra={<Text type="secondary">当前按作用域店铺聚合本地已同步商品，再根据所选活动生成合法待请求列表。</Text>}
      >
        <Table
          rowKey="key"
          loading={loadingProducts}
          columns={productColumns}
          dataSource={visibleRows}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          pagination={{
            current: page,
            pageSize,
            total: allBusinessRows.length,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
          scroll={{ x: 1120 }}
        />
      </Card>

      <Card
        title="合法待请求列表"
        extra={<Text type="secondary">当前只展示结构合法、可以发给平台的组合；不保证平台一定接受报名。</Text>}
      >
        <div className="scw-promo-preview-grid">
          <div className="scw-promo-preview-item">
            <span>所选商品</span>
            <strong>{selectedProducts.length}</strong>
          </div>
          <div className="scw-promo-preview-item">
            <span>合法组合</span>
            <strong>{totalLegalItemCount}</strong>
          </div>
          <div className="scw-promo-preview-item">
            <span>已跳过组合</span>
            <strong>{skippedItems.length}</strong>
          </div>
        </div>
        <div className="scw-promo-summary-actions">
          <InputNumber
            min={0.01}
            value={batchActionPrice}
            placeholder="批量活动价"
            onChange={setBatchActionPrice}
            style={{ width: 160 }}
          />
          <InputNumber
            min={0}
            precision={0}
            value={batchStock}
            placeholder="批量活动库存"
            onChange={setBatchStock}
            style={{ width: 160 }}
          />
          <Button onClick={applyBatchInputs}>带入到全部合法商品</Button>
        </div>
        <Table
          rowKey="key"
          className="oc-excel-entry-table"
          columns={requestColumns}
          dataSource={requestDraftRows}
          pagination={false}
          scroll={{ x: 900 }}
        />
        <Collapse
          style={{ marginTop: 16 }}
          items={[
            {
              key: 'skipped',
              label: `已跳过的组合（${skippedItems.length}）`,
              children: (
                <Table
                  rowKey="key"
                  size="small"
                  columns={skippedColumns}
                  dataSource={skippedItems}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 900 }}
                />
              ),
            },
          ]}
        />
      </Card>

      <OzonOperationTaskDrawer open={taskOpen} task={task} onClose={() => setTaskOpen(false)} />
    </div>
  )
}
