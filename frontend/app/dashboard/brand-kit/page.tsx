'use client';

/**
 * /dashboard/brand-kit - Brand snapshot pulled from the user's quizzes.
 *
 * Squarespell doesn't store a separate "brand kit" per user yet - the brand
 * palette, font, logo, and site name live inside each quiz's `branding`
 * JSONB. This page picks the most recent quiz, loads its full record, and
 * shows the scraped brand so users can verify what we detected. Changing
 * quizzes in the dropdown lets them spot differences across sites.
 */

import { useEffect, useState } from 'react';

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

// -----------------------------------------------------------------------
// Scrape-from-URL input
// -----------------------------------------------------------------------

function ScrapeUrlInput({
  onResult,
  loading,
  onLoadingChange,
  token,
}: {
  onResult: (brand: any) => void;
  loading: boolean;
  onLoadingChange: (v: boolean) => void;
  token: string | null;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  async function handleScrape() {
    const trimmed = url.trim();
    if (!trimmed || !token) return;
    setError('');
    onLoadingChange(true);
    try {
      const res = await fetch(`${API}/api/scrape-brand`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Scrape failed (${res.status})`);
      }
      const data = await res.json();
      onResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      onLoadingChange(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleScrape(); }}
          placeholder="https://your-squarespace-site.com"
          style={{
            flex: 1,
            padding: '11px 14px',
            background: C.SURFACE,
            border: `1px solid ${C.BORDER}`,
            borderRadius: 10,
            fontSize: 13.5,
            color: C.TEXT,
            fontFamily: '"DM Sans",system-ui,sans-serif',
            outline: 'none',
          }}
        />
        <PrimaryButton
          onClick={handleScrape}
          disabled={loading || !url.trim()}
        >
          {loading ? 'Scanning...' : 'Import brand'}
        </PrimaryButton>
      </div>
      {error && (
        <div style={{ fontSize: 12.5, color: '#ef4444', lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Brand display (shared between quiz-derived and scraped brands)
// -----------------------------------------------------------------------

function BrandDisplay({ brand, label }: {
  brand: { colors?: Record<string, string>; font_family?: string; site_name?: string; favicon_url?: string };
  label?: string;
}) {
  const colors = Object.entries(brand.colors || {}).filter(([, v]) => typeof v === 'string' && v);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {brand.favicon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.favicon_url}
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
              {(brand.site_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.TEXT, marginBottom: 2 }}>
              {brand.site_name || 'Unknown brand'}
            </div>
            {label && (
              <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>{label}</div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
          Palette
        </h2>
        {colors.length === 0 ? (
          <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
            No colors were detected.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {colors.map(([l, value]) => (
              <ColorSwatch key={l} label={l} value={value as string} />
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
              fontFamily: brand.font_family || 'inherit',
              marginBottom: 6,
              lineHeight: 1.2,
            }}
          >
            The quick brown fox jumps over the lazy dog.
          </div>
          <div style={{ fontSize: 12.5, color: C.TEXT_MUTED, fontFamily: 'ui-monospace,monospace' }}>
            {brand.font_family || 'sans-serif (fallback)'}
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function BrandKitPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [quiz, setQuiz] = useState<QuizFull | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Standalone scrape state (independent of quiz selection)
  const [scrapedBrand, setScrapedBrand] = useState<any>(null);
  const [scraping, setScraping] = useState(false);

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

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Brand kit">
        <PageLoading />
      </DashboardShell>
    );
  }

  // Determine which brand to display: scraped (priority) or quiz-derived
  const quizBrand = quiz?.branding || null;

  return (
    <DashboardShell title="Brand kit">
      <PageHeader
        title="Brand kit"
        subtitle="The brand signals Squarespell detected from your website"
      />

      {/* ---- Import from URL (always visible) ---- */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
            Import from URL
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
            Paste any Squarespace site URL to detect its palette, fonts, and brand name.
          </p>
        </div>
        <ScrapeUrlInput
          token={token}
          loading={scraping}
          onLoadingChange={setScraping}
          onResult={(data) => {
            setScrapedBrand({
              colors: data.colors,
              font_family: data.font_family,
              site_name: data.site_name,
              favicon_url: data.favicon_url,
            });
          }}
        />
      </Card>

      {/* ---- Scraped brand result ---- */}
      {scrapedBrand && (
        <div style={{ marginBottom: 24 }}>
          <BrandDisplay brand={scrapedBrand} label="Imported from URL" />
        </div>
      )}

      {/* ---- Quiz-derived brand (existing behavior) ---- */}
      {loadingList ? (
        <PageLoading />
      ) : quizzes.length === 0 && !scrapedBrand ? (
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
          body="Paste a URL above to import your brand, or create a quiz to auto-detect your palette, fonts, and logo."
          action={<PrimaryButton href="/tools/quiz-funnel/build">+ Create a quiz</PrimaryButton>}
        />
      ) : quizzes.length > 0 ? (
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
                  Brand from quiz
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
                  Visit site
                </GhostButton>
              )}
            </div>
          </Card>

          {loadingQuiz || !quiz ? (
            <PageLoading />
          ) : quizBrand ? (
            <>
              <BrandDisplay
                brand={quizBrand}
                label={`Detected from ${quiz.title || 'this quiz'}`}
              />
              <Card style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 280px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: C.TEXT }}>
                      Want to tweak it?
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
                      You can override any color or font directly on the quiz. Changes
                      apply instantly to the live embed.
                    </p>
                  </div>
                  <PrimaryButton href={`/dashboard/${quiz.id}`}>Edit this quiz</PrimaryButton>
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
                No brand data found on this quiz. Use the URL import above to scan your site.
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </DashboardShell>
  );
}
