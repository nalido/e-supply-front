import { Col, Row } from 'antd';
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
  generateCustomerDeliveryList,
  generateFactoryDeliveryList,
  generateAnnouncements
} from '../mock/workplace';

// 引入模块化组件
import {
  StatisticsSection,
  QuickActionsSection,
  DeliveryTableCard,
  AnnouncementCard
} from '../components/workplace';


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

  // 发布公告按钮处理
  const handlePublishClick = () => {
    console.log('发布公告');
  };

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* 顶部统计显示 */}
      <StatisticsSection stats={stats} loading={loading.stats} />

      {/* 快速入口 */}
      <QuickActionsSection quickActions={quickActions} />

      {/* 三个表格区域横向排列 */}
      <Row gutter={[24, 24]}>
        {/* 7天待交货列表（客户） */}
        <Col xs={24} lg={8}>
          <DeliveryTableCard
            title="7天待交货列表（客户）"
            dataSource={customerDeliveries}
            loading={loading.customerData}
            pagination={customerPagination}
            onPaginationChange={handleCustomerPaginationChange}
            withType={false}
          />
        </Col>

        {/* 7天待交货列表（加工厂） */}
        <Col xs={24} lg={8}>
          <DeliveryTableCard
            title="7天待交货列表（加工厂）"
            dataSource={factoryDeliveries}
            loading={loading.factoryData}
            pagination={factoryPagination}
            onPaginationChange={handleFactoryPaginationChange}
            withType={true}
          />
        </Col>

        {/* 公告板块 */}
        <Col xs={24} lg={8}>
          <AnnouncementCard
            announcements={announcements}
            loading={loading.announcements}
            pagination={announcementPagination}
            onPaginationChange={handleAnnouncementPaginationChange}
            onPublishClick={handlePublishClick}
          />
        </Col>
      </Row>
    </div>
  );
};

export default Workplace;


