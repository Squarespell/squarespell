'use client'
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function SSOCallback() {
  const [showFallback, setShowFallback] = useState(false)

  // If the callback takes more than 10 seconds, show a fallback link
  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), 10000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <AuthenticateWithRedirectCallback
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
      <div style={{ textAlign: 'center', color: '#f0f2f5' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #D2FF1D', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.5)' }}>Completing sign-in...</p>
        {showFallback && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.35)', marginBottom: '12px' }}>
              Taking longer than expected?
            </p>
            <a
              href="/dashboard"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#D2FF1D',
                color: '#07090c',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: '"DM Sans", system-ui, sans-serif',
              }}
            >
              Go to Dashboard
            </a>
            <p style={{ fontSize: '12px', color: 'rgba(240,242,245,0.25)', marginTop: '12px' }}>
              Or <a href="/sign-in" style={{ color: '#D2FF1D', textDecoration: 'none' }}>try signing in again</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
