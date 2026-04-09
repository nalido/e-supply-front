import { Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import AiAgentChatPanel from '../modules/ai-agent/ui/AiAgentChatPanel';
import '../styles/ai-agent-poc.css';

const AIAgentPoC = () => {
  const navigate = useNavigate();
  return (
    <div className="ai-agent-poc">
      <Card title="AI Agent 工作台" className="ai-agent-poc__panel">
        <AiAgentChatPanel navigate={navigate} />
      </Card>
    </div>
  );
};

export default AIAgentPoC;

