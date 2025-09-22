import { Col, Row } from 'antd';
import type { WorkplaceStats } from '../../types/workplace';

interface StatisticsSectionProps {
  stats: WorkplaceStats;
  loading?: boolean;
}

/**
 * 工作台统计数据显示组件
 */
const StatisticsSection: React.FC<StatisticsSectionProps> = ({ stats, loading = false }) => {
  if (loading) {
    return (
      <div style={{ 
        background: '#fff', 
        padding: '20px', 
        marginBottom: '24px', 
        borderRadius: '6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#999' }}>加载统计数据中...</div>
      </div>
    );
  }

  return (
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
  );
};

export default StatisticsSection;