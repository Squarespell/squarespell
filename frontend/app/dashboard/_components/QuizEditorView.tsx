'use client';

/**
 * QuizEditorView - the authed quiz editor rendered *inside* DashboardShell.
 *
 * Both /dashboard/[quizId] (a specific quiz) and /dashboard/editor (latest
 * quiz or empty state) render through this component so the editor always
 * sits next to the dashboard sidebar.
 *
 * It fetches the quiz by id, mounts TryFlowInner in authed mode at Stage 3,
 * and injects a small CSS override so the Stage 3 body doesn't force 100vh
 * (which would cause double-scroll inside the shell main column).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TryFlowInner } from '@/app/tools/quiz-funnel/build/TryFlowInner';
import { DashboardShell, DASHBOARD_COLORS as C } from './DashboardShell';

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

function normalizeQuiz(raw: DbQuiz) {
  return {
    title: raw.title || 'Your quiz',
    description: raw.description || '',
    questions: raw.questions || [],
    outcomes: raw.outcomes || [],
    leadGate: raw.leadGate,
    settings: raw.settings,
  };
}

function brandFromQuiz(raw: DbQuiz) {
  if (!raw.branding) return null;
  return {
    detected: !!raw.branding.auto_detected,
    colors: raw.branding.colors || {},
    font_family: raw.branding.font_family,
    site_name: raw.branding.site_name,
    favicon_url: raw.branding.favicon_url,
  };
}

/**
 * When TryFlowInner is rendered inside the DashboardShell (which already
 * owns the outer page background and a sticky header), we need to:
 *   1. Stop .stage from claiming 100vh (double scroll otherwise)
 *   2. Make the s3-top of the editor stick to the top of the main column
 *      rather than behind the shell topbar - we hide the shell topbar in
 *      this page via hideTopbar.
 */
const SHELL_OVERRIDES = `
  .dash-editor-shell .stage { min-height: auto; }
  .dash-editor-shell .stage.active { min-height: calc(100vh - 0px); }
  .dash-editor-shell .s3-top { position: sticky; top: 0; z-index: 15; }
`;

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
            color: C.BG,
            border: 0,
            borderRadius: 100,
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
            background: 'rgba(210,255,29,0.12)',
            border: '1px solid rgba(210,255,29,0.3)',
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
            color: C.BG,
            borderRadius: 100,
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
  const [quiz, setQuiz] = useState<DbQuiz | null>(null);
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

  if (state === 'loading') return <EditorLoading label="Loading editor…" />;
  if (state === 'error') return <EditorError message={errorMsg} />;
  if (state === 'empty') return <EditorEmpty />;
  if (!quiz) return <EditorLoading label="Loading editor…" />;

  return (
    <DashboardShell hideTopbar contentPadding="0">
      <style dangerouslySetInnerHTML={{ __html: SHELL_OVERRIDES }} />
      <div className="dash-editor-shell" style={{ minHeight: 'calc(100vh - 0px)' }}>
        <TryFlowInner
          mode="authed"
          authedQuizId={resolvedId}
          initialQuiz={normalizeQuiz(quiz)}
          initialBrand={brandFromQuiz(quiz)}
          initialUrl={quiz.branding?.site_url || quiz.source_url || ''}
          initialStage={3}
        />
      </div>
    </DashboardShell>
  );
}
