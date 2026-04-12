'use client';

/**
 * /dashboard/brand-kit — Brand snapshot pulled from the user's quizzes.
 *
 * Squarespell doesn't store a separate "brand kit" per user yet — the brand
 * palette, font, logo, and site name live inside each quiz's `branding`
 * JSONB. This page picks the most recent quiz, loads its full record, and
 * shows the scraped brand so users can verify what we detected. Changing
 * quizzes in the dropdown lets them spot differences across sites.
 */

import { useEffect, useMemo, useState } from 'react';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  EmptyState,
  PrimaryButton,
  GhostButton,
  PageLoading,
} from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Quiz = {
  id: string;
  title: string;
  slug: string;
};

type QuizFull = Quiz & {
  branding?: {
    colors?: Record<string, string>;
    font_family?: string;
    site_name?: string;
    favicon_url?: string;
  } | null;
  settings?: Record<string, any>;
};

function ColorSwatch({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={onCopy}
      style={{
        background: 'transparent',
        border: `1px solid ${C.BORDER}`,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: '"DM Sans",system-ui,sans-serif',
        color: C.TEXT,
        width: '100%',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: value,
          border: `1px solid ${C.BORDER}`,
          flexShrink: 0,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13, fontFamily: 'ui-monospace,monospace', color: C.TEXT }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: 11, color: copied ? C.ACCENT : C.TEXT_MUTED, fontWeight: 600 }}>
        {copied ? 'Copied' : 'Copy'}
      </div>
    </button>
  );
}

export default function BrandKitPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [quiz, setQuiz] = useState<QuizFull | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load quizzes');
        const data: Quiz[] = await res.json();
        if (cancelled) return;
        setQuizzes(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !selectedId) return;
    let cancelled = false;
    setLoadingQuiz(true);
    (async () => {
      try {
        const res = await fetch(`${API}/api/quizzes/${selectedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load quiz');
        const data = await res.json();
        if (!cancelled) setQuiz(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingQuiz(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  const colors = useMemo(() => {
    const raw = quiz?.branding?.colors ?? {};
    return Object.entries(raw).filter(([, v]) => typeof v === 'string' && v);
  }, [quiz]);

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Brand kit">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Brand kit">
      <PageHeader
        title="Brand kit"
        subtitle="The brand signals Squarespell detected from your website"
      />

      {loadingList ? (
        <PageLoading />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5" />
              <circle cx="19" cy="13" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="10" cy="20" r="2.5" />
              <path d="M12 2a10 10 0 1 0 10 10" />
            </svg>
          }
          title="No brand kit yet"
          body="When you create a quiz from your website, Squarespell scrapes your palette, fonts, logo, and brand name. Start a quiz to see your brand kit here."
          action={<PrimaryButton href="/tools/quiz-funnel/build">+ Create a quiz</PrimaryButton>}
        />
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                marginBottom: 4,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.TEXT_MUTED,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 6,
                  }}
                >
                  Showing brand from
                </div>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    background: C.SURFACE,
                    border: `1px solid ${C.BORDER}`,
                    borderRadius: 10,
                    fontSize: 13.5,
                    color: C.TEXT,
                    fontFamily: '"DM Sans",system-ui,sans-serif',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title || 'Untitled'}
                    </option>
                  ))}
                </select>
              </div>
              {quiz?.settings?.website_url && (
                <GhostButton
                  href={quiz.settings.website_url as string}
                  target="_blank"
                >
                  Visit site ↗
                </GhostButton>
              )}
            </div>
          </Card>

          {loadingQuiz || !quiz ? (
            <PageLoading />
          ) : (
            <>
              <Card>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {quiz.branding?.favicon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={quiz.branding.favicon_url}
                      alt=""
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: C.SURFACE,
                        border: `1px solid ${C.BORDER}`,
                        objectFit: 'contain',
                        padding: 6,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: C.SURFACE,
                        border: `1px solid ${C.BORDER}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: C.TEXT_MUTED,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      {(quiz.branding?.site_name || quiz.title || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.TEXT, marginBottom: 2 }}>
                      {quiz.branding?.site_name || 'Unknown brand'}
                    </div>
                    <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
                      Detected from {quiz.title || 'this quiz'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
                  Palette
                </h2>
                {colors.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
                    No colors were detected. You can still edit the quiz to pick your own palette.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {colors.map(([label, value]) => (
                      <ColorSwatch key={label} label={label} value={value as string} />
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h2 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
                  Typography
                </h2>
                <div
                  style={{
                    padding: 20,
                    border: `1px solid ${C.BORDER}`,
                    borderRadius: 12,
                    background: C.SURFACE,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.TEXT_MUTED,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 10,
                    }}
                  >
                    Font family
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      color: C.TEXT,
                      fontFamily: quiz.branding?.font_family || 'inherit',
                      marginBottom: 6,
                      lineHeight: 1.2,
                    }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </div>
                  <div style={{ fontSize: 12.5, color: C.TEXT_MUTED, fontFamily: 'ui-monospace,monospace' }}>
                    {quiz.branding?.font_family || 'sans-serif (fallback)'}
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 280px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
                      Want to tweak it?
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
                      You can override any color or font directly on the quiz you're viewing. Changes
                      apply instantly to the live embed.
                    </p>
                  </div>
                  <PrimaryButton href={`/dashboard/${quiz.id}`}>Edit this quiz</PrimaryButton>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
