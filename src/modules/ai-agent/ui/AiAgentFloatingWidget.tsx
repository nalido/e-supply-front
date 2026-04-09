import { Button } from 'antd';
import { CloseOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AiAgentChatPanel from './AiAgentChatPanel';
import '../../../styles/ai-agent-floating.css';

type AiAgentFloatingWidgetProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

const AiAgentFloatingWidget = ({ open, onOpen, onClose }: AiAgentFloatingWidgetProps) => {
  const navigate = useNavigate();

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="ai-agent-floating__button"
          onClick={onOpen}
          aria-label="打开 AI 助手"
        >
          <span className="ai-agent-floating__button-pulse" />
          <span className="ai-agent-floating__button-core">
            <RobotOutlined />
          </span>
          <span className="ai-agent-floating__button-text">AI 助手</span>
        </button>
      ) : null}
      {open ? (
        <aside className="ai-agent-floating__panel" aria-label="AI 助手侧栏">
          <div className="ai-agent-floating__panel-header">
            <div className="ai-agent-floating__panel-title">
              <RobotOutlined />
              AI 助手
            </div>
            <div className="ai-agent-floating__panel-actions">
              <Button
                type="link"
                className="ai-agent-floating__link"
                onClick={() => {
                  navigate('/ai/agent');
                }}
              >
                打开完整页
              </Button>
              <Button type="text" icon={<CloseOutlined />} onClick={onClose} aria-label="关闭 AI 助手侧栏" />
            </div>
          </div>
          <div className="ai-agent-floating__content">
            <AiAgentChatPanel navigate={navigate} compact />
            <div className="ai-agent-floating__hint">
              <MessageOutlined />
              当前支持：对话查询、写前确认、页面跳转。
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
};

export default AiAgentFloatingWidget;
