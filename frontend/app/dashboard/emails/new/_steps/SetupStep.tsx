'use client';
import React, { useEffect, useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { PrimaryButton } from '../../../_components/PageShell';
import { listSourceQuizzes, SourceQuiz } from '../../../../../lib/emails';

export type SetupState = {
  campaignName: string;
  quizId: string;
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
          type="text"
          value={state.campaignName}
          onChange={function(e) { setState({ campaignName: e.target.value }); }}
          placeholder="e.g. Spring quiz result follow-up"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            border: '1px solid ' + C.BORDER, fontSize: 14, color: C.TEXT,
            background: C.SURFACE, outline: 'none',
          }}
        />
        <div style={{ fontSize: 12, color: C.TEXT_SUBTLE, marginTop: 4 }}>
          Internal only - your leads won't see this name.
        </div>
      </div>

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
                type="text"
                value={search}
                onChange={function(e) { setSearch(e.target.value); }}
                placeholder="Search quizzes..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid ' + C.BORDER, fontSize: 13, color: C.TEXT,
                  background: C.SURFACE, marginBottom: 12, outline: 'none',
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
