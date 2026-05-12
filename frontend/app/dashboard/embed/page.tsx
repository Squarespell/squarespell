'use client';
import { useToast } from '@/lib/toast';

/**
 * /dashboard/embed - Embed snippets + install instructions for every quiz.
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
import { embedSnippet, embedScriptUrl, publicQuizUrl } from '@/lib/urls';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Quiz = {
  id: string;
  title: string;
  slug: string;
  status: 'live' | 'draft';
};

type EmbedMode = 'inline' | 'popup' | 'tab';

function buildSnippet(slug: string, mode: EmbedMode = 'inline'): string {
  if (mode === 'inline') return embedSnippet(slug);
  if (mode === 'popup') return `<div data-squarespell-quiz="${slug}" data-mode="popup" data-button-text="Take the quiz"></div>
<script src="${embedScriptUrl()}" data-quiz="${slug}" async></script>`;
  return `<div data-squarespell-quiz="${slug}" data-mode="tab" data-button-text="Take our quiz"></div>
<script src="${embedScriptUrl()}" data-quiz="${slug}" async></script>`;
}

const MODE_LABELS: Record<EmbedMode, { label: string; desc: string }> = {
  inline: { label: 'Inline', desc: 'Embeds directly in the page flow' },
  popup: { label: 'Popup', desc: 'Opens in a centered overlay on click' },
  tab: { label: 'Tab', desc: 'Sticky tab on the side of the screen' },
};

function QuizEmbedCard({ quiz }: { quiz: Quiz }) {
  const { success: toastSuccess } = useToast();
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<EmbedMode>('inline');
  const snippet = buildSnippet(quiz.slug, mode);

  const handleCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      toastSuccess('Embed code copied to clipboard');
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['inline', 'popup', 'tab'] as EmbedMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setCopied(false); }}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${mode === m ? C.ACCENT : C.BORDER}`,
              background: mode === m ? C.ACCENT_LIGHT : 'transparent',
              color: mode === m ? C.ACCENT : C.TEXT_MUTED,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {MODE_LABELS[m].label}
          </button>
        ))}
        <span style={{ fontSize: 11.5, color: C.TEXT_MUTED, alignSelf: 'center', marginLeft: 4 }}>
          {MODE_LABELS[mode].desc}
        </span>
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
          whiteSpace: 'pre-wrap',
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
            borderRadius: 8,
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
  const [method, setMethod] = useState<'block' | 'injection'>('block');

  const blockSteps = [
    {
      title: 'Copy your quiz snippet',
      body: 'Click "Copy snippet" on any quiz card above. The snippet is a small code block tied to that specific quiz.',
    },
    {
      title: 'Edit the target page in Squarespace',
      body: 'Open your Squarespace site editor and navigate to the page where the quiz should appear - homepage, a landing page, or a dedicated "/quiz" page.',
    },
    {
      title: 'Insert a Code block',
      body: 'Click the insert point (+) where you want the quiz, choose "Code" from the block picker. Toggle "Display Source" OFF. Paste the snippet exactly as copied.',
    },
    {
      title: 'Save and preview',
      body: 'Save the page and preview it. The quiz auto-mounts inside the Code block. You can drag the block around just like any other Squarespace block.',
    },
  ];

  const injectionSteps = [
    {
      title: 'Copy your quiz snippet',
      body: 'Click "Copy snippet" above. For site-wide injection, use the "tab" or "popup" mode so the quiz floats on every page.',
    },
    {
      title: 'Open Code Injection settings',
      body: 'In Squarespace, go to Settings, then Advanced, then Code Injection. Available on Business plan and above.',
    },
    {
      title: 'Paste in the Header section',
      body: 'Paste the snippet into the "Header" field. This loads on every page immediately. Header is recommended for popup and tab modes.',
    },
    {
      title: 'Save',
      body: 'Click Save. The quiz will now appear on every page of your site. For page-specific placement, use the Code Block method instead.',
    },
  ];

  const steps = method === 'block' ? blockSteps : injectionSteps;

  return (
    <Card>
      <h2 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700, color: C.TEXT }}>
        Install on Squarespace
      </h2>
      <p style={{ margin: '0 0 14px 0', fontSize: 13.5, color: C.TEXT_MUTED, lineHeight: 1.55 }}>
        Your quiz ships as a single &lt;script&gt; tag. Choose how to install it:
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([
          { id: 'block' as const, label: 'Code Block', hint: 'Place on a specific page' },
          { id: 'injection' as const, label: 'Code Injection', hint: 'Show on every page' },
        ]).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: `1.5px solid ${method === m.id ? C.ACCENT : C.BORDER}`,
              borderRadius: 10,
              background: method === m.id ? C.ACCENT_LIGHT : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all .15s ease',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: method === m.id ? C.ACCENT : C.TEXT, marginBottom: 2 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 11.5, color: C.TEXT_MUTED }}>{m.hint}</div>
          </button>
        ))}
      </div>
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
                background: C.ACCENT_LIGHT,
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

function SquarespaceConnect({ token }: { token: string | null }) {
  var [siteUrl, setSiteUrl] = useState('');
  var [connecting, setConnecting] = useState(false);
  var [connected, setConnected] = useState(false);
  var [brandResult, setBrandResult] = useState<any>(null);
  var [error, setError] = useState('');

  function handleConnect() {
    if (!siteUrl.trim() || !token) return;
    setConnecting(true);
    setError('');
    var url = siteUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;

    // Step 1: Scrape brand from the Squarespace URL
    fetch(API + '/api/scrape-brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ url: url }),
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.error) throw new Error(data.error);
        setBrandResult(data);

        // Step 2: Save as brand kit
        return fetch(API + '/api/user/brand-kit', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({
            colors: data.colors || {},
            font_family: data.font_family || '',
            site_name: data.site_name || '',
            favicon_url: data.favicon_url || '',
            site_url: url,
          }),
        });
      })
      .then(function() {
        setConnected(true);
      })
      .catch(function(err) { setError(err.message || 'Failed to connect'); })
      .finally(function() { setConnecting(false); });
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, color: '#fff',
        }}>S</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.TEXT }}>
            Connect Squarespace
          </h2>
          <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>Auto-detect your brand and generate embed code</div>
        </div>
      </div>

      {connected && brandResult ? (
        <div style={{
          padding: '16px 20px', background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#16A34A' }}>
              Connected to {brandResult.site_name || siteUrl}
            </div>
            <div style={{ fontSize: 12, color: '#15803D' }}>
              Brand colors {brandResult.colors?.primary ? '(' + brandResult.colors.primary + ')' : ''} and fonts imported to your Brand Kit.
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={siteUrl}
              onChange={function(e) { setSiteUrl(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter') handleConnect(); }}
              placeholder="yoursite.squarespace.com"
              style={{
                flex: 1, padding: '10px 14px', border: '1px solid ' + C.BORDER,
                borderRadius: 10, fontSize: 13.5, color: C.TEXT, outline: 'none',
                fontFamily: '"Poppins",system-ui,sans-serif',
              }}
            />
            <button type="button" onClick={handleConnect} disabled={connecting || !siteUrl.trim()}
              style={{
                padding: '10px 20px', background: C.ACCENT, color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: connecting ? 'wait' : 'pointer', opacity: connecting ? 0.6 : 1,
                whiteSpace: 'nowrap' as const,
              }}>
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
          {error && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 8 }}>{error}</div>}
          <p style={{ fontSize: 12, color: C.TEXT_MUTED, margin: '10px 0 0' }}>
            We'll detect your Squarespace site's brand colors, fonts, and logo so every quiz matches your site perfectly.
          </p>
        </div>
      )}
    </Card>
  );
}

export default function EmbedPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);

  function fetchQuizzes() {
    if (!token) return;
    setLoading(true);
    setError(false);
    fetch(API + '/api/quizzes', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load quizzes');
        return res.json();
      })
      .then(function(data: Quiz[]) {
        setQuizzes(data);
        setLoading(false);
      })
      .catch(function(e) {
        console.error(e);
        setError(true);
        setLoading(false);
      });
  }

  useEffect(function() { fetchQuizzes(); }, [token]);

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Embed & install">
        <PageLoading />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Embed & install">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED}
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>
            Could not load quizzes
          </div>
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 18 }}>
            The server may be starting up. Please try again.
          </div>
          <PrimaryButton onClick={function() { fetchQuizzes(); }}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Embed & install">
      <PageHeader
        title="Embed & install"
        subtitle="Grab your embed code and install it on Squarespace"
      />

      {quizzes.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          }
          title="No quizzes to embed yet"
          body="Create a quiz first and you'll get a ready-to-paste embed snippet here."
          action={<PrimaryButton href="/tools/quiz-funnel/build">+ Create a quiz</PrimaryButton>}
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

          <SquarespaceConnect token={token} />

          <InstallGuide />
        </div>
      )}
    </DashboardShell>
  );
}
