import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const vendorChunkGroups: Array<[string, string[]]> = [
  ['react-vendor', ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler']],
  ['clerk-vendor', ['@clerk']],
  ['antd-core-vendor', ['antd']],
  ['ant-icons-vendor', ['@ant-design']],
  ['rc-vendor', ['@rc-component', 'rc-']],
  ['g2plot-vendor', ['@antv/g2plot']],
  ['g2-vendor', ['@antv/g2']],
  ['antv-vendor', ['@antv']],
  ['d3-vendor', ['d3-']],
  ['dnd-vendor', ['@dnd-kit']],
]

const resolveManualChunk = (id: string) => {
  if (!id.includes('node_modules')) {
    return undefined
  }

  for (const [chunkName, packagePrefixes] of vendorChunkGroups) {
    if (packagePrefixes.some((prefix) => id.includes(`/node_modules/${prefix}`))) {
      return chunkName
    }
  }

  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: resolveManualChunk,
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
