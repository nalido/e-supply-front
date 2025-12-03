export type GlobalErrorPayload = {
  id?: string;
  title: string;
  description?: string;
  type?: 'error' | 'warning' | 'info';
};

type Listener = (payload: GlobalErrorPayload | null) => void;

const listeners = new Set<Listener>();

export const subscribeGlobalError = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitGlobalError = (payload: GlobalErrorPayload) => {
  const enriched: GlobalErrorPayload = {
    type: 'error',
    ...payload,
    id: payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  listeners.forEach((listener) => listener(enriched));
};

export const clearGlobalError = () => {
  listeners.forEach((listener) => listener(null));
};
