'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { GhostButton, PrimaryButton } from '../../../_components/PageShell';
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

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function AudienceStep({
  state, setState, onNext,
}: {
  state: AudienceState;
  setState: (u: Partial<AudienceState>) => void;
  onNext: () => void;
}) {
  const [quizzes, setQuizzes] = useState<SourceQuiz[] | null>(null);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const parsedManual = useMemo(() => {
    const hits = (state.manualRecipients.match(EMAIL_RE) || []).map(s => s.toLowerCase());
    return Array.from(new Set(hits));
  }, [state.manualRecipients]);

  const ready = state.sourceKind === 'quiz' ? !!count && count > 0 : parsedManual.length > 0;
  const displayCount = state.sourceKind === 'quiz' ? (count ?? 0) : parsedManual.length;

  const filteredQuizzes = (quizzes || []).filter(q =>
    !search || (q.title || q.slug || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) { setUploadError('File too large (max 5MB)'); return; }
    try {
      const text = await file.text();
      const emails = (text.match(EMAIL_RE) || []).map(s => s.toLowerCase());
      const unique = Array.from(new Set(emails));
      if (unique.length === 0) { setUploadError('No valid email addresses found'); return; }
      setState({ manualRecipients: unique.join('\n') });
      setUploadName(`${file.name} — ${unique.length} emails`);
    } catch (e: any) { setUploadError('Could not read file: ' + e.message); }
  };

  return (
    <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.TEXT }}>Who gets this email?</h2>
      <p style={{ margin: '0 0 24px', color: C.TEXT_SUBTLE, fontSize: 14 }}>
        Send to quiz leads (filtered how you want) — or upload a CSV of email addresses.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <SourceChip active={state.sourceKind === 'quiz'} onClick={() => setState({ sourceKind: 'quiz' })}
          icon="🎯" title="Leads from a quiz" sub="Everyone who finished, optionally filtered" />
        <SourceChip active={state.sourceKind === 'manual'} onClick={() => setState({ sourceKind: 'manual' })}
          icon="📎" title="Upload a list" sub="Drop a CSV, Excel, or text file of emails" />
      </div>

      {state.sourceKind === 'quiz' ? (
        quizzes === null ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>Loading your quizzes…</div>
        ) : quizzes.length === 0 ? (
          <EmptyQuizzesCard />
        ) : (
          <>
            {quizzes.length > 5 && (
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${quizzes.length} quizzes…`}
                style={{ ...inputStyle, marginBottom: 12 }}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 20 }}>
              {filteredQuizzes.map(q => (
                <QuizCard key={q.id} quiz={q}
                  active={state.sourceQuizId === q.id}
                  onClick={() => setState({ sourceQuizId: q.id, filters: {} })} />
              ))}
              {filteredQuizzes.length === 0 && (
                <div style={{ color: C.TEXT_MUTED, fontSize: 13, padding: 20, textAlign: 'center', gridColumn: '1 / -1' }}>
                  No quizzes match "{search}"
                </div>
              )}
            </div>

            {state.sourceQuizId && (
              <div style={{ background: C.ELEVATED, border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: 16, marginBottom: 4 }}>
                <Label>Refine (optional)</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <MiniLabel>Result</MiniLabel>
                    <select value={state.filters.outcome_id || ''}
                      onChange={e => setState({ filters: { ...state.filters, outcome_id: e.target.value || undefined } })}
                      style={inputStyle}>
                      <option value="">Any result</option>
                      {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <MiniLabel>Min score</MiniLabel>
                    <input type="number" value={state.filters.min_score ?? ''}
                      onChange={e => setState({ filters: { ...state.filters, min_score: e.target.value ? Number(e.target.value) : undefined } })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <MiniLabel>Max score</MiniLabel>
                    <input type="number" value={state.filters.max_score ?? ''}
                      onChange={e => setState({ filters: { ...state.filters, max_score: e.target.value ? Number(e.target.value) : undefined } })}
                      style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div>
                    <MiniLabel>From date</MiniLabel>
                    <input type="date" value={state.filters.since || ''}
                      onChange={e => setState({ filters: { ...state.filters, since: e.target.value || undefined } })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <MiniLabel>Until date</MiniLabel>
                    <input type="date" value={state.filters.until || ''}
                      onChange={e => setState({ filters: { ...state.filters, until: e.target.value || undefined } })}
                      style={inputStyle} />
                  </div>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? C.ACCENT : C.BORDER}`,
              background: dragOver ? 'rgba(210,255,29,0.06)' : C.ELEVATED,
              borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
              marginBottom: 16, transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
            <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
              {uploadName || 'Drop a CSV, Excel, or TXT file here'}
            </div>
            <div style={{ color: C.TEXT_SUBTLE, fontSize: 12 }}>
              {uploadName ? 'Click to replace' : 'or click to browse · we extract the email column automatically'}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,.tsv"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              style={{ display: 'none' }} />
          </div>
          {uploadError && <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 10 }}>{uploadError}</div>}

          <details style={{ marginBottom: 12 }}>
            <summary style={{ color: C.TEXT_SUBTLE, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
              Or paste addresses directly
            </summary>
            <textarea
              value={state.manualRecipients}
              onChange={e => setState({ manualRecipients: e.target.value })}
              placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', marginTop: 8, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
            />
          </details>

          {parsedManual.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {parsedManual.slice(0, 20).map(e => (
                <span key={e} style={{ background: C.ELEVATED, border: `1px solid ${C.BORDER}`, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: C.TEXT_SUBTLE }}>
                  {e}
                </span>
              ))}
              {parsedManual.length > 20 && (
                <span style={{ color: C.TEXT_MUTED, fontSize: 11, padding: '3px 6px' }}>+{parsedManual.length - 20} more</span>
              )}
            </div>
          )}
        </>
      )}

      <div style={{
        marginTop: 20, padding: '14px 18px',
        background: ready ? 'rgba(210,255,29,0.08)' : C.ELEVATED,
        border: `1px solid ${ready ? C.ACCENT : C.BORDER}`,
        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 18 }}>
            {previewLoading ? 'Counting…' : `${displayCount.toLocaleString()} recipient${displayCount === 1 ? '' : 's'}`}
          </div>
          <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 2 }}>
            {state.sourceKind === 'quiz'
              ? (state.sourceQuizId ? 'Live preview · updates as you filter' : 'Pick a quiz to see recipients')
              : (parsedManual.length > 0 ? 'Parsed and deduped from your list' : 'Upload a file or paste addresses')}
          </div>
        </div>
        <PrimaryButton onClick={onNext} disabled={!ready}>Continue →</PrimaryButton>
      </div>
    </div>
  );
}

