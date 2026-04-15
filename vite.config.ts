import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const manualChunks = (id: string) => {
  if (!id.includes('node_modules')) {
    return undefined
  }
  if (id.includes('@clerk/')) {
    return 'vendor-clerk'
  }
  if (id.includes('@ant-design/icons')) {
    return 'vendor-ant-icons'
  }
  if (id.includes('antd')) {
    return 'vendor-antd-core'
  }
  if (id.includes('@rc-component/') || id.includes('/rc-')) {
    return 'vendor-antd-rc'
  }
  if (id.includes('@antv/g2plot') || id.includes('g2plot')) {
    return 'vendor-charts-g2plot'
  }
  if (id.includes('@ant-design/plots')) {
    return 'vendor-charts-react'
  }
  if (id.includes('@antv/')) {
    return 'vendor-charts-core'
  }
  if (id.includes('@dnd-kit/')) {
    return 'vendor-dnd'
  }
  if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) {
    return 'vendor-react'
  }
  return 'vendor-misc'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
