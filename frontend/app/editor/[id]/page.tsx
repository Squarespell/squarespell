'use client';

import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, Suspense, useRef } from 'react';

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

const C = {
  BG: '#07090c',
  SURFACE: '#0d1117',
  ELEVATED: '#161b22',
  BORDER: '#1b1f27',
  TEXT: '#f0f2f5',
  TEXT_MUTED: '#8b919a',
  ACCENT: '#D2FF1D',
  ACCENT_DIM: 'rgba(210,255,29,0.08)',
};

const FONT = '"DM Sans", system-ui, sans-serif';
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface Option { id: string; text: string; score?: number; }
interface Question { id: string; text: string; subtitle?: string; options: Option[]; }
interface Outcome { id: string; title: string; description: string; ctaText?: string; minScore?: number; maxScore?: number; }
interface Branding { colors?: Record<string, string>; font_family?: string; site_name?: string; favicon_url?: string; }
interface Settings { leadGate?: boolean; description?: string; }

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

type EditorTab = 'questions' | 'design' | 'outcomes' | 'settings';
type DeviceType = 'desktop' | 'tablet' | 'mobile';

const FONTS = ['Inter', 'DM Sans', 'Playfair Display', 'Space Grotesk', 'Poppins', 'Georgia'];

function EditorContent() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const quizId = params?.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('questions');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live preview state
  const [previewQuestion, setPreviewQuestion] = useState(0);
  const [selectedOpts, setSelectedOpts] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<DeviceType>('desktop');

  // Design controls
  const [sitePrimary, setSitePrimary] = useState('#1a1a1a');
  const [siteBg, setSiteBg] = useState('#ffffff');
  const [siteText, setSiteText] = useState('#1a1a1a');
  const [siteFont, setSiteFont] = useState('Inter');
  const [borderRadius, setBorderRadius] = useState(10);

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
        // Init colors from branding
        if (data.branding?.colors?.primary) setSitePrimary(data.branding.colors.primary);
        if (data.branding?.colors?.background) setSiteBg(data.branding.colors.background);
        if (data.branding?.colors?.text) setSiteText(data.branding.colors.text);
        if (data.branding?.font_family) setSiteFont(data.branding.font_family);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, getToken]);

  // Auto-save
  const debouncedSave = useCallback(async (quizData: Quiz) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
    updateQuiz({ questions: quiz!.questions.map((q) => q.id === qId ? { ...q, ...updates } : q) });
  };
  const addQuestion = () => {
    const id = Math.random().toString(36).substr(2, 9);
    updateQuiz({
      questions: [...quiz!.questions, {
        id, text: 'New question', subtitle: '',
        options: [
          { id: Math.random().toString(36).substr(2, 9), text: 'Option 1' },
          { id: Math.random().toString(36).substr(2, 9), text: 'Option 2' },
          { id: Math.random().toString(36).substr(2, 9), text: 'Option 3' },
          { id: Math.random().toString(36).substr(2, 9), text: 'Option 4' },
        ],
      }],
    });
  };
  const deleteQuestion = (qId: string) => {
    updateQuiz({ questions: quiz!.questions.filter((q) => q.id !== qId) });
  };
  const updateOption = (qId: string, oId: string, updates: Partial<Option>) => {
    updateQuestion(qId, {
      options: quiz!.questions.find((q) => q.id === qId)!.options.map((o) => o.id === oId ? { ...o, ...updates } : o),
    });
  };
  const addOption = (qId: string) => {
    const q = quiz!.questions.find((q) => q.id === qId);
    if (!q) return;
    updateQuestion(qId, { options: [...q.options, { id: Math.random().toString(36).substr(2, 9), text: 'New option' }] });
  };
  const deleteOption = (qId: string, oId: string) => {
    updateQuestion(qId, { options: quiz!.questions.find((q) => q.id === qId)!.options.filter((o) => o.id !== oId) });
  };
  const updateOutcome = (oId: string, updates: Partial<Outcome>) => {
    updateQuiz({ outcomes: quiz!.outcomes.map((o) => o.id === oId ? { ...o, ...updates } : o) });
  };
  const addOutcome = () => {
    updateQuiz({ outcomes: [...quiz!.outcomes, { id: Math.random().toString(36).substr(2, 9), title: 'New outcome', description: '', ctaText: '' }] });
  };
  const deleteOutcome = (oId: string) => {
    updateQuiz({ outcomes: quiz!.outcomes.filter((o) => o.id !== oId) });
  };
  const updateSettings = (updates: Partial<Settings>) => {
    updateQuiz({ settings: { ...quiz!.settings, ...updates } });
  };
  const handleTitleSave = () => {
    if (titleInput.trim()) { updateQuiz({ title: titleInput.trim() }); setTitleEditing(false); }
  };
  const handlePublish = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to publish quiz');
      setQuiz((prev) => (prev ? { ...prev, status: 'live' } : prev));
    } catch (err) { console.error('Publish error:', err); }
  };

  // Derive the domain from website_url
  const domain = quiz?.website_url ? (() => { try { return new URL(quiz.website_url).hostname; } catch { return quiz.website_url; } })() : 'yoursite.com';
  const siteName = quiz?.branding?.site_name || domain.replace(/^www\./, '').split('.')[0];

  if (loading) {
    return (
      <div style={{ backgroundColor: C.BG, color: C.TEXT, fontFamily: FONT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading quiz editor...</div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div style={{ backgroundColor: C.BG, color: C.TEXT, fontFamily: FONT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Error: {error || 'Quiz not found'}</div>
      </div>
    );
  }

  const currentQ = quiz.questions[previewQuestion];
  const progressPct = quiz.questions.length > 0 ? ((previewQuestion + 1) / quiz.questions.length) * 100 : 0;

  const tabList: EditorTab[] = ['questions', 'design', 'outcomes', 'settings'];

  return (
    <div style={{ backgroundColor: C.BG, color: C.TEXT, fontFamily: FONT, minHeight: '100vh', overflow: 'hidden' }}>

      {/* ═══ TOP BAR ═══ */}
      <div style={{ height: 56, background: C.SURFACE, borderBottom: `1px solid ${C.BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.BORDER}`, background: 'transparent', color: C.TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `all 0.2s ${EASE}` }}>
            <ArrowLeftIcon size={16} />
          </button>
          {titleEditing ? (
            <input type="text" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} onBlur={handleTitleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setTitleInput(quiz.title); setTitleEditing(false); } }} autoFocus
              style={{ background: 'transparent', border: `1px solid rgba(210,255,29,0.4)`, backgroundColor: C.ELEVATED, color: C.TEXT, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', padding: '6px 10px', borderRadius: 8, outline: 'none', minWidth: 300 }} />
          ) : (
            <input type="text" readOnly value={quiz.title} onClick={() => { setTitleEditing(true); setTitleInput(quiz.title); }}
              style={{ background: 'transparent', border: '1px solid transparent', color: C.TEXT, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', padding: '6px 10px', borderRadius: 8, outline: 'none', minWidth: 300, cursor: 'pointer', transition: 'all 0.15s' }} />
          )}
          <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: quiz.status === 'live' ? 'rgba(76,175,80,0.15)' : 'rgba(139,145,154,0.15)', color: quiz.status === 'live' ? '#4cb150' : C.TEXT_MUTED }}>
            {quiz.status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: saveStatus === 'saving' ? C.ACCENT : C.TEXT_MUTED, paddingRight: 8 }}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'All changes saved' : ''}
          </span>
          {quiz.status === 'draft' && (
            <button onClick={handlePublish} style={{ height: 36, padding: '0 22px', borderRadius: 100, border: 'none', background: C.ACCENT, color: C.BG, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: `all 0.15s ${EASE}` }}>
              Publish
            </button>
          )}
        </div>
      </div>

      {/* ═══ MAIN SPLIT ═══ */}
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

        {/* ═══ LEFT: EDITOR PANEL ═══ */}
        <div style={{ width: '50%', borderRight: `1px solid ${C.BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, padding: '0 20px', borderBottom: `1px solid ${C.BORDER}`, background: C.SURFACE }}>
            {tabList.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: activeTab === tab ? C.ACCENT : C.TEXT_MUTED, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', transition: 'color 0.15s', borderBottom: activeTab === tab ? `2px solid ${C.ACCENT}` : '2px solid transparent', textTransform: 'capitalize' }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Editor Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 80px' }}>

            {/* ─── QUESTIONS TAB ─── */}
            {activeTab === 'questions' && (
              <div>
                {quiz.questions.map((question, idx) => (
                  <div key={question.id} onClick={() => setPreviewQuestion(idx)}
                    style={{ background: C.ELEVATED, border: `1px solid ${previewQuestion === idx ? 'rgba(210,255,29,0.3)' : C.BORDER}`, borderRadius: 14, padding: 20, marginBottom: 12, cursor: 'pointer', transition: `all 0.3s ${EASE}`, boxShadow: previewQuestion === idx ? '0 0 0 4px rgba(210,255,29,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{ minWidth: 30, height: 30, background: C.ACCENT, color: C.BG, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</div>
                      <textarea value={question.text} rows={1} onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                        style={{ width: '100%', background: 'transparent', border: 'none', color: C.TEXT, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.5 }} />
                      <button onClick={(e) => { e.stopPropagation(); deleteQuestion(question.id); }}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#f85f5f', padding: 4, display: 'flex', flexShrink: 0 }}>
                        <TrashIcon size={16} />
                      </button>
                    </div>
                    {question.options.map((opt, oi) => (
                      <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, marginLeft: 42 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: C.SURFACE, border: `1px solid ${C.BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, flexShrink: 0 }}>
                          {String.fromCharCode(65 + oi)}
                        </div>
                        <input type="text" value={opt.text} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateOption(question.id, opt.id, { text: e.target.value })}
                          style={{ flex: 1, background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.TEXT, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }} />
                        <button onClick={(e) => { e.stopPropagation(); deleteOption(question.id, opt.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.TEXT_MUTED, padding: 4, display: 'flex' }}>
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    ))}
                    <button onClick={(e) => { e.stopPropagation(); addOption(question.id); }}
                      style={{ marginLeft: 42, marginTop: 4, background: 'transparent', border: `1px dashed ${C.BORDER}`, color: C.TEXT_MUTED, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', transition: `all 0.15s` }}>
                      + Add option
                    </button>
                  </div>
                ))}
                <button onClick={addQuestion}
                  style={{ width: '100%', padding: 16, borderRadius: 12, border: `1.5px dashed rgba(210,255,29,0.25)`, background: 'rgba(210,255,29,0.02)', color: C.ACCENT, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: `all 0.2s ${EASE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add question
                </button>
              </div>
            )}

            {/* ─── DESIGN TAB ─── */}
            {activeTab === 'design' && (
              <div>
                <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    Brand Colors (synced from your site)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Primary', value: sitePrimary, set: setSitePrimary },
                      { label: 'Background', value: siteBg, set: setSiteBg },
                      { label: 'Text', value: siteText, set: setSiteText },
                    ].map(({ label, value, set }) => (
                      <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: C.TEXT_MUTED, minWidth: 70 }}>{label}</span>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: value, position: 'relative', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s' }}>
                          <input type="color" value={value} onChange={(e) => set(e.target.value)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                        </div>
                        <span style={{ fontSize: 12, color: C.TEXT_MUTED }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Font</div>
                  <select value={siteFont} onChange={(e) => setSiteFont(e.target.value)}
                    style={{ width: '100%', background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 8, padding: '10px 12px', color: C.TEXT, fontFamily: 'inherit', fontSize: 13, outline: 'none' }}>
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div style={{ background: C.SURFACE, border: `1px solid ${C.BORDER}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Corner Radius</div>
                  <input type="range" min="0" max="20" value={borderRadius} onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: C.ACCENT }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.TEXT_MUTED, marginTop: 4 }}>
                    <span>Sharp</span><span>Rounded</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── OUTCOMES TAB ─── */}
            {activeTab === 'outcomes' && (
              <div>
                {quiz.outcomes.map((outcome) => (
                  <div key={outcome.id} style={{ background: C.ELEVATED, border: `1px solid ${C.BORDER}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outcome</span>
                      <button onClick={() => deleteOutcome(outcome.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f85f5f', padding: 4, display: 'flex' }}>
                        <TrashIcon size={16} />
                      </button>
                    </div>
                    <input type="text" value={outcome.title} onChange={(e) => updateOutcome(outcome.id, { title: e.target.value })} placeholder="Outcome title"
                      style={{ width: '100%', background: C.SURFACE, border: `1px solid ${C.BORDER}`, color: C.TEXT, fontFamily: 'inherit', padding: '10px 12px', borderRadius: 8, fontSize: 14, marginBottom: 12, fontWeight: 600, outline: 'none' }} />
                    <textarea value={outcome.description} onChange={(e) => updateOutcome(outcome.id, { description: e.target.value })} placeholder="Outcome description"
                      style={{ width: '100%', background: C.SURFACE, border: `1px solid ${C.BORDER}`, color: C.TEXT, fontFamily: 'inherit', padding: 12, borderRadius: 8, fontSize: 13, lineHeight: 1.5, marginBottom: 12, resize: 'vertical', minHeight: 80, outline: 'none' }} />
                    <input type="text" value={outcome.ctaText || ''} onChange={(e) => updateOutcome(outcome.id, { ctaText: e.target.value })} placeholder="CTA text (optional)"
                      style={{ width: '100%', background: C.SURFACE, border: `1px solid ${C.BORDER}`, color: C.TEXT, fontFamily: 'inherit', padding: '10px 12px', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  </div>
                ))}
                <button onClick={addOutcome}
                  style={{ width: '100%', padding: 16, borderRadius: 12, border: `1.5px dashed rgba(210,255,29,0.25)`, background: 'rgba(210,255,29,0.02)', color: C.ACCENT, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: `all 0.2s ${EASE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add outcome
                </button>
              </div>
            )}

            {/* ─── SETTINGS TAB ─── */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Lead Gate</label>
                  <button onClick={() => updateSettings({ leadGate: !quiz.settings?.leadGate })}
                    style={{ width: 50, height: 28, backgroundColor: quiz.settings?.leadGate ? C.ACCENT : C.BORDER, border: 'none', borderRadius: 100, cursor: 'pointer', position: 'relative', transition: `all 200ms ${EASE}` }}>
                    <div style={{ position: 'absolute', width: 22, height: 22, backgroundColor: quiz.settings?.leadGate ? '#000' : C.TEXT, borderRadius: '50%', top: 3, left: quiz.settings?.leadGate ? 25 : 3, transition: `left 200ms ${EASE}` }} />
                  </button>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description</label>
                  <textarea value={quiz.settings?.description || ''} onChange={(e) => updateSettings({ description: e.target.value })} placeholder="Quiz description"
                    style={{ width: '100%', background: C.ELEVATED, border: `1px solid ${C.BORDER}`, color: C.TEXT, fontFamily: 'inherit', padding: 12, borderRadius: 8, fontSize: 13, lineHeight: 1.5, resize: 'vertical', minHeight: 100, outline: 'none' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: LIVE SITE PREVIEW ═══ */}
        <div style={{ width: '50%', background: '#111318', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Preview Toolbar */}
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.BORDER}`, background: C.SURFACE }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4cb150', animation: 'livePulse 2s ease infinite' }} />
              Live Preview
            </div>
            <div style={{ display: 'flex', gap: 2, background: C.ELEVATED, borderRadius: 8, padding: 3 }}>
              {([
                { d: 'desktop', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                { d: 'tablet', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
                { d: 'mobile', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
              ] as { d: DeviceType; icon: React.ReactNode }[]).map(({ d, icon }) => (
                <button key={d} onClick={() => setDevice(d)}
                  style={{ width: 34, height: 30, borderRadius: 6, border: 'none', background: device === d ? C.ACCENT : 'transparent', color: device === d ? C.BG : C.TEXT_MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `all 0.15s ${EASE}` }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Container */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, overflow: 'hidden', transition: `all 0.5s ${EASE}` }}>
            <div style={{
              width: '100%',
              maxWidth: device === 'mobile' ? 375 : device === 'tablet' ? 580 : 900,
              height: '100%',
              background: '#ffffff',
              borderRadius: device === 'mobile' ? 32 : device === 'tablet' ? 16 : 12,
              overflow: 'hidden',
              boxShadow: device === 'mobile'
                ? '0 0 0 8px #1a1a1a, 0 0 0 10px #333, 0 24px 80px rgba(0,0,0,0.5)'
                : '0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column', transition: `all 0.5s ${EASE}`,
            }}>

              {/* Browser Chrome */}
              {device === 'mobile' ? (
                <div style={{ height: 28, background: '#f8f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 80, height: 4, background: '#ddd', borderRadius: 2 }} />
                </div>
              ) : (
                <div style={{ height: 40, background: '#f0f0f3', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                  <div style={{ flex: 1, height: 26, background: '#e4e4e8', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, color: '#666', margin: '0 40px 0 8px', overflow: 'hidden' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ marginRight: 6, flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    {domain}
                  </div>
                </div>
              )}

              {/* Mock Website Content */}
              <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                <div style={{ fontFamily: `'${siteFont}', system-ui, sans-serif`, color: siteText, background: siteBg, minHeight: '100%' }}>

                  {/* Mock Nav */}
                  <div style={{ height: device === 'mobile' ? 44 : 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: device === 'mobile' ? '0 16px' : '0 32px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: sitePrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: sitePrimary }} />
                      <span>{siteName.charAt(0).toUpperCase() + siteName.slice(1)}</span>
                    </div>
                    {device !== 'mobile' && (
                      <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>
                        <span>Products</span><span>Pricing</span><span>About</span><span>Contact</span>
                      </div>
                    )}
                  </div>

                  {/* Mock Hero */}
                  <div style={{ padding: device === 'mobile' ? '24px 16px 16px' : '48px 32px 32px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: device === 'mobile' ? 20 : device === 'tablet' ? 24 : 28, fontWeight: 800, color: siteText, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2 }}>
                      Find your perfect solution
                    </h1>
                    <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                      Take our quick quiz to get a personalized recommendation
                    </p>
                  </div>

                  {/* THE QUIZ WIDGET */}
                  <div style={{
                    margin: device === 'mobile' ? '16px' : device === 'tablet' ? '20px 24px 32px' : '24px 32px 40px',
                    borderRadius: borderRadius,
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: siteBg,
                    boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
                    transition: `all 0.3s ${EASE}`,
                  }}>
                    {/* Widget Header */}
                    <div style={{ padding: device === 'mobile' ? '14px 16px 12px' : '20px 24px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: siteText, letterSpacing: '-0.02em', marginBottom: 4 }}>
                        {quiz.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>
                        {quiz.settings?.description || 'Get a personalized recommendation'}
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: sitePrimary, width: `${progressPct}%`, borderRadius: 2, transition: `width 0.4s ${EASE}` }} />
                    </div>
                    {/* Widget Body */}
                    <div style={{ padding: device === 'mobile' ? 16 : 24 }}>
                      {currentQ ? (
                        <>
                          <div style={{ fontSize: 15, fontWeight: 700, color: siteText, marginBottom: 4, transition: `all 0.25s ${EASE}` }}>
                            {currentQ.text}
                          </div>
                          {currentQ.subtitle ? (
                            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginBottom: 16 }}>{currentQ.subtitle}</div>
                          ) : <div style={{ height: 12 }} />}
                          {currentQ.options.map((opt) => {
                            const isSelected = selectedOpts[currentQ.id] === opt.id;
                            return (
                              <div key={opt.id} onClick={() => setSelectedOpts(prev => ({ ...prev, [currentQ.id]: opt.id }))}
                                style={{
                                  padding: '12px 16px', border: `1.5px solid ${isSelected ? sitePrimary : 'rgba(0,0,0,0.08)'}`,
                                  borderRadius: borderRadius, marginBottom: 8, fontSize: 13, color: siteText,
                                  cursor: 'pointer', transition: `all 0.2s ${EASE}`, display: 'flex', alignItems: 'center', gap: 10,
                                  background: isSelected ? `color-mix(in srgb, ${sitePrimary} 6%, white)` : siteBg,
                                }}>
                                <div style={{
                                  width: 18, height: 18, borderRadius: '50%',
                                  border: `2px solid ${isSelected ? sitePrimary : 'rgba(0,0,0,0.15)'}`,
                                  background: isSelected ? sitePrimary : 'transparent',
                                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                }}>
                                  {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span>{opt.text}</span>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.3)', padding: '20px 0', fontSize: 14 }}>
                          Add a question to see preview
                        </div>
                      )}
                    </div>
                    {/* Widget Footer */}
                    {quiz.questions.length > 0 && (
                      <div style={{ padding: device === 'mobile' ? '0 16px 16px' : '0 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {quiz.questions.map((_, i) => (
                            <div key={i} onClick={() => setPreviewQuestion(i)}
                              style={{
                                width: i === previewQuestion ? 18 : 6, height: 6, borderRadius: i === previewQuestion ? 3 : '50%',
                                background: i === previewQuestion ? sitePrimary : 'rgba(0,0,0,0.1)',
                                transition: 'all 0.2s', cursor: 'pointer',
                              }} />
                          ))}
                        </div>
                        <button onClick={() => { if (previewQuestion < quiz.questions.length - 1) setPreviewQuestion(previewQuestion + 1); }}
                          style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: sitePrimary, color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s' }}>
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mock Footer */}
                  <div style={{ padding: device === 'mobile' ? 16 : 32, borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <div style={{ height: 10, background: 'rgba(0,0,0,0.04)', borderRadius: 4 }} />
                      <div style={{ height: 10, background: 'rgba(0,0,0,0.04)', borderRadius: 4 }} />
                      <div style={{ height: 10, background: 'rgba(0,0,0,0.04)', borderRadius: 4 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeOut { 0% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea::-webkit-scrollbar, input::-webkit-scrollbar, div::-webkit-scrollbar { width: 6px; }
        textarea::-webkit-scrollbar-track, input::-webkit-scrollbar-track, div::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb, input::-webkit-scrollbar-thumb, div::-webkit-scrollbar-thumb { background: ${C.BORDER}; border-radius: 3px; }
        textarea:focus, input:focus, button:focus, select:focus { outline: none; }
      `}</style>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: C.BG, color: C.TEXT, fontFamily: FONT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div>Loading editor...</div></div>}>
      <EditorContent />
    </Suspense>
  );
}
