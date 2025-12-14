import React from 'react';
import { Typography } from 'antd';
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { SampleFollowProgress } from '../../types/sample';

const { Text } = Typography;

interface SampleFollowProgressProps {
  progress?: SampleFollowProgress;
  onNodeClick?: (node: SampleFollowProgress['nodes'][number]) => void;
}

const statusText = (node: SampleFollowProgress['nodes'][number]): string => {
  if (node.statusValue && node.statusValue.trim()) {
    return node.statusValue;
  }
  return node.completed ? '已完成' : '待处理';
};

const nodeIconStyle = (completed: boolean) => ({
  width: 30,
  height: 30,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: completed ? '#52c41a' : '#d9d9d9',
  color: completed ? '#ffffff' : '#595959',
  fontSize: 16,
});

const SampleFollowProgressTimeline: React.FC<SampleFollowProgressProps> = ({ progress, onNodeClick }) => {
  if (!progress || !progress.nodes || progress.nodes.length === 0) {
    return <Text type="secondary">未配置跟进模板</Text>;
  }

  const connectorColor = (completed: boolean): string => (completed ? '#52c41a' : '#c6c6c6');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text strong>{progress.templateName || '跟进模板'}</Text>
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {progress.nodes.map((node, index) => (
            <React.Fragment key={node.id ?? node.templateNodeId ?? `${node.nodeName}-${index}`}>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120, cursor: onNodeClick ? 'pointer' : 'default' }}
                onClick={() => onNodeClick?.(node)}
              >
                <div style={nodeIconStyle(node.completed)}>
                  {node.completed ? <CheckOutlined /> : <ClockCircleOutlined />}
                </div>
                <div style={{ marginTop: 6, textAlign: 'center' }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{node.nodeName}</div>
                  <div style={{ fontSize: 12, color: node.completed ? '#52c41a' : '#8c8c8c' }}>
                    {statusText(node)}
                  </div>
                </div>
              </div>
              {index < progress.nodes.length - 1 && (
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderLeft: `14px solid ${connectorColor(node.completed)}`,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SampleFollowProgressTimeline;
