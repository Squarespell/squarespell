'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { PageHeader, Card, PrimaryButton, GhostButton } from '../../_components/PageShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import {
  createCampaign, sendCampaign, listSourceQuizzes, listOutcomesForQuiz,
  previewRecipients, type SourceQuiz, type CampaignMode, type SourceFilters,
} from '../../../../lib/emails';

const input: React.CSSProperties = {
  width: '100%', background: C.SURFACE, border: `1px solid ${C.BORDER}`,
  color: C.TEXT, padding: 12, borderRadius: 8, fontSize: 14, fontFamily: '"DM Sans",system-ui,sans-serif',
};
const label: React.CSSProperties = { fontSize: 12, color: C.TEXT_MUTED, marginBottom: 6, display: 'block' };

export default function NewCampaignPage() {
  const { status } = useDashboardAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [html, setHtml] = useState('<p>Hi {{firstName}},</p><p>Thanks for taking the quiz.</p>');

  const [mode, setMode] = useState<CampaignMode>('blast');
  const [sourceKind, setSourceKind] = useState<'quiz' | 'manual'>('quiz');
  const [manualRecipients, setManualRecipients] = useState('');

  const [quizzes, setQuizzes] = useState<SourceQuiz[]>([]);
  const [sourceQuizId, setSourceQuizId] = useState<string>('');
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [filters, setFilters] = useState<SourceFilters>({});
  const [preview, setPreview] = useState<{ count: number; emails: string[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready') return;
    listSourceQuizzes().then(setQuizzes).catch(() => setQuizzes([]));
  }, [status]);

  useEffect(() => {
    if (!sourceQuizId) { setOutcomes([]); return; }
    listOutcomesForQuiz(sourceQuizId).then(setOutcomes).catch(() => setOutcomes([]));
  }, [sourceQuizId]);

  useEffect(() => {
    if (sourceKind !== 'quiz' || !sourceQuizId) { setPreview(null); return; }
    let cancel = false;
    setPreviewLoading(true);
    previewRecipients(sourceQuizId, filters)
      .then((d) => { if (!cancel) setPreview(d); })
      .catch(() => { if (!cancel) setPreview({ count: 0, emails: [] }); })
      .finally(() => { if (!cancel) setPreviewLoading(false); });
    return () => { cancel = true; };
  }, [sourceKind, sourceQuizId, JSON.stringify(filters)]);

  const manualList = useMemo(
    () => manualRecipients.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
    [manualRecipients],
  );

  async function create(sendAfter = false) {
    if (!name || !subject || !fromEmail) { setResult('Fill name, subject, and from email.'); return; }
    if (sourceKind === 'quiz' && !sourceQuizId) { setResult('Pick a quiz source.'); return; }
    setSaving(true); setResult(null);
    try {
      const payload: any = { name, subject, from_name: fromName, from_email: fromEmail, html, mode };
      if (sourceKind === 'quiz') { payload.source_quiz_id = sourceQuizId; payload.source_filters = filters; }
      const c = await createCampaign(payload);
      if (sendAfter) {
        const r = await sendCampaign(c.id, sourceKind === 'manual' ? manualList : undefined);
        setResult(`Sent ${r.sent} / resolved ${r.resolved ?? manualList.length}. Skipped ${r.skipped}.`);
      } else {
        setResult('Draft saved.');
      }
      setTimeout(() => router.push('/dashboard/emails'), 900);
    } catch (e: any) {
      setResult('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const sendLabel = mode === 'live' ? 'Activate live send' : 'Send now';
  const resolvedCount = sourceKind === 'manual' ? manualList.length : preview?.count ?? 0;

  return (
    <DashboardShell>
      <PageHeader title="New campaign" subtitle="Draft, save, or send a branded email now." />
      <Card>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={label}>Internal name</label>
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. April nurture" /></div>
          <div><label style={label}>Subject line</label>
            <input style={input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your quiz result is ready" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>From name</label>
              <input style={input} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your Brand" /></div>
            <div><label style={label}>From email (verified Resend domain)</label>
              <input style={input} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="hello@yourdomain.com" /></div>
          </div>
          <div><label style={label}>HTML body</label>
            <textarea style={{ ...input, minHeight: 140, fontFamily: 'ui-monospace,monospace' }} value={html} onChange={(e) => setHtml(e.target.value)} /></div>

          <div style={{ height: 1, background: C.HAIRLINE, margin: '6px 0' }} />

          {/* Mode toggle */}
          <div>
            <label style={label}>Send mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <ModeChip active={mode === 'blast'} onClick={() => setMode('blast')} label="One-time blast" hint="Send to everyone who matches right now" />
              <ModeChip active={mode === 'live'} onClick={() => setMode('live')} label="Live automation" hint="Keep running for every new matching lead" />
            </div>
          </div>

          {/* Source picker */}
          <div>
            <label style={label}>Who gets this?</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <ModeChip active={sourceKind === 'quiz'} onClick={() => setSourceKind('quiz')} label="Leads from a quiz" />
              <ModeChip active={sourceKind === 'manual'} onClick={() => setSourceKind('manual')} label="Paste emails" />
            </div>

            {sourceKind === 'quiz' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10 }}>
                  <select style={input} value={sourceQuizId} onChange={(e) => setSourceQuizId(e.target.value)}>
                    <option value="">Pick a quiz…</option>
                    {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title || q.slug}</option>)}
                  </select>
                  <select style={input} value={filters.outcome_id || ''} onChange={(e) => setFilters({ ...filters, outcome_id: e.target.value || undefined })}>
                    <option value="">Any result</option>
                    {outcomes.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input style={input} type="number" placeholder="Min score" value={filters.min_score ?? ''} onChange={(e) => setFilters({ ...filters, min_score: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  <input style={input} type="number" placeholder="Max score" value={filters.max_score ?? ''} onChange={(e) => setFilters({ ...filters, max_score: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input style={input} type="date" value={filters.since?.slice(0,10) || ''} onChange={(e) => setFilters({ ...filters, since: e.target.value || undefined })} placeholder="Since" />
                  <input style={input} type="date" value={filters.until?.slice(0,10) || ''} onChange={(e) => setFilters({ ...filters, until: e.target.value || undefined })} placeholder="Until" />
                </div>
                <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
                  {sourceQuizId
                    ? (previewLoading ? 'Counting…' : <><b style={{ color: C.TEXT }}>{preview?.count ?? 0}</b> lead{(preview?.count ?? 0) === 1 ? '' : 's'} will receive this{preview?.emails?.length ? ` — e.g. ${preview.emails.join(', ')}` : ''}</>)
                    : 'Pick a quiz to see your audience size.'}
                </div>
              </div>
            ) : (
              <textarea style={{ ...input, minHeight: 80 }} placeholder="Recipient emails (comma or newline separated)" value={manualRecipients} onChange={(e) => setManualRecipients(e.target.value)} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <GhostButton onClick={() => create(false)} disabled={saving}>Save draft</GhostButton>
            <PrimaryButton onClick={() => create(true)} disabled={saving || resolvedCount === 0}>{sendLabel}</PrimaryButton>
            <span style={{ fontSize: 12, color: C.TEXT_MUTED }}>{resolvedCount} recipient{resolvedCount === 1 ? '' : 's'} ready</span>
          </div>
          {result && <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>{result}</div>}
          <div style={{ fontSize: 11, color: C.TEXT_SUBTLE }}>
            <Link href="/dashboard/emails" style={{ color: C.TEXT_MUTED }}>← Back to emails</Link>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}

function ModeChip({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button onClick={onClick} type="button" style={{
      padding: '10px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      background: active ? 'rgba(210,255,29,0.12)' : 'transparent',
      border: `1px solid ${active ? 'rgba(210,255,29,0.5)' : C.BORDER}`,
      color: active ? C.ACCENT : C.TEXT, fontFamily: '"DM Sans",system-ui,sans-serif',
      textAlign: 'left', lineHeight: 1.2,
    }}>
      <div>{label}</div>
      {hint && <div style={{ fontSize: 11, color: C.TEXT_MUTED, fontWeight: 400, marginTop: 2 }}>{hint}</div>}
    </button>
  );
}
