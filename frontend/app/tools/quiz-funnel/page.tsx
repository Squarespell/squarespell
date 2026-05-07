'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG } from '@/lib/quiz/templates'

/* ─── Color System (matches app dashboard) ─── */
const C = {
  BG: '#FFFFFF',
  BG_SUBTLE: '#F9FAFB',
  BG_MUTED: '#F2F4F7',
  TEXT: '#101828',
  TEXT_SECONDARY: '#344054',
  TEXT_MUTED: '#667085',
  ACCENT: '#0D7377',
  ACCENT_HOVER: '#0B6165',
  ACCENT_LIGHT: '#F0FAFB',
  ACCENT_50: '#E0F5F6',
  BORDER: '#EAECF0',
  BORDER_LIGHT: '#F2F4F7',
  SHADOW_SM: '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
  SHADOW_MD: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
  SHADOW_LG: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
  SHADOW_XL: '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
}

/* ─── Screenshot URLs (real product) ─── */
const SCREENSHOTS = {
  dashboard: 'https://app.squarespell.com/dashboard',
  quizEditor: '/images/landing/quiz-editor.png',
  leads: '/images/landing/leads.png',
  templates: '/images/landing/templates.png',
  analytics: '/images/landing/analytics.png',
}

/* ─── Reusable animation hook ─── */
function useScrollReveal() {
  const [visible, setVisible] = useState(new Set<string>())
  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => new Set(prev).add(entry.target.id))
            observer.current?.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      observer.current?.observe(el)
    })
    return () => observer.current?.disconnect()
  }, [])

  return visible
}

