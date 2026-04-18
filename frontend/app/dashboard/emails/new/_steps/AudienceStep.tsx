'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { PrimaryButton } from '../../../_components/PageShell';
import {
  listSourceQuizzes, listOutcomesForQuiz, listQuestionsForQuiz, previewRecipients,
  SourceQuiz, SourceFilters, QuizQuestion, AnswerFilter,
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
  const [quizError, setQuizError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSourceQuizzes()
      .then(qs => { setQuizzes(qs); setQuizError(null); })
      .catch(err => { setQuizzes([]); setQuizError(err?.message || 'Could not load quizzes'); });
  }, []);

  useEffect(() => {
    if (!state.sourceQuizId) { setOutcomes([]); setQuestions([]); return; }
    listOutcomesForQuiz(state.sourceQuizId).then(setOutcomes).catch(() => setOutcomes([]));
    listQuestionsForQuiz(state.sourceQuizId).then(setQuestions).catch(() => setQuestions([]));
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
      setUploadName(`${file.name} · ${unique.length} emails`);
    } catch (e: any) { setUploadError('Could not read file: ' + e.message); }
  };

  return (
    <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.TEXT }}>Who gets this email?</h2>
      <p style={{ margin: '0 0 24px', color: C.TEXT_SUBTLE, fontSize: 14 }}>
        Send to quiz leads with optional filters, or upload a list of email addresses.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <SourceChip active={state.sourceKind === 'quiz'} onClick={() => setState({ sourceKind: 'quiz' })}
          icon={<IconUsers />} title="Leads from a quiz" sub="Everyone who finished, with optional filters" />
        <SourceChip active={state.sourceKind === 'manual'} onClick={() => setState({ sourceKind: 'manual' })}
          icon={<IconUpload />} title="Upload a list" sub="Drop a CSV, Excel, or text file" />
      </div>

      {state.sourceKind === 'quiz' ? (
        quizzes === null ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>Loading your quizzes&hellip;</div>
        ) : quizzes.length === 0 ? (
          <EmptyQuizzesCard error={quizError} />
        ) : (
          <>
            {quizzes.length > 5 && (
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${quizzes.length} quizzes`}
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
                  No quizzes match &ldquo;{search}&rdquo;
                </div>
              )}
            </div>

            {state.sourceQuizId && (
              <div style={{ background: C.ELEVATED, border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: 16, marginBottom: 4 }}>
                <Label>Refine (optional)</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <MiniLabel>Result</MiniLabel>
  2                 <select value={state.filters.outcome_id || ''}
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

                {questions.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid ' + C.BORDER, margin: '14px 0 10px', paddingTop: 12 }}>
                      <Label>Segment by answer</Label>
                      <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginBottom: 10 }}>
                        Only include leads who gave a specific answer to a question.
                      </div>
                    </div>
                    {(state.filters.answer_filters || []).map(function (af, idx) {
                      const q = questions.find(function (qq) { return qq.id === af.question_id; });
                      return (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                          <div>
                            <MiniLabel>Question</MiniLabel>
                            <select
                              value={af.question_id}
                              onChange={function (e) {
                                var updated = (state.filters.answer_filters || []).slice();
                                updated[idx] = { question_id: e.target.value, value: '' };
                                setState({ filters: { ...state.filters, answer_filters: updated } });
                              }}
                              style={inputStyle}
                            >
                              <option value="">Pick a question</option>
                              {questions.filter(function (qq) { return qq.options.length > 0; }).map(function (qq) {
                                return <option key={qq.id} value={qq.id}>{qq.text}</option>;
                              })}
                            </select>
                          </div>
                          <div>
                            <MiniLabel>Answered</MiniLabel>
                            <select
                              value={af.value}
                              onChange={function (e) {
                                var updated = (state.filters.answer_filters || []).slice();
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setState({ filters: { ...state.filters, answer_filters: updated } });
                              }}
                              style={inputStyle}
                            >
                              <option value="">Pick an answer</option>
                              {(q?.options || []).map(function (o) {
                                return <option key={o.id} value={o.id}>{o.text}</option>;
                              })}
                            </select>
                          </div>
                          <button
                            onClick={function () {
                              var updated = (state.filters.answer_filters || []).filter(function (_, i) { return i !== idx; });
                              setState({ filters: { ...state.filters, answer_filters: updated.length > 0 ? updated : undefined } });
                            }}
                            style={{
                              padding: '8px 10px', background: 'transparent', border: '1px solid ' + C.BORDER,
                              borderRadius: 8, color: C.TEXT_MUTED, cursor: 'pointer', fontSize: 12,
                            }}
                            title="Remove filter"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={function () {
                        var current = state.filters.answer_filters || [];
                        setState({ filters: { ...state.filters, answer_filters: current.concat([{ question_id: '', value: '' }]) } });
                      }}
                      style={{
                        padding: '7px 14px', background: 'transparent', border: '1px dashed ' + C.BORDER,
                        borderRadius: 8, color: C.ACCENT, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <IconPlus size={12} /> Add answer filter
                    </button>
                  </>
                )}
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
              background: dragOver ? C.ACCENT_LIGHT : C.ELEVATED,
              borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
              marginBottom: 16, transition: 'all 0.15s',
            }}
          >
            <div style={{ marginBottom: 10, color: C.ACCENT, display: 'flex', justifyContent: 'center' }}><IconFile size={28} /></div>
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
        background: ready ? C.ACCENT_LIGHT : C.ELEVATED,
        border: `1px solid ${ready ? C.ACCENT : C.BORDER}`,
        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 18 }}>
            {previewLoading ? 'Counting\u2026' : `${displayCount.toLocaleString()} recipient${displayCount === 1 ? '' : 's'}`}
          </div>
          <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 2 }}>
            {state.sourceKind === 'quiz'
              ? (state.sourceQuizId ? 'Live preview · updates as you filter' : 'Pick a quiz to see recipients')
              : (parsedManual.length > 0 ? 'Parsed and deduped from your list' : 'Upload a file or paste addresses')}
          </div>
        </div>
        <PrimaryButton onClick={onNext} disabled={!ready}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

function QuizCard({ quiz, active, onClick }: { quiz: SourceQuiz; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', cursor: 'pointer', position: 'relative',
      background: active ? C.ACCENT_LIGHT : C.ELEVATED,
      border: `1px solid ${active ? C.ACCENT : C.BORDER}`,
      borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: active ? C.ACCENT : C.ACCENT_LIGHT,
          color: active ? '#FFFFFF' : C.ACCENT,
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
        {active && <div style={{ color: C.ACCENT }}><IconCheck size={16} /></div>}
      </div>
    </button>
  );
}

function EmptyQuizzesCard({ error }: { error?: string | null }) {
  return (
    <div style={{
      padding: '28px 24px', textAlign: 'center',
      background: C.ELEVATED, border: `1px dashed ${C.BORDER}`, borderRadius: 12,
    }}>
      <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No quizzes found</div>
      <div style={{ color: C.TEXT_SUBTLE, fontSize: 13 }}>
        {error
          ? 'We could not reach the server. Try refreshing, or switch to upload a list.'
          : 'Either you have not published a quiz yet, or none of your quizzes have collected leads. Switch to Upload a list above to send to a CSV instead.'}
      </div>
    </div>
  );
}

function SourceChip({ active, onClick, title, sub, icon }: { active: boolean; onClick: () => void; title: string; sub: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, textAlign: 'left', display: 'flex', gap: 12, alignItems: 'start',
      background: active ? C.ACCENT_LIGHT : C.ELEVATED,
      border: `1px solid ${active ? C.ACCENT : C.BORDER}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: active ? C.ACCENT : C.ACCENT_LIGHT,
        color: active ? '#FFFFFF' : C.ACCENT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div>
        <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 4 }}>{sub}</div>
      </div>
    </button>
  );
}

function IconUsers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconUpload({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconFile({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconCheck({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconX({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
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
