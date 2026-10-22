'use client';

/**
 * /admin - Standalone owner analytics dashboard
 *
 * Lives at admin.squarespell.com, completely separate from the user-facing app.
 * Shows KPI cards, growth metrics, user breakdown, revenue summary.
 * Protected by sign-in + the ADMIN_EMAILS check on the backend (confirmed email required).
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/client';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

// Inline color tokens (standalone - no dashboard dependency)
var C = {
  FONT: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  BG: '#FAFBFF',
  SURFACE: '#FFFFFF',
  GRAY_50: '#FAFBFF',
  GRAY_100: '#F5F7FF',
  GRAY_300: '#CDD6FF',
  BORDER: '#E2E7FF',
  TEXT: '#0B1233',
  TEXT_SECONDARY: '#3B4466',
  TEXT_SUBTLE: '#646D8F',
  ACCENT: '#3154FF',
  BRAND_500: '#3154FF',
  PURPLE_500: '#7F56D9',
  SUCCESS_500: '#12B76A',
  WARNING_500: '#F79009',
  ERROR_500: '#F04438',
  ERROR_700: '#B42318',
  DANGER_LIGHT: '#FEF3F2',
  SHADOW_SM: '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
};

type AdminMetrics = {
  timestamp: string;
  users: {
    total: number;
    newThisMonth: number;
    activeLastMonth: number;
    byPlan: Record<string, number>;
  };
  quizzes: {
    total: number;
    published: number;
    draft: number;
  };
  leads: {
    total: number;
    thisMonth: number;
    avgPerUser: number;
  };
  revenue: {
    /** From Stripe's active subscriptions; null when Stripe could not be read. */
    mrr: number | null;
    mrrSource?: 'stripe' | 'unavailable';
    activeSubscriptions?: number;
    totalRevenue: number;
    thisMonth: number;
    quizPaymentsCount: number;
  };
  metrics: {
    estimatedChurnRate: number;
    activationRate: number;
    leadsPerQuiz: number;
  };
};

type CustomerStatus = 'paying' | 'payment_failed' | 'card_trial' | 'canceled' | 'free_grant' | 'plan_not_paid' | 'trial' | 'trial_ended' | 'unverified';

type Subscription = {
  id: string;
  status: string;
  plan: string | null;
  interval: string;
  amount_cents: number;
  monthly_cents: number;
  discount_percent: number | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
};

type Customer = {
  id: string;
  email: string;
  name: string | null;
  signed_up_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  sign_in_with: 'Google' | 'Email';
  is_admin: boolean;
  plan: string;
  status: CustomerStatus;
  trial_ends_at: string | null;
  free_grant: boolean;
  stripe_customer_id: string | null;
  monthly_cents: number;
  subscriptions: Subscription[];
  quizzes: { total: number; published: number };
  views: number;
  leads: { total: number; last_30_days: number; held: number };
  possible_duplicates?: { email: string; reason: 'same browser' | 'same network' }[];
};

type CustomersReport = {
  generated_at: string;
  stripe: { checked: boolean; error: string | null };
  summary: {
    total: number;
    by_status: Record<CustomerStatus, number>;
    mrr_cents: number | null;
    currency: string;
    unlinked_active_subscriptions: number;
  };
  customers: Customer[];
};

