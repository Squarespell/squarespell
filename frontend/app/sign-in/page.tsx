'use client'
import { useSignIn } from '@clerk/nextjs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const { signIn, isLoaded } = useSignIn()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!isLoaded) return
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/dashboard',
    })
  }

  const handleApple = async () => {
    if (!isLoaded) return
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_apple',
      redirectUrl: '/sso-callback',
      redirectUrlComplete: '/dashboard',
    })
  }

  const inputStyle = {
    width: '100%', height: '56px', background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
    padding: '0 20px', fontSize: '17px', color: '#f0f2f5',
    fontFamily: '"DM Sans", system-ui, sans-serif', outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const socialBtnStyle = {
    flex: 1, height: '56px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
    color: '#f0f2f5', fontSize: '16px', fontWeight: '500' as const,
    fontFamily: '"DM Sans", system-ui, sans-serif', cursor: 'pointer',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: '10px',
    transition: 'background 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '48px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#D2FF1D"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.1 }}>Welcome back</h1>
          <p style={{ fontSize: '18px', color: 'rgba(240,242,245,0.45)', margin: 0 }}>Sign in to your Squarespell account</p>
        </div>

        {/* Social buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button onClick={handleGoogle} style={socialBtnStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
          <button onClick={handleApple} style={socialBtnStyle}>
            <svg width="20" height="20" viewBox="0 0 814 1000" fill="#f0f2f5"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-42.3-150.2-109.4C159.5 849.1 96 730 96 620.2 96 437.5 200.9 340 310.1 340c55.5 0 101.6 37.3 136.3 37.3 33.2 0 85.1-39.5 146-39.5 23.4 0 108.2 2.6 168.1 80.1zm-56.8-172.2c26.1-31.2 44.6-74.4 44.6-117.6 0-6.1-.5-12.3-1.5-17.9-42.1 1.5-92.4 28.2-124 62.2-23.5 25.5-45.4 68.8-45.4 112.5 0 6.5.6 13.1 1.5 18.8 5.1.9 10.3 1.5 15.5 1.5 38.4 0 87.3-25.5 109.3-59.5z"/></svg>
            Apple
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}/>
          <span style={{ fontSize: '14px', color: 'rgba(240,242,245,0.35)' }}>or continue with email</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}/>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'rgba(240,242,245,0.65)', marginBottom: '8px' }}>Email address</label>
            <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'rgba(240,242,245,0.65)', marginBottom: '8px' }}>Password</label>
            <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
          </div>
          {error && <p style={{ fontSize: '14px', color: '#ff6b6b', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', background: '#D2FF1D', color: '#07090c', border: 'none', borderRadius: '12px', fontSize: '17px', fontWeight: 700, fontFamily: '"DM Sans", system-ui, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '15px', color: 'rgba(240,242,245,0.4)', marginTop: '28px' }}>
          Don&apos;t have an account? <a href="/sign-up" style={{ color: '#D2FF1D', fontWeight: 600, textDecoration: 'none' }}>Start free trial</a>
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(240,242,245,0.15)', marginTop: '32px' }}>Secured by Clerk</p>
      </div>
    </div>
  )
}
