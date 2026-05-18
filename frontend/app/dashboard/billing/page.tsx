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

import { PLAN_CATALOG } from '@/lib/planCatalog';

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


function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  var safeUsed = used ?? 0;
  var isUnlimited = limit == null || limit <= 0 || !isFinite(limit) || limit >= 999999;
  var pct = !isUnlimited && limit! > 0 ? Math.min(100, Math.round((safeUsed / limit!) * 100)) : 0;
  var barColor = pct >= 90 ? '#B42318' : pct >= 70 ? '#B54708' : C.ACCENT;
  var pctColor = pct >= 90 ? '#B42318' : pct >= 70 ? '#B54708' : C.TEXT_MUTED;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13, color: C.TEXT, fontVariantNumeric: 'tabular-nums' }}>
            <strong>{safeUsed.toLocaleString()}</strong>
            <span style={{ color: C.TEXT_MUTED }}>{' / '}{isUnlimited ? 'Unlimited' : limit!.toLocaleString()}</span>
          </span>
          {!isUnlimited && (
            <span style={{ fontSize: 11, fontWeight: 700, color: pctColor, minWidth: 34, textAlign: 'right' as const }}>{pct}%</span>
          )}
        </div>
      </div>
      {isUnlimited ? (
        <div style={{ height: 6, borderRadius: 3, background: C.ACCENT, opacity: 0.25 }} />
      ) : (
        <div style={{ height: 6, borderRadius: 3, background: C.SURFACE, border: '1px solid ' + C.BORDER, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
      )}
    </div>
  );
}

function CurrentPlanBadge({ plan, displayName }: { plan: UserPlan; displayName: string }) {
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
            <span style={{ fontSize: 28, fontWeight: 800, color: C.ACCENT }}>
              {displayName}
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
  var [realQuizCount, setRealQuizCount] = useState<number | null>(null);
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
    trial: 'Trial',
    core: 'Core',
    starter: 'Core', // Legacy name, map to Core
    pro: 'Pro',
    business: 'Business',
    agency: 'Business', // Legacy/internal name, map to Business
    free: 'Free',
  };
  var displayPlanName = PLAN_NAME_MAP[plan.plan] || plan.plan;

  return (
    <DashboardShell title="Billing & plan">
      <PageHeader title="Billing & plan" subtitle="Manage your Squarespell Quiz subscription" />

      <div style={{ display: 'grid', gap: 20 }}>
        <CurrentPlanBadge plan={plan} displayName={displayPlanName} />

        <Card>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
              Current usage
            </h3>
          </div>
          <div style={{ display: 'grid', gap: 18 }}>
            <UsageBar label="Quizzes" used={realQuizCount !== null ? realQuizCount : plan.quiz_count} limit={plan.limits.quizzes} />
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
                            background: C.ELEVATED, cursor: 'pointer', fontSize: 12, fontFamily: '"Poppins",system-ui,sans-serif',
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
                            background: C.ELEVATED, cursor: 'pointer', fontSize: 12, fontFamily: '"Poppins",system-ui,sans-serif',
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
              var isCurrentPlan = plan.plan === p.id;
              var moPrice = yearly ? Math.round(p.yearlyPrice / 12) : p.monthlyPrice;
              var billedNote = yearly ? 'Billed $' + p.yearlyPrice + '/year' : 'Billed monthly';
              return (
                <div
                  key={p.id}
                  style={{
                    background: p.featured ? 'linear-gradient(180deg, rgba(13,115,119,.03) 0%, rgba(13,115,119,.08) 100%)' : C.ELEVATED,
                    border: p.featured ? '2px solid rgba(13,115,119,.30)' : isCurrentPlan ? '2px solid ' + C.ACCENT : '1.5px solid ' + C.BORDER,
                    borderRadius: 18,
                    padding: '28px 22px 24px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column' as const,
                  }}
                >
                  {/* badges */}
                  {p.featured && (
                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: C.ACCENT, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 14px', borderRadius: 100, letterSpacing: '.07em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>Most Popular</div>
                  )}
                  {isCurrentPlan && (
                    <div style={{ position: 'absolute', top: 12, right: 14 }}>
                      <Pill variant="accent">Current</Pill>
                    </div>
                  )}

                  {/* name + tagline */}
                  <div style={{ fontSize: 18, fontWeight: 700, color: p.featured ? C.ACCENT : C.TEXT, marginBottom: 4 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.5, marginBottom: 16, minHeight: 40 }}>
                    {p.tagline}
                  </div>

                  {/* price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 2 }}>
                    {yearly && <span style={{ fontSize: 15, color: C.TEXT_MUTED, textDecoration: 'line-through', marginRight: 4 }}>${p.monthlyPrice}</span>}
                    <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.04em', color: C.TEXT, lineHeight: 1 }}>${moPrice}</span>
                    <span style={{ fontSize: 14, color: C.TEXT_MUTED }}>/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginBottom: 4 }}>{billedNote}</div>
                  {yearly && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 12 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Save ${p.yearlySave}/year
                    </div>
                  )}
                  {!yearly && <div style={{ height: 12 }} />}

                  {/* limits badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '12px 10px', background: 'rgba(0,0,0,.025)', borderRadius: 10, marginBottom: 18 }}>
                    {[
                      { val: p.limits.quizzes, label: 'Quizzes' },
                      { val: p.limits.leads, label: 'Leads/mo' },
                      { val: p.limits.emails, label: 'Emails/mo' },
                    ].map(function(lim) {
                      return (
                        <div key={lim.label} style={{ textAlign: 'center' as const }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: C.TEXT, letterSpacing: '-.02em' }}>{lim.val}</div>
                          <div style={{ fontSize: 9, color: C.TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.06em', marginTop: 1 }}>{lim.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA button */}
                  {!isCurrentPlan && (
                    <div style={{ marginBottom: 18 }}>
                      <button
                        onClick={function() { handlePlanAction(p.id); }}
                        disabled={checkoutLoading === p.id}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: p.featured ? 'none' : '1px solid ' + C.BORDER,
                          background: p.featured ? C.ACCENT : C.SURFACE,
                          color: p.featured ? '#fff' : C.TEXT,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: '"Poppins",system-ui,sans-serif',
                          transition: 'all .15s',
                          opacity: checkoutLoading === p.id ? 0.5 : 1,
                        }}
                      >
                        {checkoutLoading === p.id ? 'Loading...' : (
                          isPaid ? (
                            PLAN_CATALOG.findIndex(function(c) { return c.id === plan.plan; }) <
                            PLAN_CATALOG.findIndex(function(c) { return c.id === p.id; })
                              ? 'Upgrade to ' + p.name
                              : 'Switch to ' + p.name
                          ) : 'Start free trial'
                        )}
                      </button>
                    </div>
                  )}
                  {isCurrentPlan && <div style={{ height: 18 }} />}

                  {/* included */}
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.08em', color: C.ACCENT, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(13,115,119,.15)' }}>Included</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {p.included.map(function(f) {
                      return (
                        <li key={f} style={{ fontSize: 13, color: C.TEXT, display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.featured ? C.ACCENT : '#059669'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                          {f}
                        </li>
                      );
                    })}
                  </ul>

                  {/* excluded */}
                  {p.excluded.length > 0 && (
                    <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                      {p.excluded.map(function(f) {
                        return (
                          <li key={f} style={{ fontSize: 13, color: 'rgba(26,26,26,.30)', display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.4 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,.22)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            {f}
                          </li>
                        );
                      })}
                    </ul>
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
                  color: switchModal.prorationAmount >= 0 ? C.TEXT : '#0f7377',
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
                color: '#0f7377',
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
