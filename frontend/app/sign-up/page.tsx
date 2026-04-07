'use client'
import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const appearance = {
  variables: {
    colorPrimary: '#D2FF1D',
    colorBackground: '#0f1115',
    colorInputBackground: 'rgba(255,255,255,0.06)',
    colorInputText: '#f0f2f5',
    colorText: '#f0f2f5',
    colorTextSecondary: 'rgba(240,242,245,0.5)',
    colorNeutral: '#f0f2f5',
    borderRadius: '10px',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    fontSize: '16px',
  },
  elements: {
    formButtonPrimary: { background: '#D2FF1D', color: '#07090c', fontWeight: '700', fontSize: '16px' },
    socialButtonsBlockButton: { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f2f5', fontSize: '15px', fontWeight: '500' },
    socialButtonsBlockButtonText: { fontWeight: '500', fontSize: '15px' },
    footerActionLink: { color: '#D2FF1D' },
    card: { boxShadow: 'none', border: '1px solid rgba(255,255,255,0.08)' },
    headerTitle: { fontSize: '24px', fontWeight: '800', color: '#f0f2f5' },
    headerSubtitle: { color: 'rgba(240,242,245,0.5)' },
    formFieldInput: { fontSize: '16px', height: '48px' },
    dividerLine: { background: 'rgba(255,255,255,0.08)' },
    dividerText: { color: 'rgba(240,242,245,0.4)', fontSize: '13px' },
    formField__firstName: { display: 'none' },
    formField__lastName: { display: 'none' },
  }
}

function SignUpContent() {
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#D2FF1D" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>
        <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.4)' }}>AI quiz funnels for Squarespace</p>
      </div>
      {fromTry && (
        <div style={{ marginBottom: '24px', background: 'rgba(210,255,29,0.08)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '10px', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '400px', width: '100%' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D2FF1D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ fontSize: '15px', color: '#D2FF1D', fontWeight: '600' }}>Your quiz is ready. Create your account to publish it.</span>
        </div>
      )}
      <SignUp
        appearance={appearance}
        afterSignUpUrl={fromTry ? '/dashboard?new=true' : '/dashboard'}
        unsafeMetadata={{}}
      />
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  )
}
