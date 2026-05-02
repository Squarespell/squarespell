'use client';

import { Suspense, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Billing = 'monthly' | 'yearly';

const PLANS = {
  core: {
    name: 'Core',
    desc: 'Build real quiz funnels with branching logic and scoring',
    monthly: 12, yearly: 9, cta: 'Start free trial', featured: false,
    features: [
      { text: '5 live quizzes', included: true },
      { text: '1,000 leads per month', included: true },
      { text: '1,000 emails per month', included: true },
      { text: 'Branching logic & scoring', included: true },
      { text: 'AI quiz generation from your website', included: true },
      { text: 'Squarespace one-click connect', included: true },
      { text: 'Remove Squarespell branding', included: true },
      { text: 'Quiz scheduling', included: true },
      { text: 'Standard analytics', included: true },
      { text: 'A/B testing', included: false },
      { text: 'Integrations & email sequences', included: false },
    ],
  },
  pro: {
    name: 'Pro',
    desc: 'Full power for serious lead generation and conversion',
    monthly: 19, yearly: 16, cta: 'Start free trial', featured: true,
    features: [
      { text: 'Unlimited quizzes', included: true },
      { text: '3,000 leads per month', included: true },
      { text: '3,000 emails per month', included: true },
      { text: 'Everything in Core', included: true },
      { text: 'A/B testing', included: true },
      { text: 'All integrations & webhooks', included: true },
      { text: 'Email sequences', included: true },
      { text: 'Advanced analytics & drop-off', included: true },
      { text: 'Custom CSS', included: true },
      { text: 'Priority email support', included: true },
      { text: 'White-label & custom domain', included: false },
    ],
  },
  business: {
    name: 'Business',
    desc: 'For agencies who need unlimited everything and white-label',
    monthly: 35, yearly: 29, cta: 'Start free trial', featured: false,
    features: [
      { text: 'Unlimited quizzes', included: true },
      { text: 'Unlimited leads', included: true },
      { text: 'Unlimited emails', included: true },
      { text: 'Everything in Pro', included: true },
      { text: 'White-label (your brand)', included: true },
      { text: 'Custom domain for quizzes', included: true },
      { text: 'Team seats (3 included)', included: true },
      { text: 'Priority support (email + chat)', included: true },
      { text: 'API access', included: true },
      { text: 'Dedicated onboarding call', included: true },
    ],
  },
};

const MATRIX = [
  { category: 'Essentials', rows: [
    { label: 'Live quizzes', core: '5', pro: 'Unlimited', business: 'Unlimited' },
    { label: 'Leads per month', core: '1,000', pro: '3,000', business: 'Unlimited' },
    { label: 'Emails per month', core: '1,000', pro: '3,000', business: 'Unlimited' },
    { label: 'AI quiz generation', core: true, pro: true, business: true },
    { label: 'Squarespace one-click connect', core: true, pro: true, business: true },
    { label: 'Lead dashboard and CSV export', core: true, pro: true, business: true },
    { label: 'Lead & email add-on packs', core: true, pro: true, business: true },
  ]},
  { category: 'Branding & Design', rows: [
    { label: 'Custom brand colors', core: true, pro: true, business: true },
    { label: 'Remove Squarespell logo', core: true, pro: true, business: true },
    { label: 'Custom CSS', core: false, pro: true, business: true },
    { label: 'White-label (your brand)', core: false, pro: false, business: true },
    { label: 'Custom domain for quizzes', core: false, pro: false, business: true },
  ]},
  { category: 'Analytics & Growth', rows: [
    { label: 'Standard analytics', core: true, pro: true, business: true },
    { label: 'Advanced analytics', core: false, pro: true, business: true },
    { label: 'A/B testing', core: false, pro: true, business: true },
    { label: 'Per-question drop-off', core: false, pro: true, business: true },
  ]},
  { category: 'Logic & Automation', rows: [
    { label: 'Branching logic', core: true, pro: true, business: true },
    { label: 'Weighted scoring', core: true, pro: true, business: true },
    { label: 'Email sequences', core: false, pro: true, business: true },
    { label: 'Quiz scheduling', core: true, pro: true, business: true },
  ]},
  { category: 'Integrations', rows: [
    { label: 'Zapier & webhooks', core: false, pro: true, business: true },
    { label: 'Mailchimp, Klaviyo, ConvertKit', core: false, pro: true, business: true },
    { label: 'Google Sheets', core: false, pro: true, business: true },
    { label: 'HubSpot', core: false, pro: true, business: true },
  ]},
  { category: 'Business', rows: [
    { label: 'Team seats', core: false, pro: false, business: true },
    { label: 'API access', core: false, pro: false, business: true },
    { label: 'Priority email support', core: false, pro: true, business: true },
    { label: 'Priority support (email + chat)', core: false, pro: false, business: true },
    { label: 'Dedicated onboarding call', core: false, pro: false, business: true },
  ]},
];

const FAQS = [
  { q: 'Do I need a Squarespace subscription?', a: 'Yes, Squarespell works with any active Squarespace plan. You connect your site in one click through your dashboard. No code required.' },
  { q: 'What happens when my 14-day trial ends?', a: 'You choose a paid plan to continue. Your quizzes stay visible to site visitors, but lead capture pauses until you subscribe. All leads collected during your trial are yours to keep.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Cancel from your account settings in under 10 seconds. Your access continues until the end of your current billing period.' },
  { q: 'What exactly counts as a lead?', a: 'A lead is counted when someone completes your quiz and submits their information. Partial completions and page views never count against your monthly limit.' },
  { q: 'What if I need more leads or emails but not a higher plan?', a: 'You can purchase add-on packs on any paid plan. Lead packs start at $3/mo for 500 extra leads. Email packs start at $3/mo for 1,000 extra emails. No need to upgrade your whole plan.' },
  { q: 'How is Squarespell different from other quiz tools?', a: 'Other quiz tools charge $27-75/mo for their entry plans with fewer leads. Squarespell starts at $9/mo (annual) with 1,000 leads, branching logic, and Squarespace-native integration. Our AI generates a fully branded quiz from your website URL in under 60 seconds.' },
  { q: 'I run an agency. Can I manage multiple client sites?', a: 'Yes. The Business plan at $29/mo (annual) covers unlimited quizzes with unlimited leads, white-label branding so your clients see your brand, custom domains, team seats, and a dedicated onboarding call.' },
];

function Check({ color }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color || '#4ade80'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.32)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingInner />
    </Suspense>
  );
}

