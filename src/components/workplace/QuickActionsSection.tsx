import { Col, Row } from 'antd';
import type { QuickAction } from '../../types/workplace';

interface QuickActionsSectionProps {
  quickActions: QuickAction[];
}

/**
 * 工作台快速入口组件
 */
const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({ quickActions }) => {
  return (
    <div style={{ 
      background: '#fff', 
      padding: '20px 0', 
      marginBottom: '24px', 
      borderRadius: '6px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
    }}>
      <Row gutter={[0, 16]}>
        {quickActions.map((action, index) => (
          <Col xs={6} sm={6} md={3} lg={3} key={action.key}>
            <div 
              style={{ 
                textAlign: 'center', 
                padding: '20px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderRight: index % 4 !== 3 ? '1px solid #f0f0f0' : 'none'
              }}
              className="quick-action-item"
            >
              <div 
                className="quick-action-icon"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '20px', color: '#666', transition: 'color 0.2s' }}>
                  {action.icon}
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#333', lineHeight: '20px' }}>
                {action.title}
                {action.count && (
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {action.count}
                  </div>
                )}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default QuickActionsSection;