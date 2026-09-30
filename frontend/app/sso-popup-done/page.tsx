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
    <div style={{ minHeight: '100vh', background: '#F5F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#0B1233' }}>
        <p style={{ fontSize: '16px', color: '#646D8F' }}>Signing in...</p>
      </div>
    </div>
  )
}
