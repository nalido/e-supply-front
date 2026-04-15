import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipPageNormalization?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipPageNormalization?: boolean;
  }
}