/* ─── Animated Section Wrapper ─── */
function RevealSection({ id, children, delay = 0, className = '' }: {
  id: string; children: ReactNode; delay?: number; className?: string
}) {
  return (
    <div
      id={id}
      data-reveal
      className={className}
      style={{
        opacity: 0,
        transform: 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [navScrolled, setNavScrolled] = useState(false)
  const visible = useScrollReveal()

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Apply visibility
  useEffect(() => {
    visible.forEach((id) => {
      const el = document.getElementById(id)
      if (el) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }
    })
  }, [visible])

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      setLoading(true)
      router.push(QUIZ_BUILDER_PATH + '?url=' + encodeURIComponent(url))
    }
  }

  const templates = QUIZ_TEMPLATE_CATALOG.slice(0, 6)

  const pricingPlans = [
    {
      name: 'Core',
      monthlyPrice: 9,
      yearlyPrice: 12,
      description: 'Perfect for getting started',
      features: ['Up to 5 quizzes', '1,000 leads/month', 'Basic analytics', 'Email exports', 'Community support'],
      cta: 'Start free',
    },
    {
      name: 'Pro',
      monthlyPrice: 16,
      yearlyPrice: 19,
      description: 'Most popular for growing businesses',
      features: ['Unlimited quizzes', '10,000 leads/month', 'Advanced analytics', 'Email automation', 'A/B testing', 'Priority support'],
      cta: 'Upgrade to Pro',
      featured: true,
    },
    {
      name: 'Business',
      monthlyPrice: 29,
      yearlyPrice: 35,
      description: 'For teams scaling fast',
      features: ['Unlimited everything', '100,000 leads/month', 'Advanced branching', 'Custom branding', 'API access', 'Dedicated support'],
      cta: 'Scale with Business',
    },
  ]

  const faqItems = [
    { question: 'How does Squarespell work with Squarespace?', answer: 'Squarespell generates a quiz embed code that you paste directly into your Squarespace site. No technical knowledge required — the quiz automatically matches your site\'s design.' },
    { question: 'Do I need coding skills?', answer: 'Not at all. Our AI handles the heavy lifting, and the visual editor is drag-and-drop simple. Built for creators, not developers.' },
    { question: 'Will the quiz match my website design?', answer: 'Yes. Our AI analyzes your site\'s colors, typography, and style, then generates a quiz that looks native. You can further customize every detail.' },
    { question: 'What happens with captured leads?', answer: 'Leads are stored in your dashboard with full analytics. Export them, connect email tools, or set up automations to nurture them automatically.' },
    { question: 'Can I customize after AI generates?', answer: 'Absolutely. Edit questions, answers, branching logic, colors, fonts, and scoring rules. Full creative control is yours.' },
    { question: 'Is there a free trial?', answer: 'Yes — start free with up to 5 quizzes and 1,000 leads. No credit card required. Upgrade anytime.' },
    { question: 'How is this different from Typeform?', answer: 'Squarespell is purpose-built for quiz funnels that convert. Tighter Squarespace integration, AI generation, lead scoring, and lower pricing.' },
  ]

  const features = [
    { icon: '✦', title: 'AI Quiz Generation', desc: 'Paste your URL. Our AI builds a quiz that matches your brand in under 60 seconds.' },
    { icon: '◎', title: 'Lead Capture & Scoring', desc: 'Gate results behind email capture. Score leads based on their answers for smarter segmentation.' },
    { icon: '⬡', title: 'A/B Testing', desc: 'Test different questions, images, and CTAs. Declare winners based on real conversion data.' },
    { icon: '◈', title: 'Email Automations', desc: 'Trigger email sequences based on quiz outcomes. Nurture leads on autopilot.' },
    { icon: '⊡', title: 'Analytics Dashboard', desc: 'Track completions, drop-offs, and conversions. See which questions drive the most engagement.' },
    { icon: '⬢', title: 'Commerce Integration', desc: 'Recommend products based on quiz answers. Drive revenue with personalized results.' },
  ]

  const stats = [
    { value: '3.2x', label: 'More leads than static forms' },
    { value: '68%', label: 'Average quiz completion rate' },
    { value: '< 60s', label: 'To generate with AI' },
    { value: '2,400+', label: 'Quizzes created' },
  ]

  return (
    <div style={{ fontFamily: C.FONT, color: C.TEXT, background: C.BG, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 1; } 100% { transform: scale(1.3); opacity: 0; } }
        .hover-lift { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: ${C.SHADOW_XL}; }
        .btn-primary {
          background: ${C.ACCENT}; color: white; border: none; padding: 14px 28px; border-radius: 10px;
          font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s ease;
          font-family: ${C.FONT}; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary:hover { background: ${C.ACCENT_HOVER}; transform: translateY(-1px); box-shadow: ${C.SHADOW_MD}; }
        .btn-secondary {
          background: white; color: ${C.TEXT}; border: 1px solid ${C.BORDER}; padding: 14px 28px; border-radius: 10px;
          font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s ease; font-family: ${C.FONT};
        }
        .btn-secondary:hover { border-color: ${C.ACCENT}; color: ${C.ACCENT}; box-shadow: ${C.SHADOW_SM}; }
        .mockup-frame {
          background: white; border-radius: 16px; border: 1px solid ${C.BORDER};
          box-shadow: ${C.SHADOW_XL}; overflow: hidden; position: relative;
        }
        .mockup-bar {
          height: 40px; background: ${C.BG_SUBTLE}; border-bottom: 1px solid ${C.BORDER};
          display: flex; align-items: center; padding: 0 16px; gap: 8px;
        }
        .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
        .gradient-text {
          background: linear-gradient(135deg, ${C.ACCENT} 0%, #14919B 50%, ${C.ACCENT_HOVER} 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .section-label {
          display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
          background: ${C.ACCENT_LIGHT}; color: ${C.ACCENT}; border-radius: 100px;
          font-size: 13px; font-weight: 600; letter-spacing: 0.02em; margin-bottom: 16px;
        }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .templates-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ─── NAVIGATION ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: navScrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: navScrolled ? `1px solid ${C.BORDER}` : '1px solid transparent',
        transition: 'all 0.3s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.ACCENT, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"/></svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.TEXT }}>Squarespell</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#features" style={{ textDecoration: 'none', color: C.TEXT_MUTED, fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}>Features</a>
            <a href="#templates" style={{ textDecoration: 'none', color: C.TEXT_MUTED, fontSize: 14, fontWeight: 500 }}>Templates</a>
            <a href="#pricing" style={{ textDecoration: 'none', color: C.TEXT_MUTED, fontSize: 14, fontWeight: 500 }}>Pricing</a>
            <Link href="/sign-in" style={{ textDecoration: 'none', color: C.TEXT_MUTED, fontSize: 14, fontWeight: 500 }}>Log in</Link>
            <Link href="/sign-up" className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>Get started free</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section style={{ paddingTop: 140, paddingBottom: 80, position: 'relative' }}>
        {/* Subtle gradient background */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '70%', background: `linear-gradient(180deg, ${C.ACCENT_LIGHT} 0%, ${C.BG} 100%)`, zIndex: 0 }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <RevealSection id="hero-text">
            <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
              <div className="section-label">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT }} />
                Built for Squarespace creators
              </div>
              <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
                Turn your website visitors into{' '}
                <span className="gradient-text">qualified leads</span>
              </h1>
              <p style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: C.TEXT_MUTED, lineHeight: 1.6, margin: '0 0 36px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
                AI-powered quiz funnels that match your Squarespace site. Generate, embed, and start capturing leads in under 60 seconds.
              </p>

              {/* URL Input */}
              <form onSubmit={handleSubmitUrl} style={{ display: 'flex', gap: 12, maxWidth: 520, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste your Squarespace URL..."
                  style={{
                    flex: 1, minWidth: 260, padding: '14px 18px', borderRadius: 10,
                    border: `1px solid ${C.BORDER}`, fontSize: 15, fontFamily: C.FONT,
                    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                    background: 'white',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.boxShadow = `0 0 0 4px rgba(13,115,119,0.1)` }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.BORDER; e.currentTarget.style.boxShadow = 'none' }}
                />
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Generating...' : 'Generate quiz'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </form>
              <p style={{ fontSize: 13, color: C.TEXT_MUTED, marginTop: 12 }}>No credit card required. Free plan includes 5 quizzes.</p>
            </div>
          </RevealSection>

          {/* Hero Mockup */}
          <RevealSection id="hero-mockup" delay={0.2}>
            <div style={{ marginTop: 56, maxWidth: 1000, margin: '56px auto 0' }} className="mockup-frame hover-lift">
              <div className="mockup-bar">
                <div className="mockup-dot" style={{ background: '#FF5F57' }} />
                <div className="mockup-dot" style={{ background: '#FEBC2E' }} />
                <div className="mockup-dot" style={{ background: '#28C840' }} />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ background: C.BG_MUTED, borderRadius: 6, padding: '4px 16px', fontSize: 12, color: C.TEXT_MUTED }}>app.squarespell.com</div>
                </div>
              </div>
              <div style={{ position: 'relative', paddingBottom: '56%', background: C.BG_SUBTLE }}>
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&fit=crop"
                  alt="Squarespell Dashboard"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Overlay showing dashboard UI mockup */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,115,119,0.03) 0%, transparent 50%)' }} />
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── SOCIAL PROOF / STATS ─── */}
      <section style={{ padding: '60px 24px', background: C.BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <RevealSection id="stats-section">
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
              {stats.map((stat, i) => (
                <div key={i} style={{ padding: '24px 16px' }}>
                  <div style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: C.ACCENT, marginBottom: 4, letterSpacing: '-0.02em' }}>{stat.value}</div>
                  <div style={{ fontSize: 14, color: C.TEXT_MUTED, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── PRODUCT SHOWCASE ─── */}
      <section style={{ padding: '80px 24px', background: C.BG_SUBTLE }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <RevealSection id="showcase-header">
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div className="section-label">Product</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Everything you need to convert visitors
              </h2>
              <p style={{ fontSize: 17, color: C.TEXT_MUTED, maxWidth: 560, margin: '0 auto' }}>
                From AI generation to lead nurturing — a complete quiz funnel platform built for Squarespace.
              </p>
            </div>
          </RevealSection>

          {/* Showcase Card 1: Quiz Builder */}
          <RevealSection id="showcase-1" delay={0.1}>
            <div style={{ display: 'flex', gap: 48, alignItems: 'center', marginBottom: 64, flexWrap: 'wrap' }} className="hero-grid">
              <div style={{ flex: '1 1 400px' }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Visual Quiz Builder</h3>
                <p style={{ fontSize: 16, color: C.TEXT_MUTED, lineHeight: 1.7, marginBottom: 20 }}>
                  Drag-and-drop editor with image choices, branching logic, and real-time preview. Build quizzes that feel native to your brand.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {['Image choice questions', 'Branching logic paths', 'Real-time preview', 'Custom styling per question'].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 15, color: C.TEXT_SECONDARY }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ flex: '1 1 480px' }} className="mockup-frame hover-lift">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#FF5F57' }} />
                  <div className="mockup-dot" style={{ background: '#FEBC2E' }} />
                  <div className="mockup-dot" style={{ background: '#28C840' }} />
                </div>
                <div style={{ padding: 24, background: 'white' }}>
                  <img
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80&fit=crop"
                    alt="Quiz Builder Interface"
                    style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.BORDER}` }}
                  />
                </div>
              </div>
            </div>
          </RevealSection>

          {/* Showcase Card 2: Leads Dashboard */}
          <RevealSection id="showcase-2" delay={0.1}>
            <div style={{ display: 'flex', gap: 48, alignItems: 'center', marginBottom: 64, flexWrap: 'wrap', flexDirection: 'row-reverse' }} className="hero-grid">
              <div style={{ flex: '1 1 400px' }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Lead Intelligence</h3>
                <p style={{ fontSize: 16, color: C.TEXT_MUTED, lineHeight: 1.7, marginBottom: 20 }}>
                  Every quiz response becomes a rich lead profile. See their answers, scores, and engagement timeline all in one place.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {['Detailed response history', 'Lead scoring by answers', 'Export to CSV or connect tools', 'Automated email follow-ups'].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 15, color: C.TEXT_SECONDARY }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ flex: '1 1 480px' }} className="mockup-frame hover-lift">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#FF5F57' }} />
                  <div className="mockup-dot" style={{ background: '#FEBC2E' }} />
                  <div className="mockup-dot" style={{ background: '#28C840' }} />
                </div>
                <div style={{ padding: 24, background: 'white' }}>
                  <img
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&fit=crop"
                    alt="Leads Dashboard"
                    style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.BORDER}` }}
                  />
                </div>
              </div>
            </div>
          </RevealSection>

          {/* Showcase Card 3: Analytics */}
          <RevealSection id="showcase-3" delay={0.1}>
            <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }} className="hero-grid">
              <div style={{ flex: '1 1 400px' }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Conversion Analytics</h3>
                <p style={{ fontSize: 16, color: C.TEXT_MUTED, lineHeight: 1.7, marginBottom: 20 }}>
                  Track every metric that matters. See where users drop off, which questions convert best, and optimize with A/B testing.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {['Funnel visualization', 'Question-level insights', 'Built-in A/B testing', 'Conversion attribution'].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 15, color: C.TEXT_SECONDARY }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ flex: '1 1 480px' }} className="mockup-frame hover-lift">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: '#FF5F57' }} />
                  <div className="mockup-dot" style={{ background: '#FEBC2E' }} />
                  <div className="mockup-dot" style={{ background: '#28C840' }} />
                </div>
                <div style={{ padding: 24, background: 'white' }}>
                  <img
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&fit=crop"
                    alt="Analytics Dashboard"
                    style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.BORDER}` }}
                  />
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section style={{ padding: '100px 24px', background: C.BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <RevealSection id="how-header">
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div className="section-label">How it works</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Live in 3 simple steps
              </h2>
              <p style={{ fontSize: 17, color: C.TEXT_MUTED, maxWidth: 500, margin: '0 auto' }}>
                No coding, no design skills, no complex setup. Just paste your URL and go.
              </p>
            </div>
          </RevealSection>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { step: '01', title: 'Paste your URL', desc: 'Drop your Squarespace site URL. Our AI analyzes your brand, colors, and content in seconds.' },
              { step: '02', title: 'Customize your quiz', desc: 'Edit the AI-generated quiz with our visual builder. Add images, branching logic, and lead gates.' },
              { step: '03', title: 'Embed & convert', desc: 'Copy the embed code to your site. Start capturing leads immediately with zero technical effort.' },
            ].map((item, i) => (
              <RevealSection key={i} id={`step-${i}`} delay={i * 0.1}>
                <div style={{ padding: 32, borderRadius: 16, border: `1px solid ${C.BORDER}`, background: 'white', transition: 'all 0.3s ease', height: '100%' }} className="hover-lift">
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: C.ACCENT, fontSize: 16, fontWeight: 800 }}>
                    {item.step}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{item.title}</h3>
                  <p style={{ fontSize: 15, color: C.TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" style={{ padding: '100px 24px', background: C.BG_SUBTLE }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <RevealSection id="features-header">
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div className="section-label">Features</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Powerful tools, dead-simple UX
              </h2>
              <p style={{ fontSize: 17, color: C.TEXT_MUTED, maxWidth: 500, margin: '0 auto' }}>
                Everything you need to build high-converting quiz funnels, without the complexity.
              </p>
            </div>
          </RevealSection>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {features.map((feature, i) => (
              <RevealSection key={i} id={`feature-${i}`} delay={i * 0.05}>
                <div style={{ padding: 28, borderRadius: 14, border: `1px solid ${C.BORDER}`, background: 'white', height: '100%', transition: 'all 0.3s ease' }} className="hover-lift">
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: C.ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20, color: C.ACCENT }}>
                    {feature.icon}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{feature.title}</h3>
                  <p style={{ fontSize: 14, color: C.TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TEMPLATES ─── */}
      <section id="templates" style={{ padding: '100px 24px', background: C.BG }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <RevealSection id="templates-header">
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div className="section-label">Templates</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Start with a proven template
              </h2>
              <p style={{ fontSize: 17, color: C.TEXT_MUTED, maxWidth: 500, margin: '0 auto' }}>
                16 industry-specific quiz templates built for the businesses that use Squarespace most.
              </p>
            </div>
          </RevealSection>

          <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {templates.map((t, i) => (
              <RevealSection key={t.id} id={`template-${i}`} delay={i * 0.05}>
                <Link href={QUIZ_BUILDER_PATH + '?template=' + t.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ borderRadius: 14, border: `1px solid ${C.BORDER}`, overflow: 'hidden', background: 'white', cursor: 'pointer', transition: 'all 0.3s ease' }} className="hover-lift">
                    <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={(() => { const b = t.blocks()[0]; return (b && 'mediaUrl' in b ? (b as any).mediaUrl : null) || `https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&fit=crop`; })()}
                        alt={t.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                      <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: C.ACCENT }}>
                        {t.category}
                      </div>
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: C.TEXT }}>{t.name}</h4>
                      <p style={{ fontSize: 13, color: C.TEXT_MUTED, margin: 0, lineHeight: 1.5 }}>{t.description}</p>
                    </div>
                  </div>
                </Link>
              </RevealSection>
            ))}
          </div>

          <RevealSection id="templates-cta" delay={0.3}>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link href={QUIZ_BUILDER_PATH} className="btn-secondary" style={{ textDecoration: 'none' }}>
                Browse all 16 templates →
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ padding: '100px 24px', background: C.BG_SUBTLE }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <RevealSection id="pricing-header">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div className="section-label">Pricing</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Simple, transparent pricing
              </h2>
              <p style={{ fontSize: 17, color: C.TEXT_MUTED, maxWidth: 460, margin: '0 auto 24px' }}>
                Start free. Upgrade when you need more power.
              </p>

              {/* Billing Toggle */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'white', padding: '4px 6px', borderRadius: 10, border: `1px solid ${C.BORDER}` }}>
                <button
                  onClick={() => setIsYearly(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: !isYearly ? C.ACCENT : 'transparent', color: !isYearly ? 'white' : C.TEXT_MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: C.FONT }}
                >Monthly</button>
                <button
                  onClick={() => setIsYearly(true)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: isYearly ? C.ACCENT : 'transparent', color: isYearly ? 'white' : C.TEXT_MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: C.FONT }}
                >Yearly <span style={{ fontSize: 11, opacity: 0.8 }}>Save 20%</span></button>
              </div>
            </div>
          </RevealSection>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {pricingPlans.map((plan, i) => (
              <RevealSection key={i} id={`plan-${i}`} delay={i * 0.1}>
                <div style={{
                  padding: 32, borderRadius: 16, background: 'white',
                  border: plan.featured ? `2px solid ${C.ACCENT}` : `1px solid ${C.BORDER}`,
                  position: 'relative', transition: 'all 0.3s ease',
                  transform: plan.featured ? 'scale(1.02)' : 'none',
                  boxShadow: plan.featured ? C.SHADOW_LG : C.SHADOW_SM,
                }}>
                  {plan.featured && (
                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: C.ACCENT, color: 'white', padding: '4px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
                      Most popular
                    </div>
                  )}
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
                  <p style={{ fontSize: 14, color: C.TEXT_MUTED, marginBottom: 20 }}>{plan.description}</p>
                  <div style={{ marginBottom: 24 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>${isYearly ? plan.yearlyPrice : plan.monthlyPrice}</span>
                    <span style={{ fontSize: 15, color: C.TEXT_MUTED }}>/mo</span>
                  </div>
                  <Link
                    href="/sign-up"
                    className={plan.featured ? 'btn-primary' : 'btn-secondary'}
                    style={{ textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%', marginBottom: 24 }}
                  >
                    {plan.cta}
                  </Link>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {plan.features.map((f, fi) => (
                      <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14, color: C.TEXT_SECONDARY }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ padding: '100px 24px', background: C.BG }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <RevealSection id="faq-header">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div className="section-label">FAQ</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Frequently asked questions
              </h2>
            </div>
          </RevealSection>

          <div>
            {faqItems.map((item, i) => (
              <RevealSection key={i} id={`faq-${i}`} delay={i * 0.03}>
                <div style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: C.TEXT,
                      fontFamily: C.FONT, textAlign: 'left',
                    }}
                  >
                    {item.question}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round"
                      style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease', flexShrink: 0, marginLeft: 16 }}
                    >
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                  <div style={{
                    maxHeight: openFaq === i ? '200px' : '0', overflow: 'hidden',
                    transition: 'max-height 0.3s ease, opacity 0.3s ease',
                    opacity: openFaq === i ? 1 : 0,
                  }}>
                    <p style={{ margin: '0 0 20px', fontSize: 15, color: C.TEXT_MUTED, lineHeight: 1.7 }}>{item.answer}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ padding: '100px 24px', background: `linear-gradient(135deg, ${C.ACCENT} 0%, #14919B 50%, ${C.ACCENT_HOVER} 100%)`, position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <RevealSection id="final-cta">
          <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-0.02em' }}>
              Ready to turn visitors into leads?
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', marginBottom: 32, lineHeight: 1.6 }}>
              Join 2,400+ Squarespace creators already using Squarespell to grow their business with quiz funnels.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/sign-up" style={{ textDecoration: 'none', background: 'white', color: C.ACCENT, padding: '14px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, transition: 'all 0.2s', display: 'inline-block' }}>
                Start free today
              </Link>
              <Link href="#features" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', padding: '14px 28px', borderRadius: 10, fontWeight: 600, fontSize: 15, border: '1px solid rgba(255,255,255,0.3)', transition: 'all 0.2s', display: 'inline-block' }}>
                See all features
              </Link>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>No credit card required. Free plan available.</p>
          </div>
        </RevealSection>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: '64px 24px 32px', background: C.BG, borderTop: `1px solid ${C.BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, background: C.ACCENT, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"/></svg>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Squarespell</span>
              </div>
              <p style={{ fontSize: 14, color: C.TEXT_MUTED, lineHeight: 1.6, maxWidth: 280 }}>
                AI-powered quiz funnels for Squarespace. Generate leads, nurture customers, and grow your business.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: C.TEXT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href="#features" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Features</a>
                <a href="#templates" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Templates</a>
                <a href="#pricing" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Pricing</a>
                <Link href={QUIZ_BUILDER_PATH} style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Quiz Builder</Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: C.TEXT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href="/about" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>About</a>
                <a href="/blog" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Blog</a>
                <a href="mailto:info@squarespell.com" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Contact</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: C.TEXT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href="/privacy" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Privacy Policy</a>
                <a href="/terms" style={{ fontSize: 14, color: C.TEXT_MUTED, textDecoration: 'none' }}>Terms of Service</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: C.TEXT_MUTED, margin: 0 }}>© 2024 Squarespell. All rights reserved.</p>
            <div style={{ display: 'flex', gap: 16 }}>
              <a href="https://twitter.com" target="_blank" rel="noopener" style={{ color: C.TEXT_MUTED, transition: 'color 0.2s' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
