'use client';

/**
 * Shown right after a quiz goes live, to trial accounts only: the moment the quiz starts working for them.
 * Once per account (remembered in this browser), and again in the last 3 days of the trial. Never blocks publishing;
 * "Later" closes it. Choosing Pro goes straight to Stripe checkout (billing starts at the trial end when possible).
 */
import { useEffect, useState } from 'react';
import { DASHBOARD_COLORS as C } from './dashboardColors';
import { track } from '@/lib/analytics';
import { PlanStatus, daysUntil, fetchPlanStatus, formatDay, isUnpaid, monthlyPrice, startCheckout } from '@/lib/billing';

const SEEN_KEY = 'sqs_publish_upgrade_seen';

export function shouldShowPublishCard(status: PlanStatus | null, seenBefore: boolean, now: number = Date.now()): boolean {
  if (!status || !isUnpaid(status.plan) || !status.trial_active || !status.trial_ends_at) return false;
  return !seenBefore || daysUntil(status.trial_ends_at, now) <= 3;
}

export function PublishUpgradeCard({ placement }: { placement: 'editor_publish' | 'website_publish' }) {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchPlanStatus().then((s) => {
      if (!alive) return;
      let seen = false;
      try { seen = window.localStorage.getItem(SEEN_KEY) === '1'; } catch { /* storage unavailable */ }
      if (shouldShowPublishCard(s, seen)) {
        setStatus(s);
        setShow(true);
        track('upgrade_prompt_view', { placement });
        try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ }
      }
    });
    return () => { alive = false; };
  }, [placement]);

  if (!show || !status) return null;
  const price = monthlyPrice('pro', 'yearly');
  const ends = formatDay(status.trial_ends_at);
  const billingFrom = status.billing_starts_at ? formatDay(status.billing_starts_at) : '';

  async function choosePro() {
    setBusy(true);
    setError('');
    track('upgrade_click', { placement, plan: 'pro', billing_period: 'yearly' });
    const err = await startCheckout({ plan: 'pro', billing: 'yearly', placement });
    if (err) { setError(err); setBusy(false); }
  }

  return (
    <div role="region" aria-label="Keep your quiz collecting leads" style={{ margin: '16px 0 0', padding: '16px 18px', borderRadius: 12, border: '1px solid ' + C.ACCENT + '33', background: C.ACCENT_LIGHT, fontFamily: 'inherit' }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.TEXT }}>Keep this quiz collecting leads</p>
      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: C.TEXT_MUTED }}>
        Your trial ends on {ends}. After that, new leads are held until you choose a plan.
        {billingFrom ? ' Choose now and you won’t be charged until ' + billingFrom + '.' : ''}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <button type="button" onClick={choosePro} disabled={busy}
          style={{ padding: '9px 16px', borderRadius: 8, border: 0, background: C.ACCENT, color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {busy ? 'Opening checkout…' : 'Choose Pro, $' + price + '/mo billed yearly'}
        </button>
        <a href="/dashboard/billing?tab=plans" onClick={() => track('upgrade_click', { placement, plan: 'compare' })}
          style={{ fontSize: 13, fontWeight: 600, color: C.ACCENT, textDecoration: 'none' }}>Compare plans</a>
        <button type="button" onClick={() => { setShow(false); track('upgrade_dismiss', { placement }); }}
          style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: C.TEXT_MUTED, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Later</button>
      </div>
      {error ? <p role="alert" style={{ margin: '8px 0 0', fontSize: 12.5, color: C.DANGER }}>{error}</p> : null}
    </div>
  );
}
