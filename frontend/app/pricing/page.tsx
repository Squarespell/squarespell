'use client';

import { Fragment, Suspense, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS } from '@/lib/planCatalog';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Billing = 'monthly' | 'yearly';

/* ── full comparison matrix ───────────────────────────────── */

const MATRIX = [
  {
    category: 'Essentials',
    rows: [
      { label: 'Live quizzes', core: '5', pro: 'Unlimited', business: 'Unlimited' },
      { label: 'Leads per month', core: '1,000', pro: '3,000', business: 'Unlimited' },
      { label: 'Emails per month', core: '1,000', pro: '3,000', business: 'Unlimited' },
      { label: 'AI quiz generation', core: true, pro: true, business: true },
      { label: 'Squarespace one-click connect', core: true, pro: true, business: true },
      { label: 'Lead dashboard + CSV export', core: true, pro: true, business: true },
      { label: 'Lead & email add-on packs', core: true, pro: true, business: 'N/A' },
    ],
  },
  {
    category: 'Quiz Logic & Automation',
    rows: [
      { label: 'Branching logic', core: true, pro: true, business: true },
      { label: 'Weighted scoring', core: true, pro: true, business: true },
      { label: 'Quiz scheduling', core: true, pro: true, business: true },
      { label: 'Email sequences', core: false, pro: true, business: true },
    ],
  },
  {
    category: 'Analytics & Testing',
    rows: [
      { label: 'Standard analytics', core: true, pro: true, business: true },
      { label: 'Advanced analytics', core: false, pro: true, business: true },
      { label: 'A/B testing', core: false, pro: true, business: true },
      { label: 'Per-question drop-off analysis', core: false, pro: true, business: true },
    ],
  },
  {
    category: 'Branding & Design',
    rows: [
      { label: 'Custom brand colors', core: true, pro: true, business: true },
      { label: 'Remove Squarespell Quiz branding', core: true, pro: true, business: true },
      { label: 'Custom CSS', core: false, pro: true, business: true },
      { label: 'White-label (your brand)', core: false, pro: false, business: true },
      { label: 'Custom domain for quizzes', core: false, pro: false, business: true },
    ],
  },
  {
    category: 'Integrations',
    rows: [
      { label: 'Zapier', core: false, pro: true, business: true },
      { label: 'Webhooks', core: false, pro: true, business: true },
      { label: 'Mailchimp', core: false, pro: true, business: true },
      { label: 'Klaviyo', core: false, pro: true, business: true },
      { label: 'ConvertKit', core: false, pro: true, business: true },
      { label: 'HubSpot', core: false, pro: true, business: true },
      { label: 'Google Sheets', core: false, pro: true, business: true },
    ],
  },
  {
    category: 'Support & Business',
    rows: [
      { label: 'Email support', core: true, pro: true, business: true },
      { label: 'Priority email support', core: false, pro: true, business: true },
      { label: 'Priority support (email + chat)', core: false, pro: false, business: true },
      { label: 'Team seats', core: false, pro: false, business: '3 included' },
      { label: 'API access', core: false, pro: false, business: true },
      { label: 'Dedicated onboarding call', core: false, pro: false, business: true },
    ],
  },
];

/* ── competitor comparison ────────────────────────────────── */

const COMPETITORS = [
  { feature: 'Entry plan with branching logic', squarespell: '$9/mo', interact: '$27/mo', scoreapp: '$30/mo', opinionstage: '$25/mo' },
  { feature: 'Leads included on entry', squarespell: '1,000/mo', interact: '500/mo', scoreapp: '100/mo', opinionstage: '1,000/mo' },
  { feature: 'Unlimited quizzes + integrations', squarespell: '$16/mo', interact: '$53/mo', scoreapp: '$75/mo', opinionstage: '$79/mo' },
  { feature: 'Leads on that tier', squarespell: '3,000/mo', interact: '2,000/mo', scoreapp: '1,000/mo', opinionstage: '10,000/mo' },
  { feature: 'Unlimited everything + white-label', squarespell: '$29/mo', interact: '$125/mo', scoreapp: '$112/mo', opinionstage: 'Custom' },
];

/* ── add-on packs ─────────────────────────────────────────── */

