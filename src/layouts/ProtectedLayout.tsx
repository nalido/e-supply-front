import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button, Result, Spin } from 'antd'
import MainLayout from './MainLayout'
import TenantProvider from '../providers/TenantProvider'
import { onboardingApi } from '../api/onboarding'
import { useBindAuthTokenResolver } from '../hooks/useBindAuthTokenResolver'

const ONBOARDING_PATH = '/onboarding/register-enterprise'
const WELCOME_PATH = '/welcome'

const SignedInGate = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  const [linked, setLinked] = useState<boolean | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusCheckVersion, setStatusCheckVersion] = useState(0)

  useBindAuthTokenResolver()

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn) {
        return
      }
      setStatusError(null)
      try {
        const status = await onboardingApi.status()
        setLinked(status.linked)
      } catch {
        setStatusError('账号状态校验失败，请重试')
      }
    }
    void run()
  }, [isLoaded, isSignedIn, location.pathname, statusCheckVersion])

  if (statusError && linked === null) {
    return (
      <Result
        status="error"
        title="账号状态校验失败"
        subTitle={statusError}
        extra={
          <Button type="primary" onClick={() => setStatusCheckVersion((current) => current + 1)}>
            重试校验
          </Button>
        }
      />
    )
  }

  if (linked === null) {
    return <Spin size="large" tip="加载中..." fullscreen />
  }

  if (!linked) {
    const allowSignedInLanding =
      location.pathname === ONBOARDING_PATH ||
      location.pathname === WELCOME_PATH

    if (!allowSignedInLanding) {
      return <Navigate to={WELCOME_PATH} replace />
    }
    return <Outlet />
  }

  if (location.pathname === ONBOARDING_PATH || location.pathname === WELCOME_PATH) {
    return <Navigate to="/dashboard/workplace" replace />
  }

  return (
    <TenantProvider>
      <MainLayout />
    </TenantProvider>
  )
}

const ProtectedLayout = () => (
  <>
    <SignedIn>
      <SignedInGate />
    </SignedIn>
    <SignedOut>
      <Navigate to={WELCOME_PATH} replace />
    </SignedOut>
  </>
)

export default ProtectedLayout