function PricingInner() {
  const searchParams = useSearchParams();
  const initialInterval = searchParams.get('interval') === 'yearly' ? 'yearly' : 'monthly';
  const [billing, setBilling] = useState<Billing>(initialInterval === 'monthly' ? 'monthly' : 'yearly');
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const handleUpgrade = async (plan: string) => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    setLoading(plan);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error(e); } finally { setLoading(null); }
  };

  const acc = '#0D7377';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        html { font-size: 16px; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #F7F7F5; color: #1A1A1A; }
        button { cursor: pointer; font-family: inherit; }
        :root {
          --acc: #0D7377;
          --t1: #1A1A1A; --t2: rgba(26,26,26,0.85);
          --t3: rgba(26,26,26,0.60); --t4: rgba(26,26,26,0.40);
          --card: #FFFFFF; --border: #E4E3E0;
        }
        .wrap { min-height:100vh; background:#F7F7F5; padding:0 0 100px; position:relative; overflow-x:clip; }
        .wrap::before { content:''; position:fixed; top:-300px; left:-300px; width:800px; height:800px; background:radial-gradient(circle,rgba(13,115,119,.04) 0%,transparent 65%); pointer-events:none; z-index:0; }
        .wrap::after { content:''; position:fixed; bottom:-300px; right:-300px; width:700px; height:700px; background:radial-gradient(circle,rgba(13,115,119,.03) 0%,transparent 65%); pointer-events:none; z-index:0; }
        .inner { position:relative; z-index:1; padding:0 20px; width:100%; box-sizing:border-box; }

        /* HERO */
        .hero { max-width:800px; margin:0 auto; text-align:center; padding:80px 0 56px; }
        .badge { display:inline-flex; align-items:center; background:rgba(13,115,119,.10); border:1px solid rgba(13,115,119,.25); border-radius:100px; padding:5px 14px; margin-bottom:28px; font-size:11px; font-weight:700; color:var(--acc); letter-spacing:.08em; text-transform:uppercase; }
        .hero h1 { font-size:clamp(24px,4vw,32px); font-weight:800; letter-spacing:-.04em; line-height:1.08; color:var(--t1); margin-bottom:20px; }
        .hero h1 em { color:var(--acc); font-style:normal; }
        .hero p { font-size:clamp(16px,2vw,18px); color:var(--t3); line-height:1.65; max-width:500px; margin:0 auto 28px; }
        .trust { display:flex; justify-content:center; gap:28px; flex-wrap:wrap; }
        .trust span { display:inline-flex; align-items:center; gap:6px; font-size:14px; color:var(--t3); }

        /* TOGGLE */
        .toggle-wrap { display:flex; justify-content:center; align-items:center; gap:12px; margin-bottom:48px; }
        .toggle { display:flex; background:#F0F0EE; border:1px solid #E4E3E0; border-radius:10px; padding:4px; gap:3px; }
        .tbtn { padding:9px 24px; border-radius:8px; border:none; font-size:15px; font-weight:600; transition:all .15s; display:flex; align-items:center; gap:8px; }
        .tbtn.on { background:#1A1A1A; color:#F7F7F5; }
        .tbtn.off { background:transparent; color:var(--t3); }
        .sbadge { background:rgba(13,115,119,.15); color:#0B6165; font-size:11px; font-weight:700; padding:2px 8px; border-radius:100px; border:1px solid rgba(13,115,119,.3); }
        .saving { font-size:14px; color:#0B6165; font-weight:600; }

        /* CARDS */
        .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; max-width:1400px; margin:0 auto 80px; padding:0 48px; }
        .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:32px 28px; display:flex; flex-direction:column; position:relative; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .card.pro { background:#F0F8F9; border-color:rgba(13,115,119,.25); }
        .pop { position:absolute; top:-13px; left:50%; transform:translateX(-50%); background:var(--acc); color:#FFFFFF; font-size:11px; font-weight:800; padding:4px 16px; border-radius:100px; letter-spacing:.07em; text-transform:uppercase; white-space:nowrap; }
        .cname { font-size:18px; font-weight:700; margin-bottom:8px; color:var(--t1); }
        .cname.a { color:var(--acc); }
        .cdesc { font-size:17px; color:var(--t3); line-height:1.55; margin-bottom:28px; min-height:44px; }
        .prow { display:flex; align-items:baseline; gap:3px; margin-bottom:6px; }
        .pold { font-size:16px; color:var(--t4); text-decoration:line-through; margin-right:4px; }
        .pnum { font-size:32px; font-weight:800; letter-spacing:-.04em; color:var(--t1); line-height:1; }
        .pper { font-size:16px; color:var(--t3); }
        .pbill { font-size:13px; color:var(--t4); margin-bottom:4px; } .psave { font-size:15px; font-weight:600; color:#0B6165; margin-bottom:20px; }
        .cta { width:100%; padding:14px 20px; border-radius:10px; border:none; font-size:16px; font-weight:700; margin-bottom:28px; transition:all .15s; letter-spacing:-.01em; }
        .cta.p { background:var(--acc); color:#FFFFFF; }
        .cta.p:hover { background:#0B6165; }
        .cta.s { background:#F0F0EE; color:var(--t1); }
        .cta.s:hover { background:#E4E3E0; }
        .cta:disabled { opacity:.6; }
        .flist { flex:1; display:flex; flex-direction:column; gap:12px; }
        .fi { display:flex; align-items:flex-start; gap:10px; }
        .fi-icon { flex-shrink:0; margin-top:1px; }
        .fi-text { font-size:17px; line-height:1.45; }
        .fi-text.y { color:var(--t2); }
        .fi-text.n { color:rgba(26,26,26,.42); }

        /* TABLE */
        .mtbl-wrap { max-width:1400px; margin:0 auto 80px; padding:0 48px; width:100%; box-sizing:border-box; }
        .sec-title { font-size:24px; font-weight:800; letter-spacing:-.04em; text-align:center; margin-bottom:10px; color:var(--t1); }
        .sec-sub { font-size:17px; color:var(--t3); text-align:center; margin-bottom:36px; }
        .tscroll { background:var(--card); border:1px solid var(--border); border-radius:16px; overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch; }
        .mtbl { width:100%; min-width:580px; border-collapse:collapse; font-size:17px; }
        .mtbl thead tr { border-bottom:1px solid rgba(0,0,0,.08); }
        .mtbl th { padding:18px 24px; font-size:16px; font-weight:700; color:var(--t1); }
        .mtbl th:first-child { text-align:left; color:var(--t3); font-weight:500; width:44%; }
        .mtbl th.tp { color:var(--acc); }
        .mtbl th.to { color:var(--t2); }
        .mtbl td { padding:14px 24px; font-size:16px; color:var(--t2); } .mtbl td:first-child { font-size:16px; color:rgba(26,26,26,0.85); font-weight:400; }
        .mtbl td:not(:first-child) { text-align:center; }
        .mtbl .cat td { padding:10px 24px 8px; font-size:11px !important; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:rgba(13,115,119,0.6); background:rgba(13,115,119,0.05); border-top:1px solid rgba(0,0,0,0.06); }
        .mtbl .dr { border-top:1px solid rgba(0,0,0,.04); } .mtbl .dr td:nth-child(3) { background:rgba(13,115,119,0.05); border-left:1px solid rgba(13,115,119,0.12); border-right:1px solid rgba(13,115,119,0.12); } .mtbl thead th:nth-child(3) { background:rgba(13,115,119,0.06); border-left:1px solid rgba(13,115,119,0.15); border-right:1px solid rgba(13,115,119,0.15); }
        .mv { font-size:14px; font-weight:600; }
        .mv.p { color:var(--acc); }
        .mv.o { color:var(--t2); }

        /* FAQ */
        .faq-wrap { max-width:800px; margin:0 auto 80px; }
        .faq-list { display:flex; flex-direction:column; gap:12px; }
        .faq-item { background:var(--card); border:1px solid var(--border); border-radius:10px; overflow:hidden; cursor:pointer; }
        .faq-item:hover { border-color:rgba(0,0,0,.12); }
        .faq-q { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; gap:16px; }
        .faq-qt { font-size:16px; font-weight:600; color:var(--t1); flex:1; line-height:1.4; }
        .faq-chev { flex-shrink:0; transition:transform .2s; color:var(--t4); }
        .faq-chev.o { transform:rotate(180deg); }
        .faq-a { padding:0 24px 20px; font-size:17px; color:var(--t3); line-height:1.7; }

        /* CTA BOX */
        .ctabox { width:100%; background:#F7F7F5; border-top:1px solid #E4E3E0; padding:80px 48px; display:flex; flex-direction:column; align-items:flex-start; gap:28px; }
        .ctabox h2 { font-size:clamp(24px,4vw,32px); font-weight:800; letter-spacing:-.04em; line-height:1.0; margin:0; max-width:800px; color:var(--t1); }
        .ctabox-right { display:flex; flex-direction:column; align-items:flex-start; gap:12px; } .ctabox p { font-size:17px; color:var(--t3); line-height:1.65; margin:0; }
        .ctabtn { background:var(--acc); color:#FFFFFF; border:none; border-radius:12px; padding:16px 40px; font-size:17px; font-weight:700; cursor:pointer; transition:background .15s; }
        .ctabtn:hover { background:#0B6165; }
        .ctanote { font-size:15px; color:var(--t3); margin:0; line-height:1.5; }

        /* RESPONSIVE */
        @media(max-width:900px){
          .inner { padding:0 20px; }
          .hero { padding:60px 0 40px; }
          .grid { grid-template-columns:1fr; gap:16px; padding:0; }
          .card { padding:28px 24px; }
          .card.pro { margin-top:8px; }
          .sec-title,.ctabox h2 { font-size:20px; }
          .ctabox { padding:40px 24px; }
          .trust { gap:16px; }
          .trust span { font-size:13px; }
        }
        @media(max-width:600px){ .mtbl-wrap { padding:0; } .tscroll { background:transparent; border:none; border-radius:0; } .mtbl { min-width:0; width:100%; } .mtbl thead { display:none; } .mtbl,.mtbl tbody { display:block; width:100%; } .mtbl tr.cat { display:block; } .mtbl tr.dr { display:block; background:var(--card); border:1px solid var(--border); border-radius:12px; margin-bottom:10px; overflow:hidden; } .mtbl tr.dr td { display:flex; justify-content:space-between; align-items:center; padding:11px 16px; border-top:1px solid rgba(0,0,0,.05); font-size:15px; } .mtbl tr.dr td:first-child { font-weight:600; color:var(--t1); background:rgba(0,0,0,.03); border-top:none; display:block; } .mtbl tr.dr td:nth-child(2)::before { content:"Core · "; color:var(--t4); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; } .mtbl tr.dr td:nth-child(3) { background:rgba(13,115,119,.06); } .mtbl tr.dr td:nth-child(3)::before { content:"Pro · "; color:var(--acc); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; } .mtbl tr.dr td:nth-child(4)::before { content:"Business · "; color:var(--t4); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; } .mtbl th:nth-child(2),.mtbl td:nth-child(2),.mtbl th:nth-child(4),.mtbl td:nth-child(4) { display:none; } .mtbl th:first-child { width:60%; } .ctabox { flex-direction:column; padding:48px 20px; text-align:center; } .ctabox-right { align-items:center; width:100%; } .ctabtn { width:100%; }
          .toggle-wrap { flex-direction:column; gap:8px; }
          .pnum { font-size:28px; }
          .ctabox { border-radius:16px; padding:36px 20px; }
          .ctabtn { padding:15px 32px; font-size:16px; }
          .faq-q { padding:18px 20px; }
          .faq-a { padding:0 20px 18px; }
          .faq-qt { font-size:16px; }
        }
      `}</style>

      <div className="wrap">
        <div className="inner">

          {/* HERO */}
          <div className="hero">
            <div className="badge">14-day Pro trial &middot; no credit card</div>
            <h1>Plans that fit your<br /><em>Squarespace budget.</em></h1>
            <p>Try everything free for 14 days. Then pick a plan from $9/mo.</p>
            <div className="trust">
              {['2,400+ Squarespace owners', 'No credit card required', 'Cancel anytime'].map(t => (
                <span key={t}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B6165" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* TOGGLE */}
          <div className="toggle-wrap">
            <div className="toggle">
              <button className={`tbtn ${billing === 'monthly' ? 'on' : 'off'}`} onClick={() => setBilling('monthly')}>Monthly</button>
              <button className={`tbtn ${billing === 'yearly' ? 'on' : 'off'}`} onClick={() => setBilling('yearly')}>
                Annual <span className="sbadge">Save up to 25%</span>
              </button>
            </div>
            {billing === 'yearly' && <span className="saving">Save up to $72/year</span>}
          </div>

          {/* TRIAL BANNER */}
          <div style={{ maxWidth: 1400, margin: '0 auto 28px', padding: '0 48px' }}>
            <div style={{ background: 'rgba(13,115,119,0.06)', border: '1px solid rgba(13,115,119,0.20)', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0D7377', marginBottom: 4 }}>14-day Pro trial</div>
                <div style={{ fontSize: 15, color: 'rgba(26,26,26,0.60)', lineHeight: 1.55 }}>Full Pro features for 14 days. Unlimited quizzes, A/B testing, integrations, advanced analytics. No credit card required.</div>
              </div>
              <button className="cta p" style={{ width: 'auto', margin: 0, padding: '12px 28px' }} onClick={() => { if (!isSignedIn) router.push('/sign-up'); else router.push('/dashboard'); }}>
                {isSignedIn ? 'Go to dashboard' : 'Start free trial'}
              </button>
            </div>
          </div>

          {/* CARDS */}
          <div className="grid">
            {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
              <div key={key} className={`card ${plan.featured ? 'pro' : ''}`}>
                {plan.featured && <div className="pop">Most popular</div>}
                <div className={`cname ${plan.featured ? 'a' : ''}`}>{plan.name}</div>
                <div className="cdesc">{plan.desc}</div>
                <div className="prow">
                  {billing === 'yearly' && <span className="pold">${plan.monthly}</span>}
                  <span className="pnum">${billing === 'monthly' ? plan.monthly : plan.yearly}</span>
                  <span className="pper">/mo</span>
                </div>
                <div className="pbill">{billing === 'yearly' ? `Billed $${plan.yearly * 12}/year` : 'Billed monthly'}</div><div className="psave">Save {Math.round((1 - plan.yearly / plan.monthly) * 100)}% annually</div>
                <button className={`cta ${plan.featured ? 'p' : 's'}`} onClick={() => handleUpgrade(key)} disabled={loading === key}>
                  {loading === key ? 'Loading...' : plan.cta}
                </button>
                <div className="flist">
                  {plan.features.map((f, i) => (
                    <div key={i} className="fi">
                      <span className="fi-icon">{f.included ? <Check color={plan.featured ? acc : '#4ade80'} /> : <Cross />}</span>
                      <span className={`fi-text ${f.included ? 'y' : 'n'}`}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ADD-ON PACKS */}
          <div style={{ maxWidth: 1400, margin: '0 auto 60px', padding: '0 48px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.04em', color: 'var(--t1)', marginBottom: 6 }}>Need more leads or emails?</h3>
                  <p style={{ fontSize: 15, color: 'var(--t3)', lineHeight: 1.55, margin: 0 }}>Add extra capacity to any paid plan without upgrading. Billed monthly, cancel anytime.</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Lead packs */}
                <div style={{ background: 'rgba(13,115,119,0.04)', border: '1px solid rgba(13,115,119,0.15)', borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>Lead packs</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: '+500 leads/mo', price: '$3/mo' },
                      { label: '+1,500 leads/mo', price: '$7/mo' },
                      { label: '+3,000 leads/mo', price: '$12/mo' },
                    ].map(function(a) {
                      return (
                        <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>{a.label}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--acc)' }}>{a.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Email packs */}
                <div style={{ background: 'rgba(13,115,119,0.04)', border: '1px solid rgba(13,115,119,0.15)', borderRadius: 12, padding: '20px 24px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>Email packs</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: '+1,000 emails/mo', price: '$3/mo' },
                      { label: '+5,000 emails/mo', price: '$7/mo' },
                      { label: '+10,000 emails/mo', price: '$12/mo' },
                    ].map(function(a) {
                      return (
                        <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>{a.label}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--acc)' }}>{a.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="mtbl-wrap">
            <h2 className="sec-title">Full feature breakdown</h2>
            <p className="sec-sub">Every feature, across every plan</p>
            <div className="tscroll">
              <table className="mtbl">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className="to">Core</th>
                    <th className="tp">Pro</th>
                    <th className="to">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map(section => (
                    <>
                      <tr key={section.category} className="cat"><td colSpan={4}>{section.category}</td></tr>
                      {section.rows.map((row, ri) => (
                        <tr key={ri} className="dr">
                          <td>{row.label}</td>
                          {(['core', 'pro', 'business'] as const).map(p => (
                            <td key={p} style={p === 'pro' ? {background:'rgba(13,115,119,0.05)',borderLeft:'1px solid rgba(13,115,119,0.12)',borderRight:'1px solid rgba(13,115,119,0.12)'} : {}}>
                              {typeof row[p] === 'boolean'
                                ? (row[p] ? <Check color={p === 'pro' ? acc : '#4ade80'} /> : <Cross />)
                                : <span className={`mv ${p === 'pro' ? 'p' : 'o'}`}>{row[p] as string}</span>}
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
          <div className="faq-wrap">
            <h2 className="sec-title">Common questions</h2>
            <p className="sec-sub">Everything you need to know before you start</p>
            <div className="faq-list">
              {FAQS.map((faq, i) => (
                <div key={i} className="faq-item" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div className="faq-q">
                    <span className="faq-qt">{faq.q}</span>
                    <svg className={`faq-chev ${openFaq === i ? 'o' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  {openFaq === i && <div className="faq-a">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="ctabox">
            <h2>Start capturing leads today.</h2>
            <div className="ctabox-right">
              <button className="ctabtn" onClick={() => { if (!isSignedIn) router.push('/sign-up'); else router.push('/dashboard'); }}>Start my 14-day trial</button>
              <p className="ctanote">Full Pro features for 14 days · No credit card required · Cancel anytime.</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
