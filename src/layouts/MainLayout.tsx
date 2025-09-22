import { Layout, Menu, Breadcrumb, theme } from 'antd';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { menuTree, toAntdMenuItems } from '../menu.config';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const location = useLocation();
  const breadcrumbItems = useMemo(() => {
    const pathSnippets = location.pathname.split('/').filter(Boolean);
    const items = [{ title: <Link to="/">工作台</Link> }];
    if (pathSnippets.length >= 2) {
      items.push({ title: pathSnippets[0] === 'dashboard' ? '工作台' : pathSnippets[0] });
      items.push({ title: pathSnippets[1] });
    }
    return items;
  }, [location.pathname]);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={208} breakpoint="lg" collapsedWidth={64}>
        <div style={{ height: 48, margin: 12, color: '#fff', fontWeight: 600 }}>衣协同</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={[`/sample`]}
          items={toAntdMenuItems(menuTree) as any}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Breadcrumb items={breadcrumbItems} />
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ 
            // padding: 12, 
            // background: colorBgContainer, 
            // borderRadius: borderRadiusLG 
            }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;


