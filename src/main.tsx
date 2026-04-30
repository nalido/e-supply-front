import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { zhCN as clerkZhCN } from '@clerk/localizations'
import 'antd/dist/reset.css'
import './styles/global.css'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import App from './App.tsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error('Missing Clerk Publishable Key')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      localization={clerkZhCN}
      afterSignOutUrl="/"
      signInUrl="/sign-in"
      signUpUrl="/onboarding/register-enterprise"
      signInForceRedirectUrl="/welcome"
      signInFallbackRedirectUrl="/welcome"
    >
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#2563eb',
            colorInfo: '#2563eb',
            colorSuccess: '#059669',
            colorWarning: '#d97706',
            colorError: '#dc2626',
            colorText: '#0f172a',
            colorTextSecondary: '#475569',
            colorBorder: '#dbe3ef',
            colorSplit: '#e7edf5',
            colorBgLayout: '#f3f6fb',
            colorBgContainer: '#ffffff',
            colorFillSecondary: '#f8fafc',
            borderRadius: 12,
            borderRadiusLG: 18,
            fontSize: 13,
            fontSizeHeading1: 30,
            fontSizeHeading2: 24,
            fontSizeHeading3: 20,
            boxShadowSecondary: '0 16px 40px rgba(15, 23, 42, 0.08)',
          },
          components: {
            Layout: { headerHeight: 72, siderBg: '#0f172a', triggerBg: '#111c34' },
            Card: { paddingLG: 20, headerHeight: 56 },
            Table: {
              headerBorderRadius: 16,
              cellPaddingBlock: 12,
              cellPaddingInline: 12,
              rowHoverBg: '#f8fbff',
            },
            Menu: {
              darkItemBg: 'transparent',
              darkSubMenuItemBg: 'transparent',
              darkItemSelectedBg: 'rgba(59,130,246,0.24)',
              darkItemHoverBg: 'rgba(255,255,255,0.08)',
              itemBorderRadius: 12,
              itemMarginBlock: 4,
            },
            Button: { borderRadius: 12, controlHeight: 38, fontWeight: 500 },
            Input: { controlHeight: 38, activeShadow: '0 0 0 2px rgba(37,99,235,0.12)' },
            Select: { controlHeight: 38, optionSelectedBg: '#eff6ff' },
            Tabs: { itemSelectedColor: '#2563eb', inkBarColor: '#2563eb' },
            Segmented: { itemSelectedBg: '#ffffff', trackBg: '#eef4ff' },
          },
        }}
      >
        <App />
      </ConfigProvider>
    </ClerkProvider>
  </StrictMode>,
)
