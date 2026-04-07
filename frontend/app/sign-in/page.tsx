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
            <svg width="18" height="22" viewBox="0 0 18 22" fill="#f0f2f5"><path d="M14.9408 11.6493C14.9207 9.20154 16.9557 8.01013 17.0459 7.95386C15.8944 6.24517 14.0808 6.01392 13.4449 5.99377C11.9144 5.83788 10.4341 6.89645 9.65568 6.89645C8.86218 6.89645 7.65372 6.00884 6.36327 6.03402C4.69829 6.05919 3.14337 7.00951 2.29076 8.49888C0.534265 11.5288 1.83479 16.0391 3.52452 18.5186C4.36706 19.7301 5.35974 21.0923 6.66526 21.0421C7.94058 20.9869 8.42308 20.2187 9.94843 20.2187C11.4587 20.2187 11.9112 21.0421 13.2418 21.0119C14.6126 20.9869 15.4701 19.7904 16.2927 18.5688C17.2754 17.168 17.6777 15.7923 17.6977 15.7219C17.6676 15.7119 14.9659 14.7063 14.9408 11.6493Z"/><path d="M12.4511 4.27053C13.1372 3.42298 13.6047 2.2668 13.4746 1.09546C12.4862 1.14067 11.2376 1.77438 10.5214 2.60182C9.88551 3.33394 9.3228 4.53038 9.46797 5.66132C10.5765 5.74681 11.7499 5.10808 12.4511 4.27053Z"/></svg>
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
