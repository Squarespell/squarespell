'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DASHBOARD_COLORS as C } from '../../../_components/DashboardShell';
import { PrimaryButton } from '../../../_components/PageShell';
import { Select } from '../../../_components/Select';
import {
  listSourceQuizzes, listOutcomesForQuiz, listQuestionsForQuiz, previewRecipients,
  SourceQuiz, SourceFilters, QuizQuestion, QuizOutcome, AnswerFilter,
} from '../../../../../lib/emails';

export type AudienceState = {
  sourceKind: 'quiz' | 'manual';
  sourceQuizId: string;
  filters: SourceFilters;
  manualRecipients: string;
};

var EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/* ---- Focus-highlight style injected once ---- */
var FOCUS_STYLE_ID = 'sq-audience-focus';
function injectFocusStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FOCUS_STYLE_ID)) return;
  var style = document.createElement('style');
  style.id = FOCUS_STYLE_ID;
  style.textContent = [
    '.sq-input:focus { border-color: ' + C.ACCENT + ' !important; box-shadow: 0 0 0 3px rgba(13,115,119,0.13) !important; outline: none !important; }',
    '.sq-input::placeholder { color: ' + C.TEXT_MUTED + '; }',
    '.sq-textarea:focus { border-color: ' + C.ACCENT + ' !important; box-shadow: 0 0 0 3px rgba(13,115,119,0.13) !important; outline: none !important; }',
    '.sq-date-input:focus-within { border-color: ' + C.ACCENT + ' !important; box-shadow: 0 0 0 3px rgba(13,115,119,0.13) !important; }',
  ].join('\n');
  document.head.appendChild(style);
}

/* ---- Styled date picker wrapper ---- */
function DatePicker(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  var inputRef = useRef<HTMLInputElement>(null);
  var display = props.value ? formatDateDisplay(props.value) : '';
  return (
    <div
      className="sq-date-input"
      onClick={function() { if (inputRef.current) inputRef.current.showPicker(); }}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '10px 12px', background: C.SURFACE,
        border: '1px solid ' + C.BORDER, borderRadius: 10,
        cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={props.value ? C.ACCENT : C.TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span style={{ flex: 1, color: display ? C.TEXT : C.TEXT_MUTED, fontSize: 13 }}>
        {display || props.placeholder || 'Pick a date'}
      </span>
      {props.value && (
        <button
          onClick={function(e) { e.stopPropagation(); props.onChange(''); }}
          style={{
            background: 'none', border: 'none', padding: 2, cursor: 'pointer',
            color: C.TEXT_MUTED, display: 'flex', alignItems: 'center',
          }}
          title="Clear date"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <input
        ref={inputRef}
        type="date"
        value={props.value || ''}
        onChange={function(e) { props.onChange(e.target.value || ''); }}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer',
        }}
        tabIndex={-1}
      />
    </div>
  );
}

function formatDateDisplay(iso: string): string {
  if (!iso) return '';
  try {
    var parts = iso.split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10) + ', ' + parts[0];
  } catch (e) { return iso; }
}

/* ---- Clean filters: strip empty/undefined values so backend doesn't get confused ---- */
function cleanFilters(f: SourceFilters): SourceFilters {
  var out: any = {};
  if (f.outcome_id) out.outcome_id = f.outcome_id;
  if (typeof f.min_score === 'number') out.min_score = f.min_score;
  if (typeof f.max_score === 'number') out.max_score = f.max_score;
  if (f.since && f.since.length > 0) out.since = f.since;
  if (f.until && f.until.length > 0) out.until = f.until;
  if (Array.isArray(f.answer_filters) && f.answer_filters.length > 0) {
    var valid = f.answer_filters.filter(function(af) { return af.question_id && af.value; });
    if (valid.length > 0) out.answer_filters = valid;
  }
  if (Array.isArray(f.exclude_outcome_ids) && f.exclude_outcome_ids.length > 0) {
    out.exclude_outcome_ids = f.exclude_outcome_ids;
  }
  if (f.exclude_already_emailed) out.exclude_already_emailed = true;
  return out;
}

