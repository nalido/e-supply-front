import http from './http';
import type { PendingWriteAction } from '../modules/ai-agent/types';

export type AiAgentPlanMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiAgentPlanRequest = {
  input: string;
  conversation: AiAgentPlanMessage[];
  pagePath?: string;
  conversationId?: string;
};

type AiAgentPlanResponse = {
  replyMarkdown: string;
  pendingAction?: PendingWriteAction | null;
  model?: string;
  fallback?: boolean;
  conversationId?: string;
};

export type AiAgentHistoryItem = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  conversationId?: string;
};

export type AiAgentSessionItem = {
  conversationId: string;
  title: string;
  lastMessageAt?: string;
  turnCount: number;
};

export type AiAgentWriteAuditStatus = 'CONFIRMED' | 'EXECUTED' | 'FAILED' | 'CANCELED';

export type AiAgentWriteAuditRequest = {
  conversationId: string;
  actionId: string;
  toolName: string;
  endpoint: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  status: AiAgentWriteAuditStatus;
  confirmationNote?: string;
  errorMessage?: string;
  payload?: Record<string, unknown>;
};

export const aiAgentApi = {
  plan: async (payload: AiAgentPlanRequest): Promise<AiAgentPlanResponse> => {
    const response = await http.post<AiAgentPlanResponse>('/api/v1/ai/agent/plan', payload);
    return response.data;
  },
  history: async (limit = 50, conversationId?: string): Promise<AiAgentHistoryItem[]> => {
    const response = await http.get<AiAgentHistoryItem[]>('/api/v1/ai/agent/history', {
      params: { limit, conversationId },
    });
    return response.data;
  },
  sessions: async (limit = 50): Promise<AiAgentSessionItem[]> => {
    const response = await http.get<AiAgentSessionItem[]>('/api/v1/ai/agent/sessions', {
      params: { limit },
    });
    return response.data;
  },
  writeAudit: async (payload: AiAgentWriteAuditRequest): Promise<void> => {
    await http.post('/api/v1/ai/agent/write-audit', payload);
  },
};
