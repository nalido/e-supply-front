import { Alert, Button, Card, Col, Row, Space, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/workplace.css'

import type { Announcement, DeliveryItem, WorkplaceStats } from '../types/workplace'
import { workplaceApi } from '../api/workplace'
import { PageHeader } from '../components/page'
import { StatisticsSection, DeliveryTableCard, AnnouncementCard } from '../components/workplace'

const Workplace = () => {
  const [stats, setStats] = useState<WorkplaceStats>({ newOrders: 0, sampleCount: 0, inProduction: 0, shipped: 0 })
  const [customerDeliveries, setCustomerDeliveries] = useState<DeliveryItem[]>([])
  const [factoryDeliveries, setFactoryDeliveries] = useState<DeliveryItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [customerPagination, setCustomerPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [factoryPagination, setFactoryPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [announcementPagination, setAnnouncementPagination] = useState({ current: 1, pageSize: 12, total: 0 })
  const [loading, setLoading] = useState({ stats: true, customerData: true, factoryData: true, announcements: true })

  const customerPage = customerPagination.current
  const customerPageSize = customerPagination.pageSize
  const factoryPage = factoryPagination.current
  const factoryPageSize = factoryPagination.pageSize
  const announcementPage = announcementPagination.current
  const announcementPageSize = announcementPagination.pageSize

  const loadStats = useCallback(async () => {
    setLoading((prev) => ({ ...prev, stats: true }))
    try { setStats(await workplaceApi.getStats()) } catch (error) { console.error(error) } finally { setLoading((prev) => ({ ...prev, stats: false })) }
  }, [])

  const loadCustomerDeliveries = useCallback(async (page: number, pageSize: number) => {
    setLoading((prev) => ({ ...prev, customerData: true }))
    try {
      const response = await workplaceApi.getCustomerDeliveries(page, pageSize)
      setCustomerPagination({ current: response.page, pageSize: response.pageSize, total: response.total })
      setCustomerDeliveries(response.list)
    } catch (error) { console.error(error) } finally { setLoading((prev) => ({ ...prev, customerData: false })) }
  }, [])

  const loadFactoryDeliveries = useCallback(async (page: number, pageSize: number) => {
    setLoading((prev) => ({ ...prev, factoryData: true }))
    try {
      const response = await workplaceApi.getFactoryDeliveries(page, pageSize)
      setFactoryPagination({ current: response.page, pageSize: response.pageSize, total: response.total })
      setFactoryDeliveries(response.list)
    } catch (error) { console.error(error) } finally { setLoading((prev) => ({ ...prev, factoryData: false })) }
  }, [])

  const loadAnnouncements = useCallback(async (page: number, pageSize: number) => {
    setLoading((prev) => ({ ...prev, announcements: true }))
    try {
      const response = await workplaceApi.getAnnouncements(page, pageSize)
      setAnnouncementPagination({ current: response.page, pageSize: response.pageSize, total: response.total })
      setAnnouncements(response.list)
    } catch (error) { console.error(error) } finally { setLoading((prev) => ({ ...prev, announcements: false })) }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadCustomerDeliveries(customerPage, customerPageSize) }, [customerPage, customerPageSize, loadCustomerDeliveries])
  useEffect(() => { loadFactoryDeliveries(factoryPage, factoryPageSize) }, [factoryPage, factoryPageSize, loadFactoryDeliveries])
  useEffect(() => { loadAnnouncements(announcementPage, announcementPageSize) }, [announcementPage, announcementPageSize, loadAnnouncements])

  const handleCustomerPaginationChange = (page: number, pageSize: number) => setCustomerPagination((prev) => ({ ...prev, current: page, pageSize }))
  const handleFactoryPaginationChange = (page: number, pageSize: number) => setFactoryPagination((prev) => ({ ...prev, current: page, pageSize }))
  const handleAnnouncementPaginationChange = (page: number, pageSize: number) => setAnnouncementPagination((prev) => ({ ...prev, current: page, pageSize }))

  const heroSummary = useMemo(() => [
    { label: '需优先排期', value: stats.newOrders },
    { label: '待推进打板', value: stats.sampleCount },
    { label: '生产执行任务', value: stats.inProduction },
  ], [stats])

  return (
    <div className="oc-page">
      <PageHeader
        title="工作台"
        subtitle="聚焦今日重点：订单进入、样板推进、交付预警与公告提醒。"
        extra={<Button onClick={() => void loadStats()}>刷新看板</Button>}
      />

      <div className="workplace-hero">
        <Card className="workplace-hero-card">
          <div className="workplace-hero-card__main">
            <div>
              <Typography.Title level={3} style={{ marginTop: 0 }}>经营概览</Typography.Title>
              <Typography.Paragraph className="workplace-hero-card__desc">
                看板以浅底卡片承载关键信息，减少空泛装饰，便于运营、采购与生产角色快速识别今日压力点。
              </Typography.Paragraph>
              <Space wrap>
                <Tag color="blue">供应链</Tag>
                <Tag color="green">生产执行</Tag>
                <Tag color="orange">交期预警</Tag>
              </Space>
            </div>
            <Alert message="建议优先处理未来 7 天交货任务与异常公告。" type="info" showIcon />
          </div>
          <div className="workplace-kpi-strip">
            {heroSummary.map((item) => (
              <div key={item.label} className="workplace-kpi-item">
                <div className="workplace-kpi-item__label">{item.label}</div>
                <div className="workplace-kpi-item__value">{item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="workplace-todo-card" title="今日待办">
          <div className="workplace-todo-list">
            <div className="workplace-todo-item"><span>查看样板单列表中的紧急任务</span><Link to="/sample/list">去处理</Link></div>
            <div className="workplace-todo-item"><span>检查物料库存缺口与可用量</span><Link to="/material/stock">去查看</Link></div>
            <div className="workplace-todo-item"><span>根据销量建议生成采购动作</span><Link to="/material/sales-stocking-suggestion">去生成</Link></div>
          </div>
        </Card>
      </div>

      <StatisticsSection stats={stats} loading={loading.stats} />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <DeliveryTableCard
            title="7天待交货（客户）"
            dataSource={customerDeliveries}
            loading={loading.customerData}
            pagination={customerPagination}
            onPaginationChange={handleCustomerPaginationChange}
          />
        </Col>
        <Col xs={24} xl={8}>
          <DeliveryTableCard
            title="7天待交货（加工厂）"
            dataSource={factoryDeliveries}
            loading={loading.factoryData}
            pagination={factoryPagination}
            onPaginationChange={handleFactoryPaginationChange}
            withType
          />
        </Col>
        <Col xs={24} xl={8}>
          <AnnouncementCard
            announcements={announcements}
            loading={loading.announcements}
            pagination={announcementPagination}
            onPaginationChange={handleAnnouncementPaginationChange}
          />
        </Col>
      </Row>
    </div>
  )
}

export default Workplace
