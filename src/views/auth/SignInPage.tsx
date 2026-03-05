import { SignIn } from '@clerk/clerk-react'

const SignInPage = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background:
        'radial-gradient(1200px 500px at 10% -10%, rgba(24,144,255,0.14), transparent 60%), radial-gradient(900px 400px at 100% 0%, rgba(82,196,26,0.12), transparent 55%), #f5f7fa',
    }}
  >
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/onboarding/register-enterprise"
      fallbackRedirectUrl="/dashboard/workplace"
      forceRedirectUrl="/dashboard/workplace"
      appearance={{
        elements: {
          rootBox: {
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          },
        },
      }}
    />
  </div>
)

export default SignInPage
