'use client'
import { SignIn, useAuth } from '@clerk/nextjs'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const ACC = '#0f7377'
const BG = '#F7F7F5'

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
      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(13,115,119,.2)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: '36px', height: '36px', background: ACC, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#FFFFFF"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#FFFFFF"/><circle cx="17" cy="18" r="2" fill="#FFFFFF"/></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>SQUARESPELL QUIZ</span>
        </div>
        <SignIn
          routing="hash"
          forceRedirectUrl={destUrl}
          fallbackRedirectUrl={destUrl}
          signUpUrl={signUpUrl}
          appearance={{
            variables: { colorPrimary: ACC, fontFamily: '"Inter", system-ui, sans-serif', borderRadius: '12px' },
            elements: { rootBox: { width: '100%' }, card: { boxShadow: 'none', border: '1px solid #E4E3E0', background: '#FFFFFF' } },
          }}
        />
      </div>
    </div>
  )
}

export default function SignInPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F7F5' }} />}><SignInContent /></Suspense>
}
