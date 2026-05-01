'use client';

/**
 * QuizBlockEditor — immersive fullscreen quiz editor.
 *
 * Layout: Icon rail (64px) | Immersive canvas | Inline settings panel (380px)
 * Floating toolbar at bottom for quick actions.
 * Shows one question at a time in a beautiful, embed-accurate rendering.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { DASHBOARD_COLORS as C } from './DashboardShell';
import {
  QuizBlock,
  QuizBlockType,
  QuestionBlock,
  HeadingBlock,
  TextBlock,
  ImageBlock,
  OutcomeBlock,
  LeadGateBlock,
  LogicBlock,
  BranchRule,
  AnswerLayout,
  QUIZ_PALETTE,
  createDefaultQuizBlock,
  uid,
} from '../../../lib/quiz/blocks';

/* ------------------------------------------------------------------ */
/*  Types & Exports                                                    */
/* ------------------------------------------------------------------ */

export interface QuizSettings {
  shuffle_questions?: boolean;
  show_progress_bar?: boolean;
  transition_type?: 'slide' | 'fade' | 'scale' | 'none';
  remove_branding?: boolean;
  enable_recaptcha?: boolean;
  custom_css?: string;
}

export type UserPlan = 'free' | 'trial' | 'starter' | 'pro' | 'agency';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface QuizBlockEditorProps {
  blocks: QuizBlock[];
  onChange: (blocks: QuizBlock[]) => void;
  settings?: QuizSettings;
  onSettingsChange?: (settings: QuizSettings) => void;
  userPlan?: UserPlan;
  backUrl?: string;
  quizId?: string;
  quizSlug?: string;
  saveState?: SaveState;
}

var API_BASE = (typeof window !== 'undefined' && (window as any).__NEXT_PUBLIC_API_URL)
  || process.env.NEXT_PUBLIC_API_URL
  || 'https://squarespell-api.onrender.com';

var LETTERS = 'ABCDEFGHIJKLMNOP';

/* ------------------------------------------------------------------ */
/*  Plan gating                                                        */
/* ------------------------------------------------------------------ */

function hasPlanAccess(userPlan: UserPlan | undefined, required: 'starter' | 'pro' | 'agency'): boolean {
  var tiers: Record<string, number> = { free: 0, trial: 0, starter: 1, pro: 2, business: 3, agency: 3 };
  var userTier = tiers[userPlan || 'free'] ?? 0;
  var requiredTier = tiers[required] ?? 0;
  return userTier >= requiredTier;
}

function PlanBadge({ requiredPlan }: { requiredPlan: 'starter' | 'pro' | 'agency' }) {
  var colors: Record<string, { bg: string; text: string }> = {
    starter: { bg: '#EFF6FF', text: '#2563EB' },
    pro: { bg: '#F5F3FF', text: '#7C3AED' },
    agency: { bg: '#FFF7ED', text: '#EA580C' },
  };
  var c = colors[requiredPlan] || colors.pro;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: c.bg, color: c.text, textTransform: 'uppercase', letterSpacing: '0.04em',
      marginLeft: 6, verticalAlign: 'middle',
    }}>
      {requiredPlan}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Undo/redo history                                                  */
/* ------------------------------------------------------------------ */

var MAX_HISTORY = 50;

function useHistory(initial: QuizBlock[]) {
  var [stack, setStack] = useState<QuizBlock[][]>([initial]);
  var [index, setIndex] = useState(0);

  var current = stack[index] || initial;

  var push = useCallback(function(next: QuizBlock[]) {
    setStack(function(prev) {
      var newStack = prev.slice(0, index + 1);
      newStack.push(next);
      if (newStack.length > MAX_HISTORY) newStack = newStack.slice(newStack.length - MAX_HISTORY);
      return newStack;
    });
    setIndex(function(prev) { return Math.min(prev + 1, MAX_HISTORY - 1); });
  }, [index]);

  var undo = useCallback(function() {
    setIndex(function(prev) { return Math.max(prev - 1, 0); });
  }, []);

  var redo = useCallback(function() {
    setIndex(function(prev) { return Math.min(prev + 1, stack.length - 1); });
  }, [stack.length]);

  return { current: current, push: push, undo: undo, redo: redo, canUndo: index > 0, canRedo: index < stack.length - 1 };
}

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function blockLabel(b: QuizBlock): string {
  switch (b.type) {
    case 'question': return 'Question';
    case 'heading': return 'Heading';
    case 'text': return 'Text';
    case 'image': return 'Image';
    case 'divider': return 'Divider';
    case 'outcome': return 'Outcome';
    case 'leadGate': return 'Lead Gate';
    case 'logic': return 'Logic';
    default: return (b as any).type;
  }
}

function blockPreview(b: QuizBlock): string {
  switch (b.type) {
    case 'question': return (b as QuestionBlock).text || '';
    case 'heading': return (b as HeadingBlock).text || '';
    case 'text': return ((b as TextBlock).content || '').slice(0, 80);
    case 'outcome': return (b as OutcomeBlock).title || '';
    case 'leadGate': return (b as LeadGateBlock).headline || '';
    default: return '';
  }
}

function getClerkToken(): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).Clerk) {
    return (window as any).Clerk.session?.getToken().then(function(t: string) { return t || ''; }).catch(function() { return ''; });
  }
  return Promise.resolve('');
}

/* ------------------------------------------------------------------ */
/*  Question Flow Panel — timeline sidebar with connected flow line     */
/* ------------------------------------------------------------------ */

