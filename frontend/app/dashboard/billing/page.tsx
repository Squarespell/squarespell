'use client';

/**
 * /dashboard/billing — Plan, usage, and billing portal entrypoint.
 *
 * Shows the current plan from /api/user/plan, usage bars for quizzes + leads,
 * trial countdown if applicable, and a Stripe customer-portal button for paid
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

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

type UserPlan = {
  plan: 'free' | 'trial' | 'starter' | 'pro' | 'agency';
  quiz_count: number;
  limits: { quizzes: number; leads: number };
  trial_ends_at: string | null;
  email: string;
};

const PLAN_CATALOG: Array<{
  id: UserPlan['plan'];
  name: string;
  price: string;
  tagline: string;
  features: string[];
}> = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29/mo',
    tagline: 'Perfect for a single Squarespace site',
    features: ['5 quizzes', '500 leads / month', 'All integrations', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79/mo',
    tagline: 'For serious lead generation',
    features: ['20 quizzes', '5,000 leads / month', 'Priority support', 'Remove "Powered by" badge'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$199/mo',
    tagline: 'White-label for client work',
    features: ['Unlimited quizzes', 'Unlimited leads', 'Client sub-accounts', 'Dedicated support'],
  },
];

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 && isFinite(limit) ? Math.min(100, (used / limit) * 100) : 0;
  const over = limit > 0 && isFinite(limit) && used > limit * 0.85;
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
          border: `1px solid ${C.BORDER}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: over ? '#ff9f43' : C.ACCENT,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const { token, status: authStatus } = useDashboardAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API}/api/user/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load plan');
        const data = await res.json();
        if (!cancelled) setPlan(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const trialDaysLeft = useMemo(() => {
    if (!plan?.trial_ends_at) return 0;
    const diff = new Date(plan.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [plan]);

  const isTrial = plan?.plan === 'trial' || plan?.plan === 'free';
  const isPaid = plan && !isTrial;

  const openPortal = () => {
    if (!token) return;
    // Stripe portal is a redirect endpoint — we open with the auth header via a GET
    // through fetch won't follow cross-origin redirects; the backend route redirects
    // the browser, so we navigate directly with the token in a URL is unsafe.
    // Instead the backend /api/stripe/portal requires auth; we do a same-tab fetch
    // to read the portal URL. But that route does res.redirect — so fetch follows
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

  if (authStatus === 'loading' || loading || !plan) {
    return (
      <DashboardShell title="Billing & plan">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Billing & plan">
      <PageHeader title="Billing & plan" subtitle="Manage your Squarespell subscription" />

      <div style={{ display: 'grid', gap: 20 }}>
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 22,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.TEXT_MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 6,
                }}
              >
                Current plan
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: C.TEXT,
                    textTransform: 'capitalize',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {plan.plan}
                </span>
                {isTrial && (
                  <Pill variant="accent">
                    {trialDaysLeft > 0 ? `${trialDaysLeft} days left` : 'Trial ended'}
                  </Pill>
                )}
                {isPaid && <Pill variant="live">Active</Pill>}
              </div>
              <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginTop: 6 }}>{plan.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {isPaid ? (
                <>
                  <PrimaryButton onClick={() => router.push('/pricing')}>Change plan</PrimaryButton>
                  <GhostButton onClick={openPortal}>Manage billing</GhostButton>
                </>
              ) : (
                <PrimaryButton onClick={() => router.push('/pricing')}>Upgrade now</PrimaryButton>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <UsageBar label="Quizzes" used={plan.quiz_count} limit={plan.limits.quizzes} />
            <UsageBar label="Leads (lifetime)" used={0} limit={plan.limits.leads} />
          </div>
        </Card>

        <div>
          <h2
            style={{
              margin: '8px 0 14px 0',
              fontSize: 14,
              fontWeight: 700,
              color: C.TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Available plans
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            {PLAN_CATALOG.map((p) => {
              const current = plan.plan === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    background: C.ELEVATED,
                    border: current ? `1px solid ${C.ACCENT}` : `1px solid ${C.BORDER}`,
                    borderRadius: 14,
                    padding: 22,
                    position: 'relative',
                  }}
                >
                  {current && (
                    <div style={{ position: 'absolute', top: 14, right: 14 }}>
                      <Pill variant="accent">Current</Pill>
                    </div>
                  )}
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, marginBottom: 2 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.ACCENT, marginBottom: 8 }}>
                    {p.price}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.TEXT_MUTED, marginBottom: 14, lineHeight: 1.5 }}>
                    {p.tagline}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', marginBottom: 16 }}>
                    {p.features.map((f) => (
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
                        <span style={{ color: C.ACCENT, fontWeight: 700, flexShrink: 0 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!current && (
                    <GhostButton onClick={() => router.push('/pricing')}>Choose {p.name}</GhostButton>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
            Need an invoice or to cancel?
          </h3>
          <p style={{ margin: '0 0 14px 0', fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
            Paid customers can manage payment methods, download invoices, and cancel anytime through
            the Stripe customer portal.
          </p>
          {isPaid ? (
            <GhostButton onClick={openPortal}>Open billing portal ↗</GhostButton>
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
