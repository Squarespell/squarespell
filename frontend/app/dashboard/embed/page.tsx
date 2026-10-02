'use client';
import { useToast } from '@/lib/toast';

/**
 * /dashboard/embed - Manual embed configurator (2026 redesign, screen 16: "Embed your quiz").
 *
 * Left: quiz picker (search, All/Live/Drafts). Right: Inline / Popup / Tab modes, a placement preview (live quizzes
 * load the real public quiz; drafts explain they must be published first), one code panel with Copy, Preview live,
 * the Squarespace install guide (Code block or Code Injection), and the brand import helper.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { EmptyState, PrimaryButton, Pill, PageLoading } from '../_components/PageShell';
import { QuizCover } from '../_components/QuizCover';
import { embedSnippetForMode, publicQuizUrl, type EmbedMode } from '@/lib/urls';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

type Quiz = { id: string; title: string; slug: string; status: 'live' | 'draft'; created_at?: string };

const MODE_LABELS: Record<EmbedMode, { label: string; desc: string }> = {
  inline: { label: 'Inline', desc: 'Embeds directly in the page flow' },
  popup: { label: 'Popup', desc: 'Opens in a centered overlay on click' },
  tab: { label: 'Tab', desc: 'Sticky tab on the side of the screen' },
};

const PAGE_CSS = `
  .sq-emb { display: grid; grid-template-columns: 380px minmax(0, 1fr); min-height: calc(100vh - 118px); }
  .sq-emb-side { border-right: 1px solid ${C.BORDER}; padding: 36px 20px 40px; }
  .sq-emb-main { padding: 40px 40px 72px; min-width: 0; }
  .sq-emb-work { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(360px, 1fr); gap: 20px; background: #fff; border: 1px solid ${C.BORDER}; border-radius: 8px; padding: 20px; }
  .sq-qpick { display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; border: none; border-radius: 6px; background: transparent; text-align: left; cursor: pointer; font-family: ${C.FONT}; }
  .sq-qpick:hover { background: #fff; }
  .sq-qpick[aria-current="true"] { background: ${C.PERIWINKLE_SOFT}; }
  .sq-mode { height: 44px; padding: 0 22px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 15px ${C.FONT}; cursor: pointer; }
  .sq-mode[aria-pressed="true"] { background: ${C.ACCENT}; border-color: ${C.ACCENT}; color: #fff; }
  @media (max-width: 1280px) { .sq-emb-work { grid-template-columns: 1fr; } }
  @media (max-width: 960px) { .sq-emb { grid-template-columns: 1fr; } .sq-emb-side { border-right: none; border-bottom: 1px solid ${C.BORDER}; } .sq-emb-main { padding: 28px 16px 60px; } }
`;

function CopyIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>;
}

/** Where the quiz sits on a page, per mode. Live quizzes render the real public quiz in the inline preview. */
function PlacementPreview({ quiz, mode }: { quiz: Quiz; mode: EmbedMode }) {
  const live = quiz.status === 'live';
  return (
    <div style={{ border: '1px solid ' + C.BORDER, borderRadius: 6, overflow: 'hidden', background: C.GRAY_50 }}>
      <div style={{ display: 'flex', gap: 7, padding: '10px 14px', borderBottom: '1px solid ' + C.BORDER, background: '#fff' }} aria-hidden="true">
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.GRAY_300 }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.GRAY_200 }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.GRAY_200 }} />
      </div>
      <div style={{ position: 'relative', height: 420, padding: 20 }}>
        {/* Page skeleton the quiz sits within */}
        <div aria-hidden="true" style={{ height: 12, width: '40%', background: C.GRAY_200, borderRadius: 3, marginBottom: 10 }} />
        <div aria-hidden="true" style={{ height: 8, width: '70%', background: C.GRAY_100, borderRadius: 3, marginBottom: 18 }} />
        {mode === 'inline' ? (
          live ? (
            <div style={{ height: 340, borderRadius: 6, overflow: 'hidden', border: '1px solid ' + C.BORDER, background: '#fff' }}>
              <iframe title={'Preview of ' + quiz.title} src={publicQuizUrl(quiz.slug)} style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" />
            </div>
          ) : (
            <div style={{ height: 340, borderRadius: 6, border: '1px dashed ' + C.GRAY_300, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
              <div style={{ width: 150, height: 84, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}><QuizCover id={quiz.id} title={quiz.title} height={84} compact /></div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>{quiz.title}</div>
              <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4, maxWidth: 340 }}>Drafts can’t be shown to visitors. Publish this quiz to see it live here.</div>
            </div>
          )
        ) : (
          <div aria-hidden="true">
            {[80, 64, 72, 56].map((w, i) => <div key={i} style={{ height: 8, width: w + '%', background: C.GRAY_100, borderRadius: 3, marginBottom: 12 }} />)}
            {mode === 'popup' ? (
              <div style={{ display: 'inline-flex', marginTop: 16, height: 40, alignItems: 'center', padding: '0 18px', borderRadius: 6, background: C.INK, color: '#fff', fontSize: 14 }}>Take the quiz</div>
            ) : (
              <div style={{ position: 'absolute', right: 0, top: '42%', writingMode: 'vertical-rl', padding: '14px 9px', borderRadius: '6px 0 0 6px', background: C.INK, color: '#fff', fontSize: 13 }}>Take our quiz</div>
            )}
            <div style={{ marginTop: 18, fontSize: 13, color: C.GRAY_500 }}>{mode === 'popup' ? 'Clicking the button opens the quiz in a centered overlay.' : 'The tab stays on the side of every page it is installed on.'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InstallGuide() {
  const [method, setMethod] = useState<'block' | 'injection'>('block');
  const steps = method === 'block'
    ? [
        { t: 'Copy the code', b: 'Click Copy code above to copy the embed code for this quiz.' },
        { t: 'Add a Code block', b: 'In Squarespace, open the page where you want your quiz, click + then Code, and add a Code block. Turn Display Source off.' },
        { t: 'Paste and publish', b: 'Paste the code into the block and save. Your quiz appears on your live site.' },
      ]
    : [
        { t: 'Copy the code', b: 'Use the Popup or Tab mode so the quiz floats on every page.' },
        { t: 'Open Code Injection', b: 'In Squarespace, go to Settings, then Advanced, then Code Injection (available on Squarespace Business plans and above).' },
        { t: 'Paste in Header and save', b: 'Paste the code into the Header field and save. For one page only, use a Code block instead.' },
      ];
  return (
    <div style={{ border: '1px solid ' + C.BORDER, borderRadius: 6, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.INK }}>How to install on Squarespace</h3>
        <div role="group" aria-label="Install method" style={{ display: 'flex', background: C.GRAY_100, borderRadius: 6, padding: 2 }}>
          {([['block', 'Code block'], ['injection', 'Code injection']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={method === id} onClick={() => setMethod(id)}
              style={{ padding: '6px 12px', borderRadius: 5, border: 'none', fontSize: 13, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer', background: method === id ? '#fff' : 'transparent', color: method === id ? C.INK : C.GRAY_500, boxShadow: method === id ? C.SHADOW_SM : 'none' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 16 }}>
        {steps.map((s, i) => (
          <li key={i} style={{ display: 'flex', gap: 16 }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: C.PERIWINKLE_SOFT, color: C.ACCENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
            <div><div style={{ fontSize: 15, fontWeight: 600, color: C.INK }}>{s.t}</div><div style={{ fontSize: 14, color: C.GRAY_600, lineHeight: 1.5, marginTop: 2 }}>{s.b}</div></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BrandImport({ token }: { token: string | null }) {
  const [siteUrl, setSiteUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  function handleImport() {
    if (!siteUrl.trim() || !token) return;
    setBusy(true);
    setError('');
    let url = siteUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    fetch(API + '/api/scrape-brand', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ url }) })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
        return fetch(API + '/api/user/brand-kit', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ colors: data.colors || {}, font_family: data.font_family || '', site_name: data.site_name || '', favicon_url: data.favicon_url || '', site_url: url }),
        });
      })
      .catch((err) => { setResult(null); setError(err.message || 'Failed to import brand'); })
      .finally(() => setBusy(false));
  }

  return (
    <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '22px 24px', marginTop: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.INK }}>Import brand from your Squarespace site</h2>
      <p style={{ margin: '4px 0 14px', fontSize: 14, color: C.GRAY_600 }}>Reads your public colours and fonts into your Brand Kit. It does not connect to or change your website.</p>
      {result && !error ? (
        <div style={{ padding: '14px 16px', background: C.SUCCESS_LIGHT, borderRadius: 6, fontSize: 14, color: C.SUCCESS_700 }}>
          Brand imported from {result.site_name || siteUrl}{result.colors?.primary ? ' (primary ' + result.colors.primary + ')' : ''}. <Link href="/dashboard/brand-kit" style={{ color: C.SUCCESS_700, fontWeight: 600 }}>Open Brand Kit</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="text" aria-label="Your website address" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleImport(); }} placeholder="yoursite.com"
            style={{ flex: '1 1 260px', height: 44, padding: '0 14px', border: '1px solid ' + C.BORDER, borderRadius: 6, fontSize: 15, color: C.INK, fontFamily: C.FONT }} />
          <PrimaryButton onClick={handleImport} disabled={busy || !siteUrl.trim()}>{busy ? 'Importing...' : 'Import brand'}</PrimaryButton>
        </div>
      )}
      {error && <div role="alert" style={{ fontSize: 13, color: C.DANGER, marginTop: 8 }}>{error}</div>}
    </section>
  );
}

export default function EmbedPage() {
  const { success: toastSuccess } = useToast();
  const { token, status: authStatus } = useDashboardAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'draft'>('all');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<EmbedMode>('inline');
  const [copied, setCopied] = useState(false);

  function fetchQuizzes() {
    if (!token) return;
    setLoading(true);
    setError(false);
    fetch(API + '/api/quizzes', { headers: { Authorization: 'Bearer ' + token } })
      .then((res) => { if (!res.ok) throw new Error('Failed to load quizzes'); return res.json(); })
      .then((data: Quiz[]) => {
        const list = Array.isArray(data) ? data : [];
        setQuizzes(list);
        const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quiz') : null;
        setSelectedId((prev) => prev || (list.find((q) => q.id === fromUrl || q.slug === fromUrl) || list[0] || { id: null } as any).id);
        setLoading(false);
      })
      .catch((e) => { console.error(e); setError(true); setLoading(false); });
  }
  useEffect(() => { fetchQuizzes(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const coverOrder = useMemo(() => {
    const o: Record<string, number> = {};
    quizzes.slice().sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()).forEach((q, i) => { o[q.id] = i; });
    return o;
  }, [quizzes]);

  const shown = quizzes.filter((q) => (filter === 'all' || q.status === filter) && (q.title || '').toLowerCase().includes(search.trim().toLowerCase()));
  const quiz = quizzes.find((q) => q.id === selectedId) || null;
  const snippet = quiz ? embedSnippetForMode(quiz.slug, mode) : '';
  const liveCount = quizzes.filter((q) => q.status === 'live').length;
  const draftCount = quizzes.filter((q) => q.status === 'draft').length;

  function handleCopy() {
    if (!snippet || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      toastSuccess('Embed code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (authStatus === 'loading' || loading) {
    return <DashboardShell title="Embed & install"><PageLoading /></DashboardShell>;
  }

  if (error) {
    return (
      <DashboardShell title="Embed & install">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 28, fontWeight: 500, color: C.INK, marginBottom: 8 }}>Could not load quizzes</div>
          <div style={{ fontSize: 15, color: C.GRAY_600, marginBottom: 20 }}>The server may be starting up. Please try again.</div>
          <PrimaryButton onClick={() => fetchQuizzes()}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  if (quizzes.length === 0) {
    return (
      <DashboardShell title="Embed & install">
        <EmptyState
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>}
          title="No quizzes to embed yet"
          body="Create a quiz first and you'll get a ready-to-paste embed code here."
          action={<PrimaryButton href="/dashboard/quizzes">Go to your quizzes</PrimaryButton>}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Embed & install" contentPadding="0">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div className="sq-emb">
        {/* Quiz picker */}
        <aside className="sq-emb-side" aria-label="Choose a quiz">
          <div style={{ padding: '0 14px' }}>
            <div style={{ fontSize: 15, color: C.GRAY_600, marginBottom: 6 }}>Publish</div>
            <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 34, fontWeight: 500, letterSpacing: '-0.035em', color: C.INK }}>Choose a quiz</h2>
            <p style={{ margin: '6px 0 20px', fontSize: 15, color: C.GRAY_600 }}>Select a quiz to get its embed code.</p>
            <label style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ position: 'absolute', left: 14, color: C.GRAY_500, display: 'flex' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
              <input type="search" aria-label="Search quizzes" placeholder="Search quizzes..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', height: 44, padding: '0 14px 0 42px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 15, fontFamily: C.FONT, color: C.INK }} />
            </label>
            <div role="group" aria-label="Filter quizzes" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {([['all', 'All', quizzes.length], ['live', 'Live', liveCount], ['draft', 'Drafts', draftCount]] as const).map(([v, l, n]) => (
                <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', borderRadius: 999, border: '1px solid ' + (filter === v ? C.INK : C.BORDER), background: filter === v ? C.INK : '#fff', color: filter === v ? '#fff' : C.INK, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer' }}>
                  {l}<span style={{ fontSize: 12, padding: '1px 6px', borderRadius: 999, background: filter === v ? 'rgba(255,255,255,.18)' : C.GRAY_100, color: filter === v ? '#fff' : C.GRAY_600 }}>{n}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            {shown.map((q) => (
              <button key={q.id} type="button" className="sq-qpick" aria-current={q.id === selectedId} onClick={() => { setSelectedId(q.id); setCopied(false); }}>
                <span style={{ width: 64, height: 64, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}><QuizCover id={q.id} title={q.title} height={64} compact variant={coverOrder[q.id]} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 500, color: C.INK, lineHeight: 1.3 }}>{q.title || 'Untitled quiz'}</span>
                  <span style={{ display: 'block', fontSize: 13, color: C.GRAY_500, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>/{q.slug}</span>
                </span>
                <Pill variant={q.status === 'live' ? 'live' : 'draft'}>{q.status === 'live' ? 'Live' : 'Draft'}</Pill>
              </button>
            ))}
            {shown.length === 0 && <div style={{ padding: '12px 14px', fontSize: 14, color: C.GRAY_500 }}>No quizzes match.</div>}
          </div>
        </aside>

        {/* Configurator */}
        <div className="sq-emb-main">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: C.ACCENT, background: C.GRAY_50, border: '1px solid ' + C.BORDER, padding: '6px 13px', borderRadius: 999, marginBottom: 16 }}><i style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }} />Embed &amp; install</div>
          <h1 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(38px, 4.4vw, 60px)', fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, color: C.INK }}>Embed your quiz</h1>
          <p style={{ margin: '14px 0 28px', fontSize: 'clamp(16px, 1.4vw, 20px)', color: C.GRAY_600 }}>Grab your embed code and install it on your Squarespace site.</p>

          {quiz && (
            <div className="sq-emb-work">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div role="group" aria-label="Embed mode" style={{ display: 'flex', gap: 8 }}>
                    {(['inline', 'popup', 'tab'] as EmbedMode[]).map((m) => (
                      <button key={m} type="button" className="sq-mode" aria-pressed={mode === m} onClick={() => { setMode(m); setCopied(false); }}>{MODE_LABELS[m].label}</button>
                    ))}
                  </div>
                  <span style={{ paddingLeft: 14, borderLeft: '1px solid ' + C.BORDER, fontSize: 14, color: C.GRAY_500 }}>{MODE_LABELS[mode].desc}</span>
                </div>
                <div style={{ border: '1px solid ' + C.BORDER, borderRadius: 6, padding: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.INK }}>Live preview</h3>
                  <p style={{ margin: '4px 0 16px', fontSize: 14, color: C.GRAY_500 }}>How your quiz sits on a page of your website.</p>
                  <PlacementPreview quiz={quiz} mode={mode} />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
                <div style={{ background: C.INK, borderRadius: 6, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>Your embed code</h3>
                    <button type="button" onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', borderRadius: 6, border: 'none', background: C.ACCENT, color: '#fff', fontSize: 15, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer' }}>
                      <CopyIcon /> {copied ? 'Copied' : 'Copy code'}
                    </button>
                  </div>
                  <pre style={{ margin: 0, padding: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: C.PERIWINKLE, fontFamily: C.MONO_FONT, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{snippet}</pre>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {quiz.status === 'live' ? (
                    <a href={publicQuizUrl(quiz.slug)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 48, padding: '0 20px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>
                      Preview live ↗
                    </a>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 20px', borderRadius: 6, border: '1px solid ' + C.BORDER, color: C.GRAY_400, fontSize: 16 }} aria-disabled="true">Preview live ↗</span>
                  )}
                  <span style={{ fontSize: 14, color: C.GRAY_500 }}>{quiz.status === 'live' ? 'Open the live version of your quiz' : 'Available once the quiz is published'}</span>
                </div>

                <InstallGuide />

                {quiz.status !== 'live' && (
                  <div role="note" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 6, background: C.PERIWINKLE_SOFT, flexWrap: 'wrap' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.INK }}>This quiz is a draft</div>
                      <div style={{ fontSize: 14, color: C.GRAY_600 }}>Publish your quiz before sharing it on your website.</div>
                    </div>
                    <Link href={'/dashboard/' + quiz.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 14, textDecoration: 'none' }}>Go to editor</Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <BrandImport token={token} />
        </div>
      </div>
    </DashboardShell>
  );
}
