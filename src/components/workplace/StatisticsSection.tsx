import { Col, Row } from 'antd';
import { FileTextOutlined, ShoppingOutlined, ToolOutlined, HomeOutlined } from '@ant-design/icons';
import type { WorkplaceStats } from '../../types/workplace';

interface StatisticsSectionProps {
  stats: WorkplaceStats;
  loading?: boolean;
}

// 统计卡片配置
const STAT_CARDS = [
  {
    key: 'newOrders',
    label: '新单',
    unit: '件',
    icon: <FileTextOutlined style={{ fontSize: '32px' }} />,
    background: 'linear-gradient(135deg, #67C23A 0%, #85CE61 100%)' // 绿色渐变
  },
  {
    key: 'sampleCount',
    label: '打板', 
    unit: '款',
    icon: <ShoppingOutlined style={{ fontSize: '32px' }} />,
    background: 'linear-gradient(135deg, #409EFF 0%, #73B3FF 100%)' // 蓝色渐变
  },
  {
    key: 'inProduction',
    label: '生产进行',
    unit: '件',
    icon: <ToolOutlined style={{ fontSize: '32px' }} />,
    background: 'linear-gradient(135deg, #E6A23C 0%, #EEBE77 100%)' // 橙色渐变
  },
  {
    key: 'shipped',
    label: '已出货',
    unit: '件', 
    icon: <HomeOutlined style={{ fontSize: '32px' }} />,
    background: 'linear-gradient(135deg, #F56C6C 0%, #F78989 100%)' // 粉红色渐变
  }
];

/**
 * 工作台统计数据显示组件
 */
const StatisticsSection: React.FC<StatisticsSectionProps> = ({ stats, loading = false }) => {
  if (loading) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {STAT_CARDS.map((card) => (
            <Col key={card.key} xs={12} sm={6}>
              <div style={{
                background: '#f5f5f5',
                borderRadius: '8px',
                padding: '20px',
                minHeight: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}>
                加载中...
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div style={{ 
      // marginBottom: '24px' 
      }}>
      <Row gutter={[16, 16]}>
        {STAT_CARDS.map((card) => {
          const value = stats[card.key as keyof WorkplaceStats] as number;
          return (
            <Col key={card.key} xs={12} sm={6}>
              <div style={{
                background: card.background,
                borderRadius: '8px',
                padding: '16px 20px',
                minHeight: '100px',
                height: '100px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              >
                {/* 右上角"年"字 */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '16px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: '400'
                }}>
                  年
                </div>
                
                {/* 主内容区域 - 居中的两列布局 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  color: 'white'
                }}>
                  {/* 左列 - 图标 */}
                  <div style={{
                    fontSize: '32px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    flexShrink: 0
                  }}>
                    {card.icon}
                  </div>
                  
                  {/* 右列 - 项目名称和数值单位 */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px'
                  }}>
                    {/* 第一行 - 项目名称 */}
                    <div style={{
                      fontSize: '14px',
                      opacity: 0.95,
                      fontWeight: '400',
                      lineHeight: '18px'
                    }}>
                      {card.label}
                    </div>
                    
                    {/* 第二行 - 数值+单位 */}
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      lineHeight: '28px'
                    }}>
                      {value.toLocaleString()}
                      <span style={{ fontSize: '14px', marginLeft: '2px', fontWeight: '400' }}>{card.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default StatisticsSection;