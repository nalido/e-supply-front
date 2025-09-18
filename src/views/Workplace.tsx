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
  Pagination,
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
      fixed: 'left',
      render: (image) => (
        <Avatar src={image} size={40} shape="square" />
      ),
    },
    { 
      title: '工厂订单', 
      dataIndex: 'orderNo', 
      width: 120, 
      fixed: 'left',
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
      width: 120,
      ellipsis: true 
    },
    { 
      title: '交货日期', 
      dataIndex: 'date', 
      width: 100 
    },
    { 
      title: '数量', 
      dataIndex: 'qty', 
      width: 80,
      render: (value) => (
        <span>{value?.toLocaleString()}</span>
      )
    },
    {
      title: '单价',
      dataIndex: 'price',
      width: 100,
      render: () => (
        <span>¥{(Math.random() * 50 + 10).toFixed(2)}</span>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (_, record) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          ¥{(record.qty * (Math.random() * 50 + 10)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: () => {
        const statuses = ['待生产', '生产中', '待交货', '已完成'];
        const colors = ['orange', 'blue', 'gold', 'green'];
        const randomIndex = Math.floor(Math.random() * statuses.length);
        return (
          <span style={{ color: colors[randomIndex] }}>
            {statuses[randomIndex]}
          </span>
        );
      }
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      render: () => {
        const remarks = ['紧急订单', '优质客户', '特殊工艺', '无特殊要求', '需要加急'];
        return remarks[Math.floor(Math.random() * remarks.length)];
      }
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
  const [allCustomerDeliveries, setAllCustomerDeliveries] = useState<DeliveryItem[]>([]);
  const [allFactoryDeliveries, setAllFactoryDeliveries] = useState<DeliveryItem[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [customerDeliveries, setCustomerDeliveries] = useState<DeliveryItem[]>([]);
  const [factoryDeliveries, setFactoryDeliveries] = useState<DeliveryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [customerPagination, setCustomerPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [factoryPagination, setFactoryPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [announcementPagination, setAnnouncementPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0
  });
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
    setTimeout(() => {
      const allCustomerData = generateCustomerDeliveryList(100);
      setAllCustomerDeliveries(allCustomerData);
      setCustomerPagination(prev => ({ ...prev, total: allCustomerData.length }));
      // 初始显示第一页数据
      const initialPageSize = 20;
      const initialPageData = allCustomerData.slice(0, initialPageSize);
      setCustomerDeliveries(initialPageData);
      setLoading(prev => ({ ...prev, customerData: false }));
    }, 100);

    // 获取工厂交货数据
    setTimeout(() => {
      const allFactoryData = generateFactoryDeliveryList(100);
      setAllFactoryDeliveries(allFactoryData);
      setFactoryPagination(prev => ({ ...prev, total: allFactoryData.length }));
      // 初始显示第一页数据
      const initialPageSize = 20;
      const initialPageData = allFactoryData.slice(0, initialPageSize);
      setFactoryDeliveries(initialPageData);
      setLoading(prev => ({ ...prev, factoryData: false }));
    }, 200);

    // 获取公告数据
    setTimeout(() => {
      const allAnnouncementData = generateAnnouncements(50);
      setAllAnnouncements(allAnnouncementData);
      setAnnouncementPagination(prev => ({ ...prev, total: allAnnouncementData.length }));
      // 初始显示第一页数据
      const initialPageSize = 12;
      const initialPageData = allAnnouncementData.slice(0, initialPageSize);
      setAnnouncements(initialPageData);
      setLoading(prev => ({ ...prev, announcements: false }));
    }, 150);
  }, []);

  // 客户表格分页处理
  const handleCustomerPaginationChange = (page: number, pageSize: number) => {
    const total = allCustomerDeliveries.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const adjustedPage = Math.min(page, maxPage);
    
    const newPagination = { current: adjustedPage, pageSize, total };
    setCustomerPagination(newPagination);
    
    const startIndex = (adjustedPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setCustomerDeliveries(allCustomerDeliveries.slice(startIndex, endIndex));
  };

  // 工厂表格分页处理
  const handleFactoryPaginationChange = (page: number, pageSize: number) => {
    const total = allFactoryDeliveries.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const adjustedPage = Math.min(page, maxPage);
    
    const newPagination = { current: adjustedPage, pageSize, total };
    setFactoryPagination(newPagination);
    
    const startIndex = (adjustedPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setFactoryDeliveries(allFactoryDeliveries.slice(startIndex, endIndex));
  };

  // 公告列表分页处理
  const handleAnnouncementPaginationChange = (page: number, pageSize: number) => {
    const total = allAnnouncements.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const adjustedPage = Math.min(page, maxPage);
    
    const newPagination = { current: adjustedPage, pageSize, total };
    setAnnouncementPagination(newPagination);
    
    const startIndex = (adjustedPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setAnnouncements(allAnnouncements.slice(startIndex, endIndex));
  };

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
            style={{ minHeight: '550px', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, padding: '16px' }}
            loading={loading.customerData}
          >
            <Table
              rowKey="id"
              columns={createColumns(false)}
              dataSource={customerDeliveries}
              pagination={{
                current: customerPagination.current,
                pageSize: customerPagination.pageSize,
                total: customerPagination.total,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                size: 'small',
                simple: false,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: handleCustomerPaginationChange,
                onShowSizeChange: handleCustomerPaginationChange
              }}
              locale={{ emptyText: <Empty description="无数据" /> }}
              size="small"
              scroll={{ x: 1200, y: 350 }}
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
            style={{ minHeight: '550px', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, padding: '16px' }}
            loading={loading.factoryData}
          >
            <Table 
              rowKey="id" 
              columns={createColumns(true)} 
              dataSource={factoryDeliveries} 
              pagination={{
                current: factoryPagination.current,
                pageSize: factoryPagination.pageSize,
                total: factoryPagination.total,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                size: 'small',
                simple: false,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: handleFactoryPaginationChange,
                onShowSizeChange: handleFactoryPaginationChange
              }}
              size="small"
              scroll={{ x: 1300, y: 350 }}
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
            style={{ minHeight: '550px', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, padding: '16px' }}
            loading={loading.announcements}
          >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {announcements.length > 0 ? (
                <>
                  <div 
                    style={{ 
                      flex: 1,
                      maxHeight: '360px',
                      minHeight: '200px',
                      marginBottom: '16px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      paddingRight: '4px'
                    }}
                    className="announcement-content-container"
                  >
                    {announcements.map(item => (
                      <div 
                        key={item.id} 
                        style={{ 
                          padding: '12px 0',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        className="announcement-item"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <Typography.Text strong ellipsis style={{ maxWidth: '70%' }}>
                            {item.title}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.createTime}
                          </Typography.Text>
                        </div>
                        <Typography.Paragraph 
                          ellipsis={{ rows: 2, tooltip: item.content }} 
                          type="secondary"
                          style={{ marginBottom: '8px' }}
                        >
                          {item.content}
                        </Typography.Paragraph>
                        <div style={{ textAlign: 'right' }}>
                          <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
                            {item.author}
                          </Typography.Text>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                    <Pagination
                      current={announcementPagination.current}
                      pageSize={announcementPagination.pageSize}
                      total={announcementPagination.total}
                      showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                      size="small"
                      simple={false}
                      showSizeChanger={true}
                      pageSizeOptions={['8', '12', '16', '20']}
                      onChange={handleAnnouncementPaginationChange}
                      onShowSizeChange={handleAnnouncementPaginationChange}
                    />
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '360px' }}>
                  <Empty description="暂无公告" />
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Workplace;


