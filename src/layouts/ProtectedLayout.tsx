import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import MainLayout from './MainLayout'
import TenantProvider from '../providers/TenantProvider'

const ProtectedLayout = () => (
  <>
    <SignedIn>
      <TenantProvider>
        <MainLayout />
      </TenantProvider>
    </SignedIn>
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
  </>
)

export default ProtectedLayout
