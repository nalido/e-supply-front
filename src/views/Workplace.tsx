import { 
  Card, 
  Col, 
  Row, 
  Typography, 
  Empty, 
  Table,
  Space,
  Button,
  Avatar,
} from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useState, useEffect } from 'react';
import '../styles/workplace.css';

// 引入类型定义
import type { 
  DeliveryItem, 
  WorkplaceStats, 
  Announcement 
} from '../types/workplace';

// 引入模拟数据
import { 
  quickActions, 
  generateWorkplaceStats,
  fetchPaginatedData,
  generateCustomerDeliveryList,
  generateFactoryDeliveryList,
  generateAnnouncements
} from '../mock/workplace';


/**
 * 创建表格列配置
 */
const createColumns = (withType: boolean): ColumnsType<DeliveryItem> => {
  const columns: ColumnsType<DeliveryItem> = [
    {
      title: '图片',
      dataIndex: 'image',
      width: 80,
      render: (image) => (
        <Avatar src={image} size={40} shape="square" />
      ),
    },
    { 
      title: '工厂订单', 
      dataIndex: 'orderNo', 
      width: 120, 
      ellipsis: true 
    },
    { 
      title: '款式资料', 
      dataIndex: 'styleName', 
      width: 150, 
      ellipsis: true 
    },
    { 
      title: withType ? '加工厂' : '客户', 
      dataIndex: 'org', 
      width: 80 
    },
    { 
      title: '交货日期', 
      dataIndex: 'date', 
      width: 100 
    },
    { 
      title: '数量', 
      dataIndex: 'qty', 
      width: 80 
    },
  ];
  
  if (withType) {
    columns.push({ 
      title: '加工类型', 
      dataIndex: 'type', 
      width: 100, 
      ellipsis: true 
    });
  }
  
  return columns;
};


/**
 * 工作台页面组件
 */
const Workplace = () => {
  // 状态管理
  const [stats, setStats] = useState<WorkplaceStats>({
    newOrders: 0,
    sampleCount: 0,
    inProduction: 0,
    shipped: 0
  });
  const [customerDeliveries, setCustomerDeliveries] = useState<DeliveryItem[]>([]);
  const [factoryDeliveries, setFactoryDeliveries] = useState<DeliveryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState({
    stats: true,
    customerData: true,
    factoryData: true,
    announcements: true
  });

  // 加载数据
  useEffect(() => {
    // 获取统计数据
    setStats(generateWorkplaceStats());
    setLoading(prev => ({ ...prev, stats: false }));

    // 获取客户交货数据
    fetchPaginatedData(() => generateCustomerDeliveryList(15), 1, 5)
      .then(response => {
        setCustomerDeliveries(response.list);
        setLoading(prev => ({ ...prev, customerData: false }));
      });

    // 获取工厂交货数据
    fetchPaginatedData(() => generateFactoryDeliveryList(15), 1, 5)
      .then(response => {
        setFactoryDeliveries(response.list);
        setLoading(prev => ({ ...prev, factoryData: false }));
      });

    // 获取公告数据
    fetchPaginatedData(() => generateAnnouncements(5), 1, 5)
      .then(response => {
        setAnnouncements(response.list);
        setLoading(prev => ({ ...prev, announcements: false }));
      });
  }, []);

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
                {stats.newOrders.toLocaleString()}
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
                {stats.sampleCount.toLocaleString()}
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
                {stats.inProduction.toLocaleString()}
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
                {stats.shipped.toLocaleString()}
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
          {quickActions.map((action, index) => (
            <Col xs={6} sm={6} md={3} lg={3} key={action.key}>
              <div 
                style={{ 
                  textAlign: 'center', 
                  padding: '20px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRight: index % 4 !== 3 ? '1px solid #f0f0f0' : 'none'
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
                  {action.count && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {action.count}
                    </div>
                  )}
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
            loading={loading.customerData}
          >
            <Table
              rowKey="id"
              columns={createColumns(false)}
              dataSource={customerDeliveries}
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
            loading={loading.factoryData}
          >
            <Table 
              rowKey="id" 
              columns={createColumns(true)} 
              dataSource={factoryDeliveries} 
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
            loading={loading.announcements}
          >
            {announcements.length > 0 ? (
              <div style={{ minHeight: '300px' }}>
                {announcements.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      <Typography.Text type="secondary">{item.createTime}</Typography.Text>
                    </div>
                    <Typography.Paragraph ellipsis={{ rows: 2 }} type="secondary">
                      {item.content}
                    </Typography.Paragraph>
                    <div style={{ textAlign: 'right' }}>
                      <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {item.author}
                      </Typography.Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="暂无公告" />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Workplace;


