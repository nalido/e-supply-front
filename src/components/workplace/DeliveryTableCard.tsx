import { Card, Empty, Table, Tag, Typography } from 'antd'
import type { DeliveryItem } from '../../types/workplace'
import { createColumns } from './table-columns'

interface PaginationConfig {
  current: number
  pageSize: number
  total: number
}

interface DeliveryTableCardProps {
  title: string
  dataSource: DeliveryItem[]
  loading: boolean
  pagination: PaginationConfig
  onPaginationChange: (page: number, pageSize: number) => void
  withType?: boolean
}

const DeliveryTableCard: React.FC<DeliveryTableCardProps> = ({
  title,
  dataSource,
  loading,
  pagination,
  onPaginationChange,
  withType = false,
}) => {
  return (
    <Card
      className="workplace-panel-card"
      title={
        <div className="workplace-panel-card__title">
          <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
          <Tag color="blue">7天预警</Tag>
        </div>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table
        rowKey="id"
        columns={createColumns(withType)}
        dataSource={dataSource}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: onPaginationChange,
          onShowSizeChange: onPaginationChange,
        }}
        locale={{ emptyText: <Empty description="暂无待交货数据" /> }}
        size="small"
        scroll={{ x: withType ? 1300 : 1200, y: 360 }}
      />
    </Card>
  )
}

export default DeliveryTableCard
