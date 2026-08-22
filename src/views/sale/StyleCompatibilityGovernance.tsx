import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Key } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckCircleOutlined, PlayCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import styleCompatibilityApi from '../../api/style-compatibility'
import stylesApi from '../../api/styles'
import styleDetailApi from '../../api/style-detail'
import type { SaleChannelAccount } from '../../types/sale'
import type { StyleData, StyleDetailData } from '../../types/style'
import type {
  StyleGovernanceBatch,
  StyleGovernanceDecisionMode,
  StyleGovernanceDraftPayload,
  StyleGovernanceExecutionResult,
  StyleGovernanceItemDetail,
  StyleGovernanceItemSummary,
  StyleGovernancePreview,
  StyleGovernanceSkuMapping,
  StyleGovernanceStatus,
  StyleGovernanceSummary,
} from '../../types/style-compatibility'
import { getShopLabel } from './sale-center-helpers'
import './style-compatibility-governance.css'

const { Text, Title } = Typography

type Props = {
  accounts: SaleChannelAccount[]
  selectedAccountId?: string
  onAccountChange: (accountId?: string) => void
}

type Filters = {
  status?: StyleGovernanceStatus
  channelAccountIds: string[]
  riskLevel?: string
  keyword: string
}

const statusMeta: Record<string, { label: string; color: string }> = {
  AUTO_SUGGESTED: { label: '可批量确认', color: 'cyan' },
  READY: { label: '可直接确认', color: 'green' },
  REVIEW_REQUIRED: { label: '需人工核对', color: 'gold' },
  CONFLICT: { label: '冲突阻塞', color: 'red' },
  NO_CANDIDATE: { label: '待补工厂资料', color: 'orange' },
  COMPLETED: { label: '已完成', color: 'blue' },
  FAILED: { label: '处理失败', color: 'red' },
}

const decisionOptions: Array<{ value: StyleGovernanceDecisionMode; label: string; description: string }> = [
  { value: 'MERGE_TO_EXISTING', label: '关联已有工厂款式', description: 'Ozon 渠道款档保持独立，只建立款式、颜色和 SKU 对应关系。' },
  { value: 'CONVERT_IN_PLACE', label: '新建工厂款式并关联', description: '新建中文生产主档，Ozon 名称、图片和属性继续保留在渠道款档。' },
  { value: 'KEEP_SEPARATE', label: '暂不建立关联', description: '保留 Ozon 渠道款档，库存和销量暂不汇总到工厂款式。' },
]

const formatDateTime = (value?: string | null) => value ? value.replace('T', ' ').slice(0, 19) : '--'
const ratio = (matched?: number, total?: number) => `${matched ?? 0}/${total ?? 0}`
const isRunning = (batch?: StyleGovernanceBatch | null) => batch?.status === 'RUNNING' || batch?.status === 'PENDING'
const canBulkConfirm = (record: StyleGovernanceItemSummary) => record.status === 'AUTO_SUGGESTED' || record.status === 'READY'
const hasHanText = (value?: string | null) => /[\u3400-\u9fff]/.test(value?.trim() || '')
const hasCyrillicText = (value?: string | null) => /[\u0400-\u04ff]/.test(value?.trim() || '')
const normalizeMatchKey = (value?: string | null) => (value || '').trim().toLocaleLowerCase()

const mappingStatusLabel = (status?: string | null) => {
  if (status === 'MATCHED' || status === 'ACTIVE' || status === 'CONFIRMED') return { label: '已关联', color: 'green' }
  if (status === 'CONFLICT') return { label: '有冲突', color: 'red' }
  return { label: '待关联', color: 'gold' }
}

const getSkuDraftState = (mode: StyleGovernanceDecisionMode, sku: StyleGovernanceSkuMapping) => {
  if (mode === 'KEEP_SEPARATE') return { valid: true, label: '无需填写', color: 'default' }
  if (mode === 'MERGE_TO_EXISTING') {
    return sku.factoryVariantId
      ? { valid: true, label: '已对应', color: 'green' }
      : { valid: false, label: '待选择', color: 'gold' }
  }

  const factoryColor = sku.factoryColor?.trim() || ''
  const factorySize = sku.factorySize?.trim() || ''
  const colorValid = hasHanText(factoryColor) && !hasCyrillicText(factoryColor)
  const sizeValid = Boolean(factorySize) && !hasCyrillicText(factorySize)
  if (!colorValid) return { valid: false, label: '颜色待翻译', color: 'orange' }
  if (!sizeValid) return { valid: false, label: '尺码待转换', color: 'orange' }
  return { valid: true, label: '已填写', color: 'green' }
}

const Thumb = ({ src, name }: { src?: string | null; name?: string | null }) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return src && !failed ? (
    <img className="scg-thumb" src={src} alt={name || '商品图'} onError={() => setFailed(true)} />
  ) : <div className="scg-thumb scg-thumb--empty">{(name || '款').slice(0, 1)}</div>
}

