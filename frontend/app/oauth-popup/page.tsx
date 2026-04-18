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
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#1A1A1A' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #E4E3E0', borderTop: '3px solid #0D7377', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '16px', color: '#6B6B6B' }}>Connecting...</p>
      </div>
    </div>
  )
}

export default function OAuthPopupPage() {
  return <Suspense><OAuthPopupContent /></Suspense>
}
