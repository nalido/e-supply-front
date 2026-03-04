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
      // background: '#fff', 
      // padding: '8px 0px', 
      margin: '16px 0px',
      // marginBottom: '24px', 
      // borderRadius: '8px',
      // boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <Row gutter={[16, 16]}>
        {quickActions.map((action) => (
          <Col xs={12} sm={6} md={6} lg={3} key={action.key}>
            <div 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                cursor: 'default',
                borderRadius: '8px',
                transition: 'all 0.3s',
                background: '#fff'
              }}
              className="quick-action-item"
            >
              <div 
                className="quick-action-icon"
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: `${action.color || '#f5f5f5'}20`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '8px',
                  transition: 'all 0.3s',
                  flexShrink: 0
                }}
              >
                <div style={{ 
                  fontSize: '16px', 
                  color: action.color || '#666', 
                  transition: 'color 0.3s'
                }}>
                  {action.icon}
                </div>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#333', 
                lineHeight: '20px',
                fontWeight: 500,
                textAlign: 'left'
              }}>
                {action.title}
                {action.count && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#999',
                    marginTop: '2px'
                  }}>
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
