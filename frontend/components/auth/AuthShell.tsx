'use client'
import type { ReactNode } from 'react'
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors'
import { Wordmark } from '@/app/dashboard/_components/Brand'

const ACC = C.ACCENT

/**
 * Auth shell for sign-in, sign-up and the password pages. Two columns that together are exactly one screen tall:
 * a periwinkle brand panel on the left (headline plus an illustrative quiz card) and the form on the right. Nothing
 * scrolls on a normal desktop screen: the headline and the illustration scale with the window height and the
 * illustration steps aside on short screens. On phones the panel is hidden and the page scrolls normally. The form
 * itself is passed in as children (components/auth/AuthForms), so the shell never changes how sign-in works.
 */
export default function AuthShell({ mode, otherModeHref, children }: { mode: 'sign-in' | 'sign-up'; otherModeHref: string; children: ReactNode }) {
  const arrow = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>

  const quizCard = (
    <div style={{ width: 300, background: '#fff', borderRadius: 8, padding: '20px 20px 22px', boxShadow: '0 24px 48px -24px rgba(11, 18, 51,0.25)', border: '1px solid ' + C.BORDER }}>
      <div style={{ fontSize: 12, color: C.GRAY_500, marginBottom: 10 }}>1 / 5</div>
      <div style={{ fontFamily: C.SERIF_FONT, fontSize: 26, lineHeight: 1.05, color: C.INK, marginBottom: 14 }}>What makes your dog truly thrive?</div>
      {['Mental stimulation', 'Regular exercise', 'A balanced diet', 'Lots of love'].map((o, i) => (
        <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 38, padding: '0 12px', marginBottom: 7, borderRadius: 4, border: '1px solid ' + (i === 0 ? C.PERIWINKLE : C.BORDER), background: i === 0 ? C.PERIWINKLE_SOFT : '#fff', fontSize: 14, color: C.INK }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid ' + (i === 0 ? ACC : C.GRAY_400), boxShadow: i === 0 ? 'inset 0 0 0 3px #fff' : 'none', background: i === 0 ? ACC : '#fff' }} />{o}
        </div>
      ))}
      <div style={{ height: 40, marginTop: 12, borderRadius: 4, background: ACC, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}>Next {arrow}</div>
    </div>
  )

  const resultCard = (
    <div style={{ width: 240, background: '#fff', borderRadius: 8, border: '1px solid ' + C.BORDER, overflow: 'hidden', boxShadow: '0 24px 48px -24px rgba(11, 18, 51,0.25)' }}>
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ fontSize: 12, color: C.GRAY_500 }}>Your result</div>
        <div style={{ fontFamily: C.SERIF_FONT, fontSize: 25, lineHeight: 1.05, color: C.INK, margin: '8px 0 8px' }}>The Curious Companion</div>
        <div style={{ fontSize: 13, color: C.GRAY_600, lineHeight: 1.45 }}>Your dog thrives on new experiences, mental challenges and quality time with you.</div>
      </div>
      <svg width="240" height="96" viewBox="0 0 270 108"><circle cx="135" cy="128" r="96" fill={C.PERIWINKLE} /><path d="M90 108 C 95 70, 120 52, 150 54 C 175 56, 190 76, 195 108" fill="none" stroke={C.INK} strokeWidth="1.2" /><circle cx="140" cy="72" r="2.4" fill={C.INK} /></svg>
    </div>
  )

  const copy = mode === 'sign-in'
    ? { kicker: 'QUIZZES FOR A BRIGHTER TOMORROW', title: 'Welcome back to your workspace', sub: 'Sign in to create, edit and publish quizzes that turn curiosity into connection.' }
    : { kicker: 'QUIZZES FOR A BRIGHTER TOMORROW', title: 'Your next great quiz starts here', sub: 'Turn your ideas into engaging quizzes, in minutes. Create. Customize. Share. Grow.' }

  const points = ['AI drafts your quiz from your website', 'Capture leads with a built-in form', 'Embed on Squarespace and any website']

  const css = [
    '.sq-auth{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);height:100vh;height:100dvh;overflow:hidden}',
    '.sq-auth-main{overflow-y:auto}',
    '.sq-auth-brand-mobile{display:none}',
    '.sq-auth-art{transform-origin:left bottom}',
    // Shorter laptop screens: shrink the illustration; very short ones: leave it out so nothing is cut.
    '@media (max-height:900px){.sq-auth-art{transform:scale(.82)}}',
    '@media (max-height:780px){.sq-auth-art{display:none!important}.sq-auth-copy{margin-top:auto!important;margin-bottom:auto}.sq-auth-points{display:grid!important}}',
    // Phones and narrow windows: one column, normal page scrolling.
    '@media (max-width:900px){.sq-auth{grid-template-columns:1fr;height:auto;min-height:100dvh;overflow:visible}.sq-auth-panel{display:none!important}.sq-auth-main{overflow:visible}.sq-auth-brand-mobile{display:inline-flex}}',
    '@media (max-width:420px){.sq-auth-help-label{display:none}}',
  ].join('')

  return (
    <div className="sq-auth" style={{ fontFamily: C.FONT, background: C.BG }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <section className="sq-auth-panel" style={{ position: 'relative', overflow: 'hidden', background: C.PERIWINKLE_SOFT, display: 'flex', flexDirection: 'column', padding: '0 clamp(24px, 4.5vw, 72px) clamp(24px, 4vh, 48px)' }}>
        <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0 }}>
          <path d="M600 490 A 200 200 0 0 1 800 690 L 600 690 Z" fill={C.BRAND_300} />
          <path d="M0 760 A 300 300 0 0 1 300 1000 L 0 1000 Z" fill={C.BRAND_300} opacity="0.7" />
          <rect x="660" y="820" width="140" height="180" fill={C.ACID} />
          <rect x="320" y="840" width="340" height="160" fill={C.PERIWINKLE} />
        </svg>
        <div style={{ position: 'relative', height: 'clamp(64px, 10vh, 96px)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <a href="/" aria-label="Squarespell Quiz home" style={{ textDecoration: 'none' }}><Wordmark size={32} /></a>
        </div>
        <div className="sq-auth-copy" style={{ position: 'relative', flexShrink: 0, marginTop: 'clamp(8px, 3vh, 36px)' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.2em', color: C.INK, lineHeight: 1.6, marginBottom: 'clamp(12px, 2.4vh, 26px)', maxWidth: 260 }}>{copy.kicker}</div>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(38px, min(4.6vw, 7.2vh), 72px)', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 0.98, color: C.INK, maxWidth: 560 }}>{copy.title}<span style={{ color: ACC }}>.</span></div>
          <p style={{ fontSize: 'clamp(16px, 2.2vh, 20px)', color: C.GRAY_600, margin: 'clamp(12px, 2.4vh, 22px) 0 0', maxWidth: 440, lineHeight: 1.45 }}>{copy.sub}</p>
          {/* Shown instead of the illustration on shorter screens, so the panel never looks empty. */}
          <ul className="sq-auth-points" style={{ display: 'none', gap: 10, listStyle: 'none', padding: 0, margin: 'clamp(16px, 3vh, 28px) 0 0', maxWidth: 440 }}>
            {points.map((p) => (
              <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.75)', border: '1px solid ' + C.BORDER, borderRadius: 10, padding: '10px 14px', fontSize: 15, color: C.INK }}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="sq-auth-art" aria-hidden="true" style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', gap: 22, paddingTop: 20 }}>
          <div style={{ marginLeft: 40 }}>{quizCard}</div>
          {mode === 'sign-up' && <div style={{ marginBottom: 40 }}>{resultCard}</div>}
        </div>
      </section>

      <section className="sq-auth-main" style={{ display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 'clamp(16px, 3vh, 26px) clamp(20px, 4vw, 56px)', flexShrink: 0 }}>
          <a className="sq-auth-brand-mobile" href="/" aria-label="Squarespell Quiz home" style={{ textDecoration: 'none' }}><Wordmark size={28} /></a>
          <span />
          <nav aria-label="Account" style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 16 }}>
            <a href="/support" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.INK, textDecoration: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M9.2 9a2.9 2.9 0 015.6 1c0 2-2.8 2.6-2.8 4M12 17.3h.01" /></svg>
              <span className="sq-auth-help-label">Help</span>
            </a>
            <span aria-hidden="true" style={{ width: 1, height: 24, background: C.BORDER }} />
            <a href={otherModeHref} style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 16px', border: '1px solid ' + C.BORDER, borderRadius: 6, color: C.INK, textDecoration: 'none', background: '#fff', whiteSpace: 'nowrap' }}>
              {mode === 'sign-up' ? 'Sign in' : 'Create account'}
            </a>
          </nav>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px clamp(20px, 6vw, 110px) clamp(20px, 4vh, 40px)' }}>
          <div style={{ width: '100%', maxWidth: 460 }}>{children}</div>
        </div>
      </section>
    </div>
  )
}
