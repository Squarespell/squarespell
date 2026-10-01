'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors'
import AuthShell from '@/components/auth/AuthShell'
import { SignInForm } from '@/components/auth/AuthForms'
import { useAuth } from '@/lib/auth/client'
import { authDestinations } from '@/lib/auth/destinations'

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: C.BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(49, 84, 255,.2)', borderTopColor: C.ACCENT, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SignInContent() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { dest, signUpUrl } = authDestinations(searchParams)

  useEffect(() => {
    if (isSignedIn) router.replace(dest)
  }, [isSignedIn, router, dest])

  if (!isLoaded || isSignedIn) return <Spinner />

  return (
    <AuthShell mode="sign-in" otherModeHref={signUpUrl}>
      <SignInForm next={dest} signUpHref={signUpUrl} errorCode={searchParams.get('error') || undefined} />
    </AuthShell>
  )
}

export default function SignInPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: C.BG }} />}><SignInContent /></Suspense>
}
