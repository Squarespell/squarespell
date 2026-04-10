'use client'
import { useSignIn, useSignUp, useAuth } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const ACC = '#D2FF1D'
const BG = '#07090c'

export default function SignInPage() {
  const { signIn, isLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  useEffect(() => {
    if (isSignedIn) router.replace('/dashboard')
  }, [isSignedIn, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = useCallback(async () => {
    if (!isLoaded || googleLoading) return
    setGoogleLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/dashboard',
      })
    } catch {
      setGoogleLoading(false)
    }
  }, [isLoaded, signIn, googleLoading])

  const handleApple = useCallback(async () => {
    if (!isLoaded || appleLoading) return
    setAppleLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + '/dashboard',
      })
    } catch {
      setAppleLoading(false)
    }
  }, [isLoaded, signIn, appleLoading])

  if (isSignedIn) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(210,255,29,.2)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '48px',
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '0 16px',
    fontSize: '15px', color: '#f0f2f5',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '36px', height: '36px', background: ACC, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em' }}>Squarespell</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', margin: '0 0 8px', lineHeight: 1.1 }}>Welcome back</h1>
          <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.45)', margin: 0 }}>Sign in to your Squarespell dashboard</p>
        </div>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:rgba(210,255,29,0.4)!important}`}</style>

        {/* Google — primary CTA */}
        <button onClick={handleGoogle} disabled={googleLoading} style={{
          width: '100%', height: '52px',
          background: googleLoading ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', color: '#f0f2f5', fontSize: '15px', fontWeight: 600,
          fontFamily: '"DM Sans",system-ui,sans-serif',
          cursor: googleLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          transition: 'all 0.15s', marginBottom: '12px',
        }}>
          {googleLoading ? (
            <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid #f0f2f5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>Connecting...</>
          ) : (
            <><svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google</>
          )}
        </button>

        {/* Apple */}
        <button onClick={handleApple} disabled={appleLoading} style={{
          width: '100%', height: '52px',
          background: appleLoading ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', color: '#f0f2f5', fontSize: '15px', fontWeight: 600,
          fontFamily: '"DM Sans",system-ui,sans-serif',
          cursor: appleLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          transition: 'all 0.15s', marginBottom: '12px',
        }}>
          {appleLoading ? (
            <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid #f0f2f5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>Connecting...</>
          ) : (
            <><svg width="20" height="20" viewBox="0 0 24 24" fill="#f0f2f5"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>Continue with Apple</>
          )}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}/>
          <span style={{ fontSize: '13px', color: 'rgba(240,242,245,0.25)' }}>or with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}/>
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
            width: '100%', height: '52px', background: ACC, color: BG,
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
            fontFamily: '"DM Sans", system-ui, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(240,242,245,0.35)', marginTop: '24px' }}>
          Don&apos;t have an account? <a href="/sign-up" style={{ color: ACC, fontWeight: 600, textDecoration: 'none' }}>Start free trial</a>
        </p>
      </div>
    </div>
  )
}
