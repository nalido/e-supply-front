import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Layout, Menu, Breadcrumb, Space, Button } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { menuTree, toAntdMenuItems } from '../menu.config';

const { Header, Sider, Content } = Layout;

const deriveOpenKeys = (pathname: string): string[] => {
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) {
    return [];
  }
  if (segments.length === 1) {
    return [`/${segments[0]}`];
  }
  return segments.slice(0, -1).map((_, index) => `/${segments.slice(0, index + 1).join('/')}`);
};

const MainLayout = () => {
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>(() => deriveOpenKeys(location.pathname));

  const menuItems = useMemo<MenuProps['items']>(() => toAntdMenuItems(menuTree), []);

  const selectedKey = useMemo(() => {
    if (location.pathname === '/sample') {
      return '/sample/overview';
    }
    return location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    setOpenKeys(deriveOpenKeys(location.pathname));
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    const pathSnippets = location.pathname.split('/').filter(Boolean);
    const items: Array<{ title: ReactNode }> = [{ title: <Link to="/">工作台</Link> }];
    if (pathSnippets.length >= 2) {
      items.push({ title: <span>{pathSnippets[0] === 'dashboard' ? '工作台' : pathSnippets[0]}</span> });
      items.push({ title: <span>{pathSnippets[1]}</span> });
    }
    return items;
  }, [location.pathname]);

  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys as string[]);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={208} breakpoint="lg" collapsedWidth={64}>
        <div
          style={{
            height: 48,
            margin: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: '#fff',
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: 1,
          }}
        >
          <img
            src="/assets/images/logo.png"
            alt="易供云"
            style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }}
          />
          易供云
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
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Breadcrumb items={breadcrumbItems} />
          <Space size={12}>
            <SignedOut>
              <SignInButton mode="modal">
                <Button type="primary" size="small" ghost>
                  登录账号
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </Space>
        </Header>
        <Content style={{ margin: 16 }}>
          <div>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
