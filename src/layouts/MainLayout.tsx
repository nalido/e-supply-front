import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Layout, Menu, Breadcrumb, Space, Button, Badge, Tooltip, message, notification, Alert } from 'antd'
import type { ArgsProps } from 'antd/es/message'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { Outlet, useLocation, Link, useNavigate, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { FolderOpenFilled, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { pieceworkService } from '../api/piecework'
import settingsApi from '../api/settings'
import { useTenant } from '../contexts/tenant'
import { REPORT_DOWNLOAD_LABELS } from '../constants/report-downloads'
import { menuTree, toAntdMenuItems, type MenuNode } from '../menu.config'
import { subscribeDownloadCenterHint, triggerDownloadCenterHint } from '../utils/download-center-hint'
import { PREFERENCE_UPDATED_EVENT, type PreferenceUpdatedDetail } from '../utils/preference-events'
import AiAgentFloatingWidget from '../modules/ai-agent/ui/AiAgentFloatingWidget'

const { Header, Sider, Content } = Layout
const DOWNLOAD_CENTER_PATH = '/downloads'
const DOWNLOAD_POLL_INTERVAL_MS = 45000
const DOWNLOAD_CENTER_HINT_DURATION_MS = 1400

const deriveOpenKeys = (pathname: string): string[] => {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return []
  return segments.slice(0, -1).map((_, index) => `/${segments.slice(0, index + 1).join('/')}`)
}

const readNodeLabel = (label: ReactNode): string => {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object' && 'props' in label) {
    const maybeChildren = (label as { props?: { children?: ReactNode } }).props?.children
    if (typeof maybeChildren === 'string') return maybeChildren
  }
  return '页面'
}

const buildLabelMap = (nodes: MenuNode[], map = new Map<string, string>()) => {
  nodes.forEach((node) => {
    map.set(node.key, readNodeLabel(node.label))
    if (node.children) buildLabelMap(node.children, map)
  })
  return map
}

const DOWNLOAD_CENTER_HINT_KEYWORDS = ['下载中心', '已生成导出文件', '导出任务已生成', '已生成导出任务', '导出任务已创建']

const resolveMessageContentText = (content: unknown): string => {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object' && 'props' in content) {
    const maybeChildren = (content as { props?: { children?: ReactNode } }).props?.children
    if (typeof maybeChildren === 'string') return maybeChildren
  }
  return ''
}

const shouldHintDownloadCenter = (args: unknown[]): boolean => {
  const [firstArg] = args
  if (typeof firstArg === 'string') {
    return DOWNLOAD_CENTER_HINT_KEYWORDS.some((keyword) => firstArg.includes(keyword))
  }
  if (firstArg && typeof firstArg === 'object' && 'content' in firstArg) {
    const config = firstArg as ArgsProps
    const content = resolveMessageContentText(config.content)
    return DOWNLOAD_CENTER_HINT_KEYWORDS.some((keyword) => content.includes(keyword))
  }
  return false
}

const asBooleanPreference = (value: unknown, fallback = true): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return fallback
}

