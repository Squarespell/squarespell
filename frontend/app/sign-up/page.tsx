'use client'
import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const appearance = {
  variables: {
    colorPrimary: '#D2FF1D',
    colorBackground: '#080f06',
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
    socialButtonsBlockButton: { border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#f0f2f5', fontSize: '15px', fontWeight: '500' },
    socialButtonsBlockButtonText: { fontWeight: '500', fontSize: '15px' },
    footerActionLink: { color: '#D2FF1D' },
    card: { boxShadow: 'none', background: 'transparent', border: 'none' },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    formFieldInput: { fontSize: '16px', height: '48px' },
    dividerLine: { background: 'rgba(255,255,255,0.08)' },
    dividerText: { color: 'rgba(240,242,245,0.4)', fontSize: '13px' },
    rootBox: { width: '100%' },
    badge: { display: 'none' },
    formField__firstName: { display: 'none' },
    formField__lastName: { display: 'none' },
  }
}

const BrandPanel = () => (
  <div style={{ flex: 1, background: '#0d1a0a', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 56px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(210,255,29,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(210,255,29,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <div />
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(210,255,29,0.1)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '20px', padding: '6px 16px', marginBottom: '32px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D2FF1D' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#D2FF1D' }}>7-day free trial</span>
      </div>
      <h1 style={{ fontSize: '52px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 20px' }}>
        Turn visitors into<br /><span style={{ color: '#D2FF1D' }}>qualified leads.</span>
      </h1>
      <p style={{ fontSize: '18px', color: 'rgba(240,242,245,0.45)', lineHeight: 1.7, margin: '0 0 48px', maxWidth: '420px' }}>
        Build branded quizzes for your Squarespace site. Capture leads automatically. No code needed.
      </p>
      <div style={{ display: 'flex', gap: '40px' }}>
        <div><p style={{ fontSize: '36px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>2,400+</p><p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.35)', margin: '6px 0 0' }}>Squarespace owners</p></div>
        <div><p style={{ fontSize: '36px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>12%</p><p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.35)', margin: '6px 0 0' }}>Avg conversion rate</p></div>
        <div><p style={{ fontSize: '36px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>30s</p><p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.35)', margin: '6px 0 0' }}>To build a quiz</p></div>
      </div>
    </div>
    <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(210,255,29,0.1)', paddingTop: '28px' }}>
      <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.55)', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 10px' }}>&ldquo;Squarespell helped me capture 3x more leads from my coaching site in the first week.&rdquo;</p>
      <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.3)', margin: 0 }}>Sarah K., Business Coach, New York</p>
    </div>
  </div>
)

function SignUpContent() {
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <div style={{ flex: 1, background: '#080f06', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 56px', borderRight: '1px solid rgba(210,255,29,0.08)' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#D2FF1D" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
          </div>
          <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em', margin: '0 0 8px' }}>Start your free trial</h2>
          <p style={{ fontSize: '16px', color: 'rgba(240,242,245,0.45)', margin: '0 0 24px' }}>7 days free. No credit card required.</p>
          {fromTry && (
            <div style={{ marginBottom: '24px', background: 'rgba(210,255,29,0.08)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D2FF1D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              <span style={{ fontSize: '14px', color: '#D2FF1D', fontWeight: 600 }}>Your quiz is ready. Create your account to publish it.</span>
            </div>
          )}
          <SignUp appearance={appearance} afterSignUpUrl={fromTry ? '/dashboard?new=true' : '/dashboard'} />
        </div>
      </div>
      <BrandPanel />
    </div>
  )
}

export default function SignUpPage() {
  return <Suspense><SignUpContent /></Suspense>
}
