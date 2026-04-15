'use client';
import React, { useEffect, useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_theme/colors';
import { GhostButton, AccentButton } from '../../../_components/PageShell';
import {
  listSourceQuizzes, listOutcomesForQuiz, previewRecipients,
  SourceQuiz, SourceFilters,
} from '../../../../../lib/emails';

export type AudienceState = {
  sourceKind: 'quiz' | 'manual';
  sourceQuizId: string;
  filters: SourceFilters;
  manualRecipients: string;
};

export function AudienceStep({
  state, setState, onNext,
}: {
  state: AudienceState;
  setState: (u: Partial<AudienceState>) => void;
  onNext: () => void;
}) {
  const [quizzes, setQuizzes] = useState<SourceQuiz[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    listSourceQuizzes().then(setQuizzes).catch(() => setQuizzes([]));
  }, []);

  useEffect(() => {
    if (!state.sourceQuizId) { setOutcomes([]); return; }
    listOutcomesForQuiz(state.sourceQuizId).then(setOutcomes).catch(() => setOutcomes([]));
  }, [state.sourceQuizId]);

  useEffect(() => {
    if (state.sourceKind !== 'quiz' || !state.sourceQuizId) { setCount(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    previewRecipients(state.sourceQuizId, state.filters)
      .then(r => { if (!cancelled) setCount(r.count); })
      .catch(() => { if (!cancelled) setCount(0); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [state.sourceQuizId, state.sourceKind, JSON.stringify(state.filters)]);

  const manualCount = state.manualRecipients
    .split(/[\s,;\n]+/).map(s => s.trim()).filter(s => s.includes('@')).length;
  const ready = state.sourceKind === 'quiz' ? !!count && count > 0 : manualCount > 0;
  const displayCount = state.sourceKind === 'quiz' ? (count ?? 0) : manualCount;

  return (
    <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.TEXT }}>Who gets this email?</h2>
      <p style={{ margin: '0 0 24px', color: C.TEXT_SUBTLE, fontSize: 14 }}>
        Pull leads from a quiz with filters, or paste a list of emails.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <SourceChip active={state.sourceKind === 'quiz'} onClick={() => setState({ sourceKind: 'quiz' })}
          title="Leads from a quiz" sub="Everyone who finished a quiz, optionally filtered" />
        <SourceChip active={state.sourceKind === 'manual'} onClick={() => setState({ sourceKind: 'manual' })}
          title="Paste emails" sub="Comma- or newline-separated list" />
      </div>

      {state.sourceKind === 'quiz' ? (
        <>
          <Label>Quiz</Label>
          <select
            value={state.sourceQuizId}
            onChange={e => setState({ sourceQuizId: e.target.value, filters: {} })}
            style={selectStyle}
          >
            <option value="">{quizzes.length ? 'Pick a quiz…' : 'No quizzes yet — create one first'}</option>
            {quizzes.map(q => <option key={q.id} value={q.id}>{q.title || q.slug}</option>)}
          </select>

          {state.sourceQuizId && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                <div>
                  <Label>Result</Label>
                  <select
                    value={state.filters.outcome_id || ''}
                    onChange={e => setState({ filters: { ...state.filters, outcome_id: e.target.value || undefined } })}
                    style={selectStyle}
                  >
                    <option value="">Any result</option>
                    {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Min score</Label>
                  <input type="number" value={state.filters.min_score ?? ''}
                    onChange={e => setState({ filters: { ...state.filters, min_score: e.target.value ? Number(e.target.value) : undefined } })}
                    style={inputStyle} />
                </div>
                <div>
                  <Label>Max score</Label>
                  <input type="number" value={state.filters.max_score ?? ''}
                    onChange={e => setState({ filters: { ...state.filters, max_score: e.target.value ? Number(e.target.value) : undefined } })}
                    style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <Label>From date</Label>
                  <input type="date" value={state.filters.since || ''}
                    onChange={e => setState({ filters: { ...state.filters, since: e.target.value || undefined } })}
                    style={inputStyle} />
                </div>
                <div>
                  <Label>Until date</Label>
                  <input type="date" value={state.filters.until || ''}
                    onChange={e => setState({ filters: { ...state.filters, until: e.target.value || undefined } })}
                    style={inputStyle} />
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <Label>Email addresses</Label>
          <textarea
            value={state.manualRecipients}
            onChange={e => setState({ manualRecipients: e.target.value })}
            placeholder="a@example.com, b@example.com"
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
          />
        </>
      )}

      <div style={{
        marginTop: 24, padding: '14px 16px',
        background: ready ? 'rgba(210,255,29,0.08)' : C.ELEVATED,
        border: `1px solid ${ready ? C.ACCENT : C.BORDER}`,
        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 16 }}>
            {previewLoading ? 'Counting…' : `${displayCount} recipient${displayCount === 1 ? '' : 's'}`}
          </div>
          <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 2 }}>
            {state.sourceKind === 'quiz' ? 'Live preview from your quiz leads' : 'Parsed from your list'}
          </div>
        </div>
        <AccentButton onClick={onNext} disabled={!ready}>Continue →</AccentButton>
      </div>
    </div>
  );
}

function SourceChip({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, textAlign: 'left',
      background: active ? 'rgba(210,255,29,0.10)' : C.ELEVATED,
      border: `1px solid ${active ? C.ACCENT : C.BORDER}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
    }}>
      <div style={{ color: active ? C.TEXT : C.TEXT, fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 4 }}>{sub}</div>
    </button>
  );
}

const Label = ({ children }: any) => (
  <div style={{ color: C.TEXT_MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{children}</div>
);
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: C.ELEVATED,
  border: `1px solid ${C.BORDER}`, borderRadius: 10, color: C.TEXT, fontSize: 14,
};
const selectStyle: React.CSSProperties = { ...inputStyle };
