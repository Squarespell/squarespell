'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageLoading, PrimaryButton, DisplayTitle } from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

/* ── types ────────────────────────────────────────────────── */

type Lead = {
  id: string;
  name: string | null;
  email: string;
  answers: Record<string, any>;
  outcome_id: string | null;
  score?: number | null;
  created_at: string;
  quiz_id: string;
  metadata?: Record<string, any>;
  quizzes?: { id: string; title: string; slug: string } | null;
};

/* ── helpers ──────────────────────────────────────────────── */

function timeAgo(s: string) {
  var d = new Date(s);
  var now = new Date();
  var ms = now.getTime() - d.getTime();
  var mins = Math.floor(ms / 60000);
  var hrs = Math.floor(ms / 3600000);
  var days = Math.floor(ms / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  if (hrs < 24) return hrs + 'h ago';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString();
}

function formatFullDate(s: string) {
  var d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getIntentLabel(score: number | null | undefined): 'high' | 'new' | 'low' | 'none' {
  if (score == null) return 'none';
  if (score >= 70) return 'high';
  if (score >= 40) return 'new';
  return 'low';
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

var AVATAR_COLORS = ['#3154FF', '#059669', '#2563EB', '#D85A30', '#7F56D9', '#D97706', '#DC2626', '#2443E0'];
function avatarColor(s: string) {
  var hash = 0;
  for (var i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function downloadCsv(leads: Lead[]) {
  var header = ['captured_at', 'name', 'email', 'quiz', 'score', 'answers'];
  var rows = leads.map(function (l) {
    return [
      new Date(l.created_at).toISOString(),
      l.name ?? '',
      l.email,
      l.quizzes?.title ?? '',
      l.score ?? '',
      JSON.stringify(l.answers ?? {}),
    ];
  });
  var csv = [header].concat(rows as any)
    .map(function (row: any[]) { return row.map(function (v: any) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); })
    .join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'squarespell-leads-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── intent badge component ───────────────────────────────── */

function IntentBadge({ intent }: { intent: 'high' | 'new' | 'low' | 'none' }) {
  if (intent === 'none') return null;
  var cfg = {
    high: { bg: C.ACID_SOFT, color: C.INK, label: 'High intent', icon: 'M12 2c-4 4-8 7-8 12a8 8 0 0016 0c0-5-4-8-8-12z' },
    new: { bg: C.PERIWINKLE_SOFT, color: C.ACCENT, label: 'New', icon: '' },
    low: { bg: C.GRAY_100, color: C.GRAY_600, label: 'Low score', icon: '' },
  }[intent];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, padding: '3px 9px', borderRadius: 100, background: cfg.bg, color: cfg.color }}>
      {intent === 'high' && <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d={cfg.icon} /></svg>}
      {intent === 'new' && <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6" /></svg>}
      {intent === 'low' && <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 10l5 5 5-5z" /></svg>}
      {cfg.label}
    </span>
  );
}

/* ── SVG icons ────────────────────────────────────────────── */

function SvgIcon({ d, size, color, strokeW }: { d: string; size?: number; color?: string; strokeW?: number }) {
  return <svg width={size || 14} height={size || 14} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth={strokeW || 2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

/* ── main page (2026 redesign, screen 18: "Your next customer starts here.") ── */

function sourceOf(l: Lead): string {
  var m = l.metadata || {};
  var raw = m.source || m.utm_source || m.page_url || m.source_url || m.referrer || '';
  if (!raw) return '—';
  try { return new URL(String(raw)).hostname.replace(/^www\./, ''); } catch (e) { return String(raw); }
}

var RANGES = [
  { v: 'all', l: 'All time', days: 0 },
  { v: '7', l: 'Last 7 days', days: 7 },
  { v: '30', l: 'Last 30 days', days: 30 },
  { v: '90', l: 'Last 90 days', days: 90 },
];

var PAGE_CSS = `
  .sq-leads-hero { display: grid; grid-template-columns: minmax(0, 1.4fr) 360px 360px; gap: 32px; align-items: start; margin-bottom: 36px; }
  .sq-leads-row:hover { background: ${C.GRAY_25}; }
  .sq-leads-row[aria-selected="true"] { background: ${C.PERIWINKLE_SOFT}; }
  .sq-sel { height: 44px; padding: 0 36px 0 14px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 400 15px ${C.FONT}; cursor: pointer; }
  .sq-sel:disabled { color: ${C.GRAY_400}; cursor: default; }
  @media (max-width: 1400px) { .sq-leads-hero { grid-template-columns: minmax(0, 1fr) 380px; } .sq-leads-art { display: none; } }
  @media (max-width: 960px) { .sq-leads-hero { grid-template-columns: 1fr; } }
`;

function LeadCardArt({ small }: { small?: boolean }) {
  var w = small ? 180 : 400;
  return (
    <svg width={w} height={small ? 130 : 230} viewBox="0 0 400 230" aria-hidden="true">
      <rect x="120" y="10" width="150" height="190" fill={C.PERIWINKLE} opacity={small ? 0.8 : 1} />
      <circle cx="252" cy="36" r="36" fill={C.ACID} />
      <rect x="196" y="78" width="176" height="110" rx="8" fill="#E2E7FF" />
      <rect x="186" y="68" width="176" height="110" rx="8" fill="#fff" stroke="#E2E7FF" />
      <circle cx="232" cy="112" r="26" fill={C.PERIWINKLE_SOFT} />
      <circle cx="232" cy="104" r="8" fill="none" stroke={C.INK} strokeWidth="2.2" />
      <path d="M216 126c2-8 9-12 16-12s14 4 16 12" fill="none" stroke={C.INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M272 98h60M272 112h60M272 126h44" stroke={C.GRAY_300} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M340 30l-12 22M356 44l-18 10" stroke={C.INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function LeadsPage() {
  var router = useRouter();
  var { token, status: authStatus } = useDashboardAuth();
  var [leads, setLeads] = useState<Lead[]>([]);
  var [quizzes, setQuizzes] = useState<{ id: string; title: string; status: string }[]>([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);
  var [query, setQuery] = useState('');
  var [filter, setFilter] = useState<'all' | 'high' | 'new' | 'low'>('all');
  var [quizFilter, setQuizFilter] = useState('all');
  var [sourceFilter, setSourceFilter] = useState('all');
  var [range, setRange] = useState('all');
  var [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  var [page, setPage] = useState(1);
  var [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  var [detailLead, setDetailLead] = useState<any>(null);
  var [detailLoading, setDetailLoading] = useState(false);
  var [detailTab, setDetailTab] = useState<'overview' | 'answers'>('overview');
  var PAGE_SIZE = 25;

  function fetchLeads() {
    if (!token) return;
    setLoading(true);
    setError(false);
    var auth = { headers: { Authorization: 'Bearer ' + token } };
    Promise.all([
      fetch(API + '/api/leads?limit=500', auth).then(function (res) { if (!res.ok) throw new Error('fail'); return res.json(); }),
      fetch(API + '/api/quizzes', auth).then(function (res) { return res.ok ? res.json() : []; }).catch(function () { return []; }),
    ])
      .then(function (r) {
        setLeads(Array.isArray(r[0]) ? r[0] : []);
        setQuizzes(Array.isArray(r[1]) ? r[1] : []);
        setLoading(false);
      })
      .catch(function () { setError(true); setLoading(false); });
  }

  useEffect(function () { fetchLeads(); }, [token]);

  function fetchLeadDetail(lead: Lead) {
    setSelectedLead(lead);
    setDetailTab('overview');
    setDetailLoading(true);
    setDetailLead(null);
    fetch(API + '/api/leads/' + lead.id, { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.json(); })
      .then(function (d) { setDetailLead(d); setDetailLoading(false); })
      .catch(function () { setDetailLoading(false); });
  }

  var rangeDays = (RANGES.find(function (r) { return r.v === range; }) || RANGES[0]).days;
  var cutoff = rangeDays ? new Date(Date.now() - rangeDays * 86400000).toISOString() : '';
  var sources = useMemo(function () {
    var set: string[] = [];
    leads.forEach(function (l) { var s = sourceOf(l); if (s !== '—' && set.indexOf(s) < 0) set.push(s); });
    return set;
  }, [leads]);

  var filtered = useMemo(function () {
    var q = query.trim().toLowerCase();
    var list = leads.filter(function (l) {
      if (cutoff && l.created_at < cutoff) return false;
      if (filter !== 'all' && getIntentLabel(l.score) !== filter) return false;
      if (quizFilter !== 'all' && l.quiz_id !== quizFilter) return false;
      if (sourceFilter !== 'all' && sourceOf(l) !== sourceFilter) return false;
      if (!q) return true;
      return (l.name || '').toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.quizzes?.title || '').toLowerCase().includes(q);
    });
    return list.sort(function (a, b) { return sortDir === 'desc' ? (a.created_at < b.created_at ? 1 : -1) : (a.created_at > b.created_at ? 1 : -1); });
  }, [leads, filter, query, cutoff, quizFilter, sourceFilter, sortDir]);

  var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  var safePage = Math.min(page, totalPages);
  var pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  var weekAgo = Date.now() - 7 * 86400000;
  var newThisWeek = leads.filter(function (l) { return new Date(l.created_at).getTime() >= weekAgo; }).length;
  var highIntent = leads.filter(function (l) { return getIntentLabel(l.score) === 'high'; }).length;
  var quizzesWithLeads = new Set(leads.map(function (l) { return l.quiz_id; })).size;
  var hasLive = quizzes.some(function (q) { return q.status === 'live'; });
  var empty = leads.length === 0;
  var steps = [
    { t: 'Publish a quiz', b: 'Create and publish your quiz.', done: hasLive },
    { t: 'Add it to your website', b: 'Embed it on your site or share a link.', done: !empty },
    { t: 'Capture your first lead', b: 'Start building your audience.', done: !empty },
  ];
  var doneCount = steps.filter(function (s) { return s.done; }).length;

  if (authStatus === 'loading' || loading) {
    return <DashboardShell title="Leads"><PageLoading /></DashboardShell>;
  }

  if (error) {
    return (
      <DashboardShell title="Leads">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 28, fontWeight: 500, color: C.INK, marginBottom: 8 }}>Could not load leads</div>
          <div style={{ fontSize: 15, color: C.GRAY_600, marginBottom: 20 }}>The server may be starting up. Please try again.</div>
          <PrimaryButton onClick={fetchLeads}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  var th: React.CSSProperties = { textAlign: 'left', padding: '16px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.GRAY_500, borderBottom: '1px solid ' + C.BORDER, whiteSpace: 'nowrap' };
  var td: React.CSSProperties = { padding: '12px 16px', fontSize: 15, color: C.INK, borderBottom: '1px solid ' + C.BORDER_LIGHT };

  return (
    <DashboardShell title="Leads">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* Header */}
      <div className="sq-leads-hero">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: C.ACCENT, background: C.GRAY_50, border: '1px solid ' + C.BORDER, padding: '6px 13px', borderRadius: 999, marginBottom: 16 }}><i style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }} />Leads</div>
          <DisplayTitle size="xl">Your next customer starts here.</DisplayTitle>
          <p style={{ margin: '16px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Capture leads from your quizzes and grow your audience.</p>
        </div>
        <div className="sq-leads-art" style={{ paddingTop: 10 }}><LeadCardArt /></div>
        {empty ? (
          <div style={{ borderLeft: '1px solid ' + C.BORDER, paddingLeft: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.GRAY_600, marginBottom: 18 }}>
              <span>Get started</span><span>{doneCount} of 3</span>
            </div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {steps.map(function (s, i) {
                return (
                  <li key={s.t} style={{ display: 'flex', gap: 18, position: 'relative', paddingBottom: i < 2 ? 26 : 0 }}>
                    {i < 2 && <span aria-hidden="true" style={{ position: 'absolute', left: 17, top: 38, bottom: 4, borderLeft: '1px solid ' + C.BORDER }} />}
                    <span style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid ' + (s.done ? C.ACCENT : C.BORDER), background: s.done ? C.ACCENT : '#fff', color: s.done ? '#fff' : C.ACCENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{s.done ? '✓' : i + 1}</span>
                    <div><div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>{s.t}</div><div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 2 }}>{s.b}</div></div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div style={{ borderLeft: '1px solid ' + C.BORDER, paddingLeft: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            {[
              { v: leads.length, l: 'Total leads' },
              { v: newThisWeek, l: 'New this week' },
              { v: highIntent, l: 'High intent' },
              { v: quizzesWithLeads, l: 'Quizzes with leads' },
            ].map(function (m) {
              return (
                <div key={m.l} className="stat">
                  <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 34, fontWeight: 500, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1 }}>{m.v}</div>
                  <div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 6 }}>{m.l}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 300, maxWidth: '100%' }}>
          <span style={{ position: 'absolute', left: 16, color: empty ? C.GRAY_400 : C.GRAY_600, display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input type="search" aria-label="Search leads" placeholder="Search leads..." disabled={empty} value={query} onChange={function (e) { setQuery(e.target.value); setPage(1); }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 46px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 15, fontFamily: C.FONT, color: C.INK }} />
        </label>
        <select className="sq-sel" aria-label="Filter by quiz" disabled={empty} value={quizFilter} onChange={function (e) { setQuizFilter(e.target.value); setPage(1); }}>
          <option value="all">All quizzes</option>
          {quizzes.map(function (q) { return <option key={q.id} value={q.id}>{q.title || 'Untitled'}</option>; })}
        </select>
        <select className="sq-sel" aria-label="Filter by source" disabled={empty || sources.length === 0} value={sourceFilter} onChange={function (e) { setSourceFilter(e.target.value); setPage(1); }}>
          <option value="all">All sources</option>
          {sources.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
        </select>
        <select className="sq-sel" aria-label="Date range" disabled={empty} value={range} onChange={function (e) { setRange(e.target.value); setPage(1); }}>
          {RANGES.map(function (r) { return <option key={r.v} value={r.v}>{r.l}</option>; })}
        </select>
        {!empty && (
          <div role="group" aria-label="Filter by intent" style={{ display: 'flex', gap: 6 }}>
            {(['all', 'high', 'new', 'low'] as const).map(function (k) {
              var label = { all: 'Any score', high: 'High intent', new: 'New', low: 'Low score' }[k];
              var active = filter === k;
              return <button key={k} type="button" aria-pressed={active} onClick={function () { setFilter(k); setPage(1); }} style={{ height: 36, padding: '0 12px', borderRadius: 999, border: '1px solid ' + (active ? C.ACCENT : C.BORDER), background: active ? C.ACCENT : '#fff', color: active ? '#fff' : C.INK, fontSize: 13, fontFamily: C.FONT, cursor: 'pointer' }}>{label}</button>;
            })}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 16, color: C.INK }}>{filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}</span>
          {!empty && (
            <button type="button" onClick={function () { downloadCsv(filtered); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 14, fontFamily: C.FONT, cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></svg>
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedLead ? 'minmax(0,1fr) 380px' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 48 }}><span className="sq-sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Lead</span></th>
                <th style={th}>Name</th><th style={th}>Quiz</th><th style={th}>Score</th><th style={th}>Source</th>
                <th style={th} aria-sort={sortDir === 'desc' ? 'descending' : 'ascending'}>
                  <button type="button" onClick={function () { setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0, border: 'none', background: 'none', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    Added <span aria-hidden="true" style={{ fontSize: 14 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(function (l) {
                var intent = getIntentLabel(l.score);
                return (
                  <tr key={l.id} className="sq-leads-row" aria-selected={selectedLead?.id === l.id} onClick={function () { fetchLeadDetail(l); }} style={{ cursor: 'pointer' }}>
                    <td style={td}><span style={{ width: 34, height: 34, borderRadius: '50%', background: C.PERIWINKLE_SOFT, color: C.BRAND_700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{getInitials(l.name, l.email)}</span></td>
                    <td style={td}>
                      <button type="button" onClick={function (e) { e.stopPropagation(); fetchLeadDetail(l); }} style={{ padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                        <span style={{ display: 'block', fontWeight: 500 }}>{l.name || l.email.split('@')[0]}</span>
                        <span style={{ display: 'block', fontSize: 13, color: C.GRAY_500 }}>{l.email}</span>
                      </button>
                    </td>
                    <td style={{ ...td, color: C.GRAY_700, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.quizzes?.title || '—'}</td>
                    <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontVariantNumeric: 'tabular-nums' }}>{l.score ?? '—'}</span><IntentBadge intent={intent} /></div></td>
                    <td style={{ ...td, color: C.GRAY_600 }}>{sourceOf(l)}</td>
                    <td style={{ ...td, color: C.GRAY_600, whiteSpace: 'nowrap' }}>{timeAgo(l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {empty ? (
            <div style={{ padding: '44px 20px 52px', textAlign: 'center' }}>
              <LeadCardArt small />
              <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 28, fontWeight: 500, letterSpacing: '-0.025em', color: C.INK, margin: '10px 0 6px' }}>Ready for your first lead?</div>
              <p style={{ margin: '0 0 22px', fontSize: 16, color: C.GRAY_600 }}>Publish a quiz and share it to start building your audience.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <PrimaryButton size="lg" href="/dashboard/embed">Get the embed code</PrimaryButton>
                <a href="/dashboard/quizzes" style={{ display: 'inline-flex', alignItems: 'center', height: 52, padding: '0 26px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 16, fontWeight: 500, textDecoration: 'none' }}>View quizzes</a>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.GRAY_500, fontSize: 15 }}>No leads match your filters.</div>
          ) : null}
        </div>

        {/* ═══ DETAIL PANEL ═══ */}
        {selectedLead && (
          <div style={{ borderLeft: '1px solid ' + C.BORDER, background: C.SURFACE, overflow: 'auto', maxHeight: 'calc(100vh - 140px)', position: 'sticky', top: 20, borderRadius: 8, border: '1px solid ' + C.BORDER }}>
            {/* header */}
            <div style={{ padding: 20, display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.PERIWINKLE_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: C.BRAND_700, flexShrink: 0 }}>{getInitials(selectedLead.name, selectedLead.email)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, marginBottom: 2 }}>{selectedLead.name || selectedLead.email.split('@')[0]}</div>
                <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginBottom: 8 }}>{selectedLead.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.ACCENT }}>{selectedLead.score != null ? selectedLead.score + '/100' : '—'}</span>
                  <IntentBadge intent={getIntentLabel(selectedLead.score)} />
                </div>
              </div>
              <button onClick={function () { setSelectedLead(null); setDetailLead(null); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: C.TEXT_MUTED, fontSize: 18, cursor: 'pointer', fontFamily: C.FONT }}>✕</button>
            </div>

            {/* tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid ' + C.BORDER, padding: '0 20px' }}>
              {(['overview', 'answers'] as const).map(function (tab) {
                var active = detailTab === tab;
                return (
                  <button key={tab} onClick={function () { setDetailTab(tab); }} style={{ padding: '10px 16px', fontSize: 13, fontWeight: active ? 600 : 500, color: active ? C.ACCENT : C.TEXT_MUTED, cursor: 'pointer', borderBottom: active ? '2px solid ' + C.ACCENT : '2px solid transparent', marginBottom: -1, background: 'none', border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid', borderBottomColor: active ? C.ACCENT : 'transparent', fontFamily: C.FONT, textTransform: 'capitalize' }}>
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* body */}
            <div style={{ padding: 20 }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.TEXT_MUTED, fontSize: 13 }}>Loading...</div>
              ) : detailTab === 'overview' ? (
                <>
                  {/* lead details */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid ' + C.BORDER_LIGHT, color: C.TEXT }}>Lead details</div>
                    {[
                      { icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18', label: 'Captured on', val: formatFullDate(selectedLead.created_at) },
                      { icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6', label: 'Quiz completed', val: selectedLead.quizzes?.title || 'Unknown' },
                      { icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6', label: 'Email', val: selectedLead.email },
                      { icon: 'M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8zM12 13a3 3 0 100-6 3 3 0 000 6z', label: 'Source', val: sourceOf(selectedLead) },
                    ].map(function (row) {
                      return (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 12 }}>
                          <span style={{ color: C.TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={row.icon} /></svg>
                            {row.label}
                          </span>
                          <span style={{ color: row.label === 'Email' ? C.ACCENT : C.TEXT, fontWeight: 500, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>{row.val}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* score summary */}
                  {selectedLead.score != null && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid ' + C.BORDER_LIGHT, color: C.TEXT }}>Score summary</div>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                        {/* ring */}
                        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="40" cy="40" r="34" stroke={C.BORDER} strokeWidth="6" fill="none" />
                            <circle cx="40" cy="40" r="34" stroke={C.ACCENT} strokeWidth="6" fill="none" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - (selectedLead.score || 0) / 100)} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: C.ACCENT, lineHeight: 1 }}>{selectedLead.score}</div>
                            <div style={{ fontSize: 10, color: C.TEXT_MUTED }}>/100</div>
                          </div>
                        </div>
                        {/* stats */}
                        <div style={{ flex: 1, fontSize: 12 }}>
                          {[
                            { label: 'Questions answered', val: detailLead?.quizzes?.questions ? Object.keys(detailLead?.answers || {}).length + ' / ' + detailLead.quizzes.questions.length : '—' },
                            { label: 'Points earned', val: selectedLead.score },
                            { label: 'Completion time', val: detailLead?.metadata?.time_to_complete_ms ? Math.round(detailLead.metadata.time_to_complete_ms / 1000) + 's' : '—' },
                          ].map(function (s) {
                            return (
                              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                                <span style={{ color: C.TEXT_MUTED }}>{s.label}</span>
                                <span style={{ fontWeight: 600, color: C.TEXT }}>{s.val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* actions */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid ' + C.BORDER_LIGHT, color: C.TEXT }}>Actions</div>
                    <a href={'mailto:' + selectedLead.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 6, border: '1px solid ' + C.BORDER, background: C.SURFACE, fontSize: 14, color: C.INK, textDecoration: 'none' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                      Email this lead
                    </a>
                  </div>
                </>
              ) : (
                /* ═══ ANSWERS TAB ═══ */
                <div>
                  {detailLead?.quizzes?.questions && detailLead.answers && Object.keys(detailLead.answers).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {Object.entries(detailLead.answers).map(function ([qIdx, aIdx]) {
                        var qIndex = Number(qIdx);
                        var question = detailLead.quizzes?.questions?.[qIndex];
                        var selectedOption = question?.options?.[Number(aIdx)];
                        if (!question || !selectedOption) return null;
                        return (
                          <div key={qIdx}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.TEXT_MUTED, marginBottom: 6 }}>Q{qIndex + 1}: {question.text}</div>
                            <div style={{ fontSize: 13, color: C.TEXT, padding: '10px 12px', background: C.ACCENT_LIGHT, borderLeft: '3px solid ' + C.ACCENT, borderRadius: 4 }}>{selectedOption.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13 }}>No answer data available.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, gap: 12 }}>
        <span style={{ fontSize: 15, color: C.GRAY_600 }}>Showing {pageRows.length} of {filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}</span>
        <nav aria-label="Pagination" style={{ display: 'flex', gap: 8 }}>
          <button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={function () { setPage(safePage - 1); }} style={{ width: 38, height: 38, borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: safePage <= 1 ? C.GRAY_300 : C.INK, cursor: safePage <= 1 ? 'default' : 'pointer' }}>←</button>
          <span style={{ width: 38, height: 38, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: empty ? C.GRAY_100 : C.ACCENT, color: empty ? C.GRAY_500 : '#fff', fontSize: 14 }} aria-current="page">{safePage}</span>
          <button type="button" aria-label="Next page" disabled={safePage >= totalPages} onClick={function () { setPage(safePage + 1); }} style={{ width: 38, height: 38, borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: safePage >= totalPages ? C.GRAY_300 : C.INK, cursor: safePage >= totalPages ? 'default' : 'pointer' }}>→</button>
        </nav>
      </div>
    </DashboardShell>
  );
}
