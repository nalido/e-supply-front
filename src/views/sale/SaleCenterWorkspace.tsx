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
  InputNumber,
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
  Switch,
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
import MonthlyAreaChart from '../../components/charts/MonthlyAreaChart'
import { saleApi } from '../../api/sale'
import styleDetailApi from '../../api/style-detail'
import stylesApi from '../../api/styles'
import type {
  SaleChannelAccount,
  SaleChannelCredential,
  SaleIdempotencyRecordItem,
  SaleOrderDetail,
  SaleOrderItem,
  SaleRetryCandidateItem,
  SaleSalesOverview,
  SaleSalesProductDetail,
  SaleSalesProductItem,
  SaleSyncLogItem,
  SaleProductSyncStatus,
} from '../../types/sale'
import { getSaleOrderSyncModeLabel, getSaleSellerTypeLabel } from '../../types/sale'
import type { StyleData, StyleDetailData } from '../../types/style'
import { deriveOrderIssue, getShopLabel, isMappedStatus } from './sale-center-helpers'
import './sale-workspace.css'

const { Header, Sider, Content } = Layout
const { Title, Text, Paragraph } = Typography

type SectionKey =
  | 'workbench'
  | 'product-sync'
  | 'product-bindings'
  | 'order-issues'
  | 'sales-data'
  | 'shop-management'
  | 'governance-sync'

type ProductMappingRecord = Awaited<ReturnType<typeof saleApi.listProductMappings>>[number]
type ProductMappingDraftRecord = Awaited<ReturnType<typeof saleApi.listProductMappingDrafts>>[number]
type ShopFormValues = {
  accountName: string
  shopId?: string | null
  shopName?: string | null
  sellerType?: string | null
  orderSyncMode?: string | null
  orderAutoSyncEnabled?: boolean
  orderAutoSyncIntervalMinutes?: number
  orderAutoSyncPageSize?: number
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

type BindingExceptionEntry = {
  mappingId: string
  type: string
  reason: string
  recommendedAction: string
  tone: 'danger' | 'warning' | 'info'
  confidence?: number
  salesVolume: number
  riskScore: number
}

type ShopOverviewRow = {
  account: SaleChannelAccount
  healthStatus: string
  healthLabel: string
  healthTone: 'danger' | 'warning' | 'success' | 'info' | 'default'
  blockerReason: string
  onboardingStep: string
  nextActionLabel: string
  nextActionRoute: SectionKey
  missingProfileFields: string[]
  pendingBindingCount: number
  issueOrderCount: number
  failedSyncCount: number
  lastSuccessfulProductSyncAt?: string | null
  lastSuccessfulOrderSyncAt?: string | null
  lastSuccessfulSalesSyncAt?: string | null
  lastSuccessfulSyncAt?: string | null
  orderAutoSyncEnabled: boolean
  orderAutoSyncIntervalMinutes: number
  orderAutoSyncPageSize: number
  orderAutoSyncNextRunAt?: string | null
  orderAutoSyncLastTriggeredAt?: string | null
  latestOrderSyncLabel: string
  latestOrderSyncTone: 'danger' | 'warning' | 'success' | 'info' | 'default'
  latestOrderSyncMessage: string
}

type GovernanceTaskRow = {
  taskKey: string
  sourceLogId: string
  channelAccountId?: string | null
  bizType?: string | null
  requestId?: string | null
  traceId?: string | null
  status: 'FAILED' | 'RUNNING' | 'SUCCESS'
  statusLabel: string
  tone: 'danger' | 'warning' | 'success' | 'info' | 'default'
  logCount: number
  failedCount: number
  startedAt?: string | null
  latestAt?: string | null
  failureCategory: string
  failureStage: string
  suggestedAction: string
  latestLog: SaleSyncLogItem
}

const shopProfileFieldDefs = [
  { key: 'shopName', label: '店铺显示名' },
] as const

type ShopProfileFieldKey = (typeof shopProfileFieldDefs)[number]['key']

const getMissingShopProfileFields = (account?: Partial<SaleChannelAccount> | null) =>
  shopProfileFieldDefs
    .filter(({ key }) => {
      const value = account?.[key]
      return typeof value === 'string' ? !value.trim() : !value
    })
    .map(({ label }) => label)

const getPrimaryMissingShopProfileField = (account?: Partial<SaleChannelAccount> | null): ShopProfileFieldKey | undefined =>
  shopProfileFieldDefs.find(({ key }) => {
    const value = account?.[key]
    return typeof value === 'string' ? !value.trim() : !value
  })?.key

const buildMissingShopProfileMessage = (fields: string[]) =>
  fields.length ? `当前缺少：${fields.join('、')}。请补齐后再保存。` : '请补齐店铺资料后再继续。'

const sectionPathMap: Record<SectionKey, string> = {
  workbench: '/sale/workbench',
  'product-sync': '/sale/products/sync',
  'product-bindings': '/sale/products/bindings',
  'order-issues': '/sale/orders/issues',
  'sales-data': '/sale/sales-data',
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
  '/sale/insights/risk': 'sales-data',
  '/sale/sales-data': 'sales-data',
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
    children: [{ key: 'sales-data', label: '售卖数据' }],
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

const getSyncBizLabel = (value?: string | null) => {
  const normalized = (value || '').toUpperCase()
  if (syncBizTypeLabels[normalized]) {
    return syncBizTypeLabels[normalized]
  }
  if (normalized.includes('PRODUCT')) return '商品同步'
  if (normalized.includes('ORDER')) return '订单同步'
  if (normalized.includes('INVENTORY') || normalized.includes('SALE')) return '售卖数据同步'
  return value || '--'
}

const salesTrendColorMap: Record<string, string> = {
  总销量: '#FF6A3D',
  已映射销量: '#16B364',
  售出件数: '#FF6A3D',
}

const salesTrendGradientMap: Record<string, string> = {
  总销量: 'l(90) 0:#FFD1BF 0.35:#FF8A5B 1:#FFFFFF',
  已映射销量: 'l(90) 0:#C7F6D5 0.35:#47CD89 1:#FFFFFF',
  售出件数: 'l(90) 0:#FFD1BF 0.35:#FF8A5B 1:#FFFFFF',
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

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--'
  }
  return `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`
}

const formatOrderAutoSyncInterval = (value?: number | null) => {
  if (!value) {
    return '--'
  }
  if (value % 1440 === 0) {
    const days = value / 1440
    return days === 1 ? '每天一次' : `每 ${days} 天一次`
  }
  if (value % 60 === 0) {
    const hours = value / 60
    return hours === 1 ? '每小时一次' : `每 ${hours} 小时一次`
  }
  return `每 ${value} 分钟一次`
}

const parseConfidence = (value?: string | null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const formatConfidence = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return '--'
  }
  return `${Math.round(value * 100)}%`
}

const hasCriticalProductFieldsMissing = (mapping: ProductMappingRecord) =>
  !mapping.platformMainImageUrl || !mapping.normalizedColor || !mapping.normalizedSize

