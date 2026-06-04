import { App as AntdApp } from 'antd'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import GlobalErrorAlert from './components/common/GlobalErrorAlert'
import { useAutoSelectTableInput } from './hooks/useAutoSelectTableInput'

function App() {
  useAutoSelectTableInput()

  return (
    <AntdApp>
      <RouterProvider router={router} />
      <GlobalErrorAlert />
    </AntdApp>
  )
}

export default App
