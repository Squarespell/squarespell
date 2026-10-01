'use client';

/**
 * /dashboard/billing - Billing & plan (2026 redesign, screens 24-27).
 *
 * Local tabs (Overview / Plans / Add-ons / Invoices, deep-linkable with ?tab=) under the shared settings tabs.
 * Overview: current plan card, honest usage (unlimited shows infinity, never a full bar), Compare plans and Add
 * capacity cards, Stripe portal strip. Plans: Monthly/Annual toggle, Core/Pro/Business cards from planCatalog and the
 * full feature matrix (planned items labelled Planned). Add-ons: lead and email packs via Stripe checkout.
 * Invoices: Stripe invoice history. Checkout, proration preview and plan switching are unchanged.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  DisplayTitle,
  PrimaryButton,
  GhostButton,
  PageLoading,
  SettingsTabs,
} from '../_components/PageShell';

import { PLAN_CATALOG } from '@/lib/planCatalog';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

type AddonInfo = {
  key: string;
  extra: number;
  price: number;
  cancel_at_period_end?: boolean;
};

type UserPlan = {
  plan: 'trial' | 'core' | 'starter' | 'pro' | 'business' | 'agency' | 'free' | string;
  quiz_count: number;
  limits: { quizzes: number; leads: number; emails: number };
  base_limits?: { leads: number; emails: number };
  trial_ends_at: string | null;
  email: string;
  leads_this_month?: number;
  emails_this_month?: number;
  features?: { removeBranding: boolean; abTesting: boolean; zapier: boolean; analytics: string };
  lead_addon?: AddonInfo | null;
  email_addon?: AddonInfo | null;
};

type Invoice = {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: string;
  url: string;
};



type BillingTab = 'overview' | 'plans' | 'addons' | 'invoices';

const BILLING_TABS: { key: BillingTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'plans', label: 'Plans' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'invoices', label: 'Invoices' },
];

const LEAD_PACKS = [
  { key: 'lead_500', label: '+500 leads', price: 3 },
  { key: 'lead_1500', label: '+1,500 leads', price: 7 },
  { key: 'lead_3000', label: '+3,000 leads', price: 12 },
];
const EMAIL_PACKS = [
  { key: 'email_1000', label: '+1,000 emails', price: 3 },
  { key: 'email_5000', label: '+5,000 emails', price: 7 },
  { key: 'email_10000', label: '+10,000 emails', price: 12 },
];

/** Feature matrix rows. 'planned' means listed on the plan but not live yet (kept honest, per planCatalog). */
type Cell = boolean | 'planned';
const MATRIX: { f: string; core: Cell; pro: Cell; business: Cell; tip?: string }[] = [
  { f: 'AI quiz generation from your URL', core: true, pro: true, business: true },
  { f: 'Remove Squarespell Quiz branding', core: true, pro: true, business: true },
  { f: 'Branching logic', core: true, pro: true, business: true },
  { f: 'Weighted scoring', core: true, pro: true, business: true },
  { f: 'Quiz scheduling', core: true, pro: true, business: true },
  { f: 'A/B testing', core: false, pro: true, business: true },
  { f: 'Email sequences', core: false, pro: true, business: true },
  { f: 'Integrations (Mailchimp, Klaviyo, ConvertKit, Google Sheets, webhooks)', core: false, pro: true, business: true, tip: 'Zapier and HubSpot are planned.' },
  { f: 'Advanced analytics and per-question drop-off', core: false, pro: true, business: true },
  { f: 'Custom CSS', core: false, pro: true, business: true },
  { f: 'White-label (your brand on everything)', core: false, pro: false, business: true },
  { f: 'Team seats (3 included, $5/seat extra)', core: false, pro: false, business: true },
  { f: 'Custom domain for quizzes', core: false, pro: false, business: 'planned' },
  { f: 'API access', core: false, pro: false, business: 'planned' },
  { f: 'Dedicated onboarding call', core: false, pro: false, business: true },
];

function isUnlimitedLimit(limit: number | null | undefined) {
  return limit == null || limit <= 0 || !isFinite(limit) || limit >= 999999;
}

function Check() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Included"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
}

function UsageRow({ icon, label, used, limit }: { icon: string; label: string; used: number; limit: number | null | undefined }) {
  var unlimited = isUnlimitedLimit(limit);
  var pct = !unlimited && limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 0', borderTop: '1px solid ' + C.BORDER_LIGHT }}>
      <span style={{ width: 52, height: 52, borderRadius: '50%', background: C.GRAY_50, border: '1px solid ' + C.BORDER, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.INK, flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, color: C.INK }}>{label}</div>
        {!unlimited && (
          <div style={{ height: 6, borderRadius: 3, background: C.GRAY_100, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: pct >= 90 ? C.DANGER : C.ACCENT }} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 22, fontWeight: 500, color: C.INK, fontVariantNumeric: 'tabular-nums' }}>
          {used.toLocaleString()} <span style={{ fontWeight: 500, color: C.GRAY_500 }}>/ {unlimited ? '∞' : (limit as number).toLocaleString()}</span>
        </div>
        <div style={{ fontSize: 13, color: C.GRAY_500 }}>{unlimited ? 'Unlimited' : pct + '% used'}</div>
      </div>
    </div>
  );
}

