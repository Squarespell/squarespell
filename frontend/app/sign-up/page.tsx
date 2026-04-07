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
    socialButtonsBlockButton: { border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f0f2f5', fontSize: '15px', fontWeight: '500' },
    socialButtonsBlockButtonText: { fontWeight: '500', fontSize: '15px' },
    footerActionLink: { color: '#D2FF1D' },
    card: { boxShadow: 'none', background: 'transparent', border: 'none' },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    formFieldInput: { fontSize: '16px', height: '48px' },
    dividerLine: { background: 'rgba(255,255,255,0.08)' },
    dividerText: { color: 'rgba(240,242,245,0.4)', fontSize: '13px' },
    rootBox: { width: '100%' },
    formField__firstName: { display: 'none' },
    formField__lastName: { display: 'none' },
  }
}

const RightPanel = () => (
  <div style={{ flex: 1, background: 'linear-gradient(135deg, #0a0f05 0%, #0d1a0a 40%, #071a12 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(210,255,29,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}/>
    <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(210,255,29,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>
    <div/>
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(210,255,29,0.1)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '20px', padding: '6px 16px', marginBottom: '32px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D2FF1D' }}/>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#D2FF1D' }}>AI-powered quiz funnels</span>
      </div>
      <h1 style={{ fontSize: '52px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '24px' }}>Turn visitors into<br/><span style={{ color: '#D2FF1D' }}>qualified leads.</span></h1>
      <p style={{ fontSize: '18px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.7, maxWidth: '440px' }}>Build branded quizzes for your Squarespace site. Capture leads automatically. No code needed.</p>
      <div style={{ display: 'flex', gap: '40px', marginTop: '56px' }}>
        <div><p style={{ fontSize: '36px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1 }}>2,400+</p><p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.4)', marginTop: '6px' }}>Squarespace owners</p></div>
        <div><p style={{ fontSize: '36px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1 }}>12%</p><p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.4)', marginTop: '6px' }}>Avg conversion rate</p></div>
        <div><p style={{ fontSize: '36px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1 }}>30s</p><p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.4)', marginTop: '6px' }}>To build a quiz</p></div>
      </div>
    </div>
    <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '28px' }}>
      <p style={{ fontSize: '16px', color: 'rgba(240,242,245,0.6)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '12px' }}>&ldquo;Squarespell helped me capture 3x more leads from my coaching site in the first week.&rdquo;</p>
      <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.3)' }}>Sarah K., Business Coach, New York</p>
    </div>
  </div>
)

function SignUpContent() {
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"DM Sans", system-ui, sans-serif', background: '#07090c' }}>

      {/* LEFT — FORM PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', background: '#07090c', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#D2FF1D" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em', marginBottom: '8px' }}>Start your free trial</h2>
          <p style={{ fontSize: '16px', color: 'rgba(240,242,245,0.5)', marginBottom: fromTry ? '16px' : '32px' }}>7 days free. No credit card required.</p>
          {fromTry && (
            <div style={{ marginBottom: '24px', background: 'rgba(210,255,29,0.08)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D2FF1D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: '14px', color: '#D2FF1D', fontWeight: '600' }}>Your quiz is ready. Create your account to publish it.</span>
            </div>
          )}
          <SignUp appearance={appearance} afterSignUpUrl={fromTry ? '/dashboard?new=true' : '/dashboard'} />
        </div>
      </div>

      {/* RIGHT — BRANDING PANEL */}
      <RightPanel />
    </div>
  )
}

export default function SignUpPage() {
  return <Suspense><SignUpContent /></Suspense>
}
