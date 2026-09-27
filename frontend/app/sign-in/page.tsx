'use client'
import { SignIn, useAuth } from '@clerk/nextjs'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { HIDE_SOCIAL_ELEMENTS } from '@/lib/site'
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors'
import AuthShell from '@/components/auth/AuthShell'

const ACC = C.ACCENT
const BG = C.BG

/**
 * Sign-in uses Clerk's own component so it only ever offers what the production Clerk instance has enabled
 * (email verification code, Google). A method that is not configured cannot appear as a dead button.
 */
function SignInContent() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'
  const claimParam = searchParams.get('claim') || ''

  // Preserve claim token through to dashboard after sign-in
  const destUrl = fromTry
    ? `/dashboard?new=true${claimParam ? `&claim=${claimParam}` : ''}`
    : '/dashboard'
  const signUpUrl = fromTry ? `/sign-up?from=try${claimParam ? `&claim=${claimParam}` : ''}` : '/sign-up'

  useEffect(() => {
    if (isSignedIn) router.replace(destUrl)
  }, [isSignedIn, router, destUrl])

  if (isSignedIn) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(49, 84, 255,.2)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <AuthShell mode="sign-in" otherModeHref={signUpUrl}>
      <SignIn
        routing="hash"
        forceRedirectUrl={destUrl}
        fallbackRedirectUrl={destUrl}
        signUpUrl={signUpUrl}
        appearance={{
          variables: { colorPrimary: ACC, colorText: C.INK, fontFamily: C.FONT, borderRadius: '6px' },
          elements: { ...HIDE_SOCIAL_ELEMENTS, rootBox: { width: '100%' }, cardBox: { width: '100%', boxShadow: 'none', border: 'none' }, card: { boxShadow: 'none', border: 'none', background: 'transparent', padding: 0 }, footer: { background: 'transparent' } },
        }}
      />
    </AuthShell>
  )
}

export default function SignInPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: C.BG }} />}><SignInContent /></Suspense>
}
