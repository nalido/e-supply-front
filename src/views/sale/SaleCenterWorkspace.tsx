import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Pagination,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tabs,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AlertOutlined,
  AppstoreOutlined,
  BuildOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { UserButton } from '@clerk/clerk-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { saleApi } from '../../api/sale'
import styleDetailApi from '../../api/style-detail'
import stylesApi from '../../api/styles'
import type {
  SaleChannelAccount,
  SaleChannelCredential,
  SaleIdempotencyRecordItem,
  SaleInventoryItem,
  SaleOrderDetail,
  SaleOrderItem,
  SaleRetryCandidateItem,
  SaleSyncLogItem,
  SaleProductSyncStatus,
} from '../../types/sale'
import { getSaleSellerTypeLabel } from '../../types/sale'
import type { StyleData, StyleDetailData } from '../../types/style'
import { deriveOrderIssue, getInventoryReadableAccountIds, getInventoryRiskLevel, getShopLabel, isMappedStatus, pickPreferredInventoryAccountId } from './sale-center-helpers'
import './sale-workspace.css'

const { Header, Sider, Content } = Layout
const { Title, Text, Paragraph } = Typography

type SectionKey =
  | 'workbench'
  | 'product-sync'
  | 'product-bindings'
  | 'order-issues'
  | 'risk-overview'
  | 'shop-management'
  | 'governance-sync'

type ProductMappingRecord = Awaited<ReturnType<typeof saleApi.listProductMappings>>[number]
type ProductMappingDraftRecord = Awaited<ReturnType<typeof saleApi.listProductMappingDrafts>>[number]
type ShopFormValues = {
  accountName: string
  shopId?: string | null
  shopName?: string | null
  sellerType?: string | null
  platformCode?: string | null
  regionCode?: string | null
  status?: string | null
  remarks?: string | null
  authorizationType?: string | null
  gatewayUrl?: string | null
  appKey?: string
  appSecret?: string
  accessToken?: string
  refreshToken?: string
  credentialStatus?: string
  extraPayload?: string
}
type StyleOption = {
  label: string
  value: string
  style: StyleData
}

const sectionPathMap: Record<SectionKey, string> = {
  workbench: '/sale/workbench',
  'product-sync': '/sale/products/sync',
  'product-bindings': '/sale/products/bindings',
  'order-issues': '/sale/orders/issues',
  'risk-overview': '/sale/insights/risk',
  'shop-management': '/sale/shops',
  'governance-sync': '/sale/governance/sync',
}

const pathSectionMap: Record<string, SectionKey> = {
  '/sale/workbench': 'workbench',
  '/sale/dashboard': 'workbench',
  '/sale/products/sync': 'product-sync',
  '/sale/products/bindings': 'product-bindings',
  '/sale/orders/issues': 'order-issues',
  '/sale/orders/overview': 'order-issues',
  '/sale/insights/risk': 'risk-overview',
  '/sale/shops': 'shop-management',
  '/sale/governance/sync': 'governance-sync',
}

const isProductSection = (section: SectionKey) => section === 'product-sync' || section === 'product-bindings'

const navItems = [
  {
    key: 'workbench',
    icon: <DashboardOutlined />,
    label: '今日工作台',
  },
  {
    key: 'product-group',
    icon: <AppstoreOutlined />,
    label: '商品中心',
    children: [
      { key: 'product-sync', label: '商品同步' },
      { key: 'product-bindings', label: '商品绑定' },
    ],
  },
  {
    key: 'order-group',
    icon: <ShoppingCartOutlined />,
    label: '订单中心',
    children: [{ key: 'order-issues', label: '问题订单' }],
  },
  {
    key: 'risk-group',
    icon: <DatabaseOutlined />,
    label: '经营数据',
    children: [{ key: 'risk-overview', label: '经营数据总览' }],
  },
  {
    key: 'shop-group',
    icon: <ShopOutlined />,
    label: '店铺接入',
    children: [{ key: 'shop-management', label: '店铺管理' }],
  },
  {
    key: 'governance-group',
    icon: <BuildOutlined />,
    label: '治理中心',
    children: [{ key: 'governance-sync', label: '同步任务与日志' }],
  },
] as const

const processingStatusOptions = [
  { value: 'PENDING_CONFIRM', label: '待人工确认' },
  { value: 'PENDING_BINDING', label: '待补绑定' },
  { value: 'PENDING_DATA_FIX', label: '待补数据' },
  { value: 'IN_PROGRESS', label: '跟进中' },
  { value: 'OVERDUE', label: '已超时' },
  { value: 'ESCALATED', label: '已升级' },
  { value: 'CONFIRMED', label: '已确认关闭' },
  { value: 'IGNORED', label: '无需处理' },
] as const

const syncBizTypeLabels: Record<string, string> = {
  PRODUCT_SYNC: '商品同步',
  ORDER_SYNC: '订单同步',
  INVENTORY_READ: '售卖数据同步',
}

const toneColorMap: Record<'danger' | 'warning' | 'success' | 'info' | 'default', string> = {
  danger: 'red',
  warning: 'orange',
  success: 'green',
  info: 'blue',
  default: 'default',
}

const getStatusTone = (value?: string | null) => {
  const normalized = (value || '').toUpperCase()
  if (normalized.includes('FAIL') || normalized.includes('OVERDUE') || normalized.includes('BLOCK') || normalized.includes('CONFLICT')) {
    return 'danger' as const
  }
  if (normalized.includes('PENDING') || normalized.includes('WARNING') || normalized.includes('RISK') || normalized.includes('DEGRADED')) {
    return 'warning' as const
  }
  if (normalized.includes('PROGRESS') || normalized.includes('RUNNING')) {
    return 'info' as const
  }
  if (normalized.includes('SUCCESS') || normalized.includes('ACTIVE') || normalized.includes('CONFIRMED') || normalized.includes('RESOLVED')) {
    return 'success' as const
  }
  return 'default' as const
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

const formatNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') {
    return '--'
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(parsed)) {
    return String(value)
  }
  return parsed.toLocaleString('zh-CN')
}

const formatMoney = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return '--'
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(parsed)) {
    return String(value)
  }
  return `¥${parsed.toFixed(2)}`
}

const normalizeOptionalText = (value?: string | null) => value || undefined
const trimToUndefined = (value?: string | null) => value?.trim() ? value.trim() : undefined
const hasCredentialInput = (values: ShopFormValues) =>
  Boolean(
    trimToUndefined(values.appKey) ||
      trimToUndefined(values.appSecret) ||
      trimToUndefined(values.accessToken) ||
      trimToUndefined(values.refreshToken) ||
      trimToUndefined(values.extraPayload),
  )

const getAvatarText = (value?: string | null) => {
  const source = (value || '销').trim()
  return source.slice(0, 1).toUpperCase()
}

const ProductThumb = ({ src, name, size = 56 }: { src?: string | null; name?: string | null; size?: number }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>()

  useEffect(() => {
    if (!src || typeof window === 'undefined') {
      setResolvedSrc(undefined)
      return
    }
    let active = true
    const image = new window.Image()
    image.onload = () => {
      if (active) {
        setResolvedSrc(src)
      }
    }
    image.onerror = () => {
      if (active) {
        setResolvedSrc(undefined)
      }
    }
    image.src = src
    return () => {
      active = false
    }
  }, [src])

  if (resolvedSrc) {
    return <img className="scw-thumb" src={resolvedSrc} alt={name || '商品图'} style={{ width: size, height: size }} />
  }
  return (
    <div className="scw-thumb scw-thumb--placeholder" style={{ width: size, height: size }}>
      {getAvatarText(name)}
    </div>
  )
}

const StatusChip = ({ label, tone = 'default' }: { label: ReactNode; tone?: 'danger' | 'warning' | 'success' | 'info' | 'default' }) => (
  <Tag color={toneColorMap[tone]} className="scw-chip">
    {label}
  </Tag>
)

const SectionHeading = ({ title, description, extra }: { title: string; description?: string; extra?: ReactNode }) => (
  <div className="scw-section-heading">
    <div>
      <Title level={4}>{title}</Title>
      {description ? <Text type="secondary">{description}</Text> : null}
    </div>
    {extra ? <div>{extra}</div> : null}
  </div>
)

