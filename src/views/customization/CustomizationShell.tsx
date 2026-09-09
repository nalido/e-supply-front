import { AppstoreOutlined, HomeOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ShopOutlined, SkinOutlined } from '@ant-design/icons'
import { UserButton } from '@clerk/clerk-react'
import { Button, Drawer, Grid, Layout, Menu, Space, Tooltip, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import './customization.css'

const { Header, Sider, Content } = Layout

const openWorkspace = (path: string) => window.open(path, '_blank', 'noopener,noreferrer')

const CustomizationShell = () => {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobile = !Grid.useBreakpoint().md

  useEffect(() => {
    document.body.classList.add('pod-workspace-body')
    return () => document.body.classList.remove('pod-workspace-body')
  }, [])
  const selectedKey = location.pathname.startsWith('/customization/templates') ? '/customization/templates'
    : location.pathname.startsWith('/customization/styles') ? '/customization/styles' : '/customization/workbench'

  const navigation = [
    { key: '/customization/workbench', icon: <HomeOutlined />, label: <Link to="/customization/workbench" onClick={() => setMobileOpen(false)}>工作台</Link> },
    { key: '/customization/templates', icon: <SkinOutlined />, label: <Link to="/customization/templates" onClick={() => setMobileOpen(false)}>款式模板</Link> },
    { key: '/customization/styles', icon: <AppstoreOutlined />, label: <Link to="/customization/styles" onClick={() => setMobileOpen(false)}>设计款式</Link> },
  ]

  return (
    <Layout className="pod-shell">
      <Sider width={248} collapsedWidth={76} collapsed={collapsed} className="pod-sider" trigger={null}>
        <Link className="pod-brand" to="/customization/workbench" aria-label="定制商品工作台首页">
          <span className="pod-brand__mark">P</span>
          {!collapsed && <span><b>POD Studio</b><small>定制商品工作台</small></span>}
        </Link>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navigation}
        />
        {!collapsed && <div className="pod-sider__note"><b>设计与生产隔离</b><span>审核通过的设计仍会保持独立，待平台订单进入后再建立生产关联。</span></div>}
      </Sider>
      <Layout>
        <Header className="pod-header">
          <Space size={12}>
            <Button type="text" icon={mobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => mobile ? setMobileOpen(true) : setCollapsed((value) => !value)} aria-label={mobile ? '打开菜单' : collapsed ? '展开菜单' : '收起菜单'} />
            <Typography.Text className="pod-header__title">让每个创意成为可审核、可销售的商品</Typography.Text>
          </Space>
          <Space>
            <Tooltip title="在新窗口打开工厂端"><Button icon={<ShopOutlined />} onClick={() => openWorkspace('/dashboard/workplace')}>生产端</Button></Tooltip>
            <Tooltip title="在新窗口打开销售中心"><Button icon={<AppstoreOutlined />} onClick={() => openWorkspace('/sale/workbench')}>销售中心</Button></Tooltip>
            <UserButton />
          </Space>
        </Header>
        <Content className="pod-content"><Outlet /></Content>
      </Layout>
      <Drawer title="定制商品工作台" placement="left" width={280} open={mobile && mobileOpen} onClose={() => setMobileOpen(false)} className="pod-mobile-drawer">
        <Menu mode="inline" selectedKeys={[selectedKey]} items={navigation} />
      </Drawer>
    </Layout>
  )
}

export default CustomizationShell