// Order of the filter chips, with the label and colour each status uses.
var STATUS_INFO: { key: CustomerStatus; label: string; color: string; bg: string }[] = [
  { key: 'paying', label: 'Paying', color: '#027A48', bg: '#ECFDF3' },
  { key: 'card_trial', label: 'Trial, card saved', color: '#1D3BD1', bg: '#EEF1FF' },
  { key: 'trial', label: 'Free trial', color: '#1D3BD1', bg: '#F5F7FF' },
  { key: 'trial_ended', label: 'Trial ended', color: '#3B4466', bg: '#F2F4F7' },
  { key: 'free_grant', label: 'Free grant', color: '#6941C6', bg: '#F4F3FF' },
  { key: 'plan_not_paid', label: 'Plan not paid', color: '#B54708', bg: '#FFFAEB' },
  { key: 'payment_failed', label: 'Payment failed', color: '#B42318', bg: '#FEF3F2' },
  { key: 'canceled', label: 'Cancelled', color: '#3B4466', bg: '#F2F4F7' },
  { key: 'unverified', label: 'Not checked', color: '#3B4466', bg: '#F2F4F7' },
];

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** One line under the status badge explaining it, e.g. "$35.00 a month, renews Nov 3, 2026". */
function statusDetail(c: Customer): string {
  var sub = c.subscriptions.find(function(s) { return s.status === 'active' || s.status === 'trialing' || s.status === 'past_due'; }) || c.subscriptions[0];
  switch (c.status) {
    case 'paying': {
      if (!sub) return formatCurrency(c.monthly_cents / 100) + ' a month';
      var price = formatCurrency(sub.amount_cents / 100) + (sub.interval === 'year' ? ' a year' : ' a month');
      if (sub.discount_percent) price += ' (' + sub.discount_percent + '% off)';
      return price + (sub.cancel_at_period_end ? ', ends ' : ', renews ') + formatDate(sub.current_period_end);
    }
    case 'card_trial': return 'First charge ' + formatDate(sub ? sub.trial_end : null);
    case 'trial': return 'Trial ends ' + formatDate(c.trial_ends_at);
    case 'trial_ended': return c.trial_ends_at ? 'Ended ' + formatDate(c.trial_ends_at) : 'No plan';
    case 'free_grant': return 'Business access, never paid';
    case 'plan_not_paid': return capitalize(c.plan) + ' plan, no Stripe payment found';
    case 'payment_failed': return 'Stripe: ' + (sub ? sub.status.replace('_', ' ') : 'payment failed');
    case 'canceled': return 'Subscription ' + (sub ? sub.status.replace('_', ' ') : 'cancelled');
    default: return 'Stripe could not be read';
  }
}