export function AudienceStep({
  state, setState, onNext, onBack,
}: {
  state: AudienceState;
  setState: (u: Partial<AudienceState>) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  var [quizzes, setQuizzes] = useState<SourceQuiz[] | null>(null);
  var [quizError, setQuizError] = useState<string | null>(null);
  var [outcomes, setOutcomes] = useState<QuizOutcome[]>([]);
  var [questions, setQuestions] = useState<QuizQuestion[]>([]);
  var [count, setCount] = useState<number | null>(null);
  var [previewLoading, setPreviewLoading] = useState(false);
  var [previewError, setPreviewError] = useState<string | null>(null);
  var [search, setSearch] = useState('');
  var [dragOver, setDragOver] = useState(false);
  var [uploadName, setUploadName] = useState<string | null>(null);
  var [uploadError, setUploadError] = useState<string | null>(null);
  var fileRef = useRef<HTMLInputElement>(null);

  useEffect(function() { injectFocusStyles(); }, []);

  useEffect(function() {
    listSourceQuizzes()
      .then(function(qs) { setQuizzes(qs); setQuizError(null); })
      .catch(function(err) { setQuizzes([]); setQuizError(err?.message || 'Could not load quizzes'); });
  }, []);

  useEffect(function() {
    if (!state.sourceQuizId) { setOutcomes([]); setQuestions([]); return; }
    listOutcomesForQuiz(state.sourceQuizId).then(setOutcomes).catch(function() { setOutcomes([]); });
    listQuestionsForQuiz(state.sourceQuizId).then(setQuestions).catch(function() { setQuestions([]); });
  }, [state.sourceQuizId]);

  useEffect(function() {
    if (state.sourceKind !== 'quiz' || !state.sourceQuizId) { setCount(null); setPreviewError(null); return; }
    var cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    var cleaned = cleanFilters(state.filters);
    previewRecipients(state.sourceQuizId, cleaned)
      .then(function(r) { if (!cancelled) { setCount(r.count); setPreviewError(null); } })
      .catch(function(err) { if (!cancelled) { setCount(0); setPreviewError(err?.message || 'Preview failed'); } })
      .finally(function() { if (!cancelled) setPreviewLoading(false); });
    return function() { cancelled = true; };
  }, [state.sourceQuizId, state.sourceKind, JSON.stringify(state.filters)]);

  var parsedManual = useMemo(function() {
    var hits = (state.manualRecipients.match(EMAIL_RE) || []).map(function(s) { return s.toLowerCase(); });
    return Array.from(new Set(hits));
  }, [state.manualRecipients]);

  var ready = state.sourceKind === 'quiz' ? !!count && count > 0 : parsedManual.length > 0;
  var displayCount = state.sourceKind === 'quiz' ? (count ?? 0) : parsedManual.length;

  var filteredQuizzes = (quizzes || []).filter(function(q) {
    return !search || (q.title || q.slug || '').toLowerCase().includes(search.toLowerCase());
  });

  var handleFile = async function(file: File) {
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) { setUploadError('File too large (max 5MB)'); return; }
    try {
      var text = await file.text();
      var emails = (text.match(EMAIL_RE) || []).map(function(s) { return s.toLowerCase(); });
      var unique = Array.from(new Set(emails));
      if (unique.length === 0) { setUploadError('No valid email addresses found'); return; }
      setState({ manualRecipients: unique.join('\n') });
      setUploadName(file.name + ' - ' + unique.length + ' emails');
    } catch (e: any) { setUploadError('Could not read file: ' + e.message); }
  };

  return (
    <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 16, padding: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.TEXT }}>Who gets this email?</h2>
      <p style={{ margin: '0 0 24px', color: C.TEXT_SUBTLE, fontSize: 14 }}>
        Send to quiz leads with optional filters, or upload a list of email addresses.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <SourceChip active={state.sourceKind === 'quiz'} onClick={function() { setState({ sourceKind: 'quiz' }); }}
          icon={<IconUsers />} title="Leads from a quiz" sub="Everyone who finished, with optional filters" />
        <SourceChip active={state.sourceKind === 'manual'} onClick={function() { setState({ sourceKind: 'manual' }); }}
          icon={<IconUpload />} title="Upload a list" sub="Drop a CSV, Excel, or text file" />
      </div>

      {state.sourceKind === 'quiz' ? (
        quizzes === null ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>Loading your quizzes...</div>
        ) : quizzes.length === 0 ? (
          <EmptyQuizzesCard error={quizError} />
        ) : (
          <>
            {/* If quiz was pre-selected from Setup step, show selected quiz banner instead of grid */}
            {state.sourceQuizId ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                background: C.ACCENT_LIGHT, border: '1px solid ' + C.ACCENT,
                borderRadius: 12, marginBottom: 20,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: C.ACCENT, color: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700,
                }}>
                  {((quizzes.find(function(q) { return q.id === state.sourceQuizId; }) || {} as any).title || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 14 }}>
                    {(quizzes.find(function(q) { return q.id === state.sourceQuizId; }) || {} as any).title || 'Selected quiz'}
                  </div>
                  <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginTop: 2 }}>
                    Selected in setup - filters below let you narrow the audience
                  </div>
                </div>
                <button
                  onClick={function() { setState({ sourceQuizId: '', filters: {} }); }}
                  style={{
                    background: 'none', border: '1px solid ' + C.BORDER, borderRadius: 8,
                    padding: '6px 12px', color: C.TEXT_MUTED, fontSize: 12, cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Change quiz
                </button>
                <div style={{ color: C.ACCENT }}><IconCheck size={18} /></div>
              </div>
            ) : (
              <>
                {quizzes.length > 5 && (
                  <input
                    className="sq-input"
                    value={search}
                    onChange={function(e) { setSearch(e.target.value); }}
                    placeholder={'Search ' + quizzes.length + ' quizzes'}
                    style={Object.assign({}, inputStyle, { marginBottom: 12 })}
                  />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {filteredQuizzes.map(function(q) {
                    return (
                      <QuizCard key={q.id} quiz={q}
                        active={state.sourceQuizId === q.id}
                        onClick={function() { setState({ sourceQuizId: q.id, filters: {} }); }} />
                    );
                  })}
                  {filteredQuizzes.length === 0 && (
                    <div style={{ color: C.TEXT_MUTED, fontSize: 13, padding: 20, textAlign: 'center', gridColumn: '1 / -1' }}>
                      No quizzes match "{search}"
                    </div>
                  )}
                </div>
              </>
            )}

            {state.sourceQuizId && (
              <div style={{ background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 12, padding: 16, marginBottom: 4 }}>
                <Label>Refine (optional)</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <MiniLabel>Result</MiniLabel>
                    <Select
                      value={state.filters.outcome_id || ''}
                      onChange={function(v) { setState({ filters: Object.assign({}, state.filters, { outcome_id: v || undefined }) }); }}
                      placeholder="Any result"
                      options={[
                        { value: '', label: 'Any result' },
                      ].concat(outcomes.map(function(o) { return { value: o.id, label: o.name }; }))}
                    />
                  </div>
                  <div>
                    <MiniLabel>Min score</MiniLabel>
                    <input className="sq-input" type="number" value={state.filters.min_score ?? ''}
                      onChange={function(e) { setState({ filters: Object.assign({}, state.filters, { min_score: e.target.value ? Number(e.target.value) : undefined }) }); }}
                      placeholder="0"
                      style={inputStyle} />
                  </div>
                  <div>
                    <MiniLabel>Max score</MiniLabel>
                    <input className="sq-input" type="number" value={state.filters.max_score ?? ''}
                      onChange={function(e) { setState({ filters: Object.assign({}, state.filters, { max_score: e.target.value ? Number(e.target.value) : undefined }) }); }}
                      placeholder="100"
                      style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div>
                    <MiniLabel>From date</MiniLabel>
                    <DatePicker
                      value={state.filters.since || ''}
                      onChange={function(v) { setState({ filters: Object.assign({}, state.filters, { since: v || undefined }) }); }}
                      placeholder="Any time"
                    />
                  </div>
                  <div>
                    <MiniLabel>Until date</MiniLabel>
                    <DatePicker
                      value={state.filters.until || ''}
                      onChange={function(v) { setState({ filters: Object.assign({}, state.filters, { until: v || undefined }) }); }}
                      placeholder="Now"
                    />
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
                    {(state.filters.answer_filters || []).map(function(af, idx) {
                      var q = questions.find(function(qq) { return qq.id === af.question_id; });
                      return (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                          <div>
                            <MiniLabel>Question</MiniLabel>
                            <Select
                              value={af.question_id}
                              onChange={function(v) {
                                var updated = (state.filters.answer_filters || []).slice();
                                updated[idx] = { question_id: v, value: '' };
                                setState({ filters: Object.assign({}, state.filters, { answer_filters: updated }) });
                              }}
                              placeholder="Pick a question"
                              options={[
                                { value: '', label: 'Pick a question' },
                              ].concat(questions.filter(function(qq) { return qq.options.length > 0; }).map(function(qq) {
                                return { value: qq.id, label: qq.text };
                              }))}
                            />
                          </div>
                          <div>
                            <MiniLabel>Answered</MiniLabel>
                            <Select
                              value={af.value}
                              onChange={function(v) {
                                var updated = (state.filters.answer_filters || []).slice();
                                updated[idx] = Object.assign({}, updated[idx], { value: v });
                                setState({ filters: Object.assign({}, state.filters, { answer_filters: updated }) });
                              }}
                              placeholder="Pick an answer"
                              options={[
                                { value: '', label: 'Pick an answer' },
                              ].concat((q?.options || []).map(function(o) {
                                return { value: o.id, label: o.text };
                              }))}
                            />
                          </div>
                          <button
                            onClick={function() {
                              var updated = (state.filters.answer_filters || []).filter(function(_, i) { return i !== idx; });
                              setState({ filters: Object.assign({}, state.filters, { answer_filters: updated.length > 0 ? updated : undefined }) });
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
                      onClick={function() {
                        var current = state.filters.answer_filters || [];
                        setState({ filters: Object.assign({}, state.filters, { answer_filters: current.concat([{ question_id: '', value: '' }]) }) });
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

            {/* Exclude section */}
            {state.sourceQuizId && (
              <div style={{ background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 12, padding: 16, marginTop: 12 }}>
                <Label>Exclude (optional)</Label>
                <div style={{ color: C.TEXT_SUBTLE, fontSize: 12, marginBottom: 12 }}>
                  Remove specific leads from this send.
                </div>

                {/* Exclude by outcome */}
                {outcomes.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <MiniLabel>Exclude by result</MiniLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {outcomes.map(function(o) {
                        var excluded = (state.filters.exclude_outcome_ids || []).indexOf(o.id) >= 0;
                        return (
                          <button
                            key={o.id}
                            onClick={function() {
                              var current = state.filters.exclude_outcome_ids || [];
                              var next = excluded
                                ? current.filter(function(eid) { return eid !== o.id; })
                                : current.concat([o.id]);
                              setState({ filters: Object.assign({}, state.filters, { exclude_outcome_ids: next.length > 0 ? next : undefined }) });
                            }}
                            style={{
                              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                              cursor: 'pointer',
                              background: excluded ? '#fee2e2' : 'transparent',
                              color: excluded ? '#dc2626' : C.TEXT_MUTED,
                              border: '1px solid ' + (excluded ? '#fca5a5' : C.BORDER),
                            }}
                          >
                            {excluded ? <><IconX size={10} /> </> : null}{o.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Exclude already emailed */}
                <div>
                  <button
                    onClick={function() {
                      setState({ filters: Object.assign({}, state.filters, { exclude_already_emailed: !state.filters.exclude_already_emailed }) });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                      background: state.filters.exclude_already_emailed ? '#f0fdf4' : 'transparent',
                      border: '1px solid ' + (state.filters.exclude_already_emailed ? '#86efac' : C.BORDER),
                      borderRadius: 8, cursor: 'pointer', fontSize: 12, color: C.TEXT,
                      width: '100%', textAlign: 'left' as any,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: '2px solid ' + (state.filters.exclude_already_emailed ? '#22c55e' : C.BORDER),
                      background: state.filters.exclude_already_emailed ? '#22c55e' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {state.filters.exclude_already_emailed && (
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>Exclude already emailed</div>
                      <div style={{ color: C.TEXT_SUBTLE, fontSize: 11, marginTop: 2 }}>
                        Skip leads who received a previous campaign from this quiz
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        <>
          <div
            onDragOver={function(e) { e.preventDefault(); setDragOver(true); }}
            onDragLeave={function() { setDragOver(false); }}
            onDrop={function(e) {
              e.preventDefault(); setDragOver(false);
              var f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
            }}
            onClick={function() { if (fileRef.current) fileRef.current.click(); }}
            style={{
              border: '2px dashed ' + (dragOver ? C.ACCENT : C.BORDER),
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
              {uploadName ? 'Click to replace' : 'or click to browse - we extract the email column automatically'}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,.tsv"
              onChange={function(e) { var f = e.target.files?.[0]; if (f) handleFile(f); }}
              style={{ display: 'none' }} />
          </div>
          {uploadError && <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 10 }}>{uploadError}</div>}

          <details style={{ marginBottom: 12 }}>
            <summary style={{ color: C.TEXT_SUBTLE, fontSize: 12, cursor: 'pointer', userSelect: 'none' as any }}>
              Or paste addresses directly
            </summary>
            <textarea
              className="sq-textarea"
              value={state.manualRecipients}
              onChange={function(e) { setState({ manualRecipients: e.target.value }); }}
              placeholder={'alice@example.com, bob@example.com\ncarol@example.com'}
              style={Object.assign({}, inputStyle, { minHeight: 100, resize: 'vertical' as any, marginTop: 8, fontFamily: 'ui-monospace, monospace', fontSize: 12 })}
            />
          </details>

          {parsedManual.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {parsedManual.slice(0, 20).map(function(e) {
                return (
                  <span key={e} style={{ background: C.ELEVATED, border: '1px solid ' + C.BORDER, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: C.TEXT_SUBTLE }}>
                    {e}
                  </span>
                );
              })}
              {parsedManual.length > 20 && (
                <span style={{ color: C.TEXT_MUTED, fontSize: 11, padding: '3px 6px' }}>+{parsedManual.length - 20} more</span>
              )}
            </div>
          )}
        </>
      )}

      {/* Recipient count + Continue bar */}
      <div style={{
        marginTop: 20, padding: '14px 18px',
        background: ready ? C.ACCENT_LIGHT : C.ELEVATED,
        border: '1px solid ' + (ready ? C.ACCENT : C.BORDER),
        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: C.TEXT, fontWeight: 600, fontSize: 18 }}>
            {previewLoading ? 'Counting...' : displayCount.toLocaleString() + ' recipient' + (displayCount === 1 ? '' : 's')}
          </div>
          <div style={{ color: previewError ? '#ff6b6b' : C.TEXT_SUBTLE, fontSize: 12, marginTop: 2 }}>
            {previewError
              ? 'Could not load recipients - check your connection and try again'
              : state.sourceKind === 'quiz'
                ? (state.sourceQuizId ? 'Live preview - updates as you filter' : 'Pick a quiz to see recipients')
                : (parsedManual.length > 0 ? 'Parsed and deduped from your list' : 'Upload a file or paste addresses')}
          </div>
          {state.sourceKind === 'quiz' && count === 0 && !previewLoading && !previewError && state.sourceQuizId && (
            <div style={{ color: '#e6930a', fontSize: 12, marginTop: 4 }}>
              {(state.filters.since || state.filters.until || state.filters.outcome_id)
                ? 'Your filters may be too restrictive - try removing the date range or result filter'
                : 'This quiz has no leads yet, or all leads have been unsubscribed'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {onBack && (
            <button onClick={onBack} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid ' + C.BORDER,
              background: 'transparent', color: C.TEXT_MUTED, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Back</button>
          )}
          <PrimaryButton onClick={onNext} disabled={!ready}>Continue</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz, active, onClick }: { quiz: SourceQuiz; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left' as any, cursor: 'pointer', position: 'relative' as any,
      background: active ? C.ACCENT_LIGHT : C.ELEVATED,
      border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
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
          {typeof quiz.lead_count === 'number' && (
            <div style={{ color: C.TEXT_SUBTLE, fontSize: 11, marginTop: 3 }}>
              {quiz.lead_count} lead{quiz.lead_count === 1 ? '' : 's'}
            </div>
          )}
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
      background: C.ELEVATED, border: '1px dashed ' + C.BORDER, borderRadius: 12,
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
      flex: 1, textAlign: 'left' as any, display: 'flex', gap: 12, alignItems: 'start',
      background: active ? C.ACCENT_LIGHT : C.ELEVATED,
      border: '1px solid ' + (active ? C.ACCENT : C.BORDER),
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

var Label = function({ children }: any) {
  return (
    <div style={{ color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 10, fontWeight: 600 }}>{children}</div>
  );
};
var MiniLabel = function({ children }: any) {
  return (
    <div style={{ color: C.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase' as any, letterSpacing: 0.5, marginBottom: 5 }}>{children}</div>
  );
};
var inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: C.SURFACE,
  border: '1px solid ' + C.BORDER, borderRadius: 10, color: C.TEXT, fontSize: 13,
  boxSizing: 'border-box' as any, transition: 'border-color 0.15s, box-shadow 0.15s',
};
