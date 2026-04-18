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

interface Outcome {
  id: string;
  title: string;
  description: string;
  score_min?: number;
  score_max?: number;
  price?: number;
  cta_url?: string;
  cta_text?: string;
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
  BG: '#07090c',
  SURFACE: '#0a0d12',
  ELEVATED: '#0f1319',
  BORDER: '#1a1f29',
  HAIRLINE: 'rgba(255,255,255,0.05)',
  TEXT: '#f4f6f8',
  TEXT_MUTED: '#8a919c',
  TEXT_SUBTLE: '#5e6470',
  ACCENT: '#D2FF1D',
  ERROR: '#ef4444',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
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
      await api.updateQuiz(quizId, {
        title: q.title,
        description: q.description,
        questions: q.questions,
        outcomes: q.outcomes,
        settings: q.settings,
      });
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
        onSave={handleSave}
        onPreview={() => window.open(`/tools/quiz-funnel/preview?quizId=${quizId}`, '_blank')}
        onBack={() => router.push('/dashboard/quizzes')}
      />

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
            <OutcomesPanel
              outcomes={quiz.outcomes || []}
              onAdd={addOutcome}
              onUpdate={updateOutcome}
              onDelete={deleteOutcome}
              automations={automations}
              onAutomationUpdate={updateAutomation}
            />
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
  onSave,
  onPreview,
  onBack,
}: {
  title: string;
  editingTitle: boolean;
  onTitleChange: (title: string) => void;
  onEditingChange: (editing: boolean) => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  onSave: () => void;
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
                      ? 'rgba(210,255,29,0.05)'
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
/* OutcomesPanel Component                                                  */
/* ========================================================================= */
function OutcomesPanel({
  outcomes,
  onAdd,
  onUpdate,
  onDelete,
  automations,
  onAutomationUpdate,
}: {
  outcomes: Outcome[];
  onAdd: () => void;
  onUpdate: (idx: number, field: string, value: any) => void;
  onDelete: (idx: number) => void;
  automations: Record<string, { enabled: boolean; subject: string; body: string; cta_url: string; cta_text: string }>;
  onAutomationUpdate: (outcomeId: string, field: string, value: any) => void;
}) {
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
                    CTA URL (optional)
                  </label>
                  <input
                    type="text"
                    value={outcome.cta_url || ''}
                    onChange={(e) => onUpdate(idx, 'cta_url', e.target.value || undefined)}
                    placeholder="https://..."
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
                    CTA Text (optional)
                  </label>
                  <input
                    type="text"
                    value={outcome.cta_text || ''}
                    onChange={(e) => onUpdate(idx, 'cta_text', e.target.value || undefined)}
                    placeholder="Click here"
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
  const [expanded, setExpanded] = useState(false);
  const gdprEnabled = settings.gdpr_consent_enabled === true;
  const gdprText = settings.gdpr_consent_text || '';

  return (
    <div style={{
      margin: '0 16px 16px',
      background: COLORS.SURFACE,
      border: `1px solid ${COLORS.BORDER}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
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
          {/* GDPR Consent */}
          <div style={{
            background: COLORS.ELEVATED, border: `1px solid ${COLORS.BORDER}`,
            borderRadius: 6, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: gdprEnabled ? 12 : 0 }}>
              <input
                type="checkbox"
                checked={gdprEnabled}
                onChange={e => onUpdate('gdpr_consent_enabled', e.target.checked)}
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
              <div>
                <label style={{ fontSize: 11, color: COLORS.TEXT_MUTED, display: 'block', marginBottom: 4 }}>
                  Consent text
                </label>
                <input
                  type="text"
                  value={gdprText}
                  onChange={e => onUpdate('gdpr_consent_text', e.target.value)}
                  placeholder="I agree to receive communications from this business"
                  style={{
                    width: '100%', padding: '8px 10px',
                    background: COLORS.SURFACE, border: `1px solid ${COLORS.BORDER}`,
                    borderRadius: 4, color: COLORS.TEXT, fontSize: 12, outline: 'none',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
