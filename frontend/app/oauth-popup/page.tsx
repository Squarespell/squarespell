'use client'
import { useSignIn, useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function OAuthPopupContent() {
  const { signIn, isLoaded } = useSignIn()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const strategy = searchParams.get('strategy') || 'oauth_google'
  const dest = searchParams.get('dest') || '/dashboard'

  useEffect(() => {
    if (!isLoaded) return

    // Already signed in  -  send popup straight to dest, poll will catch it
    if (isSignedIn) {
      router.replace(dest)
      return
    }

    if (!signIn) return

    signIn.authenticateWithRedirect({
      strategy: strategy as any,
      redirectUrl: '/sso-callback',
      redirectUrlComplete: dest,
    }).catch(() => {
      window.close()
    })
  }, [isLoaded, isSignedIn, signIn, strategy, dest])

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#f0f2f5' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #D2FF1D', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '16px', color: 'rgba(240,242,245,0.5)' }}>Connecting...</p>
      </div>
    </div>
  )
}

export default function OAuthPopupPage() {
  return <Suspense><OAuthPopupContent /></Suspense>
}
