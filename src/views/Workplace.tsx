import { Col, Row } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import '../styles/workplace.css';

import type { Announcement, DeliveryItem, WorkplaceStats } from '../types/workplace';
import { workplaceQuickActions } from '../data/workplace';
import { workplaceApi } from '../api/workplace';

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
  const customerPage = customerPagination.current;
  const customerPageSize = customerPagination.pageSize;
  const factoryPage = factoryPagination.current;
  const factoryPageSize = factoryPagination.pageSize;
  const announcementPage = announcementPagination.current;
  const announcementPageSize = announcementPagination.pageSize;

  const loadStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const response = await workplaceApi.getStats();
      setStats(response);
    } catch (error) {
      console.error('failed to load workplace stats', error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);

  const loadCustomerDeliveries = useCallback(async (page: number, pageSize: number) => {
    setLoading(prev => ({ ...prev, customerData: true }));
    try {
      const response = await workplaceApi.getCustomerDeliveries(page, pageSize);
      setCustomerPagination({
        current: response.page,
        pageSize: response.pageSize,
        total: response.total,
      });
      setCustomerDeliveries(response.list);
    } catch (error) {
      console.error('failed to load customer deliveries', error);
    } finally {
      setLoading(prev => ({ ...prev, customerData: false }));
    }
  }, []);

  const loadFactoryDeliveries = useCallback(async (page: number, pageSize: number) => {
    setLoading(prev => ({ ...prev, factoryData: true }));
    try {
      const response = await workplaceApi.getFactoryDeliveries(page, pageSize);
      setFactoryPagination({
        current: response.page,
        pageSize: response.pageSize,
        total: response.total,
      });
      setFactoryDeliveries(response.list);
    } catch (error) {
      console.error('failed to load factory deliveries', error);
    } finally {
      setLoading(prev => ({ ...prev, factoryData: false }));
    }
  }, []);

  const loadAnnouncements = useCallback(async (page: number, pageSize: number) => {
    setLoading(prev => ({ ...prev, announcements: true }));
    try {
      const response = await workplaceApi.getAnnouncements(page, pageSize);
      setAnnouncementPagination({
        current: response.page,
        pageSize: response.pageSize,
        total: response.total,
      });
      setAnnouncements(response.list);
    } catch (error) {
      console.error('failed to load announcements', error);
    } finally {
      setLoading(prev => ({ ...prev, announcements: false }));
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadCustomerDeliveries(customerPage, customerPageSize);
  }, [customerPage, customerPageSize, loadCustomerDeliveries]);

  useEffect(() => {
    loadFactoryDeliveries(factoryPage, factoryPageSize);
  }, [factoryPage, factoryPageSize, loadFactoryDeliveries]);

  useEffect(() => {
    loadAnnouncements(announcementPage, announcementPageSize);
  }, [announcementPage, announcementPageSize, loadAnnouncements]);

  // 客户表格分页处理
  const handleCustomerPaginationChange = (page: number, pageSize: number) => {
    setCustomerPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  // 工厂表格分页处理
  const handleFactoryPaginationChange = (page: number, pageSize: number) => {
    setFactoryPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  // 公告列表分页处理
  const handleAnnouncementPaginationChange = (page: number, pageSize: number) => {
    setAnnouncementPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
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
      <QuickActionsSection quickActions={workplaceQuickActions} />

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
