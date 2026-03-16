import { Card, Empty, Pagination, Space, Typography } from 'antd'
import { NotificationOutlined } from '@ant-design/icons'
import type { Announcement } from '../../types/workplace'

interface PaginationConfig {
  current: number
  pageSize: number
  total: number
}

interface AnnouncementCardProps {
  announcements: Announcement[]
  loading: boolean
  pagination: PaginationConfig
  onPaginationChange: (page: number, pageSize: number) => void
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcements, loading, pagination, onPaginationChange }) => {
  return (
    <Card
      className="workplace-panel-card"
      loading={loading}
      title={
        <Space>
          <NotificationOutlined style={{ color: '#2563eb' }} />
          <Typography.Title level={4} style={{ margin: 0 }}>公告与提醒</Typography.Title>
        </Space>
      }
    >
      {announcements.length > 0 ? (
        <div className="workplace-announcement-list">
          {announcements.map((item) => (
            <div key={item.id} className="workplace-announcement-item">
              <div className="workplace-announcement-item__head">
                <Typography.Text strong ellipsis>{item.title}</Typography.Text>
                <Typography.Text type="secondary">{item.createTime}</Typography.Text>
              </div>
              <Typography.Paragraph ellipsis={{ rows: 2, tooltip: item.content }} type="secondary">
                {item.content}
              </Typography.Paragraph>
              <div className="workplace-announcement-item__author">{item.author}</div>
            </div>
          ))}
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            size="small"
            showSizeChanger
            pageSizeOptions={['8', '12', '16', '20']}
            onChange={onPaginationChange}
            onShowSizeChange={onPaginationChange}
          />
        </div>
      ) : (
        <div className="workplace-empty"><Empty description="暂无公告" /></div>
      )}
    </Card>
  )
}

export default AnnouncementCard
