'use client';

/**
 * /dashboard/embed — Embed snippets + install instructions for every quiz.
 *
 * Central place users come to grab the code they need to paste into
 * Squarespace. Lists every quiz with a one-click copy button, plus a
 * step-by-step install guide for Squarespace 7.1 code injection.
 */

import { useEffect, useState } from 'react';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';
import { embedSnippet, publicQuizUrl } from '@/lib/urls';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

type Quiz = {
  id: string;
  title: string;
  slug: string;
  status: 'live' | 'draft';
};

function buildSnippet(slug: string): string {
  return embedSnippet(slug);
}

function QuizEmbedCard({ quiz }: { quiz: Quiz }) {
  const [copied, setCopied] = useState(false);
  const snippet = buildSnippet(quiz.slug);

  const handleCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card padding={22}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.TEXT, marginBottom: 4 }}>
            {quiz.title || 'Untitled quiz'}
          </div>
          <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>/{quiz.slug}</div>
        </div>
        <Pill variant={quiz.status === 'live' ? 'live' : 'draft'}>{quiz.status}</Pill>
      </div>

      <div
        style={{
          background: C.SURFACE,
          border: `1px solid ${C.BORDER}`,
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12.5,
          color: C.TEXT_MUTED,
          overflowX: 'auto',
          wordBreak: 'break-all',
        }}
      >
        {snippet}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <PrimaryButton onClick={handleCopy}>{copied ? 'Copied!' : 'Copy snippet'}</PrimaryButton>
        <a
          href={publicQuizUrl(quiz.slug)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '11px 20px',
            background: 'transparent',
            color: C.TEXT,
            border: `1px solid ${C.BORDER}`,
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          Preview live ↗
        </a>
      </div>
    </Card>
  );
}

function InstallGuide() {
  const steps = [
    {
      title: 'Copy your quiz snippet',
      body: 'Click "Copy snippet" on any quiz above. The snippet contains a single <script> tag tied to that specific quiz.',
    },
    {
      title: 'Open your Squarespace site',
      body: 'In Squarespace, navigate to the page where you want the quiz to appear. You can place it on your homepage, a landing page, or a dedicated "/quiz" URL.',
    },
    {
      title: 'Add a Code block',
      body: 'Click "Edit" on the page, press the "+" to add a block, and choose "Code". Paste the snippet into the code block exactly as copied — don\'t wrap it in any other HTML.',
    },
    {
      title: 'Save and publish',
      body: 'Save the page and publish your changes. The quiz will auto-mount where you placed the snippet. You can move the code block around just like any other block.',
    },
  ];

  return (
    <Card>
      <h2 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700, color: C.TEXT }}>
        Install on Squarespace
      </h2>
      <p style={{ margin: '0 0 22px 0', fontSize: 13.5, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
        Your quiz ships as a single &lt;script&gt; tag. Drop it into any Squarespace Code block
        and it will mount automatically. No custom CSS, no build step, no theme changes.
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {steps.map((step, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              gap: 14,
              paddingBottom: 18,
              marginBottom: 18,
              borderBottom: i < steps.length - 1 ? `1px solid ${C.BORDER}` : 'none',
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(210,255,29,0.1)',
                color: C.ACCENT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT, marginBottom: 4 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.55 }}>{step.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function EmbedPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load quizzes');
        const data: Quiz[] = await res.json();
        if (!cancelled) setQuizzes(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Embed & install">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Embed & install">
      <PageHeader
        title="Embed & install"
        subtitle="Grab your embed code and install it on Squarespace"
      />

      {loading ? (
        <PageLoading />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          }
          title="No quizzes to embed yet"
          body="Create a quiz first and you'll get a ready-to-paste embed snippet here."
          action={<PrimaryButton href="/try">+ Create a quiz</PrimaryButton>}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 20,
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            {quizzes.map((q) => (
              <QuizEmbedCard key={q.id} quiz={q} />
            ))}
          </div>

          <InstallGuide />
        </div>
      )}
    </DashboardShell>
  );
}
