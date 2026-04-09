import type { CreateMaterialPayload } from '../../types';

export type ChatRole = 'assistant' | 'user';

export type PendingWriteAction = {
  id: string;
  toolName: string;
  endpoint: string;
  summary: string;
  payload: CreateMaterialPayload;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  confirmKeyword?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  markdown: string;
  pendingAction?: PendingWriteAction;
};
