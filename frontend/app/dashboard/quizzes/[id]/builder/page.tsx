'use client';

/**
 * /dashboard/quizzes/[id]/builder - Quiz Builder UI with drag-and-drop
 * question reordering, question editor, outcomes management, and save to API.
 *
 * Features:
 * - Left panel: Question list with drag-and-drop reordering
 * - Right panel: Question editor (when selected)
 * - Top bar: Quiz title (editable), save button, preview button
 * - Outcomes section: List of outcomes with score ranges
 * - Dark theme matching dashboard aesthetic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

import { useAutosave } from '../../_components/useAutosave';
/* ========================================================================= */
/* Types                                                                     */
/* ========================================================================= */
type QuestionType = 'multiple_choice' | 'calculator' | 'range_input' | 'text_input';

interface QuestionOption {
  id: string;
  text: string;
  score?: number;
  value?: number;
  next_question_id?: string;
}

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
}

type CtaType = 'link' | 'scheduling' | 'calendly' | 'acuity';

interface Outcome {
  id: string;
  title: string;
  description: string;
  score_min?: number;
  score_max?: number;
  price?: number;
  cta_url?: string;
  cta_text?: string;
  cta_type?: CtaType;
  type?: string;
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  outcomes?: Outcome[];
  settings?: any;
  mode?: string;
}

/* ========================================================================= */
/* Colors (matching DashboardShell)                                         */
/* ========================================================================= */
const COLORS = {
  BG: '#F7F7F5',
  SURFACE: '#FFFFFF',
  ELEVATED: '#FFFFFF',
  BORDER: '#E4E3E0',
  HAIRLINE: '#EEEDE9',
  TEXT: '#1A1A1A',
  TEXT_MUTED: '#6B6B6B',
  TEXT_SUBTLE: '#9B9B9B',
  ACCENT: '#0f7377',
  ERROR: '#C53030',
  SUCCESS: '#2D6A4F',
  WARNING: '#B45309',
};

/* ========================================================================= */
/* SVG Icons                                                                 */
/* ========================================================================= */
const SvgDrag = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <circle cx="9" cy="6" r="1.4" />
    <circle cx="9" cy="12" r="1.4" />
    <circle cx="9" cy="18" r="1.4" />
    <circle cx="15" cy="6" r="1.4" />
    <circle cx="15" cy="12" r="1.4" />
    <circle cx="15" cy="18" r="1.4" />
  </svg>
);

const SvgTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const SvgPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SvgArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const SvgEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* ========================================================================= */
/* Main Builder Component                                                   */
/* ========================================================================= */
export default function QuizBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.id as string;

  // Quiz state
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  // Optimistic locking: track version from server to detect concurrent edits
  const quizVersionRef = useRef<number>(1);
  const [conflictError, setConflictError] = useState<string | null>(null);

  /* ========================= Autosave ========================= */
  // Debounced autosave + unsaved-changes tracking. Fires 2s after the last
  // edit. Manual Save button calls saveNow() below, which flushes the
  // pending debounce. beforeunload prompt installs automatically while
  // status is 'unsaved' or 'saving'.
  const autosave = useAutosave({
    data: quiz,
    enabled: !!quiz,
    onSave: async (q) => {
      if (!q) return;
      try {
        var result = await api.updateQuiz(quizId, {
          title: q.title,
          description: q.description,
          questions: q.questions,
          outcomes: q.outcomes,
          settings: q.settings,
          expected_version: quizVersionRef.current,
        });
        // Update version from server response
        if (result && result.version) {
          quizVersionRef.current = result.version;
        }
        setConflictError(null);
      } catch (err: any) {
        if (err.message && err.message.includes('Conflict')) {
          setConflictError('Another tab or session modified this quiz. Please refresh to get the latest version.');
          throw err; // Let autosave mark status as 'error'
        }
        throw err;
      }
    },
  });

  const [originalTitle, setOriginalTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Editor state
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [rightTab, setRightTab] = useState<'outcomes' | 'routing'>('outcomes');

  // Toast
  const [toast, setToast] = useState('');
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  // Outcome automations (inline follow-up emails)
  const [automations, setAutomations] = useState<Record<string, {
    enabled: boolean; subject: string; body: string; cta_url: string; cta_text: string;
  }>>({});
  const automationSyncRef = useRef<NodeJS.Timeout | null>(null);

  /* ========================= Load Quiz ========================= */
  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) return;
      try {
        setLoading(true);
        const data = await api.getQuiz(quizId);
        setQuiz(data as QuizData);
        setOriginalTitle(data.title);
        if (data.version) quizVersionRef.current = data.version;
        // Load outcome automations
        try {
          const autos = await api.getOutcomeAutomations(quizId);
          const map: Record<string, any> = {};
          for (const a of autos) {
            if (a.outcome_id) {
              map[a.outcome_id] = {
                enabled: a.enabled, subject: a.subject || '',
                body: a.body || '', cta_url: a.cta_url || '', cta_text: a.cta_text || '',
              };
            }
          }
          setAutomations(map);
        } catch {}
      } catch (err: any) {
        setError(err?.message || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [quizId]);

  /* ========================= Toast Helper ========================= */
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  /* ========================= Question Actions ========================= */
  const addQuestion = useCallback(() => {
    if (!quiz) return;
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: 'New question',
      type: 'multiple_choice',
      options: [
        { id: `opt-${Date.now()}-1`, text: 'Option 1', score: 0 },
        { id: `opt-${Date.now()}-2`, text: 'Option 2', score: 1 },
      ],
    };
    const updated = { ...quiz, questions: [...quiz.questions, newQuestion] };
    setQuiz(updated);
    setSelectedQuestionIdx(quiz.questions.length);
    showToast('Question added');
  }, [quiz, showToast]);

  const deleteQuestion = useCallback(
    (idx: number) => {
      if (!quiz) return;
      const updated = {
        ...quiz,
        questions: quiz.questions.filter((_, i) => i !== idx),
      };
      setQuiz(updated);
      if (selectedQuestionIdx === idx) setSelectedQuestionIdx(null);
      showToast('Question deleted');
    },
    [quiz, selectedQuestionIdx, showToast]
  );

  const updateQuestion = useCallback(
    (idx: number, field: string, value: any) => {
      if (!quiz) return;
      const updated = [...quiz.questions];
      if (field === 'text') {
        updated[idx] = { ...updated[idx], text: value };
      } else if (field === 'type') {
        const oldType = updated[idx].type;
        updated[idx] = {
          ...updated[idx],
          type: value as QuestionType,
          options:
            oldType === value
              ? updated[idx].options
              : [
                  { id: `opt-${Date.now()}-1`, text: 'Option 1', score: 0 },
                  { id: `opt-${Date.now()}-2`, text: 'Option 2', score: 1 },
                ],
        };
      } else if (field === 'min') {
        updated[idx] = { ...updated[idx], min: value };
      } else if (field === 'max') {
        updated[idx] = { ...updated[idx], max: value };
      } else if (field === 'step') {
        updated[idx] = { ...updated[idx], step: value };
      }
      setQuiz({ ...quiz, questions: updated });
    },
    [quiz]
  );

  const updateOption = useCallback(
    (qIdx: number, oIdx: number, field: string, value: any) => {
      if (!quiz) return;
      const updated = [...quiz.questions];
      const options = [...updated[qIdx].options];
      if (field === 'text') {
        options[oIdx] = { ...options[oIdx], text: value };
      } else if (field === 'score') {
        options[oIdx] = { ...options[oIdx], score: value };
      } else if (field === 'value') {
        options[oIdx] = { ...options[oIdx], value: value };
      } else if (field === 'next_question_id') {
        options[oIdx] = { ...options[oIdx], next_question_id: value };
      }
      updated[qIdx] = { ...updated[qIdx], options };
      setQuiz({ ...quiz, questions: updated });
    },
    [quiz]
  );

  const addOption = useCallback(
    (qIdx: number) => {
      if (!quiz) return;
      const updated = [...quiz.questions];
      const options = [...updated[qIdx].options];
      options.push({
        id: `opt-${Date.now()}`,
        text: 'New option',
        score: options.length,
      });
      updated[qIdx] = { ...updated[qIdx], options };
      setQuiz({ ...quiz, questions: updated });
      showToast('Option added');
    },
    [quiz, showToast]
  );

  const deleteOption = useCallback(
    (qIdx: number, oIdx: number) => {
      if (!quiz) return;
      const updated = [...quiz.questions];
      const options = updated[qIdx].options.filter((_, i) => i !== oIdx);
      updated[qIdx] = { ...updated[qIdx], options };
      setQuiz({ ...quiz, questions: updated });
      showToast('Option deleted');
    },
    [quiz, showToast]
  );

  /* ========================= Drag and Drop ========================= */
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx || !quiz) return;

    const updated = [...quiz.questions];
    const [draggedQuestion] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, draggedQuestion);

    setQuiz({ ...quiz, questions: updated });
    setDraggedIdx(null);
    setDragOverIdx(null);

    if (selectedQuestionIdx === draggedIdx) {
      setSelectedQuestionIdx(targetIdx);
    }
    showToast('Question reordered');
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  /* ========================= Save ========================= */
  const handleSave = useCallback(async () => {
    if (!quiz) return;

    // M3: Validate quiz has at least 1 question and 1 outcome before saving
    if (!quiz.questions || quiz.questions.length === 0) {
      showToast('Add at least 1 question before saving');
      return;
    }
    if (!quiz.outcomes || quiz.outcomes.length === 0) {
      showToast('Add at least 1 outcome before saving');
      return;
    }

    try {
      setSaveStatus('saving');
      await autosave.saveNow();
      setSaveStatus('saved');
      showToast('Quiz saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save quiz');
      setSaveStatus('idle');
    }
  }, [quiz, autosave, showToast]);

  /* =================== Automation Sync ======================== */
  const syncAutomations = useCallback((nextAutos: Record<string, any>) => {
    if (!quizId) return;
    if (automationSyncRef.current) clearTimeout(automationSyncRef.current);
    automationSyncRef.current = setTimeout(async () => {
      try {
        const payload = Object.entries(nextAutos).map(([outcomeId, config]) => ({
          outcome_id: outcomeId, ...config,
        }));
        await api.syncOutcomeAutomations(quizId, { automations: payload });
      } catch (err) {
        console.error('[AutoSync] Failed:', err);
      }
    }, 1500);
  }, [quizId]);

  const updateAutomation = useCallback((outcomeId: string, field: string, value: any) => {
    setAutomations(prev => {
      const current = prev[outcomeId] || { enabled: false, subject: '', body: '', cta_url: '', cta_text: '' };
      const next = { ...prev, [outcomeId]: { ...current, [field]: value } };
      syncAutomations(next);
      return next;
    });
  }, [syncAutomations]);

  /* ========================= Outcomes ========================= */
  const addOutcome = useCallback(() => {
    if (!quiz) return;
    const outcomes = [...(quiz.outcomes || [])];
    outcomes.push({
      id: `outcome-${Date.now()}`,
      title: 'New outcome',
      description: '',
      score_min: 0,
      score_max: 100,
    });
    setQuiz({ ...quiz, outcomes });
    showToast('Outcome added');
  }, [quiz, showToast]);

  const updateOutcome = useCallback(
    (idx: number, field: string, value: any) => {
      if (!quiz || !quiz.outcomes) return;
      const outcomes = [...quiz.outcomes];
      outcomes[idx] = { ...outcomes[idx], [field]: value };
      setQuiz({ ...quiz, outcomes });
    },
    [quiz]
  );

  const deleteOutcome = useCallback(
    (idx: number) => {
      if (!quiz || !quiz.outcomes) return;
      const outcomes = quiz.outcomes.filter((_, i) => i !== idx);
      setQuiz({ ...quiz, outcomes });
      showToast('Outcome deleted');
    },
    [quiz, showToast]
  );

  /* ========================= Render ========================= */
  if (loading) {
    return (
      <div style={{ background: COLORS.BG, minHeight: '100vh', padding: 32, color: COLORS.TEXT }}>
        <div>Loading quiz...</div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div style={{ background: COLORS.BG, minHeight: '100vh', padding: 32, color: COLORS.TEXT }}>
        <h1>Error</h1>
        <p>{error || 'Quiz not found'}</p>
        <Link href="/dashboard/quizzes" style={{ color: COLORS.ACCENT, textDecoration: 'none' }}>
          Back to quizzes
        </Link>
      </div>
    );
  }

  const selectedQuestion =
    selectedQuestionIdx !== null ? quiz.questions[selectedQuestionIdx] : null;

  return (
    <div style={{ background: COLORS.BG, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <TopBar
        title={quiz.title}
        editingTitle={editingTitle}
        onTitleChange={(newTitle) => setQuiz({ ...quiz, title: newTitle })}
        onEditingChange={setEditingTitle}
        saveStatus={saveStatus}
        autosaveStatus={autosave.status}
        autosaveError={autosave.error}
        onSave={handleSave}
        onRetry={function() { autosave.saveNow(); }}
        onPreview={() => window.open(`/tools/quiz-funnel/preview?quizId=${quizId}`, '_blank')}
        onBack={() => router.push('/dashboard/quizzes')}
      />

      {/* Conflict error banner */}
      {conflictError && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{conflictError}</span>
          <button onClick={function() { window.location.reload(); }} style={{ marginLeft: 'auto', background: '#92400e', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Reload latest</button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel: Questions List */}
        <div
          style={{
            width: 320,
            background: COLORS.SURFACE,
            borderRight: `1px solid ${COLORS.BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          <QuestionList
            questions={quiz.questions}
            selectedIdx={selectedQuestionIdx}
            onSelect={setSelectedQuestionIdx}
            onDelete={deleteQuestion}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            draggedIdx={draggedIdx}
            dragOverIdx={dragOverIdx}
            onAddQuestion={addQuestion}
          />
        </div>

        {/* Right Panel: Question Editor or Outcomes */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            background: COLORS.BG,
          }}
        >
          {selectedQuestion ? (
            <QuestionEditor
              question={selectedQuestion}
              allQuestions={quiz.questions}
              onUpdate={(field, value) => {
                if (selectedQuestionIdx !== null) {
                  updateQuestion(selectedQuestionIdx, field, value);
                }
              }}
              onUpdateOption={(oIdx, field, value) => {
                if (selectedQuestionIdx !== null) {
                  updateOption(selectedQuestionIdx, oIdx, field, value);
                }
              }}
              onAddOption={() => {
                if (selectedQuestionIdx !== null) {
                  addOption(selectedQuestionIdx);
                }
              }}
              onDeleteOption={(oIdx) => {
                if (selectedQuestionIdx !== null) {
                  deleteOption(selectedQuestionIdx, oIdx);
                }
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Tab bar */}
              <div style={{
                display: 'flex', gap: 0,
                borderBottom: '1px solid ' + COLORS.BORDER,
                background: COLORS.ELEVATED,
                padding: '0 24px',
              }}>
                {(['outcomes', 'routing'] as const).map(function (tab) {
                  var active = tab === rightTab;
                  return (
                    <button
                      key={tab}
                      onClick={function () { setRightTab(tab); }}
                      style={{
                        padding: '12px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'none',
                        color: active ? COLORS.ACCENT : COLORS.TEXT_MUTED,
                        borderBottom: active ? '2px solid ' + COLORS.ACCENT : '2px solid transparent',
                        transition: 'all 0.15s ease',
                        textTransform: 'capitalize',
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {rightTab === 'outcomes' ? (
                  <OutcomesPanel
                    outcomes={quiz.outcomes || []}
                    onAdd={addOutcome}
                    onUpdate={updateOutcome}
                    onDelete={deleteOutcome}
                    automations={automations}
                    onAutomationUpdate={updateAutomation}
                    quizId={quizId}
                  />
                ) : (
                  <RoutingVisualization
                    questions={quiz.questions}
                    outcomes={quiz.outcomes || []}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        settings={quiz.settings || {}}
        onUpdate={(key: string, value: any) => {
          setQuiz(prev => prev ? {
            ...prev,
            settings: { ...(prev.settings || {}), [key]: value },
          } : prev);
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            background: COLORS.ELEVATED,
            border: `1px solid ${COLORS.BORDER}`,
            color: COLORS.TEXT,
            padding: '12px 16px',
            borderRadius: 8,
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* TopBar Component                                                         */
/* ========================================================================= */
function TopBar({
  title,
  editingTitle,
  onTitleChange,
  onEditingChange,
  saveStatus,
  autosaveStatus,
  autosaveError,
  onSave,
  onRetry,
  onPreview,
  onBack,
}: {
  title: string;
  editingTitle: boolean;
  onTitleChange: (title: string) => void;
  onEditingChange: (editing: boolean) => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  autosaveStatus?: 'saved' | 'saving' | 'unsaved' | 'error';
  autosaveError?: string | null;
  onSave: () => void;
  onRetry: () => void;
  onPreview: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        background: COLORS.ELEVATED,
        borderBottom: `1px solid ${COLORS.BORDER}`,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: COLORS.TEXT_MUTED,
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title="Back to quizzes"
        >
          <SvgArrowLeft />
        </button>

        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => onEditingChange(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditingChange(false);
            }}
            style={{
              background: COLORS.SURFACE,
              border: `1px solid ${COLORS.ACCENT}`,
              color: COLORS.TEXT,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
              outline: 'none',
            }}
          />
        ) : (
          <h1
            onClick={() => onEditingChange(true)}
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.TEXT,
              margin: 0,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.SURFACE;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {title}
          </h1>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onPreview}
          style={{
            background: 'none',
            border: `1px solid ${COLORS.BORDER}`,
            color: COLORS.TEXT_MUTED,
            padding: '8px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = COLORS.TEXT_MUTED;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = COLORS.BORDER;
          }}
        >
          <SvgEye />
          Preview
        </button>

        {/* Autosave status indicator with retry */}
        {autosaveStatus === 'error' && (
          <button
            onClick={onRetry}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
            title={autosaveError || 'Save failed — click to retry'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Save failed — retry
          </button>
        )}
        {autosaveStatus === 'saving' && (
          <span style={{ color: COLORS.TEXT_MUTED, fontSize: 12 }}>Auto-saving...</span>
        )}
        {autosaveStatus === 'unsaved' && (
          <span style={{ color: '#f59e0b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
            Unsaved
          </span>
        )}

        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          style={{
            background: saveStatus === 'saved' ? COLORS.SUCCESS : COLORS.ACCENT,
            border: 'none',
            color: saveStatus === 'saved' ? '#fff' : COLORS.BG,
            padding: '8px 16px',
            borderRadius: 6,
            cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 700,
            transition: 'all 0.2s',
            opacity: saveStatus === 'saving' ? 0.7 : 1,
          }}
        >
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* QuestionList Component                                                   */
/* ========================================================================= */
function QuestionList({
  questions,
  selectedIdx,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  draggedIdx,
  dragOverIdx,
  onAddQuestion,
}: {
  questions: Question[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  onDelete: (idx: number) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  draggedIdx: number | null;
  dragOverIdx: number | null;
  onAddQuestion: () => void;
}) {
  return (
    <>
      <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.BORDER}` }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: COLORS.TEXT_MUTED, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Questions ({questions.length})
        </h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {questions.map((q, idx) => (
          <div
            key={q.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            onClick={() => onSelect(idx)}
            style={{
              padding: '12px 12px',
              borderBottom: `1px solid ${COLORS.BORDER}`,
              background:
                selectedIdx === idx
                  ? COLORS.ELEVATED
                  : draggedIdx === idx
                    ? COLORS.ELEVATED
                    : dragOverIdx === idx
                      ? 'rgba(13,115,119,0.06)'
                      : 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              opacity: draggedIdx === idx ? 0.5 : 1,
              borderLeft: selectedIdx === idx ? `3px solid ${COLORS.ACCENT}` : '3px solid transparent',
              paddingLeft: '9px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <div
              style={{
                color: COLORS.TEXT_MUTED,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <SvgDrag />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: COLORS.TEXT, fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.text || 'Untitled'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.TEXT_MUTED,
                  background: COLORS.SURFACE,
                  display: 'inline-block',
                  padding: '2px 6px',
                  borderRadius: 3,
                  textTransform: 'capitalize',
                }}
              >
                {q.type}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idx);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.TEXT_MUTED,
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = COLORS.ERROR;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = COLORS.TEXT_MUTED;
              }}
              title="Delete question"
            >
              <SvgTrash />
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '12px',
          borderTop: `1px solid ${COLORS.BORDER}`,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={onAddQuestion}
          style={{
            flex: 1,
            background: COLORS.ELEVATED,
            border: `1px dashed ${COLORS.BORDER}`,
            color: COLORS.ACCENT,
            padding: '10px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.SURFACE;
            e.currentTarget.style.borderColor = COLORS.ACCENT;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = COLORS.ELEVATED;
            e.currentTarget.style.borderColor = COLORS.BORDER;
          }}
        >
          <SvgPlus />
          Add Question
        </button>
      </div>
    </>
  );
}

/* ========================================================================= */
/* QuestionEditor Component                                                 */
/* ========================================================================= */
function QuestionEditor({
  question,
  allQuestions,
  onUpdate,
  onUpdateOption,
  onAddOption,
  onDeleteOption,
}: {
  question: Question;
  allQuestions: Question[];
  onUpdate: (field: string, value: any) => void;
  onUpdateOption: (oIdx: number, field: string, value: any) => void;
  onAddOption: () => void;
  onDeleteOption: (oIdx: number) => void;
}) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 800 }}>
        {/* Question Text */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: COLORS.TEXT_MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Question Text
          </label>
          <textarea
            value={question.text}
            onChange={(e) => onUpdate('text', e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: COLORS.SURFACE,
              border: `1px solid ${COLORS.BORDER}`,
              borderRadius: 8,
              color: COLORS.TEXT,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: 80,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = COLORS.ACCENT;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = COLORS.BORDER;
            }}
          />
        </div>

        {/* Question Type */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: COLORS.TEXT_MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Question Type
          </label>
          <select
            value={question.type}
            onChange={(e) => onUpdate('type', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: COLORS.SURFACE,
              border: `1px solid ${COLORS.BORDER}`,
              borderRadius: 6,
              color: COLORS.TEXT,
              fontSize: 14,
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = COLORS.ACCENT;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = COLORS.BORDER;
            }}
          >
            <option value="multiple_choice">Multiple Choice</option>
            <option value="calculator">Calculator</option>
            <option value="range_input">Range Input</option>
            <option value="text_input">Text Input</option>
          </select>
        </div>

        {/* Range Input Type Fields */}
        {question.type === 'range_input' && (
          <div
            style={{
              marginBottom: 28,
              padding: 16,
              background: COLORS.SURFACE,
              borderRadius: 8,
              border: `1px solid ${COLORS.BORDER}`,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: COLORS.TEXT_MUTED, marginBottom: 6 }}>
                  Min
                </label>
                <input
                  type="number"
                  value={question.min ?? 0}
                  onChange={(e) => onUpdate('min', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 4,
                    color: COLORS.TEXT,
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: COLORS.TEXT_MUTED, marginBottom: 6 }}>
                  Max
                </label>
                <input
                  type="number"
                  value={question.max ?? 100}
                  onChange={(e) => onUpdate('max', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 4,
                    color: COLORS.TEXT,
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: COLORS.TEXT_MUTED, marginBottom: 6 }}>
                  Step
                </label>
                <input
                  type="number"
                  value={question.step ?? 1}
                  onChange={(e) => onUpdate('step', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 4,
                    color: COLORS.TEXT,
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Answer Options */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.TEXT_MUTED, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {question.type === 'text_input' ? 'Expected Response' : 'Answer Options'} ({question.options.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {question.options.map((opt, oIdx) => (
              <div
                key={opt.id}
                style={{
                  padding: 12,
                  background: COLORS.SURFACE,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.BORDER}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => onUpdateOption(oIdx, 'text', e.target.value)}
                  placeholder="Option text"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 6,
                    color: COLORS.TEXT,
                    fontSize: 13,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = COLORS.ACCENT;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = COLORS.BORDER;
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: question.type === 'calculator' ? '1fr 1fr' : '1fr', gap: 10 }}>
                  {question.type === 'calculator' && (
                    <div>
                      <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                        Value
                      </label>
                      <input
                        type="number"
                        value={opt.value ?? 0}
                        onChange={(e) => onUpdateOption(oIdx, 'value', parseFloat(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: COLORS.ELEVATED,
                          border: `1px solid ${COLORS.BORDER}`,
                          borderRadius: 4,
                          color: COLORS.TEXT,
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                      Score Weight
                    </label>
                    <input
                      type="number"
                      value={opt.score ?? 0}
                      onChange={(e) => onUpdateOption(oIdx, 'score', parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        borderRadius: 4,
                        color: COLORS.TEXT,
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {question.type === 'multiple_choice' && (
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                      If selected, go to
                    </label>
                    <select
                      value={opt.next_question_id || ''}
                      onChange={(e) => onUpdateOption(oIdx, 'next_question_id', e.target.value || undefined)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        borderRadius: 4,
                        color: COLORS.TEXT,
                        fontSize: 12,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="">Next question (auto)</option>
                      {allQuestions
                        .filter((q) => q.id !== question.id)
                        .map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.text || 'Untitled'}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => onDeleteOption(oIdx)}
                  style={{
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    color: COLORS.ERROR,
                    padding: '8px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.SURFACE;
                    e.currentTarget.style.borderColor = COLORS.ERROR;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLORS.ELEVATED;
                    e.currentTarget.style.borderColor = COLORS.BORDER;
                  }}
                >
                  <SvgTrash />
                  Delete
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={onAddOption}
            style={{
              marginTop: 12,
              width: '100%',
              background: COLORS.ELEVATED,
              border: `1px dashed ${COLORS.BORDER}`,
              color: COLORS.ACCENT,
              padding: '10px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.SURFACE;
              e.currentTarget.style.borderColor = COLORS.ACCENT;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.ELEVATED;
              e.currentTarget.style.borderColor = COLORS.BORDER;
            }}
          >
            <SvgPlus />
            Add Option
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* RoutingVisualization Component                                           */
/* ========================================================================= */

const ROUTE_COLORS = [
  '#0f7377', '#22d3ee', '#f472b6', '#a78bfa', '#fb923c',
  '#34d399', '#f87171', '#facc15', '#818cf8', '#38bdf8',
];

function RoutingVisualization({
  questions,
  outcomes,
}: {
  questions: Question[];
  outcomes: Outcome[];
}) {
  // Compute the max possible score (sum of max option score per question)
  var maxPossible = 0;
  var minPossible = 0;
  questions.forEach(function (q) {
    if (q.options.length === 0) return;
    var scores = q.options.map(function (o) { return o.score || 0; });
    maxPossible += Math.max.apply(null, scores);
    minPossible += Math.min.apply(null, scores);
  });

  // Check if branching (next_question_id) is used
  var hasBranching = questions.some(function (q) {
    return q.options.some(function (o) { return !!o.next_question_id; });
  });

  // For each outcome, determine which score range it covers
  var sortedOutcomes = outcomes.slice().sort(function (a, b) {
    return (a.score_min || 0) - (b.score_min || 0);
  });

  // Build per-question contribution summary
  var questionSummaries = questions.map(function (q, qi) {
    var scores = q.options.map(function (o) { return o.score || 0; });
    var lo = scores.length > 0 ? Math.min.apply(null, scores) : 0;
    var hi = scores.length > 0 ? Math.max.apply(null, scores) : 0;
    return { question: q, index: qi, lo: lo, hi: hi };
  });

  if (questions.length === 0 && outcomes.length === 0) {
    return (
      <div style={{ padding: 24, color: COLORS.TEXT_MUTED, textAlign: 'center', marginTop: 60 }}>
        <p style={{ fontSize: 14 }}>Add questions and outcomes to see routing.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 900 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.TEXT, margin: '0 0 4px 0' }}>Score routing</h2>
        <p style={{ fontSize: 13, color: COLORS.TEXT_MUTED, margin: '0 0 20px 0' }}>
          Each answer adds points. The final score determines the outcome.
        </p>

        {/* Score range bar */}
        {outcomes.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.TEXT_SUBTLE, marginBottom: 8 }}>
              Outcome score ranges ({minPossible} - {maxPossible} possible)
            </div>
            <div style={{
              display: 'flex', borderRadius: 6, overflow: 'hidden',
              border: '1px solid ' + COLORS.BORDER, height: 32,
            }}>
              {sortedOutcomes.map(function (oc, i) {
                var lo = oc.score_min != null ? oc.score_min : minPossible;
                var hi = oc.score_max != null ? oc.score_max : maxPossible;
                var range = maxPossible - minPossible || 1;
                var widthPct = ((hi - lo) / range) * 100;
                var color = ROUTE_COLORS[i % ROUTE_COLORS.length];
                return (
                  <div
                    key={oc.id}
                    title={oc.title + ': ' + lo + ' - ' + hi}
                    style={{
                      width: widthPct + '%',
                      minWidth: 24,
                      background: color + '18',
                      borderRight: i < sortedOutcomes.length - 1 ? '1px solid ' + COLORS.BORDER : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: color,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {oc.title}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: COLORS.TEXT_SUBTLE }}>{minPossible}</span>
              <span style={{ fontSize: 10, color: COLORS.TEXT_SUBTLE }}>{maxPossible}</span>
            </div>
          </div>
        )}

        {/* Question flow */}
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.TEXT_SUBTLE, marginBottom: 10 }}>
          Question flow ({questions.length} question{questions.length !== 1 ? 's' : ''})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questionSummaries.map(function (qs, qi) {
            return (
              <div key={qs.question.id} style={{
                background: COLORS.ELEVATED,
                border: '1px solid ' + COLORS.BORDER,
                borderRadius: 10,
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: COLORS.ACCENT + '20', color: COLORS.ACCENT,
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{qi + 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.TEXT, flex: 1 }}>
                    {qs.question.text || 'Untitled question'}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.TEXT_SUBTLE }}>
                    {qs.lo === qs.hi ? qs.lo + ' pts' : qs.lo + ' - ' + qs.hi + ' pts'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {qs.question.options.map(function (opt) {
                    var score = opt.score || 0;
                    // Color-code by which outcome this score leans toward
                    var matchIdx = -1;
                    if (sortedOutcomes.length > 0) {
                      for (var k = 0; k < sortedOutcomes.length; k++) {
                        var oLo = sortedOutcomes[k].score_min != null ? sortedOutcomes[k].score_min! : minPossible;
                        var oHi = sortedOutcomes[k].score_max != null ? sortedOutcomes[k].score_max! : maxPossible;
                        var midpoint = (oLo + oHi) / 2;
                        if (matchIdx === -1 || Math.abs(score - midpoint) < Math.abs(score - ((sortedOutcomes[matchIdx].score_min || 0) + (sortedOutcomes[matchIdx].score_max || 0)) / 2)) {
                          matchIdx = k;
                        }
                      }
                    }
                    var pillColor = matchIdx >= 0 ? ROUTE_COLORS[matchIdx % ROUTE_COLORS.length] : COLORS.TEXT_MUTED;
                    var branchTarget = opt.next_question_id
                      ? questions.findIndex(function (qq) { return qq.id === opt.next_question_id; })
                      : -1;
                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: '5px 10px',
                          background: pillColor + '12',
                          border: '1px solid ' + pillColor + '30',
                          borderRadius: 6,
                          fontSize: 12,
                          color: COLORS.TEXT,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        title={opt.text + ' (' + score + ' pts)' + (branchTarget >= 0 ? ' -> Q' + (branchTarget + 1) : '')}
                      >
                        <span style={{ color: COLORS.TEXT_MUTED }}>{opt.text}</span>
                        <span style={{
                          fontWeight: 700, fontSize: 11, color: pillColor,
                          padding: '1px 5px', background: pillColor + '18', borderRadius: 4,
                        }}>
                          {score > 0 ? '+' : ''}{score}
                        </span>
                        {branchTarget >= 0 && (
                          <span style={{ fontSize: 10, color: COLORS.TEXT_SUBTLE }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                            </svg>
                            Q{branchTarget + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Outcome cards */}
        {outcomes.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.TEXT_SUBTLE, marginBottom: 10 }}>
              Outcomes ({outcomes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedOutcomes.map(function (oc, i) {
                var color = ROUTE_COLORS[i % ROUTE_COLORS.length];
                var lo = oc.score_min != null ? oc.score_min : '?';
                var hi = oc.score_max != null ? oc.score_max : '?';
                return (
                  <div
                    key={oc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: COLORS.ELEVATED,
                      border: '1px solid ' + COLORS.BORDER,
                      borderLeft: '3px solid ' + color,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.TEXT }}>{oc.title}</div>
                      {oc.description && (
                        <div style={{ fontSize: 12, color: COLORS.TEXT_MUTED, marginTop: 2 }}>{oc.description}</div>
                      )}
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      background: color + '15',
                      border: '1px solid ' + color + '30',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: color,
                      whiteSpace: 'nowrap',
                    }}>
                      {lo} - {hi} pts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Branching info */}
        {hasBranching && (
          <div style={{
            marginTop: 20,
            padding: '12px 16px',
            background: 'rgba(251,146,60,0.08)',
            border: '1px solid rgba(251,146,60,0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: '#fb923c',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This quiz uses branching logic. Some answers skip to specific questions (shown with arrows above).
          </div>
        )}

        {/* Coverage warnings */}
        {outcomes.length > 0 && (function () {
          var gaps: string[] = [];
          // Check for gaps between outcome ranges
          for (var i = 0; i < sortedOutcomes.length - 1; i++) {
            var currMax = sortedOutcomes[i].score_max;
            var nextMin = sortedOutcomes[i + 1].score_min;
            if (currMax != null && nextMin != null && nextMin > currMax + 1) {
              gaps.push('Gap between ' + currMax + ' and ' + nextMin);
            }
          }
          // Check if outcomes cover full range
          if (sortedOutcomes.length > 0) {
            var firstMin = sortedOutcomes[0].score_min;
            var lastMax = sortedOutcomes[sortedOutcomes.length - 1].score_max;
            if (firstMin != null && firstMin > minPossible) {
              gaps.push('No outcome covers scores below ' + firstMin);
            }
            if (lastMax != null && lastMax < maxPossible) {
              gaps.push('No outcome covers scores above ' + lastMax);
            }
          }
          if (gaps.length === 0) return null;
          return (
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              fontSize: 12,
              color: COLORS.ERROR,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Score coverage issues:
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 18 }}>
                {gaps.map(function (g, gi) { return <li key={gi} style={{ marginBottom: 2 }}>{g}</li>; })}
              </ul>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* OutcomesPanel Component                                                  */
/* ========================================================================= */
function OutcomesPanel({
  outcomes,
  onAdd,
  onUpdate,
  onDelete,
  automations,
  onAutomationUpdate,
  quizId,
}: {
  outcomes: Outcome[];
  onAdd: () => void;
  onUpdate: (idx: number, field: string, value: any) => void;
  onDelete: (idx: number) => void;
  automations: Record<string, { enabled: boolean; subject: string; body: string; cta_url: string; cta_text: string }>;
  onAutomationUpdate: (outcomeId: string, field: string, value: any) => void;
  quizId: string;
}) {
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const handleGenerate = async (outcomeId: string) => {
    if (!quizId || generating[outcomeId]) return;
    setGenerating(prev => ({ ...prev, [outcomeId]: true }));
    try {
      const result = await api.generateEmailContent(quizId, {
        outcome_id: outcomeId,
        fields: ['subject', 'body'],
      });
      if (result.subject) onAutomationUpdate(outcomeId, 'subject', result.subject);
      if (result.body) onAutomationUpdate(outcomeId, 'body', result.body);
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setGenerating(prev => ({ ...prev, [outcomeId]: false }));
    }
  };
  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.TEXT, margin: 0 }}>Outcomes</h2>
          <button
            onClick={onAdd}
            style={{
              background: COLORS.ACCENT,
              border: 'none',
              color: COLORS.BG,
              padding: '8px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <SvgPlus />
            Add Outcome
          </button>
        </div>

        {outcomes.length === 0 ? (
          <div
            style={{
              padding: 32,
              background: COLORS.SURFACE,
              borderRadius: 8,
              border: `1px solid ${COLORS.BORDER}`,
              textAlign: 'center',
              color: COLORS.TEXT_MUTED,
            }}
          >
            No outcomes yet. Add one to define what users see at the end of the quiz.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {outcomes.map((outcome, idx) => (
              <div
                key={outcome.id}
                style={{
                  padding: 16,
                  background: COLORS.SURFACE,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.BORDER}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <input
                  type="text"
                  value={outcome.title}
                  onChange={(e) => onUpdate(idx, 'title', e.target.value)}
                  placeholder="Outcome title"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 6,
                    color: COLORS.TEXT,
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />

                <textarea
                  value={outcome.description}
                  onChange={(e) => onUpdate(idx, 'description', e.target.value)}
                  placeholder="Outcome description"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 6,
                    color: COLORS.TEXT,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: 60,
                    outline: 'none',
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                      Min Score
                    </label>
                    <input
                      type="number"
                      value={outcome.score_min ?? 0}
                      onChange={(e) => onUpdate(idx, 'score_min', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        borderRadius: 4,
                        color: COLORS.TEXT,
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                      Max Score
                    </label>
                    <input
                      type="number"
                      value={outcome.score_max ?? 100}
                      onChange={(e) => onUpdate(idx, 'score_max', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        borderRadius: 4,
                        color: COLORS.TEXT,
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                      Price (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={outcome.price ?? ''}
                      onChange={(e) => onUpdate(idx, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        borderRadius: 4,
                        color: COLORS.TEXT,
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                    CTA type
                  </label>
                  <select
                    value={outcome.cta_type || 'link'}
                    onChange={(e) => {
                      const t = e.target.value as CtaType;
                      const patch: Record<string, any> = { cta_type: t };
                      if (t === 'scheduling') {
                        if (!outcome.cta_text) patch.cta_text = 'Book a session';
                      } else if (t === 'calendly') {
                        if (!outcome.cta_text) patch.cta_text = 'Schedule a call';
                      } else if (t === 'acuity') {
                        if (!outcome.cta_text) patch.cta_text = 'Book an appointment';
                      }
                      for (const [k, v] of Object.entries(patch)) onUpdate(idx, k, v);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: COLORS.ELEVATED,
                      border: `1px solid ${COLORS.BORDER}`,
                      borderRadius: 4,
                      color: COLORS.TEXT,
                      fontSize: 12,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="link">Custom link</option>
                    <option value="scheduling">Squarespace Scheduling</option>
                    <option value="acuity">Acuity Scheduling</option>
                    <option value="calendly">Calendly</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                    {(outcome.cta_type === 'scheduling' || outcome.cta_type === 'acuity')
                      ? 'Acuity / Squarespace Scheduling URL'
                      : outcome.cta_type === 'calendly'
                        ? 'Calendly link'
                        : 'CTA URL (optional)'}
                  </label>
                  <input
                    type="text"
                    value={outcome.cta_url || ''}
                    onChange={(e) => onUpdate(idx, 'cta_url', e.target.value || undefined)}
                    placeholder={
                      (outcome.cta_type === 'scheduling' || outcome.cta_type === 'acuity')
                        ? 'https://app.acuityscheduling.com/schedule.php?owner=...'
                        : outcome.cta_type === 'calendly'
                          ? 'https://calendly.com/your-name/meeting'
                          : 'https://...'
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: COLORS.ELEVATED,
                      border: `1px solid ${COLORS.BORDER}`,
                      borderRadius: 4,
                      color: COLORS.TEXT,
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  {(outcome.cta_type === 'scheduling' || outcome.cta_type === 'acuity') && (
                    <div style={{ fontSize: 10.5, color: COLORS.TEXT_SUBTLE, marginTop: 4, lineHeight: 1.4 }}>
                      Lead name and email are auto-filled on the booking page.
                    </div>
                  )}
                  {outcome.cta_type === 'calendly' && (
                    <div style={{ fontSize: 10.5, color: COLORS.TEXT_SUBTLE, marginTop: 4, lineHeight: 1.4 }}>
                      Lead name and email are pre-filled via Calendly URL params.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                    CTA Text (optional)
                  </label>
                  <input
                    type="text"
                    value={outcome.cta_text || ''}
                    onChange={(e) => onUpdate(idx, 'cta_text', e.target.value || undefined)}
                    placeholder={
                      (outcome.cta_type === 'scheduling' || outcome.cta_type === 'acuity')
                        ? 'Book a session'
                        : outcome.cta_type === 'calendly'
                          ? 'Schedule a call'
                          : 'Click here'
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: COLORS.ELEVATED,
                      border: `1px solid ${COLORS.BORDER}`,
                      borderRadius: 4,
                      color: COLORS.TEXT,
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Follow-up Email Automation */}
                <div style={{
                  borderTop: `1px solid ${COLORS.BORDER}`,
                  paddingTop: 12,
                  marginTop: 4,
                }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: COLORS.TEXT_MUTED,
                  }}>
                    <input
                      type="checkbox"
                      checked={automations[outcome.id]?.enabled || false}
                      onChange={(e) => onAutomationUpdate(outcome.id, 'enabled', e.target.checked)}
                      style={{ accentColor: COLORS.ACCENT }}
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Send follow-up email when reached
                  </label>
                  {automations[outcome.id]?.enabled && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleGenerate(outcome.id)}
                          disabled={generating[outcome.id]}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${COLORS.ACCENT}`,
                            color: COLORS.ACCENT,
                            padding: '4px 10px',
                            borderRadius: 4,
                            cursor: generating[outcome.id] ? 'wait' : 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            opacity: generating[outcome.id] ? 0.6 : 1,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                          {generating[outcome.id] ? 'Generating...' : 'Generate with AI'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={automations[outcome.id]?.subject || ''}
                        onChange={(e) => onAutomationUpdate(outcome.id, 'subject', e.target.value)}
                        placeholder="Email subject line"
                        style={{
                          width: '100%', padding: '8px 10px',
                          background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}`,
                          borderRadius: 4, color: COLORS.TEXT, fontSize: 12, outline: 'none',
                        }}
                      />
                      <textarea
                        value={automations[outcome.id]?.body || ''}
                        onChange={(e) => onAutomationUpdate(outcome.id, 'body', e.target.value)}
                        placeholder="Email body (HTML or plain text). Use {{outcome_name}}, {{first_name}}, {{quiz_name}} for personalization."
                        style={{
                          width: '100%', padding: '8px 10px',
                          background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}`,
                          borderRadius: 4, color: COLORS.TEXT, fontSize: 12,
                          fontFamily: 'inherit', resize: 'vertical', minHeight: 60, outline: 'none',
                        }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                        <input
                          type="text"
                          value={automations[outcome.id]?.cta_url || ''}
                          onChange={(e) => onAutomationUpdate(outcome.id, 'cta_url', e.target.value)}
                          placeholder="CTA link (optional)"
                          style={{
                            width: '100%', padding: '8px 10px',
                            background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}`,
                            borderRadius: 4, color: COLORS.TEXT, fontSize: 12, outline: 'none',
                          }}
                        />
                        <input
                          type="text"
                          value={automations[outcome.id]?.cta_text || ''}
                          onChange={(e) => onAutomationUpdate(outcome.id, 'cta_text', e.target.value)}
                          placeholder="Button text"
                          style={{
                            width: '100%', padding: '8px 10px',
                            background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}`,
                            borderRadius: 4, color: COLORS.TEXT, fontSize: 12, outline: 'none',
                          }}
                        />
                      </div>
                      <p style={{ fontSize: 11, color: COLORS.TEXT_SUBTLE, margin: 0 }}>
                        Sends immediately when a respondent reaches this outcome.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onDelete(idx)}
                  style={{
                    background: COLORS.ELEVATED,
                    border: `1px solid ${COLORS.BORDER}`,
                    color: COLORS.ERROR,
                    padding: '8px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.SURFACE;
                    e.currentTarget.style.borderColor = COLORS.ERROR;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLORS.ELEVATED;
                    e.currentTarget.style.borderColor = COLORS.BORDER;
                  }}
                >
                  <SvgTrash />
                  Delete Outcome
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SettingsPanel Component                                                   */
/* ========================================================================= */
function SettingsPanel({
  settings,
  onUpdate,
}: {
  settings: any;
  onUpdate: (key: string, value: any) => void;
}) {
  var [expanded, setExpanded] = useState(false);
  var gdprEnabled = settings.gdpr_consent_enabled === true;
  var gdprText = settings.gdpr_consent_text || '';
  var redirectUrl = settings.redirect_url || '';
  var redirectDelay = settings.redirect_delay || 5;
  var scheduleEnabled = settings.schedule_enabled === true;
  var publishAt = settings.publish_at || '';
  var unpublishAt = settings.unpublish_at || '';
  var gdprPolicyUrl = settings.gdpr_policy_url || '';
  var gdprDataRetentionDays = settings.gdpr_data_retention_days || '';
  var gdprAllowDeletion = settings.gdpr_allow_deletion !== false;

  var settingsInputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    background: COLORS.SURFACE, border: '1px solid ' + COLORS.BORDER,
    borderRadius: 4, color: COLORS.TEXT, fontSize: 12, outline: 'none',
    fontFamily: '"Poppins",system-ui,sans-serif',
  };

  var settingsLabelStyle: React.CSSProperties = {
    fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4,
  };

  var settingsBlockStyle: React.CSSProperties = {
    background: COLORS.ELEVATED, border: '1px solid ' + COLORS.BORDER,
    borderRadius: 6, padding: 14,
  };

  return (
    <div style={{
      margin: '0 16px 16px',
      background: COLORS.SURFACE,
      border: '1px solid ' + COLORS.BORDER,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={function() { setExpanded(!expanded); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'transparent', border: 'none',
          color: COLORS.TEXT, cursor: 'pointer', fontSize: 15, fontWeight: 600,
        }}
      >
        <span>Settings</span>
        <span style={{ color: COLORS.TEXT_MUTED, fontSize: 12 }}>{expanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Custom Redirect After Completion ── */}
          <div style={settingsBlockStyle}>
            <div style={{ color: COLORS.TEXT, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Custom redirect after completion
            </div>
            <div style={{ color: COLORS.TEXT_MUTED, fontSize: 11, marginBottom: 10 }}>
              Redirect visitors to a specific page after they see their result (e.g. product page, booking link).
            </div>
            <label style={settingsLabelStyle}>Redirect URL</label>
            <input
              type="url"
              value={redirectUrl}
              onChange={function(e) { onUpdate('redirect_url', e.target.value); }}
              placeholder="https://yoursite.com/thank-you"
              style={{ ...settingsInputStyle, marginBottom: 8 }}
            />
            {redirectUrl && (
              <div>
                <label style={settingsLabelStyle}>Delay before redirect (seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={redirectDelay}
                  onChange={function(e) { onUpdate('redirect_delay', Number(e.target.value)); }}
                  style={{ ...settingsInputStyle, width: 80 }}
                />
              </div>
            )}
          </div>

          {/* ── Quiz Scheduling ── */}
          <div style={settingsBlockStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: scheduleEnabled ? 12 : 0 }}>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={function(e) { onUpdate('schedule_enabled', e.target.checked); }}
                style={{ accentColor: COLORS.ACCENT, cursor: 'pointer' }}
              />
              <div>
                <div style={{ color: COLORS.TEXT, fontSize: 13, fontWeight: 600 }}>
                  Schedule quiz availability
                </div>
                <div style={{ color: COLORS.TEXT_MUTED, fontSize: 11, marginTop: 2 }}>
                  Auto-publish and auto-unpublish at specific dates. Perfect for seasonal promotions.
                </div>
              </div>
            </div>
            {scheduleEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={settingsLabelStyle}>Publish at</label>
                  <input
                    type="datetime-local"
                    value={publishAt}
                    onChange={function(e) { onUpdate('publish_at', e.target.value); }}
                    style={settingsInputStyle}
                  />
                </div>
                <div>
                  <label style={settingsLabelStyle}>Unpublish at</label>
                  <input
                    type="datetime-local"
                    value={unpublishAt}
                    onChange={function(e) { onUpdate('unpublish_at', e.target.value); }}
                    style={settingsInputStyle}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── GDPR Consent ── */}
          <div style={settingsBlockStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: gdprEnabled ? 12 : 0 }}>
              <input
                type="checkbox"
                checked={gdprEnabled}
                onChange={function(e) { onUpdate('gdpr_consent_enabled', e.target.checked); }}
                style={{ accentColor: COLORS.ACCENT, cursor: 'pointer' }}
              />
              <div>
                <div style={{ color: COLORS.TEXT, fontSize: 13, fontWeight: 600 }}>
                  Require GDPR consent
                </div>
                <div style={{ color: COLORS.TEXT_MUTED, fontSize: 11, marginTop: 2 }}>
                  Show a consent checkbox on the lead capture step. Emails will only be sent to leads who opt in.
                </div>
              </div>
            </div>
            {gdprEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={settingsLabelStyle}>Consent checkbox text</label>
                  <input
                    type="text"
                    value={gdprText}
                    onChange={function(e) { onUpdate('gdpr_consent_text', e.target.value); }}
                    placeholder="I agree to receive communications from this business"
                    style={settingsInputStyle}
                  />
                </div>
                <div>
                  <label style={settingsLabelStyle}>Privacy policy URL (shown as link)</label>
                  <input
                    type="url"
                    value={gdprPolicyUrl}
                    onChange={function(e) { onUpdate('gdpr_policy_url', e.target.value); }}
                    placeholder="https://yoursite.com/privacy-policy"
                    style={settingsInputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={settingsLabelStyle}>Data retention (days)</label>
                    <input
                      type="number"
                      min="30"
                      max="3650"
                      value={gdprDataRetentionDays}
                      onChange={function(e) { onUpdate('gdpr_data_retention_days', Number(e.target.value)); }}
                      placeholder="365"
                      style={settingsInputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
                    <input
                      type="checkbox"
                      checked={gdprAllowDeletion}
                      onChange={function(e) { onUpdate('gdpr_allow_deletion', e.target.checked); }}
                      style={{ accentColor: COLORS.ACCENT, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, color: COLORS.TEXT }}>Allow data deletion requests</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
