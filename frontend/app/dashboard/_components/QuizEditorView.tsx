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
import { QuizBlockEditor, QuizSettings, SaveState } from './QuizBlockEditor';
import { QuizBlock, legacyToBlocks, blocksToLegacy } from '@/lib/quiz/blocks';
import { findTemplateData } from '@/lib/quiz/templates';

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
  /** Template catalog id. When set, creates a NEW quiz from this template
   *  and opens it in the editor. */
  templateId?: string;
}

export function QuizEditorView({ quizId, templateId }: QuizEditorViewProps) {
  const { getToken } = useAuth();

  // Wire Clerk token into the shared api client BEFORE any request fires.
  // Provides a cached token for normal requests, and a fresh (skipCache)
  // token for automatic 401 retry inside req().
  useEffect(function() {
    api.setAuthToken(
      function() {
        try { return getToken().then(function(t) { return t || ''; }); } catch(e) { return Promise.resolve(''); }
      },
      function() {
        try { return getToken({ skipCache: true } as any).then(function(t) { return t || ''; }); } catch(e) { return Promise.resolve(''); }
      }
    );
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
  const [userPlan, setUserPlan] = useState<'trial' | 'core' | 'starter' | 'pro' | 'agency' | 'business' | 'free'>('trial');
  const [resolvedId, setResolvedId] = useState<string>('');
  const [state, setState] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState('loading');
      setErrorMsg('');
      try {
        // --- Template mode: load blocks directly from catalog ---
        // We avoid api.createQuiz() here because it may fail if the user's
        // plan is expired.  Instead we populate the editor with template
        // blocks and defer quiz creation to the first auto-save.
        if (templateId) {
          var tpl = findTemplateData(templateId);
          if (!tpl) {
            setErrorMsg('Template "' + templateId + '" not found in catalog.');
            setState('error');
            return;
          }
          var tplBlocks = tpl.blocks();
          var legacy = blocksToLegacy(tplBlocks);
          // Build a local-only quiz object (no id yet — will be created on first save)
          var localQuiz: DbQuiz = {
            id: '',
            title: tpl.name,
            description: tpl.description,
            questions: legacy.questions,
            outcomes: legacy.outcomes,
            settings: {
              editor_blocks: tplBlocks,
              show_progress_bar: true,
              transition_type: 'slide',
            },
          };
          if (cancelled) return;
          setQuiz(localQuiz);
          // resolvedId stays '' — auto-save will create the quiz
          setResolvedId('');
          setState('ready');
          return;
        }

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
  }, [quizId, templateId]);

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
  var [saveState, setSaveState] = useState<SaveState>('idle');
  var saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // One-time backfill: if editor_blocks has richer question data (e.g. mediaUrl /
  // mediaType) that the legacy questions[] is missing, push an immediate save so
  // the embed and other consumers reading questions[] get the correct data.
  // This fixes the race where the block editor saved editor_blocks correctly but
  // a stale questions[] save from an older path left those fields blank.
  var syncBackfillDoneRef = useRef(false);
  useEffect(function() {
    if (!initialBlocksReady || !resolvedId || syncBackfillDoneRef.current) return;
    if (editorBlocks.length === 0) return;
    var legacy = blocksToLegacy(editorBlocks);
    var rawQuestions: any[] = (quiz?.questions as any[]) || [];
    var needsSync = legacy.questions.some(function(lq: any, i: number) {
      var raw = rawQuestions[i];
      if (!raw) return false;
      return (lq.mediaUrl && !raw.mediaUrl) ||
             (lq.mediaType && !raw.mediaType) ||
             (lq.answerLayout && !raw.answerLayout) ||
             (lq.subtitle && !raw.subtitle);
    });
    if (!needsSync) return;
    syncBackfillDoneRef.current = true;
    var mergedSettings = Object.assign({}, quiz?.settings || {}, { editor_blocks: editorBlocks });
    api.updateQuiz(resolvedId, {
      questions: legacy.questions,
      outcomes: legacy.outcomes,
      settings: mergedSettings,
    }).then(function() {
      console.log('[block-editor] Backfilled legacy questions from editor_blocks (mediaUrl/mediaType/answerLayout)');
    }).catch(function(err: any) {
      console.error('[block-editor] Backfill sync failed:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBlocksReady, resolvedId]);

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

  // Auto-save block changes with debounce.
  // When resolvedId is empty (template loaded locally), create the quiz
  // first via api.createQuiz, then use api.updateQuiz for subsequent saves.
  var handleBlocksChange = useCallback(function(blocks: QuizBlock[]) {
    setEditorBlocks(blocks);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(function() {
      var legacy = blocksToLegacy(blocks);
      var mergedSettings = Object.assign({}, quiz?.settings || {}, quizSettings, {
        editor_blocks: blocks,
      });

      if (!resolvedId) {
        // First save — create the quiz in the database
        api.createQuiz({
          title: quiz?.title || 'Untitled Quiz',
          description: quiz?.description || '',
          questions: legacy.questions,
          outcomes: legacy.outcomes,
          settings: mergedSettings,
        }).then(function(created: any) {
          setResolvedId(created.id);
          setQuiz(function(prev) {
            if (!prev) return prev;
            return Object.assign({}, prev, { id: created.id });
          });
          setSaveState('saved');
          saveStateTimerRef.current = setTimeout(function() { setSaveState('idle'); }, 2000);
        }).catch(function(err: any) {
          console.error('[block-editor] Create quiz failed:', err);
          setSaveState('error');
        });
        return;
      }

      api.updateQuiz(resolvedId, {
        questions: legacy.questions,
        outcomes: legacy.outcomes,
        settings: mergedSettings,
      }).then(function() {
        setSaveState('saved');
        saveStateTimerRef.current = setTimeout(function() { setSaveState('idle'); }, 2000);
      }).catch(function(err: any) {
        console.error('[block-editor] Auto-save failed:', err);
        setSaveState('error');
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
        userPlan={userPlan}
        saveState={saveState}
        backUrl={templateId ? '/dashboard/templates' : undefined}
        quizId={(quiz as any)?.id || quizId || undefined}
        quizSlug={(quiz as any)?.slug || undefined}
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