function QuestionFlowPanel({
  blocks,
  selectedId,
  onSelect,
  onAddQuestion,
  onAddBlock,
}: {
  blocks: QuizBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddQuestion: () => void;
  onAddBlock: (type: QuizBlockType) => void;
}) {
  var questionBlocks = blocks.filter(function(b) { return b.type === 'question'; });
  var outcomeBlocks = blocks.filter(function(b) { return b.type === 'outcome'; });
  var leadGateBlock = blocks.find(function(b) { return b.type === 'leadGate'; });
  var [showAddMenu, setShowAddMenu] = useState(false);

  function getQuestionProgress(q: QuestionBlock): number {
    if (!q.options || q.options.length === 0) return 0;
    var filled = q.options.filter(function(o) { return (o.text || '').trim().length > 0; }).length;
    return Math.round((filled / q.options.length) * 100);
  }

  return (
    <div style={{
      width: 280, minWidth: 280, background: C.SURFACE,
      borderRight: '1px solid ' + C.BORDER,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid ' + C.BORDER,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, letterSpacing: '-0.01em' }}>Question flow</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" onClick={onAddQuestion} title="Add question"
            style={{
              width: 26, height: 26, borderRadius: 6, border: '1px solid ' + C.BORDER,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: '#fff', color: C.TEXT_MUTED,
              transition: 'all 0.12s',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = C.ACCENT; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.ACCENT; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C.TEXT_MUTED; e.currentTarget.style.borderColor = C.BORDER; }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></svg>
          </button>
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={function() { setShowAddMenu(!showAddMenu); }} title="More options"
              style={{
                width: 26, height: 26, borderRadius: 6, border: '1px solid ' + C.BORDER,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: '#fff', color: C.TEXT_MUTED,
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <circle cx={12} cy={6} r={1.5} fill="currentColor" /><circle cx={12} cy={12} r={1.5} fill="currentColor" /><circle cx={12} cy={18} r={1.5} fill="currentColor" />
              </svg>
            </button>
            {showAddMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={function() { setShowAddMenu(false); }} />
                <div style={{
                  position: 'absolute', top: 32, right: 0,
                  background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 10,
                  padding: 4, minWidth: 170, zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}>
                  {(['outcome', 'leadGate', 'heading', 'text', 'image', 'divider', 'logic'] as QuizBlockType[]).map(function(t) {
                    var p = QUIZ_PALETTE.find(function(pp) { return pp.type === t; });
                    return (
                      <button key={t} type="button"
                        onClick={function() { onAddBlock(t); setShowAddMenu(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '7px 10px', border: 'none',
                          background: 'transparent', cursor: 'pointer', borderRadius: 6,
                          fontSize: 12, fontWeight: 500, color: C.TEXT,
                          fontFamily: C.FONT, transition: 'background 0.1s',
                        }}
                        onMouseEnter={function(e) { e.currentTarget.style.background = C.GRAY_50; }}
                        onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                          <path d={p?.icon || ''} />
                        </svg>
                        {p?.label || t}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable question list with timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {/* Timeline container */}
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {/* Vertical flow line */}
          {questionBlocks.length > 1 && (
            <div style={{
              position: 'absolute', left: 13, top: 22, bottom: 16,
              width: 1.5, background: '#E4E7EC',
            }} />
          )}

          {/* Question items */}
          {questionBlocks.map(function(qb, qi) {
            var q = qb as QuestionBlock;
            var isSelected = qb.id === selectedId;
            var progress = getQuestionProgress(q);
            var hasBranch = q.branchRules && q.branchRules.length > 0;
            var optCount = q.options ? q.options.length : 0;
            var isComplete = progress >= 100;
            var statusColor = isComplete ? '#16A34A' : (progress > 0 ? '#D97706' : '#98A2B3');
            var statusText = isComplete ? 'Complete' : (progress + '%');

            return (
              <div key={qb.id} style={{ position: 'relative', marginBottom: 2 }}>
                {/* Number circle on the flow line */}
                <div style={{
                  position: 'absolute', left: -21, top: 11,
                  width: 22, height: 22, borderRadius: '50%',
                  background: isSelected ? C.ACCENT : '#E4E7EC',
                  color: isSelected ? '#fff' : '#667085',
                  fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1, boxShadow: '0 0 0 3px ' + C.SURFACE,
                  transition: 'all 0.15s',
                }}>
                  {qi + 1}
                </div>

                {/* Card */}
                <button type="button"
                  onClick={function() { onSelect(qb.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    background: isSelected ? '#F0F9F7' : 'transparent',
                    transition: 'all 0.12s', fontFamily: C.FONT,
                  }}
                  onMouseEnter={function(e) { if (!isSelected) e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={function(e) { if (!isSelected) e.currentTarget.style.background = isSelected ? '#F0F9F7' : 'transparent'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: C.TEXT, lineHeight: 1.3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {q.text || 'Untitled question'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#98A2B3' }}>
                        {optCount} option{optCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: statusColor }}>
                        {statusText}
                      </span>
                    </div>
                  </div>

                  {/* Show thumbnail only when media exists */}
                  {q.mediaUrl && (
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {q.mediaType === 'video' ? (
                        <div style={{ width: '100%', height: '100%', background: '#1D2939', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="#fff" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </div>
                      ) : (
                        <img src={q.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </div>
                  )}

                  {/* Branch icon */}
                  {hasBranch && !q.mediaUrl && (
                    <div style={{ flexShrink: 0 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx={18} cy={18} r={3} /><circle cx={6} cy={6} r={3} /><path d="M6 21V9a9 9 0 009 9" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Divider before special blocks */}
        {(outcomeBlocks.length > 0 || leadGateBlock) && (
          <div style={{ height: 0.5, background: '#E4E7EC', margin: '8px 0 8px 28px' }} />
        )}

        {/* Lead gate + Outcomes section */}
        <div style={{ paddingLeft: 28 }}>
          {/* Lead gate */}
          {leadGateBlock && (
            <button type="button"
              onClick={function() { onSelect(leadGateBlock!.id); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10, border: 'none', width: '100%',
                cursor: 'pointer', textAlign: 'left',
                background: selectedId === leadGateBlock.id ? '#FFF7ED' : 'transparent',
                transition: 'all 0.12s', fontFamily: C.FONT,
              }}
              onMouseEnter={function(e) { if (selectedId !== leadGateBlock!.id) e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = selectedId === leadGateBlock!.id ? '#FFF7ED' : 'transparent'; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: '#FFF7ED',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={3} y={11} width={18} height={11} rx={2} /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>Lead gate</div>
                <div style={{ fontSize: 11, color: '#98A2B3' }}>Collect contact info</div>
              </div>
            </button>
          )}

          {/* Outcomes */}
          {outcomeBlocks.map(function(ob) {
            var o = ob as OutcomeBlock;
            var isSelected = ob.id === selectedId;
            return (
              <button key={ob.id} type="button"
                onClick={function() { onSelect(ob.id); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10, border: 'none', width: '100%',
                  cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? '#F0FDF4' : 'transparent',
                  transition: 'all 0.12s', fontFamily: C.FONT,
                }}
                onMouseEnter={function(e) { if (!isSelected) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={function(e) { e.currentTarget.style.background = isSelected ? '#F0FDF4' : 'transparent'; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7, background: '#F0FDF4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1={4} y1={22} x2={4} y2={15} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>{o.title || 'Outcome'}</div>
                  <div style={{ fontSize: 11, color: '#98A2B3' }}>Show results</div>
                </div>
              </button>
            );
          })}

          {/* + Add Outcome button */}
          <button type="button" onClick={function() { onAddBlock('outcome'); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8, border: '1px dashed #D0D5DD',
              background: 'transparent', cursor: 'pointer', width: '100%',
              fontSize: 12, fontWeight: 500, color: '#667085',
              fontFamily: C.FONT, transition: 'all 0.12s', marginTop: 4,
            }}
            onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.color = C.ACCENT; }}
            onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.color = '#667085'; }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></svg>
            Add outcome
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Score Badge — inline editable                                      */
/* ------------------------------------------------------------------ */

function ScoreBadge({ score, onChange }: { score: number; onChange: (s: number) => void }) {
  var [editing, setEditing] = useState(false);
  var [val, setVal] = useState(String(score || 0));

  useEffect(function() { setVal(String(score || 0)); }, [score]);

  if (editing) {
    return (
      <input
        type="number"
        value={val}
        autoFocus
        onChange={function(e) { setVal(e.target.value); }}
        onBlur={function() { onChange(parseInt(val) || 0); setEditing(false); }}
        onKeyDown={function(e) { if (e.key === 'Enter') { onChange(parseInt(val) || 0); setEditing(false); } }}
        onClick={function(e) { e.stopPropagation(); }}
        style={{
          width: 44, padding: '2px 4px', borderRadius: 6,
          border: '1px solid ' + C.ACCENT, fontSize: 11, fontWeight: 700,
          textAlign: 'center', outline: 'none', color: C.ACCENT,
          fontFamily: C.FONT, background: C.ACCENT_LIGHT,
        }}
      />
    );
  }

  return (
    <span
      onClick={function(e) { e.stopPropagation(); setEditing(true); }}
      title="Click to edit score"
      style={{
        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
        background: (score || 0) >= 3 ? 'rgba(13,115,119,0.12)' : 'rgba(0,0,0,0.04)',
        color: (score || 0) >= 3 ? C.ACCENT : C.TEXT_MUTED,
        border: '1px solid ' + ((score || 0) >= 3 ? 'rgba(13,115,119,0.2)' : 'rgba(0,0,0,0.06)'),
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      +{score || 0}pts
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Answer Option Row — hover controls                                 */
/* ------------------------------------------------------------------ */

function AnswerRow({
  opt,
  index,
  total,
  onChangeText,
  onChangeScore,
  onChangeImage,
  onClearImage,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  opt: any;
  index: number;
  total: number;
  onChangeText: (t: string) => void;
  onChangeScore: (s: number) => void;
  onChangeImage?: (url: string) => void;
  onClearImage?: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  var [hover, setHover] = useState(false);
  var [showPicker, setShowPicker] = useState(false);
  var [thumbHover, setThumbHover] = useState(false);
  var thumbRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="sq-answer-row"
      onMouseEnter={function() { setHover(true); }}
      onMouseLeave={function() { setHover(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 10,
        background: hover ? '#F9FAFB' : '#fff',
        border: '1px solid ' + C.BORDER,
        transition: 'all 0.12s',
        position: 'relative',
      }}
    >
      {/* Letter badge */}
      <span style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: C.ACCENT_LIGHT, color: C.ACCENT,
        fontSize: 12, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {LETTERS[index] || String(index + 1)}
      </span>

      {/* Thumbnail with hover overlay for replace/remove, or add-image button */}
      {opt.imageUrl ? (
        <div ref={thumbRef} style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}
          onMouseEnter={function() { setThumbHover(true); }}
          onMouseLeave={function() { setThumbHover(false); }}>
          <img src={opt.imageUrl} alt="" style={{
            width: 36, height: 36, borderRadius: 6, objectFit: 'cover', display: 'block',
          }} onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {thumbHover && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 6,
              background: 'rgba(0,0,0,0.55)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 2,
            }}>
              <button type="button" title="Replace" onClick={function(e) { e.stopPropagation(); setShowPicker(true); }}
                style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} /></svg>
              </button>
              {onClearImage && (
                <button type="button" title="Remove" onClick={function(e) { e.stopPropagation(); onClearImage(); }}
                  style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
                </button>
              )}
            </div>
          )}
        </div>
      ) : onChangeImage ? (
        <button ref={thumbRef as any} type="button" title="Add image" onClick={function(e) { e.stopPropagation(); setShowPicker(true); }}
          style={{
            width: 36, height: 36, borderRadius: 6, flexShrink: 0,
            border: '1px dashed ' + C.BORDER, background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.TEXT_MUTED, transition: 'border-color 0.12s',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.color = C.ACCENT; }}
          onMouseLeave={function(e) { e.currentTarget.style.borderColor = C.BORDER; e.currentTarget.style.color = C.TEXT_MUTED; }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={3} y={3} width={18} height={18} rx={2} ry={2} /><circle cx={8.5} cy={8.5} r={1.5} /><polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
      ) : null}

      {/* Answer image picker */}
      {showPicker && onChangeImage && (
        <AnswerImagePicker
          anchorEl={thumbRef.current}
          onSelect={function(url) { onChangeImage(url); setShowPicker(false); }}
          onClose={function() { setShowPicker(false); }}
        />
      )}

      {/* Editable text */}
      <input
        type="text"
        value={opt.text || ''}
        onChange={function(e) { onChangeText(e.target.value); }}
        onClick={function(e) { e.stopPropagation(); }}
        placeholder="Type answer..."
        style={{
          flex: 1, border: 'none', background: 'transparent',
          fontSize: 15, color: C.TEXT, outline: 'none',
          fontFamily: C.FONT, padding: '4px 0',
        }}
      />

      {/* Score badge */}
      <ScoreBadge score={opt.score || 0} onChange={onChangeScore} />

      {/* Hover actions */}
      {hover && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button type="button" disabled={index === 0} onClick={function(e) { e.stopPropagation(); onMoveUp(); }}
            style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? C.BORDER : C.TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button type="button" disabled={index >= total - 1} onClick={function(e) { e.stopPropagation(); onMoveDown(); }}
            style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: index >= total - 1 ? 'default' : 'pointer', color: index >= total - 1 ? C.BORDER : C.TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button type="button" disabled={total <= 2} onClick={function(e) { e.stopPropagation(); onDelete(); }}
            style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: total <= 2 ? 'default' : 'pointer', color: total <= 2 ? C.BORDER : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={function(e) { if (total > 2) e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Answer Image Picker — mini picker for answer option images          */
/*  Shows Upload + Browse (Pexels) tabs, positioned near click point   */
/* ------------------------------------------------------------------ */

function AnswerImagePicker({
  onSelect,
  onClose,
  anchorEl,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}) {
  var [tab, setTab] = useState<'upload' | 'browse'>('browse');
  var [pexelsQuery, setPexelsQuery] = useState('');
  var [pexelsResults, setPexelsResults] = useState<{ id: string; thumb: string; regular: string; alt: string }[]>([]);
  var [pexelsLoading, setPexelsLoading] = useState(false);
  var [uploading, setUploading] = useState(false);
  var fileRef = useRef<HTMLInputElement>(null);
  var [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(function() {
    var pickerWidth = 360;
    var pickerHeight = 340;
    if (anchorEl) {
      var rect = anchorEl.getBoundingClientRect();
      var leftPos = rect.left + rect.width / 2 - pickerWidth / 2;
      if (leftPos < 16) leftPos = 16;
      if (leftPos + pickerWidth > window.innerWidth - 16) leftPos = window.innerWidth - pickerWidth - 16;
      var topPos = rect.bottom + 8;
      if (topPos + pickerHeight > window.innerHeight - 16) topPos = rect.top - pickerHeight - 8;
      if (topPos < 16) topPos = 16;
      setPos({ top: topPos, left: leftPos });
    } else {
      setPos({
        top: Math.max(16, (window.innerHeight - pickerHeight) / 2),
        left: Math.max(16, (window.innerWidth - pickerWidth) / 2),
      });
    }
  }, []);

  useEffect(function() { searchPexels('abstract'); }, []);

  function searchPexels(query: string) {
    if (!query.trim()) return;
    setPexelsLoading(true);
    getClerkToken().then(function(token) {
      fetch(API_BASE + '/api/media/search?q=' + encodeURIComponent(query), {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      })
      .then(function(res) { return res.json(); })
      .then(function(data) { setPexelsResults(data.results || []); setPexelsLoading(false); })
      .catch(function() { setPexelsLoading(false); });
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    var file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('File too large. Max 20MB.'); return; }
    setUploading(true);
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = (reader.result as string).split(',')[1];
      getClerkToken().then(function(token) {
        fetch(API_BASE + '/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
          body: JSON.stringify({ data: base64, fileName: file.name, contentType: file.type }),
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { setUploading(false); if (data.url) { onSelect(data.url); onClose(); } })
        .catch(function(err) { setUploading(false); console.error('Upload error:', err); });
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 45 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: pos.top, left: pos.left,
        background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC',
        width: 360, padding: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT }}>Choose image</div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', padding: 4 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: '#F2F4F7', borderRadius: 9, padding: 3 }}>
          {(['upload', 'browse'] as const).map(function(t) {
            var active = tab === t;
            var label = t === 'upload' ? 'Upload' : 'Browse images';
            return (
              <button key={t} type="button" onClick={function() { setTab(t); }}
                style={{
                  flex: 1, padding: '6px 6px', borderRadius: 7, border: 'none',
                  background: active ? '#fff' : 'transparent', color: active ? C.TEXT : '#667085',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT,
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                {label}
              </button>
            );
          })}
        </div>
        {tab === 'upload' && (
          <>
            <button type="button" onClick={function() { fileRef.current?.click(); }}
              style={{
                width: '100%', padding: '22px 12px', borderRadius: 10,
                border: '2px dashed #D0D5DD', background: '#FAFBFC',
                cursor: uploading ? 'default' : 'pointer',
                fontSize: 12, fontWeight: 600, color: '#344054', fontFamily: C.FONT,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                opacity: uploading ? 0.6 : 1,
              }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} /></svg>
              {uploading ? 'Uploading...' : 'Click to upload'}
              <span style={{ fontSize: 10, color: '#98A2B3', fontWeight: 400 }}>PNG, JPG, GIF up to 20MB</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </>
        )}
        {tab === 'browse' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input type="text" value={pexelsQuery} onChange={function(e) { setPexelsQuery(e.target.value); }}
                placeholder="Search free photos..."
                onKeyDown={function(e) { if (e.key === 'Enter') searchPexels(pexelsQuery); }}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 12, fontFamily: C.FONT, outline: 'none' }} />
              <button type="button" onClick={function() { searchPexels(pexelsQuery); }}
                style={{ padding: '8px 12px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT }}>
                {pexelsLoading ? '...' : 'Search'}
              </button>
            </div>
            {pexelsResults.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, maxHeight: 200, overflowY: 'auto', borderRadius: 6 }}>
                {pexelsResults.map(function(img) {
                  return (
                    <button key={img.id} type="button" onClick={function() { onSelect(img.regular); onClose(); }}
                      style={{ padding: 0, border: '2px solid transparent', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: '#F2F4F7', transition: 'border-color 0.1s' }}
                      onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }}
                      onMouseLeave={function(e) { e.currentTarget.style.borderColor = 'transparent'; }}>
                      <img src={img.thumb} alt={img.alt} style={{ width: '100%', height: 65, objectFit: 'cover', display: 'block' }} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#98A2B3', fontSize: 12 }}>
                {pexelsLoading ? 'Loading...' : 'Search for free stock photos'}
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 10, color: '#98A2B3', textAlign: 'center' }}>Photos provided by Pexels</div>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid Answer Card (for grid / fullBackground layouts)               */
/* ------------------------------------------------------------------ */

function GridAnswerCard({
  opt,
  index,
  isFullBg,
  onChangeText,
  onChangeScore,
  onChangeImage,
  onClearImage,
  onDelete,
  total,
}: {
  opt: any;
  index: number;
  isFullBg: boolean;
  onChangeText: (t: string) => void;
  onChangeScore: (s: number) => void;
  onChangeImage: (url: string) => void;
  onClearImage: () => void;
  onDelete: () => void;
  total: number;
}) {
  var [hover, setHover] = useState(false);
  var [showPicker, setShowPicker] = useState(false);
  var cardRef = useRef<HTMLDivElement>(null);
  var fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    var file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('File too large. Max 20MB.'); return; }
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = (reader.result as string).split(',')[1];
      getClerkToken().then(function(token) {
        fetch(API_BASE + '/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
          body: JSON.stringify({ data: base64, fileName: file.name, contentType: file.type }),
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { if (data.url) { onChangeImage(data.url); setShowPicker(false); } })
        .catch(function(err) { console.error('Upload error:', err); });
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={function() { setHover(true); }}
      onMouseLeave={function() { setHover(false); }}
      style={{
        position: 'relative', borderRadius: 12, overflow: 'visible',
        border: '1px solid ' + C.BORDER, background: '#fff',
        transition: 'all 0.15s',
        boxShadow: hover ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Answer image picker modal */}
      {showPicker && (
        <AnswerImagePicker
          anchorEl={cardRef.current}
          onSelect={function(url) { onChangeImage(url); setShowPicker(false); }}
          onClose={function() { setShowPicker(false); }}
        />
      )}

      {/* Image area */}
      <div style={{
        height: isFullBg ? 160 : 120, background: opt.imageUrl ? 'transparent' : '#F2F4F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: opt.imageUrl ? 'default' : 'pointer',
        borderRadius: '12px 12px 0 0', overflow: 'hidden',
      }}
        onClick={function() { if (!opt.imageUrl) { setShowPicker(true); } }}
      >
        {opt.imageUrl ? (
          <img src={opt.imageUrl} alt={opt.text || ''} style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ color: C.TEXT_SUBTLE, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 4px' }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} />
            </svg>
            Add image
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        {isFullBg && opt.imageUrl && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            padding: '20px 14px 12px', color: '#fff',
          }}>
            <input type="text" value={opt.text || ''} onChange={function(e) { onChangeText(e.target.value); }}
              onClick={function(e) { e.stopPropagation(); }}
              placeholder="Answer..."
              style={{ width: '100%', border: 'none', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: C.FONT }} />
          </div>
        )}
        {/* Hover overlay with replace/remove image */}
        {hover && opt.imageUrl && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <button type="button" onClick={function(e) { e.stopPropagation(); setShowPicker(true); }}
              style={{
                padding: '5px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.92)', border: 'none',
                color: '#344054', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: C.FONT,
              }}>
              Replace
            </button>
            <button type="button" onClick={function(e) { e.stopPropagation(); onClearImage(); }}
              style={{
                padding: '5px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.92)', border: 'none',
                color: '#DC2626', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: C.FONT,
              }}>
              Remove
            </button>
          </div>
        )}
        {/* Delete option X (top-right, always show on hover) */}
        {hover && total > 2 && (
          <button type="button" onClick={function(e) { e.stopPropagation(); onDelete(); }}
            title="Delete option"
            style={{
              position: 'absolute', top: 6, right: 6, width: 22, height: 22,
              borderRadius: 5, background: opt.imageUrl ? 'transparent' : 'rgba(0,0,0,0.5)', border: 'none',
              color: '#fff', cursor: 'pointer', display: opt.imageUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
          </button>
        )}
      </div>

      {/* Text + score below image (non-fullBg) */}
      {!isFullBg && (
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: C.ACCENT_LIGHT, color: C.ACCENT,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{LETTERS[index]}</span>
          <input type="text" value={opt.text || ''} onChange={function(e) { onChangeText(e.target.value); }}
            onClick={function(e) { e.stopPropagation(); }}
            placeholder="Answer..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: C.TEXT, outline: 'none', fontFamily: C.FONT }} />
          <ScoreBadge score={opt.score || 0} onChange={onChangeScore} />
        </div>
      )}
      {isFullBg && (
        <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.ACCENT_LIGHT }}>{LETTERS[index]}</span>
          <ScoreBadge score={opt.score || 0} onChange={onChangeScore} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Thumbnail Answer Row (imageThumbnails layout)                      */
/* ------------------------------------------------------------------ */

function ThumbnailAnswerRow({
  opt,
  index,
  total,
  onChangeText,
  onChangeScore,
  onChangeImage,
  onClearImage,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  opt: any;
  index: number;
  total: number;
  onChangeText: (t: string) => void;
  onChangeScore: (s: number) => void;
  onChangeImage: (url: string) => void;
  onClearImage: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  var [hover, setHover] = useState(false);
  var [thumbHover, setThumbHover] = useState(false);
  var [showPicker, setShowPicker] = useState(false);
  var thumbRef = useRef<HTMLDivElement>(null);

  return (
    <div
      onMouseEnter={function() { setHover(true); }}
      onMouseLeave={function() { setHover(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 10,
        border: '1px solid ' + C.BORDER,
        background: hover ? '#F9FAFB' : '#fff',
        transition: 'all 0.12s',
      }}
    >
      {/* Answer image picker */}
      {showPicker && (
        <AnswerImagePicker
          anchorEl={thumbRef.current}
          onSelect={function(url) { onChangeImage(url); setShowPicker(false); }}
          onClose={function() { setShowPicker(false); }}
        />
      )}

      {/* Thumbnail with hover overlay */}
      <div
        ref={thumbRef}
        style={{
          width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
          background: '#F2F4F7', flexShrink: 0, position: 'relative',
          cursor: 'pointer',
        }}
        onMouseEnter={function() { setThumbHover(true); }}
        onMouseLeave={function() { setThumbHover(false); }}
        onClick={function() { setShowPicker(true); }}
      >
        {opt.imageUrl ? (
          <img src={opt.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.TEXT_SUBTLE }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} />
            </svg>
          </div>
        )}
        {thumbHover && opt.imageUrl && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}>
            <button type="button" onClick={function(e) { e.stopPropagation(); setShowPicker(true); }}
              title="Replace"
              style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#344054' }}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} /></svg>
            </button>
            <button type="button" onClick={function(e) { e.stopPropagation(); onClearImage(); }}
              title="Remove image"
              style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <input type="text" value={opt.text || ''} onChange={function(e) { onChangeText(e.target.value); }}
          onClick={function(e) { e.stopPropagation(); }}
          placeholder="Answer..."
          style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: C.TEXT, outline: 'none', fontFamily: C.FONT }} />
      </div>

      {/* Score */}
      <ScoreBadge score={opt.score || 0} onChange={onChangeScore} />

      {/* Hover actions */}
      {hover && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button type="button" disabled={index === 0} onClick={function(e) { e.stopPropagation(); onMoveUp(); }}
            style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? C.BORDER : C.TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button type="button" disabled={index >= total - 1} onClick={function(e) { e.stopPropagation(); onMoveDown(); }}
            style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: index >= total - 1 ? 'default' : 'pointer', color: index >= total - 1 ? C.BORDER : C.TEXT_MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button type="button" disabled={total <= 2} onClick={function(e) { e.stopPropagation(); onDelete(); }}
            style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: total <= 2 ? 'default' : 'pointer', color: total <= 2 ? C.BORDER : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={function(e) { if (total > 2) e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Outcome Canvas                                                     */
/* ------------------------------------------------------------------ */

function OutcomeCanvas({ block, onChange }: { block: OutcomeBlock; onChange: (b: OutcomeBlock) => void }) {
  var fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '1px solid ' + C.BORDER, borderRadius: 8,
    color: C.TEXT, fontFamily: C.FONT, outline: 'none', marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 720, width: '100%', background: '#fff', borderRadius: 16, padding: '36px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#4cd964', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        Outcome
      </div>

      <input type="text" value={block.title || ''} placeholder="Result title..."
        onChange={function(e) { onChange(Object.assign({}, block, { title: e.target.value }) as OutcomeBlock); }}
        style={Object.assign({}, fieldStyle, { fontSize: 22, fontWeight: 700 })} />

      <textarea value={block.description || ''} placeholder="Description..."
        onChange={function(e) { onChange(Object.assign({}, block, { description: e.target.value }) as OutcomeBlock); }}
        style={Object.assign({}, fieldStyle, { minHeight: 80, resize: 'vertical' as const })} rows={3} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>CTA Text</div>
          <input type="text" value={block.ctaText || ''} placeholder="Learn more"
            onChange={function(e) { onChange(Object.assign({}, block, { ctaText: e.target.value }) as OutcomeBlock); }}
            style={fieldStyle} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>CTA URL</div>
          <input type="text" value={block.ctaUrl || ''} placeholder="https://..."
            onChange={function(e) { onChange(Object.assign({}, block, { ctaUrl: e.target.value }) as OutcomeBlock); }}
            style={fieldStyle} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>Min Score</div>
          <input type="number" value={block.minScore ?? ''} placeholder="0"
            onChange={function(e) { onChange(Object.assign({}, block, { minScore: e.target.value ? parseInt(e.target.value) : undefined }) as OutcomeBlock); }}
            style={fieldStyle} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>Max Score</div>
          <input type="number" value={block.maxScore ?? ''} placeholder="100"
            onChange={function(e) { onChange(Object.assign({}, block, { maxScore: e.target.value ? parseInt(e.target.value) : undefined }) as OutcomeBlock); }}
            style={fieldStyle} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lead Gate Canvas                                                   */
/* ------------------------------------------------------------------ */

function LeadGateCanvas({ block, onChange }: { block: LeadGateBlock; onChange: (b: LeadGateBlock) => void }) {
  var fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '1px solid ' + C.BORDER, borderRadius: 8,
    color: C.TEXT, fontFamily: C.FONT, outline: 'none', marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 720, width: '100%', background: '#fff', borderRadius: 16, padding: '36px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#ff9500', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        Lead Gate
      </div>

      <input type="text" value={block.headline || ''} placeholder="Headline..."
        onChange={function(e) { onChange(Object.assign({}, block, { headline: e.target.value }) as LeadGateBlock); }}
        style={Object.assign({}, fieldStyle, { fontSize: 20, fontWeight: 700 })} />

      <input type="text" value={block.subtext || ''} placeholder="Subtext..."
        onChange={function(e) { onChange(Object.assign({}, block, { subtext: e.target.value }) as LeadGateBlock); }}
        style={fieldStyle} />

      <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 8 }}>Fields</div>
      {block.fields.map(function(f, fi) {
        return (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, minWidth: 60 }}>{f.type}</span>
            <input type="text" value={f.label} placeholder="Label..."
              onChange={function(e) {
                var newFields = block.fields.map(function(ff, ffi) { return ffi === fi ? Object.assign({}, ff, { label: e.target.value }) : ff; });
                onChange(Object.assign({}, block, { fields: newFields }) as LeadGateBlock);
              }}
              style={Object.assign({}, fieldStyle, { flex: 1, marginBottom: 0 })} />
            <label style={{ fontSize: 11, color: C.TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.required}
                onChange={function(e) {
                  var newFields = block.fields.map(function(ff, ffi) { return ffi === fi ? Object.assign({}, ff, { required: e.target.checked }) : ff; });
                  onChange(Object.assign({}, block, { fields: newFields }) as LeadGateBlock);
                }}
                style={{ accentColor: C.ACCENT }} />
              Req
            </label>
          </div>
        );
      })}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>Button Label</div>
        <input type="text" value={block.buttonLabel || ''} placeholder="See my results"
          onChange={function(e) { onChange(Object.assign({}, block, { buttonLabel: e.target.value }) as LeadGateBlock); }}
          style={fieldStyle} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generic Block Canvas (heading, text, image, divider, logic)        */
/* ------------------------------------------------------------------ */

function GenericBlockCanvas({ block, onChange }: { block: QuizBlock; onChange: (b: QuizBlock) => void }) {
  var fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '1px solid ' + C.BORDER, borderRadius: 8,
    color: C.TEXT, fontFamily: C.FONT, outline: 'none', marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 720, width: '100%', background: '#fff', borderRadius: 16, padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        {blockLabel(block)}
      </div>

      {block.type === 'heading' && (
        <input type="text" value={(block as HeadingBlock).text || ''} placeholder="Heading text..."
          onChange={function(e) { onChange(Object.assign({}, block, { text: e.target.value })); }}
          style={Object.assign({}, fieldStyle, { fontSize: 22, fontWeight: 700 })} />
      )}

      {block.type === 'text' && (
        <textarea value={(block as TextBlock).content || ''} placeholder="Text content..."
          onChange={function(e) { onChange(Object.assign({}, block, { content: e.target.value })); }}
          style={Object.assign({}, fieldStyle, { minHeight: 100, resize: 'vertical' as const })} />
      )}

      {block.type === 'image' && (
        <>
          <input type="text" value={(block as ImageBlock).url || ''} placeholder="Image URL..."
            onChange={function(e) { onChange(Object.assign({}, block, { url: e.target.value })); }}
            style={fieldStyle} />
          {(block as ImageBlock).url && (
            <img src={(block as ImageBlock).url} alt={(block as ImageBlock).alt} style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }}
              onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </>
      )}

      {block.type === 'divider' && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: C.TEXT_SUBTLE, fontSize: 13 }}>
          — Divider —
        </div>
      )}

      {block.type === 'logic' && (
        <div style={{ color: C.TEXT_MUTED, fontSize: 13 }}>
          <div style={{ marginBottom: 8 }}>Condition: {(block as LogicBlock).condition}</div>
          <div>Go to: {(block as LogicBlock).gotoBlockId || '(not set)'}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Question Toolbar — buttons for image/video/help                    */
/* ------------------------------------------------------------------ */

function QuestionToolbar({
  block,
  onAddImage,
  onAddVideo,
  onAddHelp,
  imageRef,
  videoRef,
}: {
  block: QuestionBlock;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddHelp: () => void;
  imageRef: React.RefObject<HTMLButtonElement | null>;
  videoRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '8px 0 0', margin: '8px 36px 0',
      borderTop: '1px solid #F2F4F7',
    }}>
      <button type="button" ref={imageRef} onClick={onAddImage}
        title="Add image to this question"
        style={{
          height: 32, padding: '0 10px', borderRadius: 6, border: 'none',
          background: block.mediaUrl && block.mediaType !== 'video' ? C.ACCENT_LIGHT : 'transparent',
          fontSize: 11, fontWeight: 600,
          color: block.mediaUrl && block.mediaType !== 'video' ? C.ACCENT : '#667085',
          cursor: 'pointer', fontFamily: C.FONT,
          display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
        }}
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={3} width={18} height={18} rx={3} /><circle cx={8.5} cy={8.5} r={1.5} /><path d="M21 15l-5-5L5 21" /></svg>
        Image
      </button>
      <button type="button" ref={videoRef} onClick={onAddVideo}
        title="Add video to this question"
        style={{
          height: 32, padding: '0 10px', borderRadius: 6, border: 'none',
          background: block.mediaUrl && block.mediaType === 'video' ? C.ACCENT_LIGHT : 'transparent',
          fontSize: 11, fontWeight: 600,
          color: block.mediaUrl && block.mediaType === 'video' ? C.ACCENT : '#667085',
          cursor: 'pointer', fontFamily: C.FONT,
          display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
        }}
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x={2} y={4} width={14} height={16} rx={2} /><path d="M16 8l4.586-2.293A1 1 0 0122 6.586v10.828a1 1 0 01-1.414.879L16 16" /></svg>
        Video
      </button>
      <div style={{ width: 1, height: 18, background: '#E4E7EC', margin: '0 4px' }} />
      <button type="button" onClick={onAddHelp}
        title="Add subtitle / help text"
        style={{
          height: 32, padding: '0 10px', borderRadius: 6, border: 'none',
          background: block.subtitle ? C.ACCENT_LIGHT : 'transparent', fontSize: 11, fontWeight: 600,
          color: block.subtitle ? C.ACCENT : '#667085', cursor: 'pointer', fontFamily: C.FONT,
          display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
        }}
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10} /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1={12} y1={17} x2={12.01} y2={17} /></svg>
        Help text
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline Media Preview — shows image/video with hover overlay        */
/* ------------------------------------------------------------------ */

function InlineMediaPreview({
  block,
  onClearMedia,
  onReplace,
}: {
  block: QuestionBlock;
  onClearMedia: () => void;
  onReplace: () => void;
}) {
  var [hovered, setHovered] = useState(false);
  if (!block.mediaUrl) return null;

  var isVideo = block.mediaType === 'video';

  /* Detect YouTube/Vimeo embed URLs */
  var embedUrl = '';
  if (isVideo && block.mediaUrl) {
    var ytMatch = block.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
    var vimeoMatch = block.mediaUrl.match(/(?:vimeo\.com\/)(\d+)/);
    if (ytMatch) embedUrl = 'https://www.youtube.com/embed/' + ytMatch[1];
    else if (vimeoMatch) embedUrl = 'https://player.vimeo.com/video/' + vimeoMatch[1];
  }

  return (
    <div
      style={{
        margin: '12px 36px 0', borderRadius: 12, overflow: 'hidden',
        position: 'relative', background: isVideo ? '#000' : '#F2F4F7',
      }}
      onMouseEnter={function() { setHovered(true); }}
      onMouseLeave={function() { setHovered(false); }}
    >
      {isVideo ? (
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
          {embedUrl ? (
            <iframe src={embedUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            <video src={block.mediaUrl} controls playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
          )}
        </div>
      ) : (
        <img src={block.mediaUrl} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}

      {/* Hover overlay with Replace + Remove */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          transition: 'opacity 0.15s',
        }}>
          <button type="button" onClick={function(e) { e.stopPropagation(); onReplace(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.95)', border: 'none',
              color: '#344054', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: C.FONT,
            }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.78 7.78 5.5 5.5 0 017.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
            Replace
          </button>
          <button type="button" onClick={function(e) { e.stopPropagation(); onClearMedia(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.95)', border: 'none',
              color: '#DC2626', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: C.FONT,
            }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Picker Dropdown — positioned near anchor, Upload + Browse    */
/* ------------------------------------------------------------------ */

function ImagePicker({
  onSelect,
  onClose,
  anchorRef,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  var [tab, setTab] = useState<'upload' | 'browse'>('browse');
  var [pexelsQuery, setPexelsQuery] = useState('');
  var [pexelsResults, setPexelsResults] = useState<{ id: string; thumb: string; regular: string; alt: string }[]>([]);
  var [pexelsLoading, setPexelsLoading] = useState(false);
  var [uploading, setUploading] = useState(false);
  var fileRef = useRef<HTMLInputElement>(null);
  var pickerRef = useRef<HTMLDivElement>(null);
  var [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  /* Position near the anchor button, or center on screen if anchor is not visible */
  useEffect(function() {
    var pickerWidth = 400;
    var pickerHeight = 380;
    if (anchorRef.current) {
      var rect = anchorRef.current.getBoundingClientRect();
      var inViewport = rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
      if (inViewport) {
        var leftPos = rect.left + rect.width / 2 - pickerWidth / 2;
        if (leftPos < 16) leftPos = 16;
        if (leftPos + pickerWidth > window.innerWidth - 16) leftPos = window.innerWidth - pickerWidth - 16;
        var topPos = rect.bottom + 8;
        if (topPos + pickerHeight > window.innerHeight - 16) topPos = rect.top - pickerHeight - 8;
        if (topPos < 16) topPos = 16;
        setPos({ top: topPos, left: leftPos });
        return;
      }
    }
    /* Fallback: center on screen */
    setPos({
      top: Math.max(16, (window.innerHeight - pickerHeight) / 2),
      left: Math.max(16, (window.innerWidth - pickerWidth) / 2),
    });
  }, []);

  /* Auto-load Pexels on mount */
  useEffect(function() {
    searchPexels('nature');
  }, []);

  function searchPexels(query: string) {
    if (!query.trim()) return;
    setPexelsLoading(true);
    getClerkToken().then(function(token) {
      fetch(API_BASE + '/api/media/search?q=' + encodeURIComponent(query), {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        setPexelsResults(data.results || []);
        setPexelsLoading(false);
      })
      .catch(function() { setPexelsLoading(false); });
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    var file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('File too large. Max 20MB.'); return; }
    setUploading(true);
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = (reader.result as string).split(',')[1];
      getClerkToken().then(function(token) {
        fetch(API_BASE + '/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
          body: JSON.stringify({ data: base64, fileName: file.name, contentType: file.type }),
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          setUploading(false);
          if (data.url) {
            onSelect(data.url);
            onClose();
          }
        })
        .catch(function(err) { setUploading(false); console.error('Upload error:', err); });
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div ref={pickerRef} style={{
      position: 'fixed', top: pos.top, left: pos.left,
      background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC',
      width: 400, padding: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      zIndex: 50,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT }}>Add Image</div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', padding: 4 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: '#F2F4F7', borderRadius: 9, padding: 3 }}>
        {(['upload', 'browse'] as const).map(function(t) {
          var active = tab === t;
          var label = t === 'upload' ? 'Upload' : 'Browse images';
          return (
            <button key={t} type="button" onClick={function() { setTab(t); }}
              style={{
                flex: 1, padding: '7px 6px', borderRadius: 7, border: 'none',
                background: active ? '#fff' : 'transparent', color: active ? C.TEXT : '#667085',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT,
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.12s',
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'upload' && (
        <>
          <button type="button" onClick={function() { fileRef.current?.click(); }}
            style={{
              width: '100%', padding: '28px 16px', borderRadius: 10,
              border: '2px dashed #D0D5DD', background: '#FAFBFC',
              cursor: uploading ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 600, color: '#344054', fontFamily: C.FONT,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              opacity: uploading ? 0.6 : 1,
            }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} /></svg>
            {uploading ? 'Uploading...' : 'Click to upload image'}
            <span style={{ fontSize: 11, color: '#98A2B3', fontWeight: 400 }}>PNG, JPG, GIF up to 20MB</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        </>
      )}

      {tab === 'browse' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="text" value={pexelsQuery} onChange={function(e) { setPexelsQuery(e.target.value); }}
              placeholder="Search free photos..."
              onKeyDown={function(e) { if (e.key === 'Enter') searchPexels(pexelsQuery); }}
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 12, fontFamily: C.FONT, outline: 'none' }} />
            <button type="button" onClick={function() { searchPexels(pexelsQuery); }}
              style={{ padding: '9px 14px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT }}>
              {pexelsLoading ? '...' : 'Search'}
            </button>
          </div>
          {pexelsResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 220, overflowY: 'auto', borderRadius: 8 }}>
              {pexelsResults.map(function(img) {
                return (
                  <button key={img.id} type="button" onClick={function() { onSelect(img.regular); onClose(); }}
                    style={{ padding: 0, border: '2px solid transparent', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#F2F4F7', transition: 'border-color 0.1s' }}
                    onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; }}
                    onMouseLeave={function(e) { e.currentTarget.style.borderColor = 'transparent'; }}>
                    <img src={img.thumb} alt={img.alt} style={{ width: '100%', height: 76, objectFit: 'cover', display: 'block' }} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#98A2B3', fontSize: 12 }}>
              {pexelsLoading ? 'Loading images...' : 'Search for free stock photos'}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 10, color: '#98A2B3', textAlign: 'center' }}>
            Photos provided by Pexels
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Video Picker Dropdown — Upload + URL, positioned near anchor       */
/* ------------------------------------------------------------------ */

function VideoPicker({
  onSelect,
  onClose,
  anchorRef,
}: {
  onSelect: (url: string, type?: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  var [tab, setTab] = useState<'url' | 'upload'>('url');
  var [urlInput, setUrlInput] = useState('');
  var [uploading, setUploading] = useState(false);
  var fileRef = useRef<HTMLInputElement>(null);
  var [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  /* Position near the anchor button, or center on screen if anchor is not visible */
  useEffect(function() {
    var pickerWidth = 400;
    var pickerHeight = 300;
    if (anchorRef.current) {
      var rect = anchorRef.current.getBoundingClientRect();
      var inViewport = rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
      if (inViewport) {
        var leftPos = rect.left + rect.width / 2 - pickerWidth / 2;
        if (leftPos < 16) leftPos = 16;
        if (leftPos + pickerWidth > window.innerWidth - 16) leftPos = window.innerWidth - pickerWidth - 16;
        var topPos = rect.bottom + 8;
        if (topPos + pickerHeight > window.innerHeight - 16) topPos = rect.top - pickerHeight - 8;
        if (topPos < 16) topPos = 16;
        setPos({ top: topPos, left: leftPos });
        return;
      }
    }
    /* Fallback: center on screen */
    setPos({
      top: Math.max(16, (window.innerHeight - pickerHeight) / 2),
      left: Math.max(16, (window.innerWidth - pickerWidth) / 2),
    });
  }, []);

  function handleUrlSubmit() {
    if (!urlInput.trim()) return;
    onSelect(urlInput.trim(), 'video');
    onClose();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    var file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('Video too large. Max 20MB. Try uploading to YouTube and pasting the link instead.'); return; }
    setUploading(true);
    var reader = new FileReader();
    reader.onerror = function() { setUploading(false); alert('Failed to read video file.'); };
    reader.onload = function() {
      var result = reader.result as string;
      var base64 = result.indexOf(',') >= 0 ? result.split(',')[1] : result;
      getClerkToken().then(function(token) {
        fetch(API_BASE + '/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' },
          body: JSON.stringify({ data: base64, fileName: file.name, contentType: file.type }),
        })
        .then(function(res) {
          if (!res.ok) throw new Error('Upload returned ' + res.status);
          return res.json();
        })
        .then(function(data) {
          setUploading(false);
          if (data.url) {
            onSelect(data.url, 'video');
            onClose();
          } else {
            alert('Upload failed: ' + (data.error || 'No URL returned'));
          }
        })
        .catch(function(err) { setUploading(false); alert('Video upload failed: ' + err.message); console.error('Upload error:', err); });
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left,
      background: '#fff', borderRadius: 14, border: '1px solid #E4E7EC',
      width: 400, padding: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      zIndex: 50,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.TEXT }}>Add Video</div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', padding: 4 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: '#F2F4F7', borderRadius: 9, padding: 3 }}>
        {(['url', 'upload'] as const).map(function(t) {
          var active = tab === t;
          var label = t === 'url' ? 'YouTube / Vimeo' : 'Upload';
          return (
            <button key={t} type="button" onClick={function() { setTab(t); }}
              style={{
                flex: 1, padding: '7px 6px', borderRadius: 7, border: 'none',
                background: active ? '#fff' : 'transparent', color: active ? C.TEXT : '#667085',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT,
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.12s',
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'url' && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={urlInput} onChange={function(e) { setUrlInput(e.target.value); }}
              placeholder="Paste YouTube or Vimeo URL..."
              onKeyDown={function(e) { if (e.key === 'Enter') handleUrlSubmit(); }}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 12, fontFamily: C.FONT, outline: 'none' }} />
            <button type="button" onClick={handleUrlSubmit}
              style={{ padding: '10px 16px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT }}>
              Add
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#98A2B3' }}>
            Supports YouTube, Vimeo, and direct video URLs
          </div>
        </>
      )}

      {tab === 'upload' && (
        <>
          <button type="button" onClick={function() { fileRef.current?.click(); }}
            style={{
              width: '100%', padding: '28px 16px', borderRadius: 10,
              border: '2px dashed #D0D5DD', background: '#FAFBFC',
              cursor: uploading ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 600, color: '#344054', fontFamily: C.FONT,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              opacity: uploading ? 0.6 : 1,
            }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1={12} y1={3} x2={12} y2={15} /></svg>
            {uploading ? 'Uploading video...' : 'Click to upload video'}
            <span style={{ fontSize: 11, color: '#98A2B3', fontWeight: 400 }}>MP4, MOV, WebM up to 20MB</span>
          </button>
          <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Question Canvas — rebuilt without hero media, with toolbar         */
/* ------------------------------------------------------------------ */

function QuestionCanvas({
  block,
  questionNum,
  totalQuestions,
  onChange,
}: {
  block: QuestionBlock;
  questionNum: number;
  totalQuestions: number;
  onChange: (updated: QuestionBlock) => void;
}) {
  var layout = block.answerLayout || 'list';
  var isSplit = layout === 'splitLayout';
  var isGrid = layout === 'grid' || layout === 'fullBackground';
  var isFullBg = layout === 'fullBackground';
  var [showImagePicker, setShowImagePicker] = useState(false);
  var [showVideoPicker, setShowVideoPicker] = useState(false);
  var imageBtnRef = useRef<HTMLButtonElement>(null);
  var videoBtnRef = useRef<HTMLButtonElement>(null);

  function updateOptionText(idx: number, text: string) {
    var newOpts = block.options.map(function(o, i) {
      return i === idx ? Object.assign({}, o, { text: text }) : o;
    });
    onChange(Object.assign({}, block, { options: newOpts }) as QuestionBlock);
  }

  function updateOptionScore(idx: number, score: number) {
    var newOpts = block.options.map(function(o, i) {
      return i === idx ? Object.assign({}, o, { score: score }) : o;
    });
    onChange(Object.assign({}, block, { options: newOpts }) as QuestionBlock);
  }

  function deleteOption(idx: number) {
    if (block.options.length <= 2) return;
    var newOpts = block.options.filter(function(_, i) { return i !== idx; });
    onChange(Object.assign({}, block, { options: newOpts }) as QuestionBlock);
  }

  function moveOption(idx: number, dir: number) {
    var target = idx + dir;
    if (target < 0 || target >= block.options.length) return;
    var newOpts = block.options.slice();
    var temp = newOpts[idx];
    newOpts[idx] = newOpts[target];
    newOpts[target] = temp;
    onChange(Object.assign({}, block, { options: newOpts }) as QuestionBlock);
  }

  function updateOptionImage(idx: number, url: string) {
    var newOpts = block.options.map(function(o, i) {
      return i === idx ? Object.assign({}, o, { imageUrl: url }) : o;
    });
    onChange(Object.assign({}, block, { options: newOpts }) as QuestionBlock);
  }

  function clearOptionImage(idx: number) {
    var newOpts = block.options.map(function(o, i) {
      return i === idx ? Object.assign({}, o, { imageUrl: undefined }) : o;
    });
    onChange(Object.assign({}, block, { options: newOpts }) as QuestionBlock);
  }

  function addOption() {
    if (block.options.length >= 8) return;
    var newOpts = block.options.slice();
    newOpts.push({ id: uid(), text: '', score: 0 });
    onChange(Object.assign({}, block, { options: newOpts }) as QuestionBlock);
  }

  /* ---- SPLIT LAYOUT ---- */
  if (isSplit) {
    return (
      <div style={{
        maxWidth: 820, width: '100%', background: '#fff', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 400,
      }}>
        {/* Left: media */}
        <div style={{
          background: block.mediaUrl ? 'transparent' : 'linear-gradient(135deg, #1D2939, #344054)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {block.mediaUrl && block.mediaType === 'video' ? (function() {
            var ytM = block.mediaUrl!.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
            var viM = block.mediaUrl!.match(/(?:vimeo\.com\/)(\d+)/);
            var eUrl = ytM ? 'https://www.youtube.com/embed/' + ytM[1] : viM ? 'https://player.vimeo.com/video/' + viM[1] : '';
            return eUrl
              ? <iframe src={eUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              : <video src={block.mediaUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
          })() : block.mediaUrl ? (
            <img src={block.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 8px' }}>
                <rect x={3} y={3} width={18} height={18} rx={2} />
                <circle cx={8.5} cy={8.5} r={1.5} />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Add media via toolbar</div>
            </div>
          )}
        </div>

        {/* Right: question + answers */}
        <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Question {String(questionNum).padStart(2, '0')}
          </div>
          <textarea value={block.text || ''} onChange={function(e) {
              onChange(Object.assign({}, block, { text: e.target.value }) as QuestionBlock);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            placeholder="Your question..."
            onClick={function(e) { e.stopPropagation(); }}
            ref={function(el) { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
            style={{
              fontSize: 22, fontWeight: 700, color: C.TEXT, border: 'none', outline: 'none',
              background: 'transparent', resize: 'none', fontFamily: C.FONT,
              lineHeight: 1.3, marginBottom: 20, width: '100%',
              overflow: 'hidden', minHeight: 36,
            }}
            rows={1}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {block.options.map(function(opt, oi) {
              return (
                <AnswerRow key={opt.id} opt={opt} index={oi} total={block.options.length}
                  onChangeText={function(t) { updateOptionText(oi, t); }}
                  onChangeScore={function(s) { updateOptionScore(oi, s); }}
                  onChangeImage={function(url) { updateOptionImage(oi, url); }}
                  onClearImage={function() { clearOptionImage(oi); }}
                  onDelete={function() { deleteOption(oi); }}
                  onMoveUp={function() { moveOption(oi, -1); }}
                  onMoveDown={function() { moveOption(oi, 1); }}
                />
              );
            })}
          </div>
          <button type="button" onClick={addOption} disabled={block.options.length >= 8}
            style={{
              marginTop: 12, padding: '10px 0', borderRadius: 8,
              border: '1px dashed ' + C.BORDER, background: 'transparent',
              color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
              cursor: block.options.length >= 8 ? 'default' : 'pointer',
              fontFamily: C.FONT, transition: 'all 0.15s',
            }}>
            + Add option{block.options.length >= 7 ? ' (max 8)' : ''}
          </button>
        </div>
      </div>
    );
  }

  /* ---- DEFAULT / ALL OTHER LAYOUTS ---- */
  return (
    <div style={{
      maxWidth: 720, width: '100%', background: '#fff', borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Question text area */}
      <div style={{ padding: '28px 32px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Question {String(questionNum).padStart(2, '0')} of {totalQuestions}
        </div>
        <textarea
          value={block.text || ''}
          onChange={function(e) {
            onChange(Object.assign({}, block, { text: e.target.value }) as QuestionBlock);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onClick={function(e) { e.stopPropagation(); }}
          onFocus={function(e) { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          ref={function(el) { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
          placeholder="Enter your question here..."
          style={{
            width: '100%', fontSize: 26, fontWeight: 700, color: C.TEXT,
            border: 'none', outline: 'none', background: 'transparent',
            resize: 'none', fontFamily: C.FONT, lineHeight: 1.3,
            overflow: 'hidden', minHeight: 40,
          }}
          rows={1}
        />
        {block.subtitle && (
          <div style={{ fontSize: 14, color: C.TEXT_MUTED, marginTop: -4, marginBottom: 8 }}>{block.subtitle}</div>
        )}
      </div>

      {/* Toolbar */}
      <QuestionToolbar
        block={block}
        onAddImage={function() { setShowVideoPicker(false); setShowImagePicker(!showImagePicker); }}
        onAddVideo={function() { setShowImagePicker(false); setShowVideoPicker(!showVideoPicker); }}
        onAddHelp={function() { onChange(Object.assign({}, block, { subtitle: block.subtitle ? undefined : 'Add help text here...' }) as QuestionBlock); }}
        imageRef={imageBtnRef}
        videoRef={videoBtnRef}
      />

      {/* Inline media preview */}
      <InlineMediaPreview
        block={block}
        onClearMedia={function() { onChange(Object.assign({}, block, { mediaUrl: undefined, mediaType: undefined }) as QuestionBlock); }}
        onReplace={function() {
          var mType = block.mediaType;
          if (mType === 'video') { setShowVideoPicker(true); }
          else { setShowImagePicker(true); }
        }}
      />

      {/* Answer options — layout-aware rendering */}
      <div style={{ padding: '16px 32px 28px' }}>
        {isGrid ? (
          /* Grid / Full-background layout */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {block.options.map(function(opt, oi) {
              return (
                <GridAnswerCard key={opt.id} opt={opt} index={oi} total={block.options.length}
                  isFullBg={isFullBg}
                  onChangeText={function(t) { updateOptionText(oi, t); }}
                  onChangeScore={function(s) { updateOptionScore(oi, s); }}
                  onChangeImage={function(url) { updateOptionImage(oi, url); }}
                  onClearImage={function() { clearOptionImage(oi); }}
                  onDelete={function() { deleteOption(oi); }}
                />
              );
            })}
          </div>
        ) : layout === 'imageThumbnails' ? (
          /* Thumbnail layout — image + text + description row */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {block.options.map(function(opt, oi) {
              return (
                <ThumbnailAnswerRow key={opt.id} opt={opt} index={oi} total={block.options.length}
                  onChangeText={function(t) { updateOptionText(oi, t); }}
                  onChangeScore={function(s) { updateOptionScore(oi, s); }}
                  onChangeImage={function(url) { updateOptionImage(oi, url); }}
                  onClearImage={function() { clearOptionImage(oi); }}
                  onDelete={function() { deleteOption(oi); }}
                  onMoveUp={function() { moveOption(oi, -1); }}
                  onMoveDown={function() { moveOption(oi, 1); }}
                />
              );
            })}
          </div>
        ) : (
          /* Default list layout */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {block.options.map(function(opt, oi) {
              return (
                <AnswerRow key={opt.id} opt={opt} index={oi} total={block.options.length}
                  onChangeText={function(t) { updateOptionText(oi, t); }}
                  onChangeScore={function(s) { updateOptionScore(oi, s); }}
                  onChangeImage={function(url) { updateOptionImage(oi, url); }}
                  onClearImage={function() { clearOptionImage(oi); }}
                  onDelete={function() { deleteOption(oi); }}
                  onMoveUp={function() { moveOption(oi, -1); }}
                  onMoveDown={function() { moveOption(oi, 1); }}
                />
              );
            })}
          </div>
        )}

        {/* Add option */}
        <button type="button" onClick={addOption} disabled={block.options.length >= 8}
          style={{
            width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 8,
            border: '1px dashed ' + C.BORDER, background: 'transparent',
            color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
            cursor: block.options.length >= 8 ? 'default' : 'pointer',
            fontFamily: C.FONT, transition: 'all 0.15s',
          }}
          onMouseEnter={function(e) { if (block.options.length < 8) { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.color = C.ACCENT; } }}
          onMouseLeave={function(e) { e.currentTarget.style.borderColor = C.BORDER; e.currentTarget.style.color = C.TEXT_MUTED; }}
        >
          + Add option{block.options.length >= 7 ? ' (max 8)' : ''}
        </button>
      </div>

      {/* Media picker modals */}
      {showImagePicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={function() { setShowImagePicker(false); }} />
          <ImagePicker
            onSelect={function(url) { onChange(Object.assign({}, block, { mediaUrl: url, mediaType: 'image' }) as QuestionBlock); }}
            onClose={function() { setShowImagePicker(false); }}
            anchorRef={imageBtnRef}
          />
        </>
      )}
      {showVideoPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={function() { setShowVideoPicker(false); }} />
          <VideoPicker
            onSelect={function(url) { onChange(Object.assign({}, block, { mediaUrl: url, mediaType: 'video' }) as QuestionBlock); }}
            onClose={function() { setShowVideoPicker(false); }}
            anchorRef={videoBtnRef}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating Toolbar — REMOVED Media button, keeps Option/Timer/Branch */
/* ------------------------------------------------------------------ */

function FloatingToolbar({
  block,
  allBlocks,
  onAddOption,
  onChangeLayout,
  onChangeTimer,
  onShowBranch,
}: {
  block: QuestionBlock;
  allBlocks: QuizBlock[];
  onAddOption: () => void;
  onChangeLayout: (layout: AnswerLayout) => void;
  onChangeTimer: (seconds: number | undefined) => void;
  onShowBranch: () => void;
}) {
  var [activePopover, setActivePopover] = useState<string | null>(null);
  var [timerVal, setTimerVal] = useState(String(block.timeLimit || ''));

  var layouts: { value: AnswerLayout; label: string }[] = [
    { value: 'list', label: 'List' },
    { value: 'grid', label: 'Grid' },
    { value: 'imageThumbnails', label: 'Thumbnails' },
    { value: 'fullBackground', label: 'Full Image' },
    { value: 'splitLayout', label: 'Split' },
  ];

  var btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 18px', background: 'transparent', border: 'none',
    cursor: 'pointer', fontSize: 14, fontWeight: 600, color: C.TEXT,
    borderRadius: 10, transition: 'all 0.12s', fontFamily: C.FONT,
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 0,
      background: '#fff', border: '1px solid #D0D5DD',
      borderRadius: 24, padding: '6px 12px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
      zIndex: 40,
    }}>
      {/* + Option */}
      <button type="button" style={btnStyle} onClick={onAddOption}
        onMouseEnter={function(e) { e.currentTarget.style.background = C.ACCENT_LIGHT; e.currentTarget.style.color = C.ACCENT; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.TEXT; }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></svg>
        Option
      </button>

      <div style={{ width: 1, height: 24, background: '#E4E7EC' }} />

      {/* Timer */}
      <div style={{ position: 'relative' }}>
        <button type="button" style={Object.assign({}, btnStyle, block.timeLimit ? { color: C.ACCENT } : {})}
          onClick={function() { setActivePopover(activePopover === 'timer' ? null : 'timer'); }}
          onMouseEnter={function(e) { e.currentTarget.style.background = C.ACCENT_LIGHT; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={10} /><polyline points="12 6 12 12 16 14" />
          </svg>
          Timer{block.timeLimit ? ' (' + block.timeLimit + 's)' : ''}
        </button>
        {activePopover === 'timer' && (
          <div style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 12, padding: 16, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.TEXT_MUTED, marginBottom: 8 }}>Timer (seconds)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={timerVal} onChange={function(e) { setTimerVal(e.target.value); }}
                placeholder="30" min={0}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid ' + C.BORDER, borderRadius: 6, fontSize: 14, fontFamily: C.FONT, outline: 'none' }} />
              <button type="button" onClick={function() { onChangeTimer(timerVal ? parseInt(timerVal) : undefined); setActivePopover(null); }}
                style={{ padding: '8px 12px', background: C.ACCENT, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: C.FONT }}>Set</button>
            </div>
            {block.timeLimit && (
              <button type="button" onClick={function() { onChangeTimer(undefined); setTimerVal(''); setActivePopover(null); }}
                style={{ marginTop: 8, fontSize: 11, color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: C.FONT }}>Remove timer</button>
            )}
          </div>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: '#E4E7EC' }} />

      {/* Branch */}
      <button type="button" style={Object.assign({}, btnStyle, (block.branchRules && block.branchRules.length > 0) ? { color: '#7C3AED' } : {})}
        onClick={onShowBranch}
        onMouseEnter={function(e) { e.currentTarget.style.background = C.ACCENT_LIGHT; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
        Branch
      </button>

      <div style={{ width: 1, height: 24, background: '#E4E7EC' }} />

      {/* Layout */}
      <div style={{ position: 'relative' }}>
        <button type="button" style={btnStyle}
          onClick={function() { setActivePopover(activePopover === 'layout' ? null : 'layout'); }}
          onMouseEnter={function(e) { e.currentTarget.style.background = C.ACCENT_LIGHT; }}
          onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={3} y={3} width={7} height={7} /><rect x={14} y={3} width={7} height={7} />
            <rect x={14} y={14} width={7} height={7} /><rect x={3} y={14} width={7} height={7} />
          </svg>
          Layout
        </button>
        {activePopover === 'layout' && (
          <div style={{ position: 'absolute', bottom: 52, right: 0, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 12, padding: 12, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.TEXT_MUTED, marginBottom: 8 }}>Answer Layout</div>
            {layouts.map(function(l) {
              var isActive = (block.answerLayout || 'list') === l.value;
              return (
                <button key={l.value} type="button"
                  onClick={function() { onChangeLayout(l.value); setActivePopover(null); }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px', borderRadius: 6,
                    border: 'none', background: isActive ? C.ACCENT_LIGHT : 'transparent',
                    color: isActive ? C.ACCENT : C.TEXT, fontSize: 13, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', textAlign: 'left', fontFamily: C.FONT, transition: 'all 0.1s',
                  }}
                  onMouseEnter={function(e) { if (!isActive) e.currentTarget.style.background = C.GRAY_50; }}
                  onMouseLeave={function(e) { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Close popovers on outside click */}
      {activePopover && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 39 }}
          onClick={function() { setActivePopover(null); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Panel — Inline 380px right panel with 3 tabs              */
/* ------------------------------------------------------------------ */

function SettingsPanel({
  open,
  onClose,
  settings,
  onSettingsChange,
  userPlan,
  quizId,
}: {
  open: boolean;
  onClose: () => void;
  settings?: QuizSettings;
  onSettingsChange?: (s: QuizSettings) => void;
  userPlan?: UserPlan;
  quizId?: string;
}) {
  var [tab, setTab] = useState<'behavior' | 'design' | 'advanced'>('behavior');

  if (!open) return null;

  return (
    <div style={{
      width: 380, background: '#fff', borderLeft: '1px solid ' + C.BORDER,
      overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + C.BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, fontFamily: C.FONT }}>Settings</span>
        <button type="button" onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid ' + C.BORDER, color: C.TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + C.BORDER, background: '#F9FAFB', padding: '0 16px' }}>
        {(['behavior', 'design', 'advanced'] as const).map(function(t) {
          var active = tab === t;
          var label = t === 'behavior' ? 'Behavior' : t === 'design' ? 'Design' : 'Advanced';
          return (
            <button key={t} type="button" onClick={function() { setTab(t); }}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 0,
                border: 'none', background: 'transparent',
                color: active ? C.ACCENT : C.TEXT_MUTED,
                fontSize: 11, fontWeight: active ? 700 : 600,
                cursor: 'pointer', fontFamily: C.FONT,
                borderBottom: active ? '2px solid ' + C.ACCENT : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {tab === 'behavior' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Quiz Flow</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #F2F4F7' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>Progress bar</span>
              <button type="button" onClick={function() { if (onSettingsChange) onSettingsChange(Object.assign({}, settings, { show_progress_bar: !(settings?.show_progress_bar !== false) })); }}
                style={{ width: 40, height: 22, borderRadius: 11, background: settings?.show_progress_bar !== false ? C.ACCENT : C.BORDER, border: 'none', cursor: 'pointer', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 2, left: settings?.show_progress_bar !== false ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'left 0.2s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #F2F4F7' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>Shuffle questions</span>
              <button type="button" onClick={function() { if (onSettingsChange) onSettingsChange(Object.assign({}, settings, { shuffle_questions: !(settings?.shuffle_questions) })); }}
                style={{ width: 40, height: 22, borderRadius: 11, background: settings?.shuffle_questions ? C.ACCENT : C.BORDER, border: 'none', cursor: 'pointer', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 2, left: settings?.shuffle_questions ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'left 0.2s' }} />
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>Transition</div>
              <select value={settings?.transition_type || 'slide'}
                onChange={function(e) { if (onSettingsChange) onSettingsChange(Object.assign({}, settings, { transition_type: e.target.value as any })); }}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 13, color: C.TEXT, fontFamily: C.FONT, background: '#fff' }}>
                <option value="slide">Slide</option><option value="fade">Fade</option><option value="none">None</option>
              </select>
            </div>
          </div>
        )}

        {tab === 'design' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Branding</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>Remove branding <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', textTransform: 'uppercase' }}>STARTER</span></span>
                <button type="button" onClick={function() { if (onSettingsChange) onSettingsChange(Object.assign({}, settings, { remove_branding: !(settings?.remove_branding) })); }}
                  style={{ width: 40, height: 22, borderRadius: 11, background: settings?.remove_branding ? C.ACCENT : C.BORDER, border: 'none', cursor: 'pointer', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 2, left: settings?.remove_branding ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'left 0.2s' }} />
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Custom CSS <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#F5F3FF', color: '#7C3AED', textTransform: 'uppercase' }}>PRO</span></div>
              <textarea placeholder="/* Your styles */" style={{ width: '100%', minHeight: 80, padding: '9px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: C.TEXT, resize: 'vertical' as const, outline: 'none' }}
                value={settings?.custom_css || ''}
                onChange={function(e) { if (onSettingsChange) onSettingsChange(Object.assign({}, settings, { custom_css: e.target.value })); }} />
            </div>
          </div>
        )}

        {tab === 'advanced' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Embed Code</div>
              <div style={{ background: '#1D2939', borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: 11, color: '#E5E7EB', lineHeight: 1.6, wordBreak: 'break-all' as const, marginBottom: 12 }}>
                {'<iframe src="https://quiz.squarespell.com/embed/' + (quizId || 'your-slug') + '" width="100%" height="600"></iframe>'}
              </div>
              <button type="button" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + C.ACCENT, background: C.ACCENT_LIGHT, fontSize: 12, fontWeight: 600, color: C.ACCENT, cursor: 'pointer', fontFamily: C.FONT }}>Copy embed code</button>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Security</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.TEXT }}>reCAPTCHA <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#F5F3FF', color: '#7C3AED', textTransform: 'uppercase' }}>PRO</span></span>
                <button type="button" onClick={function() { if (onSettingsChange) onSettingsChange(Object.assign({}, settings, { enable_recaptcha: !(settings?.enable_recaptcha) })); }}
                  style={{ width: 40, height: 22, borderRadius: 11, background: settings?.enable_recaptcha ? C.ACCENT : C.BORDER, border: 'none', cursor: 'pointer', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 2, left: settings?.enable_recaptcha ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'left 0.2s' }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skip Logic Modal                                                   */
/* ------------------------------------------------------------------ */

function SkipLogicModal({
  blocks,
  onClose,
  onUpdateBlock,
}: {
  blocks: QuizBlock[];
  onClose: () => void;
  onUpdateBlock: (updated: QuizBlock) => void;
}) {
  var questionBlocks = blocks.filter(function(b) { return b.type === 'question'; }) as QuestionBlock[];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800,
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const,
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid ' + C.BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.TEXT, margin: 0, fontFamily: C.FONT }}>Skip Logic</h2>
            <p style={{ fontSize: 12, color: C.TEXT_MUTED, margin: '4px 0 0' }}>Route users based on answers</p>
          </div>
          <button type="button" onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'transparent', border: '1px solid ' + C.BORDER, color: C.TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {questionBlocks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.TEXT_MUTED, fontSize: 14 }}>No questions yet.</div>
          )}
          {questionBlocks.map(function(q, qi) {
            return (
              <div key={q.id} style={{ marginBottom: 16, border: '1px solid ' + C.BORDER, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + C.BORDER, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: C.ACCENT, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qi + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.TEXT, flex: 1 }}>{q.text || 'Untitled'}</span>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  {q.options.map(function(opt, oi) {
                    var currentTarget = (q.branchRules || []).find(function(r) { return r.if_answer === opt.id; })?.goto || '';
                    return (
                      <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: oi < q.options.length - 1 ? 8 : 0 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: C.ACCENT_LIGHT, color: C.ACCENT, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {LETTERS[oi]}
                        </span>
                        <span style={{ fontSize: 13, color: C.TEXT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 200 }}>
                          {opt.text || 'Option ' + (oi + 1)}
                        </span>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_SUBTLE} strokeWidth={2} strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        <select value={currentTarget}
                          onChange={function(e) {
                            var newBlock = JSON.parse(JSON.stringify(q));
                            var rules = (newBlock.branchRules || []).filter(function(r: BranchRule) { return r.if_answer !== opt.id; });
                            if (e.target.value) { rules.push({ if_answer: opt.id, goto: e.target.value }); }
                            newBlock.branchRules = rules.length > 0 ? rules : undefined;
                            onUpdateBlock(newBlock);
                          }}
                          style={{
                            padding: '6px 10px', borderRadius: 6, border: '1px solid ' + C.BORDER, fontSize: 12,
                            color: currentTarget ? C.ACCENT : C.TEXT_MUTED, fontWeight: currentTarget ? 600 : 400,
                            background: currentTarget ? C.ACCENT_LIGHT : '#fff', cursor: 'pointer', fontFamily: C.FONT, minWidth: 200,
                          }}>
                          <option value="">Next question</option>
                          {blocks.filter(function(b) { return b.id !== q.id && (b.type === 'question' || b.type === 'outcome' || b.type === 'leadGate'); }).map(function(b) {
                            var bIdx = questionBlocks.findIndex(function(qb) { return qb.id === b.id; });
                            var bLabel = b.type === 'question' ? 'Q' + (bIdx + 1) + ': ' + ((b as QuestionBlock).text || 'Untitled').slice(0, 30) : blockLabel(b) + ': ' + blockPreview(b).slice(0, 30);
                            return <option key={b.id} value={b.id}>{bLabel}</option>;
                          })}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function QuizBlockEditor({
  blocks: initialBlocks,
  onChange,
  settings,
  onSettingsChange,
  userPlan,
  backUrl,
  quizId,
  quizSlug,
  saveState,
}: QuizBlockEditorProps) {
  var history = useHistory(initialBlocks);
  var blocks = history.current;
  var [selectedId, setSelectedId] = useState<string | null>(null);
  var [settingsOpen, setSettingsOpen] = useState(false);
  var [showSkipLogic, setShowSkipLogic] = useState(false);
  var prevBlocksRef = useRef(initialBlocks);

  // Sync back to parent
  useEffect(function() {
    if (blocks !== prevBlocksRef.current) {
      prevBlocksRef.current = blocks;
      onChange(blocks);
    }
  }, [blocks, onChange]);

  // Sync incoming blocks from parent
  useEffect(function() {
    if (initialBlocks !== prevBlocksRef.current) {
      prevBlocksRef.current = initialBlocks;
      history.push(initialBlocks);
    }
  }, [initialBlocks]);

  // Auto-select first block
  useEffect(function() {
    if (!selectedId && blocks.length > 0) {
      setSelectedId(blocks[0].id);
    }
  }, [blocks.length]);

  var selectedBlock = selectedId ? blocks.find(function(b) { return b.id === selectedId; }) || null : null;
  var questionBlocks = blocks.filter(function(b) { return b.type === 'question'; });
  var selectedQuestionNum = selectedBlock && selectedBlock.type === 'question'
    ? questionBlocks.findIndex(function(b) { return b.id === selectedBlock!.id; }) + 1 : 0;

  function commit(next: QuizBlock[]) { history.push(next); }

  function addBlock(type: QuizBlockType) {
    var newBlock = createDefaultQuizBlock(type);
    var next = blocks.slice();
    var insertIdx = selectedId ? blocks.findIndex(function(b) { return b.id === selectedId; }) + 1 : blocks.length;
    next.splice(insertIdx, 0, newBlock);
    commit(next);
    setSelectedId(newBlock.id);
  }

  function deleteBlock(id: string) {
    var next = blocks.filter(function(b) { return b.id !== id; });
    commit(next);
    if (selectedId === id) setSelectedId(next.length > 0 ? next[0].id : null);
  }

  function duplicateBlock(id: string) {
    var idx = blocks.findIndex(function(b) { return b.id === id; });
    if (idx < 0) return;
    var clone = JSON.parse(JSON.stringify(blocks[idx]));
    clone.id = uid();
    if (clone.options) { for (var i = 0; i < clone.options.length; i++) clone.options[i].id = uid(); }
    if (clone.fields) { for (var j = 0; j < clone.fields.length; j++) clone.fields[j].id = uid(); }
    var next = blocks.slice();
    next.splice(idx + 1, 0, clone);
    commit(next);
    setSelectedId(clone.id);
  }

  function updateBlock(updated: QuizBlock) {
    var next = blocks.map(function(b) { return b.id === updated.id ? updated : b; });
    commit(next);
  }

  // Keyboard shortcuts
  useEffect(function() {
    function handleKey(e: KeyboardEvent) {
      var meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); return; }
      if (meta && e.key === 'z' && e.shiftKey) { e.preventDefault(); history.redo(); return; }
      if (meta && e.key === 'n') { e.preventDefault(); addBlock('question'); return; }
      if (meta && e.key === 'd' && selectedId) { e.preventDefault(); duplicateBlock(selectedId); return; }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId) {
        var target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        e.preventDefault(); deleteBlock(selectedId); return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        var t2 = e.target as HTMLElement;
        if (t2.tagName === 'INPUT' || t2.tagName === 'TEXTAREA' || t2.tagName === 'SELECT') return;
        e.preventDefault();
        var curIdx = selectedId ? blocks.findIndex(function(b) { return b.id === selectedId; }) : -1;
        var newIdx = e.key === 'ArrowUp' ? Math.max(curIdx - 1, 0) : Math.min(curIdx + 1, blocks.length - 1);
        if (blocks[newIdx]) setSelectedId(blocks[newIdx].id);
        return;
      }
      if (e.key === 'Escape') { setSelectedId(null); setSettingsOpen(false); setShowSkipLogic(false); }
    }
    window.addEventListener('keydown', handleKey);
    return function() { window.removeEventListener('keydown', handleKey); };
  }, [blocks, selectedId, history]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: C.FONT }}>
      {/* Question Flow Panel */}
      <QuestionFlowPanel
        blocks={blocks}
        selectedId={selectedId}
        onSelect={function(id) { setSelectedId(id); }}
        onAddQuestion={function() { addBlock('question'); }}
        onAddBlock={function(type) { addBlock(type); }}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{
          height: 56, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', borderBottom: '1px solid ' + C.BORDER, background: C.SURFACE,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href={backUrl || '/dashboard/quizzes'} style={{ display: 'flex', alignItems: 'center', color: C.TEXT_MUTED, textDecoration: 'none' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </a>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, letterSpacing: '-0.02em' }}>Quiz Editor</span>
            <span style={{ fontSize: 12, color: C.TEXT_SUBTLE, fontWeight: 500 }}>{questionBlocks.length} questions</span>
          </div>

          {/* Save state */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {saveState === 'saving' && (
              <>
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid ' + C.ACCENT, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.TEXT_MUTED }}>Saving...</span>
              </>
            )}
            {(saveState === 'saved' || saveState === 'idle' || !saveState) && (
              <>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={saveState === 'saved' ? '#16A34A' : C.TEXT_SUBTLE} strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: saveState === 'saved' ? '#16A34A' : C.TEXT_SUBTLE }}>Saved</span>
              </>
            )}
            {saveState === 'error' && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>Save failed</span>
            )}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Undo/Redo */}
            <button type="button" onClick={function() { history.undo(); }} disabled={!history.canUndo} title="Undo (Cmd+Z)"
              style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid ' + C.BORDER, background: 'transparent', color: history.canUndo ? C.TEXT : C.BORDER, cursor: history.canUndo ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: history.canUndo ? 1 : 0.4 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 105.64-11.36L1 10" /></svg>
            </button>
            <button type="button" onClick={function() { history.redo(); }} disabled={!history.canRedo} title="Redo (Cmd+Shift+Z)"
              style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid ' + C.BORDER, background: 'transparent', color: history.canRedo ? C.TEXT : C.BORDER, cursor: history.canRedo ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: history.canRedo ? 1 : 0.4 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-5.64-11.36L23 10" /></svg>
            </button>

            <div style={{ width: 1, height: 20, background: C.BORDER, margin: '0 4px' }} />

            {/* Delete selected */}
            {selectedId && (
              <button type="button" onClick={function() { if (selectedId) deleteBlock(selectedId); }} title="Delete block"
                style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'transparent', color: C.TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={function(e) { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = '#FEF2F2'; }}
                onMouseLeave={function(e) { e.currentTarget.style.color = C.TEXT_MUTED; e.currentTarget.style.background = 'transparent'; }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </button>
            )}

            {/* Duplicate */}
            {selectedId && (
              <button type="button" onClick={function() { if (selectedId) duplicateBlock(selectedId); }} title="Duplicate (Cmd+D)"
                style={{ width: 30, height: 30, borderRadius: 6, border: 'none', background: 'transparent', color: C.TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={function(e) { e.currentTarget.style.background = C.GRAY_50; }}
                onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x={9} y={9} width={13} height={13} rx={2} /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              </button>
            )}

            <div style={{ width: 1, height: 20, background: C.BORDER, margin: '0 4px' }} />

            {/* Preview */}
            <button type="button" onClick={function() {
              if (quizSlug) {
                window.open('/quiz/' + quizSlug, '_blank');
              } else if (quizId) {
                window.open('/quiz/' + quizId, '_blank');
              }
            }} title="Preview quiz"
              style={{
                height: 34, padding: '0 12px', borderRadius: 8,
                background: C.ACCENT, border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: C.FONT,
                transition: 'all 0.12s',
              }}
              onMouseEnter={function(e) { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={function(e) { e.currentTarget.style.opacity = '1'; }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Preview
            </button>

            {/* Settings gear */}
            <button type="button" onClick={function() { setSettingsOpen(!settingsOpen); }} title="Quiz settings"
              style={{
                height: 34, padding: '0 12px', borderRadius: 8,
                background: settingsOpen ? C.ACCENT_LIGHT : 'transparent',
                border: '1px solid ' + (settingsOpen ? C.ACCENT + '40' : C.BORDER),
                color: settingsOpen ? C.ACCENT : C.TEXT,
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: C.FONT,
              }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={12} cy={12} r={3} />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Settings
            </button>
          </div>
        </div>

        {/* Canvas area + Settings as flex layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: C.GRAY_50 }}>
          {/* Canvas */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '40px 32px 100px',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          }}>
            {blocks.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 120 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: 'rgba(13,115,119,0.08)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16, color: C.ACCENT,
                }}>
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={3} y={3} width={18} height={18} rx={2} />
                    <line x1={12} y1={8} x2={12} y2={16} /><line x1={8} y1={12} x2={16} y2={12} />
                  </svg>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.TEXT, marginBottom: 8, fontFamily: C.FONT }}>Add your first question</div>
                <div style={{ fontSize: 14, color: C.TEXT_MUTED, marginBottom: 20 }}>Click the + button in the sidebar to get started</div>
                <button type="button" onClick={function() { addBlock('question'); }}
                  style={{
                    padding: '12px 24px', background: C.ACCENT, color: '#fff', border: 'none',
                    borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: C.FONT,
                  }}>
                  + New Question
                </button>
              </div>
            ) : selectedBlock ? (
              selectedBlock.type === 'question' ? (
                <QuestionCanvas
                  block={selectedBlock as QuestionBlock}
                  questionNum={selectedQuestionNum}
                  totalQuestions={questionBlocks.length}
                  onChange={function(updated) { updateBlock(updated); }}
                />
              ) : selectedBlock.type === 'outcome' ? (
                <OutcomeCanvas block={selectedBlock as OutcomeBlock} onChange={function(u) { updateBlock(u); }} />
              ) : selectedBlock.type === 'leadGate' ? (
                <LeadGateCanvas block={selectedBlock as LeadGateBlock} onChange={function(u) { updateBlock(u); }} />
              ) : (
                <GenericBlockCanvas block={selectedBlock} onChange={function(u) { updateBlock(u); }} />
              )
            ) : (
              <div style={{ textAlign: 'center', marginTop: 120, color: C.TEXT_MUTED, fontSize: 14 }}>
                Select a block from the sidebar to edit
              </div>
            )}
          </div>

          {/* Settings Panel — inline */}
          {settingsOpen && (
            <SettingsPanel
              open={settingsOpen}
              onClose={function() { setSettingsOpen(false); }}
              settings={settings}
              onSettingsChange={onSettingsChange}
              userPlan={userPlan}
              quizId={quizId}
            />
          )}
        </div>
      </div>

      {/* Floating Toolbar — only when question is selected */}
      {selectedBlock && selectedBlock.type === 'question' && (
        <FloatingToolbar
          block={selectedBlock as QuestionBlock}
          allBlocks={blocks}
          onAddOption={function() {
            var qb = selectedBlock as QuestionBlock;
            if (qb.options.length >= 8) return;
            var newOpts = qb.options.slice();
            newOpts.push({ id: uid(), text: '', score: 0 });
            updateBlock(Object.assign({}, qb, { options: newOpts }) as QuestionBlock);
          }}
          onChangeLayout={function(layout) {
            var qb = selectedBlock as QuestionBlock;
            updateBlock(Object.assign({}, qb, { answerLayout: layout }) as QuestionBlock);
          }}
          onChangeTimer={function(seconds) {
            updateBlock(Object.assign({}, selectedBlock, { timeLimit: seconds }) as QuestionBlock);
          }}
          onShowBranch={function() { setShowSkipLogic(true); }}
        />
      )}

      {/* Skip Logic Modal */}
      {showSkipLogic && (
        <SkipLogicModal
          blocks={blocks}
          onClose={function() { setShowSkipLogic(false); }}
          onUpdateBlock={updateBlock}
        />
      )}

      {/* Spin animation */}
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
    </div>
  );
}
