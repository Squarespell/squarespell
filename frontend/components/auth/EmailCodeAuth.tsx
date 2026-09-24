'use client'
import { useEffect, useRef, useState, Suspense, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/authApi'

const ACC = '#0f7377'
const BG = '#F7F7F5'
const RESEND_COOLDOWN_S = 60

type Step = 'email' | 'code'

/**
 * Unified passwordless email-code sign-in/sign-up. There is no separate
 * "create account" step: verifying a code either matches an existing user
 * or creates one (backend services/auth/userMatching.ts), so /sign-in and
 * /sign-up render the same flow with different heading copy.
 */
function EmailCodeAuthContent({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'
  const claimParam = searchParams.get('claim') || ''
  const redirectParam = searchParams.get('redirect') || ''

  const destUrl = redirectParam.startsWith('/')
    ? redirectParam
    : fromTry
      ? `/dashboard?new=true${claimParam ? `&claim=${claimParam}` : ''}`
      : '/dashboard'
  const otherModeHref = (mode === 'sign-up' ? '/sign-in' : '/sign-up') + (redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : '')

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [checkingSession, setCheckingSession] = useState(true)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Already signed in (e.g. hit /sign-in with a live session) -> skip straight through.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { status } = await authApi.getSession()
      if (!cancelled && status === 200) {
        router.replace(destUrl)
        return
      }
      if (!cancelled) setCheckingSession(false)
    })()
    return () => { cancelled = true }
  }, [router, destUrl])

  useEffect(() => {
    if (checkingSession) return
    if (step === 'email') emailInputRef.current?.focus()
    if (step === 'code') codeInputRef.current?.focus()
  }, [step, checkingSession])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function requestCode(e?: FormEvent) {
    e?.preventDefault()
    if (submitting) return
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.')
      return
    }
    setSubmitting(true)
    setError('')
    const { status, data } = await authApi.requestCode(trimmed)
    setSubmitting(false)
    if (status === 200) {
      setStep('code')
      setCode('')
      setCooldown(RESEND_COOLDOWN_S)
      return
    }
    if (status === 429 && data?.code === 'resend_cooldown') {
      // A code was already sent recently and is still valid -- this isn't a
      // failure, just move straight to the code step.
      setStep('code')
      setCode('')
      setCooldown(Math.max(1, Math.ceil((data.retryAfterMs || 0) / 1000)))
      return
    }
    if (status === 429) {
      setError('Too many requests. Please wait a few minutes and try again.')
      return
    }
    if (status === 400) {
      setError('Enter a valid email address.')
      return
    }
    setError('Something went wrong. Please try again.')
  }

  async function verifyCode(e?: FormEvent) {
    e?.preventDefault()
    if (submitting) return
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setSubmitting(true)
    setError('')
    const { status } = await authApi.verifyCode(email.trim(), code.trim())
    setSubmitting(false)
    if (status === 200) {
      try { sessionStorage.setItem('sq_auth_ok', '1') } catch {}
      router.replace(destUrl)
      return
    }
    setCode('')
    if (status === 429) {
      setError('Too many attempts with that code. Request a new one below.')
      return
    }
    setError('That code is incorrect or has expired. Please try again or request a new one.')
  }

  function changeEmail() {
    setStep('email')
    setCode('')
    setError('')
    setCooldown(0)
  }

  const heading = mode === 'sign-up'
    ? (fromTry ? 'Publish your quiz' : 'Start your free trial')
    : 'Welcome back'
  const subheading = mode === 'sign-up'
    ? (fromTry ? 'Enter your email to go live in 30 seconds' : '14 days free · No credit card required')
    : 'Sign in with your email'

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid rgba(15,115,119,.2)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", system-ui, sans-serif', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, background: ACC, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#FFFFFF"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#FFFFFF"/><circle cx="17" cy="18" r="2" fill="#FFFFFF"/></svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>SQUARESPELL QUIZ</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.04em', margin: '0 0 8px', lineHeight: 1.15 }}>
            {step === 'code' ? 'Check your email' : heading}
          </h1>
          <p style={{ fontSize: 15, color: '#6B6B6B', margin: 0 }}>
            {step === 'code' ? <>We sent a 6-digit code to <strong style={{ color: '#1A1A1A' }}>{email}</strong></> : subheading}
          </p>
        </div>

        <div style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', border: '1px solid #E4E3E0', borderRadius: 12, padding: 24 }}>
          {step === 'email' ? (
            <form onSubmit={requestCode} noValidate>
              <label htmlFor="sq-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>Email address</label>
              <input
                id="sq-email"
                ref={emailInputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-invalid={!!error}
                aria-describedby={error ? 'sq-auth-error' : undefined}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, border: '1px solid ' + (error ? '#D64545' : '#E4E3E0'), borderRadius: 10, outline: 'none', marginBottom: 14 }}
              />
              {error && <p id="sq-auth-error" role="alert" style={{ color: '#D64545', fontSize: 13, margin: '-8px 0 14px' }}>{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', padding: '13px 14px', fontSize: 15, fontWeight: 700, color: '#FFFFFF', background: submitting ? '#7FA9AB' : ACC, border: 'none', borderRadius: 10, cursor: submitting ? 'default' : 'pointer' }}
              >
                {submitting ? 'Sending code…' : 'Continue with email'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} noValidate>
              <label htmlFor="sq-code" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>6-digit code</label>
              <input
                id="sq-code"
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                aria-invalid={!!error}
                aria-describedby={error ? 'sq-auth-error' : undefined}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 22, letterSpacing: '0.4em', textAlign: 'center', border: '1px solid ' + (error ? '#D64545' : '#E4E3E0'), borderRadius: 10, outline: 'none', marginBottom: 14 }}
              />
              {error && <p id="sq-auth-error" role="alert" style={{ color: '#D64545', fontSize: 13, margin: '-8px 0 14px' }}>{error}</p>}
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                style={{ width: '100%', padding: '13px 14px', fontSize: 15, fontWeight: 700, color: '#FFFFFF', background: (submitting || code.length !== 6) ? '#7FA9AB' : ACC, border: 'none', borderRadius: 10, cursor: (submitting || code.length !== 6) ? 'default' : 'pointer', marginBottom: 14 }}
              >
                {submitting ? 'Verifying…' : 'Verify and continue'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={changeEmail} style={{ background: 'none', border: 'none', padding: 0, color: '#6B6B6B', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={() => requestCode()}
                  disabled={cooldown > 0 || submitting}
                  style={{ background: 'none', border: 'none', padding: 0, color: cooldown > 0 ? '#A9A9A9' : ACC, cursor: cooldown > 0 ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ fontSize: 13, color: '#6B6B6B', marginTop: 20, textAlign: 'center' }}>
          {mode === 'sign-up' ? (
            <>Already have an account? <a href={otherModeHref} style={{ color: ACC, fontWeight: 600, textDecoration: 'none' }}>Sign in</a></>
          ) : (
            <>Don&apos;t have an account? <a href={otherModeHref} style={{ color: ACC, fontWeight: 600, textDecoration: 'none' }}>Start free trial</a></>
          )}
        </p>
      </div>
    </div>
  )
}

export default function EmailCodeAuth({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BG }} />}>
      <EmailCodeAuthContent mode={mode} />
    </Suspense>
  )
}