const autoMapDrafts = (
  current: Record<string, StyleGovernanceSkuMapping>,
  variants: NonNullable<StyleDetailData['variants']>,
) => Object.fromEntries(Object.entries(current).map(([mappingId, sku]) => {
  if (sku.factoryVariantId) return [mappingId, sku]
  const sellerSku = normalizeMatchKey(sku.sellerSkuCode || sku.platformSkuCode)
  const exactSkuMatches = sellerSku ? variants.filter((variant) =>
    [variant.skuNo, variant.systemSkuNo].some((value) => normalizeMatchKey(value) === sellerSku)) : []
  const exactSpecMatches = variants.filter((variant) =>
    normalizeMatchKey(variant.color) === normalizeMatchKey(sku.platformColor)
    && normalizeMatchKey(variant.size) === normalizeMatchKey(sku.platformSize))
  const exactSku = exactSkuMatches.length === 1 ? exactSkuMatches[0] : undefined
  const exactSpec = exactSpecMatches.length === 1 ? exactSpecMatches[0] : undefined
  const variant = exactSku || exactSpec
  if (!variant) return [mappingId, sku]
  return [mappingId, {
    ...sku,
    factoryVariantId: variant.id,
    factoryColor: variant.color,
    factorySize: variant.size,
    systemSkuNo: variant.systemSkuNo,
    factorySkuNo: variant.skuNo,
    matchSource: exactSku ? 'SELLER_SKU_EXACT' : 'COLOR_SIZE_EXACT',
    confidence: 1,
  }]
}))

