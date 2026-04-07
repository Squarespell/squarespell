'use client'
import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSignUp } from '@clerk/nextjs'
import { Suspense } from 'react'

function SignUpContent() {
  const { signUp, isLoaded: signUpLoaded } = useSignUp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  const openOAuthPopup = (strategy: string, setLoadingFn: (v: boolean) => void) => {
    const dest = fromTry ? '/dashboard?new=true' : '/dashboard'
    const popup = window.open(
      `/oauth-popup?strategy=${strategy}&dest=${encodeURIComponent(dest)}`,
      'oauthPopup',
      'width=500,height=620,top=' + Math.round(window.screenY + (window.outerHeight - 620) / 2) +
      ',left=' + Math.round(window.screenX + (window.outerWidth - 500) / 2) +
      ',toolbar=no,menubar=no,scrollbars=no,resizable=no'
    )
    if (!popup) { setLoadingFn(false); return }

    const poll = setInterval(() => {
      try {
        const href = popup.location.href
        if (href && href.includes('/dashboard')) {
          clearInterval(poll)
          popup.close()
          router.push(dest)
        }
      } catch {
        // cross-origin during OAuth — keep polling
      }
      if (popup.closed) {
        clearInterval(poll)
        setLoadingFn(false)
      }
    }, 300)
  }

  const handleGoogleSignUp = () => {
    if (googleLoading) return
    setGoogleLoading(true)
    openOAuthPopup('oauth_google', setGoogleLoading)
  }

  const handleAppleSignUp = () => {
    if (appleLoading) return
    setAppleLoading(true)
    openOAuthPopup('oauth_apple', setAppleLoading)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpLoaded) return
    setLoading(true)
    setError('')
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStep('verify')
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUpLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        router.push(fromTry ? '/dashboard?new=true' : '/dashboard')
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '56px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', padding: '0 20px',
    fontSize: '15px', color: '#f0f2f5',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '48px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#D2FF1D"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>

        {step === 'form' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.1 }}>Start your free trial</h1>
              <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.45)', margin: 0 }}>7 days free. No credit card required.</p>
            </div>
            {fromTry && (
              <div style={{ marginBottom: '28px', background: 'rgba(210,255,29,0.08)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D2FF1D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: '15px', color: '#D2FF1D', fontWeight: 600 }}>Your quiz is ready. Create your account to publish it.</span>
              </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button onClick={handleGoogleSignUp} disabled={googleLoading} style={{ flex:1, height:'56px', background: googleLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', color:'#f0f2f5', fontSize:'16px', fontWeight:500, fontFamily:'"DM Sans",system-ui,sans-serif', cursor: googleLoading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'all 0.15s' }}>
                {googleLoading ? (<><div style={{ width:'18px', height:'18px', border:'2px solid rgba(255,255,255,0.15)', borderTop:'2px solid #f0f2f5', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }}/>Connecting...</>) : (<><svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Continue with Google</>)}
              </button>
              <button onClick={handleAppleSignUp} disabled={appleLoading} style={{ flex:1, height:'56px', background: appleLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', color:'#f0f2f5', fontSize:'16px', fontWeight:500, fontFamily:'"DM Sans",system-ui,sans-serif', cursor: appleLoading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'all 0.15s' }}>
                {appleLoading ? (<><div style={{ width:'18px', height:'18px', border:'2px solid rgba(255,255,255,0.15)', borderTop:'2px solid #f0f2f5', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }}/>Connecting...</>) : (<><svg width="18" height="22" viewBox="0 0 18 22" fill="#f0f2f5"><path d="M14.9408 11.6493C14.9207 9.20154 16.9557 8.01013 17.0459 7.95386C15.8944 6.24517 14.0808 6.01392 13.4449 5.99377C11.9144 5.83788 10.4341 6.89645 9.65568 6.89645C8.86218 6.89645 7.65372 6.00884 6.36327 6.03402C4.69829 6.05919 3.14337 7.00951 2.29076 8.49888C0.534265 11.5288 1.83479 16.0391 3.52452 18.5186C4.36706 19.7301 5.35974 21.0923 6.66526 21.0421C7.94058 20.9869 8.42308 20.2187 9.94843 20.2187C11.4587 20.2187 11.9112 21.0421 13.2418 21.0119C14.6126 20.9869 15.4701 19.7904 16.2927 18.5688C17.2754 17.168 17.6777 15.7923 17.6977 15.7219C17.6676 15.7119 14.9659 14.7063 14.9408 11.6493Z"/><path d="M12.4511 4.27053C13.1372 3.42298 13.6047 2.2668 13.4746 1.09546C12.4862 1.14067 11.2376 1.77438 10.5214 2.60182C9.88551 3.33394 9.3228 4.53038 9.46797 5.66132C10.5765 5.74681 11.7499 5.10808 12.4511 4.27053Z"/></svg>Continue with Apple</>)}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}/>
              <span style={{ fontSize: '14px', color: 'rgba(240,242,245,0.35)' }}>or continue with email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}/>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'rgba(240,242,245,0.65)', marginBottom: '8px' }}>Email address</label>
                <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'rgba(240,242,245,0.65)', marginBottom: '8px' }}>Password</label>
                <input type="password" placeholder="Create a password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required minLength={8} />
              </div>
              {error && <p style={{ fontSize: '14px', color: '#ff6b6b', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', background: '#D2FF1D', color: '#07090c', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, fontFamily: '"DM Sans", system-ui, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating account...' : 'Create free account'}
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '15px', color: 'rgba(240,242,245,0.4)', marginTop: '28px' }}>
              Already have an account? <a href="/sign-in" style={{ color: '#D2FF1D', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
            </p>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(210,255,29,0.1)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D2FF1D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', margin: '0 0 10px' }}>Check your email</h1>
              <p style={{ fontSize: '16px', color: 'rgba(240,242,245,0.45)', margin: 0 }}>We sent a 6-digit code to <strong style={{ color: '#f0f2f5' }}>{email}</strong></p>
            </div>
            <form onSubmit={handleVerify}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'rgba(240,242,245,0.65)', marginBottom: '8px' }}>Verification code</label>
                <input type="text" placeholder="Enter 6-digit code" value={code} onChange={e => setCode(e.target.value)} style={{ ...inputStyle, textAlign: 'center' as const, fontSize: '24px', letterSpacing: '0.3em' }} maxLength={6} required />
              </div>
              {error && <p style={{ fontSize: '14px', color: '#ff6b6b', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', background: '#D2FF1D', color: '#07090c', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, fontFamily: '"DM Sans", system-ui, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Verifying...' : 'Verify email'}
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(240,242,245,0.35)', marginTop: '20px' }}>
              Didn&apos;t get it? <span onClick={() => signUp?.prepareEmailAddressVerification({ strategy: 'email_code' })} style={{ color: '#D2FF1D', cursor: 'pointer', fontWeight: 600 }}>Resend code</span>
            </p>
          </>
        )}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(240,242,245,0.15)', marginTop: '32px' }}>Secured by Clerk</p>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return <Suspense><SignUpContent /></Suspense>
}
