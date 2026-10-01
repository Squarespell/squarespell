'use client'
import { Suspense } from 'react'
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors'
import AuthShell from '@/components/auth/AuthShell'
import { ForgotPasswordForm } from '@/components/auth/AuthForms'

function ForgotPasswordContent() {
  return (
    <AuthShell mode="sign-in" otherModeHref="/sign-up">
      <ForgotPasswordForm />
    </AuthShell>
  )
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: C.BG }} />}><ForgotPasswordContent /></Suspense>
}
