import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Layout, Menu, Breadcrumb, Space, Button } from 'antd'
import type { MenuProps } from 'antd'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { menuTree, toAntdMenuItems, type MenuNode } from '../menu.config'

const { Header, Sider, Content } = Layout

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

const LABEL_MAP = buildLabelMap(menuTree)

const MainLayout = () => {
  const location = useLocation()
  const [openKeys, setOpenKeys] = useState<string[]>(() => deriveOpenKeys(location.pathname))
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = useMemo<MenuProps['items']>(() => toAntdMenuItems(menuTree), [])

  const selectedKey = useMemo(() => {
    if (location.pathname === '/sample') return '/sample/list'
    return location.pathname
  }, [location.pathname])

  useEffect(() => {
    setOpenKeys(deriveOpenKeys(location.pathname))
  }, [location.pathname])

  const breadcrumbItems = useMemo(() => {
    const pathSnippets = location.pathname.split('/').filter(Boolean)
    const paths = pathSnippets.map((_segment, index) => `/${pathSnippets.slice(0, index + 1).join('/')}`)
    const breadcrumbPaths = paths.slice(0, -1)

    if (breadcrumbPaths.length === 0 && paths[0]) {
      const label = LABEL_MAP.get(paths[0]) ?? pathSnippets[0]
      return [{ title: <span>{label}</span> }]
    }

    return breadcrumbPaths.map((path, index) => {
      const label = LABEL_MAP.get(path) ?? pathSnippets[index]
      const isLast = index === breadcrumbPaths.length - 1
      return {
        title: isLast ? <span>{label}</span> : <Link to={path}>{label}</Link>,
      }
    })
  }, [location.pathname])

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys as string[])
  }

  return (
    <Layout className="oc-app-shell">
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
      <Layout className="oc-main">
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
          <Space size={12}>
            <SignedOut>
              <SignInButton mode="modal">
                <Button type="primary">登录账号</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </Space>
        </Header>
        <Content className="oc-content">
          <div className="oc-content__inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
