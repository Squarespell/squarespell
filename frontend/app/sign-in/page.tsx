'use client'
import { SignIn } from '@clerk/nextjs'

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
    headerTitle: { fontSize: '28px', fontWeight: '800', color: '#f0f2f5' },
    headerSubtitle: { color: 'rgba(240,242,245,0.5)', fontSize: '15px' },
    formFieldInput: { fontSize: '16px', height: '48px' },
    dividerLine: { background: 'rgba(255,255,255,0.08)' },
    dividerText: { color: 'rgba(240,242,245,0.4)', fontSize: '13px' },
    rootBox: { width: '100%' },
  }
}

export default function SignInPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"DM Sans", system-ui, sans-serif', background: '#07090c' }}>

      {/* LEFT PANEL */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #0a0f05 0%, #0d1a0a 40%, #071a12 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(210,255,29,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(210,255,29,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#D2FF1D" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(210,255,29,0.1)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '20px', padding: '6px 14px', marginBottom: '28px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D2FF1D' }}/>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#D2FF1D' }}>AI-powered quiz funnels</span>
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}>Turn visitors into<br/><span style={{ color: '#D2FF1D' }}>qualified leads.</span></h1>
          <p style={{ fontSize: '18px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, maxWidth: '420px' }}>Build branded quizzes for your Squarespace site. Capture leads automatically. No code needed.</p>

          <div style={{ display: 'flex', gap: '32px', marginTop: '48px' }}>
            <div>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1 }}>2,400+</p>
              <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.4)', marginTop: '4px' }}>Squarespace owners</p>
            </div>
            <div>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1 }}>12%</p>
              <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.4)', marginTop: '4px' }}>Avg conversion rate</p>
            </div>
            <div>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#D2FF1D', letterSpacing: '-0.04em', lineHeight: 1 }}>30s</p>
              <p style={{ fontSize: '14px', color: 'rgba(240,242,245,0.4)', marginTop: '4px' }}>To build a quiz</p>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
          <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.6)', lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;Squarespell helped me capture 3x more leads from my coaching site in the first week.&rdquo;</p>
          <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.3)', marginTop: '8px' }}>Sarah K., Business Coach</p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: '520px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', background: '#07090c', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em', marginBottom: '8px' }}>Welcome back</h2>
          <p style={{ fontSize: '16px', color: 'rgba(240,242,245,0.5)', marginBottom: '32px' }}>Sign in to your Squarespell account</p>
          <SignIn appearance={appearance} afterSignInUrl="/dashboard" />
        </div>
      </div>
    </div>
  )
}
