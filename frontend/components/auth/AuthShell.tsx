'use client'
import type { ReactNode } from 'react'
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors'
import { Wordmark, BrandMark } from '@/app/dashboard/_components/Brand'

const ACC = C.ACCENT
const BG = C.BG

/**
 * 2026 redesign auth shell (screens 07 and 08). Focused layout: logo, Help and the other-mode link only, no
 * workspace navigation. Sign-up shows an editorial panel with illustrative quiz and result cards; sign-in uses a
 * pale periwinkle panel. The form itself is passed in as children (Clerk's own <SignIn>/<SignUp>), so the shell
 * only restyles the page and never changes how authentication works.
 */
export default function AuthShell({ mode, otherModeHref, children }: { mode: 'sign-in' | 'sign-up'; otherModeHref: string; children: ReactNode }) {
  const arrow = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>

  const form = <>{children}</>

  const header = (
    <header style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px clamp(20px, 5vw, 80px)' }}>
      {mode === 'sign-up' ? <a href="/" aria-label="Squarespell Quiz home" style={{ textDecoration: 'none' }}><Wordmark size={34} /></a> : <span />}
      <nav aria-label="Account" style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 18 }}>
        <a href="/support" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.INK, textDecoration: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M9.2 9a2.9 2.9 0 015.6 1c0 2-2.8 2.6-2.8 4M12 17.3h.01" /></svg>
          Help
        </a>
        <span aria-hidden="true" style={{ width: 1, height: 28, background: C.BORDER }} />
        {mode === 'sign-up'
          ? <a href={otherModeHref} style={{ color: C.INK, textDecoration: 'none' }}>Sign in</a>
          : <a href={otherModeHref} style={{ display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 18px', border: '1px solid ' + C.BORDER, borderRadius: 6, color: C.INK, textDecoration: 'none', background: '#fff' }}>Create account</a>}
      </nav>
    </header>
  )

  const quizCard = (
    <div style={{ width: 320, background: '#fff', borderRadius: 8, padding: '22px 22px 24px', boxShadow: '0 24px 48px -24px rgba(22,23,25,0.25)', border: '1px solid ' + C.BORDER }}>
      <div style={{ fontSize: 12, color: C.GRAY_500, marginBottom: 12 }}>1 / 5</div>
      <div style={{ fontFamily: C.SERIF_FONT, fontSize: 28, lineHeight: 1.05, color: C.INK, marginBottom: 16 }}>What makes your dog truly thrive?</div>
      {['Mental stimulation', 'Regular exercise', 'A balanced diet', 'Lots of love'].map((o, i) => (
        <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 40, padding: '0 12px', marginBottom: 8, borderRadius: 4, border: '1px solid ' + (i === 0 ? C.PERIWINKLE : C.BORDER), background: i === 0 ? C.PERIWINKLE_SOFT : '#fff', fontSize: 14, color: C.INK }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid ' + (i === 0 ? ACC : C.GRAY_400), boxShadow: i === 0 ? 'inset 0 0 0 3px #fff' : 'none', background: i === 0 ? ACC : '#fff' }} />{o}
        </div>
      ))}
      <div style={{ height: 42, marginTop: 14, borderRadius: 4, background: ACC, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}>Next {arrow}</div>
    </div>
  )

  if (mode === 'sign-in') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', fontFamily: C.FONT, background: BG }} className="sq-auth">
        <style dangerouslySetInnerHTML={{ __html: '@media (max-width: 900px){.sq-auth{grid-template-columns:1fr!important}.sq-auth-panel{display:none!important}}' }} />
        <section className="sq-auth-panel" style={{ position: 'relative', overflow: 'hidden', background: C.PERIWINKLE_SOFT }}>
          <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0 }}>
            <path d="M600 490 A 200 200 0 0 1 800 690 L 600 690 Z" fill={C.BRAND_300} />
            <path d="M0 740 A 320 320 0 0 1 320 1000 L 0 1000 Z" fill={C.BRAND_300} opacity="0.7" />
            <rect x="660" y="820" width="140" height="180" fill={C.ACID} />
            <rect x="320" y="820" width="340" height="180" fill={C.PERIWINKLE} />
          </svg>
          <div style={{ position: 'relative', padding: '0 clamp(24px, 5vw, 80px)' }}>
            <div style={{ height: 96, display: 'flex', alignItems: 'center' }}><a href="/" aria-label="Squarespell Quiz home" style={{ textDecoration: 'none', pointerEvents: 'auto' }}><Wordmark size={34} /></a></div>
            <div style={{ fontSize: 14, letterSpacing: '0.2em', color: C.INK, lineHeight: 1.6, marginBottom: 30 }}>QUIZZES FOR<br />BRIGHTER TOMORROW</div>
            <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(48px, 5vw, 76px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.98, color: C.INK }}>Welcome back to your workspace<span style={{ color: ACC }}>.</span></div>
            <p style={{ fontSize: 21, color: C.GRAY_600, margin: '24px 0 40px', maxWidth: 440, lineHeight: 1.4 }}>Sign in to create, edit and publish quizzes that turn curiosity into connection.</p>
            <div aria-hidden="true" style={{ marginLeft: 50 }}>{quizCard}</div>
          </div>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column' }}>
          {header}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '20px clamp(20px, 7vw, 140px) 60px' }}>
            <div style={{ width: '100%', maxWidth: 520 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 34 }}>
                <BrandMark size={36} />
                <span style={{ fontFamily: C.DISPLAY_FONT, fontWeight: 800, fontSize: 24, letterSpacing: '0.01em', color: C.INK }}>SQUARESPELL QUIZ</span>
              </div>
              {form}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: C.FONT, display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{ __html: '.sq-signup{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,640px);gap:clamp(24px,4vw,64px);align-items:start}@media (max-width:980px){.sq-signup{grid-template-columns:1fr}.sq-signup-art{display:none!important}}' }} />
      {header}
      <main className="sq-signup" style={{ flex: 1, padding: '10px clamp(20px, 5vw, 80px) 50px' }}>
        <section style={{ minWidth: 0, paddingTop: 30 }}>
          <div style={{ fontSize: 14, letterSpacing: '0.2em', color: C.GRAY_600, marginBottom: 22 }}>QUIZZES FOR A BRIGHTER TOMORROW</div>
          <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(46px, 5vw, 78px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.96, color: C.INK }}>Your next great quiz starts here<span style={{ color: ACC }}>.</span></h2>
          <p style={{ fontSize: 22, color: C.GRAY_600, margin: '22px 0 34px', lineHeight: 1.4 }}>Turn your ideas into engaging quizzes, in minutes.<br />Create. Customize. Share. Grow.</p>
          <div className="sq-signup-art" aria-hidden="true" style={{ position: 'relative', height: 470 }}>
            <svg width="740" height="470" viewBox="0 0 740 470" style={{ position: 'absolute', left: 0, top: 0, maxWidth: '100%' }}>
              <path d="M46 0 H 460 A 40 40 0 0 1 500 40 V 400 H 46 Z" fill={C.PERIWINKLE} />
              <path d="M0 90 A 90 90 0 0 1 90 180 A 90 90 0 0 1 0 270 Z" fill={ACC} />
              <path d="M0 370 L 70 450 L 0 450 Z" fill={C.ACID} />
              <path d="M680 330 A 50 50 0 0 1 740 390 L 680 390 Z" fill={C.PERIWINKLE} />
            </svg>
            <div style={{ position: 'absolute', left: 90, top: 40 }}>{quizCard}</div>
            <div style={{ position: 'absolute', left: 420, top: 86, width: 270, background: C.PERIWINKLE_SOFT, borderRadius: 8, border: '1px solid ' + C.BORDER, overflow: 'hidden', boxShadow: '0 24px 48px -24px rgba(22,23,25,0.25)' }}>
              <div style={{ padding: '20px 20px 0' }}>
                <div style={{ fontSize: 13, color: C.GRAY_500 }}>Your result</div>
                <div style={{ fontFamily: C.SERIF_FONT, fontSize: 28, lineHeight: 1.05, color: C.INK, margin: '10px 0 10px' }}>The Curious Companion</div>
                <div style={{ fontSize: 14, color: C.GRAY_600, lineHeight: 1.45 }}>Your dog thrives on new experiences, mental challenges and quality time with you.</div>
              </div>
              <svg width="270" height="120" viewBox="0 0 270 120"><circle cx="135" cy="140" r="100" fill={C.PERIWINKLE} /><path d="M90 120 C 95 80, 120 60, 150 62 C 175 64, 190 85, 195 120" fill="none" stroke={C.INK} strokeWidth="1.2" /><circle cx="140" cy="80" r="2.4" fill={C.INK} /></svg>
            </div>
          </div>
        </section>
        <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 'clamp(28px, 4vw, 70px) clamp(24px, 4vw, 70px)' }}>
          {form}
        </section>
      </main>
    </div>
  )
}
