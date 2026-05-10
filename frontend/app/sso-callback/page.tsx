'use client'
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

const ACC = '#0D7377'

export default function SSOCallback() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <AuthenticateWithRedirectCallback
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '32px', height: '32px', background: ACC, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#FFFFFF"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#FFFFFF"/><circle cx="17" cy="18" r="2" fill="#FFFFFF"/></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.03em' }}>Squarespell Quiz</span>
        </div>

        <div style={{ width: '32px', height: '32px', border: '2.5px solid rgba(13,115,119,.15)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 20px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        <p style={{ fontSize: '15px', color: '#6B6B6B', margin: '0 0 4px' }}>
          {elapsed < 5 ? 'Completing sign-in...' : elapsed < 10 ? 'Almost there...' : 'Taking longer than usual...'}
        </p>

        {elapsed >= 8 && (
          <div style={{ marginTop: '24px' }}>
            <a href="/dashboard" style={{
              display: 'inline-block', padding: '12px 28px',
              background: ACC, color: '#FFFFFF', borderRadius: '10px',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            }}>
              Go to Dashboard →
            </a>
            <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '16px' }}>
              Or <a href="/sign-in" style={{ color: ACC, textDecoration: 'none' }}>try signing in again</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
