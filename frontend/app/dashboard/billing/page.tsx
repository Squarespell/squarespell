'use client';

/**
 * /dashboard/billing - Plan, usage, and billing portal entrypoint.
 *
 * Shows the current plan from /api/user/plan, usage bars for quizzes + leads,
 * trial countdown if applicable, invoices, and a Stripe customer-portal button for paid
 * plans. Upgrade CTAs route to /pricing, preserving the existing checkout flow.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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

const PLAN_CATALOG: Array<{
  id: UserPlan['plan'];
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tagline: string;
  features: string[];
}> = [
  {
    id: 'core',
    name: 'Core',
    monthlyPrice: 12,
    yearlyPrice: 108,
    tagline: 'Remove branding and grow your list',
    features: ['5 quizzes', '1,000 leads / month', '1,000 emails / month', 'AI quiz generation', 'Remove branding', 'Branching logic & scoring', 'Quiz scheduling', 'Standard analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 19,
    yearlyPrice: 192,
    tagline: 'Full power for serious lead generation',
    features: ['Unlimited quizzes', '3,000 leads / month', '3,000 emails / month', 'A/B testing', 'All integrations & webhooks', 'Email sequences', 'Advanced analytics'],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 35,
    yearlyPrice: 348,
    tagline: 'For agencies and power users',
    features: ['Everything in Pro', 'Unlimited leads', 'Unlimited emails', 'White-label branding', 'Custom domain', 'Team seats (3 included)', 'Priority support'],
  },
];

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  var safeUsed = used ?? 0;
  var isUnlimited = limit == null || !isFinite(limit);
  var pct = !isUnlimited && limit > 0 ? Math.min(100, (safeUsed / limit) * 100) : 0;
  var over = !isUnlimited && limit > 0 && safeUsed > limit * 0.85;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 13, color: C.TEXT, fontVariantNumeric: 'tabular-nums' }}>
          <strong>{safeUsed.toLocaleString()}</strong>
          <span style={{ color: C.TEXT_MUTED }}>
            {' / '}
            {isUnlimited ? '∞' : limit.toLocaleString()}
          </span>
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: C.SURFACE,
          border: '1px solid ' + C.BORDER,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: pct + '%',
            height: '100%',
            background: over ? '#ff9f43' : C.ACCENT,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

function CurrentPlanBadge({ plan }: { plan: UserPlan }) {
  var billingCycleText = plan.plan === 'trial' ? 'No billing yet' : 'Monthly billing';
  if (plan.plan === 'trial' && plan.trial_ends_at) {
    var daysLeft = Math.max(0, Math.ceil((new Date(plan.trial_ends_at).getTime() - Date.now()) / 86400000));
    billingCycleText = daysLeft + ' days left in trial';
  }

  return (
    <div style={{
      background: C.ELEVATED,
      border: '1px solid ' + C.BORDER,
      borderRadius: 12,
      padding: 18,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Current plan
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.ACCENT, textTransform: 'capitalize' }}>
              {plan.plan}
            </span>
            <Pill variant={plan.plan === 'trial' ? 'accent' : 'live'}>
              {plan.plan === 'trial' ? '14-day Pro trial' : 'Active'}
            </Pill>
          </div>
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginTop: 8 }}>
            {billingCycleText}
          </div>
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 2c6.627 0 12 4.925 12 11s-5.373 11-12 11S0 18.075 0 13 5.373 2 12 2z"/>
          <path d="M8 13h8M11 10l3 3-3 3"/>
        </svg>
      </div>
    </div>
  );
}

function InvoicesSection({ token }: { token: string | null }) {
  var [invoices, setInvoices] = useState<Invoice[]>([]);
  var [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(function() {
    if (!token) return;
    fetch(API + '/api/stripe/invoices', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(r) {
        if (!r.ok) throw new Error('Failed to load invoices');
        return r.json();
      })
      .then(function(data) {
        setInvoices(data.invoices || []);
        setInvoicesLoading(false);
      })
      .catch(function(e) {
        console.error(e);
        setInvoicesLoading(false);
      });
  }, [token]);

  if (invoicesLoading) {
    return null;
  }

  if (invoices.length === 0) {
    return null;
  }

  return (
    <Card>
      <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
        Invoice history
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid ' + C.BORDER }}>
              <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 700, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(function(invoice) {
              return (
                <tr key={invoice.id} style={{ borderBottom: '1px solid ' + C.BORDER, transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 0', color: C.TEXT }}>
                    {new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px 12px', color: C.TEXT }}>
                    {invoice.url ? (
                      <a href={invoice.url} target="_blank" rel="noopener noreferrer" style={{ color: C.ACCENT, textDecoration: 'none', fontWeight: 600 }}>
                        {invoice.number}
                      </a>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{invoice.number}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 12px', color: C.TEXT, fontVariantNumeric: 'tabular-nums' }}>
                    ${(invoice.amount / 100).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      background: invoice.status === 'paid' ? '#ecfdf5' : '#fffbeb',
                      color: invoice.status === 'paid' ? '#065f46' : '#92400e',
                    }}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function BillingPage() {
  var router = useRouter();
  var { token, status: authStatus } = useDashboardAuth();
  var [plan, setPlan] = useState<UserPlan | null>(null);
  var [loading, setLoading] = useState(true);
  var [yearly, setYearly] = useState(true);
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
    // Stripe portal is a redirect endpoint - we open with the auth header via a GET
    // through fetch won't follow cross-origin redirects; the backend route redirects
    // the browser, so we navigate directly with the token in a URL is unsafe.
    // Instead the backend /api/stripe/portal requires auth; we do a same-tab fetch
    // to read the portal URL. But that route does res.redirect - so fetch follows
    // it and returns the final HTML. Safer: POST a helper or read location from
    // response. For now, open in a new tab via a fetch that returns the redirect
    // target URL. (Matches the existing dashboard behavior.)
    fetch(`${API}/api/stripe/portal`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual',
    })
      .then((r) => {
        const loc = r.headers.get('Location');
        if (loc) window.location.href = loc;
        else window.location.href = `${API}/api/stripe/portal`;
      })
      .catch(() => {
        window.location.href = `${API}/api/stripe/portal`;
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

  var displayPlanName = plan.plan;

  return (
    <DashboardShell title="Billing & plan">
      <PageHeader title="Billing & plan" subtitle="Manage your Squarespell subscription" />

      <div style={{ display: 'grid', gap: 20 }}>
        <CurrentPlanBadge plan={plan} />

        <Card>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
              Current usage
            </h3>
          </div>
          <div style={{ display: 'grid', gap: 18 }}>
            <UsageBar label="Quizzes" used={plan.quiz_count} limit={plan.limits.quizzes} />
            <UsageBar label="Leads (monthly)" used={plan.leads_this_month || 0} limit={plan.limits.leads} />
            <UsageBar label="Emails (monthly)" used={plan.emails_this_month || 0} limit={plan.limits.emails} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            {isPaid ? (
              <>
                <PrimaryButton onClick={function() { router.push('/pricing'); }}>Change plan</PrimaryButton>
                <GhostButton onClick={openPortal}>Manage billing</GhostButton>
              </>
            ) : (
              <PrimaryButton onClick={function() { router.push('/pricing'); }}>Upgrade now</PrimaryButton>
            )}
          </div>
        </Card>

        <InvoicesSection token={token} />

        {/* ── Add-on Packs ── */}
        {isPaid && (
          <Card>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
              Need more leads or emails?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
              Add extra capacity to your current plan without upgrading. Add-ons are billed monthly and can be cancelled anytime.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {/* Lead add-ons */}
              <div style={{ padding: 16, background: C.SURFACE, borderRadius: 10, border: '1px solid ' + C.BORDER }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Lead Packs</div>
                {plan.lead_addon ? (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>
                      +{plan.lead_addon.extra.toLocaleString()} leads/mo
                    </div>
                    <div style={{ fontSize: 12, color: C.ACCENT, fontWeight: 700, marginBottom: 8 }}>
                      ${plan.lead_addon.price}/mo active
                    </div>
                    {plan.lead_addon.cancel_at_period_end ? (
                      <div style={{ fontSize: 11, color: '#92400E', background: '#FFFBEB', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>Cancels at period end</div>
                    ) : (
                      <button onClick={function() { handleCancelAddon('lead'); }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        Cancel add-on
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { key: 'lead_500', label: '+500', price: 3 },
                      { key: 'lead_1500', label: '+1,500', price: 7 },
                      { key: 'lead_3000', label: '+3,000', price: 12 },
                    ].map(function(a) {
                      return (
                        <button key={a.key} onClick={function() { handleAddonCheckout(a.key); }}
                          disabled={addonLoading === a.key}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', borderRadius: 8, border: '1px solid ' + C.BORDER,
                            background: C.ELEVATED, cursor: 'pointer', fontSize: 12, fontFamily: '"DM Sans",system-ui,sans-serif',
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }}
                          onMouseLeave={function(e) { e.currentTarget.style.borderColor = C.BORDER; }}>
                          <span style={{ fontWeight: 600, color: C.TEXT }}>{a.label} leads/mo</span>
                          <span style={{ fontWeight: 700, color: C.ACCENT }}>{addonLoading === a.key ? '...' : '$' + a.price + '/mo'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Email add-ons */}
              <div style={{ padding: 16, background: C.SURFACE, borderRadius: 10, border: '1px solid ' + C.BORDER }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Email Packs</div>
                {plan.email_addon ? (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, marginBottom: 4 }}>
                      +{plan.email_addon.extra.toLocaleString()} emails/mo
                    </div>
                    <div style={{ fontSize: 12, color: C.ACCENT, fontWeight: 700, marginBottom: 8 }}>
                      ${plan.email_addon.price}/mo active
                    </div>
                    {plan.email_addon.cancel_at_period_end ? (
                      <div style={{ fontSize: 11, color: '#92400E', background: '#FFFBEB', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>Cancels at period end</div>
                    ) : (
                      <button onClick={function() { handleCancelAddon('email'); }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        Cancel add-on
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { key: 'email_1000', label: '+1,000', price: 3 },
                      { key: 'email_5000', label: '+5,000', price: 7 },
                      { key: 'email_10000', label: '+10,000', price: 12 },
                    ].map(function(a) {
                      return (
                        <button key={a.key} onClick={function() { handleAddonCheckout(a.key); }}
                          disabled={addonLoading === a.key}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', borderRadius: 8, border: '1px solid ' + C.BORDER,
                            background: C.ELEVATED, cursor: 'pointer', fontSize: 12, fontFamily: '"DM Sans",system-ui,sans-serif',
                            transition: 'border-color 0.15s',
                          }}
                          onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }}
                          onMouseLeave={function(e) { e.currentTarget.style.borderColor = C.BORDER; }}>
                          <span style={{ fontWeight: 600, color: C.TEXT }}>{a.label} emails/mo</span>
                          <span style={{ fontWeight: 700, color: C.ACCENT }}>{addonLoading === a.key ? '...' : '$' + a.price + '/mo'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: C.TEXT_MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              All plans
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: yearly ? 500 : 700, color: yearly ? C.TEXT_MUTED : C.TEXT }}>Monthly</span>
              <button
                onClick={function() { setYearly(!yearly); }}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: yearly ? C.ACCENT : C.SURFACE,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: '#FFFFFF',
                    position: 'absolute',
                    top: 3,
                    left: yearly ? 23 : 3,
                    transition: 'left 0.2s ease',
                  }}
                />
              </button>
              <span style={{ fontSize: 13, fontWeight: yearly ? 700 : 500, color: yearly ? C.TEXT : C.TEXT_MUTED }}>
                Annual
              </span>
              {yearly && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', background: C.ACCENT, padding: '2px 8px', borderRadius: 6 }}>
                  Save up to 25%
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            {PLAN_CATALOG.map(function(p) {
              var current = plan.plan === p.id;
              var displayPrice = yearly
                ? '$' + Math.round(p.yearlyPrice / 12) + '/mo'
                : '$' + p.monthlyPrice + '/mo';
              var billedNote = yearly
                ? 'Billed $' + p.yearlyPrice + '/year'
                : null;
              var isCurrentPlan = plan.plan === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    background: C.ELEVATED,
                    border: isCurrentPlan ? '1px solid ' + C.ACCENT : '1px solid ' + C.BORDER,
                    borderRadius: 14,
                    padding: 22,
                    position: 'relative',
                  }}
                >
                  {isCurrentPlan && (
                    <div style={{ position: 'absolute', top: 14, right: 14 }}>
                      <Pill variant="accent">Current</Pill>
                    </div>
                  )}
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, marginBottom: 2 }}>
                    {p.name}
                  </div>
                  {p.monthlyPrice === 0 ? (
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.ACCENT, marginBottom: 2 }}>
                      Free
                    </div>
                  ) : (
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.ACCENT, marginBottom: 2 }}>
                      {displayPrice}
                    </div>
                  )}
                  {billedNote && (
                    <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginBottom: 6 }}>
                      {billedNote}
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: C.TEXT_MUTED, marginBottom: 14, lineHeight: 1.5 }}>
                    {p.tagline}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', marginBottom: 16 }}>
                    {p.features.map(function(f) {
                      return (
                        <li
                          key={f}
                          style={{
                            fontSize: 13,
                            color: C.TEXT,
                            padding: '6px 0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                          {f}
                        </li>
                      );
                    })}
                  </ul>
                  {!isCurrentPlan && (
                    <GhostButton onClick={function() { handlePlanAction(p.id); }}>
                      {checkoutLoading === p.id ? 'Loading...' : (
                        isPaid ? (
                          PLAN_CATALOG.findIndex(function(c) { return c.id === plan.plan; }) <
                          PLAN_CATALOG.findIndex(function(c) { return c.id === p.id; })
                            ? 'Upgrade to ' + p.name
                            : 'Switch to ' + p.name
                        ) : 'Choose ' + p.name
                      )}
                    </GhostButton>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
            Need to manage your billing?
          </h3>
          <p style={{ margin: '0 0 14px 0', fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
            Access the Stripe customer portal to update payment methods, download invoices, and manage your subscription.
          </p>
          {isPaid ? (
            <GhostButton onClick={openPortal}>Open billing portal</GhostButton>
          ) : (
            <div style={{ fontSize: 12.5, color: C.TEXT_MUTED }}>
              Upgrade to a paid plan to access the billing portal.
            </div>
          )}
        </Card>
      </div>

      {/* ── Plan Switch Confirmation Modal ── */}
      {switchModal && (
        <div
          onClick={function() { if (!switchLoading) setSwitchModal(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={function(e) { e.stopPropagation(); }}
            style={{
              background: C.ELEVATED,
              border: '1px solid ' + C.BORDER,
              borderRadius: 16,
              padding: '28px 24px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: C.TEXT }}>
              Switch to {switchModal.targetName}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
              Your plan will change immediately. Stripe will automatically adjust your billing.
            </p>

            <div style={{
              background: C.SURFACE,
              border: '1px solid ' + C.BORDER,
              borderRadius: 10,
              padding: '16px 18px',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: C.TEXT_MUTED }}>Proration adjustment</span>
                <span style={{
                  fontSize: 14, fontWeight: 700,
                  color: switchModal.prorationAmount >= 0 ? C.TEXT : '#0D7377',
                }}>
                  {switchModal.prorationFormatted}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: C.TEXT_MUTED }}>Next invoice total</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>
                  {switchModal.nextInvoiceFormatted}
                </span>
              </div>
            </div>

            {switchModal.prorationAmount < 0 && (
              <div style={{
                background: 'rgba(13,115,119,0.06)',
                border: '1px solid rgba(13,115,119,0.15)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13,
                color: '#0D7377',
                lineHeight: 1.5,
              }}>
                You&apos;ll receive a credit of {switchModal.prorationFormatted} for the unused time on your current plan.
              </div>
            )}

            {switchError && (
              <div style={{
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: '#900',
              }}>
                {switchError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={function() { setSwitchModal(null); }}>Cancel</GhostButton>
              <PrimaryButton onClick={confirmSwitch}>
                {switchLoading ? 'Switching...' : 'Confirm switch'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Switch Error Toast ── */}
      {switchError && !switchModal && (
        <div
          onClick={function() { setSwitchError(null); }}
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 60,
            background: '#fee', color: '#900',
            padding: '10px 14px', borderRadius: 8,
            fontSize: 13, cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
          }}
        >
          {switchError}
        </div>
      )}
    </DashboardShell>
  );
}
