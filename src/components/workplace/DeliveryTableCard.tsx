import { Card, Table, Typography, Empty } from 'antd';
import type { DeliveryItem } from '../../types/workplace';
import { createColumns } from './table-columns';

interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
}

interface DeliveryTableCardProps {
  title: string;
  dataSource: DeliveryItem[];
  loading: boolean;
  pagination: PaginationConfig;
  onPaginationChange: (page: number, pageSize: number) => void;
  withType?: boolean; // 是否包含加工类型列（区分客户表格和工厂表格）
}

/**
 * 交货列表表格卡片组件
 */
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
      title={
        <Typography.Title level={5} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
      }
      style={{ minHeight: '550px', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, padding: '16px' }}
      loading={loading}
    >
      <Table
        rowKey="id"
        columns={createColumns(withType)}
        dataSource={dataSource}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          size: 'small',
          simple: false,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: onPaginationChange,
          onShowSizeChange: onPaginationChange
        }}
        locale={{ emptyText: <Empty description="无数据" /> }}
        size="small"
        scroll={{ 
          x: withType ? 1300 : 1200, 
          y: 350 
        }}
      />
    </Card>
  );
};

export default DeliveryTableCard;