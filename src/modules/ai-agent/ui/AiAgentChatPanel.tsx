import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Tag, Typography, message } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useLocation } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { executeCreateMaterialAction } from '../tools/material-tools';
import { LOCAL_AGENT_BOOT_MESSAGE } from '../engine/local-agent';
import { handleModelAgentRequest } from '../engine/model-agent';
import type { ChatMessage, ChatRole, PendingWriteAction } from '../types';
import { aiAgentApi } from '../../../api/ai-agent';
import { executeAiClientAction } from '../client-actions';
import { planRouteIntent } from '../route-intents';
import '../../../styles/ai-agent-chat-panel.css';

const { TextArea } = Input;
const { Text } = Typography;
const SESSION_STORAGE_KEY = 'esupply-ai-agent-sessions-v1';
const ACTIVE_SESSION_STORAGE_KEY = 'esupply-ai-agent-active-session-v1';
const MAX_SESSION_COUNT = 50;
const RISK_CONFIG: Record<
  'LOW' | 'MEDIUM' | 'HIGH',
  { label: string; color: 'green' | 'orange' | 'red'; keyword: string; hint: string }
> = {
  LOW: { label: '低风险', color: 'green', keyword: '确认', hint: '低风险写操作，请确认后执行。' },
  MEDIUM: { label: '中风险', color: 'orange', keyword: '确认执行', hint: '中风险写操作，请核对参数后执行。' },
  HIGH: { label: '高风险', color: 'red', keyword: '高风险确认', hint: '高风险写操作，请再次确认业务影响。' },
};

const ROLE_TEXT: Record<ChatRole, string> = {
  assistant: 'AI 助手',
  user: '你',
};

const normalizeMarkdownForRender = (raw: string) => {
  if (!raw) {
    return '';
  }
  let text = raw.replace(/\r\n?/g, '\n').trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Unwrap embedded markdown fences so headings/tables render as markdown instead of code blocks.
  text = text.replace(/```(?:markdown|md)\s*\n([\s\S]*?)```/gi, (_m, inner: string) => inner.trim());
  const wrappedMarkdown = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (wrappedMarkdown) {
    text = wrappedMarkdown[1].trim();
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') {
        text = parsed;
      }
    } catch {
      // keep original text if not valid JSON string
    }
  }
  return text;
};

export type AiAgentChatPanelProps = {
  navigate: NavigateFunction;
  compact?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  modelName?: string;
};

const createBootMessages = (): ChatMessage[] => [
  {
    id: 'boot',
    role: 'assistant',
    markdown: LOCAL_AGENT_BOOT_MESSAGE,
  },
];

