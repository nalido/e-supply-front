import { App as AntdApp } from 'antd'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import GlobalErrorAlert from './components/common/GlobalErrorAlert'
import AppVersionGuard from './components/common/AppVersionGuard'
import { useAutoSelectTableInput } from './hooks/useAutoSelectTableInput'

function App() {
  useAutoSelectTableInput()

  return (
    <AntdApp>
      <RouterProvider router={router} />
      <GlobalErrorAlert />
      <AppVersionGuard />
    </AntdApp>
  )
}

export default App
