'use client'
import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function SignOutPage() {
  const { signOut } = useClerk()

  useEffect(() => {
    signOut({ redirectUrl: '/sign-in' })
  }, [signOut])

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(13,115,119,.2)', borderTopColor: '#0f7377', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
