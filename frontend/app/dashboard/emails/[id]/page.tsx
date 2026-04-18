'use client';
import { useToast } from '@/lib/toast';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { PageHeader, Card, PrimaryButton, PageLoading, Pill } from '../../_components/PageShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { getCampaign, sendCampaign, testSendCampaign, updateCampaign, deleteCampaign, getCampaignStats, Campaign, CampaignStats } from '../../../../lib/emails';

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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: C.SURFACE, color: C.TEXT,
  border: `1px solid ${C.BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none',
  fontFamily: 'inherit',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { token, status: authStatus } = useDashboardAuth();
  const campaignId = params?.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editFromName, setEditFromName] = useState('');
  const [editFromEmail, setEditFromEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Test send
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  // Send campaign
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  // Delete
  const [deleting, setDeleting] = useState(false);

  // Performance report
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [sourceQuiz, setSourceQuiz] = useState<any>(null);

  useEffect(() => {
    if (!token || !campaignId) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await getCampaign(campaignId);
        if (!cancelled) {
          setCampaign(c);
          setEditName(c.name || '');
          setEditSubject(c.subject || '');
          setEditFromName(c.from_name || '');
          setEditFromEmail(c.from_email || '');
          // Fetch stats if sent
          if (c.status === 'sent' || c.status === 'sending') {
            getCampaignStats(c.id).then(function (s) { if (!cancelled) setStats(s); }).catch(function () {});
          }
          // Fetch source quiz title
          if (c.source_quiz_id) {
            import('../../../../lib/api').then(function (mod) {
              mod.api.getQuiz(c.source_quiz_id!).then(function (q: any) { if (!cancelled) setSourceQuiz(q); }).catch(function () {});
            });
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Campaign not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, campaignId]);

  const saveField = useCallback(async (field: string, value: string) => {
    if (!campaign) return;
    const current = campaign[field as keyof Campaign];
    if (current === value) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await updateCampaign(campaign.id, { [field]: value } as any);
      setCampaign(updated);
      setSaveMsg('Saved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveMsg(''), 2000);
    } catch (e: any) {
      setSaveMsg('Save failed: ' + (e?.message || 'unknown'));
    } finally {
      setSaving(false);
    }
  }, [campaign]);

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

  async function handleDelete() {
    if (!campaign) return;
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteCampaign(campaign.id);
      router.push('/dashboard/emails');
    } catch (e: any) {
      showError('Delete failed: ' + (e?.message || 'unknown'));
      setDeleting(false);
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
            style={{ padding: '8px 16px', background: C.ACCENT, color: '#FFFFFF', border: 0, borderRadius: 100, fontWeight: 600, cursor: 'pointer' }}
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: 12, color: saveMsg === 'Saved' ? '#2D6A4F' : '#C53030', fontWeight: 500 }}>
                {saveMsg}
              </span>
            )}
            <Link href="/dashboard/emails">
              <button style={{ padding: '8px 16px', background: 'transparent', color: C.TEXT_MUTED, border: `1px solid ${C.BORDER}`, borderRadius: 100, fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
                Back
              </button>
            </Link>
          </div>
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
          {(campaign as any).scheduled_at && (
            <div>
              <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: 600 }}>Scheduled for</div>
              <div style={{ color: C.ACCENT, fontSize: 14, fontWeight: 500 }}>
                {new Date((campaign as any).scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Source quiz link */}
      {sourceQuiz && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Source quiz</div>
            <Link href={'/dashboard/' + campaign.source_quiz_id} style={{ color: C.ACCENT, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              {sourceQuiz.title || 'Untitled quiz'}
            </Link>
            <Link href={'/dashboard/analytics/' + campaign.source_quiz_id} style={{ color: C.TEXT_MUTED, fontSize: 12, textDecoration: 'none', marginLeft: 8 }}>
              View quiz analytics
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>
        </Card>
      )}

      {/* Performance report (shown for sent campaigns) */}
      {stats && stats.total > 0 && (
        <Card>
          <div style={{ color: C.TEXT, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Performance report</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Delivered', value: stats.delivered, pct: stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0, color: '#2D6A4F' },
              { label: 'Opened', value: stats.opened, pct: stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0, color: '#60a5fa' },
              { label: 'Clicked', value: stats.clicked, pct: stats.delivered > 0 ? Math.round((stats.clicked / stats.delivered) * 100) : 0, color: C.ACCENT },
              { label: 'Bounced', value: stats.bounced, pct: stats.total > 0 ? Math.round((stats.bounced / stats.total) * 100) : 0, color: stats.bounced > 0 ? '#B45309' : C.TEXT_SUBTLE },
              { label: 'Complained', value: stats.complained, pct: stats.total > 0 ? Math.round((stats.complained / stats.total) * 100) : 0, color: stats.complained > 0 ? '#C53030' : C.TEXT_SUBTLE },
            ].map(function (m) {
              return (
                <div key={m.label} style={{ padding: '14px 16px', background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.color, fontVariantNumeric: 'tabular-nums' }}>
                    {m.pct}%
                  </div>
                  <div style={{ fontSize: 11, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 2 }}>{m.value.toLocaleString()} of {(m.label === 'Bounced' || m.label === 'Complained' ? stats.total : stats.delivered).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
          {/* Visual bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Delivery rate', pct: stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0, color: '#2D6A4F' },
              { label: 'Open rate', pct: stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0, color: '#60a5fa' },
              { label: 'Click rate', pct: stats.delivered > 0 ? Math.round((stats.clicked / stats.delivered) * 100) : 0, color: C.ACCENT },
            ].map(function (bar) {
              return (
                <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 90, fontSize: 12, color: C.TEXT_MUTED, fontWeight: 500, flexShrink: 0 }}>{bar.label}</div>
                  <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: bar.pct + '%', height: '100%', background: bar.color, borderRadius: 4, transition: 'width 0.3s ease' }} />
                  </div>
                  <div style={{ width: 40, fontSize: 12, color: C.TEXT, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{bar.pct}%</div>
                </div>
              );
            })}
          </div>
          {stats.hard_bounced > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: '#B45309' }}>
              {stats.hard_bounced} hard bounce{stats.hard_bounced !== 1 ? 's' : ''}, {stats.soft_bounced} soft bounce{stats.soft_bounced !== 1 ? 's' : ''}
            </div>
          )}
        </Card>
      )}

      {/* Edit fields - only for drafts */}
      {isDraft ? (
        <Card>
          <div style={{ color: C.TEXT, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Campaign details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>
                Campaign name
              </label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => saveField('name', editName)}
                style={inputStyle}
                placeholder="My campaign"
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>
                Subject line
              </label>
              <input
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                onBlur={() => saveField('subject', editSubject)}
                style={inputStyle}
                placeholder="Your quiz results are in!"
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>
                From name
              </label>
              <input
                value={editFromName}
                onChange={e => setEditFromName(e.target.value)}
                onBlur={() => saveField('from_name', editFromName)}
                style={inputStyle}
                placeholder="Your Name"
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>
                From email
              </label>
              <input
                value={editFromEmail}
                onChange={e => setEditFromEmail(e.target.value)}
                onBlur={() => saveField('from_email', editFromEmail)}
                style={inputStyle}
                placeholder="hello@yourdomain.com"
              />
            </div>
          </div>
        </Card>
      ) : (
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
      )}

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
              <div style={{ marginTop: 6, fontSize: 12, color: testStatus === 'sent' ? '#2D6A4F' : '#C53030' }}>
                {testMsg}
              </div>
            )}
          </div>

          {/* Send / Status */}
          {isDraft && (
            <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  padding: '12px 24px', background: C.ACCENT, color: '#FFFFFF', border: 0,
                  borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? 'Sending...' : 'Send campaign'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '10px 18px', background: 'transparent', color: '#ff5c5c',
                  border: '1px solid rgba(255,92,92,0.3)', borderRadius: 100, fontWeight: 600,
                  fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete campaign'}
              </button>
            </div>
          )}

          {!isDraft && !isSent && (
            <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '10px 18px', background: 'transparent', color: '#ff5c5c',
                  border: '1px solid rgba(255,92,92,0.3)', borderRadius: 100, fontWeight: 600,
                  fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete campaign'}
              </button>
            </div>
          )}

          {isSent && (
            <div style={{ borderTop: `1px solid ${C.BORDER}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#2D6A4F', fontSize: 13, fontWeight: 500 }}>
                This campaign has been sent to {(campaign.sent_count || 0).toLocaleString()} recipients.
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '10px 18px', background: 'transparent', color: '#C53030',
                  border: '1px solid rgba(197,48,48,0.3)', borderRadius: 8, fontWeight: 600,
                  fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}

          {sendResult && (
            <div style={{ fontSize: 13, color: sendResult.startsWith('Error') ? '#C53030' : '#2D6A4F' }}>
              {sendResult}
            </div>
          )}
        </div>
      </Card>
    </DashboardShell>
  );
}
