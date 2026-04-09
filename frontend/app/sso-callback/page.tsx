'use client'
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

const ACC = '#D2FF1D'

export default function SSOCallback() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <AuthenticateWithRedirectCallback
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '32px', height: '32px', background: ACC, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>

        <div style={{ width: '32px', height: '32px', border: '2.5px solid rgba(210,255,29,.15)', borderTopColor: ACC, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 20px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.5)', margin: '0 0 4px' }}>
          {elapsed < 5 ? 'Completing sign-in...' : elapsed < 10 ? 'Almost there...' : 'Taking longer than usual...'}
        </p>

        {elapsed >= 8 && (
          <div style={{ marginTop: '24px' }}>
            <a href="/dashboard" style={{
              display: 'inline-block', padding: '12px 28px',
              background: ACC, color: '#07090c', borderRadius: '10px',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            }}>
              Go to Dashboard →
            </a>
            <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.2)', marginTop: '16px' }}>
              Or <a href="/sign-in" style={{ color: ACC, textDecoration: 'none' }}>try signing in again</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