const MainLayout = () => {
  const { overview } = useTenant()
  const location = useLocation()
  const navigate = useNavigate()
  const [openKeys, setOpenKeys] = useState<string[]>(() => deriveOpenKeys(location.pathname))
  const [collapsed, setCollapsed] = useState(false)
  const [downloadNoticeCount, setDownloadNoticeCount] = useState(0)
  const [isDownloadCenterAnimating, setIsDownloadCenterAnimating] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [notificationApi, notificationContextHolder] = notification.useNotification()
  const hasInitializedDownloadPoll = useRef(false)
  const knownDownloadIdsRef = useRef<Set<string>>(new Set())
  const downloadHintTimerRef = useRef<number | null>(null)

  const menuNodes = useMemo<MenuNode[]>(() => menuTree, [])
  const menuItems = useMemo<MenuProps['items']>(() => toAntdMenuItems(menuNodes), [menuNodes])
  const labelMap = useMemo(() => {
    const map = buildLabelMap(menuNodes)
    map.set(DOWNLOAD_CENTER_PATH, '下载中心')
    return map
  }, [menuNodes])
  const isDownloadCenterOpen = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return (
      location.pathname === DOWNLOAD_CENTER_PATH ||
      (location.pathname === '/piecework/report' && searchParams.get('view') === 'download-records')
    )
  }, [location.pathname, location.search])
  const requiresUpgrade = overview.billing.upgradeRequired
  const showTrialBanner =
    (overview.billing.status === 'trial' || overview.billing.status === 'expired') &&
    location.pathname !== '/settings/company'
  const billingBanner = useMemo(() => {
    if (overview.billing.status === 'expired') {
      return {
        type: 'error' as const,
        message: '试用已到期，当前仅保留授权与企业查看能力',
        description: overview.billing.upgradeContactWechat
          ? '请前往“我的企业”页面扫码联系管理员，获取授权码后完成转正式。'
          : '请前往“我的企业”页面获取联系方式与授权指引，完成转正式。',
      }
    }
    return {
      type: 'info' as const,
      message: `当前企业处于试用期，还剩 ${overview.billing.trialDaysRemaining} 天`,
      description: overview.billing.trialEndsAt
        ? `截止时间：${dayjs(overview.billing.trialEndsAt).format('YYYY-MM-DD HH:mm')}。线下付款后可在“我的企业”页面输入授权码转正式。`
        : '线下付款后可在“我的企业”页面输入授权码转正式。',
    }
  }, [overview.billing])

  const selectedKey = useMemo(() => {
    if (location.pathname === '/sample') return '/sample/list'
    return location.pathname
  }, [location.pathname])

  useEffect(() => {
    const onPreferenceUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<PreferenceUpdatedDetail>
      const detail = customEvent.detail
      if (!detail || detail.key !== 'ai-agent-enabled') {
        return
      }
      const enabled = asBooleanPreference(detail.value, true)
      setAiEnabled(enabled)
      if (!enabled) {
        setAiPanelOpen(false)
      }
    }
    window.addEventListener(PREFERENCE_UPDATED_EVENT, onPreferenceUpdated as EventListener)
    return () => {
      window.removeEventListener(PREFERENCE_UPDATED_EVENT, onPreferenceUpdated as EventListener)
    }
  }, [])

  useEffect(() => {
    setOpenKeys(deriveOpenKeys(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    const loadAiSwitch = async () => {
      if (requiresUpgrade) {
        setAiEnabled(false)
        setAiPanelOpen(false)
        return
      }
      try {
        const groups = await settingsApi.preferences.list()
        if (cancelled) {
          return
        }
        const item = groups.flatMap((group) => group.items).find((entry) => entry.key === 'ai-agent-enabled')
        const enabled = asBooleanPreference(item?.value, true)
        setAiEnabled(enabled)
        if (!enabled) {
          setAiPanelOpen(false)
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('failed to load ai agent switch', error)
        }
      }
    }
    void loadAiSwitch()
    return () => {
      cancelled = true
    }
  }, [requiresUpgrade])

  useEffect(() => {
    if (isDownloadCenterOpen) {
      setDownloadNoticeCount(0)
    }
  }, [isDownloadCenterOpen])

  useEffect(() => {
    const stopSubscribe = subscribeDownloadCenterHint(() => {
      if (downloadHintTimerRef.current) {
        window.clearTimeout(downloadHintTimerRef.current)
      }
      setIsDownloadCenterAnimating(false)
      window.requestAnimationFrame(() => {
        setIsDownloadCenterAnimating(true)
      })
      downloadHintTimerRef.current = window.setTimeout(() => {
        setIsDownloadCenterAnimating(false)
        downloadHintTimerRef.current = null
      }, DOWNLOAD_CENTER_HINT_DURATION_MS)
    })

    return () => {
      stopSubscribe()
      if (downloadHintTimerRef.current) {
        window.clearTimeout(downloadHintTimerRef.current)
        downloadHintTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const originalSuccess = message.success
    const patchedSuccess = ((...args: unknown[]) => {
      if (shouldHintDownloadCenter(args)) {
        triggerDownloadCenterHint()
      }
      return originalSuccess(...(args as Parameters<typeof message.success>))
    }) as typeof message.success

    message.success = patchedSuccess

    return () => {
      message.success = originalSuccess
    }
  }, [])

  const openDownloadCenter = useCallback(() => {
    setDownloadNoticeCount(0)
    navigate(DOWNLOAD_CENTER_PATH)
  }, [navigate])

  useEffect(() => {
    if (requiresUpgrade) {
      return
    }
    let cancelled = false

    const pollDownloadUpdates = async () => {
      try {
        const response = await pieceworkService.getReportDownloads({
          reportType: 'ALL',
          status: 'COMPLETED',
          page: 1,
          pageSize: 20,
        })
        if (cancelled) {
          return
        }

        const latestIds = response.list.map((item) => item.id).filter(Boolean)
        const knownIds = knownDownloadIdsRef.current
        const newRecords = response.list.filter((item) => item.id && !knownIds.has(item.id))
        latestIds.forEach((id) => knownIds.add(id))

        if (!hasInitializedDownloadPoll.current) {
          hasInitializedDownloadPoll.current = true
          return
        }

        if (!newRecords.length || isDownloadCenterOpen) {
          return
        }

        const latestRecord = newRecords[0]
        const reportLabel =
          latestRecord.reportType ? REPORT_DOWNLOAD_LABELS[latestRecord.reportType] ?? latestRecord.reportType : '导出文件'
        setDownloadNoticeCount((count) => count + newRecords.length)
        notificationApi.success({
          message: `有 ${newRecords.length} 个文件可下载`,
          description: (
            <span>
              {reportLabel} 已生成，可前往
              {' '}
              <Button
                type="link"
                size="small"
                className="oc-download-notice__link"
                onClick={() => {
                  notificationApi.destroy()
                  openDownloadCenter()
                }}
              >
                下载中心
              </Button>
              查看并下载。
            </span>
          ),
          placement: 'topRight',
        })
      } catch (error) {
        if (!cancelled) {
          console.warn('failed to poll download center updates', error)
        }
      }
    }

    void pollDownloadUpdates()
    const timerId = window.setInterval(() => {
      void pollDownloadUpdates()
    }, DOWNLOAD_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [isDownloadCenterOpen, notificationApi, openDownloadCenter, requiresUpgrade])

  const breadcrumbItems = useMemo(() => {
    const pathSnippets = location.pathname.split('/').filter(Boolean)
    const paths = pathSnippets.map((_segment, index) => `/${pathSnippets.slice(0, index + 1).join('/')}`)
    const breadcrumbPaths = paths.slice(0, -1)

    if (breadcrumbPaths.length === 0 && paths[0]) {
      const label = labelMap.get(paths[0]) ?? pathSnippets[0]
      return [{ title: <span>{label}</span> }]
    }

    return breadcrumbPaths.map((path, index) => {
      const label = labelMap.get(path) ?? pathSnippets[index]
      const isLast = index === breadcrumbPaths.length - 1
      return {
        title: isLast ? <span>{label}</span> : <Link to={path}>{label}</Link>,
      }
    })
  }, [labelMap, location.pathname])

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys as string[])
  }

  if (requiresUpgrade && location.pathname !== '/settings/company') {
    return <Navigate to="/settings/company" replace />
  }

  return (
    <Layout className="oc-app-shell">
      {notificationContextHolder}
      <Sider
        width={244}
        breakpoint="lg"
        collapsedWidth={72}
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        className="oc-sider"
      >
        <div className="oc-brand">
          <img src="/assets/images/logo.png" alt="易供云" className="oc-brand__logo" />
          <div className={`oc-brand__text${collapsed ? ' is-collapsed' : ''}`}>
            <div className="oc-brand__title">易供云</div>
            <div className="oc-brand__subtitle">供应链与生产协同平台</div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          items={menuItems}
        />
      </Sider>
      <Layout className={`oc-main${aiPanelOpen ? ' oc-main--ai-open' : ''}`}>
        <div className="oc-main__workspace">
          <Header className="oc-topbar">
            <Space size={12} align="center">
              <Button
                type="text"
                className="oc-topbar__toggle"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? '展开左侧菜单' : '折叠左侧菜单'}
              />
              <Breadcrumb items={breadcrumbItems} />
            </Space>
            <div className="oc-topbar__actions">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button type="primary">登录账号</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="oc-topbar__action-item">
                  <Tooltip title="下载中心" placement="bottom">
                    <Badge count={downloadNoticeCount} size="small" offset={[-2, 2]}>
                      <Button
                        type="text"
                        icon={<FolderOpenFilled />}
                        className={`oc-topbar__download${isDownloadCenterAnimating ? ' is-attention' : ''}`}
                        onClick={openDownloadCenter}
                        aria-label="下载中心"
                      />
                    </Badge>
                  </Tooltip>
                </div>
                <div className="oc-topbar__action-item oc-topbar__avatar">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
            </div>
          </Header>
          <Content className="oc-content">
            <div className="oc-content__inner">
              {showTrialBanner ? (
                <Alert
                  showIcon
                  type={billingBanner.type}
                  message={billingBanner.message}
                  description={billingBanner.description}
                  style={{ marginBottom: 16 }}
                  action={
                    location.pathname !== '/settings/company' ? (
                      <Button type="link" onClick={() => navigate('/settings/company')}>
                        去转正式
                      </Button>
                    ) : undefined
                  }
                />
              ) : null}
              <Outlet />
            </div>
          </Content>
        </div>
        <SignedIn>
          {aiEnabled && !requiresUpgrade ? (
            <AiAgentFloatingWidget
              open={aiPanelOpen}
              onOpen={() => setAiPanelOpen(true)}
              onClose={() => setAiPanelOpen(false)}
            />
          ) : null}
        </SignedIn>
      </Layout>
    </Layout>
  )
}

export default MainLayout