const SaleCenterWorkspace = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const activeSection = pathSectionMap[location.pathname] || 'workbench'
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string>()
  const [accounts, setAccounts] = useState<SaleChannelAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>()
  const [orders, setOrders] = useState<SaleOrderItem[]>([])
  const [orderDetails, setOrderDetails] = useState<Record<string, SaleOrderDetail>>({})
  const [mappings, setMappings] = useState<ProductMappingRecord[]>([])
  const [drafts, setDrafts] = useState<ProductMappingDraftRecord[]>([])
  const [inventories, setInventories] = useState<SaleInventoryItem[]>([])
  const [syncStatus, setSyncStatus] = useState<SaleProductSyncStatus | null>(null)
  const [syncLogs, setSyncLogs] = useState<SaleSyncLogItem[]>([])
  const [retryCandidates, setRetryCandidates] = useState<SaleRetryCandidateItem[]>([])
  const [idempotencyRecords, setIdempotencyRecords] = useState<SaleIdempotencyRecordItem[]>([])
  const [bindingDrawerId, setBindingDrawerId] = useState<string>()
  const [productSyncMode, setProductSyncMode] = useState<'FULL' | 'UNMAPPED_ONLY'>('FULL')
  const [bindingStatusFilter, setBindingStatusFilter] = useState('ALL')
  const [bindingDraftStatusFilter, setBindingDraftStatusFilter] = useState('ALL')
  const [bindingKeyword, setBindingKeyword] = useState('')
  const [bindingPage, setBindingPage] = useState(1)
  const [bindingPageSize, setBindingPageSize] = useState(10)
  const [styleSearchLoading, setStyleSearchLoading] = useState(false)
  const [styleDetailLoading, setStyleDetailLoading] = useState(false)
  const [bindingSaving, setBindingSaving] = useState(false)
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([])
  const [selectedStyleDetail, setSelectedStyleDetail] = useState<StyleDetailData | null>(null)
  const [selectedStyleId, setSelectedStyleId] = useState<string>()
  const [selectedVariantId, setSelectedVariantId] = useState<string>()
  const [orderDrawerId, setOrderDrawerId] = useState<string>()
  const [issueStatusFilter, setIssueStatusFilter] = useState('ALL')
  const [issueCodeFilter, setIssueCodeFilter] = useState('ALL')
  const [issueKeyword, setIssueKeyword] = useState('')
  const [issuePage, setIssuePage] = useState(1)
  const [issuePageSize, setIssuePageSize] = useState(8)
  const [governanceDrawerId, setGovernanceDrawerId] = useState<string>()
  const [shopDrawerOpen, setShopDrawerOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<SaleChannelAccount | null>(null)
  const [credentialLoading, setCredentialLoading] = useState(false)
  const [credentialSubmitting, setCredentialSubmitting] = useState(false)
  const [credentialDetail, setCredentialDetail] = useState<SaleChannelCredential | null>(null)
  const [shopForm] = Form.useForm<ShopFormValues>()
  const [orderForm] = Form.useForm<{ processingStatus?: string; processingOwner?: string; processingNote?: string }>()
  const styleSearchRequestRef = useRef(0)

  useEffect(() => {
    document.body.classList.add('scw-body')
    document.documentElement.classList.add('scw-html')
    const root = document.getElementById('root')
    root?.classList.add('scw-root')
    return () => {
      document.body.classList.remove('scw-body')
      document.documentElement.classList.remove('scw-html')
      root?.classList.remove('scw-root')
    }
  }, [])

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts])
  const selectedBindings = useMemo(
    () => mappings.filter((item) => !selectedAccountId || item.channelAccountId === selectedAccountId),
    [mappings, selectedAccountId],
  )
  const selectedOrders = useMemo(() => orders, [orders])
  const currentMapping = useMemo(
    () => selectedBindings.find((item) => item.id === bindingDrawerId),
    [bindingDrawerId, selectedBindings],
  )
  const currentOrder = useMemo(
    () => selectedOrders.find((item) => item.id === orderDrawerId),
    [orderDrawerId, selectedOrders],
  )
  const currentLog = useMemo(
    () => syncLogs.find((item) => item.id === governanceDrawerId),
    [governanceDrawerId, syncLogs],
  )
  const productSectionActive = isProductSection(activeSection)

  const loadWorkspaceData = useCallback(async () => {
    setRefreshing(true)
    setWorkspaceError(undefined)
    try {
      const channelAccounts = await saleApi.listChannelAccounts()
      const selectedAccountStillExists = selectedAccountId
        ? channelAccounts.some((account) => account.id === selectedAccountId)
        : false
      const effectiveSelectedAccountId =
        productSectionActive && selectedAccountStillExists ? selectedAccountId : undefined
      const preferredAccountId = effectiveSelectedAccountId || channelAccounts[0]?.id || ''
      const [
        orderList,
        mappingList,
        logList,
        retryList,
        idempotencyList,
        syncState,
        draftList,
      ] = await Promise.all([
        saleApi.listOrders(),
        saleApi.listProductMappings(),
        saleApi.listSyncLogs(),
        saleApi.listRetryCandidates(),
        saleApi.listIdempotencyRecords(),
        productSectionActive && preferredAccountId
          ? saleApi.getProductSyncStatus(preferredAccountId).catch(() => null)
          : Promise.resolve(null),
        productSectionActive && preferredAccountId
          ? saleApi.listProductMappingDrafts(preferredAccountId).catch(() => [])
          : Promise.resolve([]),
      ])

      const readableInventoryAccountIds = new Set(getInventoryReadableAccountIds(channelAccounts, logList))
      const shouldLoadInventories = activeSection === 'workbench' || activeSection === 'risk-overview'
      const inventoryAccountId = readableInventoryAccountIds.has(preferredAccountId)
        ? preferredAccountId
        : pickPreferredInventoryAccountId(channelAccounts, logList)
      const inventoryList = shouldLoadInventories && inventoryAccountId
        ? await saleApi.listInventories(inventoryAccountId).catch(() => [])
        : []

      setAccounts(channelAccounts)
      if (productSectionActive && !effectiveSelectedAccountId && preferredAccountId) {
        setSelectedAccountId(preferredAccountId)
      } else if (selectedAccountId && !selectedAccountStillExists) {
        setSelectedAccountId(undefined)
      }
      setOrders(orderList)
      setMappings(mappingList)
      setSyncLogs(logList)
      setRetryCandidates(retryList)
      setIdempotencyRecords(idempotencyList)
      setSyncStatus(syncState)
      setDrafts(draftList)
      setInventories(inventoryList)
    } catch (error) {
      console.error(error)
      setWorkspaceError('销售中心数据加载失败，请刷新重试。')
      message.error('销售中心数据加载失败，请稍后重试。')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [message, productSectionActive, selectedAccountId])

  useEffect(() => {
    void loadWorkspaceData()
  }, [loadWorkspaceData])

  const handleAccountChange = useCallback((value?: string) => {
    setSelectedAccountId(value)
  }, [])

  useEffect(() => {
    if (!currentOrder) {
      return
    }
    orderForm.setFieldsValue({
      processingStatus: currentOrder.processingStatus || deriveOrderIssue(currentOrder)?.code,
      processingOwner: currentOrder.processingOwner || '',
      processingNote: currentOrder.processingNote || '',
    })
    if (!orderDetails[currentOrder.id]) {
      void saleApi.getOrderDetail(currentOrder.id).then((detail) => {
        setOrderDetails((previous) => ({ ...previous, [currentOrder.id]: detail }))
      }).catch((error) => {
        console.error(error)
      })
    }
  }, [currentOrder, orderDetails, orderForm])

  useEffect(() => {
    setBindingPage(1)
  }, [bindingDraftStatusFilter, bindingKeyword, bindingStatusFilter, selectedAccountId])

  useEffect(() => {
    setIssuePage(1)
  }, [issueCodeFilter, issueKeyword, issueStatusFilter, selectedAccountId])

  const workbenchMetrics = useMemo(() => {
    const pendingBindings = mappings.filter((item) => !isMappedStatus(item.mappingStatus)).length
    const issueOrders = orders.filter((item) => deriveOrderIssue(item)).length
    const highRiskSkus = inventories.filter((item) => getInventoryRiskLevel(item) !== 'default').length
    const blockedTasks = syncLogs.filter((item) => !item.success).length
    return {
      pendingBindings,
      issueOrders,
      highRiskSkus,
      blockedTasks,
      deviationRate: issueOrders ? Number(((issueOrders / Math.max(orders.length, 1)) * 100).toFixed(2)) : 0,
    }
  }, [inventories, mappings, orders, syncLogs])

  const shopRiskRows = useMemo(() => {
    return accounts
      .map((account) => {
        const accountOrders = orders.filter((order) => order.channelAccountId === account.id)
        const accountMappings = mappings.filter((item) => item.channelAccountId === account.id)
        const unmappedCount = accountMappings.filter((item) => !isMappedStatus(item.mappingStatus)).length
        const issueCount = accountOrders.filter((order) => deriveOrderIssue(order)).length
        const failedSyncCount = syncLogs.filter((item) => item.channelAccountId === account.id && !item.success).length
        const topRiskType = unmappedCount > issueCount ? '商品未绑定' : issueCount ? '问题订单' : failedSyncCount ? '同步异常' : '正常'
        const riskScore = unmappedCount * 3 + issueCount * 2 + failedSyncCount
        return {
          account,
          topRiskType,
          pendingCount: unmappedCount + issueCount + failedSyncCount,
          impactedOrders: issueCount,
          impactedSkus: unmappedCount,
          failedSyncCount,
          riskScore,
          ownerStatus: failedSyncCount ? '待排障' : issueCount ? '需跟进' : '在线',
          nextRoute: failedSyncCount ? sectionPathMap['governance-sync'] : unmappedCount ? sectionPathMap['product-bindings'] : sectionPathMap['order-issues'],
        }
      })
      .filter((row) => row.pendingCount > 0)
      .sort((left, right) => right.riskScore - left.riskScore)
      .slice(0, 5)
  }, [accounts, mappings, orders, syncLogs])

  const workbenchTasks = useMemo(() => ([
    {
      title: '待绑定商品',
      value: workbenchMetrics.pendingBindings,
      desc: '优先处理未绑定和冲突商品',
      path: sectionPathMap['product-bindings'],
    },
    {
      title: '问题订单',
      value: workbenchMetrics.issueOrders,
      desc: '重点跟进影响履约和发货的订单',
      path: sectionPathMap['order-issues'],
    },
    {
      title: '高风险 SKU',
      value: workbenchMetrics.highRiskSkus,
      desc: '处理缺口风险和可售天数过低商品',
      path: sectionPathMap['risk-overview'],
    },
    {
      title: '同步阻塞任务',
      value: workbenchMetrics.blockedTasks,
      desc: '优先处理不可重试或持续失败任务',
      path: sectionPathMap['governance-sync'],
    },
  ]), [workbenchMetrics])

  const bindingSummary = useMemo(() => ({
    total: selectedBindings.length,
    active: selectedBindings.filter((item) => isMappedStatus(item.mappingStatus)).length,
    unmapped: selectedBindings.filter((item) => !isMappedStatus(item.mappingStatus)).length,
    conflict: selectedBindings.filter((item) => (item.mappingStatus || '').toUpperCase().includes('CONFLICT')).length,
    draftCount: drafts.length,
  }), [drafts.length, selectedBindings])

  const issueOrders = useMemo(() => {
    return selectedOrders
      .map((item) => ({
        order: item,
        issue: deriveOrderIssue(item),
      }))
      .filter((item) => item.issue)
      .sort((left, right) => {
        const toneScore = { danger: 3, warning: 2, success: 1 }[left.issue!.tone] - { danger: 3, warning: 2, success: 1 }[right.issue!.tone]
        return toneScore === 0
          ? (right.order.updatedAt || '').localeCompare(left.order.updatedAt || '')
          : -toneScore
      })
  }, [selectedOrders])

  const filteredBindings = useMemo(() => {
    const keyword = bindingKeyword.trim().toLowerCase()
    return selectedBindings
      .filter((item) => {
        if (bindingStatusFilter === 'ACTIVE' && !isMappedStatus(item.mappingStatus)) {
          return false
        }
        if (bindingStatusFilter === 'UNMAPPED' && isMappedStatus(item.mappingStatus)) {
          return false
        }
        if (bindingStatusFilter === 'CONFLICT' && !(item.mappingStatus || '').toUpperCase().includes('CONFLICT')) {
          return false
        }
        const relatedDrafts = drafts.filter((draft) => draft.productMappingId === item.id)
        if (bindingDraftStatusFilter !== 'ALL' && !relatedDrafts.some((draft) => (draft.draftStatus || 'DRAFT') === bindingDraftStatusFilter)) {
          return false
        }
        if (!keyword) {
          return true
        }
        const values = [
          item.platformProductName,
          item.platformSkuCode,
          item.platformSkuId,
          item.styleNo,
          item.styleName,
          item.normalizedColor,
          item.normalizedSize,
        ]
        return values.some((value) => (value || '').toLowerCase().includes(keyword))
      })
      .sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''))
  }, [bindingDraftStatusFilter, bindingKeyword, bindingStatusFilter, drafts, selectedBindings])

  const pagedBindings = useMemo(() => {
    const start = (bindingPage - 1) * bindingPageSize
    return filteredBindings.slice(start, start + bindingPageSize)
  }, [bindingPage, bindingPageSize, filteredBindings])

  const filteredIssueOrders = useMemo(() => {
    const keyword = issueKeyword.trim().toLowerCase()
    return issueOrders
      .filter(({ order, issue }) => {
        if (issueStatusFilter !== 'ALL' && (order.processingStatus || issue?.code) !== issueStatusFilter) {
          return false
        }
        if (issueCodeFilter !== 'ALL' && issue?.code !== issueCodeFilter) {
          return false
        }
        if (!keyword) {
          return true
        }
        const lineTexts = (order.linePreview || []).flatMap((line) => [line.goodsName, line.platformSkuCode, line.platformSkuId])
        const values = [order.platformOrderNo, order.receiverName, ...lineTexts]
        return values.some((value) => (value || '').toLowerCase().includes(keyword))
      })
  }, [issueCodeFilter, issueKeyword, issueOrders, issueStatusFilter])

  const pagedIssueOrders = useMemo(() => {
    const start = (issuePage - 1) * issuePageSize
    return filteredIssueOrders.slice(start, start + issuePageSize)
  }, [filteredIssueOrders, issuePage, issuePageSize])

  const variantOptions = useMemo(() => {
    return (selectedStyleDetail?.variants || []).map((variant) => ({
      label: [variant.color || '无颜色', variant.size || '无尺码'].join(' / '),
      value: variant.id,
    }))
  }, [selectedStyleDetail])

  const riskTopShops = useMemo(() => shopRiskRows.slice(0, 5), [shopRiskRows])

  const riskTopSkus = useMemo(() => {
    return inventories
      .filter((item) => getInventoryRiskLevel(item) !== 'default')
      .sort((left, right) => (right.lackQuantity || 0) - (left.lackQuantity || 0))
      .slice(0, 5)
  }, [inventories])

  const riskReasonRows = useMemo(() => {
    const lowCoverageCount = inventories.filter((item) => (item.availableSaleDays ?? 999) <= 7).length
    const shortageCount = inventories.filter((item) => (item.lackQuantity || 0) > 0).length
    const pendingConfirmCount = issueOrders.filter((item) => item.issue?.code === 'PENDING_CONFIRM').length
    return [
      {
        reason: '未绑定商品',
        count: workbenchMetrics.pendingBindings,
        detail: `待绑定商品 ${formatNumber(workbenchMetrics.pendingBindings)} 个`,
        tone: 'danger' as const,
        route: sectionPathMap['product-bindings'],
      },
      {
        reason: '可售天数过低',
        count: lowCoverageCount,
        detail: `可售天数低于 7 天商品 ${formatNumber(lowCoverageCount)} 个`,
        tone: 'warning' as const,
        route: sectionPathMap['risk-overview'],
      },
      {
        reason: '库存缺口',
        count: shortageCount,
        detail: `存在缺口商品 ${formatNumber(shortageCount)} 个`,
        tone: 'warning' as const,
        route: sectionPathMap['risk-overview'],
      },
      {
        reason: '订单待人工确认',
        count: pendingConfirmCount,
        detail: `待人工确认订单 ${formatNumber(pendingConfirmCount)} 单`,
        tone: 'default' as const,
        route: sectionPathMap['order-issues'],
      },
    ].sort((left, right) => Number(right.count || 0) - Number(left.count || 0))
  }, [inventories, issueOrders, workbenchMetrics.pendingBindings])

  const loadStyleOptions = useCallback(async (keyword?: string, preferredStyleId?: string) => {
    const requestId = styleSearchRequestRef.current + 1
    styleSearchRequestRef.current = requestId
    setStyleSearchLoading(true)
    try {
      const result = await stylesApi.list({
        page: 0,
        pageSize: 20,
        keyword: keyword?.trim() || undefined,
      })
      if (styleSearchRequestRef.current !== requestId) {
        return
      }
      let options: StyleOption[] = result.list.map((style) => ({
        label: `${style.styleNo} / ${style.styleName}`,
        value: style.id,
        style,
      }))
      if (preferredStyleId && !options.some((item) => item.value === preferredStyleId)) {
        try {
          const detail = await styleDetailApi.fetchDetail(preferredStyleId)
          options = [
            {
              label: `${detail.styleNo} / ${detail.styleName}`,
              value: preferredStyleId,
              style: {
                id: preferredStyleId,
                styleNo: detail.styleNo,
                styleName: detail.styleName,
                image: detail.coverImageUrl,
                colors: detail.colors,
                sizes: detail.sizes,
                status: detail.status,
              },
            },
            ...options,
          ]
        } catch (error) {
          console.error(error)
        }
      }
      setStyleOptions(options)
    } catch (error) {
      console.error(error)
      message.error('搜索本地款式失败，请稍后重试。')
    } finally {
      if (styleSearchRequestRef.current === requestId) {
        setStyleSearchLoading(false)
      }
    }
  }, [])

  const loadStyleDetail = useCallback(async (styleId: string, preferredVariantId?: string) => {
    setStyleDetailLoading(true)
    try {
      const detail = await styleDetailApi.fetchDetail(styleId)
      setSelectedStyleDetail(detail)
      setSelectedStyleId(styleId)
      const resolvedVariantId =
        preferredVariantId && detail.variants?.some((variant) => variant.id === preferredVariantId)
          ? preferredVariantId
          : detail.variants?.find(
              (variant) =>
                variant.color === currentMapping?.normalizedColor &&
                variant.size === currentMapping?.normalizedSize,
            )?.id || detail.variants?.[0]?.id
      setSelectedVariantId(resolvedVariantId)
    } catch (error) {
      console.error(error)
      message.error('加载款式规格失败，请稍后重试。')
    } finally {
      setStyleDetailLoading(false)
    }
  }, [currentMapping?.normalizedColor, currentMapping?.normalizedSize])

  useEffect(() => {
    if (!currentMapping) {
      setSelectedStyleDetail(null)
      setSelectedStyleId(undefined)
      setSelectedVariantId(undefined)
      setStyleOptions([])
      return
    }
    const preferredStyleId = currentMapping.styleId ? String(currentMapping.styleId) : undefined
    const preferredVariantId = currentMapping.styleVariantId ? String(currentMapping.styleVariantId) : undefined
    void loadStyleOptions(undefined, preferredStyleId)
    if (preferredStyleId) {
      void loadStyleDetail(preferredStyleId, preferredVariantId)
      return
    }
    setSelectedStyleDetail(null)
    setSelectedStyleId(undefined)
    setSelectedVariantId(undefined)
  }, [currentMapping, loadStyleDetail, loadStyleOptions])

  const handleSectionNavigate = useCallback((section: SectionKey) => {
    navigate(sectionPathMap[section])
  }, [navigate])

  const handleRefresh = useCallback(() => {
    void loadWorkspaceData()
  }, [loadWorkspaceData])

  const handleStartSync = useCallback(async () => {
    if (!selectedAccountId) {
      message.warning('请先选择店铺。')
      return
    }
    try {
      await saleApi.syncProducts({
        channelAccountId: Number(selectedAccountId),
        page: 1,
        pageSize: 100,
        upsertOnlyUnmapped: productSyncMode === 'UNMAPPED_ONLY',
      })
      message.success(productSyncMode === 'UNMAPPED_ONLY' ? '仅补未绑定商品同步任务已提交。' : '全量商品同步任务已提交。')
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      message.error('提交商品同步失败。')
    }
  }, [loadWorkspaceData, message, productSyncMode, selectedAccountId])

  const handleCancelSync = useCallback(async () => {
    if (!syncStatus?.currentTask?.taskId) {
      return
    }
    try {
      await saleApi.cancelProductSync(syncStatus.currentTask.taskId)
      message.success('已提交取消任务请求。')
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      message.error('取消商品同步失败。')
    }
  }, [loadWorkspaceData, message, selectedAccountId, syncStatus?.currentTask?.taskId])

  const handleGenerateDrafts = useCallback(async () => {
    if (!selectedAccountId) {
      message.warning('请先选择店铺。')
      return
    }
    try {
      await saleApi.generateProductMappingDrafts({ channelAccountId: Number(selectedAccountId) })
      message.success('草稿候选已重新生成。')
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      message.error('生成草稿失败。')
    }
  }, [loadWorkspaceData, message, selectedAccountId])

  const handleApproveDraft = useCallback(async (draftId: string) => {
    try {
      await saleApi.approveProductMappingDraft(draftId)
      message.success('草稿已确认。')
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      message.error('确认草稿失败。')
    }
  }, [loadWorkspaceData, message, selectedAccountId])

  const handleRejectDraft = useCallback(async (draftId: string) => {
    try {
      await saleApi.rejectProductMappingDraft(draftId)
      message.success('草稿已驳回。')
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      message.error('驳回草稿失败。')
    }
  }, [loadWorkspaceData, message, selectedAccountId])

  const handleBindingStyleSearch = useCallback(async (keyword: string) => {
    await loadStyleOptions(keyword, selectedStyleId)
  }, [loadStyleOptions, selectedStyleId])

  const handleBindingStyleChange = useCallback(async (styleId: string) => {
    await loadStyleDetail(styleId)
  }, [loadStyleDetail])

  const handleSaveManualBinding = useCallback(async () => {
    if (!currentMapping) {
      return
    }
    if (!selectedStyleId || !selectedVariantId) {
      message.warning('请先选择本地款式和规格。')
      return
    }
    setBindingSaving(true)
    try {
      await saleApi.updateProductMapping(currentMapping.id, {
        styleId: Number(selectedStyleId),
        styleVariantId: Number(selectedVariantId),
        mappingStatus: 'ACTIVE',
      })
      message.success('商品绑定已保存。')
      setBindingDrawerId(undefined)
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      message.error('提交商品绑定失败。')
    } finally {
      setBindingSaving(false)
    }
  }, [currentMapping, loadWorkspaceData, message, selectedAccountId, selectedStyleId, selectedVariantId])

  const handleSaveOrderProcessing = useCallback(async () => {
    if (!currentOrder) {
      return
    }
    try {
      const values = await orderForm.validateFields()
      await saleApi.updateOrderProcessing(currentOrder.id, {
        processingStatus: values.processingStatus,
        processingOwner: values.processingOwner,
        processingNote: values.processingNote,
        exceptionFlags: currentOrder.exceptionFlags || undefined,
      })
      message.success('订单处理状态已更新。')
      setOrderDrawerId(undefined)
      void loadWorkspaceData()
    } catch (error) {
      if (error instanceof Error) {
        console.error(error)
      }
    }
  }, [currentOrder, loadWorkspaceData, message, orderForm, selectedAccountId])

  const openCreateShop = useCallback(() => {
    setEditingShop(null)
    setCredentialDetail(null)
    shopForm.resetFields()
    shopForm.setFieldsValue({
      platformCode: 'TEMU',
      status: 'ACTIVE',
      authorizationType: 'TOKEN',
      sellerType: 'FULLY_MANAGED',
      credentialStatus: 'ACTIVE',
    } as never)
    setShopDrawerOpen(true)
  }, [shopForm])

  const openEditShop = useCallback((account: SaleChannelAccount) => {
    setEditingShop(account)
    setCredentialDetail(null)
    shopForm.resetFields()
    shopForm.setFieldsValue({
      ...account,
      credentialStatus: 'ACTIVE',
    } as never)
    setShopDrawerOpen(true)
    setCredentialLoading(true)
    void saleApi.getChannelCredentialDetail(account.id)
      .then((detail) => {
        setCredentialDetail(detail)
        shopForm.setFieldValue('credentialStatus', detail.status ?? 'ACTIVE')
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setCredentialLoading(false)
      })
  }, [shopForm])

  const handleSaveShop = useCallback(async () => {
    try {
      const values = await shopForm.validateFields()
      const credentialInputProvided = hasCredentialInput(values)
      const appKey = trimToUndefined(values.appKey)
      const appSecret = trimToUndefined(values.appSecret)
      const accessToken = trimToUndefined(values.accessToken)

      if (!editingShop && (!appKey || !appSecret || !accessToken)) {
        message.warning('新建店铺时必须同时填写 API Key、API Secret、Access Token。')
        return
      }
      if (editingShop && credentialInputProvided && (!appKey || !appSecret || !accessToken)) {
        message.warning('如需更新凭证，请同时填写 API Key、API Secret、Access Token。')
        return
      }

      setCredentialSubmitting(true)
      let savedAccount: SaleChannelAccount
      if (editingShop) {
        savedAccount = await saleApi.updateChannelAccount(editingShop.id, {
          accountName: values.accountName,
          shopId: normalizeOptionalText(values.shopId),
          shopName: normalizeOptionalText(values.shopName),
          regionCode: normalizeOptionalText(values.regionCode),
          gatewayUrl: normalizeOptionalText(values.gatewayUrl),
          sellerType: normalizeOptionalText(values.sellerType),
          authorizationType: normalizeOptionalText(values.authorizationType),
          status: normalizeOptionalText(values.status),
          remarks: normalizeOptionalText(values.remarks),
        })
        message.success('店铺资料已更新。')
      } else {
        savedAccount = await saleApi.createChannelAccount({
          platformCode: values.platformCode || 'TEMU',
          accountName: values.accountName,
          shopId: normalizeOptionalText(values.shopId),
          shopName: normalizeOptionalText(values.shopName),
          regionCode: normalizeOptionalText(values.regionCode),
          gatewayUrl: normalizeOptionalText(values.gatewayUrl),
          sellerType: normalizeOptionalText(values.sellerType),
          authorizationType: normalizeOptionalText(values.authorizationType),
          remarks: normalizeOptionalText(values.remarks),
        })
        message.success('店铺已创建。')
      }

      if (!editingShop || credentialInputProvided) {
        await saleApi.updateChannelCredential(savedAccount.id, {
          appKey: appKey!,
          appSecret: appSecret!,
          accessToken,
          refreshToken: trimToUndefined(values.refreshToken),
          status: values.credentialStatus ?? 'ACTIVE',
          extraPayload: trimToUndefined(values.extraPayload),
        })
      }

      setShopDrawerOpen(false)
      setEditingShop(null)
      setCredentialDetail(null)
      shopForm.resetFields()
      void loadWorkspaceData()
    } catch (error) {
      if (error instanceof Error) {
        console.error(error)
        message.error('保存店铺失败。')
      }
    } finally {
      setCredentialSubmitting(false)
    }
  }, [editingShop, loadWorkspaceData, message, selectedAccountId, shopForm])

  const handleDeleteShop = useCallback(async (account: SaleChannelAccount) => {
    try {
      await saleApi.deleteChannelAccount(account.id)
      message.success('店铺已删除。')
      if (editingShop?.id === account.id) {
        setShopDrawerOpen(false)
        setEditingShop(null)
      }
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      message.error('删除店铺失败。')
    }
  }, [editingShop?.id, loadWorkspaceData, message, selectedAccountId])

  const shopColumns = useMemo<ColumnsType<SaleChannelAccount>>(() => [
    {
      title: '店铺',
      key: 'shop',
      render: (_, record) => (
        <div className="scw-table-shop">
          <Avatar size={40} shape="square" className="scw-table-shop__avatar">
            {getAvatarText(record.accountName)}
          </Avatar>
          <div>
            <div className="scw-table-shop__title">{getShopLabel(record)}</div>
            <div className="scw-table-shop__sub">{record.shopId || '--'}</div>
          </div>
        </div>
      ),
    },
    { title: '类型', dataIndex: 'sellerType', render: (value) => <StatusChip label={getSaleSellerTypeLabel(value)} tone="default" /> },
    { title: '平台', dataIndex: 'platformCode' },
    {
      title: '健康状态',
      dataIndex: 'status',
      render: (value) => {
        const label = value === 'ACTIVE' ? '正常' : value === 'DISABLED' ? '已停用' : value === 'TOKEN_INVALID' ? '待配置凭证' : '部分异常'
        return <StatusChip label={label} tone={value === 'ACTIVE' ? 'success' : value === 'DISABLED' ? 'default' : 'warning'} />
      },
    },
    {
      title: '最近成功同步',
      dataIndex: 'updatedAt',
      render: (value) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditShop(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这个店铺吗？"
            description="删除后将无法恢复，请确认该店铺不再使用。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDeleteShop(record)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleDeleteShop, openEditShop])

  const governanceTableData = useMemo(() => syncLogs.map((item) => ({
    key: item.id,
    ...item,
  })), [syncLogs])

  const governanceColumns = useMemo<ColumnsType<SaleSyncLogItem>>(() => [
    { title: '任务ID', dataIndex: 'taskId', width: 180, render: (value) => value || '--' },
    {
      title: '任务类型',
      dataIndex: 'bizType',
      render: (value) => syncBizTypeLabels[(value || '').toUpperCase()] || value || '--',
    },
    {
      title: '店铺 / 平台',
      key: 'shop',
      render: (_, record) => getShopLabel(record.channelAccountId ? accountMap.get(record.channelAccountId) : undefined),
    },
    {
      title: '状态 / 结果',
      dataIndex: 'success',
      render: (value) => <StatusChip label={value ? '成功' : '失败'} tone={value ? 'success' : 'danger'} />,
    },
    { title: '失败分类', dataIndex: 'errorCode', render: (value) => value || '--' },
    { title: '发生时间', dataIndex: 'occurredAt', render: (value) => formatDateTime(value) },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => setGovernanceDrawerId(record.id)} data-testid="governance-detail-button">
          查看详情
        </Button>
      ),
    },
  ], [accountMap])

  const renderWorkbench = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card className="scw-metric-card">
            <Statistic title="今日经营异常度" value={workbenchMetrics.deviationRate} suffix="%" />
            <Text type="secondary">今天优先处理影响订单结果的异常对象</Text>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card className="scw-metric-card">
            <Statistic title="风险影响订单数" value={workbenchMetrics.issueOrders} />
            <Text type="secondary">受未绑定、缺数据、状态异常影响的订单</Text>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card className="scw-metric-card">
            <Statistic title="风险影响 SKU / 店铺数" value={`${formatNumber(workbenchMetrics.highRiskSkus)} / ${formatNumber(shopRiskRows.length)}`} />
            <Text type="secondary">缺口风险和可售天数过低商品</Text>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card className="scw-metric-card">
            <Statistic title="同步 / 治理阻塞数" value={workbenchMetrics.blockedTasks} />
            <Text type="secondary">需要排障或人工重试的同步任务</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card className="scw-panel-card">
            <SectionHeading title="异常店铺清单" description="优先处理风险影响较大的店铺" />
            <Table
              rowKey={(row) => row.account.id}
              pagination={false}
              dataSource={shopRiskRows}
              columns={[
                { title: '店铺', key: 'shop', render: (_, row) => getShopLabel(row.account) },
                { title: 'Top 风险', dataIndex: 'topRiskType', render: (value) => <StatusChip label={value} tone="warning" /> },
                { title: '待处理数', dataIndex: 'pendingCount' },
                { title: '风险影响', key: 'impact', render: (_, row) => `订单 ${row.impactedOrders} / SKU ${row.impactedSkus}` },
                { title: '最后成功同步', key: 'lastSync', render: (_, row) => formatDateTime(row.account.updatedAt) },
                { title: '负责人状态', dataIndex: 'ownerStatus', render: (value) => <StatusChip label={value} tone={value === '在线' ? 'success' : 'warning'} /> },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, row) => (
                    <Button type="link" onClick={() => navigate(row.nextRoute)}>
                      去处理
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="scw-panel-card">
            <SectionHeading title="任务卡流" description="优先从左到右处理今天最关键的任务。" />
            <div className="scw-task-grid">
              {workbenchTasks.map((task) => (
                <div key={task.title} className="scw-task-card">
                  <div>
                    <Text className="scw-task-card__title">{task.title}</Text>
                    <Title level={2}>{formatNumber(task.value)}</Title>
                    <Paragraph type="secondary" className="scw-task-card__desc">
                      {task.desc}
                    </Paragraph>
                  </div>
                  <Button type="primary" ghost onClick={() => navigate(task.path)}>
                    去处理
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card className="scw-panel-card">
            <SectionHeading title="同步健康摘要" description="用于快速判断今天的数据链路是否稳定。" />
            <div className="scw-health-grid">
              <div className="scw-donut">
                <Progress type="circle" percent={Math.max(1, 100 - workbenchMetrics.blockedTasks)} size={140} strokeColor="#12B76A" />
              </div>
              <div className="scw-health-stats">
                <Statistic title="成功日志数" value={syncLogs.filter((item) => item.success).length} />
                <Statistic title="失败日志数" value={syncLogs.filter((item) => !item.success).length} />
                <Statistic title="可重试任务数" value={retryCandidates.filter((item) => item.retryable).length} />
                <Statistic title="阻塞任务数" value={workbenchMetrics.blockedTasks} />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="scw-panel-card">
            <SectionHeading title="趋势与老化" description="从异常规模和任务老化两个角度判断优先级。" />
            <div className="scw-trend-list">
              {[
                { label: '待绑定商品', value: workbenchMetrics.pendingBindings, tone: 'warning' as const },
                { label: '问题订单', value: workbenchMetrics.issueOrders, tone: 'danger' as const },
                { label: '高风险 SKU', value: workbenchMetrics.highRiskSkus, tone: 'warning' as const },
                { label: '同步阻塞任务', value: workbenchMetrics.blockedTasks, tone: 'danger' as const },
              ].map((item) => (
                <div key={item.label} className="scw-trend-item">
                  <div className="scw-trend-item__row">
                    <Text>{item.label}</Text>
                    <StatusChip label={formatNumber(item.value)} tone={item.tone} />
                  </div>
                  <Progress percent={Math.min(100, item.value || 0)} showInfo={false} strokeColor={item.tone === 'danger' ? '#F04438' : '#F79009'} />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  )

  const renderProductSync = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="商品总数" value={mappings.length} /><Text type="secondary">当前店铺已落本地的商品快照数量</Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="最近同步时间" value={formatDateTime(syncStatus?.latestFinishedTask?.finishedAt)} /><Text type="secondary">最近一次完成同步的时间</Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="当前任务状态" value={syncStatus?.currentTask?.status || '空闲'} /><Text type="secondary">优先判断是否已有任务在执行</Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="异常数" value={syncStatus?.latestFinishedTask?.failedCount || 0} /><Text type="secondary">最近一次完成任务中的失败数量</Text></Card></Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={11}>
          <Card className="scw-panel-card">
            <SectionHeading title="同步操作" description="本页只负责读取平台商品并更新本地快照。" />
            <div className="scw-form-grid">
              <div className="scw-form-row">
                <Text className="scw-field-label">同步范围</Text>
                <Radio.Group
                  value={productSyncMode}
                  onChange={(event) => setProductSyncMode(event.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { label: '全量同步', value: 'FULL' },
                    { label: '仅补未绑定', value: 'UNMAPPED_ONLY' },
                  ]}
                />
                <Text type="secondary">
                  {productSyncMode === 'UNMAPPED_ONLY'
                    ? '只补齐当前未绑定、未落本地的商品快照，适合绑定治理前快速补数。'
                    : '按平台商品列表全量读取并刷新本地快照，适合首次接入或全量校准。'}
                </Text>
              </div>
              <div className="scw-form-row">
                <Text className="scw-field-label">本次同步内容</Text>
                <Space wrap>
                  <StatusChip label="商品标题与属性快照" tone="success" />
                  <StatusChip label="平台图片快照" tone="success" />
                  <StatusChip label="本地映射补齐" tone={productSyncMode === 'UNMAPPED_ONLY' ? 'warning' : 'info'} />
                </Space>
                <Text type="secondary">价格、库存等售卖数据在经营数据和风险页独立同步，不在这里单独勾选。</Text>
              </div>
              <Space>
                <Button type="primary" icon={<ReloadOutlined />} onClick={handleStartSync} data-testid="product-sync-start">
                  开始同步
                </Button>
                <Button onClick={handleCancelSync} disabled={!syncStatus?.currentTask?.taskId} data-testid="product-sync-cancel">
                  取消同步
                </Button>
              </Space>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={13}>
          <Card className="scw-panel-card">
            <SectionHeading title="当前任务" description="任务执行过程中只看最关键的判断字段。" />
            {syncStatus?.currentTask ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div className="scw-current-task__title">
                  <Title level={4}>{syncStatus.currentTask.taskId}</Title>
                  <StatusChip label={syncStatus.currentTask.status || '同步中'} tone="info" />
                </div>
                <Progress percent={Math.min(100, Number((((syncStatus.currentTask.successCount || 0) / Math.max(syncStatus.currentTask.processedCount || 1, 1)) * 100).toFixed(0)))} strokeColor="#FF5A1F" />
                <Row gutter={[16, 12]}>
                  <Col span={12}><Statistic title="开始时间" value={formatDateTime(syncStatus.currentTask.startedAt)} /></Col>
                  <Col span={12}><Statistic title="已处理商品数" value={formatNumber(syncStatus.currentTask.processedCount)} /></Col>
                  <Col span={12}><Statistic title="成功商品数" value={formatNumber(syncStatus.currentTask.successCount)} /></Col>
                  <Col span={12}><Statistic title="异常数" value={formatNumber(syncStatus.currentTask.failedCount)} /></Col>
                </Row>
              </Space>
            ) : (
              <Empty description="当前没有运行中的商品同步任务" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card className="scw-panel-card">
            <SectionHeading title="最近任务历史" description="保留最近同步记录，用于快速判断是否健康。" />
            <Table
              rowKey={(row) => row.id}
              pagination={false}
              dataSource={syncLogs.filter((item) => ['PRODUCT_SYNC', 'PRODUCT', 'PRODUCT_READ'].some((keyword) => (item.bizType || '').toUpperCase().includes(keyword))).slice(0, 8)}
              columns={[
                { title: '任务ID', dataIndex: 'taskId', render: (value) => value || '--' },
                { title: '任务类型', dataIndex: 'bizType', render: (value) => syncBizTypeLabels[(value || '').toUpperCase()] || '商品同步' },
                { title: '发生时间', dataIndex: 'occurredAt', render: (value) => formatDateTime(value) },
                { title: '状态', dataIndex: 'success', render: (value) => <StatusChip label={value ? '成功' : '失败'} tone={value ? 'success' : 'danger'} /> },
                { title: '错误信息', dataIndex: 'errorMessage', render: (value) => value || '--' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="scw-panel-card">
            <SectionHeading title="同步结果摘要" description="同步完成后直接进入后续商品治理。" />
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Progress type="circle" percent={Math.min(100, Number((((syncStatus?.latestFinishedTask?.successCount || 0) / Math.max((syncStatus?.latestFinishedTask?.processedCount || 1), 1)) * 100).toFixed(0)))} strokeColor="#12B76A" size={160} />
              <Statistic title="最近失败数" value={formatNumber(syncStatus?.latestFinishedTask?.failedCount || 0)} />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block onClick={() => handleSectionNavigate('product-bindings')}>
                  去商品绑定
                </Button>
                <Button block onClick={handleGenerateDrafts}>
                  去绑定异常
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )

  const renderProductBindings = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="平台商品总数" value={bindingSummary.total} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="已绑定数" value={bindingSummary.active} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="待绑定数" value={bindingSummary.unmapped} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="冲突数" value={bindingSummary.conflict} /></Card></Col>
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="草稿待处理数" value={bindingSummary.draftCount} /></Card></Col>
      </Row>
      <div className="scw-split-layout">
        <Card className="scw-filter-card">
          <SectionHeading title="筛选条件" />
          <div className="scw-filter-form">
            <Text className="scw-field-label">店铺</Text>
            <Select value={selectedAccountId} options={accounts.map((account) => ({ label: getShopLabel(account), value: account.id }))} onChange={handleAccountChange} />
            <Text className="scw-field-label">绑定状态</Text>
            <Select value={bindingStatusFilter} onChange={setBindingStatusFilter} options={[{ label: '全部', value: 'ALL' }, { label: '已绑定', value: 'ACTIVE' }, { label: '待绑定', value: 'UNMAPPED' }, { label: '冲突', value: 'CONFLICT' }]} />
            <Text className="scw-field-label">草稿状态</Text>
            <Select value={bindingDraftStatusFilter} onChange={setBindingDraftStatusFilter} options={[{ label: '全部', value: 'ALL' }, { label: '待评审', value: 'DRAFT' }, { label: '已确认', value: 'CONFIRMED' }, { label: '已驳回', value: 'REJECTED' }]} />
            <Text className="scw-field-label">关键词</Text>
            <Input allowClear value={bindingKeyword} onChange={(event) => setBindingKeyword(event.target.value)} placeholder="商品名 / 平台 SKU / 本地款号" />
            <Button onClick={() => {
              setBindingKeyword('')
              setBindingStatusFilter('ALL')
              setBindingDraftStatusFilter('ALL')
            }}
            >
              重置筛选
            </Button>
            <Button onClick={handleGenerateDrafts}>重新生成草稿</Button>
          </div>
        </Card>
        <Card className="scw-panel-card scw-flex-fill">
          <SectionHeading title="平台商品" description="优先处理待绑定、高销量和冲突商品。" extra={<Text type="secondary">共 {formatNumber(filteredBindings.length)} 条</Text>} />
          <div className="scw-binding-list" data-testid="binding-list">
            {pagedBindings.map((item) => {
              const relatedDraft = drafts.find((draft) => draft.productMappingId === item.id)
              return (
                <button type="button" key={item.id} className="scw-binding-card" data-testid="binding-card" onClick={() => setBindingDrawerId(item.id)}>
                  <ProductThumb src={item.platformMainImageUrl || item.styleImageUrl} name={item.platformProductName} size={72} />
                  <div className="scw-binding-card__content">
                    <div className="scw-binding-card__top">
                      <div>
                        <Title level={5}>{item.platformProductName || item.styleName || item.platformSkuCode || item.platformSkuId}</Title>
                        <Text type="secondary">平台 SKU：{item.platformSkuCode || item.platformSkuId}</Text>
                      </div>
                      <StatusChip label={isMappedStatus(item.mappingStatus) ? '已绑定' : '待绑定'} tone={isMappedStatus(item.mappingStatus) ? 'success' : 'warning'} />
                    </div>
                    <div className="scw-binding-meta">
                      <span>颜色：{item.normalizedColor || '--'}</span>
                      <span>尺码：{item.normalizedSize || '--'}</span>
                      <span>规格：{item.normalizedSpecSummary || '--'}</span>
                    </div>
                    <div className="scw-binding-candidate">
                      <StatusChip label={relatedDraft ? '候选草稿' : '暂无草稿'} tone={relatedDraft ? 'info' : 'default'} />
                      <Text>{relatedDraft?.candidateStyleName || item.styleName || '尚未匹配到本地款式'}</Text>
                      <Text type="secondary">{relatedDraft?.matchReason || item.remark || '等待人工确认映射关系'}</Text>
                    </div>
                  </div>
                </button>
              )
            })}
            {!pagedBindings.length ? <Empty description="当前筛选条件下没有待展示的商品绑定记录" /> : null}
          </div>
          <div className="scw-pagination-bar">
            <Pagination
              current={bindingPage}
              pageSize={bindingPageSize}
              total={filteredBindings.length}
              showSizeChanger
              onChange={(page, pageSize) => {
                setBindingPage(page)
                setBindingPageSize(pageSize)
              }}
            />
          </div>
        </Card>
      </div>
      <Drawer
        open={Boolean(currentMapping)}
        onClose={() => setBindingDrawerId(undefined)}
        width={440}
        title="商品绑定详情"
        className="scw-drawer"
      >
        {currentMapping ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div className="scw-drawer-product">
              <ProductThumb src={currentMapping.platformMainImageUrl || currentMapping.styleImageUrl} name={currentMapping.platformProductName} size={92} />
              <div>
                <Title level={4}>{currentMapping.platformProductName || '--'}</Title>
                <Paragraph type="secondary">
                  平台 SKU：{currentMapping.platformSkuCode || currentMapping.platformSkuId}
                  <br />
                  店铺：{getShopLabel(currentMapping.channelAccountId ? accountMap.get(currentMapping.channelAccountId) : undefined)}
                </Paragraph>
              </div>
            </div>
            <Card size="small">
              <Title level={5}>平台商品属性</Title>
              <Paragraph>颜色：{currentMapping.normalizedColor || '--'}</Paragraph>
              <Paragraph>尺码：{currentMapping.normalizedSize || '--'}</Paragraph>
              <Paragraph>规格：{currentMapping.normalizedSpecSummary || '--'}</Paragraph>
            </Card>
            <Card size="small">
              <Title level={5}>候选草稿</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                {drafts.filter((draft) => draft.productMappingId === currentMapping.id).slice(0, 3).map((draft) => (
                  <div key={draft.id} className="scw-draft-card">
                    <div>
                      <Text strong>{draft.candidateStyleName || draft.candidateStyleNo || '候选款式'}</Text>
                      <br />
                      <Text type="secondary">{draft.matchReason || '标题相似、属性匹配'}</Text>
                    </div>
                    <Space>
                      <Button size="small" type="primary" onClick={() => void handleApproveDraft(draft.id)}>
                        确认草稿
                      </Button>
                      <Button size="small" onClick={() => void handleRejectDraft(draft.id)}>
                        驳回草稿
                      </Button>
                    </Space>
                  </div>
                ))}
              </Space>
            </Card>
            <Card size="small">
              <Title level={5}>已确认映射</Title>
              <Paragraph>{currentMapping.styleName || '暂无正式映射'}</Paragraph>
              <Paragraph type="secondary">{currentMapping.styleNo || '--'}</Paragraph>
            </Card>
            <Card size="small">
              <Title level={5}>手工绑定</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                  showSearch
                  filterOption={false}
                  placeholder="搜索本地款号或款式名称"
                  value={selectedStyleId}
                  onSearch={(value) => void handleBindingStyleSearch(value)}
                  onChange={(value) => void handleBindingStyleChange(value)}
                  notFoundContent={styleSearchLoading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无款式" />}
                  options={styleOptions}
                  style={{ width: '100%' }}
                />
                <Select
                  placeholder={selectedStyleId ? '请选择本地规格' : '请先选择本地款式'}
                  value={selectedVariantId}
                  onChange={setSelectedVariantId}
                  disabled={!selectedStyleId || styleDetailLoading}
                  notFoundContent={styleDetailLoading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无规格" />}
                  options={variantOptions}
                />
                {selectedStyleDetail ? (
                  <Text type="secondary">
                    已选款式：{selectedStyleDetail.styleNo} / {selectedStyleDetail.styleName}
                  </Text>
                ) : null}
                <Button type="primary" block loading={bindingSaving} onClick={() => void handleSaveManualBinding()} data-testid="binding-submit">
                  提交绑定
                </Button>
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )

  const renderOrderIssues = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="待人工确认" value={issueOrders.filter((item) => item.issue?.code === 'PENDING_CONFIRM').length} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="待补绑定" value={issueOrders.filter((item) => item.issue?.code === 'PENDING_BINDING').length} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="跟进中" value={issueOrders.filter((item) => item.order.processingStatus === 'IN_PROGRESS').length} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="已超时" value={issueOrders.filter((item) => item.order.processingStatus === 'OVERDUE').length} /></Card></Col>
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="已升级" value={issueOrders.filter((item) => item.order.processingStatus === 'ESCALATED').length} /></Card></Col>
      </Row>
      <Card className="scw-panel-card">
        <SectionHeading title="问题订单" description="先识别问题商品，再决定处理动作。" />
        <div className="scw-filter-inline">
          <Select value={issueStatusFilter} onChange={setIssueStatusFilter} style={{ minWidth: 160 }} options={[{ label: '全部处理状态', value: 'ALL' }, ...processingStatusOptions]} />
          <Select value={issueCodeFilter} onChange={setIssueCodeFilter} style={{ minWidth: 160 }} options={[{ label: '全部异常标签', value: 'ALL' }, { label: '商品未绑定', value: 'PENDING_BINDING' }, { label: '缺少收件信息', value: 'PENDING_DATA_FIX' }, { label: '待人工确认', value: 'PENDING_CONFIRM' }]} />
          <Input allowClear value={issueKeyword} onChange={(event) => setIssueKeyword(event.target.value)} placeholder="订单号 / 收件人 / 商品 / SKU" />
          <Button onClick={() => {
            setIssueStatusFilter('ALL')
            setIssueCodeFilter('ALL')
            setIssueKeyword('')
          }}
          >
            重置
          </Button>
        </div>
        <div className="scw-issue-list" data-testid="issue-list">
          {pagedIssueOrders.map(({ order, issue }) => (
            <div key={order.id} className="scw-issue-card">
              <div className="scw-issue-card__header">
                <div>
                  <Text strong>订单号：{order.platformOrderNo}</Text>
                  <Paragraph type="secondary">
                    店铺：{getShopLabel(accountMap.get(order.channelAccountId))}　下单：{formatDateTime(order.platformCreatedAt || order.updatedAt)}　收件人：{order.receiverName || '--'}
                  </Paragraph>
                </div>
                <Space>
                  <StatusChip label={issue?.label || '待处理'} tone={issue?.tone || 'warning'} />
                  <Button type="primary" ghost onClick={() => setOrderDrawerId(order.id)} data-testid="issue-handle-button">
                    去处理
                  </Button>
                </Space>
              </div>
              <div className="scw-issue-products">
                {(order.linePreview || []).slice(0, 3).map((line) => (
                  <div key={line.id} className="scw-issue-product">
                    <ProductThumb src={line.platformMainImageUrl} name={line.goodsName} size={64} />
                    <div className="scw-issue-product__content">
                      <Text strong>{line.goodsName || '--'}</Text>
                      <Text type="secondary">平台 SKU：{line.platformSkuCode || line.platformSkuId || '--'}</Text>
                      <Text type="secondary">颜色 / 尺码：{line.normalizedColor || '--'} / {line.normalizedSize || '--'}　数量：{formatNumber(line.quantity)}</Text>
                      <Space wrap>
                        <StatusChip label={isMappedStatus(line.mappingStatus) ? '已绑定' : '待补绑定'} tone={isMappedStatus(line.mappingStatus) ? 'success' : 'warning'} />
                        <StatusChip label={issue?.recommendedAction || '需要人工处理'} tone={issue?.tone || 'warning'} />
                      </Space>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!pagedIssueOrders.length ? <Empty description="当前筛选条件下没有问题订单" /> : null}
        </div>
        <div className="scw-pagination-bar">
          <Pagination
            current={issuePage}
            pageSize={issuePageSize}
            total={filteredIssueOrders.length}
            showSizeChanger
            onChange={(page, pageSize) => {
              setIssuePage(page)
              setIssuePageSize(pageSize)
            }}
          />
        </div>
      </Card>
      <Drawer open={Boolean(currentOrder)} onClose={() => setOrderDrawerId(undefined)} width={460} title="问题订单处理" className="scw-drawer">
        {currentOrder && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card size="small">
              <Title level={5}>订单摘要</Title>
              <Paragraph>订单号：{currentOrder.platformOrderNo}</Paragraph>
              <Paragraph>店铺：{getShopLabel(accountMap.get(currentOrder.channelAccountId))}</Paragraph>
              <Paragraph>收件人：{currentOrder.receiverName || '--'}</Paragraph>
              <Paragraph>订单金额：{formatMoney(currentOrder.payAmount || currentOrder.orderAmount)}</Paragraph>
            </Card>
            <Card size="small">
              <Title level={5}>异常解释</Title>
              <Alert
                type="warning"
                showIcon
                message={deriveOrderIssue(currentOrder)?.reason || '该订单需要人工处理'}
                description={deriveOrderIssue(currentOrder)?.recommendedAction || '请确认映射关系、收件信息或平台状态。'}
              />
            </Card>
            <Card size="small">
              <Title level={5}>商品信息</Title>
              {(orderDetails[currentOrder.id]?.lines || currentOrder.linePreview || []).slice(0, 3).map((line) => (
                <div key={line.id} className="scw-order-drawer-line">
                  <ProductThumb src={'platformMainImageUrl' in line ? line.platformMainImageUrl : undefined} name={'goodsName' in line ? line.goodsName : undefined} size={56} />
                  <div>
                    <Text strong>{line.goodsName || '--'}</Text>
                    <br />
                    <Text type="secondary">{line.platformSkuCode || line.platformSkuId || '--'}　{line.normalizedColor || '--'} / {line.normalizedSize || '--'}</Text>
                  </div>
                </div>
              ))}
            </Card>
            <Card size="small">
              <Title level={5}>处理动作</Title>
              <Form form={orderForm} layout="vertical">
                <Form.Item label="处理状态" name="processingStatus">
                  <Select options={processingStatusOptions as unknown as { label: string; value: string }[]} />
                </Form.Item>
                <Form.Item label="指派人" name="processingOwner">
                  <Input />
                </Form.Item>
                <Form.Item label="备注历史" name="processingNote">
                  <Input.TextArea rows={4} placeholder="填写处理备注" />
                </Form.Item>
              </Form>
              <Space>
                <Button onClick={() => setOrderDrawerId(undefined)}>无需处理</Button>
                <Button type="primary" onClick={() => void handleSaveOrderProcessing()}>
                  确认处理
                </Button>
                <Button onClick={() => handleSectionNavigate('product-bindings')}>去商品绑定</Button>
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>
    </Space>
  )

  const renderRiskOverview = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="结果偏差率" value={workbenchMetrics.deviationRate} suffix="%" /><Text type="secondary">异常规模持续上升时优先处理结果偏差</Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="风险影响订单数" value={workbenchMetrics.issueOrders} /><Text type="secondary">受高风险 SKU 和异常绑定影响的订单</Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="高风险 SKU 数" value={workbenchMetrics.highRiskSkus} /><Text type="secondary">可售天数不足或库存缺口商品</Text></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="同步 / 治理阻塞数" value={workbenchMetrics.blockedTasks} /><Text type="secondary">当前仍在阻塞业务结果的同步问题</Text></Card></Col>
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card className="scw-panel-card">
            <SectionHeading title="风险影响榜" description="默认按受影响订单数排序。" />
            <Table
              pagination={false}
              rowKey={(row) => row.account.id}
              dataSource={riskTopShops}
              columns={[
                { title: '店铺', key: 'shop', render: (_, row) => getShopLabel(row.account) },
                { title: '风险等级', key: 'risk', render: (_, row) => <StatusChip label={row.topRiskType} tone={row.failedSyncCount ? 'danger' : 'warning'} /> },
                { title: '影响订单数', dataIndex: 'impactedOrders' },
                { title: '结果偏差率', key: 'ratio', render: (_, row) => `${formatNumber(row.riskScore)} 分` },
                { title: '操作', key: 'action', render: (_, row) => <Button type="link" onClick={() => navigate(row.nextRoute)}>去处理</Button> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="scw-panel-card">
            <SectionHeading title="风险原因榜" description="按影响强度排序，帮助运营快速理解原因。" />
            <List
              dataSource={riskReasonRows}
              renderItem={(item, index) => (
                <List.Item actions={[<Button key="action" type="link" onClick={() => navigate(item.route)}>去处理</Button>]}>
                  <List.Item.Meta title={`${index + 1}. ${item.reason}`} description={item.detail} />
                  <StatusChip label={item.reason} tone={item.tone} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={8}>
          <Card className="scw-panel-card">
            <SectionHeading title="未绑定高销量" description="销量高但未完成映射的商品，优先处理。" />
            <List
              dataSource={selectedBindings.filter((item) => !isMappedStatus(item.mappingStatus)).slice(0, 5)}
              renderItem={(item) => (
                <List.Item actions={[<Button type="link" key="go" onClick={() => setBindingDrawerId(item.id)}>去绑定</Button>]}>
                  <List.Item.Meta
                    avatar={<ProductThumb src={item.platformMainImageUrl || item.styleImageUrl} name={item.platformProductName} size={48} />}
                    title={item.platformProductName || item.platformSkuCode || item.platformSkuId}
                    description={`SKU：${item.platformSkuCode || item.platformSkuId}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="scw-panel-card">
            <SectionHeading title="可售天数过低" description="可售天数低于 7 天的风险商品。" />
            <List
              dataSource={riskTopSkus}
              renderItem={(item) => (
                <List.Item actions={[<Button type="link" key="go" onClick={() => handleSectionNavigate('risk-overview')}>补货建议</Button>]}>
                  <List.Item.Meta
                    avatar={<ProductThumb name={item.goodsName} size={48} />}
                    title={item.goodsName || item.platformSkuCode || item.platformSkuId}
                    description={`可售天数：${item.availableSaleDays ?? '--'}　缺口：${formatNumber(item.lackQuantity)}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="scw-panel-card">
            <SectionHeading title="缺口风险" description="优先解决无法覆盖在途的缺口问题。" />
            <List
              dataSource={inventories.filter((item) => (item.lackQuantity || 0) > 0).slice(0, 5)}
              renderItem={(item) => (
                <List.Item actions={[<Button type="link" key="go" onClick={() => handleSectionNavigate('risk-overview')}>补货建议</Button>]}>
                  <List.Item.Meta
                    avatar={<ProductThumb name={item.goodsName} size={48} />}
                    title={item.goodsName || item.platformSkuCode || item.platformSkuId}
                    description={`库存缺口：${formatNumber(item.lackQuantity)}　预计影响订单：${formatNumber(item.lastSevenDaysSaleVolume)}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card className="scw-panel-card">
            <SectionHeading title="趋势分析" description="近一段时间的风险走势，用于判断是否持续恶化。" />
            <div className="scw-trend-chart">
              {[
                { label: '超期偏差率', value: workbenchMetrics.deviationRate },
                { label: '风险影响订单数', value: workbenchMetrics.issueOrders },
                { label: '高风险 SKU 数', value: workbenchMetrics.highRiskSkus },
                { label: '缺口风险金额', value: inventories.reduce((sum, item) => sum + (item.lackQuantity || 0), 0) },
              ].map((item) => (
                <div key={item.label} className="scw-trend-chart__row">
                  <Text>{item.label}</Text>
                  <Progress percent={Math.min(100, Number(item.value) || 0)} showInfo={false} strokeColor="#FF5A1F" />
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="scw-panel-card">
            <SectionHeading title="推荐操作" description="结合风险榜和原因榜，给出当前优先动作。" />
            <List
              dataSource={[
                `处理未绑定高销量商品 ${formatNumber(bindingSummary.unmapped)} 个`,
                `补货可售天数过低商品 ${formatNumber(riskTopSkus.length)} 个`,
                `处理缺口风险商品 ${formatNumber(inventories.filter((item) => (item.lackQuantity || 0) > 0).length)} 个`,
              ]}
              renderItem={(item, index) => (
                <List.Item actions={[<Button type="primary" key="go" onClick={() => index === 0 ? handleSectionNavigate('product-bindings') : handleSectionNavigate('risk-overview')}>去处理</Button>]}>
                  <List.Item.Meta title={`${index + 1}. ${item}`} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )

  const renderShopManagement = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="已启用" value={accounts.filter((item) => item.status === 'ACTIVE').length} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="待接入" value={accounts.filter((item) => !item.shopId).length} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="风险店铺" value={shopRiskRows.length} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="停用" value={accounts.filter((item) => item.status === 'DISABLED').length} /></Card></Col>
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="店铺总数" value={accounts.length} /></Card></Col>
      </Row>
      <Card className="scw-panel-card">
        <SectionHeading title="店铺管理" description="该页面用于店铺名册、接入资料和健康状态管理。" extra={<Button type="primary" onClick={openCreateShop} data-testid="shop-create-button">新建店铺</Button>} />
        <Table rowKey="id" dataSource={accounts} columns={shopColumns} pagination={{ pageSize: 8 }} />
      </Card>
      <Drawer
        open={shopDrawerOpen}
        onClose={() => {
          setShopDrawerOpen(false)
          setEditingShop(null)
          setCredentialDetail(null)
          shopForm.resetFields()
        }}
        width={520}
        title={editingShop ? '编辑店铺' : '新建店铺'}
        className="scw-drawer"
      >
        <Form form={shopForm} layout="vertical">
          <Form.Item name="accountName" label="店铺名称" rules={[{ required: true, message: '请输入店铺名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="shopId" label="店铺编码">
            <Input />
          </Form.Item>
          <Form.Item name="shopName" label="店铺显示名">
            <Input />
          </Form.Item>
          <Form.Item name="sellerType" label="店铺类型">
            <Select options={[{ label: '全托管', value: 'FULLY_MANAGED' }, { label: '半托管', value: 'SEMI_MANAGED' }]} />
          </Form.Item>
          <Form.Item name="platformCode" label="所属平台">
            <Select options={[{ label: 'Temu', value: 'TEMU' }, { label: 'Shopee', value: 'SHOPEE' }, { label: 'TikTok Shop', value: 'TIKTOK' }]} />
          </Form.Item>
          <Form.Item name="regionCode" label="站点 / 区域">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="店铺状态">
            <Select options={[{ label: '启用', value: 'ACTIVE' }, { label: '停用', value: 'DISABLED' }, { label: '待配置凭证', value: 'TOKEN_INVALID' }]} />
          </Form.Item>
          <Form.Item name="remarks" label="负责人 / 备注">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'credential',
                label: '店铺凭证',
                children: (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Alert
                      type="info"
                      showIcon
                      message={
                        editingShop
                          ? '当前会展示脱敏凭证；如需更新，请重新填写 API Key、API Secret、Access Token。留空则保持原凭证不变。'
                          : '新建店铺必须同时录入 API Key、API Secret、Access Token，完成建档与凭证配置。'
                      }
                    />
                    {editingShop ? (
                      <Card size="small" loading={credentialLoading}>
                        <Descriptions column={2} size="small" bordered>
                          <Descriptions.Item label="凭证状态">{credentialDetail?.status ?? '--'}</Descriptions.Item>
                          <Descriptions.Item label="最近校验">{formatDateTime(credentialDetail?.lastValidatedAt) ?? '--'}</Descriptions.Item>
                          <Descriptions.Item label="API Key">{credentialDetail?.appKeyMasked ?? '--'}</Descriptions.Item>
                          <Descriptions.Item label="API Secret">{credentialDetail?.appSecretMasked ?? '--'}</Descriptions.Item>
                          <Descriptions.Item label="Access Token">{credentialDetail?.accessTokenMasked ?? '--'}</Descriptions.Item>
                          <Descriptions.Item label="Refresh Token">{credentialDetail?.refreshTokenMasked ?? '--'}</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    ) : null}
                    <Form.Item label="API Key" name="appKey">
                      <Input placeholder={editingShop ? '留空则保持当前值' : '请输入 API Key'} />
                    </Form.Item>
                    <Form.Item label="API Secret" name="appSecret">
                      <Input.Password placeholder={editingShop ? '留空则保持当前值' : '请输入 API Secret'} />
                    </Form.Item>
                    <Form.Item label="Access Token" name="accessToken">
                      <Input.Password placeholder={editingShop ? '留空则保持当前值' : '请输入 Access Token'} />
                    </Form.Item>
                    <Form.Item label="Refresh Token" name="refreshToken">
                      <Input.Password placeholder="可选" />
                    </Form.Item>
                    <Collapse
                      ghost
                      size="small"
                      items={[
                        {
                          key: 'credential-advanced',
                          label: '凭证扩展配置（可选）',
                          children: (
                            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                              <Form.Item label="凭证状态" name="credentialStatus" style={{ marginBottom: 0 }}>
                                <Select options={[{ label: 'ACTIVE', value: 'ACTIVE' }, { label: 'INACTIVE', value: 'INACTIVE' }]} />
                              </Form.Item>
                              <Form.Item label="extraPayload(JSON)" name="extraPayload" style={{ marginBottom: 0 }}>
                                <Input.TextArea rows={4} placeholder='例如 {"region":"GLOBAL","shopId":"xxxx"}' />
                              </Form.Item>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Form>
        <Space>
          {editingShop ? (
            <Popconfirm
              title="确认删除这个店铺吗？"
              description="删除后将无法恢复，请确认该店铺不再使用。"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => void handleDeleteShop(editingShop)}
            >
              <Button danger>删除店铺</Button>
            </Popconfirm>
          ) : null}
          <Button onClick={() => setShopDrawerOpen(false)} data-testid="shop-drawer-cancel">
            取消
          </Button>
          <Button type="primary" loading={credentialSubmitting} onClick={() => void handleSaveShop()} data-testid="shop-drawer-save">
            保存
          </Button>
        </Space>
      </Drawer>
    </Space>
  )

  const renderGovernance = () => (
    <Card className="scw-panel-card">
      <SectionHeading title="同步任务与日志" description="优先排查商品同步、订单同步、售卖数据同步三类任务。" />
      <Row gutter={[16, 16]} className="scw-governance-metrics">
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="运行中" value={syncLogs.filter((item) => item.success && !item.responsePayloadJson).length} /></Card></Col>
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="今日失败" value={syncLogs.filter((item) => !item.success).length} /></Card></Col>
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="不可重试" value={retryCandidates.filter((item) => !item.retryable).length} /></Card></Col>
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="高优先排障" value={syncLogs.filter((item) => !item.success && item.errorCode).length} /></Card></Col>
      </Row>
      <Tabs
        defaultActiveKey="tasks"
        items={[
          {
            key: 'tasks',
            label: '任务',
            children: <Table rowKey="id" dataSource={governanceTableData} columns={governanceColumns} pagination={{ pageSize: 8 }} />,
          },
          {
            key: 'logs',
            label: '日志',
            children: <Table rowKey="id" dataSource={governanceTableData} columns={governanceColumns} pagination={{ pageSize: 8 }} />,
          },
          {
            key: 'retry',
            label: `重试候选 (${retryCandidates.length})`,
            children: (
              <List
                dataSource={retryCandidates}
                renderItem={(item) => (
                  <List.Item actions={[<Button type="primary" key="retry" data-testid="governance-retry-button">重试任务</Button>]}>
                    <List.Item.Meta
                      title={`${syncBizTypeLabels[(item.bizType || '').toUpperCase()] || item.bizType || '同步任务'} / ${item.requestId || '--'}`}
                      description={`${item.errorCode || '--'} · ${item.errorMessage || '无错误说明'} · ${item.retryable ? '可重试' : '不可重试'}`}
                    />
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'idempotency',
            label: '幂等',
            children: (
              <Table
                rowKey="id"
                dataSource={idempotencyRecords}
                columns={[
                  { title: '幂等键', dataIndex: 'idempotencyKey', render: (value) => value || '--' },
                  { title: '业务类型', dataIndex: 'bizType', render: (value) => syncBizTypeLabels[(value || '').toUpperCase()] || value || '--' },
                  { title: '状态', dataIndex: 'status', render: (value) => <StatusChip label={value || '--'} tone={getStatusTone(value)} /> },
                  { title: '更新时间', dataIndex: 'updatedAt', render: (value) => formatDateTime(value) },
                ]}
                pagination={{ pageSize: 8 }}
              />
            ),
          },
        ]}
      />
      <Drawer open={Boolean(currentLog)} onClose={() => setGovernanceDrawerId(undefined)} width={440} title="任务详情" className="scw-drawer">
        {currentLog && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card size="small">
              <Title level={5}>基础信息</Title>
              <Paragraph>任务 ID：{currentLog.taskId || '--'}</Paragraph>
              <Paragraph>任务类型：{syncBizTypeLabels[(currentLog.bizType || '').toUpperCase()] || currentLog.bizType || '--'}</Paragraph>
              <Paragraph>店铺 / 平台：{getShopLabel(currentLog.channelAccountId ? accountMap.get(currentLog.channelAccountId) : undefined)}</Paragraph>
              <Paragraph>结果：{currentLog.success ? '成功' : '失败'}</Paragraph>
              <Paragraph>traceId：{currentLog.requestId || '--'}</Paragraph>
            </Card>
            <Card size="small">
              <Title level={5}>请求</Title>
              <Paragraph copyable>{currentLog.requestPayloadJson || '--'}</Paragraph>
            </Card>
            <Card size="small">
              <Title level={5}>返回</Title>
              <Paragraph copyable>{currentLog.responsePayloadJson || '--'}</Paragraph>
            </Card>
            <Card size="small">
              <Title level={5}>建议动作</Title>
              <Alert
                type={currentLog.success ? 'success' : 'warning'}
                showIcon
                message={currentLog.success ? '该任务执行成功，无需额外处理。' : `错误码 ${currentLog.errorCode || '--'}：${currentLog.errorMessage || '请进入治理中心排查'}`}
              />
              <Space style={{ marginTop: 16 }}>
                <Button disabled={currentLog.success}>标记已处理</Button>
                <Button type="primary" disabled={currentLog.success}>重试任务</Button>
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>
    </Card>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'workbench':
        return renderWorkbench()
      case 'product-sync':
        return renderProductSync()
      case 'product-bindings':
        return renderProductBindings()
      case 'order-issues':
        return renderOrderIssues()
      case 'risk-overview':
        return renderRiskOverview()
      case 'shop-management':
        return renderShopManagement()
      case 'governance-sync':
        return renderGovernance()
      default:
        return renderWorkbench()
    }
  }

  const openKeys = useMemo(() => {
    if (activeSection.startsWith('product')) return ['product-group']
    if (activeSection.startsWith('order')) return ['order-group']
    if (activeSection.startsWith('risk')) return ['risk-group']
    if (activeSection.startsWith('shop')) return ['shop-group']
    if (activeSection.startsWith('governance')) return ['governance-group']
    return []
  }, [activeSection])

  if (loading) {
    return <Spin size="large" tip="销售中心加载中..." fullscreen />
  }

  return (
    <Layout className="scw-layout">
      <Sider width={228} breakpoint="lg" collapsedWidth={80} className="scw-sider">
        <div className="scw-brand">
          <div className="scw-brand__icon">A</div>
          <div>
            <div className="scw-brand__title">销售中心 V1</div>
            <div className="scw-brand__subtitle">运营工作台</div>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeSection]}
          defaultOpenKeys={openKeys}
          className="scw-menu"
          items={navItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            children: 'children' in item && item.children ? item.children.map((child) => ({ ...child })) : undefined,
          }))}
          onClick={({ key }) => {
            if (key in sectionPathMap) {
              handleSectionNavigate(key as SectionKey)
            }
          }}
        />
      </Sider>
      <Layout className="scw-main">
        <Header className="scw-topbar">
          <div>
            <Title level={2} className="scw-page-title">
              {activeSection === 'workbench'
                ? '今日工作台'
                : activeSection === 'product-sync'
                  ? '商品同步'
                  : activeSection === 'product-bindings'
                    ? '商品绑定'
                    : activeSection === 'order-issues'
                      ? '问题订单'
                      : activeSection === 'risk-overview'
                        ? '经营数据总览'
                        : activeSection === 'shop-management'
                          ? '店铺管理'
                          : '同步任务与日志'}
            </Title>
            <Text type="secondary">
              {activeSection === 'workbench'
                ? '先看结论，再看对象，最后执行动作。'
                : activeSection === 'product-sync'
                  ? '只负责读取平台商品并更新本地快照。'
                  : activeSection === 'product-bindings'
                    ? '将平台 SKU 与本地款式规格准确映射。'
                    : activeSection === 'order-issues'
                      ? '聚焦需要人工处理的异常订单。'
                      : activeSection === 'risk-overview'
                        ? '从风险影响和推荐动作两个角度看经营数据。'
                        : activeSection === 'shop-management'
                          ? '管理销售渠道店铺名册、接入信息与健康状态。'
                          : '排查同步失败、不可重试和幂等冲突。'}
            </Text>
          </div>
          <Space align="center" size={16} className="scw-topbar__actions">
            {productSectionActive ? (
              <Select
                value={selectedAccountId}
                style={{ minWidth: 220 }}
                placeholder="请选择店铺"
                options={accounts.map((account) => ({ label: getShopLabel(account), value: account.id }))}
                onChange={handleAccountChange}
              />
            ) : null}
            <Button icon={<ReloadOutlined />} loading={refreshing} onClick={handleRefresh}>
              刷新
            </Button>
            <AlertOutlined className="scw-topbar__icon" />
            <UserButton afterSignOutUrl="/" />
          </Space>
        </Header>
        <Content className="scw-content">
          {workspaceError ? (
            <Alert
              showIcon
              type="error"
              message="销售中心数据加载失败"
              description={workspaceError}
              style={{ marginBottom: 16 }}
            />
          ) : null}
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
}

export default SaleCenterWorkspace
