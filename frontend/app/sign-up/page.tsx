'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSignUp, useSignIn, useAuth } from '@clerk/nextjs'

const ACC = '#0f7377'
const BG = '#F7F7F5'

function SignUpContent() {
  const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp()
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'
  const tryUrl = searchParams.get('url') || ''
  const claimParam = searchParams.get('claim') || ''

  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  // Pass claim token through to dashboard so it survives OAuth redirect
  const destUrl = fromTry
    ? `/dashboard?new=true${claimParam ? `&claim=${claimParam}` : ''}`
    : '/dashboard'

  useEffect(() => {
    if (isSignedIn) router.replace(destUrl)
  }, [isSignedIn, router, destUrl])

  // Google OAuth  -  try popup first, fall back to redirect
  const handleGoogle = useCallback(async () => {
    if (!signUpLoaded || !signInLoaded || googleLoading) return
    setGoogleLoading(true)
    setError('')

    try {
      // Try sign-up with popup
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + destUrl,
      })
    } catch (err: any) {
      // If user already exists, try sign-in instead
      if (err?.errors?.[0]?.code === 'form_identifier_exists') {
        try {
          await signIn!.authenticateWithRedirect({
            strategy: 'oauth_google',
            redirectUrl: window.location.origin + '/sso-callback',
            redirectUrlComplete: window.location.origin + destUrl,
          })
        } catch {
          setError('Google sign-in failed. Please try again.')
          setGoogleLoading(false)
        }
      } else {
        setError('Google sign-up failed. Please try again.')
        setGoogleLoading(false)
      }
    }
  }, [signUpLoaded, signInLoaded, signUp, signIn, googleLoading, destUrl])

  // Apple OAuth
  const handleApple = useCallback(async () => {
    if (!signUpLoaded || !signInLoaded || appleLoading) return
    setAppleLoading(true)
    setError('')

    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin + destUrl,
      })
    } catch (err: any) {
      if (err?.errors?.[0]?.code === 'form_identifier_exists') {
        try {
          await signIn!.authenticateWithRedirect({
            strategy: 'oauth_apple',
            redirectUrl: window.location.origin + '/sso-callback',
            redirectUrlComplete: window.location.origin + destUrl,
          })
        } catch {
          setError('Apple sign-in failed. Please try again.')
          setAppleLoading(false)
        }
      } else {
        setError('Apple sign-up failed. Please try again.')
        setAppleLoading(false)
      }
    }
  }, [signUpLoaded, signInLoaded, signUp, signIn, appleLoading, destUrl])

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
        if (setSignUpActive) await setSignUpActive({ session: result.createdSessionId })
        window.location.href = destUrl
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.03em' }}>Squarespell Quiz</span>
        </div>

        {step === 'form' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.04em', margin: '0 0 8px', lineHeight: 1.1 }}>
                {fromTry ? 'Publish your quiz' : 'Start your free trial'}
              </h1>
              <p style={{ fontSize: '15px', color: '#6B6B6B', margin: 0 }}>
                {fromTry ? 'Create your account to go live in 30 seconds' : '7 days free · No credit card required'}
              </p>
            </div>

            {fromTry && (
              <div style={{ marginBottom: '20px', background: 'rgba(13,115,119,0.06)', border: '1px solid rgba(13,115,119,0.15)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f7377" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: '14px', color: '#0f7377', fontWeight: 600 }}>Your quiz is ready  -  sign up to publish it</span>
              </div>
            )}

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
                <input type="password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required minLength={8} />
              </div>
              {error && <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '16px', textAlign: 'center', background: 'rgba(248,113,113,0.06)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.15)' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{
                width: '100%', height: '52px', background: ACC, color: '#FFFFFF',
                border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                fontFamily: '"Inter", system-ui, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
              }}>
                {loading ? 'Creating account...' : fromTry ? 'Create account & publish →' : 'Create free account →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B6B6B', marginTop: '24px' }}>
              Already have an account? <a href={fromTry ? `/sign-in?from=try${claimParam ? `&claim=${claimParam}` : ''}` : '/sign-in'} style={{ color: ACC, fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
            </p>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#6B6B6B', marginTop: '20px', lineHeight: 1.5 }}>
              By creating an account you agree to our Terms of Service and Privacy Policy
            </p>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(13,115,119,0.08)', border: '1px solid rgba(13,115,119,0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.03em', margin: '0 0 8px' }}>Check your email</h1>
              <p style={{ fontSize: '15px', color: '#6B6B6B', margin: 0 }}>We sent a 6-digit code to <strong style={{ color: '#1A1A1A' }}>{email}</strong></p>
            </div>
            <form onSubmit={handleVerify}>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text" placeholder="000000" value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: '24px', letterSpacing: '0.3em', height: '56px', fontWeight: 700 }}
                  maxLength={6} required autoFocus
                />
              </div>
              {error && <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
              <button type="submit" disabled={loading || code.length < 6} style={{
                width: '100%', height: '52px', background: code.length >= 6 ? ACC : 'rgba(13,115,119,0.3)',
                color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                fontFamily: '"Inter", system-ui, sans-serif',
                cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Verifying...' : 'Verify & continue →'}
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B6B6B', marginTop: '20px' }}>
              Didn&apos;t receive it?{' '}
              <span onClick={() => signUp?.prepareEmailAddressVerification({ strategy: 'email_code' })} style={{ color: ACC, cursor: 'pointer', fontWeight: 600 }}>Resend code</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F7F5' }} />}><SignUpContent /></Suspense>
}
