'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors'
import { Wordmark } from '@/app/dashboard/_components/Brand'

/* ─── functional gateway page (2026 redesign, screen 01: "Turn your website into a quiz.") ───
   Paste a URL to land in the builder, start from a template, or sign in / sign up.
   The right-hand composition is an illustrative example of what gets built, not real data. */

const QUESTIONS = [
  { n: 1, q: 'What’s your biggest marketing challenge right now?', opts: ['Getting more clients', 'Clarifying my message', 'Building my visibility', 'Other'], pick: 0 },
  { n: 2, q: 'How would you describe your current stage?', opts: ['Just getting started', 'Growing steadily', 'Ready to scale', 'Not sure yet'], pick: 1 },
  { n: 3, q: 'What type of support interests you most?', opts: ['Strategy & positioning', 'Website & content', 'Coaching or mentorship', 'Other'], pick: 0 },
]

function Hand({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={{ position: 'absolute', fontFamily: C.SERIF_FONT, fontStyle: 'italic', fontSize: 22, lineHeight: 1.15, color: C.INK, ...style }}>{children}</div>
}

export default function QuizFunnelPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')

  function go(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    const u = url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim()
    router.push(`${QUIZ_BUILDER_PATH}?url=${encodeURIComponent(u)}`)
  }

  return (
    <div style={{ fontFamily: C.FONT, background: C.BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', color: C.INK }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .qf-main { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr); gap: 48px; align-items: center; }
        .qf-cta:hover { background: ${C.ACCENT_HOVER} !important; }
        @media (max-width: 1100px) { .qf-main { grid-template-columns: 1fr; } .qf-art { display: none !important; } }
      ` }} />

      <nav style={{ padding: '0 clamp(20px, 4vw, 60px)', height: 88, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" aria-label="Squarespell Quiz home" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <Wordmark size={32} /><span style={{ fontSize: 22, color: C.INK, marginLeft: 2 }}>Quiz</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/sign-in" style={{ fontSize: 18, color: C.GRAY_600, textDecoration: 'none' }}>Sign in</Link>
          <Link href="/sign-up" className="qf-cta" style={{ fontSize: 18, fontWeight: 500, color: '#fff', background: C.ACCENT, textDecoration: 'none', height: 54, padding: '0 28px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>Sign up free</Link>
        </div>
      </nav>

      <main className="qf-main" style={{ flex: 1, padding: '20px clamp(20px, 4vw, 60px) 40px' }}>
        <section style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 14, letterSpacing: '0.2em', color: C.GRAY_600, marginBottom: 30 }}>
            <span aria-hidden="true" style={{ width: 70, borderTop: '1px solid ' + C.GRAY_400 }} />AI-POWERED QUIZ CREATION
          </div>
          <h1 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(52px, 6.4vw, 104px)', fontWeight: 500, letterSpacing: '-0.05em', lineHeight: 0.92 }}>
            Turn your website into a quiz<span style={{ color: C.ACCENT }}>.</span>
          </h1>
          <p style={{ fontSize: 'clamp(19px, 1.8vw, 26px)', color: C.GRAY_600, lineHeight: 1.4, margin: '30px 0 40px', maxWidth: 560 }}>
            Our AI reads your brand, audience and offers to build a matching quiz you can edit before you publish.
          </p>
          <form onSubmit={go} style={{ display: 'flex', gap: 8, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 8, maxWidth: 620 }}>
            <label htmlFor="qf-url" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Your website address</label>
            <input
              id="qf-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              autoComplete="url"
              placeholder="yourwebsite.com"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 20, color: C.INK, padding: '0 18px', fontFamily: C.FONT }}
            />
            <button type="submit" className="qf-cta" style={{ background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 6, height: 62, padding: '0 28px', fontSize: 20, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: C.FONT, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Analyze &amp; build <span aria-hidden="true">→</span>
            </button>
          </form>
          <div style={{ maxWidth: 620, textAlign: 'center', marginTop: 28 }}>
            <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', color: C.GRAY_500, fontSize: 16, marginBottom: 16 }}>
              <span style={{ width: 120, borderTop: '1px solid ' + C.BORDER }} />OR<span style={{ width: 120, borderTop: '1px solid ' + C.BORDER }} />
            </div>
            <Link href="/templates" style={{ fontSize: 19, color: C.ACCENT, textDecoration: 'none' }}>Start from a template →</Link>
          </div>
        </section>

        <section className="qf-art" aria-hidden="true" style={{ position: 'relative', height: 720 }}>
          <svg width="100%" height="100%" viewBox="0 0 800 720" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
            <path d="M360 10 H 760 L 530 470 H 130 Z" fill={C.PERIWINKLE} />
            <rect x="690" y="70" width="76" height="72" fill={C.ACID} opacity="0.8" />
          </svg>
          <Hand style={{ left: 60, top: 40, transform: 'rotate(-10deg)' }}>AI turns your website<br />into a branded quiz</Hand>
          <div style={{ position: 'absolute', left: 0, top: 170, display: 'flex', alignItems: 'center', gap: 10 }}>
            {QUESTIONS.map((q, qi) => (
              <div key={q.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 236, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 16, boxShadow: '0 20px 40px -24px rgba(11, 18, 51,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: '0.16em', color: C.GRAY_500, marginBottom: 12 }}><span>{q.n}. QUESTION</span><span>•••</span></div>
                  <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.3, marginBottom: 14, minHeight: 62 }}>{q.q}</div>
                  {q.opts.map((o, i) => (
                    <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 34, padding: '0 10px', marginBottom: 6, borderRadius: 4, fontSize: 13, border: '1px solid ' + (i === q.pick ? C.BRAND_300 : C.BORDER), background: i === q.pick ? C.PERIWINKLE_SOFT : '#fff' }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid ' + (i === q.pick ? C.ACCENT : C.GRAY_400), background: i === q.pick ? C.ACCENT : '#fff', boxShadow: i === q.pick ? 'inset 0 0 0 2.5px #fff' : 'none' }} />{o}
                    </div>
                  ))}
                </div>
                {qi < QUESTIONS.length - 1 && <span style={{ fontSize: 22 }}>→</span>}
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 170, top: 520, width: 440, display: 'flex', gap: 18, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 12, boxShadow: '0 20px 40px -24px rgba(11, 18, 51,0.25)' }}>
            <svg width="150" height="170" viewBox="0 0 150 170" style={{ flexShrink: 0, borderRadius: 4 }}>
              <rect width="150" height="170" fill="#EFE9E0" />
              <path d="M0 120 C 40 100, 90 130, 150 110 V 170 H 0 Z" fill="#E2D9CC" />
              <path d="M60 150 C 55 130, 58 118, 70 112 C 82 118, 85 130, 80 150 Z" fill="#F7F3EC" stroke="#D8CEBF" />
              <path d="M70 112 C 66 90, 60 70, 54 50 M70 112 C 76 90, 84 72, 92 56 M70 100 C 62 88, 52 84, 44 82" stroke="#6B7A55" strokeWidth="1.6" fill="none" />
            </svg>
            <div style={{ paddingTop: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', color: C.GRAY_500 }}>YOUR RESULT</div>
              <div style={{ fontFamily: C.SERIF_FONT, fontSize: 32, lineHeight: 1, margin: '10px 0 10px' }}>A Strategic Builder</div>
              <div style={{ fontSize: 13, color: C.GRAY_600, lineHeight: 1.45, marginBottom: 14 }}>You’re focused, purpose-driven and ready to grow with intention.</div>
              <span style={{ display: 'inline-flex', height: 36, alignItems: 'center', padding: '0 14px', borderRadius: 4, background: C.INK, color: '#fff', fontSize: 13 }}>View your personalized plan →</span>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 640, top: 520, width: 150, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', color: C.GRAY_600, marginBottom: 14 }}>BRAND PALETTE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[C.ACCENT, C.PERIWINKLE, C.ACID, C.INK].map((c) => <span key={c} style={{ width: 46, height: 46, borderRadius: '50%', background: c }} />)}
            </div>
          </div>
          <Hand style={{ left: 0, top: 590, transform: 'rotate(-12deg)' }}>A beautifully branded<br />quiz, ready to share</Hand>
          <Hand style={{ left: 640, top: 680, transform: 'rotate(-10deg)', fontSize: 19 }}>We match your brand’s look</Hand>
        </section>
      </main>

      <footer style={{ padding: '24px clamp(20px, 4vw, 60px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 15, color: C.GRAY_500 }}>© 2026 Squarespell Quiz. All rights reserved.</div>
        <div style={{ display: 'flex', gap: 28 }}>
          {[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'squarespell.com', href: 'https://squarespell.com/quiz' }].map((l) => (
            <a key={l.label} href={l.href} style={{ fontSize: 15, color: C.GRAY_500, textDecoration: 'none' }}>{l.label}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