const getFailureInsight = (log?: Pick<SaleSyncLogItem, 'bizType' | 'errorCode' | 'errorMessage' | 'httpStatus' | 'success'>) => {
  const errorCode = (log?.errorCode || '').toUpperCase()
  const errorMessage = (log?.errorMessage || '').toLowerCase()
  const bizLabel = getSyncBizLabel(log?.bizType)
  const httpStatus = log?.httpStatus || 0

  let failureCategory = '业务失败'
  let failureStage = `${bizLabel}执行`
  let suggestedAction = `进入治理中心查看 ${bizLabel} 请求与返回报文。`

  if (errorCode.includes('TOKEN') || errorMessage.includes('token') || httpStatus === 401) {
    failureCategory = '凭证失效'
    failureStage = `${bizLabel}鉴权`
    suggestedAction = '先校验 Access Token 是否过期，再重新检查凭证配置。'
  } else if (errorMessage.includes('access') || errorMessage.includes('authorize') || httpStatus === 403) {
    failureCategory = '能力受限'
    failureStage = `${bizLabel}能力探测`
    suggestedAction = '确认卖家是否重新授权了当前读能力，再重新探测能力矩阵。'
  } else if (errorCode.includes('CONFLICT') || errorMessage.includes('duplicate')) {
    failureCategory = '重复提交'
    failureStage = `${bizLabel}幂等处理`
    suggestedAction = '优先核对同一对象是否已成功同步，避免重复重试。'
  } else if (httpStatus >= 500 || errorMessage.includes('timeout') || errorMessage.includes('network')) {
    failureCategory = '链路异常'
    failureStage = `${bizLabel}平台通信`
    suggestedAction = '优先重试最近失败任务，并观察平台网关是否恢复。'
  } else if (errorCode.includes('PARAM') || errorMessage.includes('invalid') || errorMessage.includes('missing')) {
    failureCategory = '数据异常'
    failureStage = `${bizLabel}参数组装`
    suggestedAction = '先核对入参缺失字段和本地对象映射，再重新发起任务。'
  }

  return {
    failureCategory,
    failureStage,
    suggestedAction,
  }
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
  const [salesDays, setSalesDays] = useState<7 | 30 | 90>(30)
  const [salesKeyword, setSalesKeyword] = useState('')
  const [salesSortBy, setSalesSortBy] = useState<'SALES_VOLUME' | 'GROWTH' | 'SHOP_COVERAGE'>('SALES_VOLUME')
  const [salesOverview, setSalesOverview] = useState<SaleSalesOverview | null>(null)
  const [salesProducts, setSalesProducts] = useState<SaleSalesProductItem[]>([])
  const [salesProductsTotal, setSalesProductsTotal] = useState(0)
  const [salesPage, setSalesPage] = useState(1)
  const [salesPageSize, setSalesPageSize] = useState(10)
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState<string>()
  const [salesDrawerStyleId, setSalesDrawerStyleId] = useState<string>()
  const [salesDetail, setSalesDetail] = useState<SaleSalesProductDetail | null>(null)
  const [salesDetailLoading, setSalesDetailLoading] = useState(false)
  const [salesDetailError, setSalesDetailError] = useState<string>()
  const [governanceDrawerId, setGovernanceDrawerId] = useState<string>()
  const [shopDrawerOpen, setShopDrawerOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<SaleChannelAccount | null>(null)
  const [credentialLoading, setCredentialLoading] = useState(false)
  const [credentialSubmitting, setCredentialSubmitting] = useState(false)
  const [credentialDetail, setCredentialDetail] = useState<SaleChannelCredential | null>(null)
  const [tokenChecking, setTokenChecking] = useState(false)
  const [capabilityChecking, setCapabilityChecking] = useState(false)
  const [orderSyncSubmittingAccountId, setOrderSyncSubmittingAccountId] = useState<string>()
  const [shopActionFeedback, setShopActionFeedback] = useState<{ type: 'success' | 'warning' | 'error' | 'info'; message: string } | null>(null)
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

  useEffect(() => {
    setSalesPage(1)
  }, [salesDays, salesKeyword, salesSortBy])

  const workbenchMetrics = useMemo(() => {
    const pendingBindings = mappings.filter((item) => !isMappedStatus(item.mappingStatus)).length
    const issueOrders = orders.filter((item) => deriveOrderIssue(item)).length
    const highRiskSkus = new Set(
      orders
        .flatMap((item) => item.linePreview || [])
        .filter((line) => !isMappedStatus(line.mappingStatus))
        .map((line) => line.platformSkuId || line.platformSkuCode || line.id),
    ).size
    const blockedTasks = syncLogs.filter((item) => !item.success).length
    return {
      pendingBindings,
      issueOrders,
      highRiskSkus,
      blockedTasks,
      deviationRate: issueOrders ? Number(((issueOrders / Math.max(orders.length, 1)) * 100).toFixed(2)) : 0,
    }
  }, [mappings, orders, syncLogs])

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
      title: '售卖数据关注款',
      value: workbenchMetrics.highRiskSkus,
      desc: '查看高销量、高增长和未映射销量商品',
      path: sectionPathMap['sales-data'],
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

  const salesVolumeBySkuId = useMemo(() => {
    const result = new Map<string, number>()
    orders.forEach((order) => {
      ;(order.linePreview || []).forEach((line) => {
        const skuId = line.platformSkuId || line.platformSkuCode
        if (!skuId) {
          return
        }
        result.set(skuId, (result.get(skuId) || 0) + Number(line.quantity || 0))
      })
    })
    return result
  }, [orders])

  const bindingExceptionQueue = useMemo<BindingExceptionEntry[]>(() => {
    const queue: Array<BindingExceptionEntry | null> = selectedBindings
      .map((item): BindingExceptionEntry | null => {
        const relatedDrafts = drafts.filter((draft) => draft.productMappingId === item.id)
        const bestDraft = [...relatedDrafts].sort((left, right) => (parseConfidence(right.confidence) || 0) - (parseConfidence(left.confidence) || 0))[0]
        const confidence = parseConfidence(bestDraft?.confidence)
        const salesVolume = salesVolumeBySkuId.get(item.platformSkuId) || salesVolumeBySkuId.get(item.platformSkuCode || '') || 0
        const hasConflict = (item.mappingStatus || '').toUpperCase().includes('CONFLICT')
        const unmapped = !isMappedStatus(item.mappingStatus)

        if (hasConflict) {
          return {
            mappingId: item.id,
            type: '冲突绑定',
            reason: '当前平台 SKU 与已有本地规格映射冲突，无法直接确认。',
            recommendedAction: '优先人工核对本地规格归属，再决定保留或改绑。',
            tone: 'danger' as const,
            confidence,
            salesVolume,
            riskScore: 120 + salesVolume,
          }
        }

        if (unmapped && salesVolume > 0) {
          return {
            mappingId: item.id,
            type: '有销量未绑定',
            reason: `当前 SKU 已产生 ${salesVolume} 件销量，但仍未建立本地规格映射。`,
            recommendedAction: '优先完成绑定，避免售卖数据和问题订单继续累计。',
            tone: 'danger' as const,
            confidence,
            salesVolume,
            riskScore: 100 + salesVolume,
          }
        }

        if (confidence !== undefined && confidence < 0.65) {
          return {
            mappingId: item.id,
            type: '低置信度草稿',
            reason: `当前草稿命中置信度仅 ${formatConfidence(confidence)}，不适合直接自动确认。`,
            recommendedAction: '优先核对平台图、颜色尺码和本地候选款，再人工确认。',
            tone: 'warning' as const,
            confidence,
            salesVolume,
            riskScore: 80 + salesVolume,
          }
        }

        if (hasCriticalProductFieldsMissing(item)) {
          return {
            mappingId: item.id,
            type: '关键信息缺失',
            reason: '平台图片或规格字段不完整，当前草稿依据不足。',
            recommendedAction: '先补齐图片或规格快照，再重新生成草稿候选。',
            tone: 'warning' as const,
            confidence,
            salesVolume,
            riskScore: 70 + salesVolume,
          }
        }

        return null
      })
    return queue
      .filter((item): item is BindingExceptionEntry => item !== null)
      .sort((left, right) => right.riskScore - left.riskScore)
  }, [drafts, salesVolumeBySkuId, selectedBindings])

  const bindingExceptionMap = useMemo(
    () => new Map(bindingExceptionQueue.map((item) => [item.mappingId, item])),
    [bindingExceptionQueue],
  )

  const currentBindingException = useMemo(
    () => (currentMapping ? bindingExceptionMap.get(currentMapping.id) : undefined),
    [bindingExceptionMap, currentMapping],
  )

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

  const shopOverviewRows = useMemo<ShopOverviewRow[]>(() => {
    const resolveLastSuccessAt = (accountId: string, keyword: string) => {
      return syncLogs
        .filter((log) => log.channelAccountId === accountId && log.success && (log.bizType || '').toUpperCase().includes(keyword))
        .sort((left, right) => (right.occurredAt || '').localeCompare(left.occurredAt || ''))[0]?.occurredAt
    }

    const resolveLatestOrderLog = (accountId: string) => {
      return syncLogs
        .filter((log) => log.channelAccountId === accountId && (log.bizType || '').toUpperCase().includes('ORDER'))
        .sort((left, right) => (right.occurredAt || '').localeCompare(left.occurredAt || ''))[0]
    }

    return accounts.map((account) => {
      const pendingBindingCount = mappings.filter((item) => item.channelAccountId === account.id && !isMappedStatus(item.mappingStatus)).length
      const issueOrderCount = orders.filter((order) => order.channelAccountId === account.id && deriveOrderIssue(order)).length
      const failedLogs = syncLogs.filter((log) => log.channelAccountId === account.id && !log.success)
      const missingProfileFields = getMissingShopProfileFields(account)
      const lastSuccessfulProductSyncAt = resolveLastSuccessAt(account.id, 'PRODUCT')
      const lastSuccessfulOrderSyncAt = resolveLastSuccessAt(account.id, 'ORDER')
      const lastSuccessfulSalesSyncAt = resolveLastSuccessAt(account.id, 'INVENTORY') || resolveLastSuccessAt(account.id, 'SALE')
      const lastSuccessfulSyncAt = [lastSuccessfulProductSyncAt, lastSuccessfulOrderSyncAt, lastSuccessfulSalesSyncAt]
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => right.localeCompare(left))[0]
      const latestOrderSyncLog = resolveLatestOrderLog(account.id)
      const latestFailure = failedLogs.sort((left, right) => (right.occurredAt || '').localeCompare(left.occurredAt || ''))[0]
      const failureInsight = latestFailure ? getFailureInsight(latestFailure) : null
      const orderAutoSyncEnabled = Boolean(account.orderAutoSyncEnabled)
      const orderAutoSyncIntervalMinutes = account.orderAutoSyncIntervalMinutes || 60
      const orderAutoSyncPageSize = account.orderAutoSyncPageSize || 50
      const latestOrderSyncLabel = latestOrderSyncLog
        ? latestOrderSyncLog.success
          ? '最近执行成功'
          : '最近执行失败'
        : orderAutoSyncEnabled
          ? '等待首次执行'
          : '仅手动同步'
      const latestOrderSyncTone = latestOrderSyncLog
        ? latestOrderSyncLog.success
          ? 'success'
          : 'danger'
        : orderAutoSyncEnabled
          ? 'info'
          : 'default'
      const latestOrderSyncMessage = latestOrderSyncLog
        ? latestOrderSyncLog.success
          ? `${getSyncBizLabel(latestOrderSyncLog.bizType)}已完成，最近执行时间 ${formatDateTime(latestOrderSyncLog.occurredAt)}`
          : latestOrderSyncLog.errorMessage || '最近一次订单同步失败，请进入治理中心排查。'
        : orderAutoSyncEnabled
          ? `系统将按 ${formatOrderAutoSyncInterval(orderAutoSyncIntervalMinutes)} 自动拉取最近订单。`
          : '当前店铺未开启自动拉单，仅支持人工触发。'

      let healthStatus = 'ACTIVE'
      let healthLabel = '正常'
      let healthTone: ShopOverviewRow['healthTone'] = 'success'
      let blockerReason = '商品、订单、售卖数据链路可继续使用。'
      let onboardingStep = '可投入使用'
      let nextActionLabel = '查看售卖数据'
      let nextActionRoute: SectionKey = 'sales-data'

      if (account.status === 'DISABLED') {
        healthStatus = 'DISABLED'
        healthLabel = '已停用'
        healthTone = 'default'
        blockerReason = '当前店铺已停用，不进入销售中心主工作流。'
        onboardingStep = '已停用'
        nextActionLabel = '查看店铺资料'
        nextActionRoute = 'shop-management'
      } else if (missingProfileFields.length) {
        healthStatus = 'ONBOARDING_PENDING'
        healthLabel = '待补店铺资料'
        healthTone = 'warning'
        blockerReason = `缺少${missingProfileFields.join('、')}，补齐后才能完成正式接入。`
        onboardingStep = '已建档'
        nextActionLabel = '补齐店铺资料'
        nextActionRoute = 'shop-management'
      } else if (account.status === 'TOKEN_INVALID') {
        healthStatus = 'TOKEN_INVALID'
        healthLabel = '待配置凭证'
        healthTone = 'danger'
        blockerReason = '当前凭证状态不可用，需要重新配置或校验 Access Token。'
        onboardingStep = '已配置凭证'
        nextActionLabel = '校验凭证'
        nextActionRoute = 'shop-management'
      } else if (failureInsight?.failureCategory === '能力受限') {
        healthStatus = 'CAPABILITY_BLOCKED'
        healthLabel = '能力受限'
        healthTone = 'danger'
        blockerReason = failureInsight.suggestedAction
        onboardingStep = '能力探测通过前'
        nextActionLabel = '去治理中心排障'
        nextActionRoute = 'governance-sync'
      } else if (!lastSuccessfulProductSyncAt || !lastSuccessfulOrderSyncAt) {
        healthStatus = 'SYNC_PENDING'
        healthLabel = '待完成首轮同步'
        healthTone = 'warning'
        blockerReason = '商品或订单首轮同步尚未成功，当前店铺还不能稳定投入使用。'
        onboardingStep = !lastSuccessfulProductSyncAt ? '首次商品同步成功前' : '首次订单同步成功前'
        nextActionLabel = !lastSuccessfulProductSyncAt ? '去商品同步' : '去问题订单'
        nextActionRoute = !lastSuccessfulProductSyncAt ? 'product-sync' : 'order-issues'
      } else if (failedLogs.length || pendingBindingCount || issueOrderCount) {
        healthStatus = 'DEGRADED'
        healthLabel = '部分异常'
        healthTone = failedLogs.length ? 'danger' : 'warning'
        blockerReason = failedLogs.length
          ? `${failureInsight?.failureCategory || '同步失败'}：${failureInsight?.suggestedAction || '请进入治理中心排查。'}`
          : pendingBindingCount
            ? `仍有 ${pendingBindingCount} 个商品待绑定，可能影响售卖数据归属。`
            : `仍有 ${issueOrderCount} 个问题订单待处理。`
        onboardingStep = failedLogs.length ? failureInsight?.failureStage || '同步治理' : '可投入使用'
        nextActionLabel = failedLogs.length ? '去治理中心排障' : pendingBindingCount ? '去商品绑定' : '去问题订单'
        nextActionRoute = failedLogs.length ? 'governance-sync' : pendingBindingCount ? 'product-bindings' : 'order-issues'
      }

      return {
        account,
        healthStatus,
        healthLabel,
        healthTone,
        blockerReason,
        onboardingStep,
        nextActionLabel,
        nextActionRoute,
        missingProfileFields,
        pendingBindingCount,
        issueOrderCount,
        failedSyncCount: failedLogs.length,
        lastSuccessfulProductSyncAt,
        lastSuccessfulOrderSyncAt,
        lastSuccessfulSalesSyncAt,
        lastSuccessfulSyncAt,
        orderAutoSyncEnabled,
        orderAutoSyncIntervalMinutes,
        orderAutoSyncPageSize,
        orderAutoSyncNextRunAt: account.orderAutoSyncNextRunAt,
        orderAutoSyncLastTriggeredAt: account.orderAutoSyncLastTriggeredAt,
        latestOrderSyncLabel,
        latestOrderSyncTone,
        latestOrderSyncMessage,
      }
    })
  }, [accounts, mappings, orders, syncLogs])

  const shopOverviewMap = useMemo(
    () => new Map(shopOverviewRows.map((item) => [item.account.id, item])),
    [shopOverviewRows],
  )

  const shopSummary = useMemo(() => ({
    enabledCount: shopOverviewRows.filter((item) => item.account.status === 'ACTIVE').length,
    onboardingPendingCount: shopOverviewRows.filter((item) => item.healthStatus === 'ONBOARDING_PENDING' || item.healthStatus === 'SYNC_PENDING').length,
    riskyCount: shopOverviewRows.filter((item) => ['TOKEN_INVALID', 'CAPABILITY_BLOCKED', 'DEGRADED'].includes(item.healthStatus)).length,
    disabledCount: shopOverviewRows.filter((item) => item.healthStatus === 'DISABLED').length,
    autoSyncEnabledCount: shopOverviewRows.filter((item) => item.orderAutoSyncEnabled).length,
  }), [shopOverviewRows])

  const currentShopOverview = useMemo(
    () => (editingShop ? shopOverviewMap.get(editingShop.id) : undefined),
    [editingShop, shopOverviewMap],
  )

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

  useEffect(() => {
    if (activeSection !== 'product-bindings') {
      return
    }
    if (currentMapping) {
      return
    }
    if (pagedBindings[0]) {
      setBindingDrawerId(pagedBindings[0].id)
    }
  }, [activeSection, currentMapping, pagedBindings])

  const filteredIssueOrders = useMemo(() => {
    const keyword = issueKeyword.trim().toLowerCase()
    return issueOrders
      .filter(({ order, issue }) => {
        if (selectedAccountId && order.channelAccountId !== selectedAccountId) {
          return false
        }
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
  }, [issueCodeFilter, issueKeyword, issueOrders, issueStatusFilter, selectedAccountId])

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

  const salesMetricMap = useMemo(
    () => new Map((salesOverview?.metrics || []).map((item) => [item.key, item])),
    [salesOverview?.metrics],
  )

  const salesTopGrowthProducts = useMemo(() => salesOverview?.topGrowthProducts || [], [salesOverview?.topGrowthProducts])
  const salesTopUnmappedItems = useMemo(() => salesOverview?.topUnmappedItems || [], [salesOverview?.topUnmappedItems])
  const salesOverviewTrendData = useMemo(
    () =>
      (salesOverview?.trendPoints || []).flatMap((point) => [
        { month: point.date.slice(5), count: point.totalSalesVolume || 0, type: '总销量' },
        { month: point.date.slice(5), count: point.mappedSalesVolume || 0, type: '已映射销量' },
      ]),
    [salesOverview?.trendPoints],
  )
  const salesDetailTrendData = useMemo(
    () =>
      (salesDetail?.trendPoints || []).map((point) => ({
        month: point.date.slice(5),
        count: point.totalSalesVolume || 0,
        type: '售出件数',
      })),
    [salesDetail?.trendPoints],
  )

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

  const loadSalesData = useCallback(async () => {
    setSalesLoading(true)
    setSalesError(undefined)
    try {
      const [overview, productPage] = await Promise.all([
        saleApi.getSalesOverview(salesDays),
        saleApi.listSalesProducts({
          days: salesDays,
          keyword: salesKeyword.trim() || undefined,
          sortBy: salesSortBy,
          page: salesPage,
          pageSize: salesPageSize,
        }),
      ])
      setSalesOverview(overview)
      setSalesProducts(productPage.list)
      setSalesProductsTotal(productPage.total)
    } catch (error) {
      console.error(error)
      setSalesError('售卖数据加载失败，请刷新后重试。')
      message.error('售卖数据加载失败，请稍后重试。')
    } finally {
      setSalesLoading(false)
    }
  }, [message, salesDays, salesKeyword, salesPage, salesPageSize, salesSortBy])

  useEffect(() => {
    if (activeSection !== 'sales-data') {
      return
    }
    void loadSalesData()
  }, [activeSection, loadSalesData])

  const handleRefresh = useCallback(() => {
    if (activeSection === 'sales-data') {
      void loadSalesData()
      return
    }
    void loadWorkspaceData()
  }, [activeSection, loadSalesData, loadWorkspaceData])

  const loadSalesDetail = useCallback(async (styleId: string) => {
    setSalesDetailLoading(true)
    setSalesDetailError(undefined)
    try {
      const detail = await saleApi.getSalesProductDetail(styleId, salesDays)
      setSalesDetail(detail)
    } catch (error) {
      console.error(error)
      setSalesDetail(null)
      setSalesDetailError('工厂产品售卖明细加载失败，请刷新后重试。')
      message.error('加载工厂产品售卖明细失败。')
    } finally {
      setSalesDetailLoading(false)
    }
  }, [message, salesDays])

  useEffect(() => {
    if (!salesDrawerStyleId) {
      setSalesDetail(null)
      setSalesDetailError(undefined)
      return
    }
    void loadSalesDetail(salesDrawerStyleId)
  }, [loadSalesDetail, salesDrawerStyleId])

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
    setShopActionFeedback(null)
    shopForm.resetFields()
    shopForm.setFieldsValue({
      platformCode: 'TEMU',
      status: 'ACTIVE',
      authorizationType: 'TOKEN',
      sellerType: 'FULLY_MANAGED',
      orderSyncMode: 'AUTO',
      orderAutoSyncEnabled: true,
      orderAutoSyncIntervalMinutes: 60,
      orderAutoSyncPageSize: 50,
      credentialStatus: 'ACTIVE',
    } as never)
    setShopDrawerOpen(true)
  }, [shopForm])

  const openEditShop = useCallback((account: SaleChannelAccount, options?: { noticeMessage?: string; focusField?: ShopProfileFieldKey }) => {
    setEditingShop(account)
    setCredentialDetail(null)
    setShopActionFeedback(null)
    shopForm.resetFields()
    shopForm.setFieldsValue({
      ...account,
      orderSyncMode: account.orderSyncMode || 'AUTO',
      orderAutoSyncEnabled: account.orderAutoSyncEnabled ?? false,
      orderAutoSyncIntervalMinutes: account.orderAutoSyncIntervalMinutes || 60,
      orderAutoSyncPageSize: account.orderAutoSyncPageSize || 50,
      credentialStatus: 'ACTIVE',
    } as never)
    setShopDrawerOpen(true)
    if (options?.noticeMessage) {
      setShopActionFeedback({
        type: 'warning',
        message: options.noticeMessage,
      })
    }
    if (options?.focusField) {
      window.setTimeout(() => {
        shopForm.scrollToField(options.focusField)
      }, 80)
    }
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

  const handleShopNextAction = useCallback((record: ShopOverviewRow) => {
    if (record.nextActionRoute !== 'shop-management') {
      handleSectionNavigate(record.nextActionRoute)
      return
    }

    const noticeMessage = buildMissingShopProfileMessage(record.missingProfileFields)
    const focusField = getPrimaryMissingShopProfileField(record.account)

    if (shopDrawerOpen && editingShop?.id === record.account.id) {
      setShopActionFeedback({
        type: 'warning',
        message: noticeMessage,
      })
      if (focusField) {
        window.setTimeout(() => {
          shopForm.scrollToField(focusField)
        }, 80)
      }
      return
    }

    openEditShop(record.account, { noticeMessage, focusField })
  }, [editingShop?.id, handleSectionNavigate, openEditShop, shopDrawerOpen, shopForm])

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
          orderSyncMode: normalizeOptionalText(values.orderSyncMode),
          orderAutoSyncEnabled: Boolean(values.orderAutoSyncEnabled),
          orderAutoSyncIntervalMinutes: values.orderAutoSyncIntervalMinutes || 60,
          orderAutoSyncPageSize: values.orderAutoSyncPageSize || 50,
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
          orderSyncMode: normalizeOptionalText(values.orderSyncMode),
          orderAutoSyncEnabled: Boolean(values.orderAutoSyncEnabled),
          orderAutoSyncIntervalMinutes: values.orderAutoSyncIntervalMinutes || 60,
          orderAutoSyncPageSize: values.orderAutoSyncPageSize || 50,
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
      setShopActionFeedback(null)
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

  const handleCheckShopToken = useCallback(async () => {
    if (!editingShop) {
      return
    }
    setTokenChecking(true)
    setShopActionFeedback(null)
    try {
      const result = await saleApi.checkToken(editingShop.id)
      setShopActionFeedback({
        type: result.passed ? 'success' : 'warning',
        message: result.passed
          ? `Token 校验通过${result.requestId ? `，requestId：${result.requestId}` : ''}`
          : result.message || result.errorCode || 'Token 校验未通过，请检查店铺凭证。',
      })
      if (result.passed) {
        void loadWorkspaceData()
      }
    } catch (error) {
      console.error(error)
      setShopActionFeedback({
        type: 'error',
        message: 'Token 校验失败，请稍后重试。',
      })
    } finally {
      setTokenChecking(false)
    }
  }, [editingShop, loadWorkspaceData])

  const handleProbeShopCapabilities = useCallback(async () => {
    if (!editingShop) {
      return
    }
    setCapabilityChecking(true)
    setShopActionFeedback(null)
    try {
      const result = await saleApi.probeCapabilities(editingShop.id)
      setShopActionFeedback({
        type: 'info',
        message: `能力探测已完成：${JSON.stringify(result).slice(0, 180)}${JSON.stringify(result).length > 180 ? '...' : ''}`,
      })
      void loadWorkspaceData()
    } catch (error) {
      console.error(error)
      setShopActionFeedback({
        type: 'error',
        message: '能力探测失败，请到治理中心查看报错详情。',
      })
    } finally {
      setCapabilityChecking(false)
    }
  }, [editingShop, loadWorkspaceData])

  const handleSyncOrders = useCallback(async (accountId?: string, useDrawerFeedback?: boolean) => {
    const targetAccountId = accountId || selectedAccountId
    if (!targetAccountId) {
      message.warning('请先选择需要同步的店铺。')
      return
    }
    const account = accountMap.get(targetAccountId)
    const pageSize = account?.orderAutoSyncPageSize || 50

    setOrderSyncSubmittingAccountId(targetAccountId)
    if (useDrawerFeedback) {
      setShopActionFeedback(null)
    }
    try {
      const result = await saleApi.syncOrders({
        channelAccountId: Number(targetAccountId),
        page: 1,
        pageSize,
        continuous: true,
      })
      const successMessage = `订单同步完成，连续处理 ${formatNumber(result.processedPages)} 页，共拉取 ${formatNumber(result.syncedCount)} 单，新增 ${formatNumber(result.createdCount)} 单，更新 ${formatNumber(result.updatedCount)} 单。`
      message.success(successMessage)
      if (useDrawerFeedback) {
        setShopActionFeedback({
          type: 'success',
          message: `${successMessage}${result.requestId ? ` requestId：${result.requestId}` : ''}`,
        })
      }
      await loadWorkspaceData()
    } catch {
      message.error('订单同步失败，请到治理中心查看详情。')
      if (useDrawerFeedback) {
        setShopActionFeedback({
          type: 'error',
          message: '订单同步失败，请到治理中心查看失败日志和平台返回。',
        })
      }
    } finally {
      setOrderSyncSubmittingAccountId(undefined)
    }
  }, [accountMap, loadWorkspaceData, message, selectedAccountId])

  const shopColumns = useMemo<ColumnsType<ShopOverviewRow>>(() => [
    {
      title: '店铺',
      key: 'shop',
      render: (_, record) => (
        <div className="scw-table-shop">
          <Avatar size={40} shape="square" className="scw-table-shop__avatar">
            {getAvatarText(record.account.accountName)}
          </Avatar>
          <div>
            <div className="scw-table-shop__title">{getShopLabel(record.account)}</div>
            <div className="scw-table-shop__sub">{record.account.shopId || '--'}</div>
          </div>
        </div>
      ),
    },
    { title: '类型', key: 'sellerType', render: (_, record) => <StatusChip label={getSaleSellerTypeLabel(record.account.sellerType)} tone="default" /> },
    { title: '平台', key: 'platformCode', render: (_, record) => record.account.platformCode || '--' },
    {
      title: '订单同步',
      key: 'orderSyncConfig',
      render: (_, record) => (
        <div className="scw-shop-reason">
          <Text>{getSaleOrderSyncModeLabel(record.account.orderSyncMode)} · {record.orderAutoSyncEnabled ? formatOrderAutoSyncInterval(record.orderAutoSyncIntervalMinutes) : '未开启自动同步'}</Text>
          <Text type="secondary">下次执行：{record.orderAutoSyncEnabled ? formatDateTime(record.orderAutoSyncNextRunAt) : '--'}</Text>
        </div>
      ),
    },
    {
      title: '健康状态',
      key: 'healthStatus',
      render: (_, record) => <StatusChip label={record.healthLabel} tone={record.healthTone} />,
    },
    {
      title: '阻断原因 / 下一步',
      key: 'blockerReason',
      render: (_, record) => (
        <div className="scw-shop-reason">
          <Text>{record.blockerReason}</Text>
          <Text type="secondary">{record.onboardingStep}</Text>
        </div>
      ),
    },
    {
      title: '最近成功同步',
      key: 'lastSuccessfulSyncAt',
      render: (_, record) => formatDateTime(record.lastSuccessfulSyncAt),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditShop(record.account)}>
            编辑
          </Button>
          <Button
            type="link"
            loading={orderSyncSubmittingAccountId === record.account.id}
            onClick={() => void handleSyncOrders(record.account.id)}
          >
            同步订单
          </Button>
          <Button type="link" onClick={() => handleShopNextAction(record)}>
            {record.nextActionLabel}
          </Button>
          <Popconfirm
            title="确认删除这个店铺吗？"
            description="删除后将无法恢复，请确认该店铺不再使用。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDeleteShop(record.account)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleDeleteShop, handleShopNextAction, handleSyncOrders, openEditShop, orderSyncSubmittingAccountId])

  const governanceTaskRows = useMemo<GovernanceTaskRow[]>(() => {
    const grouped = new Map<string, SaleSyncLogItem[]>()
    syncLogs.forEach((log) => {
      const key = log.taskId || log.requestId || log.id
      const current = grouped.get(key) || []
      current.push(log)
      grouped.set(key, current)
    })

    return Array.from(grouped.entries())
      .map(([taskKey, logs]) => {
        const sortedLogs = [...logs].sort((left, right) => (right.occurredAt || '').localeCompare(left.occurredAt || ''))
        const latestLog = sortedLogs[0]
        const startedAt = [...logs].sort((left, right) => (left.occurredAt || '').localeCompare(right.occurredAt || ''))[0]?.occurredAt
        const failedCount = logs.filter((log) => !log.success).length
        const running = failedCount === 0 && logs.some((log) => log.success && !log.responsePayloadJson)
        const status: GovernanceTaskRow['status'] = failedCount ? 'FAILED' : running ? 'RUNNING' : 'SUCCESS'
        const failureInsight = getFailureInsight(latestLog)
        return {
          taskKey,
          sourceLogId: latestLog.id,
          channelAccountId: latestLog.channelAccountId,
          bizType: latestLog.bizType,
          requestId: latestLog.requestId,
          traceId: latestLog.requestId,
          status,
          statusLabel: status === 'FAILED' ? '失败' : status === 'RUNNING' ? '运行中' : '成功',
          tone: (status === 'FAILED' ? 'danger' : status === 'RUNNING' ? 'info' : 'success') as GovernanceTaskRow['tone'],
          logCount: logs.length,
          failedCount,
          startedAt,
          latestAt: latestLog.occurredAt,
          failureCategory: failureInsight.failureCategory,
          failureStage: failureInsight.failureStage,
          suggestedAction: latestLog.success ? '该任务执行成功，无需额外排障。' : failureInsight.suggestedAction,
          latestLog,
        }
      })
      .sort((left, right) => (right.latestAt || '').localeCompare(left.latestAt || ''))
  }, [syncLogs])

  const governanceIncidentRows = useMemo(
    () => governanceTaskRows.filter((item) => item.status !== 'SUCCESS').sort((left, right) => right.failedCount - left.failedCount),
    [governanceTaskRows],
  )

  const governanceTaskColumns = useMemo<ColumnsType<GovernanceTaskRow>>(() => [
    { title: '任务ID', dataIndex: 'taskKey', width: 180, render: (value) => value || '--' },
    {
      title: '任务类型',
      dataIndex: 'bizType',
      render: (value) => getSyncBizLabel(value),
    },
    {
      title: '店铺 / 平台',
      key: 'shop',
      render: (_, record) => getShopLabel(record.channelAccountId ? accountMap.get(record.channelAccountId) : undefined),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => <StatusChip label={record.statusLabel} tone={record.tone} />,
    },
    { title: '失败分类', dataIndex: 'failureCategory', render: (value) => value || '--' },
    { title: '建议动作', dataIndex: 'suggestedAction', ellipsis: true },
    { title: '最近时间', dataIndex: 'latestAt', render: (value) => formatDateTime(value) },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => setGovernanceDrawerId(record.sourceLogId)} data-testid="governance-detail-button">
          查看详情
        </Button>
      ),
    },
  ], [accountMap])

  const governanceLogColumns = useMemo<ColumnsType<SaleSyncLogItem>>(() => [
    {
      title: '任务 / 请求',
      key: 'task',
      render: (_, record) => (
        <div className="scw-governance-cell">
          <Text strong>{record.taskId || record.requestId || record.id}</Text>
          <Text type="secondary">{getSyncBizLabel(record.bizType)}</Text>
        </div>
      ),
    },
    {
      title: '店铺',
      key: 'shop',
      render: (_, record) => getShopLabel(record.channelAccountId ? accountMap.get(record.channelAccountId) : undefined),
    },
    {
      title: '结果',
      key: 'success',
      render: (_, record) => <StatusChip label={record.success ? '成功' : '失败'} tone={record.success ? 'success' : 'danger'} />,
    },
    { title: '错误码', dataIndex: 'errorCode', render: (value) => value || '--' },
    { title: '发生时间', dataIndex: 'occurredAt', render: (value) => formatDateTime(value) },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => setGovernanceDrawerId(record.id)}>
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
                <Text type="secondary">价格、库存等售卖数据在售卖数据页独立汇总展示，不在这里单独勾选。</Text>
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
          <div className="scw-binding-exception-rail">
            <Text className="scw-field-label">绑定异常队列</Text>
            <Space wrap>
              <StatusChip label={`有销量未绑定 ${bindingExceptionQueue.filter((item) => item.type === '有销量未绑定').length}`} tone="danger" />
              <StatusChip label={`冲突绑定 ${bindingExceptionQueue.filter((item) => item.type === '冲突绑定').length}`} tone="danger" />
              <StatusChip label={`低置信度 ${bindingExceptionQueue.filter((item) => item.type === '低置信度草稿').length}`} tone="warning" />
            </Space>
            <List
              size="small"
              className="scw-binding-exception-list"
              locale={{ emptyText: '当前没有需要升级处理的绑定异常' }}
              dataSource={bindingExceptionQueue.slice(0, 4)}
              renderItem={(item) => {
                const mapping = selectedBindings.find((entry) => entry.id === item.mappingId)
                return (
                  <List.Item
                    actions={[
                      <Button type="link" size="small" key="focus" onClick={() => setBindingDrawerId(item.mappingId)}>
                        去处理
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<StatusChip label={item.type} tone={item.tone} />}
                      title={mapping?.platformProductName || mapping?.platformSkuCode || mapping?.platformSkuId || '待处理商品'}
                      description={`${item.reason} ${item.salesVolume ? `当前销量 ${formatNumber(item.salesVolume)} 件。` : ''}`}
                    />
                  </List.Item>
                )
              }}
            />
          </div>
        </Card>
        <Card className="scw-panel-card scw-flex-fill">
          <SectionHeading title="平台商品" description="优先处理待绑定、高销量和冲突商品。" extra={<Text type="secondary">共 {formatNumber(filteredBindings.length)} 条</Text>} />
          <div className="scw-binding-workbench">
            <div className="scw-binding-workbench__list">
              <div className="scw-binding-list" data-testid="binding-list">
                {pagedBindings.map((item) => {
                  const relatedDraft = drafts.find((draft) => draft.productMappingId === item.id)
                  const exception = bindingExceptionMap.get(item.id)
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`scw-binding-card${currentMapping?.id === item.id ? ' scw-binding-card--active' : ''}`}
                      data-testid="binding-card"
                      onClick={() => setBindingDrawerId(item.id)}
                    >
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
                          {exception ? <StatusChip label={exception.type} tone={exception.tone} /> : null}
                          {relatedDraft?.confidence ? <StatusChip label={`置信度 ${formatConfidence(parseConfidence(relatedDraft.confidence))}`} tone={exception?.tone || 'info'} /> : null}
                        </div>
                        <div className="scw-binding-candidate scw-binding-candidate--stack">
                          <Text>{relatedDraft?.candidateStyleName || item.styleName || '尚未匹配到本地款式'}</Text>
                          <Text type="secondary">{exception?.reason || relatedDraft?.matchReason || item.remark || '等待人工确认映射关系'}</Text>
                          <Text type="secondary">{exception?.recommendedAction || '优先确认候选是否可信，再执行人工绑定。'}</Text>
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
            </div>
            <div className="scw-binding-detail-panel">
              {currentMapping ? (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <SectionHeading title="商品绑定详情" description="先判断候选是否可信，再决定确认草稿或手工绑定。" />
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
                  {currentBindingException ? (
                    <Alert
                      type={currentBindingException.tone === 'danger' ? 'error' : 'warning'}
                      showIcon
                      message={currentBindingException.type}
                      description={`${currentBindingException.reason} ${currentBindingException.recommendedAction}`}
                    />
                  ) : null}
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
                            <br />
                            <Text type="secondary">置信度：{formatConfidence(parseConfidence(draft.confidence))}</Text>
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
                      {!drafts.some((draft) => draft.productMappingId === currentMapping.id) ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有可确认的草稿候选" /> : null}
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
                        data-testid="binding-style-select"
                        placeholder="搜索本地款号或款式名称"
                        value={selectedStyleId}
                        onSearch={(value) => void handleBindingStyleSearch(value)}
                        onChange={(value) => void handleBindingStyleChange(value)}
                        notFoundContent={styleSearchLoading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无款式" />}
                        options={styleOptions}
                        style={{ width: '100%' }}
                      />
                      <Select
                        data-testid="binding-variant-select"
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
              ) : (
                <Empty description="请先从左侧选择一个平台商品，查看候选草稿与绑定详情" />
              )}
            </div>
          </div>
        </Card>
      </div>
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
        <SectionHeading
          title="问题订单"
          description="先识别问题商品，再决定处理动作。"
          extra={(
            <Button
              type="primary"
              loading={orderSyncSubmittingAccountId === selectedAccountId}
              onClick={() => void handleSyncOrders()}
            >
              手动同步订单
            </Button>
          )}
        />
        <div className="scw-filter-inline scw-filter-inline--issue">
          <Select
            className="scw-filter-inline__select"
            allowClear
            placeholder="全部店铺"
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            options={accounts.map((account) => ({ label: getShopLabel(account), value: account.id }))}
          />
          <Select
            className="scw-filter-inline__select"
            value={issueStatusFilter}
            onChange={setIssueStatusFilter}
            options={[{ label: '全部处理状态', value: 'ALL' }, ...processingStatusOptions]}
          />
          <Select
            className="scw-filter-inline__select"
            value={issueCodeFilter}
            onChange={setIssueCodeFilter}
            options={[{ label: '全部异常标签', value: 'ALL' }, { label: '商品未绑定', value: 'PENDING_BINDING' }, { label: '缺少收件信息', value: 'PENDING_DATA_FIX' }, { label: '待人工确认', value: 'PENDING_CONFIRM' }]}
          />
          <Input
            className="scw-filter-inline__search"
            allowClear
            value={issueKeyword}
            onChange={(event) => setIssueKeyword(event.target.value)}
            placeholder="订单号 / 收件人 / 商品 / SKU"
          />
          <Button
            className="scw-filter-inline__action"
            onClick={() => {
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
                    店铺：{getShopLabel(accountMap.get(order.channelAccountId))} · 下单：{formatDateTime(order.platformCreatedAt || order.updatedAt)} · 收件人：{order.receiverName || '--'}
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
                      <Text type="secondary">颜色 / 尺码：{line.normalizedColor || '--'} / {line.normalizedSize || '--'} · 数量：{formatNumber(line.quantity)}</Text>
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
                    <Text type="secondary">{line.platformSkuCode || line.platformSkuId || '--'} · {line.normalizedColor || '--'} / {line.normalizedSize || '--'}</Text>
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

  const renderSalesData = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        {[
          salesMetricMap.get('totalSalesVolume'),
          salesMetricMap.get('activeStyleCount'),
          salesMetricMap.get('highGrowthStyleCount'),
          salesMetricMap.get('unmappedSalesVolume'),
          salesMetricMap.get('shopCoverageCount'),
        ].map((metric, index) => (
          <Col key={metric?.key || `metric-${index}`} xs={24} md={12} xl={metric?.key === 'shopCoverageCount' ? 4 : 5}>
            <Card className="scw-metric-card">
              <Statistic title={metric?.label || '--'} value={formatNumber(metric?.value)} suffix={metric?.unit || undefined} />
              <Text type="secondary">{metric?.description || '当前时间窗口内的售卖表现概览'}</Text>
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="scw-panel-card">
        <SectionHeading title="售卖数据" description="按本地工厂产品汇总所有店铺的售卖情况与增长趋势。" />
        <div className="scw-filter-inline scw-filter-inline--sales">
          <Radio.Group
            value={salesDays}
            onChange={(event) => setSalesDays(event.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: '近7天', value: 7 },
              { label: '近30天', value: 30 },
              { label: '近90天', value: 90 },
            ]}
          />
          <Input
            className="scw-filter-inline__search"
            allowClear
            value={salesKeyword}
            onChange={(event) => setSalesKeyword(event.target.value)}
            placeholder="搜索款号 / 款名"
          />
          <Select
            className="scw-filter-inline__select"
            value={salesSortBy}
            onChange={setSalesSortBy}
            options={[
              { label: '按销量排序', value: 'SALES_VOLUME' },
              { label: '按增速排序', value: 'GROWTH' },
              { label: '按覆盖店铺排序', value: 'SHOP_COVERAGE' },
            ]}
          />
          <Button className="scw-filter-inline__action" onClick={() => {
            setSalesDays(30)
            setSalesKeyword('')
            setSalesSortBy('SALES_VOLUME')
          }}>
            重置
          </Button>
        </div>
      </Card>
      {salesError ? <Alert type="error" showIcon message={salesError} /> : null}
      <Spin spinning={salesLoading}>
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={16}>
            <Card className="scw-panel-card">
              <SectionHeading title="销量趋势" description={`近 ${salesDays} 天全部店铺汇总销量走势`} />
              <div className="scw-sales-chart">
                <MonthlyAreaChart
                  data={salesOverviewTrendData}
                  height={300}
                  getColor={(type) => salesTrendColorMap[type] || '#FF6A3D'}
                  getGradient={(type) => salesTrendGradientMap[type] || 'l(90) 0:#FFD1BF 0.35:#FF8A5B 1:#FFFFFF'}
                  valueFormatter={(value) => `${Math.round(value)} 件`}
                  tooltipValueFormatter={(value) => `${Math.round(value)} 件`}
                  seriesLabelFormatter={(type) => type}
                  xLabelFormatter={(label) => label}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card className="scw-panel-card">
              <SectionHeading title="未映射销量" description="有销量但尚未映射到本地工厂款的商品，优先处理。" />
              <List
                dataSource={salesTopUnmappedItems}
                locale={{ emptyText: '当前时间窗口内没有未映射销量' }}
                renderItem={(item) => (
                  <List.Item actions={[<Button type="link" key="go" onClick={() => handleSectionNavigate('product-bindings')}>去绑定</Button>]}>
                    <List.Item.Meta
                      avatar={<ProductThumb src={item.platformMainImageUrl} name={item.platformProductName} size={48} />}
                      title={item.platformProductName || item.platformSkuCode || item.platformSkuId}
                      description={`${item.shopName || '--'} · ${item.normalizedColor || '--'} / ${item.normalizedSize || '--'} · 窗口销量 ${formatNumber(item.salesVolume)} · 近7天 ${formatNumber(item.last7DaysVolume)} · 影响分 ${formatNumber(item.impactScore)}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={8}>
            <Card className="scw-panel-card">
              <SectionHeading title="高增长工厂款" description="与上一周期对比增长最快的工厂产品。" />
              <List
                dataSource={salesTopGrowthProducts}
                locale={{ emptyText: '当前时间窗口内暂无高增长工厂款' }}
                renderItem={(item) => (
                  <List.Item actions={[<Button type="link" key="go" onClick={() => setSalesDrawerStyleId(item.styleId)}>查看明细</Button>]}>
                    <List.Item.Meta
                      avatar={<ProductThumb src={item.styleImageUrl} name={item.styleName} size={48} />}
                      title={`${item.styleNo || '--'} / ${item.styleName || '--'}`}
                      description={`销量 ${formatNumber(item.salesVolume)} · 增速 ${formatPercent(item.growthRate)} · Top店铺 ${item.topShopName || '--'}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={16}>
            <Card className="scw-panel-card">
              <SectionHeading title="工厂产品列表" description="先看工厂产品卖了多少，再下钻查看颜色尺码和店铺分布。" extra={<Text type="secondary">共 {formatNumber(salesProductsTotal)} 款</Text>} />
              <div className="scw-sales-product-list">
                {salesProducts.map((item) => (
                  <button
                    type="button"
                    key={item.styleId}
                    className="scw-sales-product-card"
                    onClick={() => setSalesDrawerStyleId(item.styleId)}
                    data-testid="sales-product-card"
                  >
                    <ProductThumb src={item.styleImageUrl} name={item.styleName} size={72} />
                    <div className="scw-sales-product-card__content">
                      <div className="scw-sales-product-card__top">
                        <div>
                          <Title level={5}>{item.styleNo || '--'} / {item.styleName || '--'}</Title>
                          <Text type="secondary">已映射平台 SKU：{formatNumber(item.mappedSkuCount)} · 覆盖店铺：{formatNumber(item.shopCount)}</Text>
                        </div>
                        <Space wrap>
                          {item.tags.map((tag) => (
                            <StatusChip key={tag} label={tag} tone={tag === '高增长' ? 'success' : 'warning'} />
                          ))}
                        </Space>
                      </div>
                      <div className="scw-sales-product-card__metrics">
                        <div>
                          <Text type="secondary">当前销量</Text>
                          <Title level={3}>{formatNumber(item.salesVolume)}</Title>
                        </div>
                        <div>
                          <Text type="secondary">上一周期</Text>
                          <Title level={5}>{formatNumber(item.previousSalesVolume)}</Title>
                        </div>
                        <div>
                          <Text type="secondary">增长</Text>
                          <Title level={5}>{formatPercent(item.growthRate)}</Title>
                        </div>
                        <div>
                          <Text type="secondary">Top店铺</Text>
                          <Title level={5}>{item.topShopName || '--'}</Title>
                          <Text type="secondary">{formatPercent(item.topShopContributionRate)} 贡献</Text>
                        </div>
                      </div>
                      <div className="scw-sales-product-card__bottom">
                        <div className="scw-sales-product-card__trend">
                          <MonthlyAreaChart
                            data={item.trendPoints.map((point) => ({
                              month: point.date.slice(5),
                              count: point.totalSalesVolume || 0,
                              type: '售出件数',
                            }))}
                            height={84}
                            getColor={(type) => salesTrendColorMap[type] || '#FF6A3D'}
                            getGradient={(type) => salesTrendGradientMap[type] || 'l(90) 0:#FFD1BF 0.35:#FF8A5B 1:#FFFFFF'}
                            valueFormatter={(value) => `${Math.round(value)}`}
                            tooltipValueFormatter={(value) => `${Math.round(value)} 件`}
                            seriesLabelFormatter={(type) => type}
                            xLabelFormatter={(label) => label}
                          />
                        </div>
                        <div className="scw-sales-product-card__summary">
                          <Text type="secondary">热销规格：{item.hotVariantSummaries.length ? item.hotVariantSummaries.join('；') : '--'}</Text>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {!salesProducts.length ? <Empty description="当前筛选条件下没有工厂产品售卖数据" /> : null}
              </div>
              <div className="scw-pagination-bar">
                <Pagination
                  current={salesPage}
                  pageSize={salesPageSize}
                  total={salesProductsTotal}
                  showSizeChanger
                  onChange={(page, pageSize) => {
                    setSalesPage(page)
                    setSalesPageSize(pageSize)
                  }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
      <Drawer
        open={Boolean(salesDrawerStyleId)}
        onClose={() => setSalesDrawerStyleId(undefined)}
        width={620}
        title="工厂产品销售详情"
        className="scw-drawer"
      >
        <Spin spinning={salesDetailLoading}>
          {salesDetailError ? (
            <Alert type="error" showIcon message={salesDetailError} />
          ) : salesDetail ? (
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <div className="scw-drawer-product">
                <ProductThumb src={salesDetail.styleImageUrl} name={salesDetail.styleName} size={92} />
                <div>
                  <Title level={4}>{salesDetail.styleNo || '--'} / {salesDetail.styleName || '--'}</Title>
                  <Paragraph type="secondary">
                    当前销量：{formatNumber(salesDetail.salesVolume)} · 上一周期：{formatNumber(salesDetail.previousSalesVolume)}
                    <br />
                    覆盖店铺：{formatNumber(salesDetail.shopCount)} · Top 店铺：{salesDetail.topShopName || '--'}（{formatPercent(salesDetail.topShopContributionRate)}）
                  </Paragraph>
                </div>
              </div>
              <Tabs
                items={[
                  {
                    key: 'trend',
                    label: '销量趋势',
                    children: (
                      <div className="scw-sales-chart scw-sales-chart--detail">
                        <MonthlyAreaChart
                          data={salesDetailTrendData}
                          height={280}
                          getColor={(type) => salesTrendColorMap[type] || '#FF6A3D'}
                          getGradient={(type) => salesTrendGradientMap[type] || 'l(90) 0:#FFD1BF 0.35:#FF8A5B 1:#FFFFFF'}
                          valueFormatter={(value) => `${Math.round(value)} 件`}
                          tooltipValueFormatter={(value) => `${Math.round(value)} 件`}
                          seriesLabelFormatter={(type) => type}
                          xLabelFormatter={(label) => label}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'variant',
                    label: '颜色 / 尺码结构',
                    children: (
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Card size="small" title="颜色排行">
                            <List
                              dataSource={salesDetail.colorBreakdown}
                              renderItem={(item) => (
                                <List.Item>
                                  <List.Item.Meta title={item.color || '--'} description={`销量 ${formatNumber(item.salesVolume)} · Top店铺 ${item.topShopName || '--'}`} />
                                </List.Item>
                              )}
                            />
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card size="small" title="尺码排行">
                            <List
                              dataSource={salesDetail.sizeBreakdown}
                              renderItem={(item) => (
                                <List.Item>
                                  <List.Item.Meta title={item.size || '--'} description={`销量 ${formatNumber(item.salesVolume)} · Top店铺 ${item.topShopName || '--'}`} />
                                </List.Item>
                              )}
                            />
                          </Card>
                        </Col>
                        <Col span={24}>
                          <Card size="small" title="规格矩阵">
                            <Table
                              rowKey={(row) => `${row.styleVariantId || 'variant'}-${row.specSummary || ''}`}
                              pagination={false}
                              dataSource={salesDetail.variantBreakdown}
                              columns={[
                                { title: '颜色', dataIndex: 'color' },
                                { title: '尺码', dataIndex: 'size' },
                                { title: '规格摘要', dataIndex: 'specSummary' },
                                { title: '销量', dataIndex: 'salesVolume', render: (value) => formatNumber(value) },
                                { title: '覆盖店铺', dataIndex: 'shopCount', render: (value) => formatNumber(value) },
                                { title: 'Top 店铺', dataIndex: 'topShopName' },
                              ]}
                            />
                          </Card>
                        </Col>
                      </Row>
                    ),
                  },
                  {
                    key: 'shops',
                    label: '店铺分布',
                    children: (
                      <Table
                        rowKey={(row) => `${row.channelAccountId || row.shopName}`}
                        pagination={false}
                        dataSource={salesDetail.shopBreakdown}
                        columns={[
                          { title: '店铺', dataIndex: 'shopName' },
                          { title: '销量', dataIndex: 'salesVolume', render: (value) => formatNumber(value) },
                          { title: '贡献占比', dataIndex: 'contributionRate', render: (value) => formatPercent(value) },
                          { title: '主卖规格', dataIndex: 'topVariantSummary' },
                        ]}
                      />
                    ),
                  },
                  {
                    key: 'sku',
                    label: '平台 SKU 明细',
                    children: (
                      <Table
                        rowKey={(row) => `${row.channelAccountId || 'shop'}-${row.platformSkuId}`}
                        pagination={false}
                        dataSource={salesDetail.skuDetails}
                        columns={[
                          { title: 'Top 店铺', dataIndex: 'shopName' },
                          { title: '平台 SKU', key: 'sku', render: (_, row) => row.platformSkuCode || row.platformSkuId },
                          { title: '商品名', dataIndex: 'platformProductName' },
                          { title: '本地规格', dataIndex: 'localVariantSummary' },
                          { title: '销量', dataIndex: 'salesVolume', render: (value) => formatNumber(value) },
                          { title: '覆盖店铺', dataIndex: 'shopCoverage', render: (value) => formatNumber(value) },
                        ]}
                      />
                    ),
                  },
                ]}
              />
              <Space>
                <Button onClick={() => handleSectionNavigate('product-bindings')}>去商品绑定</Button>
                <Button onClick={() => handleSectionNavigate('order-issues')}>查看问题订单</Button>
              </Space>
            </Space>
          ) : null}
        </Spin>
      </Drawer>
    </Space>
  )

  const renderShopManagement = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="已启用" value={shopSummary.enabledCount} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="待接入" value={shopSummary.onboardingPendingCount} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="风险店铺" value={shopSummary.riskyCount} /></Card></Col>
        <Col xs={24} md={12} xl={5}><Card className="scw-metric-card"><Statistic title="自动同步" value={shopSummary.autoSyncEnabledCount} /></Card></Col>
        <Col xs={24} md={12} xl={4}><Card className="scw-metric-card"><Statistic title="停用" value={shopSummary.disabledCount} /></Card></Col>
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card className="scw-panel-card">
            <SectionHeading title="店铺接入状态机" description="新店铺必须先完成准入，再进入商品、订单和售卖数据链路。" />
            <List
              dataSource={[
                '已建档',
                '已配置凭证',
                'Token 校验通过',
                '能力探测通过',
                '首次商品同步成功',
                '首次订单同步成功',
                '可投入使用',
              ]}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar size={32}>{index + 1}</Avatar>}
                    title={item}
                    description={index === 0 ? '先完成店铺资料和平台归属建档。' : index === 1 ? '录入脱敏凭证并保存。' : index === 2 ? '确保当前 Token 可读。' : index === 3 ? '确认商品、订单、售卖数据能力矩阵。' : index === 4 ? '完成首轮商品快照读取。' : index === 5 ? '完成首轮订单同步。' : '此时才进入稳定使用。'}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="scw-panel-card">
            <SectionHeading title="异常店铺" description="优先处理健康态不是“正常”的店铺。" />
            <List
              dataSource={shopOverviewRows.filter((item) => item.healthStatus !== 'ACTIVE').slice(0, 5)}
              locale={{ emptyText: '当前没有需要优先排障的店铺' }}
              renderItem={(item) => (
                <List.Item actions={[<Button type="link" key="go" onClick={() => handleShopNextAction(item)}>{item.nextActionLabel}</Button>]}>
                  <List.Item.Meta
                    avatar={<StatusChip label={item.healthLabel} tone={item.healthTone} />}
                    title={getShopLabel(item.account)}
                    description={`${item.blockerReason} 最近成功同步：${formatDateTime(item.lastSuccessfulSyncAt)}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
      <Card className="scw-panel-card">
        <SectionHeading title="店铺管理" description="该页面用于店铺名册、接入资料和健康状态管理。" extra={<Button type="primary" onClick={openCreateShop} data-testid="shop-create-button">新建店铺</Button>} />
        <Table rowKey={(row) => row.account.id} dataSource={shopOverviewRows} columns={shopColumns} pagination={{ pageSize: 8 }} />
      </Card>
      <Drawer
        open={shopDrawerOpen}
        onClose={() => {
          setShopDrawerOpen(false)
          setEditingShop(null)
          setCredentialDetail(null)
          setShopActionFeedback(null)
          shopForm.resetFields()
        }}
        width={520}
        title={editingShop ? '编辑店铺' : '新建店铺'}
        className="scw-drawer"
      >
        {currentShopOverview ? (
          <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 20 }}>
            <Alert
              type={currentShopOverview.healthTone === 'danger' ? 'error' : currentShopOverview.healthTone === 'warning' ? 'warning' : currentShopOverview.healthTone === 'info' ? 'info' : 'success'}
              showIcon
              message={`${currentShopOverview.healthLabel} · ${currentShopOverview.onboardingStep}`}
              description={currentShopOverview.blockerReason}
            />
            <Card size="small">
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="商品同步">{formatDateTime(currentShopOverview.lastSuccessfulProductSyncAt)}</Descriptions.Item>
                <Descriptions.Item label="订单同步">{formatDateTime(currentShopOverview.lastSuccessfulOrderSyncAt)}</Descriptions.Item>
                <Descriptions.Item label="售卖数据">{formatDateTime(currentShopOverview.lastSuccessfulSalesSyncAt)}</Descriptions.Item>
                <Descriptions.Item label="自动拉单">{currentShopOverview.orderAutoSyncEnabled ? formatOrderAutoSyncInterval(currentShopOverview.orderAutoSyncIntervalMinutes) : '未开启'}</Descriptions.Item>
                <Descriptions.Item label="下次执行">{formatDateTime(currentShopOverview.orderAutoSyncNextRunAt)}</Descriptions.Item>
                <Descriptions.Item label="最近触发">{formatDateTime(currentShopOverview.orderAutoSyncLastTriggeredAt)}</Descriptions.Item>
                <Descriptions.Item label="最近结果">
                  <StatusChip label={currentShopOverview.latestOrderSyncLabel} tone={currentShopOverview.latestOrderSyncTone} />
                </Descriptions.Item>
                <Descriptions.Item label="待绑定商品">{formatNumber(currentShopOverview.pendingBindingCount)}</Descriptions.Item>
                <Descriptions.Item label="问题订单">{formatNumber(currentShopOverview.issueOrderCount)}</Descriptions.Item>
                <Descriptions.Item label="失败日志">{formatNumber(currentShopOverview.failedSyncCount)}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Alert
              type={
                currentShopOverview.latestOrderSyncTone === 'danger'
                  ? 'error'
                  : currentShopOverview.latestOrderSyncTone === 'warning'
                    ? 'warning'
                    : 'info'
              }
              showIcon
              message={currentShopOverview.latestOrderSyncMessage}
            />
            {currentShopOverview.missingProfileFields.length ? (
              <Alert
                type="warning"
                showIcon
                message="当前店铺资料还不完整"
                description={`缺少：${currentShopOverview.missingProfileFields.join('、')}。请先补齐这些字段，再继续接入和同步。`}
              />
            ) : null}
            {editingShop ? (
              <Space wrap>
                <Button loading={tokenChecking} onClick={() => void handleCheckShopToken()}>
                  检查 Token
                </Button>
                <Button loading={capabilityChecking} onClick={() => void handleProbeShopCapabilities()}>
                  探测能力
                </Button>
                <Button loading={orderSyncSubmittingAccountId === editingShop.id} onClick={() => void handleSyncOrders(editingShop.id, true)}>
                  立即同步订单
                </Button>
                <Button onClick={() => handleShopNextAction(currentShopOverview)}>
                  {currentShopOverview.nextActionLabel}
                </Button>
              </Space>
            ) : null}
            {shopActionFeedback ? <Alert type={shopActionFeedback.type} showIcon message={shopActionFeedback.message} /> : null}
          </Space>
        ) : null}
        <Form form={shopForm} layout="vertical">
          <Form.Item name="accountName" label="店铺名称" rules={[{ required: true, message: '请输入店铺名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="shopId" label="平台店铺ID" extra="可选。当前系统不会依赖这个字段执行商品、订单同步。">
            <Input placeholder="例如平台返回的 Shop ID" />
          </Form.Item>
          <Form.Item name="shopName" label="店铺显示名">
            <Input />
          </Form.Item>
          <Form.Item name="sellerType" label="店铺类型">
            <Select options={[{ label: '全托管', value: 'FULLY_MANAGED' }, { label: '半托管', value: 'SEMI_MANAGED' }]} />
          </Form.Item>
          <Form.Item name="orderSyncMode" label="订单同步模式">
            <Select
              options={[
                { label: '自动识别', value: 'AUTO' },
                { label: '订单模式', value: 'ORDER' },
                { label: '备货单模式', value: 'PURCHASE_ORDER' },
              ]}
            />
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
          <Card size="small" style={{ marginBottom: 16 }}>
            <SectionHeading title="订单自动同步" description="配置后，系统会按设定节奏自动拉取最近订单并回写本地。" />
            <Row gutter={12}>
              <Col span={24}>
                <Form.Item name="orderAutoSyncEnabled" label="开启自动同步" valuePropName="checked" style={{ marginBottom: 16 }}>
                  <Switch checkedChildren="已开启" unCheckedChildren="已关闭" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="orderAutoSyncIntervalMinutes" label="同步频率" style={{ marginBottom: 0 }}>
                  <Select
                    options={[
                      { label: '每 30 分钟', value: 30 },
                      { label: '每 1 小时', value: 60 },
                      { label: '每 3 小时', value: 180 },
                      { label: '每 6 小时', value: 360 },
                      { label: '每 12 小时', value: 720 },
                      { label: '每天 1 次', value: 1440 },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="orderAutoSyncPageSize" label="每页拉取上限" style={{ marginBottom: 0 }}>
                  <InputNumber min={20} max={200} step={10} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Alert
              style={{ marginTop: 16 }}
              type="info"
              showIcon
              message="自动同步会从第 1 页开始连续翻页补扫，直到当前没有更多订单；这里控制的是单页大小，不是整轮只拉这一点数据。"
            />
          </Card>
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
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Row gutter={[16, 16]} className="scw-governance-metrics">
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="运行中任务" value={governanceTaskRows.filter((item) => item.status === 'RUNNING').length} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="今日失败任务" value={governanceTaskRows.filter((item) => item.status === 'FAILED').length} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="不可重试" value={retryCandidates.filter((item) => !item.retryable).length} /></Card></Col>
        <Col xs={24} md={12} xl={6}><Card className="scw-metric-card"><Statistic title="高优先排障" value={governanceIncidentRows.length} /></Card></Col>
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={9}>
          <Card className="scw-panel-card">
            <SectionHeading title="故障队列" description="优先看失败次数高、直接阻断业务链路的任务。" />
            <List
              dataSource={governanceIncidentRows.slice(0, 6)}
              locale={{ emptyText: '当前没有需要升级处理的治理故障' }}
              renderItem={(item) => (
                <List.Item actions={[<Button type="link" key="detail" onClick={() => setGovernanceDrawerId(item.sourceLogId)}>查看详情</Button>]}>
                  <List.Item.Meta
                    avatar={<StatusChip label={item.failureCategory} tone={item.tone} />}
                    title={`${getSyncBizLabel(item.bizType)} / ${getShopLabel(item.channelAccountId ? accountMap.get(item.channelAccountId) : undefined)}`}
                    description={`${item.failureStage} · ${item.suggestedAction}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card className="scw-panel-card">
            <SectionHeading title="同步任务与日志" description="优先排查商品同步、订单同步、售卖数据同步三类任务。" />
            <Tabs
              defaultActiveKey="tasks"
              items={[
                {
                  key: 'tasks',
                  label: `任务 (${governanceTaskRows.length})`,
                  children: <Table rowKey="taskKey" dataSource={governanceTaskRows} columns={governanceTaskColumns} pagination={{ pageSize: 8 }} />,
                },
                {
                  key: 'logs',
                  label: `日志 (${syncLogs.length})`,
                  children: <Table rowKey="id" dataSource={syncLogs} columns={governanceLogColumns} pagination={{ pageSize: 8 }} />,
                },
                {
                  key: 'retry',
                  label: `重试候选 (${retryCandidates.length})`,
                  children: (
                    <List
                      dataSource={retryCandidates}
                      renderItem={(item) => (
                        <List.Item actions={[<Button type="primary" key="retry" disabled={!item.retryable} data-testid="governance-retry-button">{item.retryable ? '建议重试' : '不可重试'}</Button>]}>
                          <List.Item.Meta
                            title={`${getSyncBizLabel(item.bizType)} / ${item.requestId || '--'}`}
                            description={`${item.errorCode || '--'} · ${item.errorMessage || '无错误说明'} · ${item.retryAction || '请先查看治理详情'}`}
                          />
                        </List.Item>
                      )}
                    />
                  ),
                },
                {
                  key: 'idempotency',
                  label: `幂等 (${idempotencyRecords.length})`,
                  children: (
                    <Table
                      rowKey="id"
                      dataSource={idempotencyRecords}
                      columns={[
                        { title: '幂等键', dataIndex: 'idempotencyKey', render: (value) => value || '--' },
                        { title: '业务类型', dataIndex: 'bizType', render: (value) => getSyncBizLabel(value) },
                        { title: '状态', dataIndex: 'status', render: (value) => <StatusChip label={value || '--'} tone={getStatusTone(value)} /> },
                        { title: '更新时间', dataIndex: 'updatedAt', render: (value) => formatDateTime(value) },
                      ]}
                      pagination={{ pageSize: 8 }}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Drawer open={Boolean(currentLog)} onClose={() => setGovernanceDrawerId(undefined)} width={440} title="任务详情" className="scw-drawer">
        {currentLog && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card size="small">
              <Title level={5}>基础信息</Title>
              <Paragraph>任务 ID：{currentLog.taskId || '--'}</Paragraph>
              <Paragraph>任务类型：{getSyncBizLabel(currentLog.bizType)}</Paragraph>
              <Paragraph>店铺 / 平台：{getShopLabel(currentLog.channelAccountId ? accountMap.get(currentLog.channelAccountId) : undefined)}</Paragraph>
              <Paragraph>结果：{currentLog.success ? '成功' : '失败'}</Paragraph>
              <Paragraph>traceId / requestId：{currentLog.requestId || '--'}</Paragraph>
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
                message={currentLog.success ? '该任务执行成功，无需额外处理。' : `${getFailureInsight(currentLog).failureCategory} · ${getFailureInsight(currentLog).failureStage}`}
                description={currentLog.success ? '该任务执行成功，无需额外处理。' : getFailureInsight(currentLog).suggestedAction}
              />
              <Space style={{ marginTop: 16 }}>
                <Button disabled={currentLog.success}>标记已处理</Button>
                <Button type="primary" disabled={currentLog.success}>重试任务</Button>
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>
    </Space>
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
      case 'sales-data':
        return renderSalesData()
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
    if (activeSection.startsWith('sales')) return ['risk-group']
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
          <img src="/assets/images/logo.png" alt="易供云" className="scw-brand__icon" />
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
                      : activeSection === 'sales-data'
                        ? '售卖数据'
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
                      : activeSection === 'sales-data'
                        ? '按本地工厂产品汇总所有店铺里的售卖情况、增长趋势和未映射销量。'
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
            <Button icon={<ReloadOutlined />} loading={activeSection === 'sales-data' ? salesLoading : refreshing} onClick={handleRefresh}>
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