const LEAD_PACKS = [
  { label: '+500 leads/mo', price: '$3/mo', per: '$0.006/lead' },
  { label: '+1,500 leads/mo', price: '$7/mo', per: '$0.005/lead' },
  { label: '+3,000 leads/mo', price: '$12/mo', per: '$0.004/lead' },
];

const EMAIL_PACKS = [
  { label: '+1,000 emails/mo', price: '$3/mo', per: '$0.003/email' },
  { label: '+5,000 emails/mo', price: '$7/mo', per: '$0.001/email' },
  { label: '+10,000 emails/mo', price: '$12/mo', per: '$0.001/email' },
];

/* ── FAQs ─────────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'Do I need a Squarespace subscription?',
    a: 'Yes, Squarespell Quiz works with any active Squarespace plan. You connect your site in one click through your dashboard. No code required.',
  },
  {
    q: 'What happens when my 14-day trial ends?',
    a: 'You choose a paid plan to continue. Your quizzes stay visible, but lead capture pauses until you subscribe. All leads collected during your trial are yours to keep.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Cancel from your account settings in under 10 seconds. Access continues until the end of your billing period.',
  },
  {
    q: 'What exactly counts as a lead?',
    a: 'A lead is counted when someone completes your quiz and submits their information. Partial completions and page views never count against your monthly limit.',
  },
  {
    q: 'What if I need more leads or emails but not a higher plan?',
    a: 'Add-on packs let you buy extra capacity on any paid plan. Lead packs start at $3/mo for 500 extra leads. Email packs start at $3/mo for 1,000 extra emails. No need to upgrade.',
  },
  {
    q: 'How is Squarespell Quiz different from other quiz tools?',
    a: 'Other quiz tools charge $27–75/mo for entry plans with fewer leads. Squarespell Quiz starts at $9/mo annual with 1,000 leads, branching logic, and native Squarespace integration. Our AI generates a fully branded quiz from your website URL in under 60 seconds.',
  },
  {
    q: 'I run an agency. Can I manage multiple client sites?',
    a: 'Yes. The Business plan at $29/mo annual includes unlimited quizzes and leads, white-label branding, custom domains, team seats, API access, and a dedicated onboarding call.',
  },
  {
    q: 'What integrations are included with Pro?',
    a: 'Pro includes Zapier, Mailchimp, Klaviyo, ConvertKit, HubSpot, Google Sheets, and webhooks. Connect your existing marketing stack with zero setup friction.',
  },
];

/* ── SVG helpers ──────────────────────────────────────────── */

function CheckIcon({ color }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color || '#0D7377'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ── main page ────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <Suspense>
      <PricingInner />
    </Suspense>
  );
}

