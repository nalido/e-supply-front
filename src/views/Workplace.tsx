import { 
  Card, 
  Col, 
  Row, 
  Statistic, 
  Table, 
  Typography, 
  Empty, 
  Image,
  Space,
  Button,
  List
} from 'antd';
import {
  AppstoreOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  DollarOutlined,
  CreditCardOutlined,
  TeamOutlined,
  UserAddOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../api/mock';

type DeliveryRow = {
  id: string;
  orderNo: string;
  styleName: string;
  org: string;
  date: string;
  qty: number;
  type?: string;
  image?: string;
};

type QuickActionItem = {
  key: string;
  title: string;
  icon: React.ReactNode;
  count?: number;
};

const columnsFactory = (withType: boolean, withImage: boolean = false): ColumnsType<DeliveryRow> => {
  const base: ColumnsType<DeliveryRow> = [];
  
  if (withImage) {
    base.push({
      title: '图片',
      dataIndex: 'image',
      width: 80,
      render: () => (
        <div style={{ width: 40, height: 40, backgroundColor: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px' }} />
      ),
    });
  }
  
  base.push(
    { title: '工厂订单', dataIndex: 'orderNo', width: 120, ellipsis: true },
    { title: '款式资料', dataIndex: 'styleName', width: 150, ellipsis: true },
    { title: withType ? '加工厂' : '客户', dataIndex: 'org', width: 80 },
    { title: '交货日期', dataIndex: 'date', width: 100 },
    { title: '数量', dataIndex: 'qty', width: 80 }
  );
  
  if (withType) {
    base.push({ title: '加工类型', dataIndex: 'type', width: 100, ellipsis: true });
  }
  
  return base;
};

const dataFactory = (n: number, withType: boolean, withImage: boolean = false): DeliveryRow[] => {
  const orderPrefixes = ['202502170', 'ET0032-02-', 'ET0036-02-', '永春', 'ET0297-03-'];
  const styleNames = [
    '儿童度假风套装ET0264',
    '儿童网眼布拼接织带开角套装ET0228', 
    '儿童华夫格纯色圆领短袖套ET0220',
    '华夫格短裤ET0302',
    '迷彩口袋拼接T恤套装AC011',
    '儿童拉毛卫裤X106',
    '儿童羊羔毛拉链卫衣ET0032',
    '儿童拼接拉链连帽卫衣套装ET0036',
    '男童白棕色块拼接休闲短袖上衣+短裤ET0297'
  ];
  const orgs = ['本厂', '睿宗李总', '刘国华', '石狮'];
  const types = ['车缝', '打扣', '激光开袋', '线稿图', '包装', '面料到货时间'];
  
  return Array.from({ length: n }).map((_, i) => ({
    id: `${i}`,
    orderNo: `${orderPrefixes[i % orderPrefixes.length]}${String(i + 1).padStart(3, '0')}`,
    styleName: styleNames[i % styleNames.length],
    org: orgs[i % orgs.length],
    date: dayjs().add(i % 20 - 5, 'day').format('YYYY-MM-DD'),
    qty: [60, 75, 100, 150, 270, 280, 375, 624, 1620, 1740, 1848][i % 11],
    type: withType ? types[i % types.length] : undefined,
    image: withImage ? `/api/placeholder/40/40?text=${i + 1}` : undefined,
  }));
};

// 快速入口配置
const quickActions: QuickActionItem[] = [
  { key: 'style', title: '款式', icon: <AppstoreOutlined /> },
  { key: 'sample', title: '样板单', icon: <FileTextOutlined /> },
  { key: 'order', title: '工厂订单', icon: <ShoppingOutlined /> },
  { key: 'receivable', title: '客户收款', icon: <DollarOutlined /> },
  { key: 'payable-factory', title: '加工厂付款', icon: <CreditCardOutlined /> },
  { key: 'payable-supplier', title: '供应商付款', icon: <CreditCardOutlined /> },
  { key: 'users', title: '用户管理', icon: <TeamOutlined /> },
  { key: 'recruitment', title: '入职申请', icon: <UserAddOutlined /> },
];

const Workplace = () => {
  // 生成模拟数据
  const factoryData = dataFactory(15, true, true);
  const customerData = dataFactory(0, false, true); // 空数据

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* 顶部统计显示 */}
      <div style={{ 
        background: '#fff', 
        padding: '20px', 
        marginBottom: '24px', 
        borderRadius: '6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <Row gutter={[48, 0]}>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', lineHeight: '32px' }}>
                332010
                <span style={{ fontSize: '14px', color: '#999', marginLeft: '4px' }}>件</span>
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                新单
                <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>年</span>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', lineHeight: '32px' }}>
                379
                <span style={{ fontSize: '14px', color: '#999', marginLeft: '4px' }}>款</span>
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                打板
                <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>年</span>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', lineHeight: '32px' }}>
                820233
                <span style={{ fontSize: '14px', color: '#999', marginLeft: '4px' }}>件</span>
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                生产进行
                <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>年</span>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', lineHeight: '32px' }}>
                591501
                <span style={{ fontSize: '14px', color: '#999', marginLeft: '4px' }}>件</span>
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                已出货
                <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>年</span>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* 快速入口 */}
      <div style={{ 
        background: '#fff', 
        padding: '20px 0', 
        marginBottom: '24px', 
        borderRadius: '6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <Row gutter={[0, 16]}>
          {quickActions.map((action) => (
            <Col xs={6} sm={6} md={3} lg={3} key={action.key}>
              <div 
                style={{ 
                  textAlign: 'center', 
                  padding: '20px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRight: quickActions.indexOf(action) % 4 !== 3 ? '1px solid #f0f0f0' : 'none'
                }}
                className="quick-action-item"
              >
                <div 
                  className="quick-action-icon"
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '20px', color: '#666', transition: 'color 0.2s' }}>
                    {action.icon}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#333', lineHeight: '20px' }}>
                  {action.title}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* 三个表格区域横向排列 */}
      <Row gutter={[24, 24]}>
        {/* 7天待交货列表（客户） */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Typography.Title level={5} style={{ margin: 0 }}>
                7天待交货列表（客户）
              </Typography.Title>
            }
            style={{ height: '100%' }}
          >
            <Table
              rowKey="id"
              columns={columnsFactory(false, true)}
              dataSource={customerData}
              pagination={{ 
                pageSize: 5,
                showTotal: (total) => `共 ${total} 条`,
                size: 'small',
                simple: true
              }}
              locale={{ emptyText: <Empty description="无数据" /> }}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>

        {/* 7天待交货列表（加工厂） */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Typography.Title level={5} style={{ margin: 0 }}>
                7天待交货列表（加工厂）
              </Typography.Title>
            }
            style={{ height: '100%' }}
          >
            <Table 
              rowKey="id" 
              columns={columnsFactory(true, true)} 
              dataSource={factoryData} 
              pagination={{ 
                pageSize: 5,
                showTotal: (total) => `共 ${total} 条`,
                size: 'small',
                simple: true
              }}
              size="small"
              scroll={{ x: true }}
            />
          </Card>
        </Col>

        {/* 公告板块 */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  <NotificationOutlined /> 公告
                </Typography.Title>
                <Button type="primary" size="small">
                  发布
                </Button>
              </Space>
            }
            style={{ height: '100%' }}
          >
            <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="暂无公告" />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Workplace;