const createSession = (title?: string): ChatSession => ({
  id: `conv-clt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: title ?? '新会话',
  updatedAt: new Date().toISOString(),
  messages: createBootMessages(),
});

const toSessionTitle = (content: string) => {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  if (!oneLine) {
    return '新会话';
  }
  return oneLine.length > 20 ? `${oneLine.slice(0, 20)}...` : oneLine;
};

const sortSessions = (input: ChatSession[]) =>
  [...input].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
      return bTime - aTime;
    }
    return a.id.localeCompare(b.id);
  });

const clampSessions = (input: ChatSession[]) => sortSessions(input).slice(0, MAX_SESSION_COUNT);

const toChatMessages = (history: Array<{ id: number; role: 'assistant' | 'user'; content: string }>): ChatMessage[] => {
  const mapped = history.map((item) => ({
    id: `history-${item.id}`,
    role: item.role,
    markdown: item.content,
  }));
  return mapped.length ? mapped : createBootMessages();
};

const getRiskMeta = (action?: PendingWriteAction | null) => {
  const level = action?.riskLevel ?? 'MEDIUM';
  if (level === 'LOW' || level === 'HIGH') {
    return RISK_CONFIG[level];
  }
  return RISK_CONFIG.MEDIUM;
};

const AiAgentChatPanel = ({ navigate, compact = false }: AiAgentChatPanelProps) => {
  const location = useLocation();
  const [draftInput, setDraftInput] = useState('');
  const [running, setRunning] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [actionStatusMap, setActionStatusMap] = useState<Record<string, 'pending' | 'done'>>({});
  const [pendingConfirmAction, setPendingConfirmAction] = useState<PendingWriteAction | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [confirmRunning, setConfirmRunning] = useState(false);
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fromStorage = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const activeFromStorage = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!fromStorage) {
      return;
    }
    try {
      const parsed = JSON.parse(fromStorage) as ChatSession[];
      if (!Array.isArray(parsed) || !parsed.length) {
        return;
      }
      const clipped = clampSessions(parsed);
      setSessions(clipped);
      const hit = clipped.find((item) => item.id === activeFromStorage);
      setActiveSessionId(hit ? hit.id : clipped[0].id);
    } catch (error) {
      console.warn('failed to parse ai sessions from storage', error);
    }
  }, []);

  useEffect(() => {
    if (!sessions.length) {
      return;
    }
    const clipped = clampSessions(sessions);
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(clipped));
    const activeExists = activeSessionId && clipped.some((item) => item.id === activeSessionId);
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeExists ? activeSessionId : clipped[0]?.id ?? '');
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (!sessions.length) {
      return;
    }
    const clipped = clampSessions(sessions);
    if (clipped.length !== sessions.length) {
      setSessions(clipped);
      return;
    }
    if (activeSessionId && !clipped.some((item) => item.id === activeSessionId)) {
      setActiveSessionId(clipped[0]?.id ?? '');
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const serverSessions = await aiAgentApi.sessions(MAX_SESSION_COUNT);
        if (cancelled) {
          return;
        }
        setSessions((prev) => {
          const localMap = new Map(prev.map((item) => [item.id, item]));
          const merged = serverSessions.map((item) => {
            const cached = localMap.get(item.conversationId);
            return {
              id: item.conversationId,
              title: item.title || cached?.title || '新会话',
              updatedAt: item.lastMessageAt || cached?.updatedAt || new Date().toISOString(),
              messages: cached?.messages ?? createBootMessages(),
              modelName: cached?.modelName,
            } satisfies ChatSession;
          });
          const localsOnly = prev.filter((item) => !serverSessions.some((server) => server.conversationId === item.id));
          const next = clampSessions([...merged, ...localsOnly]);
          setActiveSessionId((current) => current || next[0]?.id || '');
          return next;
        });
      } catch (error) {
        console.warn('failed to load ai sessions', error);
      } finally {
        if (!cancelled) {
          setSessions((prev) => {
            if (prev.length) {
              return clampSessions(prev);
            }
            const session = createSession();
            setActiveSessionId(session.id);
            return [session];
          });
          setLoadingHistory(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    let cancelled = false;
    const loadSessionHistory = async () => {
      try {
        const history = await aiAgentApi.history(300, activeSessionId);
        if (cancelled || !history.length) {
          return;
        }
        setSessions((prev) =>
          prev.map((item) =>
            item.id === activeSessionId
              ? {
                  ...item,
                  messages: toChatMessages(
                    history.filter((entry) => entry.role === 'assistant' || entry.role === 'user'),
                  ),
                  updatedAt: history[history.length - 1]?.createdAt || item.updatedAt,
                }
              : item,
          ),
        );
      } catch (error) {
        if (!cancelled) {
          console.warn('failed to load ai session history', error);
        }
      }
    };
    void loadSessionHistory();
    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId],
  );
  const messages = useMemo(() => activeSession?.messages ?? createBootMessages(), [activeSession]);
  const modelName = activeSession?.modelName;

  const syncActiveSession = (
    updater: (session: ChatSession) => ChatSession,
  ) => {
    setSessions((prev) => {
      if (!prev.length) {
        return prev;
      }
      return clampSessions(prev.map((item) => (item.id === activeSessionId ? updater(item) : item)));
    });
  };

  const scrollToBottom = (smooth = false) => {
    const container = historyRef.current;
    if (!container) {
      return;
    }
    window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeSessionId, messages.length]);

  const pushMessage = (nextMessage: ChatMessage) => {
    syncActiveSession((session) => ({
      ...session,
      updatedAt: new Date().toISOString(),
      messages: [...session.messages, nextMessage],
    }));
    scrollToBottom(true);
  };

  const setActiveModelName = (nextModel: string) => {
    syncActiveSession((session) => ({
      ...session,
      updatedAt: new Date().toISOString(),
      modelName: nextModel,
    }));
  };

  const createNewSession = () => {
    const session = createSession();
    setSessions((prev) => clampSessions([session, ...prev]));
    setActiveSessionId(session.id);
    setActionStatusMap({});
    setDraftInput('');
  };

  const auditWrite = async (
    action: PendingWriteAction,
    status: 'CONFIRMED' | 'EXECUTED' | 'FAILED' | 'CANCELED',
    extra?: { confirmationNote?: string; errorMessage?: string },
  ) => {
    try {
      await aiAgentApi.writeAudit({
        conversationId: activeSession?.id ?? '',
        actionId: action.id,
        toolName: action.toolName,
        endpoint: action.endpoint,
        riskLevel: action.riskLevel ?? 'MEDIUM',
        status,
        confirmationNote: extra?.confirmationNote,
        errorMessage: extra?.errorMessage,
        payload: action.payload as unknown as Record<string, unknown>,
      });
    } catch (error) {
      console.warn('failed to record ai write audit', error);
    }
  };

  const handleConfirmCreate = async (action: PendingWriteAction) => {
    if (actionStatusMap[action.id] === 'done') {
      return;
    }
    if (!activeSession?.id) {
      message.error('当前会话无效，请刷新后重试');
      return;
    }
    const riskMeta = getRiskMeta(action);
    const expectedKeyword = action.confirmKeyword?.trim() || riskMeta.keyword;
    if (confirmText.trim() !== expectedKeyword) {
      message.error(`请输入“${expectedKeyword}”后再提交`);
      return;
    }
    setConfirmRunning(true);
    setRunning(true);
    try {
      await auditWrite(action, 'CONFIRMED', { confirmationNote: confirmText.trim() });
      const markdown = await executeCreateMaterialAction(action);
      await auditWrite(action, 'EXECUTED', { confirmationNote: confirmText.trim() });
      setActionStatusMap((prev) => ({ ...prev, [action.id]: 'done' }));
      pushMessage({
        id: `assistant-created-${Date.now()}`,
        role: 'assistant',
        markdown,
      });
      message.success('写入成功');
    } catch (error) {
      console.error('failed to create material from ai action', error);
      await auditWrite(action, 'FAILED', { errorMessage: error instanceof Error ? error.message : 'unknown error' });
      message.error('写入失败，请检查参数和权限后重试');
    } finally {
      setPendingConfirmAction(null);
      setConfirmText('');
      setConfirmRunning(false);
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    const input = draftInput.trim();
    if (!input || running || !activeSession) {
      return;
    }
    setDraftInput('');
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      markdown: input,
    };
    const nextConversation = [...messages, userMessage];
    pushMessage(userMessage);
    syncActiveSession((session) => ({
      ...session,
      title: session.title === '新会话' ? toSessionTitle(input) : session.title,
    }));

    const routeIntent = planRouteIntent(input);
    if (routeIntent) {
      const executed = executeAiClientAction(routeIntent.action, navigate);
      pushMessage({
        id: `assistant-route-${Date.now()}`,
        role: 'assistant',
        markdown: `${routeIntent.markdown}\n\n${executed}`,
      });
      return;
    }

    setRunning(true);
    try {
      const actionId = `create-material-${Date.now()}`;
      const result = await handleModelAgentRequest(input, actionId, nextConversation, location.pathname, activeSession.id);
      if (result.conversationId && result.conversationId !== activeSession.id) {
        setSessions((prev) =>
          prev.map((item) =>
            item.id === activeSession.id
              ? {
                  ...item,
                  id: result.conversationId as string,
                }
              : item,
          ),
        );
        setActiveSessionId(result.conversationId);
      }
      if (result.model) {
        setActiveModelName(result.model);
      }
      const pendingAction = result.pendingAction;
      if (pendingAction) {
        setActionStatusMap((prev) => ({ ...prev, [pendingAction.id]: 'pending' }));
      }
      pushMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        markdown: result.markdown,
        pendingAction,
      });
    } finally {
      setRunning(false);
    }
  };

  const messageList = useMemo(() => messages, [messages]);
  const confirmRiskMeta = useMemo(() => getRiskMeta(pendingConfirmAction), [pendingConfirmAction]);
  const confirmKeyword = pendingConfirmAction?.confirmKeyword?.trim() || confirmRiskMeta.keyword;
  const sessionOptions = useMemo(
    () =>
      clampSessions(sessions).map((session) => ({
        label: session.title,
        value: session.id,
      })),
    [sessions],
  );

  return (
    <div className={`ai-agent-chat ${compact ? 'ai-agent-chat--compact' : ''}`}>
      <div className="ai-agent-chat__session-bar">
        <Select
          value={activeSession?.id}
          options={sessionOptions}
          className="ai-agent-chat__session-select"
          onChange={(value) => {
            setActiveSessionId(value);
            setActionStatusMap({});
          }}
        />
        <Button onClick={createNewSession}>新建会话</Button>
      </div>
      {modelName ? (
        <div className="ai-agent-chat__model-bar">
          <Tag color="purple">模型：{modelName}</Tag>
        </div>
      ) : null}
      <Alert
        showIcon
        type="info"
        message="说明"
        description="支持对话查询与写前确认。可新建会话、切换历史会话，写操作始终需要确认。"
        className="ai-agent-chat__alert"
      />
      {loadingHistory ? <Text type="secondary">正在加载历史会话...</Text> : null}
      <div className="ai-agent-chat__history" ref={historyRef}>
        {messageList.map((entry) => {
          const pendingAction = entry.pendingAction;
          const actionDone = pendingAction ? actionStatusMap[pendingAction.id] === 'done' : false;
          const riskMeta = getRiskMeta(pendingAction);
          return (
            <div key={entry.id} className={`ai-agent-chat__message ai-agent-chat__message--${entry.role}`}>
              <Space align="start" className="ai-agent-chat__message-header">
                <Tag color={entry.role === 'assistant' ? 'blue' : 'gold'}>{ROLE_TEXT[entry.role]}</Tag>
                {pendingAction ? <Tag color={actionDone ? 'green' : 'orange'}>{actionDone ? '已执行' : '待确认'}</Tag> : null}
                {pendingAction ? <Tag color={riskMeta.color}>{riskMeta.label}</Tag> : null}
              </Space>
              <div className="ai-agent-chat__markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {normalizeMarkdownForRender(entry.markdown)}
                </ReactMarkdown>
              </div>
              {pendingAction ? (
                <div className="ai-agent-chat__action">
                  <Text type="secondary">工具：{pendingAction.toolName}</Text>
                  <Text type="secondary">接口：{pendingAction.endpoint}</Text>
                  <pre>{JSON.stringify(pendingAction.payload, null, 2)}</pre>
                  <Button
                    type="primary"
                    disabled={running || actionDone}
                    onClick={() => {
                      setPendingConfirmAction(pendingAction);
                      setConfirmText('');
                    }}
                  >
                    {actionDone ? '已执行' : '确认并执行'}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <Space.Compact className="ai-agent-chat__composer">
        <TextArea
          value={draftInput}
          rows={compact ? 2 : 3}
          disabled={running}
          onChange={(event) => setDraftInput(event.target.value)}
          placeholder="输入查询、写入、或跳转指令，例如：打开物料档案"
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <Button type="primary" loading={running} onClick={() => void handleSubmit()}>
          发送
        </Button>
      </Space.Compact>
      <Modal
        title="二次确认写操作"
        open={Boolean(pendingConfirmAction)}
        okText={confirmKeyword}
        cancelText="取消"
        confirmLoading={confirmRunning}
        onCancel={() => {
          const action = pendingConfirmAction;
          setPendingConfirmAction(null);
          setConfirmText('');
          if (action) {
            void auditWrite(action, 'CANCELED');
          }
        }}
        onOk={() => {
          if (!pendingConfirmAction) {
            return;
          }
          void handleConfirmCreate(pendingConfirmAction);
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <Text type="secondary">
            请确认你要执行以下写操作，此操作将以当前登录身份调用现有业务接口并记录审计。{confirmRiskMeta.hint}
          </Text>
          {pendingConfirmAction ? (
            <div className="ai-agent-chat__confirm-card">
              <div>
                风险等级：<Tag color={confirmRiskMeta.color}>{confirmRiskMeta.label}</Tag>
              </div>
              <div>工具：{pendingConfirmAction.toolName}</div>
              <div>接口：{pendingConfirmAction.endpoint}</div>
              <div>摘要：{pendingConfirmAction.summary}</div>
            </div>
          ) : null}
          <Input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={`请输入：${confirmKeyword}`}
            autoFocus
          />
        </Space>
      </Modal>
    </div>
  );
};

export default AiAgentChatPanel;
