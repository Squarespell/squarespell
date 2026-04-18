'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { PageHeader, Card, PrimaryButton, PageLoading, Pill } from '../../_components/PageShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { getCampaign, sendCampaign, testSendCampaign, Campaign } from '../../../../lib/emails';

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

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, status: authStatus } = useDashboardAuth();
  const campaignId = params?.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Test send
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  // Send campaign
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !campaignId) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await getCampaign(campaignId);
        if (!cancelled) setCampaign(c);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Campaign not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, campaignId]);

  async function handleTestSend() {
    if (!testEmail.includes('@') || !campaign) return;
    setTestStatus('sending');
    try {
      await testSendCampaign(campaign.id, testEmail);
      setTestStatus('sent');
      setTestMsg('Test email sent!');
    } catch (e: any) {
      setTestStatus('error');
      setTestMsg(e?.message || 'Failed to send test');
    }
  }

  async function handleSend() {
    if (!campaign || campaign.status === 'sent') return;
    if (!confirm('Send this campaign to all matching recipients? This cannot be undone.')) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await sendCampaign(campaign.id);
      setSendResult(`Sent to ${res?.sent ?? '?'} recipients`);
      setCampaign(prev => prev ? { ...prev, status: 'sent', sent_count: res?.sent ?? prev.sent_count } : prev);
    } catch (e: any) {
      setSendResult(`Error: ${e?.message || 'Send failed'}`);
    } finally {
      setSending(false);
    }
  }

  if (authStatus !== 'ready' || loading) {
    return <DashboardShell><PageLoading /></DashboardShell>;
  }

  if (error || !campaign) {
    return (
      <DashboardShell>
        <PageHeader title="Campaign" />
        <Card>
          <div style={{ color: '#ff5c5c', fontSize: 14, marginBottom: 16 }}>{error || 'Campaign not found'}</div>
          <button
            onClick={() => router.push('/dashboard/emails')}
            style={{ padding: '8px 16px', background: C.ACCENT, color: C.BG, border: 0, borderRadius: 100, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to campaigns
          </button>
        </Card>
      </DashboardShell>
    );
  }

  const isDraft = campaign.status === 'draft';
  const isSent = campaign.status === 'sent' || campaign.status === 'sending';

  return (
    <DashboardShell>
      <PageHeader
        title={campaign.name || 'Untitled campaign'}
        subtitle={campaign.subject || 'No subject'}
        actions={
          <Link href="/dashboard/emails">
            <button style={{ padding: '8px 16px', background: 'transparent', color: C.TEXT_MUTED, border: `1px solid ${C.BORDER}`, borderRadius: 100, fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
              Back to campaigns
            </button>
          </Link>
        }
      />

      {/* Status + Stats */}
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 }}>Status</div>
            <Pill variant={statusVariant(campaign.status)}>{statusLabel(campaign.status)}</Pill>
          </div>
          <div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 }}>Sent</div>
            <div style={{ color: C.TEXT, fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(campaign.sent_count || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 }}>Mode</div>
            <div style={{ color: C.TEXT, fontSize: 14, fontWeight: 500 }}>{campaign.mode === 'live' ? 'Automation' : 'Blast'}</div>
          </div>
          <div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 }}>Created</div>
            <div style={{ color: C.TEXT, fontSize: 14 }}>{new Date(campaign.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      </Card>

      {/* Email details */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>From</div>
          <div style={{ color: C.TEXT, fontSize: 14 }}>{campaign.from_name || 'Not set'} &lt;{campaign.from_email || 'not set'}&gt;</div>
        </div>
        <div>
          <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>Subject</div>
          <div style={{ color: C.TEXT, fontSize: 14, fontWeight: 500 }}>{campaign.subject || 'No subject'}</div>
        </div>
      </Card>

      {/* Email preview */}
      <Card>
        <div style={{ color: C.TEXT, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Email preview</div>
        <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.BORDER}` }}>
          <iframe
            srcDoc={campaign.html || '<p style="padding:20px;color:#999;">No HTML content</p>'}
            style={{ width: '100%', height: 500, border: 0, display: 'block' }}
            title="Email preview"
            sandbox=""
          />
        </div>
      </Card>

      {/* Actions */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Test send */}
          <div>
            <div style={{ color: C.TEXT, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Send a test</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={e => { setTestEmail(e.target.value); setTestStatus('idle'); }}
                style={{
                  flex: 1, maxWidth: 280, padding: '10px 14px', background: C.SURFACE, color: C.TEXT,
                  border: `1px solid ${C.BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none',
                }}
              />
              <button
                onClick={handleTestSend}
                disabled={testStatus === 'sending' || !testEmail.includes('@')}
                style={{
                  padding: '10px 18px', background: C.SURFACE, color: C.TEXT, border: `1px solid ${C.BORDER}`,
                  borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: testStatus === 'sending' ? 0.5 : 1,
                }}
              >
                {testStatus === 'sending' ? 'Sending...' : 'Send test'}
              </button>
            </div>
            {testMsg && (
              <div style={{ marginTop: 6, fontSize: 12, color: testStatus === 'sent' ? '#4ade80' : '#ff5c5c' }}>
                {testMsg}
              </div>
            )}
          </div>

          {/* Send / Status */}
          {isDraft && (
            <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 16 }}>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  padding: '12px 24px', background: C.ACCENT, color: C.BG, border: 0,
                  borderRadius: 100, fontWeight: 700, fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? 'Sending...' : 'Send campaign'}
              </button>
              {sendResult && (
                <div style={{ marginTop: 8, fontSize: 13, color: sendResult.startsWith('Error') ? '#ff5c5c' : '#4ade80' }}>
                  {sendResult}
                </div>
              )}
            </div>
          )}

          {isSent && (
            <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 16 }}>
              <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 500 }}>
                This campaign has been sent to {(campaign.sent_count || 0).toLocaleString()} recipients.
              </div>
            </div>
          )}
        </div>
      </Card>
    </DashboardShell>
  );
}
