'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/authApi'

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    (async () => {
      try { await authApi.logout() } catch {}
      try { sessionStorage.removeItem('sq_auth_ok') } catch {}
      router.replace('/sign-in')
    })()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(15,115,119,.2)', borderTopColor: '#0f7377', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
