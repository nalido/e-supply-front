import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Key, MouseEvent } from 'react'
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
  Tabs,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { GiftOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { saleApi } from '../../api/sale'
import type {
  SaleAsyncTask,
  SaleChannelAccount,
  SaleOzonPromotion,
  SaleOzonPromotionEligibilityPreviewRow,
  SaleProductMapping,
  SaleShopTag,
} from '../../types/sale'
import { getShopLabel } from './sale-center-helpers'
import OzonOperationTaskDrawer from './OzonOperationTaskDrawer'
import { resolveOzonProductDisplayInfo } from './ozon-product-display'
import '../../styles/matrix-table.css'
import './ozon-promotions.css'

const { Paragraph, Text } = Typography

const DEFAULT_ACCOUNT_PROBE_LIMIT = 12
const DEFAULT_TABLE_PAGE_SIZE = 50
const PROMOTION_PREVIEW_BATCH_LIMIT = 50
const WORKBENCH_ROW_INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  '.ant-checkbox',
  '.ant-checkbox-wrapper',
  '.ant-input',
  '.ant-input-number',
  '.ant-select',
  '.ant-btn',
].join(', ')

type PromotionEligibilityCacheValue = Omit<SaleOzonPromotionEligibilityPreviewRow, 'rowKey'>

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
  platformSkuCode?: string | null
  productId?: number | null
  platformSkuId?: string | null
  platformSpuId?: string | null
  platformSkcId?: string | null
  normalizedColor?: string | null
  normalizedSize?: string | null
  normalizedSpecSummary?: string | null
  price?: number | null
  stockPresent?: number | null
  promotionActionPrice?: number | null
  promotionMaxActionPrice?: number | null
  promotionMinStock?: number | null
  mapped?: boolean | null
  mappingStatus?: string | null
}

type BusinessProductRow = {
  key: string
  name?: string | null
  imageUrl?: string | null
  styleNo?: string | null
  styleName?: string | null
  styleVariantId?: string | null
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
  promotionActionPriceSuggestion?: number | null
  promotionMaxActionPriceSuggestion?: number | null
  promotionMinStockSuggestion?: number | null
}

type PlatformRiskSummary = {
  title: string
  detail: string
  tagLabel: string
  tone: 'warning' | 'review'
}

type PromotionStatusFilter =
  | 'ALL'
  | 'PARTICIPATING'
  | 'CANDIDATE'
  | 'NOT_CANDIDATE'

type WorkbenchTabKey =
  | 'LOCAL'
  | 'PLATFORM_CANDIDATE'
  | 'PLATFORM_PARTICIPATING'

type PromotionRowStatusSummary = {
  participatingCount: number
  candidateCount: number
  blockedCount: number
  missingActivityCount: number
  missingSyncCount: number
  missingIdentityCount: number
  unknownCount: number
}

type Props = {
  accounts: SaleChannelAccount[]
  selectedAccountId?: string
  onAccountChange: (accountId: string, options?: { persist?: boolean }) => void
}

const compareText = (left?: string | null, right?: string | null) =>
  (left || '').localeCompare(right || '', 'zh-CN', { numeric: true, sensitivity: 'base' })

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

const numberFrom = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const displayPositiveNumber = (value?: number | null) => (value !== null && value !== undefined && value > 0 ? value : '--')

const displayMinStock = (value?: number | null) => (value !== null && value !== undefined && value > 0 ? value : '不限')

const shouldIgnoreWorkbenchRowToggle = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest(WORKBENCH_ROW_INTERACTIVE_SELECTOR))

const getProductDisplayTitle = (row: BusinessProductRow) => {
  const firstShopRow = row.shopRows[0]
  return row.name?.trim()
    || row.styleName?.trim()
    || firstShopRow?.name?.trim()
    || row.styleNo?.trim()
    || firstShopRow?.offerId?.trim()
    || (firstShopRow?.productId ? `平台商品 ${firstShopRow.productId}` : '')
    || row.platformSkcId?.trim()
    || row.platformSpuId?.trim()
    || '--'
}

const getProductIdentityText = (row: BusinessProductRow) => {
  const firstShopRow = row.shopRows[0]
  const merchantCode = firstShopRow?.offerId || firstShopRow?.platformSkuCode
  return [
    row.styleNo ? `款号 ${row.styleNo}` : undefined,
    merchantCode ? `商家编码 ${merchantCode}` : undefined,
    !merchantCode && firstShopRow?.platformSkuId ? `平台 SKU ${firstShopRow.platformSkuId}` : undefined,
    firstShopRow?.productId ? `商品编号 ${firstShopRow.productId}` : undefined,
  ].filter(Boolean).join(' · ')
}

const getPlatformRiskSummary = (
  row: BusinessProductRow,
  shopRow: ShopScopedProduct | undefined,
  options: { participating: boolean },
): PlatformRiskSummary | null => {
  if (!shopRow) {
    return null
  }
  if (options.participating) {
    return {
      tagLabel: '已报名',
      title: '平台已报名，仅供查看',
      detail: '',
      tone: 'review',
    }
  }
  if (!shopRow.mapped || (!row.specSummary && !row.colors.length && !row.sizes.length)) {
    return {
      tagLabel: '待补资料',
      title: '补齐资料后再报名',
      detail: '',
      tone: 'warning',
    }
  }
  if ((shopRow.stockPresent ?? 0) <= 0) {
    return {
      tagLabel: '待确认库存',
      title: '确认库存后再报名',
      detail: '',
      tone: 'warning',
    }
  }
  if (shopRow.promotionActionPrice === null || shopRow.promotionActionPrice === undefined || shopRow.promotionActionPrice <= 0) {
    return {
      tagLabel: '待补活动价',
      title: '补充活动价后再报名',
      detail: '',
      tone: 'warning',
    }
  }
  return {
    tagLabel: '待补活动价',
    title: '确认活动价后可报名',
    detail: '',
    tone: 'warning',
  }
}

const getPromotionStatusPresentation = (summary: PromotionRowStatusSummary) => {
  const onlyUnknown = summary.unknownCount > 0
    && summary.participatingCount === 0
    && summary.candidateCount === 0
    && summary.blockedCount === 0
    && summary.missingActivityCount === 0
    && summary.missingSyncCount === 0
    && summary.missingIdentityCount === 0
  const primary = summary.participatingCount > 0
    ? { label: '已报名', color: 'blue' }
    : summary.candidateCount > 0
      ? { label: '可报名', color: 'green' }
      : summary.blockedCount > 0 || summary.missingActivityCount > 0 || summary.missingSyncCount > 0 || summary.missingIdentityCount > 0
        ? { label: '暂不可报名', color: 'red' }
        : onlyUnknown
          ? { label: '待确认', color: 'default' }
          : summary.unknownCount > 0
            ? { label: '正在核对', color: 'gold' }
            : { label: '待核对', color: 'default' }
  const detailParts = [
    summary.participatingCount > 0 ? `已报名 ${summary.participatingCount}` : undefined,
    summary.candidateCount > 0 ? `可报名 ${summary.candidateCount}` : undefined,
    summary.blockedCount > 0 ? `暂不可报名 ${summary.blockedCount}` : undefined,
    summary.missingActivityCount > 0 ? `活动未覆盖 ${summary.missingActivityCount}` : undefined,
    summary.missingSyncCount > 0 ? `未同步 ${summary.missingSyncCount}` : undefined,
    summary.missingIdentityCount > 0 ? `缺少平台标识 ${summary.missingIdentityCount}` : undefined,
    onlyUnknown ? '状态更新中' : summary.unknownCount > 0 ? `正在核对 ${summary.unknownCount}` : undefined,
  ].filter(Boolean) as string[]
  const detailText = detailParts.length <= 2
    ? detailParts.join(' · ')
    : `${detailParts.slice(0, 2).join(' · ')} 等 ${detailParts.length} 项`
  return {
    ...primary,
    detailText: detailText || '当前活动状态待刷新',
  }
}