function InvoicesSection({ token }: { token: string | null }) {
  var [invoices, setInvoices] = useState<Invoice[]>([]);
  var [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(function() {
    if (!token) return;
    fetch(API + '/api/stripe/invoices', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r) { if (!r.ok) throw new Error('Failed to load invoices'); return r.json(); })
      .then(function(data) { setInvoices(Array.isArray(data?.invoices) ? data.invoices : []); setInvoicesLoading(false); })
      .catch(function(e) { console.error(e); setInvoicesLoading(false); });
  }, [token]);

  if (invoicesLoading) return <PageLoading />;

  var th: React.CSSProperties = { textAlign: 'left', padding: '14px 20px', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.GRAY_500, borderBottom: '1px solid ' + C.BORDER };
  var td: React.CSSProperties = { padding: '14px 20px', fontSize: 15, color: C.INK, borderBottom: '1px solid ' + C.BORDER_LIGHT };
  return (
    <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, overflowX: 'auto' }}>
      {invoices.length === 0 ? (
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.INK }}>No invoices yet</div>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: C.GRAY_600 }}>Invoices appear here after your first payment.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead><tr><th style={th}>Date</th><th style={th}>Invoice</th><th style={th}>Amount</th><th style={th}>Status</th></tr></thead>
          <tbody>
            {invoices.map(function(invoice) {
              var paid = invoice.status === 'paid';
              return (
                <tr key={invoice.id}>
                  <td style={td}>{new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td style={td}>{invoice.url ? <a href={invoice.url} target="_blank" rel="noopener noreferrer" style={{ color: C.ACCENT, textDecoration: 'none', fontWeight: 500 }}>{invoice.number}</a> : invoice.number}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>${(invoice.amount / 100).toFixed(2)}</td>
                  <td style={td}><span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 13, textTransform: 'capitalize', background: paid ? C.SUCCESS_LIGHT : C.WARNING_LIGHT, color: paid ? C.SUCCESS_700 : C.WARNING }}>{invoice.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function BillingPage() {
  var router = useRouter();
  var { token, status: authStatus } = useDashboardAuth();
  var [plan, setPlan] = useState<UserPlan | null>(null);
  var [realQuizCount, setRealQuizCount] = useState<number | null>(null);
  var [loading, setLoading] = useState(true);
  var [yearly, setYearly] = useState(true);
  var [tab, setTab] = useState<BillingTab>('overview');
  var [leadPick, setLeadPick] = useState<string | null>(null);
  var [emailPick, setEmailPick] = useState<string | null>(null);

  // Deep-link to a billing tab with ?tab=plans|addons|invoices (read on the client to avoid a Suspense boundary).
  useEffect(function() {
    try {
      var t = new URLSearchParams(window.location.search).get('tab') as BillingTab | null;
      if (t && BILLING_TABS.some(function(b) { return b.key === t; })) setTab(t);
    } catch (e) {}
  }, []);

  function changeTab(t: BillingTab) {
    setTab(t);
    try {
      var url = new URL(window.location.href);
      if (t === 'overview') url.searchParams.delete('tab'); else url.searchParams.set('tab', t);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }
  var [error, setError] = useState(false);

  function fetchPlan() {
    if (!token) return;
    setLoading(true);
    setError(false);
    fetch(API + '/api/user/plan', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(r) {
        if (!r.ok) throw new Error('Failed to load plan');
        return r.json();
      })
      .then(function(data) {
        setPlan(data);
        setLoading(false);
      })
      .catch(function(e) {
        console.error(e);
        setError(true);
        setLoading(false);
      });
    /* Also fetch real quiz count (active quizzes only) */
    fetch(API + '/api/quizzes', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && Array.isArray(data)) {
          setRealQuizCount(data.filter(function(q: any) { return q.status !== 'archived' && q.status !== 'deleted'; }).length);
        }
      })
      .catch(function() { /* ignore — fall back to plan.quiz_count */ });
  }

  useEffect(function() {
    fetchPlan();
  }, [token]);

  var trialDaysLeft = useMemo(function() {
    if (!plan?.trial_ends_at) return 0;
    var diff = new Date(plan.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [plan]);

  var isTrial = plan?.plan === 'trial';
  var isPaid = plan && !isTrial;
  var [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  var [addonLoading, setAddonLoading] = useState<string | null>(null);

  function handleAddonCheckout(addonKey: string) {
    if (!token) return;
    setAddonLoading(addonKey);
    fetch(API + '/api/stripe/create-addon-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ addon_key: addonKey }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Could not start add-on checkout');
          setAddonLoading(null);
        }
      })
      .catch(function() {
        alert('Something went wrong. Please try again.');
        setAddonLoading(null);
      });
  }

  function handleCancelAddon(type: 'lead' | 'email') {
    if (!token) return;
    if (!confirm('Cancel your ' + type + ' add-on? It will remain active until the end of the current billing period.')) return;
    setAddonLoading(type);
    fetch(API + '/api/stripe/cancel-addon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ addon_type: type }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setAddonLoading(null);
        if (data.error) {
          alert(data.error);
          return;
        }
        fetchPlan();
      })
      .catch(function() {
        alert('Something went wrong. Please try again.');
        setAddonLoading(null);
      });
  }

  // Plan switch modal state
  var [switchModal, setSwitchModal] = useState<{
    targetPlan: string;
    targetName: string;
    billing: string;
    prorationFormatted: string;
    nextInvoiceFormatted: string;
    prorationAmount: number;
  } | null>(null);
  var [switchLoading, setSwitchLoading] = useState(false);
  var [switchError, setSwitchError] = useState<string | null>(null);

  function handlePlanAction(planId: string) {
    if (!token) return;
    // If user has no subscription (trial/free), go through checkout
    if (isTrial) {
      handleCheckout(planId);
      return;
    }
    // If user is already paid, show proration preview then switch
    handlePreviewSwitch(planId);
  }

  function handleCheckout(planId: string) {
    if (!token) return;
    setCheckoutLoading(planId);
    var billing = yearly ? 'yearly' : 'monthly';
    fetch(API + '/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ plan: planId, billing: billing }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(data.error || 'Could not start checkout');
          setCheckoutLoading(null);
        }
      })
      .catch(function() {
        alert('Something went wrong. Please try again.');
        setCheckoutLoading(null);
      });
  }

  function handlePreviewSwitch(planId: string) {
    if (!token) return;
    setCheckoutLoading(planId);
    setSwitchError(null);
    var billing = yearly ? 'yearly' : 'monthly';
    var catalogEntry = PLAN_CATALOG.find(function(p) { return p.id === planId; });
    fetch(API + '/api/stripe/preview-proration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ plan: planId, billing: billing }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setCheckoutLoading(null);
        if (data.error) {
          setSwitchError(data.error);
          return;
        }
        setSwitchModal({
          targetPlan: planId,
          targetName: catalogEntry?.name || planId,
          billing: billing,
          prorationFormatted: data.prorationFormatted || '$0.00',
          nextInvoiceFormatted: data.nextInvoiceFormatted || '$0.00',
          prorationAmount: data.prorationAmount || 0,
        });
      })
      .catch(function() {
        setCheckoutLoading(null);
        setSwitchError('Failed to load pricing. Please try again.');
      });
  }

  function confirmSwitch() {
    if (!token || !switchModal) return;
    setSwitchLoading(true);
    setSwitchError(null);
    fetch(API + '/api/stripe/switch-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ plan: switchModal.targetPlan, billing: switchModal.billing }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setSwitchLoading(false);
        if (data.error) {
          setSwitchError(data.error);
          return;
        }
        setSwitchModal(null);
        // Refresh plan data
        fetchPlan();
      })
      .catch(function() {
        setSwitchLoading(false);
        setSwitchError('Failed to switch plan. Please try again.');
      });
  }

  const openPortal = () => {
    if (!token) return;
    fetch(`${API}/api/stripe/portal`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) window.location.href = data.url;
        else alert('Could not open billing portal. Please try again.');
      })
      .catch(() => {
        alert('Something went wrong opening the billing portal.');
      });
  };

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Billing & plan">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (error || !plan) {
    return (
      <DashboardShell title="Billing & plan">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED}
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>
            Could not load billing info
          </div>
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 18 }}>
            The server may be starting up. Please try again.
          </div>
          <PrimaryButton onClick={function() { fetchPlan(); }}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  // Map internal plan names to user-friendly display names
  const PLAN_NAME_MAP: Record<string, string> = {
    trial: 'Trial', core: 'Core', starter: 'Core', pro: 'Pro', business: 'Business', agency: 'Business', free: 'Free',
  };
  var displayPlanName = PLAN_NAME_MAP[plan.plan] || plan.plan;
  var planKey = plan.plan === 'starter' ? 'core' : plan.plan === 'agency' ? 'business' : plan.plan;
  var isBusiness = planKey === 'business';
  var currentCatalog = PLAN_CATALOG.find(function(p) { return p.id === planKey; });
  var quizzesUsed = realQuizCount !== null ? realQuizCount : plan.quiz_count;

  function limitText(n: number | null | undefined, noun: string) {
    return isUnlimitedLimit(n) ? 'Unlimited ' + noun : (n as number).toLocaleString() + ' ' + noun;
  }

  var titles: Record<BillingTab, { eyebrow: string; title: string; sub: string }> = {
    overview: { eyebrow: 'Settings', title: 'Billing & plan.', sub: 'Manage your Squarespell Quiz subscription.' },
    plans: { eyebrow: 'Billing & plan', title: 'The right plan for your next stage.', sub: 'Powerful quiz funnels for every stage, from side projects to growing brands.' },
    addons: { eyebrow: 'Billing & plan', title: 'A little more room to grow.', sub: 'Add lead or email capacity to Core and Pro without changing plans.' },
    invoices: { eyebrow: 'Billing & plan', title: 'Your invoices.', sub: 'Download past invoices or manage payment details in the billing portal.' },
  };
  var head = titles[tab];

  var portalStrip = (
    <section style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '22px 26px', marginTop: 20, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: C.DISPLAY_FONT, fontSize: 30, fontWeight: 500, letterSpacing: '-0.04em', color: '#635BFF', paddingRight: 24, borderRight: '1px solid ' + C.BORDER }}>stripe</span>
      <div style={{ flex: '1 1 320px' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.INK }}>Payment methods &amp; invoices</div>
        <div style={{ fontSize: 15, color: C.GRAY_600, marginTop: 4 }}>Manage payment methods, view invoices and update billing details in the secure Stripe customer portal.</div>
      </div>
      {isPaid ? (
        <button type="button" onClick={openPortal} className="bl-btn" style={{ height: 50 }}>Open billing portal ↗</button>
      ) : (
        <span style={{ fontSize: 14, color: C.GRAY_500 }}>Available once you are on a paid plan.</span>
      )}
    </section>
  );

  function PlanCards() {
    var tones: Record<string, { bg: string; fg: string; sub: string }> = {
      core: { bg: C.PERIWINKLE_SOFT, fg: C.INK, sub: C.GRAY_600 },
      pro: { bg: C.ACCENT, fg: '#fff', sub: 'rgba(255,255,255,0.85)' },
      business: { bg: C.ACID_SOFT, fg: C.INK, sub: C.GRAY_600 },
    };
    var core = PLAN_CATALOG[0], pro = PLAN_CATALOG[1];
    function bulletsFor(p: typeof PLAN_CATALOG[number]) {
      if (p.id === 'core') return p.included.slice(0, 7);
      if (p.id === 'pro') return p.included.slice(0, 8);
      var seen = core.included.concat(pro.included);
      return ['Everything in Pro'].concat(p.included.filter(function(x) { return seen.indexOf(x) < 0 && !/^Branching|^Advanced analytics|^Priority/.test(x); }));
    }
    return (
      <div className="bl-cards">
        {PLAN_CATALOG.map(function(p) {
          var t = tones[p.id];
          var isCurrent = planKey === p.id;
          var moPrice = yearly ? Math.round(p.yearlyPrice / 12) : p.monthlyPrice;
          var ctaLabel = checkoutLoading === p.id ? 'Loading...' : isCurrent ? 'Current plan'
            : isPaid ? (PLAN_CATALOG.findIndex(function(c) { return c.id === planKey; }) < PLAN_CATALOG.findIndex(function(c) { return c.id === p.id; }) ? 'Upgrade to ' + p.name : 'Switch to ' + p.name)
            : 'Choose ' + p.name;
          return (
            <article key={p.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid ' + (p.featured ? C.ACCENT : C.BORDER), borderRadius: 8, overflow: 'visible' }}>
              {p.featured && <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', padding: '4px 18px', borderRadius: 999, background: C.ACCENT, border: '2px solid #fff', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>MOST POPULAR</span>}
              <div style={{ background: t.bg, color: t.fg, padding: '26px 28px 22px', borderRadius: '7px 7px 0 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{p.name}</h3>
                  {isCurrent && <span style={{ fontSize: 13, padding: '3px 12px', borderRadius: 999, background: C.PERIWINKLE_SOFT, color: C.BRAND_700, border: '1px solid ' + C.PERIWINKLE }}>Current plan</span>}
                </div>
                <p style={{ margin: '8px 0 16px', fontSize: 16, lineHeight: 1.4, color: t.sub, minHeight: 45 }}>{p.tagline}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  {yearly && <span style={{ fontSize: 20, textDecoration: 'line-through', opacity: 0.7 }}>${p.monthlyPrice}</span>}
                  <span style={{ fontFamily: C.DISPLAY_FONT, fontSize: 46, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1 }}>${moPrice}</span>
                  <span style={{ fontSize: 18, opacity: 0.85 }}>/mo</span>
                </div>
                <div style={{ fontSize: 15, marginTop: 6, color: t.sub }}>{yearly ? 'Billed $' + p.yearlyPrice + '/year' : 'Billed monthly'}</div>
              </div>
              <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: C.GRAY_50, borderRadius: 6, padding: '12px 0', marginBottom: 18 }}>
                  {[[p.limits.quizzes, 'Quizzes'], [p.limits.leads, 'Leads/mo'], [p.limits.emails, 'Emails/mo']].map(function(l, i) {
                    return (
                      <div key={l[1]} style={{ textAlign: 'center', borderLeft: i ? '1px solid ' + C.BORDER : 'none' }}>
                        <div style={{ fontSize: 17, fontWeight: 600, color: C.INK }}>{l[0]}</div>
                        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.GRAY_500, marginTop: 2 }}>{l[1]}</div>
                      </div>
                    );
                  })}
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: '0 6px', display: 'grid', gap: 10, flex: 1, alignContent: 'start' }}>
                  {bulletsFor(p).map(function(f) {
                    return <li key={f} style={{ display: 'flex', gap: 12, fontSize: 15, color: C.INK, lineHeight: 1.4 }}><span style={{ flexShrink: 0, marginTop: 1 }}><Check /></span>{f}</li>;
                  })}
                </ul>
                <button type="button" disabled={isCurrent || checkoutLoading === p.id} onClick={function() { handlePlanAction(p.id); }}
                  style={{ height: 50, borderRadius: 6, fontSize: 17, fontWeight: 500, fontFamily: C.FONT, cursor: isCurrent ? 'default' : 'pointer', border: '1px solid ' + (isCurrent ? C.GRAY_100 : p.featured ? C.ACCENT : C.INK), background: isCurrent ? C.GRAY_100 : p.featured ? C.ACCENT : '#fff', color: isCurrent ? C.GRAY_400 : p.featured ? '#fff' : C.INK }}>
                  {ctaLabel}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  function Matrix() {
    var cols: ('core' | 'pro' | 'business')[] = ['core', 'pro', 'business'];
    var sub: Record<string, string> = { core: 'For getting started', pro: 'For growing businesses', business: 'For teams and custom brands' };
    return (
      <section style={{ marginTop: 40 }}>
        <h2 style={{ margin: '0 0 6px', fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(30px, 3vw, 44px)', fontWeight: 500, letterSpacing: '-0.035em', color: C.INK }}>Compare every feature<span style={{ color: C.ACCENT }}>.</span></h2>
        <p style={{ margin: '0 0 20px', fontSize: 17, color: C.GRAY_600 }}>Choose the plan that fits your goals. Upgrade, downgrade or manage your billing at any time.</p>
        <div style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '22px 22px', fontSize: 18, fontWeight: 600, color: C.INK, verticalAlign: 'top', width: '40%' }}>Feature</th>
                {cols.map(function(k) {
                  var p = PLAN_CATALOG.find(function(x) { return x.id === k; })!;
                  var isCurrent = planKey === k;
                  var price = yearly ? Math.round(p.yearlyPrice / 12) : p.monthlyPrice;
                  return (
                    <th key={k} style={{ textAlign: 'left', padding: '22px 22px', verticalAlign: 'top', borderLeft: '1px solid ' + C.BORDER, background: isCurrent ? C.PERIWINKLE_SOFT : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 600, color: C.INK }}>{p.name}</span>
                        {isCurrent && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: C.ACCENT, color: '#fff', whiteSpace: 'nowrap' }}>Current plan</span>}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 400, color: C.GRAY_500, marginTop: 4 }}>{sub[k]}</div>
                      <div style={{ fontSize: 15, fontWeight: 400, color: C.GRAY_600, marginTop: 8 }}><b style={{ fontSize: 18, color: C.INK }}>${price}</b>/mo · {yearly ? 'billed annually' : 'billed monthly'}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(function(r) {
                return (
                  <tr key={r.f}>
                    <td style={{ padding: '10px 22px', fontSize: 15, color: C.INK, borderTop: '1px solid ' + C.BORDER_LIGHT }}>
                      {r.f}{r.tip && <span style={{ display: 'block', fontSize: 13, color: C.GRAY_500 }}>{r.tip}</span>}
                    </td>
                    {cols.map(function(k) {
                      var v = r[k];
                      return (
                        <td key={k} style={{ padding: '10px 22px', textAlign: 'center', borderTop: '1px solid ' + C.BORDER_LIGHT, borderLeft: '1px solid ' + C.BORDER, background: planKey === k ? C.PERIWINKLE_SOFT : 'transparent' }}>
                          {v === true ? <Check /> : v === 'planned' ? <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: C.GRAY_100, color: C.GRAY_600 }}>Planned</span> : <span aria-label="Not included" style={{ color: C.GRAY_300 }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function PackCard({ title, packs, addon, type }: { title: string; packs: typeof LEAD_PACKS; addon: AddonInfo | null | undefined; type: 'lead' | 'email' }) {
    var disabledReason = isBusiness ? 'Business already includes unlimited ' + type + 's.' : !isPaid ? 'Add-ons are available on paid Core and Pro plans.' : '';
    var selected = type === 'lead' ? leadPick : emailPick;
    var setSelected = type === 'lead' ? setLeadPick : setEmailPick;
    return (
      <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <span style={{ width: 48, height: 48, borderRadius: 8, background: type === 'lead' ? C.PERIWINKLE_SOFT : C.ACID_SOFT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.INK }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={type === 'lead' ? 'M12 11a4 4 0 100-8 4 4 0 000 8zM5 21c0-3.9 3.1-7 7-7s7 3.1 7 7' : 'M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zM22 7l-10 7L2 7'} /></svg>
          </span>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.INK }}>{title}</h3>
        </div>
        <p style={{ margin: '4px 0 18px', fontSize: 15, color: C.GRAY_600 }}>Billed monthly with your plan. Cancel anytime.</p>
        {addon ? (
          <div style={{ padding: 18, borderRadius: 6, background: C.PERIWINKLE_SOFT }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.INK }}>+{addon.extra.toLocaleString()} {type}s/mo · ${addon.price}/mo</div>
            {addon.cancel_at_period_end
              ? <div style={{ fontSize: 14, color: C.WARNING, marginTop: 6 }}>Cancels at the end of this billing period</div>
              : <button type="button" onClick={function() { handleCancelAddon(type); }} disabled={addonLoading === type} style={{ marginTop: 10, padding: 0, border: 'none', background: 'none', color: C.DANGER, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>Cancel add-on</button>}
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label={title} style={{ display: 'grid', gap: 10, flex: 1, alignContent: 'start' }}>
              {packs.map(function(a) {
                var on = selected === a.key;
                return (
                  <button key={a.key} type="button" role="radio" aria-checked={on} disabled={!!disabledReason} onClick={function() { setSelected(a.key); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, height: 56, padding: '0 18px', borderRadius: 6, border: '1px solid ' + (on ? C.ACCENT : C.BORDER), background: on ? C.PERIWINKLE_SOFT : '#fff', cursor: disabledReason ? 'default' : 'pointer', opacity: disabledReason ? 0.6 : 1, fontFamily: C.FONT }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid ' + (on ? C.ACCENT : C.GRAY_300), boxShadow: on ? 'inset 0 0 0 3px #fff' : 'none', background: on ? C.ACCENT : '#fff' }} />
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 16, color: C.INK }}>{a.label}<span style={{ color: C.GRAY_500 }}> / month</span></span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>${a.price}/mo</span>
                  </button>
                );
              })}
            </div>
            {disabledReason ? (
              <div style={{ marginTop: 18, fontSize: 14, color: C.GRAY_600 }}>{disabledReason}</div>
            ) : (
              <button type="button" onClick={function() { if (selected) handleAddonCheckout(selected); }} disabled={!selected || addonLoading === selected}
                style={{ marginTop: 18, height: 48, borderRadius: 6, border: 'none', background: selected ? C.ACCENT : C.GRAY_100, color: selected ? '#fff' : C.GRAY_400, fontSize: 16, fontFamily: C.FONT, cursor: selected ? 'pointer' : 'default' }}>
                {addonLoading === selected ? 'Opening checkout...' : 'Select pack'}
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <DashboardShell title="Billing & plan">
      <style dangerouslySetInnerHTML={{ __html: `
        .bl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; height: 46px; padding: 0 22px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 16px ${C.FONT}; cursor: pointer; text-decoration: none; white-space: nowrap; }
        .bl-btn:hover { border-color: ${C.GRAY_300}; }
        .bl-top { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 20px; margin-bottom: 20px; }
        .bl-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .bl-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
        .bl-seg button { height: 44px; padding: 0 20px; border: none; border-radius: 999px; background: transparent; color: ${C.INK}; font: 500 15px ${C.FONT}; cursor: pointer; }
        .bl-seg button[aria-pressed="true"] { background: ${C.ACCENT}; color: #fff; }
        @media (max-width: 1100px) { .bl-top, .bl-duo, .bl-cards { grid-template-columns: 1fr; } }
      ` }} />

      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: tab === 'overview' ? C.GRAY_500 : C.ACCENT, marginBottom: 14 }}>{head.eyebrow}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={{ minWidth: 0, maxWidth: 980 }}>
          <DisplayTitle size="xl">{head.title}</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>{head.sub}</p>
        </div>
        {tab === 'plans' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="bl-seg" role="group" aria-label="Billing period" style={{ display: 'flex', padding: 3, borderRadius: 999, border: '1px solid ' + C.BORDER, background: '#fff' }}>
              <button type="button" aria-pressed={!yearly} onClick={function() { setYearly(false); }}>Monthly</button>
              <button type="button" aria-pressed={yearly} onClick={function() { setYearly(true); }}>Annual</button>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, padding: '6px 12px', borderRadius: 999, background: C.ACID, color: C.INK }}>Save up to 25%</span>
          </div>
        )}
      </div>

      <SettingsTabs />

      <div role="tablist" aria-label="Billing" style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {BILLING_TABS.map(function(t) {
          var active = tab === t.key;
          return (
            <button key={t.key} type="button" role="tab" aria-selected={active} onClick={function() { changeTab(t.key); }}
              style={{ height: 40, padding: '0 18px', borderRadius: 999, border: '1px solid ' + (active ? C.ACCENT : C.BORDER), background: active ? C.ACCENT : '#fff', color: active ? '#fff' : C.INK, fontSize: 15, fontFamily: C.FONT, cursor: 'pointer' }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <>
          <div className="bl-top">
            <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, background: C.ACCENT, color: '#fff', padding: '34px 36px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 28 }}>
              <svg aria-hidden="true" width="100%" height="140" viewBox="0 0 600 140" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0 }}>
                <path d="M90 140 C 140 40, 300 20, 380 140" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
                <path d="M260 140 A 110 90 0 0 1 480 140 Z" fill={C.BRAND_300} opacity="0.8" />
              </svg>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', opacity: 0.85 }}>CURRENT PLAN</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: C.DISPLAY_FONT, fontSize: 52, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1 }}>{displayPlanName}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: C.ACID, color: C.INK, fontSize: 15 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1F9D57' }} />{isTrial ? trialDaysLeft + ' days left' : 'Active'}
                  </span>
                </div>
                <div style={{ fontSize: 18, marginTop: 14, opacity: 0.9 }}>{isTrial ? 'Free trial, no billing yet' : 'Billed through Stripe'}</div>
                <div style={{ marginTop: 28 }}>
                  {isPaid
                    ? <button type="button" onClick={openPortal} className="bl-btn" style={{ border: 'none' }}>Manage billing</button>
                    : <button type="button" onClick={function() { changeTab('plans'); }} className="bl-btn" style={{ border: 'none' }}>Choose a plan</button>}
                </div>
              </div>
              <div style={{ position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.35)', paddingLeft: 28 }}>
                <div style={{ fontSize: 19, lineHeight: 1.35, marginBottom: 18 }}>{currentCatalog ? currentCatalog.tagline : 'Try every feature before you choose a plan.'}</div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10, fontSize: 16 }}>
                  {[limitText(plan.limits.quizzes, 'quizzes'), limitText(plan.limits.leads, 'monthly leads'), limitText(plan.limits.emails, 'monthly emails')].map(function(x) {
                    return <li key={x} style={{ display: 'flex', gap: 12 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{x}</li>;
                  })}
                </ul>
              </div>
            </section>

            <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '24px 28px 10px' }}>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', color: C.INK }}>Current usage</h2>
              <UsageRow icon="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 8h6M9 12h6M9 16h3" label="Quizzes" used={quizzesUsed || 0} limit={plan.limits.quizzes} />
              <UsageRow icon="M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M17 11a3 3 0 100-6M22 21c0-3-1.8-5-4.5-5.7" label="Leads (monthly)" used={plan.leads_this_month || 0} limit={plan.limits.leads} />
              <UsageRow icon="M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zM22 7l-10 7L2 7" label="Emails (monthly)" used={plan.emails_this_month || 0} limit={plan.limits.emails} />
            </section>
          </div>

          <div className="bl-duo">
            <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, border: '1px solid ' + C.BORDER, background: '#F5F7FF', padding: '30px 36px', minHeight: 200 }}>
              <svg aria-hidden="true" width="170" height="170" viewBox="0 0 170 170" style={{ position: 'absolute', right: 150, bottom: 0 }}>
                <path d="M170 0 A 170 170 0 0 0 0 170 L 170 170 Z" fill={C.PERIWINKLE} />
                <path d="M170 80 A 90 90 0 0 0 80 170 L 170 170 Z" fill={C.INK} />
              </svg>
              <div style={{ position: 'absolute', right: 36, top: 60, fontSize: 13, letterSpacing: '0.16em', lineHeight: 2.2, color: C.GRAY_600 }}>
                {['CORE', 'PRO', 'BUSINESS'].map(function(n) { return <div key={n} style={{ color: displayPlanName.toUpperCase() === n ? C.INK : C.GRAY_600, fontWeight: displayPlanName.toUpperCase() === n ? 700 : 400 }}>{n}</div>; })}
              </div>
              <div style={{ position: 'relative', maxWidth: 360 }}>
                <h3 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 36, fontWeight: 500, letterSpacing: '-0.035em', color: C.INK }}>Compare plans</h3>
                <p style={{ margin: '8px 0 20px', fontSize: 17, color: C.GRAY_600, lineHeight: 1.45 }}>See what’s included in each plan and find the right fit for your needs.</p>
                <button type="button" onClick={function() { changeTab('plans'); }} className="bl-btn" style={{ background: C.ACCENT, color: '#fff', borderColor: C.ACCENT }}>View plans</button>
              </div>
            </section>
            <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, border: '1px solid ' + C.BORDER, background: C.ACID_SOFT, padding: '30px 36px', minHeight: 200 }}>
              <svg aria-hidden="true" width="140" height="160" viewBox="0 0 140 160" style={{ position: 'absolute', right: 0, bottom: 0 }}><path d="M140 20 A 140 140 0 0 0 0 160 L 140 160 Z" fill={C.ACID} opacity="0.8" /></svg>
              <div style={{ position: 'relative', maxWidth: 440 }}>
                <h3 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 36, fontWeight: 500, letterSpacing: '-0.035em', color: C.INK }}>Add capacity</h3>
                <p style={{ margin: '8px 0 20px', fontSize: 17, color: C.GRAY_600, lineHeight: 1.45 }}>
                  {isBusiness ? 'Explore capacity options for Core and Pro. Your Business plan already includes unlimited leads and emails.' : 'Add extra leads or emails to your plan without upgrading.'}
                </p>
                <button type="button" onClick={function() { changeTab('addons'); }} className="bl-btn">Explore add-ons</button>
              </div>
            </section>
          </div>
          {portalStrip}
        </>
      )}

      {tab === 'plans' && (
        <>
          <PlanCards />
          <Matrix />
          {portalStrip}
        </>
      )}

      {tab === 'addons' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', marginBottom: 20, borderRadius: 8, background: C.PERIWINKLE_SOFT, color: C.INK, fontSize: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            <span>Current plan <b>{displayPlanName}</b>{isBusiness ? ' includes unlimited leads and emails, so you don’t need a pack.' : ' · ' + limitText(plan.limits.leads, 'leads') + ' and ' + limitText(plan.limits.emails, 'emails') + ' per month.'}</span>
          </div>
          <div className="bl-duo">
            <PackCard title="Lead packs" packs={LEAD_PACKS} addon={plan.lead_addon} type="lead" />
            <PackCard title="Email packs" packs={EMAIL_PACKS} addon={plan.email_addon} type="email" />
          </div>
          <section style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', marginTop: 20, padding: '20px 26px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
            {PLAN_CATALOG.map(function(p) {
              return (
                <div key={p.id} style={{ flex: '1 1 180px' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>{p.name}{planKey === p.id && <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 999, background: C.PERIWINKLE_SOFT, color: C.BRAND_700 }}>Current</span>}</div>
                  <div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 2 }}>{p.limits.leads} leads · {p.limits.emails} emails</div>
                </div>
              );
            })}
            <button type="button" onClick={function() { changeTab('plans'); }} className="bl-btn">Compare plans</button>
          </section>
        </>
      )}

      {tab === 'invoices' && (
        <>
          <InvoicesSection token={token} />
          {portalStrip}
        </>
      )}

      {/* ── Plan Switch Confirmation Modal ── */}
      {switchModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="bl-switch-title" onClick={function() { if (!switchLoading) setSwitchModal(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11, 18, 51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={function(e) { e.stopPropagation(); }} style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '28px 26px', maxWidth: 460, width: '100%', boxShadow: C.SHADOW_LG }}>
            <h3 id="bl-switch-title" style={{ margin: '0 0 6px', fontFamily: C.DISPLAY_FONT, fontSize: 26, fontWeight: 500, color: C.INK }}>Switch to {switchModal.targetName}</h3>
            <p style={{ margin: '0 0 20px', fontSize: 15, color: C.GRAY_600, lineHeight: 1.5 }}>Your plan will change immediately. Stripe will automatically adjust your billing.</p>
            <div style={{ background: C.GRAY_50, borderRadius: 6, padding: '16px 18px', marginBottom: 20, fontSize: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: C.GRAY_600 }}>Proration adjustment</span><b style={{ color: switchModal.prorationAmount >= 0 ? C.INK : C.ACCENT }}>{switchModal.prorationFormatted}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.GRAY_600 }}>Next invoice total</span><b style={{ color: C.INK }}>{switchModal.nextInvoiceFormatted}</b></div>
            </div>
            {switchModal.prorationAmount < 0 && (
              <div style={{ background: C.PERIWINKLE_SOFT, borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 14, color: C.BRAND_700 }}>You&apos;ll receive a credit of {switchModal.prorationFormatted} for the unused time on your current plan.</div>
            )}
            {switchError && <div role="alert" style={{ background: C.DANGER_LIGHT, borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: C.DANGER }}>{switchError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={function() { setSwitchModal(null); }}>Cancel</GhostButton>
              <PrimaryButton onClick={confirmSwitch}>{switchLoading ? 'Switching...' : 'Confirm switch'}</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {switchError && !switchModal && (
        <div role="alert" onClick={function() { setSwitchError(null); }} style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, background: C.DANGER_LIGHT, color: C.DANGER, padding: '12px 16px', borderRadius: 6, fontSize: 14, cursor: 'pointer', boxShadow: C.SHADOW_MD }}>{switchError}</div>
      )}
    </DashboardShell>
  );
}
