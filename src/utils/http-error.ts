import axios from 'axios';
import { buildFriendlyError } from './friendly-error';

export const buildFriendlyErrorFromUnknown = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return buildFriendlyError(error.response?.data?.message ?? error.message, error.response?.status);
  }

  if (error instanceof Error) {
    return buildFriendlyError(error.message);
  }

  return buildFriendlyError();
};
