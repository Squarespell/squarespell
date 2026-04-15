'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, PageLoading, Pill } from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Campaign = {
  id: string; name: string; subject: string;
  from_name: string; from_email: string; status: string;
  created_at: string;
};

export default function EmailsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [items, setItems] = useState<Campaign[]>([]);
  const [quota, setQuota] = useState<{used:number;cap:number;plan:string}|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: 'Bearer ' + token };
    Promise.all([
      fetch(`${API}/api/emails/campaigns`, { headers: h }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/api/emails/quota`, { headers: h }).then(r => r.ok ? r.json() : null),
    ]).then(([c, q]) => { setItems(c || []); setQuota(q); }).finally(() => setLoading(false));
  }, [token]);

  if (authStatus !== 'ready' || loading) {
    return <DashboardShell><PageLoading /></DashboardShell>;
  }

  const pct = quota ? Math.min(100, Math.round((quota.used / quota.cap) * 100)) : 0;

  return (
    <DashboardShell>
      <PageHeader
        title="Emails"
        subtitle="Send campaigns and automations to your leads."
        action={
          <Link href="/dashboard/emails/new">
            <PrimaryButton>+ New campaign</PrimaryButton>
          </Link>
        }
      />

      {quota && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: C.TEXT_MUTED }}>Monthly email usage ({quota.plan})</span>
            <span style={{ color: C.TEXT }}>{quota.used.toLocaleString()} / {quota.cap.toLocaleString()}</span>
          </div>
          <div style={{ height: 8, background: C.BORDER, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: C.ACCENT }} />
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          body="Create your first campaign to send branded emails to leads."
          action={
            <Link href="/dashboard/emails/new">
              <PrimaryButton>Create your first campaign</PrimaryButton>
            </Link>
          }
        />
      ) : (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: C.TEXT_MUTED, fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: 12 }}>Name</th>
                <th style={{ padding: 12 }}>Subject</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={{ borderTop: `1px solid ${C.BORDER}` }}>
                  <td style={{ padding: 12, color: C.TEXT }}>{c.name}</td>
                  <td style={{ padding: 12, color: C.TEXT_MUTED }}>{c.subject}</td>
                  <td style={{ padding: 12 }}><Pill>{c.status}</Pill></td>
                  <td style={{ padding: 12, color: C.TEXT_MUTED, fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </DashboardShell>
  );
}
