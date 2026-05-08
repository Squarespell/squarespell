'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG, getTemplateThumbnail, getTemplateQuestionCount } from '@/lib/quiz/templates'

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [navScrolled, setNavScrolled] = useState(false)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleItems)
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            newVisible.add(entry.target.id)
            observerRef.current?.unobserve(entry.target)
          }
        })
        setVisibleItems(newVisible)
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    return () => { if (observerRef.current) observerRef.current.disconnect() }
  }, [])

  useEffect(() => {
    if (observerRef.current) {
      document.querySelectorAll('[data-animate]').forEach((el) => {
        observerRef.current?.observe(el)
      })
    }
  }, [])

  useEffect(() => {
    if (visibleItems.size > 0) {
      document.querySelectorAll('[data-animate]').forEach((el) => {
        if (visibleItems.has(el.id)) el.classList.add('visible')
      })
    }
  }, [visibleItems])

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      setLoading(true)
      setTimeout(() => {
        router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(url))
      }, 300)
    }
  }

  const faqItems = [
    { question: 'How does Squarespell work with Squarespace?', answer: 'Squarespell generates a quiz embed code that you paste directly into your Squarespace site. No technical knowledge required. The quiz automatically matches your site\'s design, then you can customize every detail.' },
    { question: 'Do I need coding skills?', answer: 'Not at all. Squarespell is built for creators and marketers with no coding experience. Our AI handles the heavy lifting, and our visual editor is drag-and-drop simple.' },
    { question: 'Will the quiz match my design?', answer: 'Yes. Our AI analyzes your Squarespace site\'s colors, typography, and style, then generates a quiz that looks like it was built for you. You can further customize every detail.' },
    { question: 'What happens with captured leads?', answer: 'Leads are stored securely in your Squarespell dashboard. You can export them, connect email tools, or set up automations to nurture them automatically.' },
    { question: 'Can I customize after AI generates?', answer: 'Absolutely. The AI is just a starting point. Edit questions, answers, branching logic, colors, fonts, and scoring rules. Full creative control is yours.' },
    { question: 'Is there a free trial?', answer: 'Yes — 14-day free trial with full Pro features. No credit card required. Your quizzes stay visible after trial, but lead capture pauses until you subscribe.' },
    { question: 'What if I need more leads but not a higher plan?', answer: 'Add-on packs let you buy extra capacity on any paid plan. Lead packs start at $3/mo for 500 extra leads. Email packs start at $3/mo for 1,000 extra emails. No need to upgrade.' },
    { question: 'How is Squarespell different from other quiz tools?', answer: 'Other quiz tools charge $27–75/mo for entry plans with fewer leads. Squarespell starts at $9/mo annual with 1,000 leads, branching logic, and native Squarespace integration. Our AI generates a fully branded quiz from your website URL in under 60 seconds.' },
    { question: 'What integrations are included with Pro?', answer: 'Pro includes Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Connect your existing marketing stack with zero setup friction.' },
    { question: 'I run an agency. Can I manage multiple client sites?', answer: 'Yes. The Business plan at $29/mo annual includes unlimited quizzes and leads, white-label branding, custom domains, team seats, API access, and a dedicated onboarding call.' },
  ]

  const templates = QUIZ_TEMPLATE_CATALOG.slice(0, 6)

  const pricingPlans = [
    {
      name: 'Core',
      monthlyPrice: 12,
      yearlyPrice: 9,
      description: 'Build real quiz funnels with branching logic, scoring, and scheduling.',
      limits: { quizzes: '5', leads: '1,000/mo', emails: '1,000/mo' },
      features: [
        'AI quiz generation from your URL',
        'Squarespace one-click connect',
        'Remove Squarespell branding',
        'Branching logic & weighted scoring',
        'Quiz scheduling',
        'Standard analytics',
        'Lead dashboard + CSV export',
        'Lead & email add-on packs',
      ],
      cta: 'Start free trial',
    },
    {
      name: 'Pro',
      monthlyPrice: 19,
      yearlyPrice: 16,
      description: 'Full power for serious lead generation — unlimited quizzes, integrations, and A/B testing.',
      limits: { quizzes: 'Unlimited', leads: '3,000/mo', emails: '3,000/mo' },
      features: [
        'Everything in Core',
        'A/B testing',
        'Email sequences',
        'All integrations (Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets)',
        'Webhooks',
        'Advanced analytics & drop-off analysis',
        'Custom CSS',
        'Priority email support',
      ],
      cta: 'Start free trial',
      featured: true,
    },
    {
      name: 'Business',
      monthlyPrice: 35,
      yearlyPrice: 29,
      description: 'Unlimited everything with white-label, custom domains, team seats, and API access.',
      limits: { quizzes: 'Unlimited', leads: 'Unlimited', emails: 'Unlimited' },
      features: [
        'Everything in Pro',
        'White-label (your brand on everything)',
        'Custom domain for quizzes',
        'Team seats (3 included, $5/seat extra)',
        'API access',
        'Priority support (email + chat)',
        'Dedicated onboarding call',
        'Unlimited leads & emails',
      ],
      cta: 'Start free trial',
    },
  ]

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#050505', color: '#ffffff', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        html { scroll-behavior: smooth; }
        [data-animate] { opacity: 0; transform: translateY(24px); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        [data-animate].visible { opacity: 1 !important; transform: translateY(0) !important; }
        .card-hover { transition: transform 0.3s ease, border-color 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); border-color: #555 !important; }
        .mockup-window { background: #111; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; }
        .mockup-bar { height: 36px; background: #1a1a1a; border-bottom: 1px solid #2a2a2a; display: flex; align-items: center; padding: 0 14px; gap: 7px; }
        .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
        .mockup-body { padding: 20px; }
        .stat-mini { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 12px 14px; }
        .stat-mini-label { font-size: 11px; color: #777; margin-bottom: 4px; }
        .stat-mini-value { font-size: 20px; font-weight: 700; }
        .pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .table-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #1a1a1a; font-size: 13px; gap: 12px; }
        .avatar-sm { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .toggle-chip { padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #999; border: 1px solid #2a2a2a; background: transparent; cursor: pointer; }
        .toggle-active { background: #4ade80; color: #050505; border-color: #4ade80; }
        .funnel-bar { height: 5px; border-radius: 3px; transition: width 0.8s ease; }
        @media (max-width: 900px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .hero-input-row { flex-direction: column !important; }
          .nav-links { display: none !important; }
          .showcase-row { flex-direction: column !important; }
          .showcase-row-reverse { flex-direction: column !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .stats-row { grid-template-columns: 1fr 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ─── NAV ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navScrolled ? 'rgba(5,5,5,0.9)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: navScrolled ? '1px solid #1a1a1a' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', maxWidth: 1200, margin: '0 auto', height: 60 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Squarespell</div>
          <div className="nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a href="#product" style={{ textDecoration: 'none', color: '#999', fontSize: 14, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#999'}>Product</a>
            <a href="#features" style={{ textDecoration: 'none', color: '#999', fontSize: 14, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#999'}>Features</a>
            <a href="#templates" style={{ textDecoration: 'none', color: '#999', fontSize: 14, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#999'}>Templates</a>
            <a href="#pricing" style={{ textDecoration: 'none', color: '#999', fontSize: 14, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#999'}>Pricing</a>
            <Link href="/sign-in" style={{ textDecoration: 'none', color: '#999', fontSize: 14 }}>Log in</Link>
            <Link href="/sign-up" style={{ textDecoration: 'none', background: '#fff', color: '#050505', padding: '8px 20px', borderRadius: 6, fontWeight: 600, fontSize: 14, transition: 'transform 0.2s' }}>Start Free</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 40px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '5px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 100, fontSize: 13, color: '#4ade80', fontWeight: 600, marginBottom: 24 }}>
          Built for Squarespace creators
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.15, marginBottom: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Turn Your Squarespace Site<br />Into a Lead Machine
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: '#999', marginBottom: 40, maxWidth: 620, margin: '0 auto 40px', lineHeight: 1.6 }}>
          AI-powered quizzes that match your brand perfectly. Generate leads, qualify visitors, and sell more — all without leaving Squarespace.
        </p>
        <form onSubmit={handleSubmitUrl} style={{ maxWidth: 520, margin: '0 auto 16px' }}>
          <div className="hero-input-row" style={{ display: 'flex', gap: 10 }}>
            <input
              type="url" placeholder="Paste your Squarespace URL..." value={url} onChange={e => setUrl(e.target.value)}
              style={{ flex: 1, padding: '14px 16px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.currentTarget.style.borderColor = '#4ade80'}
              onBlur={e => e.currentTarget.style.borderColor = '#333'}
            />
            <button type="submit" disabled={loading} style={{ padding: '14px 28px', background: '#fff', color: '#050505', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap', transition: 'transform 0.2s' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {loading ? 'Creating...' : 'Create Quiz →'}
            </button>
          </div>
        </form>
        <p style={{ fontSize: 13, color: '#666' }}>14-day free trial · No credit card required</p>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 60px' }}>
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '32px 0' }}>
          {[
            { val: '45K+', label: 'Quizzes created' },
            { val: '2.3M', label: 'Leads captured' },
            { val: '24.4%', label: 'Avg conversion rate' },
            { val: '<60s', label: 'AI quiz generation' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{s.val}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRODUCT SHOWCASE: 6 mockups ─── */}
      <section id="product" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>Your complete quiz funnel platform</h2>
          <p style={{ color: '#999', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>From AI generation to lead nurturing — everything you need in one dashboard</p>
        </div>

        {/* ── Mockup 1: Dashboard Overview ── */}
        <div data-animate id="mockup-dashboard" style={{ marginBottom: 80 }}>
          <div className="showcase-row" style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Real-time performance at a glance</h3>
              <p style={{ color: '#999', lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>5 KPI stat cards, conversion funnel, lead sources, per-quiz breakdown, and recent activity — all powered by live data with date-range filtering.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Views, starts, completions & leads', 'Conversion funnel visualization', 'Recent leads with scores', 'Question drop-off analysis'].map((t, i) => (
                  <li key={i} style={{ padding: '5px 0', color: '#ccc', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#4ade80' }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 520px' }}>
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                  <div className="mockup-dot" style={{ background: '#febc2e' }} />
                  <div className="mockup-dot" style={{ background: '#28c840' }} />
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#555' }}>app.squarespell.com/dashboard</span>
                </div>
                <div className="mockup-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div><div style={{ fontSize: 15, fontWeight: 700 }}>Welcome back</div><div style={{ fontSize: 11, color: '#666' }}>Last 30 days</div></div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['7d', '30d', '90d'].map(d => <span key={d} className="toggle-chip" style={d === '30d' ? { background: '#4ade80', color: '#050505', borderColor: '#4ade80' } : {}}>{d}</span>)}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[{ l: 'Total Views', v: '8,432', c: '#fff' }, { l: 'Started', v: '3,105', c: '#fff' }, { l: 'Completed', v: '2,054', c: '#fff' }, { l: 'Leads', v: '1,841', c: '#4ade80' }].map((s, i) => (
                      <div key={i} className="stat-mini"><div className="stat-mini-label">{s.l}</div><div className="stat-mini-value" style={{ color: s.c }}>{s.v}</div></div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
                    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Conversion Funnel</div>
                      {[{ l: 'Views', w: '100%', c: '#4ade80' }, { l: 'Started', w: '37%', c: '#60a5fa' }, { l: 'Completed', w: '24%', c: '#fbbf24' }, { l: 'Leads', w: '22%', c: '#f87171' }].map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div className="funnel-bar" style={{ flex: 1, background: f.c, width: f.w, maxWidth: f.w }} />
                          <span style={{ fontSize: 11, color: '#777', minWidth: 55 }}>{f.w} {f.l}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Recent Leads</div>
                      {['sarah@design.com', 'mark@studio.co', 'alex@photo.io', 'jenny@brand.com'].map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: ['#0D7377', '#6366f1', '#ec4899', '#f59e0b'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{e[0].toUpperCase()}</div>
                          <span style={{ fontSize: 11, color: '#aaa' }}>{e}</span>
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>+ 1,837 more</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mockup 2: Quiz Editor ── */}
        <div data-animate id="mockup-editor" style={{ marginBottom: 80 }}>
          <div className="showcase-row-reverse" style={{ display: 'flex', gap: 40, alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quiz Editor</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Visual drag-and-drop builder</h3>
              <p style={{ color: '#999', lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>Image choices, branching logic, weighted scoring, and lead gates. Build quizzes that feel native to your brand with real-time preview.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Image choice questions with Unsplash', 'Branching logic paths', 'Weighted scoring per answer', 'Lead capture gate before results'].map((t, i) => (
                  <li key={i} style={{ padding: '5px 0', color: '#ccc', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#4ade80' }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 520px' }}>
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                  <div className="mockup-dot" style={{ background: '#febc2e' }} />
                  <div className="mockup-dot" style={{ background: '#28c840' }} />
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#555' }}>Quiz Editor</span>
                </div>
                <div className="mockup-body">
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>What&apos;s your photography style?</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Light & Airy', bg: '#1e3a5f', score: 4 },
                          { label: 'Bold & Dramatic', bg: '#3d1f1f', score: 3 },
                          { label: 'Warm & Vintage', bg: '#3d2e1f', score: 2 },
                          { label: 'Classic & Timeless', bg: '#1f2d1f', score: 1 },
                        ].map((opt, i) => (
                          <div key={i} style={{ background: opt.bg, border: i === 0 ? '2px solid #4ade80' : '1px solid #2a2a2a', borderRadius: 8, padding: '16px 10px', textAlign: 'center', cursor: 'pointer' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{opt.label}</div>
                            <div style={{ fontSize: 10, color: '#777' }}>Score: {opt.score}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ width: 140, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#777', marginBottom: 8 }}>Question Settings</div>
                      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: 8, fontSize: 11, marginBottom: 6 }}>
                        <div style={{ color: '#777', marginBottom: 2 }}>Type</div>
                        <div style={{ color: '#fff' }}>Image Choice</div>
                      </div>
                      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: 8, fontSize: 11, marginBottom: 6 }}>
                        <div style={{ color: '#777', marginBottom: 2 }}>Logic</div>
                        <div style={{ color: '#4ade80' }}>Branching ON</div>
                      </div>
                      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: 8, fontSize: 11 }}>
                        <div style={{ color: '#777', marginBottom: 2 }}>Scoring</div>
                        <div style={{ color: '#fbbf24' }}>Weighted</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    {['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Lead Gate', 'Results'].map((q, i) => (
                      <div key={i} style={{ padding: '4px 10px', borderRadius: 4, background: i === 0 ? '#4ade80' : '#1a1a1a', color: i === 0 ? '#050505' : '#777', fontWeight: 600, border: '1px solid #2a2a2a' }}>{q}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mockup 3: Leads Dashboard ── */}
        <div data-animate id="mockup-leads" style={{ marginBottom: 80 }}>
          <div className="showcase-row" style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Every lead, scored and segmented</h3>
              <p style={{ color: '#999', lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>See every quiz response with lead scores, intent labels, and full answer history. Filter by quiz, search by name or email, export to CSV.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Lead scoring with intent labels', 'Full answer history per lead', 'Filter by quiz, date, intent', 'One-click CSV export'].map((t, i) => (
                  <li key={i} style={{ padding: '5px 0', color: '#ccc', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#4ade80' }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 520px' }}>
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                  <div className="mockup-dot" style={{ background: '#febc2e' }} />
                  <div className="mockup-dot" style={{ background: '#28c840' }} />
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#555' }}>Leads</span>
                </div>
                <div className="mockup-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div className="stat-mini"><div className="stat-mini-label">Total Leads</div><div className="stat-mini-value" style={{ color: '#4ade80' }}>1,841</div></div>
                    <div className="stat-mini"><div className="stat-mini-label">This Month</div><div className="stat-mini-value">342</div></div>
                    <div className="stat-mini"><div className="stat-mini-label">High Intent</div><div className="stat-mini-value" style={{ color: '#fbbf24' }}>127</div></div>
                  </div>
                  <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Recent Leads</div>
                      <div style={{ fontSize: 11, color: '#4ade80', cursor: 'pointer' }}>Export CSV ↓</div>
                    </div>
                    {[
                      { name: 'Sarah Chen', email: 'sarah@design.com', quiz: 'Photography Style', score: 87, intent: 'high' },
                      { name: 'Mark Rivera', email: 'mark@studio.co', quiz: 'Fitness Match', score: 64, intent: 'new' },
                      { name: 'Alex Morgan', email: 'alex@photo.io', quiz: 'Wedding Planner', score: 91, intent: 'high' },
                      { name: 'Jenny Park', email: 'jenny@brand.com', quiz: 'Interior Style', score: 42, intent: 'new' },
                    ].map((lead, i) => (
                      <div key={i} className="table-row">
                        <div className="avatar-sm" style={{ background: ['#0D7377', '#6366f1', '#ec4899', '#f59e0b'][i] }}>{lead.name.split(' ').map(n => n[0]).join('')}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{lead.name}</div>
                          <div style={{ color: '#666', fontSize: 11 }}>{lead.email}</div>
                        </div>
                        <div style={{ fontSize: 11, color: '#777' }}>{lead.quiz}</div>
                        <div className="pill" style={{ background: lead.intent === 'high' ? '#052e16' : '#1a1a1a', color: lead.intent === 'high' ? '#4ade80' : '#fbbf24' }}>{lead.intent === 'high' ? '● High' : '● New'}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', minWidth: 30, textAlign: 'right' }}>{lead.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mockup 4: Email Campaigns ── */}
        <div data-animate id="mockup-emails" style={{ marginBottom: 80 }}>
          <div className="showcase-row-reverse" style={{ display: 'flex', gap: 40, alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Campaigns</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Send emails that convert</h3>
              <p style={{ color: '#999', lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>Broadcast campaigns, automated sequences, and quiz-result emails. Track opens, clicks, and conversions with built-in analytics.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Broadcast & automated sequences', 'Quiz-result triggered emails', 'Open & click tracking', 'Per-recipient engagement timeline'].map((t, i) => (
                  <li key={i} style={{ padding: '5px 0', color: '#ccc', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#4ade80' }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 520px' }}>
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                  <div className="mockup-dot" style={{ background: '#febc2e' }} />
                  <div className="mockup-dot" style={{ background: '#28c840' }} />
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#555' }}>Email Campaigns</span>
                </div>
                <div className="mockup-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Campaigns</div>
                    <div style={{ background: '#4ade80', color: '#050505', padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>+ New Campaign</div>
                  </div>
                  {[
                    { name: 'Welcome Sequence', type: 'Automation', status: 'live', sent: 1240, opens: '68%', clicks: '24%', typeColor: '#7F56D9' },
                    { name: 'Photography Results', type: 'Quiz Result', status: 'live', sent: 891, opens: '72%', clicks: '31%', typeColor: '#0D7377' },
                    { name: 'Spring Promo', type: 'Broadcast', status: 'draft', sent: 0, opens: '—', clicks: '—', typeColor: '#0D7377' },
                  ].map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: c.typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 14 }}>{c.type === 'Automation' ? '⚡' : c.type === 'Quiz Result' ? '📊' : '📨'}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{c.type}</div>
                      </div>
                      <div className="pill" style={{ background: c.status === 'live' ? '#052e16' : '#1a1a1a', color: c.status === 'live' ? '#4ade80' : '#777' }}>{c.status}</div>
                      <div style={{ fontSize: 11, color: '#777', minWidth: 40, textAlign: 'right' }}>{c.sent > 0 ? c.sent : '—'}</div>
                      <div style={{ fontSize: 11, color: '#4ade80', minWidth: 35, textAlign: 'right' }}>{c.opens}</div>
                      <div style={{ fontSize: 11, color: '#60a5fa', minWidth: 35, textAlign: 'right' }}>{c.clicks}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <div className="stat-mini" style={{ flex: 1 }}><div className="stat-mini-label">Sent this month</div><div className="stat-mini-value" style={{ fontSize: 16 }}>2,131</div></div>
                    <div className="stat-mini" style={{ flex: 1 }}><div className="stat-mini-label">Avg open rate</div><div className="stat-mini-value" style={{ fontSize: 16, color: '#4ade80' }}>68%</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mockup 5: Automations ── */}
        <div data-animate id="mockup-automations" style={{ marginBottom: 80 }}>
          <div className="showcase-row" style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automations</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Set it and forget it</h3>
              <p style={{ color: '#999', lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>Create trigger-action rules that fire automatically. When a quiz is completed, send an email, add a tag, or start a sequence — no manual work.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Quiz completed → Send email', 'Lead created → Add tag', 'Tag added → Start sequence', 'Segment entered → Trigger action'].map((t, i) => (
                  <li key={i} style={{ padding: '5px 0', color: '#ccc', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#4ade80' }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 520px' }}>
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                  <div className="mockup-dot" style={{ background: '#febc2e' }} />
                  <div className="mockup-dot" style={{ background: '#28c840' }} />
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#555' }}>Automations</span>
                </div>
                <div className="mockup-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                    <div className="stat-mini"><div className="stat-mini-label">Active Rules</div><div className="stat-mini-value" style={{ color: '#4ade80' }}>5</div></div>
                    <div className="stat-mini"><div className="stat-mini-label">Total Fired</div><div className="stat-mini-value">2,847</div></div>
                    <div className="stat-mini"><div className="stat-mini-label">Last Fired</div><div className="stat-mini-value" style={{ fontSize: 14 }}>2m ago</div></div>
                  </div>
                  {[
                    { name: 'Welcome email on signup', trigger: 'Quiz completed', action: 'Send email', fires: 1204, active: true },
                    { name: 'Tag high-intent leads', trigger: 'Lead created', action: 'Add tag', fires: 891, active: true },
                    { name: 'Nurture sequence', trigger: 'Tag added', action: 'Start sequence', fires: 752, active: true },
                  ].map((rule, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: rule.active ? '#4ade80' : '#555', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{rule.name}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{rule.trigger} → {rule.action}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#777' }}>{rule.fires}x fired</div>
                      <div style={{ width: 32, height: 18, borderRadius: 9, background: rule.active ? '#4ade80' : '#333', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', top: 2, left: rule.active ? 16 : 2, transition: 'left 0.2s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mockup 6: Analytics ── */}
        <div data-animate id="mockup-analytics" style={{ marginBottom: 60 }}>
          <div className="showcase-row-reverse" style={{ display: 'flex', gap: 40, alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analytics</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Know exactly what converts</h3>
              <p style={{ color: '#999', lineHeight: 1.7, fontSize: 15, marginBottom: 16 }}>Roll-up analytics across all quizzes with date-range filtering. See completion rates, drop-off points, and per-quiz performance at a glance.</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Date-range presets (7d, 30d, 90d, custom)', 'Per-quiz performance table', 'Completion & lead rate tracking', 'A/B test results comparison'].map((t, i) => (
                  <li key={i} style={{ padding: '5px 0', color: '#ccc', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#4ade80' }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 520px' }}>
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#ff5f57' }} />
                  <div className="mockup-dot" style={{ background: '#febc2e' }} />
                  <div className="mockup-dot" style={{ background: '#28c840' }} />
                  <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#555' }}>Analytics</span>
                </div>
                <div className="mockup-body">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {['Today', '7d', '30d', '90d', 'All time'].map((d, i) => <span key={d} className="toggle-chip" style={i === 2 ? { background: '#4ade80', color: '#050505', borderColor: '#4ade80' } : {}}>{d}</span>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                    {[{ l: 'Views', v: '12,845' }, { l: 'Completions', v: '4,102' }, { l: 'Leads', v: '2,841' }, { l: 'Lead Rate', v: '22.1%' }].map((s, i) => (
                      <div key={i} className="stat-mini"><div className="stat-mini-label">{s.l}</div><div className="stat-mini-value" style={{ fontSize: 16 }}>{s.v}</div></div>
                    ))}
                  </div>
                  <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Per-Quiz Performance</div>
                    <div style={{ display: 'flex', fontSize: 10, color: '#555', paddingBottom: 6, borderBottom: '1px solid #2a2a2a', gap: 8 }}>
                      <div style={{ flex: 2 }}>Quiz</div><div style={{ flex: 1, textAlign: 'right' }}>Views</div><div style={{ flex: 1, textAlign: 'right' }}>Leads</div><div style={{ flex: 1, textAlign: 'right' }}>Rate</div>
                    </div>
                    {[
                      { name: 'Photography Style Quiz', views: '5,421', leads: '1,204', rate: '22.2%' },
                      { name: 'Fitness Match Quiz', views: '3,892', leads: '891', rate: '22.9%' },
                      { name: 'Wedding Planner Quiz', views: '2,104', leads: '523', rate: '24.9%' },
                    ].map((q, i) => (
                      <div key={i} style={{ display: 'flex', fontSize: 12, padding: '8px 0', borderBottom: '1px solid #1a1a1a', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 2, fontWeight: 500 }}>{q.name}</div>
                        <div style={{ flex: 1, textAlign: 'right', color: '#999' }}>{q.views}</div>
                        <div style={{ flex: 1, textAlign: 'right', color: '#4ade80' }}>{q.leads}</div>
                        <div style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>{q.rate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px', borderTop: '1px solid #1a1a1a' }} id="how-it-works">
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>Three steps to your first quiz</h2>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 48, fontSize: 17 }}>From URL paste to lead capture in minutes</p>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { step: 1, title: 'Paste your URL', desc: 'Give us your Squarespace domain and our AI analyzes your site style, content, and brand voice.' },
            { step: 2, title: 'AI generates quiz', desc: 'We create a branded quiz perfectly matched to your site design. Customize anything in our visual editor.' },
            { step: 3, title: 'Embed and capture', desc: 'Get embed code, paste into Squarespace, and start capturing leads immediately. No developer needed.' },
          ].map((item, idx) => (
            <div key={idx} data-animate id={`step-${idx}`} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', padding: 28, borderRadius: 12, transitionDelay: `${idx * 80}ms` }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#4ade80', marginBottom: 12 }}>{item.step}</div>
              <h3 style={{ fontSize: 18, marginBottom: 8, fontWeight: 600 }}>{item.title}</h3>
              <p style={{ color: '#999', lineHeight: 1.6, fontSize: 14 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px', borderTop: '1px solid #1a1a1a' }} id="features">
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>Everything you need to succeed</h2>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 48, fontSize: 17 }}>Professional features built for Squarespace creators</p>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { title: 'AI Quiz Generation', desc: 'Paste your URL. Our AI creates a branded, conversion-optimized quiz in seconds. Matches your site\'s colors, fonts, and voice.' },
            { title: 'Branching Logic', desc: 'Route visitors to different questions and outcomes based on their answers. Segment your audience with conditional paths.' },
            { title: 'Lead Scoring', desc: 'Score every answer with weighted points. Identify high-intent leads and prioritize follow-up.' },
            { title: 'Email Campaigns', desc: 'Send automated emails to leads based on their quiz results and behavior. Broadcasts, sequences, and quiz-result emails.' },
            { title: 'A/B Testing', desc: 'Test different questions, images, and CTAs. Declare winners based on real conversion data with statistical confidence.' },
            { title: 'Analytics', desc: 'Track completion rates, drop-off points, conversion funnel, and real-time lead flow. Date-range filtering across all quizzes.' },
            { title: 'Automations', desc: 'Trigger-action rules that fire automatically. Quiz completed → send email. Lead created → add tag. Zero manual work.' },
            { title: 'Integrations', desc: 'Connect Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Send leads where they need to go.' },
            { title: 'Quiz Scheduling', desc: 'Schedule quizzes to go live or pause at specific times. Perfect for promotions, seasonal campaigns, and product launches.' },
          ].map((feature, idx) => (
            <div key={idx} data-animate id={`feature-${idx}`} className="card-hover" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', padding: 24, borderRadius: 12, transitionDelay: `${idx * 40}ms` }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0d2a0d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: '#4ade80', fontSize: 16, fontWeight: 700 }}>✓</div>
              <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 600 }}>{feature.title}</h3>
              <p style={{ color: '#999', fontSize: 13, lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TEMPLATES ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px', borderTop: '1px solid #1a1a1a' }} id="templates">
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>Quiz templates for every business</h2>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 48, fontSize: 17 }}>16 industry-specific templates. Fully customizable, ready to launch</p>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {templates.map((template, idx) => {
            const thumb = getTemplateThumbnail(template.id)
            const qCount = getTemplateQuestionCount(template.id)
            return (
              <Link key={template.id} href={QUIZ_BUILDER_PATH + '?template=' + template.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div data-animate id={`template-${idx}`} className="card-hover" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', transitionDelay: `${idx * 50}ms`, cursor: 'pointer' }}>
                  {thumb && <div style={{ height: 180, background: `url('${thumb}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                  <div style={{ padding: 20 }}>
                    <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{template.category}</div>
                    <h3 style={{ fontSize: 16, marginBottom: 6, fontWeight: 600 }}>{template.name}</h3>
                    <p style={{ color: '#999', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{template.description}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#666' }}>
                      <span>{qCount} questions</span>
                      <span>·</span>
                      <span>{template.tags.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href={QUIZ_BUILDER_PATH} style={{ display: 'inline-block', padding: '12px 28px', border: '1px solid #555', borderRadius: 8, textDecoration: 'none', color: '#fff', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#555' }}>
            View all 16 templates
          </Link>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 40px', borderTop: '1px solid #1a1a1a' }} id="pricing">
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>Simple, transparent pricing</h2>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 32, fontSize: 17 }}>14-day free trial on every plan. No credit card required.</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40, gap: 0 }}>
          <button onClick={() => setIsYearly(false)} style={{ padding: '8px 20px', background: !isYearly ? '#333' : 'transparent', border: '1px solid #333', color: '#fff', borderRadius: '8px 0 0 8px', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}>Monthly</button>
          <button onClick={() => setIsYearly(true)} style={{ padding: '8px 20px', background: isYearly ? '#333' : 'transparent', border: '1px solid #333', borderLeft: 'none', color: '#fff', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}>Annual <span style={{ color: '#4ade80', fontSize: 12 }}>save 20%</span></button>
        </div>
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
          {pricingPlans.map((plan, idx) => (
            <div key={plan.name} data-animate id={`pricing-${idx}`} style={{
              background: plan.featured ? '#111' : '#0a0a0a',
              border: plan.featured ? '2px solid #4ade80' : '1px solid #2a2a2a',
              padding: 28, borderRadius: 14, position: 'relative',
              transitionDelay: `${idx * 80}ms`,
            }}>
              {plan.featured && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateY(-50%)', background: '#4ade80', color: '#050505', padding: '3px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>MOST POPULAR</div>}
              <h3 style={{ fontSize: 20, marginBottom: 4, fontWeight: 700 }}>{plan.name}</h3>
              <p style={{ color: '#777', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{plan.description}</p>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 40, fontWeight: 700 }}>${isYearly ? plan.yearlyPrice : plan.monthlyPrice}</span>
                <span style={{ color: '#777', fontSize: 14 }}>/mo</span>
                {isYearly && <span style={{ color: '#4ade80', fontSize: 12, marginLeft: 8 }}>billed annually</span>}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, fontSize: 12, color: '#999' }}>
                <span>{plan.limits.quizzes} quizzes</span>
                <span>·</span>
                <span>{plan.limits.leads} leads</span>
                <span>·</span>
                <span>{plan.limits.emails} emails</span>
              </div>
              <Link href="/sign-up" style={{
                display: 'block', textAlign: 'center', padding: '12px 24px',
                background: plan.featured ? '#4ade80' : '#333',
                color: plan.featured ? '#050505' : '#fff',
                border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14,
                textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer',
                marginBottom: 20,
              }}>{plan.cta}</Link>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ padding: '6px 0', color: '#ccc', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8, borderBottom: '1px solid #1a1a1a' }}>
                    <span style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 24 }}>
          Need more leads without upgrading? <span style={{ color: '#4ade80' }}>Add-on packs</span> start at $3/mo for 500 extra leads.
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '60px 40px', borderTop: '1px solid #1a1a1a' }} id="faq">
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 36px)', textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>Frequently asked questions</h2>
        <p style={{ color: '#999', textAlign: 'center', marginBottom: 40, fontSize: 17 }}>Everything you need to know about Squarespell</p>
        <div>
          {faqItems.map((item, idx) => (
            <div key={idx} data-animate id={`faq-${idx}`} style={{ borderBottom: '1px solid #1a1a1a', transitionDelay: `${idx * 30}ms` }}>
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} style={{
                width: '100%', padding: '18px 0', background: 'none', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
              }}>
                {item.question}
                <span style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: '#666', marginLeft: 16, flexShrink: 0 }}>▼</span>
              </button>
              <div style={{ maxHeight: openFaq === idx ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                <p style={{ padding: '0 0 18px', color: '#999', lineHeight: 1.7, fontSize: 14 }}>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '60px 40px', textAlign: 'center', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', marginBottom: 16, fontWeight: 700 }}>Ready to turn visitors into leads?</h2>
        <p style={{ color: '#999', fontSize: 17, marginBottom: 32 }}>14-day free trial. No credit card. Start your first quiz in 60 seconds.</p>
        <form onSubmit={handleSubmitUrl} style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="hero-input-row" style={{ display: 'flex', gap: 10 }}>
            <input type="url" placeholder="Paste your Squarespace URL..." value={url} onChange={e => setUrl(e.target.value)}
              style={{ flex: 1, padding: '14px 16px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none' }}
              onFocus={e => e.currentTarget.style.borderColor = '#4ade80'}
              onBlur={e => e.currentTarget.style.borderColor = '#333'} />
            <button type="submit" disabled={loading} style={{ padding: '14px 28px', background: '#4ade80', color: '#050505', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              {loading ? 'Creating...' : 'Create Quiz →'}
            </button>
          </div>
        </form>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '48px 40px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Squarespell</div>
              <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>AI-powered quiz funnels for Squarespace. Generate leads, nurture customers, grow your business.</p>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="#features" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Features</a>
                <a href="#templates" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Templates</a>
                <a href="#pricing" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Pricing</a>
                <Link href={QUIZ_BUILDER_PATH} style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Quiz Builder</Link>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="mailto:info@squarespell.com" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Contact</a>
                <a href="#faq" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>FAQ</a>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="/privacy" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Privacy Policy</a>
                <a href="/terms" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Terms of Service</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#555', fontSize: 12 }}>© 2024 Squarespell. Made for Squarespace creators.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
