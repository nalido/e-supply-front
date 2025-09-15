import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './styles/global.css'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          fontSize: 12,
          colorBgLayout: '#f5f7fa',
          borderRadius: 8,
        },
        components: {
          Table: { headerBorderRadius: 0, cellPaddingBlock: 8, fontSize: 12, rowHoverBg: '#fafafa' },
          Card: { padding: 12 },
          Layout: { headerHeight: 56 },
          Menu: { itemMarginBlock: 4, itemBorderRadius: 6 },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
