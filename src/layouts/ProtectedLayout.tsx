import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import MainLayout from './MainLayout'
import TenantProvider from '../providers/TenantProvider'
import { onboardingApi } from '../api/onboarding'
import { setAuthTokenResolver } from '../api/http'

const ONBOARDING_PATH = '/onboarding/register-enterprise'
const WELCOME_PATH = '/welcome'
const DASHBOARD_PATH = '/dashboard'
const DASHBOARD_WORKPLACE_PATH = '/dashboard/workplace'

const SignedInGate = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const location = useLocation()
  const [linked, setLinked] = useState<boolean | null>(null)

  useEffect(() => {
    const resolver = async () => {
      if (!isLoaded || !isSignedIn) {
        return null
      }
      return getToken()
    }
    setAuthTokenResolver(resolver)
    return () => {
      setAuthTokenResolver(async () => null)
    }
  }, [getToken, isLoaded, isSignedIn])

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn) {
        return
      }
      try {
        const status = await onboardingApi.status()
        setLinked(status.linked)
      } catch {
        setLinked(false)
      }
    }
    void run()
  }, [isLoaded, isSignedIn])

  if (linked === null) {
    return <Spin size="large" tip="加载中..." fullscreen />
  }

  if (!linked) {
    const allowSignedInLanding =
      location.pathname === ONBOARDING_PATH ||
      location.pathname === WELCOME_PATH ||
      location.pathname === DASHBOARD_PATH ||
      location.pathname === DASHBOARD_WORKPLACE_PATH

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
