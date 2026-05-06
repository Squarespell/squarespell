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
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleItems)
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            newVisible.add(entry.target.id)
          }
        })
        setVisibleItems(newVisible)
      },
      { threshold: 0.1 }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
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
        if (visibleItems.has(el.id)) {
          el.classList.add('visible')
        }
      })
    }
  }, [visibleItems])

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
    {
      question: 'How does Squarespell work with Squarespace?',
      answer: 'Squarespell generates a quiz embed code that you paste directly into your Squarespace site. No technical knowledge required. The quiz automatically matches your site\'s design, then you can customize every detail.',
    },
    {
      question: 'Do I need coding skills?',
      answer: 'Not at all. Squarespell is built for creators and marketers with no coding experience. Our AI handles the heavy lifting, and our visual editor is drag-and-drop simple.',
    },
    {
      question: 'Will the quiz match my design?',
      answer: 'Yes. Our AI analyzes your Squarespace site\'s colors, typography, and style, then generates a quiz that looks like it was built for you. You can further customize every detail.',
    },
    {
      question: 'What happens with captured leads?',
      answer: 'Leads are stored securely in your Squarespell dashboard. You can export them, connect email tools, or set up automations to nurture them automatically.',
    },
    {
      question: 'Can I customize after AI generates?',
      answer: 'Absolutely. The AI is just a starting point. Edit questions, answers, branching logic, colors, fonts, and scoring rules. Full creative control is yours.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes. Start free with up to 5 quizzes and 1,000 leads captured. No credit card required. Upgrade anytime to unlock more features.',
    },
    {
      question: 'How is Squarespell different from Typeform?',
      answer: 'Squarespell is built specifically for Squarespace creators. We focus on quiz funnels that generate leads and sales, with tighter Squarespace integration and lower pricing.',
    },
    {
      question: 'What counts as a lead?',
      answer: 'A lead is counted when someone completes your quiz and you capture their email (or other contact info). Partial completions don\'t count.',
    },
  ]

  const templates = QUIZ_TEMPLATE_CATALOG.slice(0, 6)
  const pricingPlans = [
    {
      name: 'Core',
      monthlyPrice: 9,
      yearlyPrice: 12,
      description: 'Perfect for getting started',
      features: [
        'Up to 5 quizzes',
        '1,000 leads/month',
        'Basic analytics',
        'Email exports',
        'Community support',
      ],
      cta: 'Start free',
    },
    {
      name: 'Pro',
      monthlyPrice: 16,
      yearlyPrice: 19,
      description: 'Most popular',
      features: [
        'Unlimited quizzes',
        '10,000 leads/month',
        'Advanced analytics',
        'Email automation',
        'Zapier integration',
        'Priority support',
      ],
      cta: 'Upgrade to Pro',
      featured: true,
    },
    {
      name: 'Business',
      monthlyPrice: 29,
      yearlyPrice: 35,
      description: 'For scaling fast',
      features: [
        'Unlimited everything',
        '100,000 leads/month',
        'Advanced branching logic',
        'Custom branding',
        'API access',
        '24/7 dedicated support',
      ],
      cta: 'Scale with Business',
    },
  ]

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#050505', color: '#ffffff' }}>
      {/* Navigation */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          maxWidth: '1400px',
          margin: '0 auto',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Squarespell</div>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <a href="#features" style={{ textDecoration: 'none', color: '#ffffff', opacity: 0.8, transition: 'opacity 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}>Features</a>
          <a href="#templates" style={{ textDecoration: 'none', color: '#ffffff', opacity: 0.8, transition: 'opacity 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}>Templates</a>
          <a href="#pricing" style={{ textDecoration: 'none', color: '#ffffff', opacity: 0.8, transition: 'opacity 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}>Pricing</a>
          <a href="#faq" style={{ textDecoration: 'none', color: '#ffffff', opacity: 0.8, transition: 'opacity 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}>FAQ</a>
          <button
            onClick={() => setUrl('')}
            style={{
              background: '#ffffff',
              color: '#050505',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '80px 40px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '56px', lineHeight: '1.2', marginBottom: '24px', fontWeight: '700' }}>
          Turn Your Squarespace Site Into a Lead Machine
        </h1>
        <p style={{ fontSize: '20px', color: '#cccccc', marginBottom: '48px', maxWidth: '700px', margin: '0 auto 48px' }}>
          AI-powered quizzes that match your brand perfectly. Generate leads, qualify visitors, and sell more — all without leaving Squarespace.
        </p>

        <form onSubmit={handleSubmitUrl} style={{ maxWidth: '500px', margin: '0 auto 32px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="url"
              placeholder="Paste your Squarespace URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                flex: 1,
                padding: '16px',
                background: '#1a1a1a',
                border: '1px solid #333333',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px 32px',
                background: '#ffffff',
                color: '#050505',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#999999' }}>No credit card required. Free tier includes up to 5 quizzes.</p>
        </form>
      </section>

      {/* Social Proof */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '40px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>45K+</div>
          <div style={{ color: '#999999', fontSize: '14px' }}>Quizzes created</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>2.3M</div>
          <div style={{ color: '#999999', fontSize: '14px' }}>Leads captured</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>24.4%</div>
          <div style={{ color: '#999999', fontSize: '14px' }}>Average conversion rate</div>
        </div>
      </section>

      {/* Product Screenshot */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '80px 40px',
        }}
        id="product"
      >
        <h2 style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>Dashboard built for real results</h2>
        <p style={{ color: '#999999', textAlign: 'center', marginBottom: '48px', fontSize: '18px' }}>
          Track quiz performance, analyze visitor behavior, and manage leads — all in one place
        </p>

        <div
          data-animate
          id="product-screenshot"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
            border: '1px solid #333333',
            borderRadius: '12px',
            padding: '24px',
            opacity: 0,
            transform: 'translateY(20px)',
            transition: 'all 0.6s ease-out',
          }}
        >
          <div style={{ height: '500px', background: '#0a0a0a', borderRadius: '8px', display: 'flex', flexDirection: 'column', padding: '32px' }}>
            {/* Dashboard Header */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Dashboard Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333333' }}>
                  <div style={{ color: '#999999', fontSize: '12px', marginBottom: '4px' }}>Total Views</div>
                  <div style={{ fontSize: '28px', fontWeight: '700' }}>8,432</div>
                </div>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333333' }}>
                  <div style={{ color: '#999999', fontSize: '12px', marginBottom: '4px' }}>Started</div>
                  <div style={{ fontSize: '28px', fontWeight: '700' }}>3,105</div>
                </div>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333333' }}>
                  <div style={{ color: '#999999', fontSize: '12px', marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '28px', fontWeight: '700' }}>2,054</div>
                </div>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333333' }}>
                  <div style={{ color: '#999999', fontSize: '12px', marginBottom: '4px' }}>Leads</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#4ade80' }}>1,841</div>
                </div>
              </div>
            </div>

            {/* Chart and Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', flex: 1 }}>
              <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333333' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Conversion Funnel</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#4ade80', borderRadius: '3px', width: '100%' }}></div>
                    <div style={{ fontSize: '12px', color: '#999999', minWidth: '80px' }}>100% Views</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#60a5fa', borderRadius: '3px', width: '37%' }}></div>
                    <div style={{ fontSize: '12px', color: '#999999', minWidth: '80px' }}>37% Started</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#fbbf24', borderRadius: '3px', width: '24%' }}></div>
                    <div style={{ fontSize: '12px', color: '#999999', minWidth: '80px' }}>24% Done</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#f87171', borderRadius: '3px', width: '22%' }}></div>
                    <div style={{ fontSize: '12px', color: '#999999', minWidth: '80px' }}>22% Leads</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333333' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Recent Leads</div>
                <div style={{ fontSize: '12px', color: '#999999', lineHeight: '1.8' }}>
                  <div>sarah@design.com</div>
                  <div>mark@studio.co</div>
                  <div>alex@photo.io</div>
                  <div>+ 1,838 more</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '80px 40px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
        id="how-it-works"
      >
        <h2 style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>Three steps to your first quiz</h2>
        <p style={{ color: '#999999', textAlign: 'center', marginBottom: '64px', fontSize: '18px' }}>
          From URL paste to lead capture in minutes
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
          {[
            { step: 1, title: 'Paste your URL', desc: 'Give us your Squarespace domain and our AI analyzes your site style, content, and brand voice.' },
            { step: 2, title: 'AI generates quiz', desc: 'We create a branded quiz perfectly matched to your site design. Customize anything in our visual editor.' },
            { step: 3, title: 'Embed and capture', desc: 'Get embed code, paste into Squarespace, and start capturing leads immediately. No developer needed.' },
          ].map((item, idx) => (
            <div
              key={idx}
              data-animate
              id={`step-${idx}`}
              style={{
                opacity: 0,
                transform: 'translateY(20px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${idx * 100}ms`,
              }}
            >
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#4ade80', marginBottom: '16px' }}>{item.step}</div>
              <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>{item.title}</h3>
              <p style={{ color: '#999999', lineHeight: '1.6' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '80px 40px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
        id="features"
      >
        <h2 style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>Everything you need to succeed</h2>
        <p style={{ color: '#999999', textAlign: 'center', marginBottom: '64px', fontSize: '18px' }}>
          Professional features built for creators
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {[
            { title: 'AI Quiz Generation', desc: 'Paste your URL. Our AI creates a branded, conversion-optimized quiz in seconds.' },
            { title: 'Branching Logic', desc: 'Route visitors to different questions and outcomes based on their answers. Segment your audience instantly.' },
            { title: 'Lead Scoring', desc: 'Score every answer. Identify high-intent leads and prioritize follow-up.' },
            { title: 'Email Campaigns', desc: 'Send automated emails to leads based on their quiz results and behavior.' },
            { title: 'A/B Testing', desc: 'Test different questions, images, and CTAs. See what drives the most conversions.' },
            { title: 'Analytics', desc: 'Track completion rates, drop-off points, conversion funnel, and real-time lead flow.' },
            { title: 'Templates', desc: '16 pre-built templates for every industry. Customize or start from scratch.' },
            { title: 'Integrations', desc: 'Connect Zapier, email platforms, CRMs. Send leads where they need to go.' },
            { title: 'GDPR Consent', desc: 'Built-in compliance. Manage consent checkboxes and protect visitor privacy.' },
          ].map((feature, idx) => (
            <div
              key={idx}
              data-animate
              id={`feature-${idx}`}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333333',
                padding: '32px',
                borderRadius: '12px',
                opacity: 0,
                transform: 'translateY(20px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${idx * 50}ms`,
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>✓</div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{feature.title}</h3>
              <p style={{ color: '#999999', fontSize: '14px', lineHeight: '1.6' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates Section */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '80px 40px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
        id="templates"
      >
        <h2 style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>Quiz templates for every business</h2>
        <p style={{ color: '#999999', textAlign: 'center', marginBottom: '64px', fontSize: '18px' }}>
          16 industry-specific templates. Fully customizable, ready to customize
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {templates.map((template, idx) => {
            const thumb = getTemplateThumbnail(template.id)
            const qCount = getTemplateQuestionCount(template.id)
            return (
              <Link
                key={template.id}
                href={`/templates/${template.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div
                  data-animate
                  id={`template-${idx}`}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    opacity: 0,
                    transform: 'translateY(20px)',
                    transition: 'all 0.6s ease-out, border-color 0.2s',
                    transitionDelay: `${idx * 50}ms`,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#666666'
                    el.style.transform = 'translateY(-8px)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#333333'
                    el.style.transform = 'translateY(0)'
                  }}
                >
                  {thumb && (
                    <div
                      style={{
                        height: '200px',
                        background: `url('${thumb}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    ></div>
                  )}
                  <div style={{ padding: '24px' }}>
                    <div style={{ color: '#4ade80', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                      {template.category}
                    </div>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{template.name}</h3>
                    <p style={{ color: '#999999', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>{template.description}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666666' }}>
                      <span>{qCount} questions</span>
                      <span>•</span>
                      <span>{template.tags.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link
            href="/templates"
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              border: '1px solid #666666',
              borderRadius: '6px',
              textDecoration: 'none',
              color: '#ffffff',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1a1a1a'
              e.currentTarget.style.borderColor = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = '#666666'
            }}
          >
            View all 16 templates
          </Link>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '80px 40px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
        id="pricing"
      >
        <h2 style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>Simple, transparent pricing</h2>
        <p style={{ color: '#999999', textAlign: 'center', marginBottom: '48px', fontSize: '18px' }}>
          No hidden fees. Cancel anytime.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <button
            onClick={() => setIsYearly(false)}
            style={{
              padding: '8px 24px',
              background: !isYearly ? '#333333' : 'transparent',
              border: '1px solid #333333',
              color: '#ffffff',
              borderRadius: '6px 0 0 6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            style={{
              padding: '8px 24px',
              background: isYearly ? '#333333' : 'transparent',
              border: '1px solid #333333',
              borderLeft: 'none',
              color: '#ffffff',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Annual (save 20%)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {pricingPlans.map((plan, idx) => (
            <div
              key={plan.name}
              data-animate
              id={`pricing-${idx}`}
              style={{
                background: plan.featured ? '#1a1a1a' : '#0a0a0a',
                border: plan.featured ? '2px solid #4ade80' : '1px solid #333333',
                padding: '40px',
                borderRadius: '12px',
                opacity: 0,
                transform: 'translateY(20px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${idx * 100}ms`,
                position: 'relative',
              }}
            >
              {plan.featured && (
                <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%) translateY(-50%)', background: '#4ade80', color: '#050505', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                  RECOMMENDED
                </div>
              )}
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>{plan.name}</h3>
              <p style={{ color: '#999999', fontSize: '14px', marginBottom: '24px' }}>{plan.description}</p>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', fontWeight: '700', display: 'inline' }}>
                  ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                </div>
                <span style={{ color: '#999999', marginLeft: '8px' }}>/{isYearly ? 'year' : 'month'}</span>
              </div>

              <button
                onClick={() => setUrl('')}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: plan.featured ? '#4ade80' : '#333333',
                  color: plan.featured ? '#050505' : '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '32px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.transform = 'scale(1)'
                }}
              >
                {plan.cta}
              </button>

              <ul style={{ listStyle: 'none', padding: 0 }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ padding: '12px 0', borderBottom: '1px solid #1a1a1a', color: '#cccccc', fontSize: '14px' }}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '80px 40px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
        id="faq"
      >
        <h2 style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>Frequently asked questions</h2>
        <p style={{ color: '#999999', textAlign: 'center', marginBottom: '48px', fontSize: '18px' }}>
          Everything you need to know about Squarespell
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              data-animate
              id={`faq-${idx}`}
              style={{
                border: '1px solid #333333',
                borderRadius: '8px',
                overflow: 'hidden',
                opacity: 0,
                transform: 'translateY(20px)',
                transition: 'all 0.6s ease-out',
                transitionDelay: `${idx * 50}ms`,
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  background: '#1a1a1a',
                  border: 'none',
                  color: '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '16px',
                  fontWeight: '500',
                }}
              >
                {item.question}
                <span style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </button>

              {openFaq === idx && (
                <div style={{ padding: '20px 24px', background: '#0a0a0a', borderTop: '1px solid #333333', color: '#cccccc', lineHeight: '1.6' }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '80px 40px',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
        id="final-cta"
      >
        <h2 style={{ fontSize: '42px', marginBottom: '24px' }}>Ready to turn visitors into leads?</h2>
        <p style={{ color: '#999999', fontSize: '18px', marginBottom: '48px' }}>
          No credit card required. Start your free quiz in minutes.
        </p>

        <form onSubmit={handleSubmitUrl} style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="url"
              placeholder="Paste your Squarespace URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                flex: 1,
                padding: '16px',
                background: '#1a1a1a',
                border: '1px solid #333333',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px 32px',
                background: '#4ade80',
                color: '#050505',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '40px',
          textAlign: 'center',
          color: '#666666',
          fontSize: '14px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <p style={{ marginBottom: '12px' }}>© 2024 Squarespell. Made for Squarespace creators.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '13px' }}>
            <a href="#" style={{ color: '#666666', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: '#666666', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: '#666666', textDecoration: 'none' }}>Contact</a>
          </div>
        </div>
      </footer>

      {/* Animation styles */}
      <style>{`
        [data-animate] {
          opacity: 0;
          transform: translateY(20px);
        }
        [data-animate].visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </div>
  )
}
