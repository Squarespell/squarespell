'use client'
import { useEffect } from 'react'

export default function SSOPopupDone() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage('oauth_complete', window.location.origin)
      window.close()
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#f0f2f5' }}>
        <p style={{ fontSize: '16px', color: 'rgba(240,242,245,0.5)' }}>Signing in...</p>
      </div>
    </div>
  )
}
