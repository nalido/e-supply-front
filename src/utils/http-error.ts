import axios from 'axios';
import { buildFriendlyError, type ErrorDetails } from './friendly-error';

type BackendErrorPayload = {
  message?: string;
  details?: ErrorDetails;
};

export const extractValidationFieldErrors = (error: unknown): Record<string, string> => {
  if (!axios.isAxiosError<BackendErrorPayload>(error) || error.response?.status !== 400) {
    return {};
  }
  const details = error.response.data?.details;
  if (!details || typeof details !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(details)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim()))
      .map(([field, value]) => [field, value.trim()]),
  );
};

export const wasGlobalErrorShown = (error: unknown): boolean => (
  Boolean(error && typeof error === 'object' && '__globalErrorShown' in error
    && (error as { __globalErrorShown?: boolean }).__globalErrorShown)
);

export const buildFriendlyErrorFromUnknown = (error: unknown) => {
  if (axios.isAxiosError<BackendErrorPayload>(error)) {
    return buildFriendlyError(
      error.response?.data?.message ?? error.message,
      error.response?.status,
      error.response?.data?.details,
    );
  }

  if (error instanceof Error) {
    return buildFriendlyError(error.message);
  }

  return buildFriendlyError();
};
