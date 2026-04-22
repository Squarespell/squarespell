'use client';

/**
 * QuizEditorView - the authed quiz editor rendered *inside* DashboardShell.
 *
 * Both /dashboard/[quizId] (a specific quiz) and /dashboard/editor (latest
 * quiz or empty state) render through this component so the editor always
 * sits next to the dashboard sidebar.
 *
 * Renders QuizBlockEditor as the single editor experience. Legacy quizzes
 * are converted to blocks via legacyToBlocks() on load, and saved back via
 * blocksToLegacy() for API compatibility.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from "@clerk/nextjs";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DashboardShell, DASHBOARD_COLORS as C } from './DashboardShell';
import { PublishModal } from "./Modals";
import { QuizBlockEditor, QuizSettings } from './QuizBlockEditor';
import { QuizBlock, legacyToBlocks, blocksToLegacy } from '@/lib/quiz/blocks';

interface DbQuiz {
  id: string;
  title?: string;
  description?: string;
  questions?: any[];
  outcomes?: any[];
  settings?: any;
  leadGate?: any;
  branding?: {
    colors?: Record<string, string>;
    font_family?: string;
    site_name?: string;
    favicon_url?: string;
    site_url?: string;
    auto_detected?: boolean;
  };
  source_url?: string;
}


function EditorLoading({ label }: { label: string }) {
  return (
    <DashboardShell title="Quiz editor">
      <div style={{ color: C.TEXT_MUTED, fontSize: 14, padding: '48px 0' }}>{label}</div>
    </DashboardShell>
  );
}

function EditorError({ message }: { message: string }) {
  const router = useRouter();
  return (
    <DashboardShell title="Quiz editor">
      <div
        style={{
          background: C.SURFACE,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 16,
          padding: '32px 28px',
          maxWidth: 560,
        }}
      >
        <h2 style={{ color: C.TEXT, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>We couldn&apos;t load this quiz</h2>
        <p style={{ color: C.TEXT_MUTED, fontSize: 14, marginBottom: 20 }}>{message}</p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '10px 18px',
            background: C.ACCENT,
            color: '#FFFFFF',
            border: 0,
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Back to dashboard
        </button>
      </div>
    </DashboardShell>
  );
}

function EditorEmpty() {
  return (
    <DashboardShell title="Quiz editor">
      <div
        style={{
          background: C.SURFACE,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 20,
          padding: '48px 40px',
          maxWidth: 680,
          textAlign: 'center',
          margin: '24px auto',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: C.ACCENT_LIGHT,
            border: `1px solid ${C.ACCENT}`,
            borderRadius: 14,
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.ACCENT,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </div>
        <h2 style={{ color: C.TEXT, fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
          No quiz to edit yet
        </h2>
        <p style={{ color: C.TEXT_MUTED, fontSize: 14.5, marginBottom: 24, lineHeight: 1.55 }}>
          Start by generating a quiz from any site URL. The editor opens automatically once your first quiz is built.
        </p>
        <Link
          href="/tools/quiz-funnel/build"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 22px',
            background: C.ACCENT,
            color: '#FFFFFF',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Create your first quiz
        </Link>
      </div>
    </DashboardShell>
  );
}

export interface QuizEditorViewProps {
  /** Specific quiz id to load. If omitted, the most recently updated quiz
   *  belonging to the user is loaded. */
  quizId?: string;
}

