'use client';

import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';
/* Inline icon components */
function ArrowLeftIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
}
function TrashIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
}
function DragHandleIcon({ size = 16, color = '#8b919a' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

const COLORS = {
  BG: '#07090c',
  SURFACE: '#0d1117',
  ELEVATED: '#161b22',
  BORDER: '#1b1f27',
  TEXT: '#f0f2f5',
  TEXT_MUTED: '#8b919a',
  ACCENT: '#D2FF1D',
};

const FONT_FAMILY = '"DM Sans", system-ui, sans-serif';

interface Option {
  id: string;
  text: string;
  score?: number;
}

interface Question {
  id: string;
  text: string;
  subtitle?: string;
  options: Option[];
}

interface Outcome {
  id: string;
  title: string;
  description: string;
  ctaText?: string;
  minScore?: number;
  maxScore?: number;
}

interface Branding {
  colors?: Record<string, string>;
  font_family?: string;
  site_name?: string;
  favicon_url?: string;
}

interface Settings {
  leadGate?: boolean;
  description?: string;
}

interface Quiz {
  id: string;
  title: string;
  slug: string;
  questions: Question[];
  outcomes: Outcome[];
  branding: Branding;
  settings: Settings;
  status: 'draft' | 'live';
  website_url?: string;
}

type TabType = 'questions' | 'outcomes' | 'settings';

function EditorContent() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const quizId = params?.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('questions');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch quiz on mount
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) return;
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch quiz');
        const data = await response.json();
        setQuiz(data);
        setTitleInput(data.title);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId, getToken]);

  // Auto-save with debounce
  const debouncedSave = useCallback(async (quizData: Quiz) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: quizData.title,
            questions: quizData.questions,
            outcomes: quizData.outcomes,
            branding: quizData.branding,
            settings: quizData.settings,
          }),
        });
        if (!response.ok) throw new Error('Failed to save quiz');
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Save error:', err);
        setSaveStatus('idle');
      }
    }, 2000);
  }, [quizId, getToken]);

  const updateQuiz = useCallback((updates: Partial<Quiz>) => {
    setQuiz((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // Question handlers
  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    updateQuiz({
      questions: quiz!.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'New question',
      subtitle: '',
      options: [
        { id: Math.random().toString(36).substr(2, 9), text: 'Option 1' },
        { id: Math.random().toString(36).substr(2, 9), text: 'Option 2' },
        { id: Math.random().toString(36).substr(2, 9), text: 'Option 3' },
        { id: Math.random().toString(36).substr(2, 9), text: 'Option 4' },
      ],
    };
    updateQuiz({
      questions: [...quiz!.questions, newQuestion],
    });
  };

  const deleteQuestion = (questionId: string) => {
    updateQuiz({
      questions: quiz!.questions.filter((q) => q.id !== questionId),
    });
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    updates: Partial<Option>
  ) => {
    updateQuestion(questionId, {
      options: quiz!.questions
        .find((q) => q.id === questionId)!
        .options.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
    });
  };

  const addOption = (questionId: string) => {
    const question = quiz!.questions.find((q) => q.id === questionId);
    if (!question) return;
    updateQuestion(questionId, {
      options: [
        ...question.options,
        {
          id: Math.random().toString(36).substr(2, 9),
          text: 'New option',
        },
      ],
    });
  };

  const deleteOption = (questionId: string, optionId: string) => {
    updateQuestion(questionId, {
      options: quiz!.questions
        .find((q) => q.id === questionId)!
        .options.filter((o) => o.id !== optionId),
    });
  };

  // Outcome handlers
  const updateOutcome = (outcomeId: string, updates: Partial<Outcome>) => {
    updateQuiz({
      outcomes: quiz!.outcomes.map((o) =>
        o.id === outcomeId ? { ...o, ...updates } : o
      ),
    });
  };

  const addOutcome = () => {
    const newOutcome: Outcome = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New outcome',
      description: '',
      ctaText: '',
    };
    updateQuiz({
      outcomes: [...quiz!.outcomes, newOutcome],
    });
  };

  const deleteOutcome = (outcomeId: string) => {
    updateQuiz({
      outcomes: quiz!.outcomes.filter((o) => o.id !== outcomeId),
    });
  };

  // Settings handlers
  const updateSettings = (updates: Partial<Settings>) => {
    updateQuiz({
      settings: { ...quiz!.settings, ...updates },
    });
  };

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      updateQuiz({ title: titleInput.trim() });
      setTitleEditing(false);
    }
  };

  const handlePublish = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to publish quiz');
      setQuiz((prev) => (prev ? { ...prev, status: 'live' } : prev));
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: COLORS.BG,
          color: COLORS.TEXT,
          fontFamily: FONT_FAMILY,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div>Loading quiz editor...</div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div
        style={{
          backgroundColor: COLORS.BG,
          color: COLORS.TEXT,
          fontFamily: FONT_FAMILY,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div>Error: {error || 'Quiz not found'}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: COLORS.BG,
        color: COLORS.TEXT,
        fontFamily: FONT_FAMILY,
        minHeight: '100vh',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          borderBottom: `1px solid ${COLORS.BORDER}`,
          backgroundColor: COLORS.SURFACE,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: COLORS.TEXT,
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeftIcon size={20} />
          </button>

          {titleEditing ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleInput(quiz.title);
                  setTitleEditing(false);
                }
              }}
              autoFocus
              style={{
                backgroundColor: COLORS.ELEVATED,
                border: `1px solid ${COLORS.ACCENT}`,
                color: COLORS.TEXT,
                fontFamily: FONT_FAMILY,
                fontSize: '18px',
                fontWeight: 600,
                padding: '8px 12px',
                borderRadius: '8px',
                flex: 1,
                maxWidth: '400px',
              }}
            />
          ) : (
            <h1
              onClick={() => {
                setTitleEditing(true);
                setTitleInput(quiz.title);
              }}
              style={{
                fontSize: '18px',
                fontWeight: 600,
                margin: 0,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: `background-color 200ms ${FONT_FAMILY}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.ELEVATED;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              {quiz.title}
            </h1>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: 100,
              backgroundColor:
                quiz.status === 'live'
                  ? 'rgba(82, 168, 80, 0.15)'
                  : 'rgba(139, 145, 154, 0.15)',
              color:
                quiz.status === 'live'
                  ? '#52a850'
                  : COLORS.TEXT_MUTED,
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {quiz.status}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginLeft: '8px',
            }}
          >
            {saveStatus === 'saving' && (
              <span style={{ fontSize: '13px', color: COLORS.TEXT_MUTED }}>
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span
                style={{
                  fontSize: '13px',
                  color: '#52a850',
                  animation: 'fadeOut 2s ease-in-out',
                }}
              >
                Saved
              </span>
            )}
          </div>

          {quiz.status === 'draft' && (
            <button
              onClick={handlePublish}
              style={{
                backgroundColor: COLORS.ACCENT,
                color: '#000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 100,
                fontFamily: FONT_FAMILY,
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Split View */}
      <div style={{ display: 'flex', height: 'calc(100vh - 73px)' }}>
        {/* Left Panel - Edit */}
        <div
          style={{
            width: '60%',
            borderRight: `1px solid ${COLORS.BORDER}`,
            overflow: 'auto',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              borderBottom: `1px solid ${COLORS.BORDER}`,
              display: 'flex',
              backgroundColor: COLORS.SURFACE,
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            {(['questions', 'outcomes', 'settings'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    activeTab === tab
                      ? `2px solid ${COLORS.ACCENT}`
                      : 'none',
                  color: activeTab === tab ? COLORS.TEXT : COLORS.TEXT_MUTED,
                  fontFamily: FONT_FAMILY,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '24px' }}>
            {activeTab === 'questions' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {quiz.questions.map((question, idx) => (
                    <div
                      key={question.id}
                      style={{
                        backgroundColor: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        borderRadius: '12px',
                        padding: '20px',
                        transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          marginBottom: '16px',
                        }}
                      >
                        <DragHandleIcon
                          size={20}
                          color={COLORS.TEXT_MUTED}
                          style={{ marginTop: '6px', cursor: 'grab' }}
                        />
                        <span
                          style={{
                            backgroundColor: COLORS.BORDER,
                            color: COLORS.TEXT_MUTED,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginTop: '6px',
                          }}
                        >
                          Q{idx + 1}
                        </span>
                        <button
                          onClick={() => deleteQuestion(question.id)}
                          style={{
                            marginLeft: 'auto',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#f85f5f',
                            padding: '4px',
                            display: 'flex',
                          }}
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>

                      <textarea
                        value={question.text}
                        onChange={(e) =>
                          updateQuestion(question.id, { text: e.target.value })
                        }
                        placeholder="Question text"
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.SURFACE,
                          border: `1px solid ${COLORS.BORDER}`,
                          color: COLORS.TEXT,
                          fontFamily: FONT_FAMILY,
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          marginBottom: '12px',
                          resize: 'vertical',
                          minHeight: '60px',
                        }}
                      />

                      <input
                        type="text"
                        value={question.subtitle || ''}
                        onChange={(e) =>
                          updateQuestion(question.id, { subtitle: e.target.value })
                        }
                        placeholder="Subtitle (optional)"
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.SURFACE,
                          border: `1px solid ${COLORS.BORDER}`,
                          color: COLORS.TEXT,
                          fontFamily: FONT_FAMILY,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          marginBottom: '16px',
                        }}
                      />

                      <div style={{ marginBottom: '12px' }}>
                        <label
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: COLORS.TEXT_MUTED,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'block',
                            marginBottom: '8px',
                          }}
                        >
                          Options
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {question.options.map((option, optIdx) => (
                            <div
                              key={option.id}
                              style={{
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                              }}
                            >
                              <span
                                style={{
                                  color: COLORS.TEXT_MUTED,
                                  fontSize: '12px',
                                  minWidth: '20px',
                                }}
                              >
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <input
                                type="text"
                                value={option.text}
                                onChange={(e) =>
                                  updateOption(question.id, option.id, {
                                    text: e.target.value,
                                  })
                                }
                                placeholder="Option text"
                                style={{
                                  flex: 1,
                                  backgroundColor: COLORS.SURFACE,
                                  border: `1px solid ${COLORS.BORDER}`,
                                  color: COLORS.TEXT,
                                  fontFamily: FONT_FAMILY,
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                }}
                              />
                              <button
                                onClick={() => deleteOption(question.id, option.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: COLORS.TEXT_MUTED,
                                  padding: '4px',
                                  display: 'flex',
                                  transition: `color 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                                }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLElement).style.color = '#f85f5f';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLElement).style.color =
                                    COLORS.TEXT_MUTED;
                                }}
                              >
                                <TrashIcon size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => addOption(question.id)}
                        style={{
                          backgroundColor: 'transparent',
                          border: `1px dashed ${COLORS.BORDER}`,
                          color: COLORS.TEXT_MUTED,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontFamily: FONT_FAMILY,
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            COLORS.ACCENT;
                          (e.currentTarget as HTMLElement).style.color = COLORS.ACCENT;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            COLORS.BORDER;
                          (e.currentTarget as HTMLElement).style.color =
                            COLORS.TEXT_MUTED;
                        }}
                      >
                        + Add option
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addQuestion}
                  style={{
                    width: '100%',
                    marginTop: '24px',
                    backgroundColor: 'transparent',
                    border: `2px dashed ${COLORS.ACCENT}`,
                    color: COLORS.ACCENT,
                    padding: '16px',
                    borderRadius: '12px',
                    fontFamily: FONT_FAMILY,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'rgba(210, 255, 29, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'transparent';
                  }}
                >
                  + Add question
                </button>
              </div>
            )}

            {activeTab === 'outcomes' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {quiz.outcomes.map((outcome) => (
                    <div
                      key={outcome.id}
                      style={{
                        backgroundColor: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        borderRadius: '12px',
                        padding: '20px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: COLORS.TEXT_MUTED,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Outcome
                        </span>
                        <button
                          onClick={() => deleteOutcome(outcome.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#f85f5f',
                            padding: '4px',
                            display: 'flex',
                          }}
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={outcome.title}
                        onChange={(e) =>
                          updateOutcome(outcome.id, { title: e.target.value })
                        }
                        placeholder="Outcome title"
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.SURFACE,
                          border: `1px solid ${COLORS.BORDER}`,
                          color: COLORS.TEXT,
                          fontFamily: FONT_FAMILY,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          marginBottom: '12px',
                          fontWeight: 600,
                        }}
                      />

                      <textarea
                        value={outcome.description}
                        onChange={(e) =>
                          updateOutcome(outcome.id, { description: e.target.value })
                        }
                        placeholder="Outcome description"
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.SURFACE,
                          border: `1px solid ${COLORS.BORDER}`,
                          color: COLORS.TEXT,
                          fontFamily: FONT_FAMILY,
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          marginBottom: '12px',
                          resize: 'vertical',
                          minHeight: '80px',
                        }}
                      />

                      <input
                        type="text"
                        value={outcome.ctaText || ''}
                        onChange={(e) =>
                          updateOutcome(outcome.id, { ctaText: e.target.value })
                        }
                        placeholder="CTA text (optional)"
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.SURFACE,
                          border: `1px solid ${COLORS.BORDER}`,
                          color: COLORS.TEXT,
                          fontFamily: FONT_FAMILY,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={addOutcome}
                  style={{
                    width: '100%',
                    marginTop: '24px',
                    backgroundColor: 'transparent',
                    border: `2px dashed ${COLORS.ACCENT}`,
                    color: COLORS.ACCENT,
                    padding: '16px',
                    borderRadius: '12px',
                    fontFamily: FONT_FAMILY,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'rgba(210, 255, 29, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'transparent';
                  }}
                >
                  + Add outcome
                </button>
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.TEXT_MUTED,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '12px',
                    }}
                  >
                    Lead Gate
                  </label>
                  <button
                    onClick={() =>
                      updateSettings({
                        leadGate: !quiz.settings?.leadGate,
                      })
                    }
                    style={{
                      width: '50px',
                      height: '28px',
                      backgroundColor: quiz.settings?.leadGate
                        ? COLORS.ACCENT
                        : COLORS.BORDER,
                      border: 'none',
                      borderRadius: 100,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: '22px',
                        height: '22px',
                        backgroundColor: quiz.settings?.leadGate
                          ? '#000'
                          : COLORS.TEXT,
                        borderRadius: '50%',
                        top: '3px',
                        left: quiz.settings?.leadGate ? '25px' : '3px',
                        transition: `left 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                      }}
                    />
                  </button>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: COLORS.TEXT_MUTED,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '8px',
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={quiz.settings?.description || ''}
                    onChange={(e) =>
                      updateSettings({ description: e.target.value })
                    }
                    placeholder="Quiz description"
                    style={{
                      width: '100%',
                      backgroundColor: COLORS.ELEVATED,
                      border: `1px solid ${COLORS.BORDER}`,
                      color: COLORS.TEXT,
                      fontFamily: FONT_FAMILY,
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      minHeight: '100px',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div
          style={{
            width: '40%',
            backgroundColor: COLORS.SURFACE,
            overflow: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: COLORS.TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            Preview
          </div>

          <div
            style={{
              backgroundColor: COLORS.BG,
              border: `1px solid ${COLORS.BORDER}`,
              borderRadius: '12px',
              padding: '32px 24px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '12px',
                color: COLORS.TEXT,
              }}
            >
              {quiz.title}
            </h2>

            {quiz.settings?.description && (
              <p
                style={{
                  fontSize: '14px',
                  color: COLORS.TEXT_MUTED,
                  marginBottom: '24px',
                  lineHeight: '1.5',
                }}
              >
                {quiz.settings.description}
              </p>
            )}

            {quiz.questions.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '20px',
                    justifyContent: 'center',
                  }}
                >
                  {quiz.questions.map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor:
                          idx === 0 ? COLORS.ACCENT : COLORS.BORDER,
                        transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                      }}
                    />
                  ))}
                </div>

                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: COLORS.TEXT,
                  }}
                >
                  {quiz.questions[0].text}
                </h3>

                {quiz.questions[0].subtitle && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: COLORS.TEXT_MUTED,
                      marginBottom: '20px',
                    }}
                  >
                    {quiz.questions[0].subtitle}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {quiz.questions[0].options.map((option, idx) => (
                    <button
                      key={option.id}
                      style={{
                        backgroundColor: COLORS.ELEVATED,
                        border: `1px solid ${COLORS.BORDER}`,
                        color: COLORS.TEXT,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontFamily: FONT_FAMILY,
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          COLORS.BORDER;
                        (e.currentTarget as HTMLElement).style.borderColor =
                          COLORS.ACCENT;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          COLORS.ELEVATED;
                        (e.currentTarget as HTMLElement).style.borderColor =
                          COLORS.BORDER;
                      }}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quiz.questions.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: COLORS.TEXT_MUTED,
                  padding: '40px 20px',
                }}
              >
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                  Add a question to see preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }

        * {
          box-sizing: border-box;
        }

        textarea::-webkit-scrollbar,
        input::-webkit-scrollbar,
        div::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        textarea::-webkit-scrollbar-track,
        input::-webkit-scrollbar-track,
        div::-webkit-scrollbar-track {
          background: ${COLORS.SURFACE};
        }

        textarea::-webkit-scrollbar-thumb,
        input::-webkit-scrollbar-thumb,
        div::-webkit-scrollbar-thumb {
          background: ${COLORS.BORDER};
          border-radius: 4px;
        }

        textarea::-webkit-scrollbar-thumb:hover,
        input::-webkit-scrollbar-thumb:hover,
        div::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.ELEVATED};
        }

        textarea:focus,
        input:focus {
          outline: none;
        }

        button:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            backgroundColor: COLORS.BG,
            color: COLORS.TEXT,
            fontFamily: FONT_FAMILY,
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div>Loading editor...</div>
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
