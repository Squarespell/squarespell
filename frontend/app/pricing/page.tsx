'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

type Billing = 'monthly' | 'yearly';

const PLANS = {
  starter: {
    name: 'Starter',
    desc: 'Perfect for coaches and consultants capturing their first leads',
    monthly: 19,
    yearly: 15,
    quizzes: '5',
    leads: '500 leads/mo',
    color: 'transparent',
    cta: 'Start free trial',
    featured: false,
    features: [
      { text: '5 live quizzes', included: true },
      { text: '500 leads per month', included: true },
      { text: 'AI quiz generation from your website', included: true },
      { text: 'Squarespace one-click connect', included: true },
      { text: 'Lead dashboard and CSV export', included: true },
      { text: 'Email notifications on new leads', included: true },
      { text: 'Basic analytics (views and leads)', included: true },
      { text: 'Remove Squarespell branding', included: false },
      { text: 'Conversion insights and lead scoring', included: false },
      { text: 'Zapier and webhook integration', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  pro: {
    name: 'Pro',
    desc: 'For growing businesses serious about turning visitors into clients',
    monthly: 39,
    yearly: 31,
    quizzes: '20',
    leads: '5,000 leads/mo',
    color: '#D2FF1D',
    cta: 'Start free trial',
    featured: true,
    features: [
      { text: '20 live quizzes', included: true },
      { text: '5,000 leads per month', included: true },
      { text: 'Everything in Starter', included: true },
      { text: 'Remove Squarespell branding', included: true },
      { text: 'Conversion insights and lead scoring', included: true },
      { text: 'A/B test quiz versions', included: true },
      { text: 'Zapier and webhook integration', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Priority email support', included: true },
      { text: 'White-label (your brand)', included: false },
      { text: 'Client reporting dashboard', included: false },
    ],
  },
  agency: {
    name: 'Agency',
    desc: 'For agencies managing quiz funnels across multiple Squarespace clients',
    monthly: 79,
    yearly: 63,
    quizzes: 'Unlimited',
    leads: 'Unlimited leads',
    color: 'transparent',
    cta: 'Start free trial',
    featured: false,
    features: [
      { text: 'Unlimited live quizzes', included: true },
      { text: 'Unlimited leads', included: true },
      { text: 'Everything in Pro', included: true },
      { text: 'White-label (your brand)', included: true },
      { text: 'Multi-site management', included: true },
      { text: 'Client reporting dashboard', included: true },
      { text: 'Custom onboarding call', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'SLA-backed support', included: true },
      { text: 'Custom integrations on request', included: true },
      { text: 'Team seats (coming soon)', included: true },
    ],
  },
};

const MATRIX = [
  {
    category: 'Core',
    rows: [
      { label: 'Live quizzes', starter: '5', pro: '20', agency: 'Unlimited' },
      { label: 'Leads per month', starter: '500', pro: '5,000', agency: 'Unlimited' },
      { label: 'AI quiz generation', starter: true, pro: true, agency: true },
      { label: 'Squarespace one-click connect', starter: true, pro: true, agency: true },
      { label: 'Lead dashboard and CSV export', starter: true, pro: true, agency: true },
      { label: 'Email notifications', starter: true, pro: true, agency: true },
    ],
  },
  {
    category: 'Branding',
    rows: [
      { label: 'Custom brand colors', starter: true, pro: true, agency: true },
      { label: 'Remove Squarespell logo', starter: false, pro: true, agency: true },
      { label: 'White-label (your brand)', starter: false, pro: false, agency: true },
    ],
  },
  {
    category: 'Analytics and growth',
    rows: [
      { label: 'Basic analytics', starter: true, pro: true, agency: true },
      { label: 'Conversion insights and lead scoring', starter: false, pro: true, agency: true },
      { label: 'A/B test quiz versions', starter: false, pro: true, agency: true },
      { label: 'Zapier and webhook integration', starter: false, pro: true, agency: true },
    ],
  },
  {
    category: 'Agency',
    rows: [
      { label: 'Multi-site management', starter: false, pro: false, agency: true },
      { label: 'Client reporting dashboard', starter: false, pro: false, agency: true },
      { label: 'Custom onboarding call', starter: false, pro: false, agency: true },
      { label: 'Dedicated account manager', starter: false, pro: false, agency: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { label: 'Email support', starter: true, pro: true, agency: true },
      { label: 'Priority support', starter: false, pro: true, agency: true },
      { label: 'Dedicated account manager', starter: false, pro: false, agency: true },
    ],
  },
];

const FAQS = [
  {
    q: 'Do I need a Squarespace subscription?',
    a: 'Yes, Squarespell works with any active Squarespace plan. You connect your site in one click through your dashboard. No code required.',
  },
  {
    q: 'What happens when my 7-day trial ends?',
    a: 'You choose a plan to continue. Your quizzes stay live so visitors can still see them, but new lead capture pauses until you upgrade. You keep all leads collected during your trial.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Cancel from your account settings in under 10 seconds. Your access continues until the end of your current billing period.',
  },
  {
    q: 'What exactly counts as a lead?',
    a: 'A lead is counted when someone completes your quiz and submits their email address. Partial completions and views never count against your monthly limit.',
  },
  {
    q: 'How is Squarespell different from Typeform?',
    a: 'Typeform charges $199 per month just to access lead gen features. Squarespell starts at $19 per month and is built specifically for Squarespace owners. Our AI generates a fully branded quiz from your website URL in under 60 seconds.',
  },
  {
    q: 'I run an agency. Can I manage multiple client sites?',
    a: 'Yes. The Agency plan covers unlimited quizzes across unlimited sites, white-label branding so your clients see your brand, a client reporting dashboard, and a dedicated account manager.',
  },
];

function CheckIcon({ color }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color || '#4ade80'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const yearlyAnnualSaving = (plan: keyof typeof PLANS) => {
    const p = PLANS[plan];
    return (p.monthly - p.yearly) * 12;
  };

  const handleUpgrade = async (plan: string) => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setLoading(plan);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const acc = '#D2FF1D';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #07090c; color: #f0f2f5; }
        :root {
          --acc: #D2FF1D;
          --bg: #07090c;
          --g1: rgba(255,255,255,.055);
          --g2: rgba(255,255,255,.034);
          --b1: rgba(255,255,255,.09);
          --b2: rgba(255,255,255,.058);
          --t1: #f0f2f5;
          --t2: rgba(240,242,245,.68);
          --t3: rgba(240,242,245,.42);
          --t4: rgba(240,242,245,.22);
        }
        a { text-decoration: none; }
        button { cursor: pointer; font-family: inherit; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#07090c', padding: '0 60px 80px' }}>

        {/* HERO */}
        <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center', paddingTop: 72 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(210,255,29,.09)', border: '.5px solid rgba(210,255,29,.18)', borderRadius: 20, padding: '4px 12px', marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: acc, letterSpacing: '.06em', textTransform: 'uppercase' }}>10x cheaper than Typeform</span>
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 16, color: '#f0f2f5' }}>
            One quiz. More clients.<br />
            <span style={{ color: acc }}>No Squarespace expertise needed.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--t3)', lineHeight: 1.65, marginBottom: 12, maxWidth: 600, margin: '0 auto 12px' }}>
            Start your 7-day free trial. No credit card required. Cancel anytime.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginTop: 20 }}>
            {['2,400+ Squarespace owners', 'No credit card required', 'Cancel anytime'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--t3)' }}>
                <CheckIcon color="rgba(74,222,128,.6)" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* TOGGLE */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 48, marginBottom: 40 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.055)', border: '.5px solid rgba(255,255,255,.09)', borderRadius: 10, padding: 3, gap: 3 }}>
            <button
              onClick={() => setBilling('monthly')}
              style={{
                padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
                background: billing === 'monthly' ? '#f0f2f5' : 'transparent',
                color: billing === 'monthly' ? '#07090c' : 'var(--t3)',
                transition: 'all .15s',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              style={{
                padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
                background: billing === 'yearly' ? '#f0f2f5' : 'transparent',
                color: billing === 'yearly' ? '#07090c' : 'var(--t3)',
                transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              Yearly
              <span style={{ background: 'rgba(74,222,128,.15)', color: '#4ade80', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 12, border: '.5px solid rgba(74,222,128,.3)' }}>
                Save 20%
              </span>
            </button>
          </div>
          {billing === 'yearly' && (
            <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
              You save up to ${yearlyAnnualSaving('agency')}/year
            </span>
          )}
        </div>

        {/* PRICING CARDS */}
        <div style={{ maxWidth: '100%', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
            <div
              key={key}
              style={{
                background: plan.featured ? 'rgba(210,255,29,.05)' : 'rgba(255,255,255,.034)',
                border: plan.featured ? '1.5px solid rgba(210,255,29,.3)' : '.5px solid rgba(255,255,255,.058)',
                borderRadius: 20,
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {plan.featured && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: acc, color: '#07090c', fontSize: 10, fontWeight: 800, padding: '4px 16px', borderRadius: 20, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Most popular
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: plan.featured ? acc : 'var(--t1)' }}>{plan.name}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.55, marginBottom: 24, minHeight: 40 }}>{plan.desc}</p>
              <div style={{ marginBottom: 4 }}>
                {billing === 'yearly' && (
                  <span style={{ fontSize: 14, color: 'var(--t4)', textDecoration: 'line-through', marginRight: 6 }}>${plan.monthly}</span>
                )}
                <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-.04em', color: 'var(--t1)' }}>${billing === 'monthly' ? plan.monthly : plan.yearly}</span>
                <span style={{ fontSize: 14, color: 'var(--t3)', marginLeft: 3 }}>/mo</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 28 }}>
                {billing === 'yearly' ? `Billed $${(billing === 'yearly' ? plan.yearly : plan.monthly) * 12}/year` : 'Billed monthly'}
              </p>
              <button
                onClick={() => handleUpgrade(key)}
                disabled={loading === key}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
                  background: plan.featured ? acc : 'rgba(255,255,255,.08)',
                  color: plan.featured ? '#07090c' : 'var(--t1)',
                  marginBottom: 28, transition: 'all .15s',
                  opacity: loading === key ? .6 : 1,
                }}
              >
                {loading === key ? 'Loading...' : plan.cta}
              </button>
              <div style={{ flex: 1 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
                    <span style={{ marginTop: 1, flexShrink: 0 }}>
                      {f.included ? <CheckIcon color={plan.featured ? acc : '#4ade80'} /> : <XIcon />}
                    </span>
                    <span style={{ fontSize: 13, color: f.included ? 'var(--t2)' : 'var(--t4)', lineHeight: 1.4 }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* COMPETITOR CALLOUT */}
        <div style={{ maxWidth: '100%', margin: '36px auto 0', background: 'rgba(255,255,255,.028)', border: '.5px solid rgba(255,255,255,.05)', borderRadius: 14, padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            {[
              { label: 'Typeform lead gen plan', price: '$199/mo', you: false },
              { label: 'Interact quiz builder', price: '$99/mo', you: false },
              { label: 'Squarespell Pro', price: '$39/mo', you: true },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--t4)' }}>{c.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: c.you ? acc : 'var(--t3)', textDecoration: c.you ? 'none' : 'line-through', textDecorationColor: 'rgba(240,242,245,.2)' }}>{c.price}</span>
                {c.you && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(210,255,29,.12)', color: acc, padding: '2px 8px', borderRadius: 10, border: '.5px solid rgba(210,255,29,.2)' }}>You</span>}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--t4)' }}>Same outcome. Fraction of the cost.</span>
        </div>

        {/* FEATURE MATRIX */}
        <div style={{ maxWidth: '100%', margin: '72px auto 0' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.04em', textAlign: 'center', marginBottom: 10 }}>Full feature breakdown</h2>
          <p style={{ fontSize: 15, color: 'var(--t3)', textAlign: 'center', marginBottom: 36 }}>Every feature, across every plan</p>
          <div style={{ background: 'rgba(255,255,255,.034)', border: '.5px solid rgba(255,255,255,.058)', borderRadius: 18, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '.5px solid rgba(255,255,255,.06)' }}>
                  <th style={{ padding: '16px 28px', textAlign: 'left', color: 'var(--t3)', fontWeight: 500, width: '46%' }}>Feature</th>
                  {['Starter', 'Pro', 'Agency'].map((p, i) => (
                    <th key={p} style={{ padding: '16px 16px', textAlign: 'center', color: i === 1 ? acc : 'var(--t2)', fontWeight: 700, width: '18%' }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map(section => (
                  <>
                    <tr key={section.category} style={{ background: 'rgba(255,255,255,.02)' }}>
                      <td colSpan={4} style={{ padding: '12px 28px', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t4)' }}>
                        {section.category}
                      </td>
                    </tr>
                    {section.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderTop: '.5px solid rgba(255,255,255,.04)' }}>
                        <td style={{ padding: '13px 28px', color: 'var(--t2)' }}>{row.label}</td>
                        {(['starter', 'pro', 'agency'] as const).map(p => (
                          <td key={p} style={{ padding: '13px 16px', textAlign: 'center' }}>
                            {typeof row[p] === 'boolean' ? (
                              row[p] ? <CheckIcon color={p === 'pro' ? acc : '#4ade80'} /> : <XIcon />
                            ) : (
                              <span style={{ fontSize: 13, fontWeight: 600, color: p === 'pro' ? acc : 'var(--t2)' }}>{row[p] as string}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 860, margin: '88px auto 0' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.04em', textAlign: 'center', marginBottom: 10 }}>Common questions</h2>
          <p style={{ fontSize: 15, color: 'var(--t3)', textAlign: 'center', marginBottom: 40 }}>Everything you need to know before you start</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                style={{ background: 'rgba(255,255,255,.034)', border: '.5px solid rgba(255,255,255,.058)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', flex: 1, paddingRight: 16 }}>{faq.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,.4)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 18px', fontSize: 14, color: 'var(--t3)', lineHeight: 1.7 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FINAL CTA */}
        <div style={{ maxWidth: 900, margin: '88px auto 0', textAlign: 'center', background: 'rgba(210,255,29,.05)', border: '.5px solid rgba(210,255,29,.12)', borderRadius: 24, padding: '56px 48px' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.04em', marginBottom: 14 }}>
            Start capturing leads today
          </h2>
          <p style={{ fontSize: 15, color: 'var(--t3)', lineHeight: 1.65, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            7 days free. No credit card. Your first quiz goes live in under 60 seconds.
          </p>
          <button
            onClick={() => handleUpgrade('pro')}
            style={{ background: acc, color: '#07090c', border: 'none', borderRadius: 14, padding: '16px 40px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            Start my free trial
          </button>
          <p style={{ fontSize: 12, color: 'var(--t4)', marginTop: 14 }}>No credit card required. Cancel anytime.</p>
        </div>

      </div>
    </>
  );
}
