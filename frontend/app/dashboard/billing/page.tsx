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

type UserPlan = {
  plan: 'free' | 'trial' | 'starter' | 'growth' | 'pro' | 'agency';
  quiz_count: number;
  limits: { quizzes: number; leads: number; emails: number };
  trial_ends_at: string | null;
  email: string;
  leads_this_month?: number;
  emails_this_month?: number;
  features?: { removeBranding: boolean; abTesting: boolean; zapier: boolean; analytics: string };
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
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    tagline: 'Get started with Squarespell',
    features: ['1 quiz', '100 leads / month', '50 emails / month', 'Basic analytics'],
  },
  {
    id: 'growth',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 276,
    tagline: 'For coaches and consultants scaling their leads',
    features: ['10 quizzes', '2,500 leads / month', '2,500 emails / month', 'Remove branding', 'Zapier integration'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 79,
    yearlyPrice: 756,
    tagline: 'For serious lead generation at scale',
    features: ['50 quizzes', '10,000 leads / month', '10,000 emails / month', 'A/B testing', 'Advanced analytics'],
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 199,
    yearlyPrice: 1908,
    tagline: 'White-label for client work',
    features: ['Unlimited quizzes', 'Unlimited leads', '25,000 emails / month', 'Multi-site management', 'Dedicated support'],
  },
];

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  var pct = limit > 0 && isFinite(limit) ? Math.min(100, (used / limit) * 100) : 0;
  var over = limit > 0 && isFinite(limit) && used > limit * 0.85;
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
          <strong>{used.toLocaleString()}</strong>
          <span style={{ color: C.TEXT_MUTED }}>
            {' / '}
            {isFinite(limit) ? limit.toLocaleString() : '∞'}
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
  var billingCycleText = plan.plan === 'free' || plan.plan === 'trial' ? 'No billing' : 'Monthly billing';
  if (plan.plan === 'trial' && plan.trial_ends_at) {
    var daysLeft = Math.max(0, Math.ceil((new Date(plan.trial_ends_at).getTime() - Date.now()) / 86400000));
    billingCycleText = daysLeft + ' days left';
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
              {plan.plan === 'growth' ? 'Starter' : plan.plan}
            </span>
            <Pill variant={plan.plan === 'trial' || plan.plan === 'free' ? 'accent' : 'live'}>
              {plan.plan === 'trial' || plan.plan === 'free' ? 'Trial' : 'Active'}
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
  var [yearly, setYearly] = useState(false);
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

  var isTrial = plan?.plan === 'trial' || plan?.plan === 'free';
  var isPaid = plan && !isTrial && plan.plan !== 'starter' && plan.plan !== 'growth';
  var [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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

  var displayPlanName = plan.plan === 'growth' ? 'Starter' : plan.plan;

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
            <UsageBar label="Emails (monthly)" used={plan.emails_this_month || 0} limit={plan.limits.emails || 50} />
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
                Yearly
              </span>
              {yearly && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', background: C.ACCENT, padding: '2px 8px', borderRadius: 6 }}>
                  Save 20%
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
              var isCurrentPlan = (p.id === 'free' && plan.plan === 'free') ||
                                 (p.id === 'growth' && plan.plan === 'growth') ||
                                 (p.id === 'pro' && plan.plan === 'pro') ||
                                 (p.id === 'agency' && plan.plan === 'agency');
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
                  {!isCurrentPlan && p.id !== 'free' && (
                    <GhostButton onClick={function() { handleCheckout(p.id); }}>
                      {checkoutLoading === p.id ? 'Loading...' : 'Choose ' + p.name}
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
    </DashboardShell>
  );
}
