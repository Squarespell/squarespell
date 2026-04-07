'use client'
import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const appearance = {
  variables: {
    colorPrimary: '#D2FF1D',
    colorBackground: '#0a0d08',
    colorInputBackground: 'rgba(255,255,255,0.07)',
    colorInputText: '#f0f2f5',
    colorText: '#f0f2f5',
    colorTextSecondary: 'rgba(240,242,245,0.5)',
    colorNeutral: '#f0f2f5',
    borderRadius: '12px',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    fontSize: '17px',
    spacingUnit: '5px',
  },
  elements: {
    formButtonPrimary: {
      background: '#D2FF1D',
      color: '#07090c',
      fontWeight: '700',
      fontSize: '17px',
      height: '56px',
      borderRadius: '12px',
    },
    socialButtonsBlockButton: {
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      color: '#f0f2f5',
      fontSize: '16px',
      fontWeight: '500',
      height: '56px',
      borderRadius: '12px',
    },
    socialButtonsBlockButtonText: {
      fontWeight: '500',
      fontSize: '16px',
      color: '#f0f2f5',
    },
    footerActionLink: { color: '#D2FF1D', fontWeight: '600' },
    card: { boxShadow: 'none', background: 'transparent', border: 'none', padding: '0' },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    formFieldInput: {
      fontSize: '17px',
      height: '56px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.12)',
      color: '#f0f2f5',
    },
    formFieldLabel: { fontSize: '15px', fontWeight: '600', color: 'rgba(240,242,245,0.7)', marginBottom: '8px' },
    dividerLine: { background: 'rgba(255,255,255,0.1)' },
    dividerText: { color: 'rgba(240,242,245,0.4)', fontSize: '14px' },
    rootBox: { width: '100%' },
    badge: { display: 'none' },
    formField__firstName: { display: 'none' },
    formField__lastName: { display: 'none' },
  }
}

function SignUpContent() {
  const searchParams = useSearchParams()
  const fromTry = searchParams.get('from') === 'try'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      padding: '40px 24px',
    }}>
      <style>{`
        .cl-rootBox { width: 100% !important; max-width: 100% !important; }
        .cl-card { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; border-radius: 0 !important; width: 100% !important; }
        .cl-main { width: 100% !important; gap: 20px !important; }
        .cl-header { display: none !important; }
        .cl-socialButtonsBlockButton { height: 56px !important; font-size: 16px !important; border-radius: 12px !important; background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important; color: #f0f2f5 !important; width: 100% !important; }
        .cl-socialButtonsBlockButtonText { color: #f0f2f5 !important; font-size: 16px !important; font-weight: 500 !important; }
        .cl-providerIcon__apple { filter: invert(1) !important; width: 20px !important; height: 20px !important; }
        .cl-socialButtonsBlockButton__apple .cl-providerIcon { filter: invert(1) !important; }
        .cl-formFieldInput { height: 56px !important; font-size: 17px !important; background: rgba(255,255,255,0.07) !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 12px !important; color: #f0f2f5 !important; padding: 0 18px !important; }
        .cl-formFieldLabel { font-size: 15px !important; font-weight: 600 !important; color: rgba(240,242,245,0.6) !important; }
        .cl-formButtonPrimary { height: 56px !important; font-size: 17px !important; font-weight: 700 !important; background: #D2FF1D !important; color: #07090c !important; border-radius: 12px !important; border: none !important; }
        .cl-footerAction { margin-top: 20px !important; text-align: center !important; }
        .cl-footerActionText { font-size: 15px !important; color: rgba(240,242,245,0.4) !important; }
        .cl-footerActionLink { font-size: 15px !important; color: #D2FF1D !important; font-weight: 600 !important; }
        .cl-internal-b3fm6y { display: none !important; }
        .cl-internal-1dauvpw { display: none !important; }
        .cl-badge { display: none !important; }
        [data-clerk-badge] { display: none !important; }
        .cl-dividerRow { margin: 16px 0 !important; }
        .cl-dividerLine { background: rgba(255,255,255,0.1) !important; }
        .cl-dividerText { color: rgba(240,242,245,0.4) !important; font-size: 14px !important; }
        .cl-socialButtonsRoot { gap: 12px !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '48px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#D2FF1D" stroke="none">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#f0f2f5', letterSpacing: '-0.04em', margin: '0 0 10px', lineHeight: 1.1 }}>
            Start your free trial
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(240,242,245,0.45)', margin: 0 }}>
            7 days free. No credit card required.
          </p>
        </div>

        {/* From try banner */}
        {fromTry && (
          <div style={{ marginBottom: '28px', background: 'rgba(210,255,29,0.08)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D2FF1D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: '15px', color: '#D2FF1D', fontWeight: 600 }}>Your quiz is ready. Create your account to publish it.</span>
          </div>
        )}

        {/* Clerk widget */}
        <SignUp
          appearance={appearance}
          afterSignUpUrl={fromTry ? '/dashboard?new=true' : '/dashboard'}
        />

        {/* Tiny secured by */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(240,242,245,0.2)', marginTop: '32px' }}>
          Secured by Clerk
        </p>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return <Suspense><SignUpContent /></Suspense>
}
