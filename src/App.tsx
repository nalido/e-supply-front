import { App as AntdApp } from 'antd'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import GlobalErrorAlert from './components/common/GlobalErrorAlert'
import AppVersionGuard from './components/common/AppVersionGuard'
import { TableInputProvider } from './components/common/TableInputProvider'

function App() {
  return (
    <AntdApp>
      <TableInputProvider>
        <RouterProvider router={router} />
        <GlobalErrorAlert />
        <AppVersionGuard />
      </TableInputProvider>
    </AntdApp>
  )
}

export default App
