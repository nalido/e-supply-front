import { RouterProvider } from 'react-router-dom'
import router from './router'
import GlobalErrorAlert from './components/common/GlobalErrorAlert'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <GlobalErrorAlert />
    </>
  )
}

export default App
