'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { PageHeader, Card, PrimaryButton, GhostButton, PageLoading } from '../../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

export default function NewCampaignPage() {
  const router = useRouter();
  const { token, status: authStatus } = useDashboardAuth();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [html, setHtml] = useState('<p>Hi {{firstName}},</p><p>Thanks for taking the quiz.</p>');
  const [recipients, setRecipients] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (authStatus !== 'authenticated') return <DashboardShell><PageLoading /></DashboardShell>;

  async function create() {
    const r = await fetch(`${API}/api/emails/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ name, subject, from_name: fromName, from_email: fromEmail, html }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function saveDraft() {
    setSaving(true);
    try { await create(); router.push('/dashboard/emails'); } finally { setSaving(false); }
  }

  async function sendNow() {
    setSaving(true);
    try {
      const c = await create();
      const list = recipients.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/emails/campaigns/${c.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ recipients: list }),
      });
      setResult(await res.json());
    } finally { setSaving(false); }
  }

  const input: React.CSSProperties = {
    width: '100%', background: C.surface, border: `1px solid ${C.border}`,
    color: C.text, padding: 12, borderRadius: 8, fontSize: 14,
  };

  return (
    <DashboardShell>
      <PageHeader title="New campaign" subtitle="Draft, save, or send a branded email now." />
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={input} placeholder="Internal name" value={name} onChange={e => setName(e.target.value)} />
          <input style={input} placeholder="Subject line" value={subject} onChange={e => setSubject(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input style={input} placeholder="From name" value={fromName} onChange={e => setFromName(e.target.value)} />
            <input style={input} placeholder="From email (verified Resend domain)" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
          </div>
          <textarea style={{ ...input, minHeight: 180, fontFamily: 'monospace' }} value={html} onChange={e => setHtml(e.target.value)} />
          <textarea style={{ ...input, minHeight: 80 }} placeholder="Recipient emails (comma or newline separated)" value={recipients} onChange={e => setRecipients(e.target.value)} />
          <div style={{ display: 'flex', gap: 12 }}>
            <GhostButton onClick={saveDraft} disabled={saving}>Save draft</GhostButton>
            <PrimaryButton onClick={sendNow} disabled={saving || !recipients}>Send now</PrimaryButton>
          </div>
          {result && (
            <div style={{ color: C.textMuted, fontSize: 14, padding: 12, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              Sent: {result.sent} · Skipped: {result.skipped}
              {result.skipped > 0 && <span style={{ color: '#fbbf24' }}> (quota reached)</span>}
            </div>
          )}
        </div>
      </Card>
    </DashboardShell>
  );
}
