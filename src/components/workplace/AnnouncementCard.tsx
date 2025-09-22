import { Card, Space, Typography, Button, Empty, Pagination } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import type { Announcement } from '../../types/workplace';

interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
}

interface AnnouncementCardProps {
  announcements: Announcement[];
  loading: boolean;
  pagination: PaginationConfig;
  onPaginationChange: (page: number, pageSize: number) => void;
  onPublishClick?: () => void;
}

/**
 * 公告卡片组件
 */
const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcements,
  loading,
  pagination,
  onPaginationChange,
  onPublishClick,
}) => {
  return (
    <Card 
      title={
        <Space>
          <Typography.Title level={5} style={{ margin: 0 }}>
            <NotificationOutlined /> 公告
          </Typography.Title>
          <Button 
            type="primary" 
            size="small"
            onClick={onPublishClick}
          >
            发布
          </Button>
        </Space>
      }
      style={{ minHeight: '550px', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, padding: '16px' }}
      loading={loading}
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
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                size="small"
                simple={false}
                showSizeChanger={true}
                pageSizeOptions={['8', '12', '16', '20']}
                onChange={onPaginationChange}
                onShowSizeChange={onPaginationChange}
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
  );
};

export default AnnouncementCard;