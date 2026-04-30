import { App as AntdApp } from 'antd'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import GlobalErrorAlert from './components/common/GlobalErrorAlert'

function App() {
  return (
    <AntdApp>
      <RouterProvider router={router} />
      <GlobalErrorAlert />
    </AntdApp>
  )
}

export default App
