import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import TenantProvider from '../providers/TenantProvider'
import { onboardingApi } from '../api/onboarding'
import { useBindAuthTokenResolver } from '../hooks/useBindAuthTokenResolver'
import OnboardingStatusError from '../views/auth/OnboardingStatusError'
import { buildFriendlyErrorFromUnknown } from '../utils/http-error'

const ONBOARDING_PATH = '/onboarding/register-enterprise'
const WELCOME_PATH = '/welcome'

const SignedInTenantGate = () => {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  const [linked, setLinked] = useState<boolean | null>(null)
  const [statusCheckError, setStatusCheckError] = useState<string | null>(null)

  useBindAuthTokenResolver()

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn) {
        return
      }
      try {
        const status = await onboardingApi.status()
        setLinked(status.linked)
        setStatusCheckError(null)
      } catch (error) {
        setStatusCheckError(
          buildFriendlyErrorFromUnknown(error).description ?? '状态检查接口调用失败，请稍后重试。',
        )
        setLinked(null)
      }
    }
    void run()
  }, [isLoaded, isSignedIn, location.pathname])

  if (statusCheckError) {
    return <OnboardingStatusError description={statusCheckError} />
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
      <Outlet />
    </TenantProvider>
  )
}

const ProtectedTenantOutlet = () => (
  <>
    <SignedIn>
      <SignedInTenantGate />
    </SignedIn>
    <SignedOut>
      <Navigate to={WELCOME_PATH} replace />
    </SignedOut>
  </>
)

export default ProtectedTenantOutlet
