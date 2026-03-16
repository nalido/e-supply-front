import { Col, Row, Skeleton } from 'antd'
import { FileTextOutlined, ShoppingOutlined, ToolOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { WorkplaceStats } from '../../types/workplace'

interface StatisticsSectionProps {
  stats: WorkplaceStats
  loading?: boolean
}

const STAT_CARDS = [
  {
    key: 'newOrders',
    label: '新接订单',
    unit: '单',
    icon: <FileTextOutlined />,
    tone: { bg: '#eff6ff', color: '#2563eb' },
    footnote: '今日新增待跟进业务',
  },
  {
    key: 'sampleCount',
    label: '打板推进',
    unit: '款',
    icon: <ShoppingOutlined />,
    tone: { bg: '#ecfdf5', color: '#059669' },
    footnote: '样板开发与确认节奏',
  },
  {
    key: 'inProduction',
    label: '生产执行中',
    unit: '件',
    icon: <ToolOutlined />,
    tone: { bg: '#fff7ed', color: '#d97706' },
    footnote: '需持续关注产能与排期',
  },
  {
    key: 'shipped',
    label: '已完成出货',
    unit: '件',
    icon: <CheckCircleOutlined />,
    tone: { bg: '#fef2f2', color: '#dc2626' },
    footnote: '已完成交付的业务量',
  },
]

const StatisticsSection: React.FC<StatisticsSectionProps> = ({ stats, loading = false }) => {
  return (
    <Row gutter={[16, 16]}>
      {STAT_CARDS.map((card) => {
        const value = stats[card.key as keyof WorkplaceStats] as number
        return (
          <Col key={card.key} xs={24} sm={12} xl={6}>
            <div className="oc-stat-card workplace-stat-card">
              <div className="oc-stat-card__eyebrow">{card.label}</div>
              <div className="oc-stat-card__value">
                {loading ? <Skeleton.Input active size="small" style={{ width: 96 }} /> : value.toLocaleString()}
                {!loading ? <span className="oc-stat-card__suffix">{card.unit}</span> : null}
              </div>
              <div className="oc-stat-card__footnote">{card.footnote}</div>
              <div className="oc-stat-card__icon" style={{ background: card.tone.bg, color: card.tone.color }}>
                {card.icon}
              </div>
            </div>
          </Col>
        )
      })}
    </Row>
  )
}

export default StatisticsSection