/** Spreadsheet-safe CSV cell (quotes, and no leading = + - @ that a spreadsheet would run as a formula). */
function csvCell(v: any): string {
  var s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function downloadCustomersCsv(rows: Customer[]) {
  var header = ['Name', 'Email', 'Status', 'Plan', 'Monthly revenue (USD)', 'Signed up', 'Last sign-in', 'Quizzes', 'Published', 'Views', 'Leads', 'Leads last 30 days', 'Held leads', 'Sign-in method', 'Email confirmed', 'Stripe customer', 'Possible duplicate of'];
  var lines = [header.map(csvCell).join(',')];
  rows.forEach(function(c) {
    var label = (STATUS_INFO.find(function(s) { return s.key === c.status; }) || { label: c.status }).label;
    lines.push([c.name, c.email, label, c.plan, (c.monthly_cents / 100).toFixed(2), formatDate(c.signed_up_at), formatDate(c.last_sign_in_at), c.quizzes.total, c.quizzes.published, c.views, c.leads.total, c.leads.last_30_days, c.leads.held, c.sign_in_with, c.email_confirmed ? 'Yes' : 'No', c.stripe_customer_id, (c.possible_duplicates || []).map(function(d) { return d.email + ' (' + d.reason + ')'; }).join('; ')].map(csvCell).join(','));
  });
  var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'squarespell-customers-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

var TH: React.CSSProperties = { padding: '10px 12px', fontSize: 11, fontWeight: 600, color: C.TEXT_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid ' + C.BORDER, background: C.GRAY_50 };
var TD: React.CSSProperties = { padding: '12px', fontSize: 13, color: C.TEXT, verticalAlign: 'top', borderBottom: '1px solid ' + C.BORDER };
var SUB: React.CSSProperties = { fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 2 };

function CustomersSection({ report, error, onRetry }: { report: CustomersReport | null; error: string; onRetry: () => void }) {
  var [query, setQuery] = useState('');
  var [filter, setFilter] = useState<'all' | CustomerStatus>('all');

  if (error) {
    return (
      <div style={{ fontSize: 13, color: C.ERROR_700 }}>
        {error}{' '}
        <button onClick={onRetry} style={{ marginLeft: 8, padding: '6px 14px', border: '1px solid ' + C.BORDER, borderRadius: 8, background: C.SURFACE, color: C.TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT }}>Try again</button>
      </div>
    );
  }
  if (!report) return <div style={{ fontSize: 13, color: C.TEXT_SUBTLE }}>Loading customers and checking Stripe...</div>;

  var q = query.trim().toLowerCase();
  var rows = report.customers.filter(function(c) {
    if (filter !== 'all' && c.status !== filter) return false;
    return !q || c.email.toLowerCase().indexOf(q) >= 0 || (c.name || '').toLowerCase().indexOf(q) >= 0;
  });

  function chip(key: 'all' | CustomerStatus, label: string, count: number) {
    var on = filter === key;
    return (
      <button
        key={key}
        onClick={function() { setFilter(key); }}
        aria-pressed={on}
        style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (on ? C.ACCENT : C.BORDER), background: on ? C.ACCENT : C.SURFACE, color: on ? '#FFFFFF' : C.TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT, minHeight: 34 }}
      >
        {label} <span style={{ opacity: 0.75, fontWeight: 500 }}>{count}</span>
      </button>
    );
  }

  return (
    <div>
      {!report.stripe.checked && (
        <div role="status" style={{ padding: '10px 14px', marginBottom: 16, background: '#FFFAEB', border: '1px solid #FEC84B', borderRadius: 8, fontSize: 13, color: '#B54708' }}>
          Stripe could not be read just now, so billing shows as "Not checked" and revenue is not counted. Refresh to try again.
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {chip('all', 'All', report.summary.total)}
        {STATUS_INFO.filter(function(s) { return (report!.summary.by_status[s.key] || 0) > 0; }).map(function(s) {
          return chip(s.key, s.label, report!.summary.by_status[s.key]);
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ flex: '1 1 260px' }}>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search customers</span>
          <input
            type="search"
            value={query}
            onChange={function(e) { setQuery(e.target.value); }}
            placeholder="Search name or email"
            style={{ width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '8px 12px', border: '1px solid ' + C.GRAY_300, borderRadius: 8, fontSize: 14, fontFamily: C.FONT, color: C.TEXT }}
          />
        </label>
        <button
          onClick={function() { downloadCustomersCsv(rows); }}
          style={{ minHeight: 40, padding: '8px 16px', border: '1px solid ' + C.BORDER, borderRadius: 8, background: C.SURFACE, color: C.TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT }}
        >
          Download CSV ({rows.length})
        </button>
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
        <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Customer</th>
              <th style={TH}>Status</th>
              <th style={TH}>Plan</th>
              <th style={TH}>Quizzes</th>
              <th style={TH}>Leads</th>
              <th style={TH}>Views</th>
              <th style={TH}>Signed up</th>
              <th style={TH}>Last sign-in</th>
              <th style={TH}>Sign-in</th>
              <th style={TH}>Stripe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(function(c) {
              var info = STATUS_INFO.find(function(s) { return s.key === c.status; }) || STATUS_INFO[STATUS_INFO.length - 1];
              return (
                <tr key={c.id}>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>
                      {c.name || c.email.split('@')[0]}
                      {c.is_admin && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: C.GRAY_100, color: C.ACCENT, fontSize: 11, fontWeight: 700 }}>Admin</span>}
                    </div>
                    <div style={SUB}>{c.email}</div>
                    {(c.possible_duplicates || []).length > 0 && (
                      <div style={{ ...SUB, color: '#B54708' }}>
                        Possible duplicate of {(c.possible_duplicates || []).map(function(d) { return d.email + ' (' + d.reason + ')'; }).join(', ')}
                      </div>
                    )}
                  </td>
                  <td style={TD}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: info.bg, color: info.color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{info.label}</span>
                    <div style={SUB}>{statusDetail(c)}</div>
                  </td>
                  <td style={TD}>{capitalize(c.plan)}</td>
                  <td style={TD}>
                    {fmt(c.quizzes.total)}
                    <div style={SUB}>{fmt(c.quizzes.published)} published</div>
                  </td>
                  <td style={TD}>
                    {fmt(c.leads.total)}
                    <div style={SUB}>{fmt(c.leads.last_30_days)} in 30 days{c.leads.held > 0 ? ', ' + fmt(c.leads.held) + ' held' : ''}</div>
                  </td>
                  <td style={TD}>{fmt(c.views)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatDate(c.signed_up_at)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{c.last_sign_in_at ? formatDate(c.last_sign_in_at) : 'Never'}</td>
                  <td style={TD}>
                    {c.sign_in_with}
                    {!c.email_confirmed && <div style={{ ...SUB, color: '#B54708' }}>Email not confirmed</div>}
                  </td>
                  <td style={TD}>
                    {c.stripe_customer_id
                      ? <a href={'https://dashboard.stripe.com/customers/' + encodeURIComponent(c.stripe_customer_id)} target="_blank" rel="noopener noreferrer" style={{ color: C.ACCENT, fontWeight: 600, textDecoration: 'none' }}>Open in Stripe</a>
                      : <span style={{ color: C.TEXT_SUBTLE }}>None</span>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={10} style={{ ...TD, textAlign: 'center', color: C.TEXT_SUBTLE, padding: 24 }}>No customers match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {report.summary.unlinked_active_subscriptions > 0 && (
        <div style={{ ...SUB, marginTop: 10 }}>
          {report.summary.unlinked_active_subscriptions} active Stripe subscription(s) are not linked to any account here. They are still counted in monthly revenue.
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div
      style={{
        padding: '24px',
        background: C.SURFACE,
        border: '1px solid ' + C.BORDER,
        borderRadius: 12,
        boxShadow: C.SHADOW_SM,
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: C.TEXT, marginBottom: 4 }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: 12, color: C.TEXT_SUBTLE }}>{subtext}</div>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.SURFACE,
        border: '1px solid ' + C.BORDER,
        borderRadius: 12,
        boxShadow: C.SHADOW_SM,
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '20px 24px', borderBottom: '1px solid ' + C.BORDER }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: C.FONT
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid ' + C.GRAY_100,
            borderTopColor: C.ACCENT,
            borderRadius: '50%',
            animation: 'admin-spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}
        />
        <div style={{ fontSize: 14, color: C.TEXT_SUBTLE }}>Loading admin dashboard...</div>
        <style>{`@keyframes admin-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// Same AbortController + retry-with-backoff pattern shipped for the public
// quiz/embed pages (commit 8adacb9): a single transient blip (brief 5xx from
// the backend, dropped connection, slow cold-start) should not permanently
// surface "Failed to fetch" with no recovery path. Only retries on likely-
// transient conditions (network error / 5xx); 401/403 fail fast since
// retrying won't change an auth/permission outcome.
async function fetchMetricsOnce(token: string | null): Promise<Response> {
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
  try {
    return await fetch(API + '/api/admin/metrics', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function AdminDashboard() {
  var router = useRouter();
  var { isLoaded, isSignedIn, getToken } = useAuth();
  var [data, setData] = useState<AdminMetrics | null>(null);
  var [error, setError] = useState<string>('');
  var [isLoadingData, setIsLoadingData] = useState(true);
  var [retryToken, setRetryToken] = useState(0);
  var [customers, setCustomers] = useState<CustomersReport | null>(null);
  var [customersError, setCustomersError] = useState('');
  var [customersRetry, setCustomersRetry] = useState(0);

  // The customer list loads on its own (it also reads Stripe), so the figures above never wait for it.
  useEffect(function() {
    if (!isLoaded || !isSignedIn) return;
    var cancelled = false;
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 30000);
    setCustomers(null);
    setCustomersError('');
    (async function() {
      try {
        var token = await getToken();
        var response = await fetch(API + '/api/admin/customers', {
          method: 'GET',
          credentials: 'include',
          headers: { Authorization: 'Bearer ' + token },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(response.status === 403 ? 'Access denied - admin access required' : 'Could not load customers.');
        var body = await response.json();
        if (!cancelled) setCustomers(body);
      } catch (err: any) {
        if (!cancelled) setCustomersError(err?.name === 'AbortError' ? 'Loading customers took too long.' : (err?.message || 'Could not load customers.'));
      } finally {
        clearTimeout(timeoutId);
      }
    })();
    return function() { cancelled = true; controller.abort(); clearTimeout(timeoutId); };
  }, [isLoaded, isSignedIn, getToken, retryToken, customersRetry]);

  useEffect(function() {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    var cancelled = false;

    async function fetchMetrics() {
      setIsLoadingData(true);
      var token = await getToken();
      var maxAttempts = 3;

      for (var attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          var response = await fetchMetricsOnce(token);

          if (response.status === 403) {
            if (!cancelled) { setError('Access denied - admin access required'); setIsLoadingData(false); }
            return;
          }

          if (response.status === 401) {
            if (!cancelled) { setError('Not authenticated - please sign in'); setIsLoadingData(false); }
            return;
          }

          if (response.ok) {
            var metricsData = await response.json();
            if (!cancelled) { setData(metricsData); setError(''); setIsLoadingData(false); }
            return;
          }

          // Non-2xx, non-401/403: only worth retrying on likely-transient
          // server errors (5xx). Anything else, fail fast.
          if (response.status < 500 || attempt === maxAttempts) {
            if (!cancelled) { setError('Failed to fetch metrics'); setIsLoadingData(false); }
            return;
          }
        } catch (err: any) {
          if (attempt === maxAttempts) {
            if (!cancelled) { setError(err.message || 'Failed to load metrics'); setIsLoadingData(false); }
            return;
          }
        }
        await new Promise(function(resolve) { setTimeout(resolve, attempt === 1 ? 400 : 1000); });
      }
    }

    fetchMetrics();
    return function() { cancelled = true; };
  }, [isLoaded, isSignedIn, router, getToken, retryToken]);

  if (!isLoaded || isLoadingData) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: C.FONT,
          padding: 20
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: '32px',
            background: C.DANGER_LIGHT,
            border: '1px solid ' + C.ERROR_500,
            borderRadius: 12,
            color: C.ERROR_700,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Dashboard Error</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>{error}</div>
          <button
            onClick={function() { setRetryToken(function(n) { return n + 1; }); }}
            style={{
              padding: '8px 20px',
              background: C.ERROR_700,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: C.FONT
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <LoadingSpinner />;
  }

  var planData = [
    { name: 'Free', value: data.users.byPlan.free || 0, fill: C.GRAY_300 },
    { name: 'Core', value: (data.users.byPlan.core || 0) + (data.users.byPlan.starter || 0) + (data.users.byPlan.growth || 0), fill: C.BRAND_500 },
    { name: 'Pro', value: data.users.byPlan.pro || 0, fill: C.SUCCESS_500 },
    { name: 'Business', value: (data.users.byPlan.business || 0) + (data.users.byPlan.agency || 0), fill: '#FF6B6B' },
    { name: 'Trial', value: data.users.byPlan.trial || 0, fill: C.WARNING_500 }
  ].filter(function(p) { return p.value > 0; });

  return (
    <div style={{ minHeight: '100vh', background: C.BG, fontFamily: C.FONT }}>
      {/* Top bar */}
      <div
        style={{
          background: C.SURFACE,
          borderBottom: '1px solid ' + C.BORDER,
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: C.ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 800
            }}
          >
            S
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.TEXT }}>Squarespell Quiz Admin</span>
        </div>
        <div style={{ fontSize: 12, color: C.TEXT_SUBTLE }}>
          Last updated {new Date(data.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.TEXT, margin: '0 0 6px' }}>
            Business Overview
          </h1>
          <p style={{ fontSize: 14, color: C.TEXT_SUBTLE, margin: 0 }}>
            Real-time metrics for Squarespell Quiz
          </p>
        </div>

        {/* Primary KPIs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: 20,
            marginBottom: 24
          }}
        >
          <KPICard label="Total Users" value={fmt(data.users.total)} />
          <KPICard
            label="Monthly Recurring Revenue"
            value={data.revenue.mrr === null ? 'Unavailable' : formatCurrency(data.revenue.mrr)}
            subtext={data.revenue.mrr === null ? 'Stripe could not be read' : 'Confirmed by Stripe, ' + fmt(data.revenue.activeSubscriptions || 0) + ' paying'}
          />
          <KPICard label="Total Leads" value={fmt(data.leads.total)} />
          <KPICard label="Published Quizzes" value={fmt(data.quizzes.published)} />
        </div>

        {/* Customers */}
        <div style={{ marginBottom: 24 }}>
          <SectionCard title="Customers">
            <CustomersSection report={customers} error={customersError} onRetry={function() { setCustomersRetry(function(n) { return n + 1; }); }} />
          </SectionCard>
        </div>

        {/* Growth This Month */}
        <SectionCard title="Growth This Month">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>New Users</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.ACCENT }}>+{fmt(data.users.newThisMonth)}</div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                {data.users.total > 0 ? Math.round((data.users.newThisMonth / data.users.total) * 100) : 0}% of total
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>New Leads</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.SUCCESS_500 }}>+{fmt(data.leads.thisMonth)}</div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                {data.leads.total > 0 ? Math.round((data.leads.thisMonth / data.leads.total) * 100) : 0}% of total
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>Revenue</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.WARNING_500 }}>{formatCurrency(data.revenue.thisMonth)}</div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                from {data.revenue.quizPaymentsCount} quiz payments
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, margin: '24px 0' }}>
          <KPICard label="Estimated Churn Rate" value={data.metrics.estimatedChurnRate + '%'} subtext="Month-over-month" />
          <KPICard label="Activation Rate" value={data.metrics.activationRate + '%'} subtext="Accounts with a published quiz" />
          <KPICard label="Leads Per Quiz" value={data.metrics.leadsPerQuiz.toString()} subtext="Average engagement" />
          <KPICard label="Active Users (30d)" value={fmt(data.users.activeLastMonth)} subtext="Signed in during the last 30 days" />
        </div>

        {/* Two-column: Users by Plan + Revenue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <SectionCard title="Users by Plan">
            {planData.map(function(entry, idx) {
              var maxVal = Math.max.apply(null, planData.map(function(p) { return p.value; }));
              var pct = maxVal > 0 ? (entry.value / maxVal) * 100 : 0;
              return (
                <div key={idx} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>{entry.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.TEXT }}>{fmt(entry.value)}</span>
                  </div>
                  <div style={{ height: 8, background: C.GRAY_100, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: entry.fill, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
            {planData.length === 0 && (
              <div style={{ fontSize: 13, color: C.TEXT_SUBTLE, textAlign: 'center', padding: 20 }}>No users yet</div>
            )}
          </SectionCard>

          <SectionCard title="Revenue Summary">
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>
                Monthly Recurring Revenue
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.ACCENT }}>
                {data.revenue.mrr === null ? 'Unavailable' : formatCurrency(data.revenue.mrr)}
              </div>
              <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
                {data.revenue.mrr === null ? 'Stripe could not be read' : 'Active Stripe subscriptions only'}
              </div>
            </div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.TEXT_SECONDARY, marginBottom: 6 }}>
                Total Revenue (All Time)
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.TEXT }}>
                {formatCurrency(data.revenue.totalRevenue)}
              </div>
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: C.GRAY_50,
                borderRadius: 8,
                fontSize: 13,
                color: C.TEXT_SUBTLE
              }}
            >
              Quiz Payments: {data.revenue.quizPaymentsCount} transactions
            </div>
          </SectionCard>
        </div>

        {/* Detailed Statistics */}
        <SectionCard title="Detailed Statistics">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SUBTLE, textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: 14 }}>
                User Breakdown
              </div>
              {['free', 'trial', 'core', 'starter', 'growth', 'pro', 'business', 'agency'].map(function(plan) {
                return (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                    <span style={{ textTransform: 'capitalize' as any }}>{plan}</span>
                    <strong>{fmt(data!.users.byPlan[plan] || 0)}</strong>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SUBTLE, textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: 14 }}>
                Quiz Statistics
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Total Quizzes</span>
                <strong>{fmt(data.quizzes.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Published</span>
                <strong style={{ color: C.SUCCESS_500 }}>{fmt(data.quizzes.published)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Draft</span>
                <strong style={{ color: C.TEXT_SUBTLE }}>{fmt(data.quizzes.draft)}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_SUBTLE, textTransform: 'uppercase' as any, letterSpacing: '0.05em', marginBottom: 14 }}>
                Lead Statistics
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Total Leads</span>
                <strong>{fmt(data.leads.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>This Month</span>
                <strong style={{ color: C.ACCENT }}>{fmt(data.leads.thisMonth)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: C.TEXT }}>
                <span>Avg Per User</span>
                <strong>{data.leads.avgPerUser.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Footer */}
        <div style={{ marginTop: 32, padding: '14px 20px', background: C.GRAY_50, borderRadius: 8, fontSize: 12, color: C.TEXT_SUBTLE }}>
          Monthly recurring revenue and "Paying" come from Stripe's active subscriptions; a plan set without a payment is never counted. Churn estimated from month-to-month user changes.
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboard />
    </Suspense>
  );
}
