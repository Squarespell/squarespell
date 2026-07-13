'use client'
import { useSignIn, useSignUp, useAuth } from '@clerk/nextjs'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const ACC = '#0f7377'
const BG = '#F7F7F5'

function SignInContent() {
  const { signIn, isLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'
  const claimParam = searchParams.get('claim') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  // Keep a ref to the latest signIn object so handlers can wait for it
  // without being re-created on every Clerk state change.
  const signInRef = useRef(signIn)
  useEffect(() => { signInRef.current = signIn }, [signIn])

  // Preserve claim token through to dashboard after sign-in
  const destUrl = fromTry
    ? `/dashboard?new=true${claimParam ? `&claim=${claimParam}` : ''}`
    : '/dashboard'

  useEffect(() => {
    if (isSignedIn) router.replace(destUrl)
  }, [isSignedIn, router, destUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    let waited = 0
    while (!signInRef.current && waited < 3000) {
      await new Promise(r => setTimeout(r, 50))
      waited += 50
    }
    if (!signInRef.current) { setLoading(false); return }
    try {
      const result = await signInRef.current.create({ identifier: email, password })
      if (result.status === 'complete') {
        window.location.href = destUrl
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = useCallback(async () => {
    if (googleLoading) return
    // Show loading spinner immediately — don't wait for the user to click twice
    setGoogleLoading(true)
    // If Clerk hasn't hydrated yet, spin-wait up to 3 s (it usually takes <500 ms)
    let waited = 0
    while (!signInRef.current && waited < 3000) {
      await new Promise(r => setTimeout(r, 50))
      waited += 50
    }
    if (!signInRef.current) { setGoogleLoading(false); return }
    try {
      await signInRef.current.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + destUrl,
      })
    } catch {
      setGoogleLoading(false)
    }
  }, [googleLoading, destUrl])

  const handleApple = useCallback(async () => {
    if (appleLoading) return
    setAppleLoading(true)
    let waited = 0
    while (!signInRef.current && waited < 3000) {
      await new Promise(r => setTimeout(r, 50))
      waited += 50
    }
    if (!signInRef.current) { setAppleLoading(false); return }
    try {
      await signInRef.current.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + destUrl,
      })
    } catch {
      setAppleLoading(false)
    }
  }, [appleLoading, destUrl])

  if (isSignedIn) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(13,115,119,.2)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '48px',
    background: '#FFFFFF',
    border: '1.5px solid #E4E3E0',
    borderRadius: '12px', padding: '0 16px',
    fontSize: '15px', color: '#1A1A1A',
    fontFamily: '"Inter", system-ui, sans-serif',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '36px', height: '36px', background: ACC, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#FFFFFF"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#FFFFFF"/><circle cx="17" cy="18" r="2" fill="#FFFFFF"/></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>SQUARESPELL QUIZ</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.04em', margin: '0 0 8px', lineHeight: 1.1 }}>Welcome back</h1>
          <p style={{ fontSize: '15px', color: '#6B6B6B', margin: 0 }}>Sign in to your Squarespell Quiz dashboard</p>
        </div>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:#0B6165!important}`}</style>

        {/* Google  -  primary CTA */}
        <button onClick={handleGoogle} disabled={googleLoading} style={{
          width: '100%', height: '52px',
          background: googleLoading ? '#F0F0F0' : '#FFFFFF',
          border: '1.5px solid #E4E3E0',
          borderRadius: '12px', color: '#1A1A1A', fontSize: '15px', fontWeight: 600,
          fontFamily: '"Inter",system-ui,sans-serif',
          cursor: googleLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          transition: 'all 0.15s', marginBottom: '12px',
        }}>
          {googleLoading ? (
            <><div style={{ width: '18px', height: '18px', border: '2px solid #E4E3E0', borderTop: '2px solid #0f7377', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>Connecting...</>
          ) : (
            <><svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google</>
          )}
        </button>

        {/* Apple */}
        <button onClick={handleApple} disabled={appleLoading} style={{
          width: '100%', height: '52px',
          background: appleLoading ? '#F0F0F0' : '#FFFFFF',
          border: '1.5px solid #E4E3E0',
          borderRadius: '12px', color: '#1A1A1A', fontSize: '15px', fontWeight: 600,
          fontFamily: '"Inter",system-ui,sans-serif',
          cursor: appleLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          transition: 'all 0.15s', marginBottom: '12px',
        }}>
          {appleLoading ? (
            <><div style={{ width: '18px', height: '18px', border: '2px solid #E4E3E0', borderTop: '2px solid #0f7377', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>Connecting...</>
          ) : (
            <><svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>Continue with Apple</>
          )}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#E4E3E0' }}/>
          <span style={{ fontSize: '13px', color: '#6B6B6B' }}>or with email</span>
          <div style={{ flex: 1, height: '1px', background: '#E4E3E0' }}/>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
          </div>
          {error && <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '16px', textAlign: 'center', background: 'rgba(248,113,113,0.06)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.15)' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            width: '100%', height: '52px', background: ACC, color: '#FFFFFF',
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
            fontFamily: '"Inter", system-ui, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B6B6B', marginTop: '24px' }}>
          Don&apos;t have an account? <a href={fromTry ? `/sign-up?from=try${claimParam ? `&claim=${claimParam}` : ''}` : '/sign-up'} style={{ color: ACC, fontWeight: 600, textDecoration: 'none' }}>Start free trial</a>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F7F5' }} />}><SignInContent /></Suspense>
}
