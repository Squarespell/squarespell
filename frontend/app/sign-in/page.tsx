'use client'
import { SignIn } from '@clerk/nextjs'

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
    socialButtonsProviderIcon__apple: {
      filter: 'invert(1)',
      width: '20px',
      height: '20px',
    },
    footerActionLink: { color: '#D2FF1D', fontWeight: '600' },
    footer: { background: 'transparent' },
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
    internal: { display: 'none' },
    footer__signIn: { '& p': { fontSize: '15px', color: 'rgba(240,242,245,0.4)' } },
  }
}

export default function SignInPage() {
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
        .cl-internal-b3fm6y { display: none !important; }
        .cl-internal-1dauvpw { display: none !important; }
        [data-localization-key="socialButtons.blockButton__apple"] img,
        [data-localization-key="socialButtons.blockButton__apple"] svg { filter: invert(1) !important; }
        .cl-providerIcon__apple { filter: invert(1) !important; }
        .cl-footer { display: none !important; }
        .cl-footerAction { margin-top: 24px !important; }
        .cl-footerActionText { font-size: 15px !important; color: rgba(240,242,245,0.4) !important; }
        .cl-footerActionLink { font-size: 15px !important; color: #D2FF1D !important; font-weight: 600 !important; }
        .cl-socialButtonsBlockButton { transition: background 0.15s !important; }
        .cl-socialButtonsBlockButton:hover { background: rgba(255,255,255,0.1) !important; }
        .cl-formButtonPrimary:hover { opacity: 0.88 !important; }
        .cl-card { padding: 0 !important; }
        .cl-main { gap: 20px !important; }
        .cl-socialButtonsRoot { gap: 12px !important; }
        .cl-formField { gap: 8px !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '480px' }}>
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
            Welcome back
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(240,242,245,0.45)', margin: 0 }}>
            Sign in to your Squarespell account
          </p>
        </div>

        {/* Clerk widget */}
        <SignIn appearance={appearance} afterSignInUrl="/dashboard" />

        {/* Tiny secured by */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(240,242,245,0.2)', marginTop: '32px' }}>
          Secured by Clerk
        </p>
      </div>
    </div>
  )
}