function PricingInner() {
  const searchParams = useSearchParams();
  const initialBilling = searchParams.get('interval') === 'monthly' ? 'monthly' : 'yearly';
  const [billing, setBilling] = useState<Billing>(initialBilling);
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  var handleUpgrade = async function (plan: string) {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setLoading(plan);
    try {
      var token = await getToken();
      var res = await fetch(API + '/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ plan: plan, billing: billing }),
      });
      var data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        html { font-size: 16px; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #F7F7F5; color: #1A1A1A; }
        button { cursor: pointer; font-family: inherit; }
        :root {
          --acc: #0D7377; --acc-dark: #0B6165; --acc-bg: rgba(13,115,119,0.06);
          --t1: #1A1A1A; --t2: rgba(26,26,26,0.85); --t3: rgba(26,26,26,0.55); --t4: rgba(26,26,26,0.35);
          --card: #FFFFFF; --border: #E4E3E0; --bg: #F7F7F5;
          --green: #059669; --green-bg: rgba(5,150,105,0.08);
        }

        .wrap { min-height: 100vh; background: var(--bg); position: relative; overflow-x: clip; }
        .wrap::before { content: ''; position: fixed; top: -300px; left: -300px; width: 800px; height: 800px; background: radial-gradient(circle, rgba(13,115,119,.04) 0%, transparent 65%); pointer-events: none; z-index: 0; }
        .wrap::after { content: ''; position: fixed; bottom: -300px; right: -300px; width: 700px; height: 700px; background: radial-gradient(circle, rgba(13,115,119,.03) 0%, transparent 65%); pointer-events: none; z-index: 0; }
        .inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 0 24px 100px; }

        /* ── HERO ── */
        .hero { text-align: center; padding: 80px 0 48px; max-width: 720px; margin: 0 auto; }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: var(--acc-bg); border: 1px solid rgba(13,115,119,0.20); border-radius: 100px; padding: 6px 16px; margin-bottom: 24px; font-size: 12px; font-weight: 700; color: var(--acc); letter-spacing: .06em; text-transform: uppercase; }
        .hero h1 { font-size: clamp(28px, 4.5vw, 40px); font-weight: 800; letter-spacing: -.04em; line-height: 1.1; color: var(--t1); margin-bottom: 16px; }
        .hero h1 em { color: var(--acc); font-style: normal; }
        .hero .sub { font-size: clamp(16px, 2vw, 19px); color: var(--t3); line-height: 1.6; max-width: 520px; margin: 0 auto 24px; }
        .trust-row { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
        .trust-row span { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--t3); font-weight: 500; }

        /* ── TOGGLE ── */
        .toggle-section { display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 44px; flex-wrap: wrap; }
        .toggle-pills { display: flex; background: #EEEEED; border: 1px solid var(--border); border-radius: 12px; padding: 4px; }
        .tpill { padding: 10px 28px; border-radius: 10px; border: none; font-size: 15px; font-weight: 600; transition: all .15s; display: flex; align-items: center; gap: 8px; }
        .tpill.on { background: var(--t1); color: #F7F7F5; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
        .tpill.off { background: transparent; color: var(--t3); }
        .save-pill { background: var(--green-bg); color: var(--green); font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 100px; border: 1px solid rgba(5,150,105,.2); }

        /* ── PLAN CARDS ── */
        .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 64px; }
        .plan-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; padding: 36px 28px 32px; display: flex; flex-direction: column; position: relative; transition: box-shadow .2s; }
        .plan-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.06); }
        .plan-card.featured { background: linear-gradient(180deg, rgba(13,115,119,.03) 0%, rgba(13,115,119,.08) 100%); border-color: rgba(13,115,119,.30); }
        .pop-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--acc); color: #fff; font-size: 11px; font-weight: 800; padding: 5px 18px; border-radius: 100px; letter-spacing: .07em; text-transform: uppercase; white-space: nowrap; }
        .plan-name { font-size: 20px; font-weight: 700; color: var(--t1); margin-bottom: 8px; }
        .plan-name.accent { color: var(--acc); }
        .plan-desc { font-size: 15px; color: var(--t3); line-height: 1.55; margin-bottom: 24px; min-height: 68px; }

        /* price block */
        .price-block { margin-bottom: 8px; }
        .price-row { display: flex; align-items: baseline; gap: 4px; }
        .price-old { font-size: 18px; color: var(--t4); text-decoration: line-through; margin-right: 4px; font-weight: 500; }
        .price-big { font-size: 44px; font-weight: 800; letter-spacing: -.05em; color: var(--t1); line-height: 1; }
        .price-mo { font-size: 16px; color: var(--t3); font-weight: 500; }
        .price-note { font-size: 13px; color: var(--t4); margin-top: 4px; }
        .price-save { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 14px; font-weight: 600; color: var(--green); }

        /* limits */
        .limits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px 0 24px; padding: 16px; background: rgba(0,0,0,.025); border-radius: 12px; }
        .limit-item { text-align: center; }
        .limit-val { font-size: 18px; font-weight: 800; color: var(--t1); letter-spacing: -.02em; }
        .limit-label { font-size: 11px; color: var(--t3); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }

        /* cta */
        .plan-cta { width: 100%; padding: 14px 20px; border-radius: 12px; border: none; font-size: 16px; font-weight: 700; transition: all .15s; letter-spacing: -.01em; margin-bottom: 24px; }
        .plan-cta.primary { background: var(--acc); color: #fff; }
        .plan-cta.primary:hover { background: var(--acc-dark); }
        .plan-cta.secondary { background: #F0F0EE; color: var(--t1); border: 1px solid var(--border); }
        .plan-cta.secondary:hover { background: #E8E8E5; }
        .plan-cta:disabled { opacity: .5; cursor: not-allowed; }

        /* feature list */
        .feat-divider { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--acc); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(13,115,119,.15); }
        .feat-list { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .feat-item { display: flex; align-items: flex-start; gap: 10px; }
        .feat-icon { flex-shrink: 0; margin-top: 2px; }
        .feat-text { font-size: 15px; line-height: 1.45; color: var(--t2); }
        .feat-text.off { color: rgba(26,26,26,.35); }
        .upgrade-hint { margin-top: 16px; padding: 10px 14px; background: var(--acc-bg); border-radius: 8px; font-size: 13px; color: var(--acc); font-weight: 600; text-align: center; }

        /* ── ADD-ON SECTION ── */
        .addon-section { background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; padding: 36px 32px; margin-bottom: 64px; }
        .addon-header { margin-bottom: 24px; }
        .addon-header h3 { font-size: 22px; font-weight: 800; letter-spacing: -.03em; color: var(--t1); margin-bottom: 6px; }
        .addon-header p { font-size: 15px; color: var(--t3); line-height: 1.55; }
        .addon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .addon-col { background: var(--acc-bg); border: 1px solid rgba(13,115,119,.15); border-radius: 14px; padding: 20px 24px; }
        .addon-label { font-size: 11px; font-weight: 700; color: var(--acc); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 14px; }
        .addon-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,.7); border-radius: 8px; border: 1px solid rgba(0,0,0,.05); }
        .addon-row + .addon-row { margin-top: 8px; }
        .addon-name { font-size: 15px; font-weight: 600; color: var(--t1); }
        .addon-price { font-size: 15px; font-weight: 700; color: var(--acc); }
        .addon-per { font-size: 12px; color: var(--t4); margin-left: 8px; }

        /* ── COMPETITOR TABLE ── */
        .comp-section { margin-bottom: 64px; }
        .sec-title { font-size: clamp(22px, 3vw, 28px); font-weight: 800; letter-spacing: -.04em; text-align: center; margin-bottom: 8px; color: var(--t1); }
        .sec-sub { font-size: 16px; color: var(--t3); text-align: center; margin-bottom: 32px; line-height: 1.55; }
        .comp-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; overflow: hidden; }
        .comp-tbl { width: 100%; border-collapse: collapse; font-size: 15px; }
        .comp-tbl thead th { padding: 16px 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid rgba(0,0,0,.08); color: var(--t3); }
        .comp-tbl thead th:first-child { text-align: left; width: 30%; }
        .comp-tbl thead th.hl { color: var(--acc); background: rgba(13,115,119,.04); }
        .comp-tbl tbody td { padding: 14px 20px; border-top: 1px solid rgba(0,0,0,.04); text-align: center; color: var(--t2); }
        .comp-tbl tbody td:first-child { text-align: left; font-weight: 500; color: var(--t2); }
        .comp-tbl tbody td.hl { background: rgba(13,115,119,.04); font-weight: 700; color: var(--acc); border-left: 2px solid rgba(13,115,119,.15); border-right: 2px solid rgba(13,115,119,.15); }
        .comp-headline { text-align: center; margin-top: 20px; font-size: 16px; font-weight: 600; color: var(--acc); }

        /* ── FULL MATRIX TABLE ── */
        .matrix-section { margin-bottom: 64px; }
        .matrix-card { background: var(--card); border: 1.5px solid var(--border); border-radius: 20px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .mtbl { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 15px; }
        .mtbl thead tr { border-bottom: 1px solid rgba(0,0,0,.08); }
        .mtbl thead th { padding: 18px 24px; font-size: 14px; font-weight: 700; color: var(--t2); }
        .mtbl thead th:first-child { text-align: left; color: var(--t3); font-weight: 500; width: 40%; }
        .mtbl thead th.tp { color: var(--acc); background: rgba(13,115,119,.04); }
        .mtbl tbody td { padding: 13px 24px; color: var(--t2); }
        .mtbl tbody td:first-child { font-weight: 400; color: var(--t2); }
        .mtbl tbody td:not(:first-child) { text-align: center; }
        .mtbl .cat-row td { padding: 10px 24px 8px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(13,115,119,0.65); background: rgba(13,115,119,0.04); border-top: 1px solid rgba(0,0,0,.06); }
        .mtbl .data-row { border-top: 1px solid rgba(0,0,0,.04); }
        .mtbl .data-row td:nth-child(3) { background: rgba(13,115,119,.04); border-left: 2px solid rgba(13,115,119,.10); border-right: 2px solid rgba(13,115,119,.10); }
        .mtbl thead th:nth-child(3) { background: rgba(13,115,119,.06); border-left: 2px solid rgba(13,115,119,.12); border-right: 2px solid rgba(13,115,119,.12); }
        .cell-val { font-size: 14px; font-weight: 600; }
        .cell-val.pro-val { color: var(--acc); }

        /* ── FAQ ── */
        .faq-section { max-width: 800px; margin: 0 auto 64px; }
        .faq-list { display: flex; flex-direction: column; gap: 10px; }
        .faq-item { background: var(--card); border: 1.5px solid var(--border); border-radius: 14px; overflow: hidden; cursor: pointer; transition: border-color .15s; }
        .faq-item:hover { border-color: rgba(0,0,0,.15); }
        .faq-q { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; gap: 16px; }
        .faq-qt { font-size: 16px; font-weight: 600; color: var(--t1); flex: 1; line-height: 1.4; }
        .faq-chev { flex-shrink: 0; color: var(--t4); }
        .faq-a { padding: 0 24px 20px; font-size: 15px; color: var(--t3); line-height: 1.7; }

        /* ── BOTTOM CTA ── */
        .bottom-cta { text-align: center; padding: 64px 24px; border-top: 1px solid var(--border); }
        .bottom-cta h2 { font-size: clamp(24px, 4vw, 32px); font-weight: 800; letter-spacing: -.04em; color: var(--t1); margin-bottom: 12px; }
        .bottom-cta .sub { font-size: 16px; color: var(--t3); margin-bottom: 28px; }
        .bottom-btn { background: var(--acc); color: #fff; border: none; border-radius: 12px; padding: 16px 44px; font-size: 17px; font-weight: 700; transition: background .15s; }
        .bottom-btn:hover { background: var(--acc-dark); }
        .bottom-note { font-size: 14px; color: var(--t4); margin-top: 12px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .cards { grid-template-columns: 1fr; gap: 16px; max-width: 480px; margin-left: auto; margin-right: auto; }
          .plan-card.featured { order: -1; }
          .addon-grid { grid-template-columns: 1fr; }
          .comp-tbl { min-width: 580px; }
          .comp-card { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
        @media (max-width: 600px) {
          .inner { padding: 0 16px 80px; }
          .hero { padding: 56px 0 36px; }
          .trust-row { gap: 12px; }
          .trust-row span { font-size: 13px; }
          .toggle-section { flex-direction: column; gap: 8px; }
          .price-big { font-size: 36px; }
          .limits { grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 12px; }
          .limit-val { font-size: 16px; }
          .limit-label { font-size: 10px; }
          .addon-section { padding: 24px 20px; }
          .matrix-card { border-radius: 14px; }
          .faq-q { padding: 18px 20px; }
          .faq-a { padding: 0 20px 18px; }
          .bottom-cta { padding: 48px 16px; }
          .bottom-btn { width: 100%; padding: 15px 32px; }
        }
      `}</style>

      <div className="wrap">
        <div className="inner">

          {/* ═══ HERO ═══ */}
          <div className="hero">
            <div className="badge">14-day Pro trial &middot; no credit card</div>
            <h1>Quiz funnels that fit your<br /><em>Squarespace budget.</em></h1>
            <p className="sub">Full quiz funnels from $9/mo. Competitors charge $27–75 for less.</p>
            <div className="trust-row">
              {['2,400+ Squarespace owners', 'No credit card required', 'Cancel anytime'].map(function (t) {
                return (
                  <span key={t}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {t}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ═══ BILLING TOGGLE ═══ */}
          <div className="toggle-section">
            <div className="toggle-pills">
              <button className={'tpill ' + (billing === 'monthly' ? 'on' : 'off')} onClick={function () { setBilling('monthly'); }}>Monthly</button>
              <button className={'tpill ' + (billing === 'yearly' ? 'on' : 'off')} onClick={function () { setBilling('yearly'); }}>
                Annual
                {billing === 'yearly' && <span className="save-pill">Save up to 25%</span>}
              </button>
            </div>
            {billing === 'yearly' && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>Save up to $72/year</span>}
          </div>

          {/* ═══ PLAN CARDS ═══ */}
          <div className="cards">
            {PLANS.map(function (plan) {
              var price = billing === 'monthly' ? plan.monthly : plan.yearly;
              var showOld = billing === 'yearly';
              return (
                <div key={plan.key} className={'plan-card' + (plan.featured ? ' featured' : '')}>
                  {plan.featured && <div className="pop-badge">Most Popular</div>}
                  <div className={'plan-name' + (plan.featured ? ' accent' : '')}>{plan.name}</div>
                  <div className="plan-desc">{plan.desc}</div>

                  {/* price */}
                  <div className="price-block">
                    <div className="price-row">
                      {showOld && <span className="price-old">${plan.monthly}</span>}
                      <span className="price-big">${price}</span>
                      <span className="price-mo">/mo</span>
                    </div>
                    <div className="price-note">
                      {billing === 'yearly' ? 'Billed $' + plan.yearlyTotal + '/year' : 'Billed monthly'}
                    </div>
                    {billing === 'yearly' && (
                      <div className="price-save">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Save ${plan.yearlySave}/year
                      </div>
                    )}
                  </div>

                  {/* limits */}
                  <div className="limits">
                    <div className="limit-item">
                      <div className="limit-val">{plan.limits.quizzes}</div>
                      <div className="limit-label">Quizzes</div>
                    </div>
                    <div className="limit-item">
                      <div className="limit-val">{plan.limits.leads}</div>
                      <div className="limit-label">Leads/mo</div>
                    </div>
                    <div className="limit-item">
                      <div className="limit-val">{plan.limits.emails}</div>
                      <div className="limit-label">Emails/mo</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    className={'plan-cta ' + (plan.featured ? 'primary' : 'secondary')}
                    onClick={function () { handleUpgrade(plan.key); }}
                    disabled={loading === plan.key}
                  >
                    {loading === plan.key ? 'Loading…' : 'Start free trial'}
                  </button>

                  {/* included features */}
                  <div className="feat-divider">Included</div>
                  <div className="feat-list">
                    {plan.included.map(function (f, i) {
                      return (
                        <div key={i} className="feat-item">
                          <span className="feat-icon"><CheckIcon color={plan.featured ? '#0D7377' : '#059669'} /></span>
                          <span className="feat-text">{f}</span>
                        </div>
                      );
                    })}

                    {/* excluded features */}
                    {plan.excluded.length > 0 && (
                      <>
                        <div style={{ height: 8 }} />
                        {plan.excluded.map(function (f, i) {
                          return (
                            <div key={'x' + i} className="feat-item">
                              <span className="feat-icon"><CrossIcon /></span>
                              <span className="feat-text off">{f}</span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* upgrade hint */}
                  {plan.upgrade && <div className="upgrade-hint">{plan.upgrade} Upgrade to {plan.key === 'core' ? 'Pro' : 'Business'} &rarr;</div>}
                </div>
              );
            })}
          </div>

          {/* ═══ TRIAL BANNER ═══ */}
          <div style={{ background: 'var(--acc-bg)', border: '1.5px solid rgba(13,115,119,.20)', borderRadius: 20, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 64 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--acc)', marginBottom: 4 }}>Start with a 14-day Pro trial</div>
              <div style={{ fontSize: 15, color: 'var(--t3)', lineHeight: 1.55 }}>Unlimited quizzes, A/B testing, all integrations, advanced analytics. No credit card required.</div>
            </div>
            <button className="plan-cta primary" style={{ width: 'auto', margin: 0, padding: '13px 32px' }} onClick={function () { if (!isSignedIn) router.push('/sign-up'); else router.push('/dashboard'); }}>
              {isSignedIn ? 'Go to dashboard' : 'Start free trial'}
            </button>
          </div>

          {/* ═══ ADD-ON PACKS ═══ */}
          <div className="addon-section">
            <div className="addon-header">
              <h3>Need more leads or emails?</h3>
              <p>Add extra capacity to any paid plan. Billed monthly, cancel anytime. Available on Core and Pro.</p>
            </div>
            <div className="addon-grid">
              <div className="addon-col">
                <div className="addon-label">Lead add-on packs</div>
                {LEAD_PACKS.map(function (p) {
                  return (
                    <div key={p.label} className="addon-row">
                      <span className="addon-name">{p.label}</span>
                      <span><span className="addon-price">{p.price}</span><span className="addon-per">{p.per}</span></span>
                    </div>
                  );
                })}
              </div>
              <div className="addon-col">
                <div className="addon-label">Email add-on packs</div>
                {EMAIL_PACKS.map(function (p) {
                  return (
                    <div key={p.label} className="addon-row">
                      <span className="addon-name">{p.label}</span>
                      <span><span className="addon-price">{p.price}</span><span className="addon-per">{p.per}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══ COMPETITOR COMPARISON ═══ */}
          <div className="comp-section">
            <h2 className="sec-title">How we compare</h2>
            <p className="sec-sub">Annual pricing. Squarespell Quiz gives you more for a fraction of the price.</p>
            <div className="comp-card">
              <table className="comp-tbl">
                <thead>
                  <tr>
                    <th>What you get</th>
                    <th className="hl">Squarespell Quiz</th>
                    <th>Interact</th>
                    <th>ScoreApp</th>
                    <th>Opinion Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPETITORS.map(function (row, i) {
                    return (
                      <tr key={i}>
                        <td>{row.feature}</td>
                        <td className="hl">{row.squarespell}</td>
                        <td>{row.interact}</td>
                        <td>{row.scoreapp}</td>
                        <td>{row.opinionstage}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="comp-headline">Full quiz funnels from $9/mo. Competitors charge $27–75 for less.</p>
          </div>

          {/* ═══ FULL FEATURE MATRIX ═══ */}
          <div className="matrix-section">
            <h2 className="sec-title">Full feature comparison</h2>
            <p className="sec-sub">Every feature, across every plan. No hidden limits.</p>
            <div className="matrix-card">
              <table className="mtbl">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Core</th>
                    <th className="tp">Pro</th>
                    <th>Business</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map(function (section) {
                    return (
                      <Fragment key={section.category}>
                        <tr className="cat-row"><td colSpan={4}>{section.category}</td></tr>
                        {section.rows.map(function (row, ri) {
                          return (
                            <tr key={ri} className="data-row">
                              <td>{row.label}</td>
                              {(['core', 'pro', 'business'] as const).map(function (p) {
                                var val = row[p];
                                if (typeof val === 'boolean') {
                                  return <td key={p}>{val ? <CheckIcon color={p === 'pro' ? '#0D7377' : '#059669'} /> : <CrossIcon />}</td>;
                                }
                                return <td key={p}><span className={'cell-val' + (p === 'pro' ? ' pro-val' : '')}>{val}</span></td>;
                              })}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ FAQ ═══ */}
          <div className="faq-section">
            <h2 className="sec-title">Common questions</h2>
            <p className="sec-sub">Everything you need to know before you start.</p>
            <div className="faq-list">
              {FAQS.map(function (faq, i) {
                var isOpen = openFaq === i;
                return (
                  <div key={i} className="faq-item" onClick={function () { setOpenFaq(isOpen ? null : i); }}>
                    <div className="faq-q">
                      <span className="faq-qt">{faq.q}</span>
                      <span className="faq-chev"><ChevronDown open={isOpen} /></span>
                    </div>
                    {isOpen && <div className="faq-a">{faq.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══ BOTTOM CTA ═══ */}
          <div className="bottom-cta">
            <h2>Start capturing leads today.</h2>
            <p className="sub">Try every Pro feature free for 14 days. Pick a plan when you are ready.</p>
            <button className="bottom-btn" onClick={function () { if (!isSignedIn) router.push('/sign-up'); else router.push('/dashboard'); }}>
              {isSignedIn ? 'Go to dashboard' : 'Start my 14-day trial'}
            </button>
            <p className="bottom-note">No credit card required &middot; Cancel anytime</p>
          </div>

        </div>
      </div>
    </>
  );
}

