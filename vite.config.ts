import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const localApiTarget = loadEnv(mode, '.', '').VITE_DEV_PROXY_TARGET || 'http://localhost:8080'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/actuator': {
          target: localApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/actuator/, '/actuator'),
        },
        '/api': {
          target: localApiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        '/api/actuator': {
          target: localApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/actuator/, '/actuator'),
        },
        '/api': {
          target: localApiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
