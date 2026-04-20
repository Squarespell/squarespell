'use client';
import React, { useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/dashboardColors';
import { GhostButton, PrimaryButton } from '../../../_components/PageShell';
import type { AudienceState } from './AudienceStep';
import type { DesignState } from './DesignStep';
import type { CampaignMode } from '../../../../../lib/emails';

export type SendTiming = 'now' | 'scheduled';

export function ReviewStep({
  audience, design, setDesign, mode, setMode, recipientCount,
  onBack, onSend, onSchedule, onTestSend, onSaveDraft, onSaveAsTemplate,
  sending, result,
}: {
  audience: AudienceState;
  design: DesignState;
  setDesign: (u: Partial<DesignState>) => void;
  mode: CampaignMode;
  setMode: (m: CampaignMode) => void;
  recipientCount: number;
  onBack: () => void;
  onSend: () => void;
  onSchedule: (scheduledAt: string) => void;
  onTestSend: (to: string) => Promise<void>;
  onSaveDraft: () => void;
  onSaveAsTemplate?: (name: string, category: string, description: string) => Promise<void>;
  sending: boolean;
  result: any;
}) {
  var [testEmail, setTestEmail] = useState('');
  var [testSending, setTestSending] = useState(false);
  var [testStatus, setTestStatus] = useState<string | null>(null);
  var [confirmOpen, setConfirmOpen] = useState(false);
  var [timing, setTiming] = useState<SendTiming>('now');
  var [scheduledDate, setScheduledDate] = useState('');
  var [scheduledTime, setScheduledTime] = useState('09:00');
  var [resendEnabled, setResendEnabled] = useState(false);
  var [resendHours, setResendHours] = useState(24);
  var [resendSubject, setResendSubject] = useState('');
  var [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  var [tplName, setTplName] = useState('');
  var [tplCategory, setTplCategory] = useState('custom');
  var [tplDescription, setTplDescription] = useState('');
  var [savingTemplate, setSavingTemplate] = useState(false);
  var [tplSaved, setTplSaved] = useState(false);

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <Stat label="Recipients" value={String(recipientCount)} />
        <Stat label="Subject" value={design.subject || 'None'} truncate />
        <Stat label="Source" value={audience.sourceKind === 'quiz' ? 'Quiz leads' : 'Manual list'} />
      </div>

      {/* From Name / From Email */}
      <div style={{
        background: C.ELEVATED, border: '1px solid ' + C.BORDER,
        borderRadius: 12, padding: 16, marginBottom: 22,
      }}>
        <Label>Sender details</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>From name</div>
            <input
              value={design.fromName}
              onChange={function(e) { setDesign({ fromName: e.target.value }); }}
              placeholder="Your brand name"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>From email</div>
            <input
              value={design.fromEmail}
              onChange={function(e) { setDesign({ fromEmail: e.target.value }); }}
              placeholder="hello@yourdomain.com"
              style={inputStyle}
            />
          </div>
        </div>
        {!design.fromEmail && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.DANGER, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            From email is required to send
          </div>
        )}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>Date</Label>
              <div style={{ position: 'relative' }}>
                <input type="date" value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  style={{ ...inputStyle, colorScheme: 'light', cursor: 'pointer' }} />
              </div>
            </div>
            <div>
              <Label>Time</Label>
              <div style={{ position: 'relative' }}>
                <input type="time" value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'light', cursor: 'pointer' }} />
              </div>
            </div>
          </div>
          {(scheduledDate || scheduledTime) && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: C.ACCENT_LIGHT, borderRadius: 8,
              fontSize: 13, color: C.ACCENT, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {scheduledDate && scheduledTime
                ? formatScheduledPreview(scheduledDate, scheduledTime)
                : 'Pick a date and time above'}
            </div>
          )}
        </div>
      )}

      {/* Resend to unopened */}
      <div style={{
        background: C.ELEVATED, border: '1px solid ' + (resendEnabled ? C.ACCENT : C.BORDER),
        borderRadius: 12, padding: 16, marginBottom: 22,
      }}>
        <button
          onClick={function() { setResendEnabled(!resendEnabled); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: 0,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 4, flexShrink: 0,
            border: '2px solid ' + (resendEnabled ? C.ACCENT : C.BORDER),
            background: resendEnabled ? C.ACCENT : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {resendEnabled && (
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 14 }}>Auto-resend to unopened</div>
            <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 2 }}>
              Automatically resend with a new subject line to people who didn't open
            </div>
          </div>
        </button>
        {resendEnabled && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + C.BORDER }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <Label>Wait before resending</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min={6} max={72} value={resendHours}
                    onChange={function(e) { setResendHours(Math.min(72, Math.max(6, Number(e.target.value)))); }}
                    style={{ ...inputStyle, width: 70, textAlign: 'center', flex: 'none' }} />
                  <span style={{ color: C.TEXT_SUBTLE, fontSize: 12 }}>hours</span>
                </div>
              </div>
              <div>
                <Label>New subject line</Label>
                <input value={resendSubject}
                  onChange={function(e) { setResendSubject(e.target.value); }}
                  placeholder={design.subject ? 'Re: ' + design.subject : 'Different subject'}
                  style={inputStyle} />
              </div>
            </div>
            <div style={{ color: C.TEXT_SUBTLE, fontSize: 11 }}>
              After {resendHours}h, we resend only to recipients who haven't opened the first email.
            </div>
          </div>
        )}
      </div>

      {/* A/B test summary */}
      {design.abEnabled && design.subjectB && (
        <div style={{
          background: C.ACCENT_LIGHT, border: '1px solid ' + C.ACCENT,
          borderRadius: 12, padding: 16, marginBottom: 22,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
            <path d="M18 2l4 4-4 4" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 13 }}>A/B test active</div>
            <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 2 }}>
              A: "{design.subject}" vs B: "{design.subjectB}" - {(design.abTestPercent || 20) / 2}% each, winner after {design.abWaitHours || 4}h
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: C.ELEVATED, border: '1px solid ' + C.BORDER,
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
          {onSaveAsTemplate && (
            <GhostButton onClick={function() { setSaveTemplateOpen(true); setTplName(design.subject || ''); }}>
              {tplSaved ? 'Template saved' : 'Save as template'}
            </GhostButton>
          )}
          <PrimaryButton
            onClick={() => setConfirmOpen(true)}
            disabled={sending || recipientCount === 0 || !design.fromEmail || (timing === 'scheduled' && !scheduledDate)}
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

      {saveTemplateOpen && onSaveAsTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, padding: 28, maxWidth: 440, width: '90%' }}>
            <h3 style={{ margin: '0 0 6px', color: C.TEXT, fontSize: 18 }}>Save as template</h3>
            <p style={{ margin: '0 0 18px', color: C.TEXT_SUBTLE, fontSize: 13 }}>
              Save this email design so you can reuse it later.
            </p>
            <Label>Template name</Label>
            <input
              value={tplName}
              onChange={function(e) { setTplName(e.target.value); }}
              placeholder="e.g. Welcome email"
              style={Object.assign({}, inputStyle, { width: '100%', marginBottom: 14 })}
            />
            <Label>Category</Label>
            <select
              value={tplCategory}
              onChange={function(e) { setTplCategory(e.target.value); }}
              style={Object.assign({}, inputStyle, { width: '100%', marginBottom: 14, cursor: 'pointer' })}
            >
              <option value="custom">Custom</option>
              <option value="post-quiz">Post-quiz</option>
              <option value="outcome">Outcome</option>
              <option value="nurture">Nurture</option>
              <option value="abandoner">Abandoner</option>
              <option value="booking">Booking</option>
              <option value="discount">Discount</option>
              <option value="promotional">Promotional</option>
              <option value="quiz-result">Quiz result</option>
              <option value="lead-nurture">Lead nurture</option>
            </select>
            <Label>Description (optional)</Label>
            <input
              value={tplDescription}
              onChange={function(e) { setTplDescription(e.target.value); }}
              placeholder="Short description..."
              style={Object.assign({}, inputStyle, { width: '100%', marginBottom: 20 })}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton onClick={function() { setSaveTemplateOpen(false); }}>Cancel</GhostButton>
              <PrimaryButton
                onClick={function() {
                  if (!tplName.trim()) return;
                  setSavingTemplate(true);
                  onSaveAsTemplate(tplName.trim(), tplCategory, tplDescription.trim())
                    .then(function() {
                      setSaveTemplateOpen(false);
                      setTplSaved(true);
                      setSavingTemplate(false);
                    })
                    .catch(function() { setSavingTemplate(false); });
                }}
                disabled={savingTemplate || !tplName.trim()}
              >
                {savingTemplate ? 'Saving...' : 'Save template'}
              </PrimaryButton>
            </div>
          </div>
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
