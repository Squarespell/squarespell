'use client';
import React, { useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/dashboardColors';
import { GhostButton, PrimaryButton } from '../../../_components/PageShell';
import type { AudienceState } from './AudienceStep';
import type { DesignState } from './DesignStep';
import type { CampaignMode } from '../../../../../lib/emails';

export type SendTiming = 'now' | 'scheduled';

export function ReviewStep({
  audience, design, mode, setMode, recipientCount,
  onBack, onSend, onSchedule, onTestSend, onSaveDraft,
  sending, result,
}: {
  audience: AudienceState;
  design: DesignState;
  mode: CampaignMode;
  setMode: (m: CampaignMode) => void;
  recipientCount: number;
  onBack: () => void;
  onSend: () => void;
  onSchedule: (scheduledAt: string) => void;
  onTestSend: (to: string) => Promise<void>;
  onSaveDraft: () => void;
  sending: boolean;
  result: any;
}) {
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timing, setTiming] = useState<SendTiming>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

  const sendTest = async () => {
    if (!testEmail) return;
    setTestSending(true); setTestStatus(null);
    try { await onTestSend(testEmail); setTestStatus('Sent'); }
    catch (e: any) { setTestStatus('Failed: ' + e.message); }
    finally { setTestSending(false); }
  };

  return (
    <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.TEXT }}>Review & send</h2>
      <p style={{ margin: '0 0 22px', color: C.TEXT_SUBTLE, fontSize: 14 }}>
        Last check. Send a test to yourself first if you want.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        <Stat label="Recipients" value={String(recipientCount)} />
        <Stat label="Subject" value={design.subject || 'None'} truncate />
        <Stat label="From" value={`${design.fromName || 'None'} <${design.fromEmail || 'None'}>`} truncate />
        <Stat label="Source" value={audience.sourceKind === 'quiz' ? 'Quiz leads' : 'Manual list'} />
      </div>

      <Label>Send mode</Label>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <ModeChip active={mode === 'blast'} onClick={() => setMode('blast')}
          title="One-time blast" sub="Send to everyone matching right now" />
        <ModeChip active={mode === 'live'} onClick={() => setMode('live')}
          title="Live automation" sub="Keep sending to every new matching lead" />
      </div>

      {/* Schedule picker */}
      <Label>When to send</Label>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <ModeChip active={timing === 'now'} onClick={() => setTiming('now')}
          title="Send now" sub="Queue immediately after confirmation" />
        <ModeChip active={timing === 'scheduled'} onClick={() => setTiming('scheduled')}
          title="Schedule for later" sub="Pick a date and time" />
      </div>
      {timing === 'scheduled' && (
        <div style={{
          background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
          borderRadius: 12, padding: 16, marginBottom: 22,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <Label>Date</Label>
              <input type="date" value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <Label>Time</Label>
              <input type="time" value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <div style={{ flex: '1 1 200px', fontSize: 12, color: C.TEXT_MUTED, paddingBottom: 12 }}>
              {scheduledDate && scheduledTime ? (
                <>
                  {formatScheduledPreview(scheduledDate, scheduledTime)}
                </>
              ) : 'Pick a date and time above'}
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
        borderRadius: 12, padding: 16, marginBottom: 22,
      }}>
        <Label>Send a test first</Label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="you@yourdomain.com" style={inputStyle} />
          <GhostButton onClick={sendTest} disabled={testSending || !testEmail}>
            {testSending ? 'Sending…' : 'Send test'}
          </GhostButton>
        </div>
        {testStatus && <div style={{ color: testStatus.startsWith('Sent') ? C.SUCCESS : C.DANGER, fontSize: 12, marginTop: 8 }}>{testStatus}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <GhostButton onClick={onBack}>Back</GhostButton>
        <div style={{ display: 'flex', gap: 10 }}>
          <GhostButton onClick={onSaveDraft}>Save draft</GhostButton>
          <PrimaryButton
            onClick={() => setConfirmOpen(true)}
            disabled={sending || recipientCount === 0 || (timing === 'scheduled' && !scheduledDate)}
          >
            {timing === 'scheduled'
              ? 'Schedule send'
              : mode === 'live' ? 'Activate live send' : `Send to ${recipientCount}`}
          </PrimaryButton>
        </div>
      </div>

      {result && (
        <div style={{ marginTop: 18, padding: 14, background: C.ELEVATED, border: `1px solid ${C.BORDER}`, borderRadius: 10, color: C.TEXT, fontSize: 13 }}>
          {result.scheduled
            ? `Campaign scheduled for ${new Date(result.scheduledAt).toLocaleString()}.`
            : result.error
              ? `Error: ${result.error}`
              : `Queued ${result.sent} sends, resolved ${result.resolved}, skipped ${result.skipped}.`}
        </div>
      )}

      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 28, maxWidth: 480, width: '90%' }}>
            <h3 style={{ margin: '0 0 8px', color: C.TEXT, fontSize: 20 }}>
              {timing === 'scheduled'
                ? 'Schedule this campaign?'
                : mode === 'live' ? 'Activate this live campaign?' : `Send to ${recipientCount} people?`}
            </h3>
            <p style={{ margin: '0 0 20px', color: C.TEXT_SUBTLE, fontSize: 14, lineHeight: 1.5 }}>
              {timing === 'scheduled'
                ? `"${design.subject}" will be scheduled for ${formatScheduledPreview(scheduledDate, scheduledTime)} to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}.`
                : mode === 'live'
                  ? `This will start sending "${design.subject}" to every new lead that matches your filters, starting now.`
                  : `"${design.subject}" will be queued to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}. This cannot be unsent.`}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={() => setConfirmOpen(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={() => {
                setConfirmOpen(false);
                if (timing === 'scheduled') {
                  const iso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
                  onSchedule(iso);
                } else {
                  onSend();
                }
              }} disabled={sending}>
                {sending ? 'Processing...' : timing === 'scheduled' ? 'Schedule' : mode === 'live' ? 'Activate' : 'Send now'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div style={{ background: C.ELEVATED, border: `1px solid ${C.BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ color: C.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{
        color: C.TEXT, fontSize: 14, fontWeight: 600,
        whiteSpace: truncate ? 'nowrap' : undefined,
        overflow: truncate ? 'hidden' : undefined,
        textOverflow: truncate ? 'ellipsis' : undefined,
      }}>{value}</div>
    </div>
  );
}

function ModeChip({ active, onClick, title, sub }: any) {
  return (
    <button onClick={onClick} style={{
      flex: 1, textAlign: 'left',
      background: active ? C.ACCENT_LIGHT : C.ELEVATED,
      border: `1px solid ${active ? C.ACCENT : C.BORDER}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
    }}>
      <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 4 }}>{sub}</div>
    </button>
  );
}

const Label = ({ children }: any) => (
  <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{children}</div>
);
const inputStyle: React.CSSProperties = {
  flex: 1, padding: '10px 12px', background: C.SURFACE,
  border: `1px solid ${C.BORDER}`, borderRadius: 10, color: C.TEXT, fontSize: 14,
};

function formatScheduledPreview(date: string, time: string): string {
  if (!date || !time) return '';
  try {
    const d = new Date(`${date}T${time}`);
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return `${date} ${time}`; }
}