export default function StyleCompatibilityGovernance({ accounts, selectedAccountId, onAccountChange }: Props) {
  const { message } = App.useApp()
  const [batch, setBatch] = useState<StyleGovernanceBatch | null>(null)
  const [summary, setSummary] = useState<StyleGovernanceSummary | null>(null)
  const [rows, setRows] = useState<StyleGovernanceItemSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState<Filters>({ channelAccountIds: selectedAccountId ? [selectedAccountId] : [], keyword: '' })
  const [keywordInput, setKeywordInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [activeItemId, setActiveItemId] = useState<string>()
  const [detail, setDetail] = useState<StyleGovernanceItemDetail | null>(null)
  const [decisionMode, setDecisionMode] = useState<StyleGovernanceDecisionMode>('MERGE_TO_EXISTING')
  const [targetStyleId, setTargetStyleId] = useState<string>()
  const [factoryStyleName, setFactoryStyleName] = useState('')
  const [factoryStyleNo, setFactoryStyleNo] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [skuDrafts, setSkuDrafts] = useState<Record<string, StyleGovernanceSkuMapping>>({})
  const [styleOptions, setStyleOptions] = useState<StyleData[]>([])
  const [styleSearching, setStyleSearching] = useState(false)
  const [targetStyleDetail, setTargetStyleDetail] = useState<StyleDetailData | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanAccounts, setScanAccounts] = useState<string[]>(selectedAccountId ? [selectedAccountId] : [])
  const [scanScope, setScanScope] = useState<'UNRESOLVED' | 'ALL'>('UNRESOLVED')
  const [scanSubmitting, setScanSubmitting] = useState(false)
  const [preview, setPreview] = useState<StyleGovernancePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewChecked, setPreviewChecked] = useState(false)
  const [execution, setExecution] = useState<StyleGovernanceExecutionResult | null>(null)
  const pollRef = useRef<number>()

  const accountOptions = useMemo(() => accounts.filter((item) => item.platformCode?.toUpperCase() === 'OZON').map((item) => ({ label: getShopLabel(item), value: item.id })), [accounts])

  const loadItems = useCallback(async (nextBatch = batch, nextPage = page, nextPageSize = pageSize, nextFilters = filters) => {
    if (!nextBatch) return
    setLoading(true)
    try {
      const [nextSummary, result] = await Promise.all([
        styleCompatibilityApi.getSummary(nextBatch.batchId),
        styleCompatibilityApi.listItems(nextBatch.batchId, {
          page: nextPage,
          pageSize: nextPageSize,
          status: nextFilters.status,
          channelAccountIds: nextFilters.channelAccountIds.length ? nextFilters.channelAccountIds : undefined,
          riskLevel: nextFilters.riskLevel,
          keyword: nextFilters.keyword || undefined,
        }),
      ])
      setSummary(nextSummary)
      setRows(result.list || [])
      setTotal(result.total || 0)
      setSelectedKeys([])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载治理清单失败')
    } finally {
      setLoading(false)
    }
  }, [batch, filters, message, page, pageSize])

  const loadLatest = useCallback(async () => {
    setLoading(true)
    try {
      const latest = await styleCompatibilityApi.getLatestBatch()
      setBatch(latest)
      if (latest) await loadItems(latest, 1, pageSize, filters)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载治理批次失败')
    } finally {
      setLoading(false)
    }
  }, [filters, loadItems, message, pageSize])

  useEffect(() => { void loadLatest() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!batch || !isRunning(batch)) return
    pollRef.current = window.setInterval(async () => {
      const latest = await styleCompatibilityApi.getBatch(batch.batchId)
      setBatch(latest)
      if (!isRunning(latest)) {
        window.clearInterval(pollRef.current)
        await loadItems(latest, 1, pageSize, filters)
      }
    }, 3000)
    return () => window.clearInterval(pollRef.current)
  }, [batch?.batchId, batch?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = (next: Filters) => {
    setFilters(next)
    setPage(1)
    void loadItems(batch, 1, pageSize, next)
  }

  const openDetail = useCallback(async (itemId: string) => {
    if (!batch) return
    setActiveItemId(itemId)
    setDetail(null)
    setDetailLoading(true)
    try {
      const next = await styleCompatibilityApi.getItem(batch.batchId, itemId)
      setDetail(next)
      const factoryNumberCandidate = next.candidates.find((candidate) =>
        candidate.styleNo === next.factoryStyleNo)
      const detectedNumberCandidates = next.candidates.filter((candidate) =>
        candidate.styleNo === next.platformStyleNo || candidate.confidence === 1)
      const detectedNumberCandidate = detectedNumberCandidates.length === 1 ? detectedNumberCandidates[0] : undefined
      const preferredTargetStyleId = next.candidateStyleId
        || factoryNumberCandidate?.styleId
        || detectedNumberCandidate?.styleId
        || (next.candidates.length === 1 ? next.candidates[0].styleId : undefined)
      const nextMode = next.decisionMode === 'KEEP_SEPARATE'
        ? 'KEEP_SEPARATE'
        : preferredTargetStyleId
          ? 'MERGE_TO_EXISTING'
          : next.decisionMode || 'CONVERT_IN_PLACE'
      setDecisionMode(nextMode)
      setTargetStyleId(preferredTargetStyleId || undefined)
      setFactoryStyleName(next.factoryStyleName || '')
      setFactoryStyleNo(next.factoryStyleNo || next.originalStyleNo || next.platformStyleNo || '')
      setReviewNote(next.reviewNote || '')
      const initialDrafts = Object.fromEntries(next.colorGroups.flatMap((group) => group.skuMappings).map((sku) => [sku.mappingId, { ...sku }]))
      setStyleOptions(next.candidates.map((item) => ({ id: item.styleId, styleNo: item.styleNo, styleName: item.styleName, image: item.imageUrl || undefined, colors: [], sizes: [], status: 'active' })))
      if (preferredTargetStyleId) {
        const target = await styleDetailApi.fetchDetail(preferredTargetStyleId)
        setTargetStyleDetail(target)
        setSkuDrafts(nextMode === 'MERGE_TO_EXISTING' ? autoMapDrafts(initialDrafts, target.variants || []) : initialDrafts)
      } else {
        setTargetStyleDetail(null)
        setSkuDrafts(initialDrafts)
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载款式对照信息失败')
    } finally {
      setDetailLoading(false)
    }
  }, [batch, message])

  const searchStyles = async (keyword: string) => {
    setStyleSearching(true)
    try {
      const result = await stylesApi.list({ page: 1, pageSize: 20, keyword: keyword.trim() || undefined })
      setStyleOptions(result.list.filter((item) => item.id !== detail?.originalStyleId && item.status === 'active'))
    } finally {
      setStyleSearching(false)
    }
  }

  const changeTargetStyle = async (styleId: string) => {
    if (styleId === detail?.originalStyleId) {
      message.warning('请选择另一条独立的工厂款式')
      return
    }
    setTargetStyleId(styleId)
    const clearedDrafts = Object.fromEntries(Object.entries(skuDrafts).map(([mappingId, sku]) => [mappingId, {
      ...sku,
      factoryVariantId: null,
      factoryColor: null,
      factorySize: null,
      systemSkuNo: null,
      factorySkuNo: null,
    }]))
    const target = await styleDetailApi.fetchDetail(styleId)
    setTargetStyleDetail(target)
    setSkuDrafts(autoMapDrafts(clearedDrafts, target.variants || []))
  }

  const updateSku = (mappingId: string, changes: Partial<StyleGovernanceSkuMapping>) => {
    setSkuDrafts((current) => ({ ...current, [mappingId]: { ...current[mappingId], ...changes } }))
  }

  const draftValidation = useMemo(() => {
    const drafts = Object.values(skuDrafts)
    if (decisionMode === 'KEEP_SEPARATE') return { valid: true, incompleteCount: 0 }
    if (decisionMode === 'MERGE_TO_EXISTING') {
      const incompleteCount = drafts.filter((sku) => !getSkuDraftState(decisionMode, sku).valid).length
      return { valid: Boolean(targetStyleId) && incompleteCount === 0, incompleteCount }
    }
    const incompleteCount = drafts.filter((sku) => !getSkuDraftState(decisionMode, sku).valid).length
    return {
      valid: Boolean(factoryStyleNo.trim()) && hasHanText(factoryStyleName) && !hasCyrillicText(factoryStyleName) && incompleteCount === 0,
      incompleteCount,
    }
  }, [decisionMode, factoryStyleName, factoryStyleNo, skuDrafts, targetStyleId])

  const buildPayload = (): StyleGovernanceDraftPayload | null => {
    if (!detail) return null
    if (decisionMode === 'MERGE_TO_EXISTING' && !targetStyleId) {
      message.warning('请选择要关联的工厂款式')
      return null
    }
    if (decisionMode === 'CONVERT_IN_PLACE' && !factoryStyleName.trim()) {
      message.warning('请填写工厂使用的中文款名')
      return null
    }
    if (decisionMode === 'CONVERT_IN_PLACE' && (!hasHanText(factoryStyleName) || hasCyrillicText(factoryStyleName))) {
      message.warning('工厂款名必须填写可用于生产识别的中文名称，不能沿用 Ozon 俄文名称')
      return null
    }
    if (decisionMode === 'CONVERT_IN_PLACE' && !factoryStyleNo.trim()) {
      message.warning('请填写工厂款号')
      return null
    }
    if (!draftValidation.valid) {
      message.warning(decisionMode === 'MERGE_TO_EXISTING'
        ? `还有 ${draftValidation.incompleteCount} 个 Ozon 规格未选择对应的工厂规格`
        : `还有 ${draftValidation.incompleteCount} 个规格的工厂颜色或尺码待补充，不能直接沿用俄文平台值`)
      return null
    }
    return {
      version: detail.version,
      decisionMode,
      targetStyleId: decisionMode === 'MERGE_TO_EXISTING' ? Number(targetStyleId) : undefined,
      factoryStyleName: decisionMode === 'CONVERT_IN_PLACE' ? factoryStyleName.trim() : undefined,
      factoryStyleNo: decisionMode === 'CONVERT_IN_PLACE' ? factoryStyleNo.trim() : undefined,
      reviewNote: reviewNote.trim() || undefined,
      skuMappings: Object.values(skuDrafts).map((sku) => ({
        mappingId: sku.mappingId,
        factoryVariantId: sku.factoryVariantId ? Number(sku.factoryVariantId) : undefined,
        factoryColor: sku.factoryColor || undefined,
        factorySize: sku.factorySize || undefined,
        factorySkuNo: sku.factorySkuNo || undefined,
        platformSizeSystem: sku.platformSizeSystem || undefined,
      })),
    }
  }

  const saveDecision = async () => {
    if (!batch || !detail) return
    const payload = buildPayload()
    if (!payload) return
    setSaving(true)
    try {
      const saved = await styleCompatibilityApi.saveDecision(batch.batchId, detail.itemId, payload)
      setDetail(saved)
      message.success('治理决策已保存')
      await loadItems()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存治理决策失败')
    } finally {
      setSaving(false)
    }
  }

  const startScan = async () => {
    if (!scanAccounts.length) {
      message.warning('请选择至少一个 Ozon 店铺')
      return
    }
    setScanSubmitting(true)
    try {
      const created = await styleCompatibilityApi.createBatch({ channelAccountIds: scanAccounts.map(Number), scope: scanScope })
      setBatch(created)
      setSummary(null)
      setRows([])
      setScanOpen(false)
      await loadItems(created, 1, pageSize, filters)
      message.success('历史款式扫描已完成，治理清单已更新')
    } finally {
      setScanSubmitting(false)
    }
  }

  const bulkConfirm = async () => {
    if (!batch) return
    const eligible = rows.filter((row) => selectedKeys.includes(row.itemId) && canBulkConfirm(row)).map((row) => row.itemId)
    if (!eligible.length) {
      message.warning('所选款式仍需人工核对')
      return
    }
    const result = await styleCompatibilityApi.bulkConfirm(batch.batchId, eligible)
    message.success(`已确认 ${result.successCount} 款${result.skippedCount ? `，另有 ${result.skippedCount} 款需继续核对` : ''}`)
    await loadItems()
  }

  const createPreview = async () => {
    if (!batch) return
    setPreviewLoading(true)
    try {
      setPreview(await styleCompatibilityApi.createPreview(batch.batchId, selectedKeys.length ? selectedKeys.map(String) : undefined))
      setPreviewChecked(false)
      setExecution(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const execute = async () => {
    if (!batch || !preview) return
    const result = await styleCompatibilityApi.execute(batch.batchId, preview.previewId)
    setExecution(result)
    message.success('治理任务已提交')
    await loadItems()
  }

  const metrics = [
    { label: '全部', value: summary?.total || 0, status: undefined },
    { label: '可直接确认', value: summary?.ready || 0, status: 'READY' as const },
    { label: '需人工核对', value: summary?.reviewRequired || 0, status: 'REVIEW_REQUIRED' as const },
    { label: '冲突阻塞', value: summary?.conflict || 0, status: 'CONFLICT' as const },
    { label: '待补工厂资料', value: summary?.noCandidate || 0, status: 'NO_CANDIDATE' as const },
    { label: '已完成', value: summary?.completed || 0, status: 'COMPLETED' as const },
  ]

  const selectedCandidate = detail?.candidates.find((candidate) => candidate.styleId === targetStyleId)
  const linkedFactoryStyle = targetStyleId ? {
    styleNo: targetStyleDetail?.styleNo || selectedCandidate?.styleNo || detail?.candidateStyleNo,
    styleName: targetStyleDetail?.styleName || selectedCandidate?.styleName || detail?.candidateStyleName,
    imageUrl: targetStyleDetail?.coverImageUrl || selectedCandidate?.imageUrl,
  } : null
  const factoryNumberLabel = linkedFactoryStyle
    ? '工厂款号'
    : decisionMode === 'CONVERT_IN_PLACE'
      ? '拟建工厂款号'
      : factoryStyleNo
        ? '建议工厂款号'
        : '工厂款号'

  const columns: ColumnsType<StyleGovernanceItemSummary> = [
    {
      title: '状态', dataIndex: 'status', width: 104,
      render: (value: string, record) => <Space direction="vertical" size={2}><Tag color={statusMeta[value]?.color}>{statusMeta[value]?.label || value}</Tag>{record.riskLevel === 'HIGH' ? <Tag color="red">优先</Tag> : null}</Space>,
    },
    {
      title: 'Ozon 渠道款档',
      render: (_, record) => <Space align="start"><Thumb src={record.platformImageUrl} name={record.platformTitle} /><div className="scg-product-copy"><Text strong ellipsis={{ tooltip: record.platformTitle }}>{record.platformTitle || '未命名商品'}</Text><Text type="secondary">{record.shopName || getShopLabel(accounts.find((item) => item.id === record.channelAccountId))}</Text><Space size={4} wrap><Tag color="geekblue">SPU {record.platformSpuId || record.platformStyleId || '--'}</Tag><Text type="secondary">渠道款号 {record.platformStyleNo || '--'}</Text></Space></div></Space>,
    },
    {
      title: '工厂款式关联', width: 230,
      render: (_, record) => <Space direction="vertical" size={2}><Text strong>{record.candidateStyleNo || '待建立关联'}</Text><Text type="secondary" ellipsis={{ tooltip: record.candidateStyleName }}>{record.candidateStyleName || '尚未选择工厂款式'}</Text>{record.confidence != null ? <Text type="secondary">匹配度 {Math.round(record.confidence * 100)}%</Text> : null}</Space>,
    },
    {
      title: '三级关联进度', width: 158,
      render: (_, record) => <Space direction="vertical" size={2}><Text>款式 {record.candidateStyleId ? '1/1' : '0/1'}</Text><Text type="secondary">颜色 {ratio(record.colorMappedCount, record.colorTotalCount)} · SKU {ratio(record.skuMappedCount, record.skuTotalCount)}</Text></Space>,
    },
    {
      title: '待处理问题', width: 180,
      render: (_, record) => <Space direction="vertical" size={2}>{record.conflictCount ? <Text type="danger" ellipsis={{ tooltip: record.conflictSummary }}>{record.conflictSummary || `${record.conflictCount} 项待处理`}</Text> : <Text type="secondary">无阻塞项</Text>}<Text type="secondary">{formatDateTime(record.updatedAt)}</Text></Space>,
    },
    { title: '操作', width: 72, render: (_, record) => <Button type="link" onClick={() => void openDetail(record.itemId)}>核对</Button> },
  ]

  const skuColumns: ColumnsType<StyleGovernanceSkuMapping> = [
    {
      title: 'Ozon SKU / 卖家货号', width: 245,
      render: (_, sku) => <Space direction="vertical" size={1}><Text copyable={{ text: sku.platformSkuId || '' }}>SKU {sku.platformSkuId || '--'}</Text><Text type="secondary" copyable={{ text: sku.sellerSkuCode || sku.platformSkuCode || '' }}>卖家货号 {sku.sellerSkuCode || sku.platformSkuCode || '--'}</Text></Space>,
    },
    {
      title: 'Ozon 销售规格', width: 205,
      render: (_, sku) => <div className="scg-channel-spec"><Text>{sku.platformColor || '--'} / <Text strong>{sku.platformSize || '--'}</Text></Text><Select size="small" value={skuDrafts[sku.mappingId]?.platformSizeSystem || 'OZON'} options={[
        { label: '俄罗斯', value: 'RU' },
        { label: '欧洲', value: 'EU' },
        { label: '厂家标注', value: 'MANUFACTURER' },
        { label: 'Ozon 展示', value: 'OZON' },
      ]} onChange={(value) => updateSku(sku.mappingId, { platformSizeSystem: value })} /></div>,
    },
    {
      title: '工厂颜色 / 尺码', width: 190,
      render: (_, sku) => decisionMode === 'CONVERT_IN_PLACE' ? <div className="scg-factory-spec-inputs"><Input size="small" value={skuDrafts[sku.mappingId]?.factoryColor ?? ''} onChange={(event) => updateSku(sku.mappingId, { factoryColor: event.target.value })} placeholder="中文颜色" /><Input size="small" value={skuDrafts[sku.mappingId]?.factorySize ?? ''} onChange={(event) => updateSku(sku.mappingId, { factorySize: event.target.value })} placeholder="工厂尺码" /></div> : <Text>{skuDrafts[sku.mappingId]?.factoryColor || '--'} / <Text strong>{skuDrafts[sku.mappingId]?.factorySize || '--'}</Text></Text>,
    },
    {
      title: '工厂 SKU', width: 285,
      render: (_, sku) => decisionMode === 'MERGE_TO_EXISTING' ? (
        <Select
          size="small"
          value={skuDrafts[sku.mappingId]?.factoryVariantId}
          placeholder="选择对应的工厂 SKU"
          style={{ width: '100%' }}
          options={(targetStyleDetail?.variants || []).map((variant) => ({ value: variant.id, label: `${variant.color || '无颜色'} / ${variant.size || '无尺码'} · ${variant.systemSkuNo || variant.skuNo || '--'}` }))}
          onChange={(value) => {
            const variant = targetStyleDetail?.variants?.find((item) => item.id === value)
            updateSku(sku.mappingId, { factoryVariantId: value, factoryColor: variant?.color, factorySize: variant?.size, systemSkuNo: variant?.systemSkuNo })
          }}
        />
      ) : decisionMode === 'CONVERT_IN_PLACE' ? <Input size="small" value={skuDrafts[sku.mappingId]?.factorySkuNo ?? ''} onChange={(event) => updateSku(sku.mappingId, { factorySkuNo: event.target.value })} placeholder="可留空，由工厂规则生成" /> : <Text type="secondary">暂不关联</Text>,
    },
    { title: '关联结果', width: 108, render: (_, sku) => {
      if (sku.errorMessage) return <Tag color="red">需修正</Tag>
      const state = getSkuDraftState(decisionMode, skuDrafts[sku.mappingId] || sku)
      const source = skuDrafts[sku.mappingId]?.matchSource
      return <Space direction="vertical" size={1}><Tag color={state.color}>{state.label}</Tag>{source ? <Text type="secondary" className="scg-match-source">{source === 'SELLER_SKU_EXACT' ? '卖家货号一致' : source === 'COLOR_SIZE_EXACT' ? '颜色尺码一致' : '人工确认'}</Text> : null}</Space>
    } },
  ]

  return (
    <div className="scg-page">
      <div className="scg-actions">
        <div><Space size={8}><Title level={4}>渠道款式治理</Title><Tag color="blue">Ozon</Tag></Space><Text type="secondary">Ozon 款式独立保存，通过款式、颜色和 SKU 三级关系连接工厂生产资料。</Text></div>
        <Space wrap>
          <Text type="secondary">最近扫描：{formatDateTime(summary?.lastScannedAt)}</Text>
          <Button icon={<ReloadOutlined />} onClick={() => void loadLatest()}>刷新</Button>
          <Button type="primary" icon={<SearchOutlined />} onClick={() => setScanOpen(true)}>{batch ? '重新扫描' : '扫描历史款式'}</Button>
        </Space>
      </div>

      {isRunning(batch) ? <Alert showIcon type="info" message="正在扫描历史款式" description={<Progress percent={batch?.progressPercent ?? Math.round(((batch?.scannedCount || 0) / Math.max(batch?.totalCount || 1, 1)) * 100)} size="small" />} /> : null}

      {!batch && !loading ? (
        <Card className="scg-empty-card"><Empty description="尚未扫描 Ozon 历史款式"><Button type="primary" onClick={() => setScanOpen(true)}>开始扫描</Button></Empty></Card>
      ) : (
        <>
          <div className="scg-metrics">
            {metrics.map((item) => <button type="button" key={item.label} className={`scg-metric${filters.status === item.status ? ' scg-metric--active' : ''}`} onClick={() => applyFilters({ ...filters, status: item.status })}><span>{item.label}</span><strong>{item.value}</strong></button>)}
          </div>
          <Card className="scg-filter-card">
            <div className="scg-filters">
              <Select mode="multiple" allowClear value={filters.channelAccountIds} options={accountOptions} placeholder="选择 Ozon 店铺" maxTagCount="responsive" onChange={(values) => { onAccountChange(values[0]); applyFilters({ ...filters, channelAccountIds: values }) }} />
              <Select allowClear value={filters.riskLevel} placeholder="处理优先级" options={[{ label: '优先处理', value: 'HIGH' }, { label: '一般', value: 'MEDIUM' }, { label: '较低', value: 'LOW' }]} onChange={(value) => applyFilters({ ...filters, riskLevel: value })} />
              <Input.Search allowClear value={keywordInput} placeholder="搜索款号、中文或俄文款名" onChange={(event) => { setKeywordInput(event.target.value); if (!event.target.value) applyFilters({ ...filters, keyword: '' }) }} onSearch={(value) => applyFilters({ ...filters, keyword: value.trim() })} />
              <Button onClick={() => { setKeywordInput(''); applyFilters({ channelAccountIds: selectedAccountId ? [selectedAccountId] : [], keyword: '' }) }}>重置</Button>
            </div>
          </Card>

          <div className="scg-workbench">
            <Card className="scg-table-card">
              <Spin spinning={loading}>
                <Table
                  className="scg-density-table"
                  rowKey="itemId"
                  size="small"
                  columns={columns}
                  dataSource={rows}
                  scroll={{ y: 492 }}
                  tableLayout="fixed"
                  rowClassName={(record) => record.itemId === activeItemId ? 'scg-row-active' : ''}
                  onRow={(record) => ({ onDoubleClick: () => void openDetail(record.itemId) })}
                  rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys, getCheckboxProps: (record) => ({ disabled: record.status === 'COMPLETED' }) }}
                  pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (value) => `共 ${value} 款`, onChange: (nextPage, nextSize) => { setPage(nextPage); setPageSize(nextSize); void loadItems(batch, nextPage, nextSize, filters) } }}
                />
              </Spin>
            </Card>
          </div>
          <div className="scg-selection-bar"><Text>已选 <strong>{selectedKeys.length}</strong> 款</Text><Space><Button disabled={!selectedKeys.length} onClick={() => void bulkConfirm()} icon={<CheckCircleOutlined />}>确认可直接处理项</Button><Button type="primary" disabled={!batch || isRunning(batch)} loading={previewLoading} onClick={() => void createPreview()} icon={<PlayCircleOutlined />}>生成治理预览</Button></Space></div>
        </>
      )}

      <Drawer
        className="scg-governance-drawer"
        title={<div><Text strong>核对渠道款式关联</Text><br /><Text type="secondary">渠道资料与工厂资料独立保存，仅确认三级对应关系</Text></div>}
        width="min(1120px, 100vw)"
        open={Boolean(activeItemId)}
        onClose={() => { setActiveItemId(undefined); setDetail(null) }}
        destroyOnHidden
        footer={<div className="scg-detail-footer"><Button onClick={() => { setActiveItemId(undefined); setDetail(null) }}>稍后处理</Button><Button type="primary" disabled={!draftValidation.valid} loading={saving} onClick={() => void saveDecision()}>保存关联方案</Button></div>}
      >
        <Spin spinning={detailLoading}>
          {detail ? <div className="scg-detail-content">
            <div className="scg-compare">
              <div>
                <Space className="scg-eyebrow" size={6}><Tag color="blue">Ozon</Tag><Text type="secondary">渠道款档（销售使用）</Text></Space>
                <div className="scg-identity"><Thumb src={detail.platformImageUrl} name={detail.platformTitle} /><div className="scg-identity-copy"><Text strong>{detail.platformTitle || '--'}</Text><Space size={[4, 4]} wrap><Tag color="geekblue">SPU {detail.platformSpuId || detail.platformStyleId || '--'}</Tag><Text type="secondary">渠道款号 {detail.platformStyleNo || '--'}</Text></Space><Text type="secondary">{detail.shopName || getShopLabel(accounts.find((item) => item.id === detail.channelAccountId))}</Text></div></div>
              </div>
              <div>
                <Space className="scg-eyebrow" size={6}><Tag color="green">工厂</Tag><Text type="secondary">生产主档（生产使用）</Text></Space>
                <div className="scg-identity"><Thumb src={linkedFactoryStyle?.imageUrl} name={linkedFactoryStyle?.styleName || factoryStyleName} /><div className="scg-identity-copy"><Text strong>{linkedFactoryStyle?.styleName || (decisionMode === 'CONVERT_IN_PLACE' ? factoryStyleName || '拟建工厂款式' : '尚未关联工厂款式')}</Text><Text>{factoryNumberLabel} {linkedFactoryStyle?.styleNo || factoryStyleNo || '--'}</Text><Text type="secondary">渠道名称、图片与属性不会写入生产主档</Text></div></div>
              </div>
            </div>

            {detail.conflicts.length ? <Alert type="error" showIcon message={`${detail.conflicts.filter((item) => item.blocking).length} 项问题会阻止保存`} description={detail.conflicts.map((item) => item.title).join('；')} /> : null}

            <div className="scg-section scg-decision-section">
              <div className="scg-section-title"><div><Text strong>1. 确认款式级关联</Text><br /><Text type="secondary">一个工厂款式可以关联多个店铺、多个平台的渠道款档。</Text></div>{detail.candidates.length === 1 && targetStyleId ? <Tag color="green">唯一候选已默认选择</Tag> : null}</div>
              <Radio.Group className="scg-mode-list" value={decisionMode} onChange={(event) => setDecisionMode(event.target.value)}>{decisionOptions.map((item) => <Radio key={item.value} value={item.value}><Text strong>{item.label}</Text><Text type="secondary" className="scg-mode-desc">{item.description}</Text></Radio>)}</Radio.Group>
              {decisionMode === 'MERGE_TO_EXISTING' ? <div className="scg-target-style-field"><Text strong>工厂款式</Text><Select showSearch filterOption={false} loading={styleSearching} value={targetStyleId} placeholder="按工厂款号或中文款名搜索" options={styleOptions.map((item) => ({ value: item.id, label: `${item.styleNo} / ${item.styleName}` }))} onSearch={(value) => void searchStyles(value)} onChange={(value) => void changeTargetStyle(value)} /><Text type="secondary">选择其他工厂款式时，系统会先按卖家货号，再按颜色尺码自动匹配 SKU。</Text></div> : null}
              {decisionMode === 'CONVERT_IN_PLACE' ? <div className="scg-new-factory-style"><Alert type="info" showIcon message="建立新的工厂生产主档" description="只保存工厂款号、中文款名和生产规格；Ozon 俄文标题、图片、类目和平台属性继续保留在渠道款档。" /><label><Text strong>工厂款号</Text><Input value={factoryStyleNo} onChange={(event) => setFactoryStyleNo(event.target.value)} placeholder="请确认工厂使用的款号" maxLength={64} showCount /></label><label><Text strong>工厂中文款名</Text><Input status={factoryStyleName && (!hasHanText(factoryStyleName) || hasCyrillicText(factoryStyleName)) ? 'error' : undefined} value={factoryStyleName} onChange={(event) => setFactoryStyleName(event.target.value)} placeholder="请输入工厂识别的中文款名" maxLength={120} showCount /></label>{!draftValidation.valid ? <Alert type="warning" showIcon message="工厂资料尚未补全" description={`中文款名、工厂款号以及每个 SKU 的中文颜色和工厂尺码都需确认。当前还有 ${draftValidation.incompleteCount} 个 SKU 待补充。`} /> : null}</div> : null}
            </div>

            <div className="scg-section">
              <div className="scg-section-title"><div><Text strong>2. 确认颜色与 SKU 关联</Text><br /><Text type="secondary">Ozon 与工厂的颜色、尺码可以不同，但每个销售 SKU 必须对应到唯一的实物 SKU。</Text></div><Space size={6}><Tag color="blue">SPU</Tag><span>→</span><Tag color="magenta">SKC</Tag><span>→</span><Tag color="purple">SKU</Tag></Space></div>
              <div className="scg-color-groups">
                {detail.colorGroups.map((group) => {
                  const groupState = mappingStatusLabel(group.status)
                  return <div className="scg-color-group" key={group.groupId}>
                    <div className="scg-color-group-head">
                      <div><Text className="scg-tier-label">Ozon SKC</Text><Space size={[6, 4]} wrap><Tag color="magenta">{group.platformSkcId || group.channelSkcId || '待平台补齐'}</Tag><Text strong>{group.platformColor || '未标颜色'}</Text>{group.sellerSkcCode ? <Text type="secondary">颜色货号 {group.sellerSkcCode}</Text> : null}</Space></div>
                      <span className="scg-map-arrow">→</span>
                      <div><Text className="scg-tier-label">工厂 SKC</Text><Space size={[6, 4]} wrap><Tag color={groupState.color}>{groupState.label}</Tag><Text strong>{group.factorySkcNo || (group.factorySkcId ? `SKC ${group.factorySkcId}` : group.factoryColor ? `颜色 ${group.factoryColor}` : '待关联')}</Text>{group.factorySkcNo || group.factorySkcId ? <Text type="secondary">{group.factoryColor || '--'}</Text> : null}</Space></div>
                    </div>
                    <Table rowKey="mappingId" size="small" columns={skuColumns} dataSource={group.skuMappings} pagination={false} scroll={{ x: 930 }} />
                  </div>
                })}
              </div>
            </div>

            <div className="scg-section"><Text strong>3. 核对备注</Text><Input.TextArea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={2} placeholder="记录颜色、尺码或货号需要后续关注的情况" /></div>
          </div> : (!detailLoading ? <Empty description="未找到款式关联信息" /> : null)}
        </Spin>
      </Drawer>

      <Modal title="扫描 Ozon 历史款式" open={scanOpen} onCancel={() => setScanOpen(false)} onOk={() => void startScan()} okText="开始扫描" confirmLoading={scanSubmitting}>
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Alert type="info" showIcon message="扫描只会生成治理清单，不会立即改动款式资料。" />
          <label><Text strong>Ozon 店铺</Text><Select mode="multiple" value={scanAccounts} options={accountOptions} placeholder="请选择要扫描的店铺" style={{ width: '100%', marginTop: 8 }} onChange={setScanAccounts} /></label>
          <label><Text strong>扫描范围</Text><Radio.Group value={scanScope} onChange={(event) => setScanScope(event.target.value)} style={{ display: 'flex', marginTop: 8 }}><Radio.Button value="UNRESOLVED">仅未完成治理</Radio.Button><Radio.Button value="ALL">全部重新评估</Radio.Button></Radio.Group></label>
        </Space>
      </Modal>

      <Modal title="治理执行预览" open={Boolean(preview)} width={760} onCancel={() => setPreview(null)} footer={null}>
        {preview ? <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Alert type={preview.blockingCount ? 'error' : 'success'} showIcon message={preview.blockingCount ? `仍有 ${preview.blockingCount} 项问题需要处理` : '预览检查通过，可以执行治理'} description={preview.blockingReasons?.join('；')} />
          <Descriptions bordered size="small" column={2} items={[
            { key: 'merge', label: '关联已有工厂款式', children: `${preview.mergeCount} 款` },
            { key: 'convert', label: '新建工厂款式并关联', children: `${preview.convertCount} 款` },
            { key: 'separate', label: '暂不建立关联', children: `${preview.keepSeparateCount} 款` },
            { key: 'profile', label: '保留 Ozon 渠道款档', children: `${preview.channelProfileCount} 款` },
            { key: 'color', label: '建立 SKC 关联', children: `${preview.colorMappingCount} 项` },
            { key: 'sku', label: '建立 SKU 关联', children: `${preview.skuMappingCount} 项` },
            { key: 'archive', label: '归档历史重复工厂档', children: `${preview.archiveCount} 款` },
            { key: 'skip', label: '本次跳过', children: `${preview.skippedCount} 款` },
          ]} />
          {execution ? <Alert type={execution.failedCount ? 'warning' : 'success'} showIcon message={execution.failedCount ? '治理已完成，部分款式需要重试' : '治理已完成'} description={`成功 ${execution.successCount} 款，跳过 ${execution.skippedCount} 款，失败 ${execution.failedCount} 款。工厂端继续使用中文资料，Ozon 端保留俄文展示资料。`} /> : <>
            <Checkbox checked={previewChecked} disabled={preview.blockingCount > 0} onChange={(event) => setPreviewChecked(event.target.checked)}>我已核对本次变更范围和款式对应关系</Checkbox>
            <div className="scg-modal-actions"><Button onClick={() => setPreview(null)}>返回继续核对</Button><Button type="primary" disabled={!preview.readyToExecute || !previewChecked} onClick={() => void execute()}>执行治理</Button></div>
          </>}
        </Space> : null}
      </Modal>
    </div>
  )
}
