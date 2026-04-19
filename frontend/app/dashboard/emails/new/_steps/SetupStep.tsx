'use client';
import React, { useEffect, useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { PrimaryButton } from '../../../_components/PageShell';
import { listSourceQuizzes, SourceQuiz } from '../../../../../lib/emails';

/* ---- Focus-highlight style injected once ---- */
var FOCUS_STYLE_ID_SETUP = 'sq-setup-focus';
function injectSetupFocusStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FOCUS_STYLE_ID_SETUP)) return;
  var style = document.createElement('style');
  style.id = FOCUS_STYLE_ID_SETUP;
  style.textContent = '.sq-sinput:focus { border-color: ' + C.ACCENT + ' !important; box-shadow: 0 0 0 3px rgba(13,115,119,0.13) !important; outline: none !important; }';
  document.head.appendChild(style);
}

export type DripEmail = {
  id: string;
  delayDays: number;
  subject: string;
  label: string;
};

export type SetupState = {
  campaignName: string;
  quizId: string;
  campaignType: 'blast' | 'drip';
  dripEmails: DripEmail[];
};

export function SetupStep({
  state, setState, onNext,
}: {
  state: SetupState;
  setState: (u: Partial<SetupState>) => void;
  onNext: () => void;
}) {
  var [quizzes, setQuizzes] = useState<SourceQuiz[] | null>(null);
  var [search, setSearch] = useState('');

  useEffect(function() { injectSetupFocusStyles(); }, []);

  useEffect(function() {
    listSourceQuizzes()
      .then(function(qs) { setQuizzes(qs); })
      .catch(function() { setQuizzes([]); });
  }, []);

  var filtered = (quizzes || []).filter(function(q) {
    if (!search) return true;
    return (q.title || q.slug || '').toLowerCase().includes(search.toLowerCase());
  });

  var ready = state.campaignName.trim().length > 0 && state.quizId.length > 0;

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.TEXT }}>Set up your campaign</h2>
      <p style={{ margin: '0 0 24px', color: C.TEXT_SUBTLE, fontSize: 14 }}>
        Give it a name and pick which quiz powers this email.
      </p>

      {/* Campaign Name */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>
          Campaign name
        </label>
        <input
          className="sq-sinput"
          type="text"
          value={state.campaignName}
          onChange={function(e) { setState({ campaignName: e.target.value }); }}
          placeholder="e.g. Spring quiz result follow-up"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            border: '1px solid ' + C.BORDER, fontSize: 14, color: C.TEXT,
            background: C.SURFACE, outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
          Internal only - your leads won't see this name.
        </div>
      </div>

      {/* Campaign Type */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.TEXT, marginBottom: 8 }}>
          Campaign type
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={function() { setState({ campaignType: 'blast' }); }}
            style={{
              flex: 1, textAlign: 'left', padding: '14px 16px', borderRadius: 12,
              border: '2px solid ' + ((state.campaignType || 'blast') === 'blast' ? C.ACCENT : C.BORDER),
              background: (state.campaignType || 'blast') === 'blast' ? C.ACCENT_LIGHT : C.SURFACE,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={(state.campaignType || 'blast') === 'blast' ? C.ACCENT : C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>One-time send</div>
                <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 2 }}>Single email to your audience</div>
              </div>
            </div>
          </button>
          <button
            onClick={function() {
              var defaultDrip: DripEmail[] = [
                { id: 'd1', delayDays: 0, subject: '', label: 'Welcome' },
                { id: 'd2', delayDays: 3, subject: '', label: 'Follow-up' },
                { id: 'd3', delayDays: 7, subject: '', label: 'Final nudge' },
              ];
              setState({ campaignType: 'drip', dripEmails: state.dripEmails && state.dripEmails.length > 0 ? state.dripEmails : defaultDrip });
            }}
            style={{
              flex: 1, textAlign: 'left', padding: '14px 16px', borderRadius: 12,
              border: '2px solid ' + (state.campaignType === 'drip' ? C.ACCENT : C.BORDER),
              background: state.campaignType === 'drip' ? C.ACCENT_LIGHT : C.SURFACE,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={state.campaignType === 'drip' ? C.ACCENT : C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>Drip sequence</div>
                <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 2 }}>Multi-email series over time</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Drip Sequence Builder */}
      {state.campaignType === 'drip' && (
        <div style={{ marginBottom: 24, background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 12, padding: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.TEXT, marginBottom: 10 }}>
            Email sequence
          </label>
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {/* Vertical timeline line */}
            <div style={{
              position: 'absolute', left: 8, top: 16, bottom: 16,
              width: 2, background: C.BORDER,
            }} />
            {(state.dripEmails || []).map(function(email, idx) {
              return (
                <div key={email.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -16, width: 14, height: 14, borderRadius: 7,
                    background: idx === 0 ? C.ACCENT : C.SURFACE,
                    border: '2px solid ' + C.ACCENT,
                    zIndex: 1,
                  }} />
                  {/* Day badge */}
                  <div style={{
                    background: C.ACCENT_LIGHT, color: C.ACCENT, fontWeight: 700,
                    fontSize: 11, padding: '4px 8px', borderRadius: 6, flexShrink: 0, minWidth: 50, textAlign: 'center',
                  }}>
                    {email.delayDays === 0 ? 'Day 0' : 'Day ' + email.delayDays}
                  </div>
                  {/* Label */}
                  <input
                    value={email.label}
                    onChange={function(e) {
                      var updated = (state.dripEmails || []).map(function(d, i) {
                        return i === idx ? Object.assign({}, d, { label: e.target.value }) : d;
                      });
                      setState({ dripEmails: updated });
                    }}
                    className="sq-sinput"
                    placeholder="Email label"
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 8,
                      border: '1px solid ' + C.BORDER, fontSize: 13, color: C.TEXT,
                      background: C.SURFACE, outline: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  />
                  {/* Delay input */}
                  {idx > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: C.TEXT_MUTED }}>after</span>
                      <input
                        type="number" min={1} max={90}
                        value={email.delayDays}
                        onChange={function(e) {
                          var updated = (state.dripEmails || []).map(function(d, i) {
                            return i === idx ? Object.assign({}, d, { delayDays: Math.max(1, Number(e.target.value)) }) : d;
                          });
                          setState({ dripEmails: updated });
                        }}
                        style={{
                          width: 50, padding: '6px 8px', borderRadius: 6, textAlign: 'center',
                          border: '1px solid ' + C.BORDER, fontSize: 12, color: C.TEXT,
                          background: C.SURFACE,
                        }}
                      />
                      <span style={{ fontSize: 11, color: C.TEXT_MUTED }}>days</span>
                    </div>
                  )}
                  {/* Remove button (if more than 2 emails) */}
                  {(state.dripEmails || []).length > 2 && (
                    <button
                      onClick={function() {
                        var updated = (state.dripEmails || []).filter(function(_, i) { return i !== idx; });
                        setState({ dripEmails: updated });
                      }}
                      style={{
                        padding: '4px 6px', background: 'transparent', border: '1px solid ' + C.BORDER,
                        borderRadius: 6, cursor: 'pointer', color: C.TEXT_MUTED, fontSize: 11,
                      }}
                      title="Remove"
                    >
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Add email button */}
          <button
            onClick={function() {
              var emails = state.dripEmails || [];
              var lastDay = emails.length > 0 ? emails[emails.length - 1].delayDays : 0;
              var newEmail: DripEmail = {
                id: 'd' + (emails.length + 1) + '_' + Date.now(),
                delayDays: lastDay + 3,
                subject: '',
                label: 'Email ' + (emails.length + 1),
              };
              setState({ dripEmails: emails.concat([newEmail]) });
            }}
            style={{
              marginTop: 4, padding: '8px 14px', background: 'transparent',
              border: '1px dashed ' + C.BORDER, borderRadius: 8,
              color: C.ACCENT, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add another email
          </button>
          <div style={{ fontSize: 11, color: C.TEXT_SUBTLE, marginTop: 10 }}>
            Each email in the sequence will use the same audience filters. You'll pick a template for each in the next steps.
          </div>
        </div>
      )}

      {/* Quiz Picker */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>
          Which quiz powers this email?
        </label>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: C.TEXT_SUBTLE }}>
          We'll use the quiz data (scores, outcomes, answers) to personalize the email and target the right leads.
        </p>

        {quizzes === null ? (
          <div style={{ padding: 20, textAlign: 'center', color: C.TEXT_SUBTLE, fontSize: 13 }}>Loading quizzes...</div>
        ) : quizzes.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: C.TEXT_SUBTLE, fontSize: 13, background: C.ELEVATED, borderRadius: 10 }}>
            No quizzes found. Create a quiz first to send quiz-powered emails.
          </div>
        ) : (
          <>
            {quizzes.length > 4 && (
              <input
                className="sq-sinput"
                type="text"
                value={search}
                onChange={function(e) { setSearch(e.target.value); }}
                placeholder="Search quizzes..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid ' + C.BORDER, fontSize: 13, color: C.TEXT,
                  background: C.SURFACE, marginBottom: 12, outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {filtered.map(function(q) {
                var selected = state.quizId === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={function() { setState({ quizId: q.id }); }}
                    style={{
                      textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                      border: '2px solid ' + (selected ? C.ACCENT : C.BORDER),
                      background: selected ? C.ACCENT_LIGHT : C.SURFACE,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 10,
                        border: '2px solid ' + (selected ? C.ACCENT : C.BORDER),
                        background: selected ? C.ACCENT : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {selected && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#FFFFFF' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.TEXT }}>{q.title || q.slug}</div>
                        {q.lead_count != null && (
                          <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 2 }}>
                            {q.lead_count} lead{q.lead_count === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Continue */}
      <div style={{
        marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingTop: 20, borderTop: '1px solid ' + C.BORDER,
      }}>
        <div style={{ opacity: ready ? 1 : 0.5, pointerEvents: ready ? 'auto' : 'none' }}>
          <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
