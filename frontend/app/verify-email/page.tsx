'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors'
import AuthShell from '@/components/auth/AuthShell'
import { VerifyEmailView } from '@/components/auth/AuthForms'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  return (
    <AuthShell mode="sign-in" otherModeHref="/sign-up">
      <VerifyEmailView token={searchParams.get('token') || ''} />
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: C.BG }} />}><VerifyEmailContent /></Suspense>
}
