'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

type Billing = 'monthly' | 'yearly';

const PLANS = {
  starter: {
    name: 'Starter',
    desc: 'Perfect for coaches and consultants capturing their first leads',
    monthly: 19, yearly: 15, cta: 'Start free trial', featured: false,
    features: [
      { text: '5 live quizzes', included: true },
      { text: '500 leads per month', included: true },
      { text: 'AI quiz generation from your website', included: true },
      { text: 'Squarespace one-click connect', included: true },
      { text: 'Lead dashboard and CSV export', included: true },
      { text: 'Email notifications on new leads', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Remove Squarespell branding', included: false },
      { text: 'Conversion insights and lead scoring', included: false },
      { text: 'Zapier and webhook integration', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  pro: {
    name: 'Pro',
    desc: 'For growing businesses serious about turning visitors into clients',
    monthly: 39, yearly: 31, cta: 'Start free trial', featured: true,
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
    monthly: 79, yearly: 63, cta: 'Start free trial', featured: false,
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
  { category: 'Core', rows: [
    { label: 'Live quizzes', starter: '5', pro: '20', agency: 'Unlimited' },
    { label: 'Leads per month', starter: '500', pro: '5,000', agency: 'Unlimited' },
    { label: 'AI quiz generation', starter: true, pro: true, agency: true },
    { label: 'Squarespace one-click connect', starter: true, pro: true, agency: true },
    { label: 'Lead dashboard and CSV export', starter: true, pro: true, agency: true },
    { label: 'Email notifications', starter: true, pro: true, agency: true },
  ]},
  { category: 'Branding', rows: [
    { label: 'Custom brand colors', starter: true, pro: true, agency: true },
    { label: 'Remove Squarespell logo', starter: false, pro: true, agency: true },
    { label: 'White-label (your brand)', starter: false, pro: false, agency: true },
  ]},
  { category: 'Analytics & Growth', rows: [
    { label: 'Basic analytics', starter: true, pro: true, agency: true },
    { label: 'Conversion insights and lead scoring', starter: false, pro: true, agency: true },
    { label: 'A/B test quiz versions', starter: false, pro: true, agency: true },
    { label: 'Zapier and webhook integration', starter: false, pro: true, agency: true },
  ]},
  { category: 'Agency', rows: [
    { label: 'Multi-site management', starter: false, pro: false, agency: true },
    { label: 'Client reporting dashboard', starter: false, pro: false, agency: true },
    { label: 'Custom onboarding call', starter: false, pro: false, agency: true },
    { label: 'Dedicated account manager', starter: false, pro: false, agency: true },
  ]},
  { category: 'Support', rows: [
    { label: 'Email support', starter: true, pro: true, agency: true },
    { label: 'Priority support', starter: false, pro: true, agency: true },
    { label: 'Dedicated account manager', starter: false, pro: false, agency: true },
  ]},
];

const FAQS = [
  { q: 'Do I need a Squarespace subscription?', a: 'Yes, Squarespell works with any active Squarespace plan. You connect your site in one click through your dashboard. No code required.' },
  { q: 'What happens when my 7-day trial ends?', a: 'You choose a plan to continue. Your quizzes stay live so visitors can still see them, but new lead capture pauses until you upgrade. You keep all leads collected during your trial.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Cancel from your account settings in under 10 seconds. Your access continues until the end of your current billing period.' },
  { q: 'What exactly counts as a lead?', a: 'A lead is counted when someone completes your quiz and submits their email address. Partial completions and views never count against your monthly limit.' },
  { q: 'How is Squarespell different from other tools?', a: 'Other tools charge $199+ per month for lead gen features. Squarespell starts at $19/mo and is built specifically for Squarespace owners. Our AI generates a fully branded quiz from your website URL in under 60 seconds.' },
  { q: 'I run an agency. Can I manage multiple client sites?', a: 'Yes. The Agency plan covers unlimited quizzes across unlimited sites, white-label branding so your clients see your brand, a client reporting dashboard, and a dedicated account manager.' },
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,0.32)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const handleUpgrade = async (plan: string) => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    setLoading(plan);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error(e); } finally { setLoading(null); }
  };

  const acc = '#D2FF1D';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        html { font-size: 16px; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #07090c; color: #f0f2f5; }
        button { cursor: pointer; font-family: inherit; }
        :root {
          --acc: #D2FF1D;
          --t1: #f0f2f5; --t2: rgba(240,242,245,0.75);
          --t3: rgba(240,242,245,0.50); --t4: rgba(240,242,245,0.30);
          --card: rgba(255,255,255,0.04); --border: rgba(255,255,255,0.08);
        }
        .wrap { min-height:100vh; background:#07090c; padding:0 0 100px; position:relative; overflow-x:clip; }
        .wrap::before { content:''; position:fixed; top:-300px; left:-300px; width:800px; height:800px; background:radial-gradient(circle,rgba(210,255,29,.06) 0%,transparent 65%); pointer-events:none; z-index:0; }
        .wrap::after { content:''; position:fixed; bottom:-300px; right:-300px; width:700px; height:700px; background:radial-gradient(circle,rgba(210,255,29,.04) 0%,transparent 65%); pointer-events:none; z-index:0; }
        .inner { position:relative; z-index:1; padding:0 20px; width:100%; box-sizing:border-box; }

        /* HERO */
        .hero { max-width:800px; margin:0 auto; text-align:center; padding:80px 0 56px; }
        .badge { display:inline-flex; align-items:center; background:rgba(210,255,29,.08); border:1px solid rgba(210,255,29,.2); border-radius:100px; padding:5px 14px; margin-bottom:28px; font-size:11px; font-weight:700; color:var(--acc); letter-spacing:.08em; text-transform:uppercase; }
        .hero h1 { font-size:clamp(34px,5vw,54px); font-weight:800; letter-spacing:-.04em; line-height:1.08; color:var(--t1); margin-bottom:20px; }
        .hero h1 em { color:var(--acc); font-style:normal; }
        .hero p { font-size:clamp(16px,2vw,18px); color:var(--t3); line-height:1.65; max-width:500px; margin:0 auto 28px; }
        .trust { display:flex; justify-content:center; gap:28px; flex-wrap:wrap; }
        .trust span { display:inline-flex; align-items:center; gap:6px; font-size:14px; color:var(--t3); }

        /* TOGGLE */
        .toggle-wrap { display:flex; justify-content:center; align-items:center; gap:12px; margin-bottom:48px; }
        .toggle { display:flex; background:rgba(255,255,255,.055); border:1px solid rgba(255,255,255,.09); border-radius:10px; padding:4px; gap:3px; }
        .tbtn { padding:9px 24px; border-radius:8px; border:none; font-size:15px; font-weight:600; transition:all .15s; display:flex; align-items:center; gap:8px; }
        .tbtn.on { background:#f0f2f5; color:#07090c; }
        .tbtn.off { background:transparent; color:var(--t3); }
        .sbadge { background:rgba(74,222,128,.15); color:#4ade80; font-size:11px; font-weight:700; padding:2px 8px; border-radius:100px; border:1px solid rgba(74,222,128,.3); }
        .saving { font-size:14px; color:#4ade80; font-weight:600; }

        /* CARDS */
        .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; max-width:1400px; margin:0 auto 80px; padding:0 48px; }
        .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:32px 28px; display:flex; flex-direction:column; position:relative; }
        .card.pro { background:rgba(210,255,29,.05); border-color:rgba(210,255,29,.25); }
        .pop { position:absolute; top:-13px; left:50%; transform:translateX(-50%); background:var(--acc); color:#07090c; font-size:11px; font-weight:800; padding:4px 16px; border-radius:100px; letter-spacing:.07em; text-transform:uppercase; white-space:nowrap; }
        .cname { font-size:26px; font-weight:700; margin-bottom:8px; }
        .cname.a { color:var(--acc); }
        .cdesc { font-size:17px; color:var(--t3); line-height:1.55; margin-bottom:28px; min-height:44px; }
        .prow { display:flex; align-items:baseline; gap:3px; margin-bottom:6px; }
        .pold { font-size:16px; color:var(--t4); text-decoration:line-through; margin-right:4px; }
        .pnum { font-size:48px; font-weight:800; letter-spacing:-.04em; color:var(--t1); line-height:1; }
        .pper { font-size:16px; color:var(--t3); }
        .pbill { font-size:13px; color:var(--t4); margin-bottom:4px; } .psave { font-size:15px; font-weight:600; color:#4ade80; margin-bottom:20px; }
        .cta { width:100%; padding:14px 20px; border-radius:10px; border:none; font-size:16px; font-weight:700; margin-bottom:28px; transition:all .15s; letter-spacing:-.01em; }
        .cta.p { background:var(--acc); color:#07090c; }
        .cta.p:hover { background:#c8f200; }
        .cta.s { background:rgba(255,255,255,.08); color:var(--t1); }
        .cta.s:hover { background:rgba(255,255,255,.12); }
        .cta:disabled { opacity:.6; }
        .flist { flex:1; display:flex; flex-direction:column; gap:12px; }
        .fi { display:flex; align-items:flex-start; gap:10px; }
        .fi-icon { flex-shrink:0; margin-top:1px; }
        .fi-text { font-size:17px; line-height:1.45; }
        .fi-text.y { color:var(--t2); }
        .fi-text.n { color:rgba(240,242,245,.42); }

        /* TABLE */
        .mtbl-wrap { max-width:1400px; margin:0 auto 80px; padding:0 48px; overflow-x:auto; -webkit-overflow-scrolling:touch; width:100%; box-sizing:border-box; }
        .sec-title { font-size:32px; font-weight:800; letter-spacing:-.04em; text-align:center; margin-bottom:10px; }
        .sec-sub { font-size:17px; color:var(--t3); text-align:center; margin-bottom:36px; }
        .tscroll { background:var(--card); border:1px solid var(--border); border-radius:16px; overflow-x:auto; overflow-y:hidden; width:100%; box-sizing:border-box; }
        .mtbl { width:100%; min-width:580px; border-collapse:collapse; font-size:17px; }
        .mtbl thead tr { border-bottom:1px solid rgba(255,255,255,.07); }
        .mtbl th { padding:18px 24px; font-size:16px; font-weight:700; }
        .mtbl th:first-child { text-align:left; color:var(--t3); font-weight:500; width:44%; }
        .mtbl th.tp { color:var(--acc); }
        .mtbl th.to { color:var(--t2); }
        .mtbl td { padding:14px 24px; font-size:16px; } .mtbl td:first-child { font-size:16px; color:rgba(240,242,245,0.85); font-weight:400; }
        .mtbl td:first-child { color:var(--t2); }
        .mtbl td:not(:first-child) { text-align:center; }
        .mtbl .cat td { padding:10px 24px 8px; font-size:11px !important; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:rgba(210,255,29,0.6); background:rgba(210,255,29,0.03); border-top:1px solid rgba(255,255,255,0.06); }
        .mtbl .dr { border-top:1px solid rgba(255,255,255,.04); } .mtbl .dr td:nth-child(3) { background:rgba(210,255,29,0.035); border-left:1px solid rgba(210,255,29,0.08); border-right:1px solid rgba(210,255,29,0.08); } .mtbl thead th:nth-child(3) { background:rgba(210,255,29,0.04); border-left:1px solid rgba(210,255,29,0.10); border-right:1px solid rgba(210,255,29,0.10); }
        .mv { font-size:14px; font-weight:600; }
        .mv.p { color:var(--acc); }
        .mv.o { color:var(--t2); }

        /* FAQ */
        .faq-wrap { max-width:800px; margin:0 auto 80px; }
        .faq-list { display:flex; flex-direction:column; gap:12px; }
        .faq-item { background:var(--card); border:1px solid var(--border); border-radius:10px; overflow:hidden; cursor:pointer; }
        .faq-item:hover { border-color:rgba(255,255,255,.14); }
        .faq-q { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; gap:16px; }
        .faq-qt { font-size:19px; font-weight:600; color:var(--t1); flex:1; line-height:1.4; }
        .faq-chev { flex-shrink:0; transition:transform .2s; color:var(--t4); }
        .faq-chev.o { transform:rotate(180deg); }
        .faq-a { padding:0 24px 20px; font-size:17px; color:var(--t3); line-height:1.7; }

        /* CTA BOX */
        .ctabox { width:100%; background:#07090c; border-top:1px solid rgba(255,255,255,.08); padding:80px 48px; display:flex; flex-direction:column; align-items:flex-start; gap:28px; }
        .ctabox h2 { font-size:clamp(56px,8vw,96px); font-weight:800; letter-spacing:-.04em; line-height:1.0; margin:0; max-width:800px; }
        .ctabox-right { display:flex; flex-direction:column; align-items:flex-start; gap:12px; } .ctabox p { font-size:17px; color:var(--t3); line-height:1.65; margin:0; }
        .ctabtn { background:var(--acc); color:#07090c; border:none; border-radius:12px; padding:16px 40px; font-size:17px; font-weight:700; cursor:pointer; transition:background .15s; }
        .ctabtn:hover { background:#c8f200; }
        .ctanote { font-size:15px; color:var(--t3); margin:0; line-height:1.5; }

        /* RESPONSIVE */
        @media(max-width:900px){
          .inner { padding:0 20px; }
          .hero { padding:60px 0 40px; }
          .grid { grid-template-columns:1fr; gap:16px; padding:0; }
          .card { padding:28px 24px; }
          .card.pro { margin-top:8px; }
          .sec-title,.ctabox h2 { font-size:26px; }
          .ctabox { padding:40px 24px; }
          .trust { gap:16px; }
          .trust span { font-size:13px; }
        }
        @media(max-width:600px){ .ctabox { flex-direction:column; padding:48px 20px; text-align:center; } .ctabox-right { align-items:center; width:100%; } .ctabtn { width:100%; } 
          .toggle-wrap { flex-direction:column; gap:8px; }
          .pnum { font-size:40px; }
          .ctabox { border-radius:16px; padding:36px 20px; }
          .ctabtn { padding:15px 32px; font-size:16px; }
          .faq-q { padding:18px 20px; }
          .faq-a { padding:0 20px 18px; }
          .faq-qt { font-size:16px; }
        }
      `}</style>

      <div className="wrap" style={{overflowX:"hidden"}}>
        <div className="inner">

          {/* HERO */}
          <div className="hero">
            <div className="badge">10× cheaper than alternatives</div>
            <h1>One quiz. More clients.<br /><em>No Squarespace expertise needed.</em></h1>
            <p>Start your 7-day free trial. No credit card required. Cancel anytime.</p>
            <div className="trust">
              {['2,400+ Squarespace owners', 'No credit card required', 'Cancel anytime'].map(t => (
                <span key={t}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
                Yearly <span className="sbadge">Save 20%</span>
              </button>
            </div>
            {billing === 'yearly' && <span className="saving">You save up to $192/year</span>}
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

          {/* TABLE */}
          <div className="mtbl-wrap" style={{overflowX:"auto",WebkitOverflowScrolling:"touch",width:"100%",maxWidth:"100vw",boxSizing:"border-box"}}>
            <h2 className="sec-title">Full feature breakdown</h2>
            <p className="sec-sub">Every feature, across every plan</p>
            <div className="tscroll">
              <table className="mtbl">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th className="to">Starter</th>
                    <th className="tp">Pro</th>
                    <th className="to">Agency</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map(section => (
                    <>
                      <tr key={section.category} className="cat"><td colSpan={4}>{section.category}</td></tr>
                      {section.rows.map((row, ri) => (
                        <tr key={ri} className="dr">
                          <td>{row.label}</td>
                          {(['starter', 'pro', 'agency'] as const).map(p => (
                            <td key={p} style={p === 'pro' ? {background:'rgba(210,255,29,0.05)',borderLeft:'1px solid rgba(210,255,29,0.12)',borderRight:'1px solid rgba(210,255,29,0.12)'} : {}}>
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
              <button className="ctabtn" onClick={() => handleUpgrade('pro')}>Start my free trial</button>
              <p className="ctanote">No credit card required · Cancel anytime.</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
