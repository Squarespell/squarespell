'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, PageLoading, Pill } from '../_components/PageShell';
import { listCampaigns, getQuota, Campaign } from '../../../lib/emails';

type StatusVariant = 'live' | 'draft' | 'neutral' | 'accent';

function statusVariant(s: string): StatusVariant {
  if (s === 'sent' || s === 'sending') return 'live';
  if (s === 'draft') return 'draft';
  if (s === 'scheduled') return 'accent';
  return 'neutral';
}

function statusLabel(s: string): string {
  if (s === 'sent') return 'Sent';
  if (s === 'sending') return 'Sending';
  if (s === 'draft') return 'Draft';
  if (s === 'scheduled') return 'Scheduled';
  if (s === 'failed') return 'Failed';
  return s;
}

function quotaBarColor(pct: number): string {
  if (pct >= 90) return '#ff5c5c';
  if (pct >= 70) return '#ffb020';
  return C.ACCENT;
}

export default function EmailsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const router = useRouter();
  const [items, setItems] = useState<Campaign[]>([]);
  const [quota, setQuota] = useState<{used:number;cap:number;plan:string}|null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [c, q] = await Promise.all([
          listCampaigns().catch(() => [] as Campaign[]),
          getQuota().catch(() => null),
        ]);
        if (cancelled) return;
        setItems(c || []);
        setQuota(q);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Could not load campaigns');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (authStatus !== 'ready' || loading) {
    return <DashboardShell><PageLoading /></DashboardShell>;
  }

  const pct = quota && quota.cap > 0 ? Math.min(100, Math.round((quota.used / quota.cap) * 100)) : 0;
  const barColor = quotaBarColor(pct);
  const totalSent = items.reduce((sum, c) => sum + (c.sent_count || 0), 0);

  return (
    <DashboardShell>
      <PageHeader
        title="Emails"
        subtitle="Send campaigns and automations to your leads."
        actions={
          <Link href="/dashboard/emails/new">
            <PrimaryButton>New campaign</PrimaryButton>
          </Link>
        }
      />

      {quota && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, marginBottom: 10 }}>
            <div>
              <div style={{ color: C.TEXT, fontWeight: 600 }}>Monthly email usage</div>
              <div style={{ color: C.TEXT_MUTED, fontSize: 12, marginTop: 2 }}>Plan: {quota.plan}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.TEXT, fontWeight: 600 }}>
                {quota.used.toLocaleString()} / {quota.cap.toLocaleString()}
              </div>
              <div style={{ color: C.TEXT_MUTED, fontSize: 12, marginTop: 2 }}>{pct}% used</div>
            </div>
          </div>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 400ms ease' }} />
          </div>
          {pct >= 90 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#ff5c5c' }}>
              You have used {pct}% of your monthly cap. Upgrade your plan to keep sending without interruption.
            </div>
          )}
          {pct >= 70 && pct < 90 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#ffb020' }}>
              You are approaching your monthly cap. Consider upgrading soon.
            </div>
          )}
        </Card>
      )}

      {/* Quick links */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Link href="/dashboard/emails/deliverability" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 6,
          background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
          color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Deliverability
        </Link>
        <Link href="/dashboard/emails/suppressions" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 6,
          background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
          color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          Suppressions
        </Link>
      </div>

      {err && (
        <Card>
          <div style={{ color: '#ff5c5c', fontSize: 14 }}>{err}</div>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          body="Create your first campaign to send branded emails to your leads."
          action={
            <Link href="/dashboard/emails/new">
              <PrimaryButton>Create your first campaign</PrimaryButton>
            </Link>
          }
        />
      ) : (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ color: C.TEXT, fontWeight: 600 }}>
              {items.length} campaign{items.length === 1 ? '' : 's'}
            </div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 13 }}>
              {totalSent.toLocaleString()} total sent
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Subject</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Sent</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Created</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} onClick={() => router.push(`/dashboard/emails/${c.id}`)} style={{ borderTop: `1px solid ${C.BORDER}`, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 12px', color: C.TEXT, fontWeight: 500 }}>
                      <Link href={`/dashboard/emails/${c.id}`} style={{ color: C.TEXT, textDecoration: 'none' }}>
                        {c.name || 'Untitled campaign'}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 12px', color: C.TEXT_MUTED, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.subject || 'No subject'}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <Pill variant={statusVariant(c.status)}>{statusLabel(c.status)}</Pill>
                    </td>
                    <td style={{ padding: '14px 12px', color: C.TEXT, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {(c.sent_count || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 12px', color: C.TEXT_MUTED, fontSize: 13 }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <Link href={`/dashboard/emails/${c.id}`} style={{ color: C.ACCENT, fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