function QuizCard({ quiz, active, onClick }: { quiz: SourceQuiz; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', cursor: 'pointer', position: 'relative',
      background: active ? 'rgba(210,255,29,0.10)' : C.ELEVATED,
      border: `1px solid ${active ? C.ACCENT : C.BORDER}`,
      borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: active ? C.ACCENT : 'rgba(210,255,29,0.12)',
          color: active ? '#0a0a0a' : C.ACCENT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700,
        }}>{(quiz.title || quiz.slug || '?').charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {quiz.title || quiz.slug}
          </div>
          <div style={{ color: C.TEXT_MUTED, fontSize: 11, marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
            /{quiz.slug}
          </div>
        </div>
        {active && <div style={{ color: C.ACCENT, fontSize: 16, fontWeight: 700 }}>✓</div>}
      </div>
    </button>
  );
}

function EmptyQuizzesCard() {
  return (
    <div style={{
      padding: '36px 24px', textAlign: 'center',
      background: C.ELEVATED, border: `1px dashed ${C.BORDER}`, borderRadius: 12,
    }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
      <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 16, marginBottom: 6 }}>No quizzes yet</div>
      <div style={{ color: C.TEXT_SUBTLE, fontSize: 13, marginBottom: 18 }}>
        You need a published quiz collecting leads before you can email them.
      </div>
      <Link href="/dashboard/quizzes/new" style={{
        display: 'inline-block', background: C.ACCENT, color: '#0a0a0a',
        padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none',
      }}>Create a quiz →</Link>
    </div>
  );
}

function SourceChip({ active, onClick, title, sub, icon }: { active: boolean; onClick: () => void; title: string; sub: string; icon: string }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, textAlign: 'left', display: 'flex', gap: 12, alignItems: 'start',
      background: active ? 'rgba(210,255,29,0.10)' : C.ELEVATED,
      border: `1px solid ${active ? C.ACCENT : C.BORDER}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div>
        <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 4 }}>{sub}</div>
      </div>
    </button>
  );
}

const Label = ({ children }: any) => (
  <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 600 }}>{children}</div>
);
const MiniLabel = ({ children }: any) => (
  <div style={{ color: C.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{children}</div>
);
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: C.SURFACE,
  border: `1px solid ${C.BORDER}`, borderRadius: 10, color: C.TEXT, fontSize: 13, boxSizing: 'border-box',
};
