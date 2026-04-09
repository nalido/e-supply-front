import { aiAgentApi } from '../../../api/ai-agent';
import type { ChatMessage, PendingWriteAction } from '../types';
import { handleLocalAgentRequest } from './local-agent';

type ModelAgentResult = {
  markdown: string;
  pendingAction?: PendingWriteAction;
  model?: string;
  fallback: boolean;
  conversationId?: string;
};

const toPlanMessages = (messages: ChatMessage[]) =>
  messages
    .filter((item) => item.id !== 'boot')
    .filter((item) => item.role === 'assistant' || item.role === 'user')
    .map((item) => ({
      role: item.role,
      content: item.markdown,
    }))
    .slice(-8);

export const handleModelAgentRequest = async (
  input: string,
  actionId: string,
  messages: ChatMessage[],
  pagePath?: string,
  conversationId?: string,
): Promise<ModelAgentResult> => {
  try {
    const response = await aiAgentApi.plan({
      input,
      conversation: toPlanMessages(messages),
      pagePath,
      conversationId,
    });
    return {
      markdown: response.replyMarkdown || '收到，我已完成分析。',
      pendingAction: response.pendingAction ?? undefined,
      model: response.model,
      fallback: Boolean(response.fallback),
      conversationId: response.conversationId,
    };
  } catch (error) {
    console.warn('model agent unavailable, fallback to local agent', error);
    const local = await handleLocalAgentRequest(input, actionId);
    return {
      markdown: `模型服务暂不可用，已回退本地模式。\n\n${local.markdown}`,
      pendingAction: local.pendingAction,
      fallback: true,
    };
  }
};
