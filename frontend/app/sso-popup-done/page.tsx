'use client'
import { useEffect } from 'react'

export default function SSOPopupDone() {
  useEffect(() => {
    const channel = new BroadcastChannel('oauth_channel')
    channel.postMessage('oauth_complete')
    channel.close()
    window.close()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Poppins", system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#1A1A1A' }}>
        <p style={{ fontSize: '16px', color: '#6B6B6B' }}>Signing in...</p>
      </div>
    </div>
  )
}