export function QuizEditorView({ quizId }: QuizEditorViewProps) {
  const { getToken } = useAuth();

  // Wire Clerk token into the shared api client BEFORE any request fires.
  // Fixes editor Unauthorized: window.Clerk fallback races with hydration.
  useEffect(() => {
    api.setAuthToken(async () => {
      try { return (await getToken({ skipCache: true })) || ''; } catch { return ''; }
    });
  }, [getToken]);

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function handlePublish(): Promise<boolean> {
    try {
      setPublishing(true);
      setPublishError(null);
      const API = process.env.NEXT_PUBLIC_API_URL || "https://squarespell-api.onrender.com";
      const qid = (quiz as any)?.id || quizId || "";
      if (!qid) throw new Error("Quiz id not ready yet. Give the editor a second to load.");
      // One-shot retry: if the first token is stale and the server returns 401,
      // force a fresh token via skipCache and try once more before giving up.
      const doFetch = async (fresh: boolean) => {
        const token = await getToken(fresh ? { skipCache: true } as any : undefined);
        if (!token) throw new Error("Not signed in");
        return fetch(`${API}/api/quizzes/${qid}/publish`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      };
      let res = await doFetch(false);
      if (res.status === 401) res = await doFetch(true);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Publish failed (${res.status}): ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      setPublishedSlug(data?.slug || (quiz as any)?.slug || "");
      setQuiz((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: (data?.status as any) || 'live',
          slug: data?.slug || (prev as any).slug,
          published_at: data?.published_at || (prev as any).published_at,
        } as any;
      });
      setPublishModalOpen(true);
      return true;
    } catch (e: any) {
      setPublishError(e?.message || "Publish failed");
      // eslint-disable-next-line no-console
      console.error("[publish]", e);
      return false;
    } finally {
      setPublishing(false);
    }
  }

  const [quiz, setQuiz] = useState<DbQuiz | null>(null);
  const [userPlan, setUserPlan] = useState<'trial' | 'starter' | 'pro' | 'agency' | 'free'>('trial');
  const [resolvedId, setResolvedId] = useState<string>('');
  const [state, setState] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState('loading');
      setErrorMsg('');
      try {
        if (quizId) {
          const q: DbQuiz = await api.getQuiz(quizId);
          if (cancelled) return;
          setQuiz(q);
          setResolvedId(q.id);
          setState('ready');
          return;
        }
        // No quizId: pick the most recently updated quiz.
        const list: any = await api.getQuizzes();
        if (cancelled) return;
        const quizzes: any[] = Array.isArray(list) ? list : list?.quizzes || [];
        if (!quizzes.length) {
          setState('empty');
          return;
        }
        const sorted = [...quizzes].sort((a, b) => {
          const au = new Date(a.updated_at || a.created_at || 0).getTime();
          const bu = new Date(b.updated_at || b.created_at || 0).getTime();
          return bu - au;
        });
        const latest = sorted[0];
        const full: DbQuiz = await api.getQuiz(latest.id);
        if (cancelled) return;
        setQuiz(full);
        setResolvedId(full.id);
        setState('ready');
      } catch (err: any) {
        if (cancelled) return;
        setErrorMsg(err?.message || 'Failed to load quiz');
        setState('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [quizId]);

  // Fetch user plan for feature gating (branding toggle, etc.)
  useEffect(() => {
    let cancelled = false;
    async function fetchPlan() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
        const token = await getToken();
        if (!token || cancelled) return;
        const res = await fetch(`${API}/api/user/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.plan) setUserPlan(data.plan);
      } catch {}
    }
    fetchPlan();
    return () => { cancelled = true; };
  }, [getToken]);

  // Block editor state
  var [initialBlocksReady, setInitialBlocksReady] = useState(false);
  var [editorBlocks, setEditorBlocks] = useState<QuizBlock[]>([]);
  var saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize blocks from quiz data — prefer saved editor_blocks for round-trip fidelity
  useEffect(function() {
    if (quiz && !initialBlocksReady) {
      var savedBlocks = quiz.settings?.editor_blocks;
      if (Array.isArray(savedBlocks) && savedBlocks.length > 0) {
        setEditorBlocks(savedBlocks as QuizBlock[]);
      } else {
        var converted = legacyToBlocks({
          questions: quiz.questions,
          outcomes: quiz.outcomes,
          leadGate: quiz.leadGate,
        });
        setEditorBlocks(converted);
      }
      setInitialBlocksReady(true);
    }
  }, [quiz, initialBlocksReady]);

  // Quiz settings state
  var [quizSettings, setQuizSettings] = useState<QuizSettings>({});
  var settingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize settings from quiz data
  useEffect(function() {
    if (quiz && quiz.settings) {
      setQuizSettings({
        shuffle_questions: quiz.settings.shuffle_questions || false,
        show_progress_bar: quiz.settings.show_progress_bar !== false,
        transition_type: quiz.settings.transition_type || 'slide',
      });
    }
  }, [quiz]);

  // Handle settings change with auto-save
  var handleSettingsChange = useCallback(function(newSettings: QuizSettings) {
    setQuizSettings(newSettings);
    if (settingsSaveTimerRef.current) clearTimeout(settingsSaveTimerRef.current);
    settingsSaveTimerRef.current = setTimeout(function() {
      if (!resolvedId) return;
      // Preserve editor_blocks when saving settings so we don't wipe them
      var mergedSettings = Object.assign({}, quiz?.settings || {}, newSettings, {
        editor_blocks: editorBlocks.length > 0 ? editorBlocks : (quiz?.settings as any)?.editor_blocks,
      });
      api.updateQuiz(resolvedId, {
        settings: mergedSettings,
      }).catch(function(err: any) {
        console.error('[block-editor] Settings auto-save failed:', err);
      });
    }, 800);
  }, [resolvedId, quiz, editorBlocks]);

  // Auto-save block changes with debounce
  var handleBlocksChange = useCallback(function(blocks: QuizBlock[]) {
    setEditorBlocks(blocks);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(function() {
      if (!resolvedId) return;
      var legacy = blocksToLegacy(blocks);
      // Save legacy format (questions, outcomes) for backward compat with
      // quiz-taking, analytics, and publishing.  Also save the raw blocks
      // array inside settings.editor_blocks so ALL block types and properties
      // survive the round-trip (headings, text, images, dividers, logic,
      // lead gate, questionStyle, etc.).
      var mergedSettings = Object.assign({}, quiz?.settings || {}, quizSettings, {
        editor_blocks: blocks,
      });
      api.updateQuiz(resolvedId, {
        questions: legacy.questions,
        outcomes: legacy.outcomes,
        settings: mergedSettings,
      }).catch(function(err: any) {
        console.error('[block-editor] Auto-save failed:', err);
      });
    }, 800);
  }, [resolvedId, quiz, quizSettings]);

  if (state === 'loading') return <EditorLoading label="Loading editor..." />;
  if (state === 'error') return <EditorError message={errorMsg} />;
  if (state === 'empty') return <EditorEmpty />;
  if (!quiz) return <EditorLoading label="Loading editor..." />;

  return (
    <DashboardShell
      title={'Editing: ' + (quiz.title || 'Quiz')}
      topbarRight={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            style={{
              padding: '8px 20px', borderRadius: 8,
              background: C.ACCENT, color: '#FFFFFF', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: publishing ? 'wait' : 'pointer',
              fontFamily: C.FONT,
              opacity: publishing ? 0.7 : 1,
            }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      }
      contentPadding="0"
    >
      <QuizBlockEditor
        blocks={editorBlocks}
        onChange={handleBlocksChange}
        settings={quizSettings}
        onSettingsChange={handleSettingsChange}
      />
      {publishError && (
        <div style={{position:"fixed",top:16,right:16,zIndex:60,background:"#fee",color:"#900",padding:"10px 14px",borderRadius:8,fontSize:13,boxShadow:"0 6px 18px rgba(0,0,0,0.18)"}}>{publishError}</div>
      )}
      <PublishModal
        open={publishModalOpen}
        quizTitle={(quiz as any)?.title || "Quiz"}
        slug={publishedSlug}
        onClose={function() { setPublishModalOpen(false); }}
      />
    </DashboardShell>
  );
}