const buildPromotionEligibilityCacheKey = (
  actionId: string,
  channelAccountId: string | number,
  offerId?: string | null,
  productId?: number | null,
) => {
  const identity = productId ? `product:${productId}` : `offer:${(offerId || '').trim()}`
  return `${actionId}:${channelAccountId}:${identity}`
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
      暂无图
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
        promotionActionPrice: null,
        promotionMaxActionPrice: null,
        promotionMinStock: null,
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

const summarizePromotionRowStatus = (
  row: BusinessProductRow,
  accountIds: string[],
  selectedPromotion: PromotionSummary | undefined,
  eligibilityByCellKey: Map<string, SaleOzonPromotionEligibilityPreviewRow>,
): PromotionRowStatusSummary => {
  const summary: PromotionRowStatusSummary = {
    participatingCount: 0,
    candidateCount: 0,
    blockedCount: 0,
    missingActivityCount: 0,
    missingSyncCount: 0,
    missingIdentityCount: 0,
    unknownCount: 0,
  }
  if (!selectedPromotion) {
    return summary
  }
  const activityAccountSet = new Set(selectedPromotion.channelAccountIds)
  const byAccount = new Map(row.shopRows.map((item) => [item.channelAccountId, item]))
  accountIds.forEach((accountId) => {
    if (!activityAccountSet.has(accountId)) {
      summary.missingActivityCount += 1
      return
    }
    const product = byAccount.get(accountId)
    if (!product) {
      summary.missingSyncCount += 1
      return
    }
    if (!product.offerId && !product.productId) {
      summary.missingIdentityCount += 1
      return
    }
    const preview = eligibilityByCellKey.get(`${row.key}:${accountId}`)
    switch ((preview?.status || '').toUpperCase()) {
      case 'PARTICIPATING':
        summary.participatingCount += 1
        break
      case 'CANDIDATE':
        summary.candidateCount += 1
        break
      case 'NOT_CANDIDATE':
      case 'MISSING_PRODUCT':
      case 'MISSING_ACTION':
        summary.blockedCount += 1
        break
      default:
        summary.unknownCount += 1
        break
    }
  })
  return summary
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
  const step3SectionRef = useRef<HTMLDivElement | null>(null)
  messageRef.current = message
  const [currentStep, setCurrentStep] = useState(0)
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTabKey>('LOCAL')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [shopTags, setShopTags] = useState<SaleShopTag[]>([])
  const [activityKeyword, setActivityKeyword] = useState('')
  const [activityKeywordInput, setActivityKeywordInput] = useState('')
  const [productKeyword, setProductKeyword] = useState('')
  const [promotions, setPromotions] = useState<PromotionSummary[]>([])
  const [selectedActionId, setSelectedActionId] = useState<string>()
  const [allBusinessRows, setAllBusinessRows] = useState<BusinessProductRow[]>([])
  const [productTotal, setProductTotal] = useState(0)
  const [productRowCache, setProductRowCache] = useState<Record<string, BusinessProductRow>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [platformPage, setPlatformPage] = useState(1)
  const [platformHasMore, setPlatformHasMore] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [requestInputs, setRequestInputs] = useState<Record<string, RequestInput>>({})
  const [promotionEligibilityRows, setPromotionEligibilityRows] = useState<SaleOzonPromotionEligibilityPreviewRow[]>([])
  const [promotionStatusFilter, setPromotionStatusFilter] = useState<PromotionStatusFilter>('ALL')
  const [batchActionPrice, setBatchActionPrice] = useState<number | null>(null)
  const [batchStock, setBatchStock] = useState<number | null>(null)
  const [loadingPromotions, setLoadingPromotions] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingPromotionEligibility, setLoadingPromotionEligibility] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [promotionLoadNotice, setPromotionLoadNotice] = useState('')
  const [resolvedDefaultAccountId, setResolvedDefaultAccountId] = useState<string>()
  const [resolvingDefaultAccount, setResolvingDefaultAccount] = useState(false)
  const [task, setTask] = useState<SaleAsyncTask | null>(null)
  const [taskOpen, setTaskOpen] = useState(false)
  const promotionEligibilityRunIdRef = useRef(0)
  const promotionEligibilityCacheRef = useRef<Map<string, PromotionEligibilityCacheValue>>(new Map())

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
  const selectedRowKeySet = useMemo(() => new Set(selectedRowKeys.map((item) => String(item))), [selectedRowKeys])
  const selectedProducts = useMemo(
    () => Array.from(selectedRowKeySet)
      .map((key) => productRowCache[key])
      .filter((row): row is BusinessProductRow => Boolean(row)),
    [productRowCache, selectedRowKeySet],
  )
  const toggleWorkbenchRowSelection = useCallback((row: BusinessProductRow) => {
    setSelectedRowKeys((current) => {
      const rowKey = String(row.key)
      const exists = current.some((item) => String(item) === rowKey)
      if (exists) {
        return current.filter((item) => String(item) !== rowKey)
      }
      return [...current, row.key]
    })
  }, [])
  const effectiveAccountScopeKey = useMemo(() => effectiveAccountIds.join(','), [effectiveAccountIds])
  const scopedAccountIds = useMemo(
    () => (effectiveAccountScopeKey ? effectiveAccountScopeKey.split(',').filter(Boolean) : []),
    [effectiveAccountScopeKey],
  )
  const isSingleAccountScope = scopedAccountIds.length === 1
  const scopedSingleAccountId = isSingleAccountScope ? scopedAccountIds[0] : undefined
  const isPlatformWorkbench = workbenchTab !== 'LOCAL'
  const promotionQueryKey = useMemo(
    () => `${effectiveAccountScopeKey}|${activityKeyword.trim()}`,
    [activityKeyword, effectiveAccountScopeKey],
  )
  const localProductQueryKey = useMemo(
    () => {
      const keyword = productKeyword.trim()
      const statusKey = promotionStatusFilter === 'ALL'
        ? 'ALL'
        : `${selectedPromotion?.actionId || ''}:${promotionStatusFilter}`
      return `${effectiveAccountScopeKey}|${keyword}|${statusKey}|${page}|${pageSize}`
    },
    [effectiveAccountScopeKey, page, pageSize, productKeyword, promotionStatusFilter, selectedPromotion?.actionId],
  )
  const platformProductQueryKey = useMemo(
    () => `${workbenchTab}|${selectedPromotion?.actionId || ''}|${scopedSingleAccountId || ''}|${platformPage}|${pageSize}`,
    [pageSize, platformPage, scopedSingleAccountId, selectedPromotion?.actionId, workbenchTab],
  )
  const productQueryKey = isPlatformWorkbench ? platformProductQueryKey : localProductQueryKey
  const productSelectionScopeKey = useMemo(() => {
    if (isPlatformWorkbench) {
      return `${workbenchTab}|${selectedPromotion?.actionId || ''}|${scopedSingleAccountId || ''}`
    }
    const keyword = productKeyword.trim()
    const statusKey = promotionStatusFilter === 'ALL'
      ? 'ALL'
      : `${selectedPromotion?.actionId || ''}:${promotionStatusFilter}`
    return `${effectiveAccountScopeKey}|${keyword}|${statusKey}`
  }, [
    effectiveAccountScopeKey,
    isPlatformWorkbench,
    productKeyword,
    promotionStatusFilter,
    scopedSingleAccountId,
    selectedPromotion?.actionId,
    workbenchTab,
  ])
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
      if (prefetchedScope?.scopeKey === promotionQueryKey) {
        prefetchedPromotionScopeRef.current = null
        applyPromotionLoadResult(prefetchedScope.listByAccount, prefetchedScope.failedAccounts)
        return
      }
      const settled = await Promise.allSettled(
        scopedAccountIds.map(async (accountId) => ({
          accountId,
          shopName: getShopLabel(accountsById.get(accountId)),
          promotions: await saleApi.listOzonPromotions(accountId, {
            suppressGlobalError: true,
            keyword: activityKeyword,
          }),
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
  }, [accountsById, activityKeyword, applyPromotionLoadResult, promotionQueryKey, scopedAccountIds])

  const loadProducts = useCallback(async () => {
    if (!scopedAccountIds.length) {
      setAllBusinessRows([])
      setProductTotal(0)
      setProductRowCache({})
      setSelectedRowKeys([])
      setRequestInputs({})
      setPlatformHasMore(false)
      return
    }
    if (isPlatformWorkbench) {
      if (!selectedPromotion || !scopedSingleAccountId) {
        setAllBusinessRows([])
        setProductTotal(0)
        setPlatformHasMore(false)
        return
      }
    }
    setLoadingProducts(true)
    try {
      let pageRows: BusinessProductRow[] = []
      let nextTotal = 0
      if (isPlatformWorkbench) {
        const accountId = scopedSingleAccountId as string
        const promotionStatus = workbenchTab === 'PLATFORM_CANDIDATE'
          ? 'CANDIDATE'
          : 'PARTICIPATING'
        const promotion = selectedPromotion as PromotionSummary
        const response = await saleApi.listOzonPromotionProductMappingsPage({
          actionId: promotion.actionId,
          promotionStatus,
          channelAccountIds: [accountId],
          page: platformPage,
          pageSize,
        })
        pageRows = buildBusinessRows(response.list ?? [], accountsById)
        const hasMore = (platformPage * pageSize) < (response.total ?? pageRows.length)
        setPlatformHasMore(hasMore)
        nextTotal = response.total ?? pageRows.length
      } else {
        const response = selectedPromotion && promotionStatusFilter !== 'ALL'
          ? await saleApi.listOzonPromotionProductMappingsPage({
            actionId: selectedPromotion.actionId,
            promotionStatus: promotionStatusFilter,
            channelAccountIds: scopedAccountIds,
            keyword: productKeyword.trim() || undefined,
            page,
            pageSize,
          })
          : await saleApi.listProductMappingsPage({
            channelAccountIds: scopedAccountIds,
            keyword: productKeyword.trim() || undefined,
            groupBy: 'SPU_SKC',
            view: 'DETAIL',
            page,
            pageSize,
          })
        pageRows = buildBusinessRows(response.list ?? [], accountsById)
        nextTotal = response.total ?? pageRows.length
        setPlatformHasMore(false)
      }
      setAllBusinessRows(pageRows)
      setProductTotal(nextTotal)
      setProductRowCache((current) => {
        const next = { ...current }
        pageRows.forEach((row) => {
          next[row.key] = row
        })
        return next
      })
    } catch (error) {
      messageRef.current.error(getErrorMessage(error, isPlatformWorkbench ? '加载平台商品失败' : '加载本地商品失败'))
    } finally {
      setLoadingProducts(false)
    }
  }, [
    accountsById,
    isPlatformWorkbench,
    page,
    pageSize,
    platformPage,
    productKeyword,
    promotionStatusFilter,
    scopedAccountIds,
    scopedSingleAccountId,
    selectedPromotion,
    workbenchTab,
  ])

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
          scopeKey: `${chosenAccount.accountId}|`,
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
    if (promotionAutoLoadKeyRef.current === promotionQueryKey) {
      return
    }
    promotionAutoLoadKeyRef.current = promotionQueryKey
    void loadPromotions()
  }, [loadPromotions, promotionQueryKey, scopeReady])

  useEffect(() => {
    if (promotionStatusFilter === 'ALL') {
      return
    }
    setPage(1)
  }, [promotionStatusFilter, selectedPromotion?.actionId])

  useEffect(() => {
    setPlatformPage(1)
    setPlatformHasMore(false)
  }, [pageSize, scopedSingleAccountId, selectedPromotion?.actionId, workbenchTab])

  useEffect(() => {
    setSelectedRowKeys([])
    setRequestInputs({})
    setProductRowCache({})
  }, [productSelectionScopeKey])

  useEffect(() => {
    if (workbenchTab !== 'LOCAL' && (!selectedPromotion || !isSingleAccountScope)) {
      setWorkbenchTab('LOCAL')
    }
  }, [isSingleAccountScope, selectedPromotion, workbenchTab])

  useEffect(() => {
    if (!selectedPromotion && currentStep > 0) {
      setCurrentStep(0)
    }
  }, [currentStep, selectedPromotion])

  useEffect(() => {
    if (currentStep !== 2) {
      return
    }
    const timer = window.setTimeout(() => {
      step3SectionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [currentStep])

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

  const visiblePromotions = promotions

  const promotionEligibilityTargetRows = useMemo(() => {
    if (workbenchTab !== 'LOCAL') {
      return []
    }
    const merged = new Map<string, BusinessProductRow>()
    allBusinessRows.forEach((row) => merged.set(row.key, row))
    selectedProducts.forEach((row) => merged.set(row.key, row))
    return Array.from(merged.values())
  }, [allBusinessRows, selectedProducts, workbenchTab])

  const promotionEligibilityRequestRows = useMemo(() => {
    if (!selectedPromotion || !effectiveAccountIds.length) {
      return []
    }
    const activityAccountSet = new Set(selectedPromotion.channelAccountIds)
    const requestRows: Array<{
      rowKey: string
      channelAccountId: number
      offerId?: string | null
      productId?: number | null
    }> = []
    const dedupe = new Set<string>()
    promotionEligibilityTargetRows.forEach((row) => {
      const byAccount = new Map(row.shopRows.map((item) => [item.channelAccountId, item]))
      effectiveAccountIds.forEach((accountId) => {
        if (!activityAccountSet.has(accountId)) {
          return
        }
        const product = byAccount.get(accountId)
        if (!product || (!product.offerId && !product.productId)) {
          return
        }
        const dedupeKey = `${row.key}:${accountId}`
        if (dedupe.has(dedupeKey)) {
          return
        }
        dedupe.add(dedupeKey)
        requestRows.push({
          rowKey: row.key,
          channelAccountId: Number(accountId),
          offerId: product.offerId,
          productId: product.productId,
        })
      })
    })
    return requestRows
  }, [effectiveAccountIds, promotionEligibilityTargetRows, selectedPromotion])

  const promotionEligibilityByCellKey = useMemo(() => {
    const map = new Map<string, SaleOzonPromotionEligibilityPreviewRow>()
    promotionEligibilityRows.forEach((item) => {
      map.set(`${item.rowKey}:${item.channelAccountId}`, item)
    })
    return map
  }, [promotionEligibilityRows])

  useEffect(() => {
    if (!selectedPromotion || !promotionEligibilityRequestRows.length) {
      promotionEligibilityRunIdRef.current += 1
      setPromotionEligibilityRows([])
      setLoadingPromotionEligibility(false)
      return
    }
    const runId = promotionEligibilityRunIdRef.current + 1
    promotionEligibilityRunIdRef.current = runId
    const cache = promotionEligibilityCacheRef.current
    const cachedResults: SaleOzonPromotionEligibilityPreviewRow[] = []
    const missingRows: typeof promotionEligibilityRequestRows = []
    const missingKeys = new Set<string>()
    promotionEligibilityRequestRows.forEach((row) => {
      const cacheKey = buildPromotionEligibilityCacheKey(
        selectedPromotion.actionId,
        row.channelAccountId,
        row.offerId,
        row.productId,
      )
      const cached = cache.get(cacheKey)
      if (cached) {
        cachedResults.push({
          rowKey: row.rowKey,
          ...cached,
        })
        return
      }
      if (missingKeys.has(cacheKey)) {
        return
      }
      missingKeys.add(cacheKey)
      missingRows.push(row)
    })
    setPromotionEligibilityRows(cachedResults)
    if (!missingRows.length) {
      setLoadingPromotionEligibility(false)
      return
    }
    setLoadingPromotionEligibility(true)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const chunks: typeof missingRows[] = []
          for (let index = 0; index < missingRows.length; index += PROMOTION_PREVIEW_BATCH_LIMIT) {
            chunks.push(missingRows.slice(index, index + PROMOTION_PREVIEW_BATCH_LIMIT))
          }
          for (const chunk of chunks) {
            const preview = await saleApi.previewOzonPromotionEligibility({
              actionId: selectedPromotion.actionId,
              rows: chunk,
            })
            preview.forEach((item) => {
              const cacheKey = buildPromotionEligibilityCacheKey(
                selectedPromotion.actionId,
                item.channelAccountId,
                item.offerId,
                item.productId,
              )
              cache.set(cacheKey, {
                channelAccountId: item.channelAccountId,
                offerId: item.offerId,
                productId: item.productId,
                status: item.status,
                reason: item.reason,
                platformStock: item.platformStock,
                actionPrice: item.actionPrice,
                maxActionPrice: item.maxActionPrice,
                minStock: item.minStock,
                addMode: item.addMode,
              })
            })
          }
          if (runId !== promotionEligibilityRunIdRef.current) {
            return
          }
          const mergedResults = promotionEligibilityRequestRows.flatMap((row) => {
            const cacheKey = buildPromotionEligibilityCacheKey(
              selectedPromotion.actionId,
              row.channelAccountId,
              row.offerId,
              row.productId,
            )
            const cached = cache.get(cacheKey)
            if (!cached) {
              return []
            }
            return [{
              rowKey: row.rowKey,
              ...cached,
            }]
          })
          setPromotionEligibilityRows(mergedResults)
        } catch (error) {
          if (runId === promotionEligibilityRunIdRef.current) {
            setPromotionEligibilityRows(cachedResults)
            messageRef.current.error(getErrorMessage(error, '加载活动资格状态失败'))
          }
        } finally {
          if (runId === promotionEligibilityRunIdRef.current) {
            setLoadingPromotionEligibility(false)
          }
        }
      })()
    }, 250)
    return () => {
      window.clearTimeout(timer)
    }
  }, [promotionEligibilityRequestRows, selectedPromotion])

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
            productName: getProductDisplayTitle(row),
            shopName,
            reason: '该店铺没有这个活动',
          }]
        }
        if (!product) {
          return [{
            key: `${row.key}:${accountId}:missing-sync`,
            rowKey: row.key,
            productName: getProductDisplayTitle(row),
            shopName,
            reason: '该商品未同步到这个店铺',
          }]
        }
        if (!product.offerId && !product.productId) {
          return [{
            key: `${row.key}:${accountId}:missing-identity`,
            rowKey: row.key,
            productName: getProductDisplayTitle(row),
            shopName,
            offerId: product.offerId,
            productId: product.productId,
            reason: '缺少可用于报名的平台商品标识',
          }]
        }
        const preview = promotionEligibilityByCellKey.get(`${row.key}:${accountId}`)
        const previewStatus = (preview?.status || '').toUpperCase()
        if (previewStatus === 'PARTICIPATING') {
          return [{
            key: `${row.key}:${accountId}:participating`,
            rowKey: row.key,
            productName: getProductDisplayTitle(row),
            shopName,
            offerId: product.offerId,
            productId: product.productId,
            reason: preview?.reason || '该商品已在当前活动中',
          }]
        }
        if (previewStatus === 'NOT_CANDIDATE' || previewStatus === 'MISSING_PRODUCT' || previewStatus === 'MISSING_ACTION') {
          return [{
            key: `${row.key}:${accountId}:${previewStatus.toLowerCase()}`,
            rowKey: row.key,
            productName: getProductDisplayTitle(row),
            shopName,
            offerId: product.offerId,
            productId: product.productId,
            reason: preview?.reason || '该商品当前不可报名',
          }]
        }
        return []
      })
    })
  }, [accountsById, effectiveAccountIds, promotionEligibilityByCellKey, selectedProducts, selectedPromotion])

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
        const preview = promotionEligibilityByCellKey.get(`${row.key}:${accountId}`)
        const previewStatus = (preview?.status || '').toUpperCase()
        if (previewStatus && previewStatus !== 'CANDIDATE') {
          return []
        }
        return [product]
      })
      const legalPreviews = legalItems
        .map((item) => promotionEligibilityByCellKey.get(`${row.key}:${item.channelAccountId}`))
        .filter((item): item is SaleOzonPromotionEligibilityPreviewRow => Boolean(item))
      const previewActionPrice = legalPreviews.find((item) => item.actionPrice !== null && item.actionPrice !== undefined)?.actionPrice
      const previewMaxActionPrice = legalPreviews.find((item) => item.maxActionPrice !== null && item.maxActionPrice !== undefined)?.maxActionPrice
      const previewMinStock = legalPreviews.find((item) => item.minStock !== null && item.minStock !== undefined)?.minStock
      const rowSkippedItems = skippedItems.filter((item) => item.rowKey === row.key)
      return {
        key: row.key,
        product: row,
        legalItems,
        skippedItems: rowSkippedItems,
        currentPriceSuggestion: legalItems.find((item) => item.price !== null && item.price !== undefined)?.price ?? null,
        currentStockSuggestion: legalItems.find((item) => item.stockPresent !== null && item.stockPresent !== undefined)?.stockPresent ?? null,
        promotionActionPriceSuggestion: previewActionPrice !== undefined && previewActionPrice !== null
          ? numberFrom(previewActionPrice)
          : (legalItems.find((item) => item.promotionActionPrice !== null && item.promotionActionPrice !== undefined)?.promotionActionPrice ?? null),
        promotionMaxActionPriceSuggestion: previewMaxActionPrice !== undefined && previewMaxActionPrice !== null
          ? numberFrom(previewMaxActionPrice)
          : (legalItems.find((item) => item.promotionMaxActionPrice !== null && item.promotionMaxActionPrice !== undefined)?.promotionMaxActionPrice ?? null),
        promotionMinStockSuggestion: previewMinStock
          ?? legalItems.find((item) => item.promotionMinStock !== null && item.promotionMinStock !== undefined)?.promotionMinStock
          ?? null,
      }
    })
  }, [effectiveAccountIds, promotionEligibilityByCellKey, selectedProducts, selectedPromotion, skippedItems])

  const visibleRowStatusSummary = useMemo(() => {
    return allBusinessRows.reduce<PromotionRowStatusSummary>((accumulator, row) => {
      const current = summarizePromotionRowStatus(row, effectiveAccountIds, selectedPromotion, promotionEligibilityByCellKey)
      accumulator.participatingCount += current.participatingCount
      accumulator.candidateCount += current.candidateCount
      accumulator.blockedCount += current.blockedCount
      accumulator.missingActivityCount += current.missingActivityCount
      accumulator.missingSyncCount += current.missingSyncCount
      accumulator.missingIdentityCount += current.missingIdentityCount
      accumulator.unknownCount += current.unknownCount
      return accumulator
    }, {
      participatingCount: 0,
      candidateCount: 0,
      blockedCount: 0,
      missingActivityCount: 0,
      missingSyncCount: 0,
      missingIdentityCount: 0,
      unknownCount: 0,
    })
  }, [allBusinessRows, effectiveAccountIds, promotionEligibilityByCellKey, selectedPromotion])

  const totalLegalItemCount = useMemo(
    () => requestDraftRows.reduce((sum, item) => sum + item.legalItems.length, 0),
    [requestDraftRows],
  )

  const incompleteDraftRows = useMemo(
    () => requestDraftRows.filter((row) => row.legalItems.length && (!requestInputs[row.key]?.actionPrice || (requestInputs[row.key]?.actionPrice ?? 0) <= 0)),
    [requestDraftRows, requestInputs],
  )

  const incompleteDraftRowCount = incompleteDraftRows.length
  const firstIncompleteDraftRowKey = incompleteDraftRows[0]?.key

  const submitInvalidReason = useMemo(() => {
    if (!effectiveAccountIds.length) {
      return '请选择要报名的 Ozon 店铺'
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
    if (incompleteDraftRowCount) {
      return `还有 ${incompleteDraftRowCount} 个待提交商品未填写活动价`
    }
    return ''
  }, [effectiveAccountIds.length, incompleteDraftRowCount, selectedProducts.length, selectedPromotion, totalLegalItemCount])

  const submitStatusDescription = useMemo(() => {
    if (!submitInvalidReason) {
      return '活动价已补齐；活动库存可留空，确认后可直接提交。'
    }
    if (incompleteDraftRowCount) {
      return '活动库存可以留空。点击“定位待处理商品”后，补齐高亮行的活动价即可提交。'
    }
    return submitInvalidReason
  }, [incompleteDraftRowCount, submitInvalidReason])

  const focusFirstIncompleteDraftRow = useCallback(() => {
    if (!firstIncompleteDraftRowKey) {
      return
    }
    const escapedKey = window.CSS?.escape
      ? window.CSS.escape(firstIncompleteDraftRowKey)
      : firstIncompleteDraftRowKey.replace(/["\\]/g, '\\$&')
    const row = document.querySelector(`.scw-promo-entry-table tr[data-row-key="${escapedKey}"]`) as HTMLTableRowElement | null
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    window.setTimeout(() => {
      const input = row?.querySelector('.ant-input-number-input') as HTMLInputElement | null
      input?.focus()
    }, 160)
  }, [firstIncompleteDraftRowKey])

  const pageGuide = useMemo(() => {
    if (currentStep === 0) {
      return '先选择一个活动，再进入商品选择。'
    }
    if (currentStep === 1) {
      if (workbenchTab === 'PLATFORM_PARTICIPATING') {
        return '平台已报名商品，仅供核对。'
      }
      if (workbenchTab === 'PLATFORM_CANDIDATE') {
        return '从平台候选商品里勾选本次准备报名的商品。'
      }
      return '从店铺商品里筛选并勾选本次准备报名的商品。'
    }
    return ''
  }, [currentStep, workbenchTab])

  const workbenchSummaryText = useMemo(() => {
    if (workbenchTab === 'LOCAL') {
      if (!selectedPromotion) {
        return '从店铺商品里选择本次要报名的商品。'
      }
      const hasStableStatus = visibleRowStatusSummary.participatingCount > 0
        || visibleRowStatusSummary.candidateCount > 0
        || visibleRowStatusSummary.blockedCount > 0
      if (!hasStableStatus && loadingPromotionEligibility) {
        return '从店铺商品里选择本次要报名的商品。商品状态确认中，请稍后刷新查看。'
      }
      return '从店铺商品里选择本次要报名的商品。请选择符合当前活动要求的商品后继续下一步。'
    }
    if (!selectedPromotion) {
      return '先选择活动，再查看平台商品。'
    }
    if (!isSingleAccountScope) {
      return '平台商品列表需要按单店铺加载，请先只保留一个店铺。'
    }
    return workbenchTab === 'PLATFORM_CANDIDATE'
      ? '当前展示已在本地建立映射、且被平台识别为候选报名的商品，可直接勾选加入本次报名。'
      : '当前展示已在本地建立映射、且被平台识别为已报名的商品，仅供核对。'
  }, [
    isSingleAccountScope,
    loadingPromotionEligibility,
    selectedPromotion,
    visibleRowStatusSummary.blockedCount,
    visibleRowStatusSummary.candidateCount,
    visibleRowStatusSummary.participatingCount,
    workbenchTab,
  ])

  const workbenchTabItems = useMemo(() => ([
    { key: 'LOCAL', label: '待选店铺商品' },
    {
      key: 'PLATFORM_CANDIDATE',
      label: '平台候选商品',
      disabled: !selectedPromotion || !isSingleAccountScope,
    },
    {
      key: 'PLATFORM_PARTICIPATING',
      label: '平台已报名商品',
      disabled: !selectedPromotion || !isSingleAccountScope,
    },
  ]), [isSingleAccountScope, selectedPromotion]) as Array<{ key: WorkbenchTabKey; label: string; disabled?: boolean }>
  const workbenchModeTitle = workbenchTab === 'LOCAL'
    ? '待选店铺商品'
    : workbenchTab === 'PLATFORM_CANDIDATE'
      ? '平台候选商品'
      : '平台已报名商品'

  const goToNextStep = () => {
    if (currentStep === 0) {
      if (!selectedPromotion) {
        message.warning('请先选择活动')
        return
      }
      setCurrentStep(1)
      return
    }
    if (currentStep === 1) {
      if (workbenchTab === 'PLATFORM_PARTICIPATING') {
        message.warning('平台已报名商品仅用于核对，不能直接用于新报名')
        return
      }
      if (!selectedProducts.length) {
        message.warning('请先选择商品')
        return
      }
      setCurrentStep(2)
    }
  }

  const goToPreviousStep = () => {
    setCurrentStep((value) => Math.max(0, value - 1))
  }

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

  const applyBatchDefaultActionPrice = () => {
    if (!requestDraftRows.length) {
      message.warning('当前没有可提交商品')
      return
    }
    if (batchActionPrice === null || batchActionPrice === undefined || batchActionPrice <= 0) {
      message.warning('请先填写默认活动价')
      return
    }
    let appliedCount = 0
    setRequestInputs((current) => {
      const next = { ...current }
      requestDraftRows.forEach((row) => {
        if (!row.legalItems.length) {
          return
        }
        const currentInput = current[row.key]
        if (currentInput?.actionPrice && currentInput.actionPrice > 0) {
          return
        }
        next[row.key] = {
          actionPrice: batchActionPrice,
          stock: currentInput?.stock ?? null,
        }
        appliedCount += 1
      })
      return next
    })
    if (!appliedCount) {
      message.warning('当前没有需要补填活动价的商品')
      return
    }
    message.success(`已为 ${appliedCount} 行补齐活动价，已填写内容保持不变`)
  }

  const applyBatchDefaultStock = () => {
    if (!requestDraftRows.length) {
      message.warning('当前没有可提交商品')
      return
    }
    if (batchStock === null || batchStock === undefined || batchStock < 0 || !Number.isInteger(batchStock)) {
      message.warning('请先填写默认活动库存')
      return
    }
    let appliedCount = 0
    setRequestInputs((current) => {
      const next = { ...current }
      requestDraftRows.forEach((row) => {
        if (!row.legalItems.length) {
          return
        }
        const currentInput = current[row.key]
        if (!(currentInput?.stock === null || currentInput?.stock === undefined)) {
          return
        }
        next[row.key] = {
          actionPrice: currentInput?.actionPrice ?? null,
          stock: batchStock,
        }
        appliedCount += 1
      })
      return next
    })
    if (!appliedCount) {
      message.warning('当前没有需要补填活动库存的商品')
      return
    }
    message.success(`已为 ${appliedCount} 行补齐活动库存，已填写内容保持不变`)
  }

  const applyBatchCurrentPrices = () => {
    if (!requestDraftRows.length) {
      message.warning('当前没有可提交商品')
      return
    }
    let appliedCount = 0
    setRequestInputs((current) => {
      const next = { ...current }
      requestDraftRows.forEach((row) => {
        if (
          !row.legalItems.length
          || row.currentPriceSuggestion === null
          || row.currentPriceSuggestion === undefined
          || row.currentPriceSuggestion <= 0
          || (current[row.key]?.actionPrice && current[row.key]!.actionPrice! > 0)
        ) {
          return
        }
        next[row.key] = {
          actionPrice: row.currentPriceSuggestion,
          stock: current[row.key]?.stock ?? null,
        }
        appliedCount += 1
      })
      return next
    })
    if (!appliedCount) {
      message.warning('当前没有可补填当前售价的商品')
      return
    }
    const skippedCount = requestDraftRows.length - appliedCount
    message.success(skippedCount > 0 ? `已为 ${appliedCount} 行补入当前售价，其他已填写或无售价的商品保持不变` : `已为 ${appliedCount} 行补入当前售价`)
  }

  const submit = () => {
    if (submitInvalidReason) {
      message.warning(submitInvalidReason)
      return
    }
    Modal.confirm({
      title: '确认提交 Ozon 活动报名任务',
      content: `将向活动 ${selectedPromotion?.title || selectedActionId} 提交 ${requestDraftRows.length} 个商品行、${totalLegalItemCount} 个店铺商品组合。未填写的活动库存会默认使用平台当前库存。`,
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
      title: '活动（平台名称）',
      dataIndex: 'title',
      render: (value, record) => (
        <div className="scw-promo-activity-cell">
          <Paragraph className="scw-promo-activity-title" ellipsis={{ rows: 2, tooltip: value || record.actionId }}>
            {value || record.actionId}
          </Paragraph>
          <Text type="secondary">活动 ID：{record.actionId}</Text>
          <Text type="secondary">覆盖店铺：{record.shopNames.join(' / ') || '--'}</Text>
        </div>
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
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.dateEnd || '--'}</Text>
          <Text type="secondary">开始：{record.dateStart || '--'}</Text>
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
      title: '商品（平台名称）',
      dataIndex: 'name',
      width: 400,
      render: (value, record) => (
        <Space align="start" size={12}>
          <ProductThumb src={record.imageUrl} name={value} size={64} />
          <div className="scw-promo-product-meta">
            <Paragraph className="scw-promo-product-title" ellipsis={{ rows: 2, tooltip: getProductDisplayTitle(record) }}>
              {getProductDisplayTitle(record)}
            </Paragraph>
            {getProductIdentityText(record) ? <Text type="secondary">{getProductIdentityText(record)}</Text> : null}
            {record.styleName && record.styleName !== getProductDisplayTitle(record) ? (
              <Paragraph className="scw-promo-product-subtitle" ellipsis={{ rows: 1, tooltip: record.styleName }}>
                {record.styleName}
              </Paragraph>
            ) : null}
          </div>
        </Space>
      ),
    },
    {
      title: '规格',
      key: 'spec',
      width: 260,
      render: (_, record) => (
        <div className="scw-promo-spec-cell">
          <Paragraph ellipsis={{ rows: 2, tooltip: record.specSummary || undefined }}>
            {record.specSummary || '--'}
          </Paragraph>
          <Text type="secondary">颜色：{record.colors.join(' / ') || '--'} · 尺码：{record.sizes.join(' / ') || '--'}</Text>
        </div>
      ),
    },
    {
      title: '报名店铺',
      key: 'shops',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.syncedAccountIds.length} 个店铺</Text>
          <Text type="secondary">{record.syncedShopNames.join(' / ') || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '活动状态',
      key: 'scope',
      width: 240,
      render: (_, record) => {
        const summary = summarizePromotionRowStatus(record, effectiveAccountIds, selectedPromotion, promotionEligibilityByCellKey)
        const status = getPromotionStatusPresentation(summary)
        return (
          <div className="scw-promo-status-card">
            <Tag color={status.color}>{status.label}</Tag>
            <Text type="secondary">{status.detailText}</Text>
          </div>
        )
      },
    },
  ]

  const isParticipatingWorkbench = workbenchTab === 'PLATFORM_PARTICIPATING'

  const platformProductColumns: ColumnsType<BusinessProductRow> = [
    {
      title: '商品信息（平台名称）',
      dataIndex: 'name',
      width: 420,
      render: (value, record) => {
        const platformRow = record.shopRows[0]
        const title = getProductDisplayTitle(record)
        const hasRichIdentity = Boolean(value || record.imageUrl || record.specSummary || platformRow?.offerId || platformRow?.platformSkuId)
        const riskSummary = getPlatformRiskSummary(record, platformRow, { participating: isParticipatingWorkbench })
        const primaryStatusTag = isParticipatingWorkbench
          ? { color: 'blue' as const, label: '已报名' }
          : riskSummary
            ? { color: 'gold' as const, label: riskSummary.tagLabel }
            : { color: 'green' as const, label: '可报名' }
        const visual = record.imageUrl?.trim()
          ? <ProductThumb src={record.imageUrl} name={value} size={64} />
          : hasRichIdentity
            ? <ProductThumb src={record.imageUrl} name={value} size={64} />
            : (
              <div className="scw-promo-platform-id-card">
                <Text type="secondary">平台商品</Text>
                <strong>#{platformRow?.productId ?? '--'}</strong>
              </div>
            )
        return (
          <Space align="start" size={12}>
            {visual}
            <div className="scw-promo-product-meta">
              <Paragraph className="scw-promo-product-title" ellipsis={{ rows: 2, tooltip: title }}>
                {title}
              </Paragraph>
              {getProductIdentityText(record) ? (
                <Text className="scw-promo-platform-identity" type={isParticipatingWorkbench ? undefined : 'secondary'}>
                  {getProductIdentityText(record)}
                </Text>
              ) : null}
              <Space size={[4, 4]} wrap>
                <Tag color={primaryStatusTag.color}>{primaryStatusTag.label}</Tag>
                {platformRow?.mapped && !isParticipatingWorkbench ? <Tag color="green">已关联本地商品</Tag> : null}
              </Space>
              {riskSummary ? (
                <div className={`scw-promo-platform-risk-card scw-promo-platform-risk-card--${riskSummary.tone}`}>
                  <Text strong>{riskSummary.title}</Text>
                </div>
              ) : null}
              {!riskSummary ? (
                <Paragraph
                  className={isParticipatingWorkbench ? 'scw-promo-product-subtitle scw-promo-product-subtitle--readable' : 'scw-promo-product-subtitle'}
                  ellipsis={{ rows: 2, tooltip: record.specSummary || undefined }}
                >
                  {record.specSummary || (isParticipatingWorkbench
                    ? '平台已报名商品，仅供核对。'
                    : (platformRow?.mapped ? '资料已齐，可直接加入本次报名。' : '尚未关联本地商品，建议先核对后再报名。'))}
                </Paragraph>
              ) : null}
            </div>
          </Space>
        )
      },
    },
    {
      title: '价格与库存',
      key: 'price',
      width: 240,
      render: (_, record) => {
        const firstShopRow = record.shopRows[0]
        const preview = firstShopRow
          ? promotionEligibilityByCellKey.get(`${record.key}:${firstShopRow.channelAccountId}`)
          : undefined
        const previewActionPrice = numberFrom(preview?.actionPrice)
        const previewMaxActionPrice = numberFrom(preview?.maxActionPrice)
        const previewMinStock = preview?.minStock ?? null
        const previewStock = preview?.platformStock ?? null
        return (
          <Space direction="vertical" size={4}>
            <Text>当前售价：{firstShopRow?.price ?? '--'}</Text>
            <Text type="secondary">
              {isParticipatingWorkbench ? '当前活动价' : '建议活动价'}：{displayPositiveNumber(previewActionPrice ?? firstShopRow?.promotionActionPrice)}
            </Text>
            {!isParticipatingWorkbench ? (
              <Text type="secondary">
                参考活动价上限：{displayPositiveNumber(previewMaxActionPrice ?? firstShopRow?.promotionMaxActionPrice)} · 最低报名库存：{displayMinStock(previewMinStock ?? firstShopRow?.promotionMinStock)}
              </Text>
            ) : null}
            <Text type={isParticipatingWorkbench ? undefined : 'secondary'}>当前库存：{previewStock ?? firstShopRow?.stockPresent ?? '--'}</Text>
          </Space>
        )
      },
    },
    {
      title: '规格与补充信息',
      key: 'spec',
      width: 220,
      render: (_, record) => (
        <div className="scw-promo-spec-cell">
          {record.colors.length || record.sizes.length ? (
            <>
              <Text>颜色：{record.colors.join(' / ') || '--'}</Text>
              <Text type={isParticipatingWorkbench ? undefined : 'secondary'}>尺码：{record.sizes.join(' / ') || '--'}</Text>
            </>
          ) : (
            <Text type="secondary">--</Text>
          )}
        </div>
      ),
    },
    {
      title: '报名店铺',
      key: 'shop',
      width: 180,
      render: (_, record) => (
        <Text>{record.syncedShopNames.join(' / ') || '--'}</Text>
      ),
    },
  ]

  const requestColumns: ColumnsType<RequestDraftRow> = [
    {
      title: '待提交商品（平台名称）',
      key: 'product',
      width: 360,
      className: 'scw-promo-entry-table__cell--readonly',
      render: (_, record) => (
        <div className="scw-promo-readonly-cell scw-promo-product-cell">
          <Space align="start" size={12}>
            <ProductThumb src={record.product.imageUrl} name={record.product.name} size={56} />
            <Space direction="vertical" size={3}>
              <Paragraph className="scw-promo-product-title" ellipsis={{ rows: 2, tooltip: getProductDisplayTitle(record.product) }}>
                {getProductDisplayTitle(record.product)}
              </Paragraph>
              {getProductIdentityText(record.product) ? <Text type="secondary">{getProductIdentityText(record.product)}</Text> : null}
              <Space size={[4, 4]} wrap>
                {record.product.styleNo ? <Tag color="geekblue">款号 {record.product.styleNo}</Tag> : null}
                <Tag color="green">可提交 {record.legalItems.length}</Tag>
                {record.skippedItems.length ? <Tag color="default">已排除 {record.skippedItems.length}</Tag> : null}
                {record.legalItems.length && record.key === firstIncompleteDraftRowKey
                  ? <Tag color="error">优先补活动价</Tag>
                  : null}
                {record.legalItems.length && record.key !== firstIncompleteDraftRowKey && (!requestInputs[record.key]?.actionPrice || (requestInputs[record.key]?.actionPrice ?? 0) <= 0)
                  ? <Tag color="gold">待补活动价</Tag>
                  : null}
              </Space>
              <Text type="secondary">{record.legalItems.map((item) => item.shopName).join(' / ') || '--'}</Text>
            </Space>
          </Space>
        </div>
      ),
    },
    {
      title: '参数参考',
      key: 'suggestions',
      width: 220,
      className: 'scw-promo-entry-table__cell--readonly',
      render: (_, record) => (
        <div className="scw-promo-readonly-cell scw-promo-suggestion-cell">
          <Space direction="vertical" size={6}>
            <Text>当前售价：{record.currentPriceSuggestion ?? '--'}</Text>
            <Text type="secondary">
              当前库存：{record.currentStockSuggestion ?? '--'} · 活动建议价：{displayPositiveNumber(record.promotionActionPriceSuggestion)}
            </Text>
            <Text type="secondary">
              参考活动价上限：{displayPositiveNumber(record.promotionMaxActionPriceSuggestion)} · 最低报名库存：{displayMinStock(record.promotionMinStockSuggestion)}
            </Text>
          </Space>
        </div>
      ),
    },
    {
      title: '活动价（必填）',
      key: 'actionPrice',
      width: 160,
      className: 'scw-promo-entry-table__cell--input',
      render: (_, record) => (
        <div className="scw-promo-field-cell">
          <Space direction="vertical" size={8} className="scw-promo-field-stack">
            <InputNumber
              min={0.01}
              disabled={!record.legalItems.length}
              value={requestInputs[record.key]?.actionPrice ?? null}
              onChange={(value) => applyInputPatch(record.key, { actionPrice: value })}
              placeholder="请输入活动价"
              className="oc-excel-cell-input"
            />
            <Space size={[4, 4]} wrap className="scw-promo-suggestion-actions">
              {record.promotionActionPriceSuggestion !== null && record.promotionActionPriceSuggestion !== undefined ? (
                <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { actionPrice: record.promotionActionPriceSuggestion ?? null })}>
                  填入建议活动价
                </Button>
              ) : null}
              {record.currentPriceSuggestion !== null
              && record.currentPriceSuggestion !== undefined
              && (record.promotionActionPriceSuggestion === null || record.promotionActionPriceSuggestion === undefined) ? (
                <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { actionPrice: record.currentPriceSuggestion ?? null })}>
                  填入当前售价
                </Button>
              ) : null}
            </Space>
          </Space>
        </div>
      ),
    },
    {
      title: '活动库存（可选）',
      key: 'stock',
      width: 160,
      className: 'scw-promo-entry-table__cell--input',
      render: (_, record) => (
        <div className="scw-promo-field-cell">
          <Space direction="vertical" size={8} className="scw-promo-field-stack">
            <InputNumber
              min={0}
              precision={0}
              disabled={!record.legalItems.length}
              value={requestInputs[record.key]?.stock ?? null}
              onChange={(value) => applyInputPatch(record.key, { stock: value })}
              placeholder="留空则沿用当前库存"
              className="oc-excel-cell-input"
            />
            <Space size={[4, 4]} wrap className="scw-promo-suggestion-actions">
              {record.promotionMinStockSuggestion !== null && record.promotionMinStockSuggestion !== undefined ? (
                <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { stock: record.promotionMinStockSuggestion ?? null })}>
                  填入最低报名库存
                </Button>
              ) : null}
              {record.currentStockSuggestion !== null
              && record.currentStockSuggestion !== undefined
              && (record.promotionMinStockSuggestion === null || record.promotionMinStockSuggestion === undefined) ? (
                <Button size="small" type="link" onClick={() => applyInputPatch(record.key, { stock: record.currentStockSuggestion ?? null })}>
                  填入当前库存
                </Button>
              ) : null}
            </Space>
          </Space>
        </div>
      ),
    },
  ]

  const skippedColumns: ColumnsType<SkippedCombination> = [
    {
      title: '商品',
      dataIndex: 'productName',
      width: 260,
      render: (value, record) => value || record.offerId || (record.productId ? `平台商品 ${record.productId}` : '--'),
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
          <Text>商家编码：{record.offerId || '--'}</Text>
          <Text type="secondary">平台商品编号：{record.productId || '--'}</Text>
        </Space>
      ),
    },
    {
      title: '跳过原因',
      dataIndex: 'reason',
      render: (value) => <Text type="secondary">{value}</Text>,
    },
  ]

  const currentProductColumns = workbenchTab === 'LOCAL' ? productColumns : platformProductColumns
  const platformTabBlocked = isPlatformWorkbench && (!selectedPromotion || !isSingleAccountScope)
  const canSelectCurrentWorkbenchRows = workbenchTab !== 'PLATFORM_PARTICIPATING'
  const workbenchRowSelection = useMemo(
    () => (canSelectCurrentWorkbenchRows
      ? { selectedRowKeys, onChange: setSelectedRowKeys, preserveSelectedRowKeys: true }
      : undefined),
    [canSelectCurrentWorkbenchRows, selectedRowKeys],
  )
  const workbenchOnRow = useCallback(
    (record: BusinessProductRow) => (canSelectCurrentWorkbenchRows
      ? {
        onClick: (event: MouseEvent<HTMLElement>) => {
          if (shouldIgnoreWorkbenchRowToggle(event.target)) {
            return
          }
          toggleWorkbenchRowSelection(record)
        },
      }
      : {}),
    [canSelectCurrentWorkbenchRows, toggleWorkbenchRowSelection],
  )
  const scopeSummaryText = effectiveAccountIds
    .map((accountId) => getShopLabel(accountsById.get(accountId)))
    .filter(Boolean)
    .join(' / ') || '--'

  return (
    <div className="scw-ops-page">
      {currentStep === 0 && pageGuide ? (
        <Alert
          showIcon
          type="info"
          message={pageGuide}
        />
      ) : null}
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
                setPage(1)
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
                setPage(1)
              }}
            />
          </Col>
          <Col xs={24} xl={15}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text type="secondary">当前范围：{scopeSummaryText}</Text>
              <div className="scw-promo-stepper" aria-label="活动报名步骤">
                {[
                  '选择活动',
                  '选择商品',
                  '填写报名信息',
                ].map((title, index) => {
                  const status = index < currentStep ? 'done' : index === currentStep ? 'current' : 'pending'
                  return (
                    <div key={title} className="scw-promo-stepper-segment">
                      <div className={`scw-promo-stepper-item scw-promo-stepper-item--${status}`}>
                        <span className="scw-promo-stepper-index">{status === 'done' ? '✓' : index + 1}</span>
                        <span className="scw-promo-stepper-title">{title}</span>
                      </div>
                      {index < 2 ? (
                        <div className={`scw-promo-stepper-line scw-promo-stepper-line--${index < currentStep ? 'done' : 'pending'}`} />
                      ) : null}
                    </div>
                  )
                })}
              </div>
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
          style={{ marginTop: 12 }}
        />
      ) : null}

      <div className="scw-promo-step-stack">
        {currentStep === 0 ? (
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><Card><Statistic title="报名店铺" value={effectiveAccountIds.length} prefix={<GiftOutlined />} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="进行中活动" value={promotions.length} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="平台候选商品" value={selectedPromotion?.potentialProductsCount ?? 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="平台已报名商品" value={selectedPromotion?.participatingProductsCount ?? 0} /></Card></Col>
          </Row>
        ) : null}

        {currentStep === 0 ? (
          <Card
            className="scw-promo-step-card"
            title="步骤 1 · 选择活动"
            extra={selectedPromotion ? <Text type="secondary">当前活动覆盖 {selectedPromotion.channelAccountIds.length} / {effectiveAccountIds.length} 个店铺</Text> : null}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} xl={8}>
                <Input.Search
                  value={activityKeywordInput}
                  placeholder="搜索活动名称 / ID"
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setActivityKeywordInput(nextValue)
                    if (!nextValue.trim()) {
                      setActivityKeyword('')
                    }
                  }}
                  onSearch={(value) => setActivityKeyword(value.trim())}
                  allowClear
                />
              </Col>
              <Col xs={24} xl={16}>
                <Space wrap>
                  <Button icon={<ReloadOutlined />} loading={loadingPromotions} onClick={loadPromotions}>
                    刷新活动
                  </Button>
                  <Button type="primary" onClick={goToNextStep} disabled={!selectedPromotion}>
                    下一步：选择商品
                  </Button>
                </Space>
              </Col>
            </Row>
            <Table
              className="scw-promo-list-table"
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
        ) : null}

        {currentStep === 1 ? (
          <Card
            className="scw-promo-step-card"
            title="步骤 2 · 选择商品"
            extra={null}
          >
            <div className="scw-promo-workbench-head">
              <Tabs
                activeKey={workbenchTab}
                items={workbenchTabItems}
                onChange={(key) => setWorkbenchTab(key as WorkbenchTabKey)}
              />
              <div className="scw-promo-workbench-actions">
                {workbenchTab === 'LOCAL' ? (
                  <>
                    <Input
                      value={productKeyword}
                      placeholder="搜索商品名 / 款号 / 商家编码 / 平台商品ID"
                      onChange={(event) => {
                        setProductKeyword(event.target.value)
                        setPage(1)
                      }}
                      onPressEnter={() => void loadProducts()}
                      allowClear
                      style={{ width: 280 }}
                    />
                    <Select
                      value={promotionStatusFilter}
                      disabled={!selectedPromotion}
                      style={{ width: 180 }}
                      options={[
                        { label: '全部状态', value: 'ALL' },
                        { label: '已报名', value: 'PARTICIPATING' },
                        { label: '可报名', value: 'CANDIDATE' },
                        { label: '不可报名', value: 'NOT_CANDIDATE' },
                      ]}
                      onChange={(value) => {
                        setPromotionStatusFilter(value)
                        setPage(1)
                      }}
                    />
                  </>
                ) : (
                  <Text type="secondary">
                    {isSingleAccountScope
                      ? `当前店铺：${getShopLabel(accountsById.get(scopedSingleAccountId || ''))}`
                      : '请先将店铺范围收敛到一个店铺，再查看平台商品。'}
                  </Text>
                )}
                <Button icon={<ReloadOutlined />} loading={loadingProducts} onClick={loadProducts}>
                  刷新商品
                </Button>
              </div>
            </div>
            <div className="scw-promo-tab-guide">
              <div>
                <Text strong>{workbenchModeTitle}</Text>
                <Text type="secondary">{workbenchSummaryText}</Text>
              </div>
              <div className="scw-promo-tab-summary">
                <Space size={[8, 8]} wrap>
                  {selectedPromotion ? <Tag>候选报名商品 {selectedPromotion.potentialProductsCount ?? 0}</Tag> : null}
                  {selectedPromotion ? <Tag>已报名商品 {selectedPromotion.participatingProductsCount ?? 0}</Tag> : null}
                </Space>
                {canSelectCurrentWorkbenchRows ? <Text strong className="scw-promo-selected-summary">已选商品：{selectedProducts.length}</Text> : null}
              </div>
            </div>
            {platformTabBlocked ? (
              <Alert
                showIcon
                type="info"
                message="平台商品列表按单店铺加载"
                description="请返回上一步，仅保留一个店铺后再切换到平台候选商品或平台已报名商品。"
                style={{ marginBottom: 16 }}
              />
            ) : null}
            <Table
              className={workbenchTab === 'LOCAL'
                ? 'scw-promo-list-table'
                : workbenchTab === 'PLATFORM_PARTICIPATING'
                  ? 'scw-promo-list-table scw-promo-platform-table scw-promo-list-table--review'
                  : 'scw-promo-list-table scw-promo-platform-table'}
              rowKey="key"
              size="small"
              loading={loadingProducts}
              columns={currentProductColumns}
              dataSource={allBusinessRows}
              rowSelection={workbenchRowSelection}
              onRow={workbenchOnRow}
              rowClassName={(record) => {
                const classNames: string[] = []
                if (canSelectCurrentWorkbenchRows) {
                  classNames.push('scw-promo-selectable-row')
                }
                const riskSummary = workbenchTab !== 'LOCAL'
                  ? getPlatformRiskSummary(record, record.shopRows[0], { participating: isParticipatingWorkbench })
                  : null
                if (riskSummary) {
                  classNames.push('scw-promo-platform-row--needs-review')
                  classNames.push(riskSummary.tone === 'review' ? 'scw-promo-platform-row--review' : 'scw-promo-platform-row--warning')
                }
                return classNames.join(' ')
              }}
              pagination={workbenchTab === 'LOCAL'
                ? {
                  current: page,
                  pageSize,
                  total: productTotal,
                  showSizeChanger: true,
                  onChange: (nextPage, nextPageSize) => {
                    setPage(nextPage)
                    setPageSize(nextPageSize)
                  },
                }
                : false}
              scroll={{ x: workbenchTab === 'LOCAL' ? 1120 : 980 }}
            />
            {workbenchTab !== 'LOCAL' ? (
              <div className="scw-promo-platform-pagination">
                <Button disabled={platformPage <= 1} onClick={() => setPlatformPage((value) => Math.max(1, value - 1))}>
                  上一页商品
                </Button>
                <Text type="secondary">第 {platformPage} 页</Text>
                <Button disabled={!platformHasMore || loadingProducts} onClick={() => setPlatformPage((value) => value + 1)}>
                  下一页商品
                </Button>
              </div>
            ) : null}
            <div className="scw-promo-step-actions">
              <Button onClick={goToPreviousStep}>上一步</Button>
              {workbenchTab === 'PLATFORM_PARTICIPATING' ? (
                <Button onClick={() => setWorkbenchTab('PLATFORM_CANDIDATE')}>
                  查看候选报名商品
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={goToNextStep}
                  disabled={platformTabBlocked || !canSelectCurrentWorkbenchRows || !selectedProducts.length}
                >
                  {`进入步骤 3${selectedProducts.length ? `（${selectedProducts.length}）` : ''}`}
                </Button>
              )}
            </div>
          </Card>
        ) : null}

        {currentStep === 2 ? (
          <div ref={step3SectionRef} className="scw-promo-step-anchor scw-promo-step-anchor--step3">
            <Card
              className="scw-promo-step-card"
              title="步骤 3 · 填写报名信息并提交"
              extra={null}
            >
            <div className="scw-promo-panel">
              <Text strong>提交范围</Text>
              <Text type="secondary">当前只会提交下方这些商品与店铺组合。</Text>
              <div className="scw-promo-preview-grid scw-promo-preview-grid--compact">
                <div className="scw-promo-preview-item">
                  <span>待报名商品</span>
                  <strong>{selectedProducts.length}</strong>
                </div>
                <div className="scw-promo-preview-item">
                  <span>可提交商品数</span>
                  <strong>{totalLegalItemCount}</strong>
                </div>
                <div className="scw-promo-preview-item">
                  <span>暂不报名商品</span>
                  <strong>{skippedItems.length}</strong>
                </div>
              </div>
            </div>
            <div className="scw-promo-panel scw-promo-panel--soft">
              <Text strong>可选：批量预填</Text>
              <Text type="secondary">只会补入未填写的商品；已经填写过的内容保持不变。</Text>
              <div className="scw-promo-batch-toolbar">
                <div className="scw-promo-batch-input">
                  <Text type="secondary">默认活动价</Text>
                  <InputNumber
                    min={0.01}
                    value={batchActionPrice}
                    placeholder="输入默认活动价"
                    onChange={setBatchActionPrice}
                    style={{ width: '100%' }}
                  />
                  <Button onClick={applyBatchDefaultActionPrice}>按默认活动价补齐空白项</Button>
                </div>
                <div className="scw-promo-batch-input">
                  <Text type="secondary">默认活动库存</Text>
                  <InputNumber
                    min={0}
                    precision={0}
                    value={batchStock}
                    placeholder="可选，不填则沿用当前库存"
                    onChange={setBatchStock}
                    style={{ width: '100%' }}
                  />
                  <Button onClick={applyBatchDefaultStock}>按默认活动库存补齐空白项</Button>
                </div>
                <Button onClick={applyBatchCurrentPrices}>用当前售价补齐空白活动价</Button>
              </div>
              <Text type="secondary">活动库存不填就沿用当前库存。</Text>
            </div>
            <div className="scw-promo-panel">
              <div className="scw-promo-submit-summary">
                <Space size={8} wrap>
                  <Text strong>{submitInvalidReason ? `还有 ${incompleteDraftRowCount} 个商品未填写活动价` : '报名信息已填好'}</Text>
                  <Tag color={submitInvalidReason ? 'gold' : 'green'}>{submitInvalidReason ? '待补活动价' : '可以提交'}</Tag>
                </Space>
                {submitInvalidReason && firstIncompleteDraftRowKey ? (
                  <Button type="primary" onClick={focusFirstIncompleteDraftRow}>立即定位待处理商品</Button>
                ) : null}
              </div>
              <Text type="secondary">{submitStatusDescription}</Text>
              <Table
                rowKey="key"
                size="small"
                className="oc-excel-entry-table scw-promo-entry-table"
                columns={requestColumns}
                dataSource={requestDraftRows}
                rowClassName={(record) => (record.legalItems.length && (!requestInputs[record.key]?.actionPrice || (requestInputs[record.key]?.actionPrice ?? 0) <= 0)
                  ? record.key === firstIncompleteDraftRowKey
                    ? 'scw-promo-entry-row--incomplete scw-promo-entry-row--current-blocker'
                    : 'scw-promo-entry-row--incomplete'
                  : '')}
                pagination={false}
                scroll={{ x: 900 }}
              />
              <Collapse
                style={{ marginTop: 16 }}
                items={[
                  {
                    key: 'skipped',
                    label: `暂不提交的商品（${skippedItems.length}）`,
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
              <div className="scw-promo-step-actions">
                <Button onClick={goToPreviousStep}>上一步</Button>
                {!submitInvalidReason ? (
                  <Text type="secondary" className="scw-promo-submit-hint">
                    必填项已完成，可直接提交。
                  </Text>
                ) : null}
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={submitting}
                  disabled={!!submitInvalidReason}
                  onClick={submit}
                >
                  提交报名任务
                </Button>
              </div>
            </div>
            </Card>
          </div>
        ) : null}
      </div>

      <OzonOperationTaskDrawer open={taskOpen} task={task} onClose={() => setTaskOpen(false)} />
    </div>
  )
}
