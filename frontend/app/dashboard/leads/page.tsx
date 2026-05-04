'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageLoading, PrimaryButton, EmptyState } from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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

var AVATAR_COLORS = ['#0D7377', '#059669', '#2563EB', '#D85A30', '#7F56D9', '#D97706', '#DC2626', '#0B6165'];
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
    high: { bg: 'rgba(220,38,38,.08)', color: '#DC2626', label: 'High intent', icon: 'M12 2c-4 4-8 7-8 12a8 8 0 0016 0c0-5-4-8-8-12z' },
    new: { bg: 'rgba(37,99,235,.08)', color: '#2563EB', label: 'New', icon: '' },
    low: { bg: 'rgba(217,119,6,.08)', color: '#D97706', label: 'Low score', icon: '' },
  }[intent];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: cfg.bg, color: cfg.color }}>
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

/* ── main page ────────────────────────────────────────────── */

export default function LeadsPage() {
  var router = useRouter();
  var { token, status: authStatus } = useDashboardAuth();
  var [leads, setLeads] = useState<Lead[]>([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);
  var [query, setQuery] = useState('');
  var [filter, setFilter] = useState<'all' | 'high' | 'new' | 'low'>('all');
  var [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  var [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  var [detailLead, setDetailLead] = useState<any>(null);
  var [detailLoading, setDetailLoading] = useState(false);
  var [detailTab, setDetailTab] = useState<'overview' | 'answers'>('overview');
  var [dateRange] = useState('30');

  function fetchLeads() {
    if (!token) return;
    setLoading(true);
    setError(false);
    fetch(API + '/api/leads?limit=500', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('fail');
        return res.json();
      })
      .then(function (data: Lead[]) {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(function () {
        setError(true);
        setLoading(false);
      });
  }

  useEffect(function () { fetchLeads(); }, [token]);

  function fetchLeadDetail(lead: Lead) {
    setSelectedLead(lead);
    setDetailTab('overview');
    setDetailLoading(true);
    setDetailLead(null);
    fetch(API + '/api/leads/' + lead.id, {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { setDetailLead(d); setDetailLoading(false); })
      .catch(function () { setDetailLoading(false); });
  }

  /* filtered leads */
  var rangeMs = parseInt(dateRange) * 86400000;
  var cutoff = new Date(Date.now() - rangeMs).toISOString();

  var filtered = useMemo(function () {
    var q = query.trim().toLowerCase();
    return leads.filter(function (l) {
      if (l.created_at < cutoff) return false;
      if (filter !== 'all' && getIntentLabel(l.score) !== filter) return false;
      if (!q) return true;
      return (l.name || '').toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.quizzes?.title || '').toLowerCase().includes(q);
    });
  }, [leads, filter, query, cutoff]);

  /* stats */
  var totalLeads = filtered.length;
  var highIntent = filtered.filter(function (l) { return getIntentLabel(l.score) === 'high'; }).length;
  var newLeads = filtered.filter(function (l) { return getIntentLabel(l.score) === 'new'; }).length;
  /* Count ALL unique quizzes across all leads (not just filtered) */
  var allQuizIds = new Set(leads.map(function (l) { return l.quiz_id; }));
  var totalQuizzes = allQuizIds.size || leads.length > 0 ? allQuizIds.size : 0;

  /* loading / error states */
  if (authStatus === 'loading' || loading) {
    return <DashboardShell title="Leads"><PageLoading /></DashboardShell>;
  }

  if (error) {
    return (
      <DashboardShell title="Leads">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.TEXT, marginBottom: 6 }}>Could not load leads</div>
          <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 18 }}>The server may be starting up. Please try again.</div>
          <PrimaryButton onClick={fetchLeads}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  if (leads.length === 0) {
    return (
      <DashboardShell title="Leads">
        <EmptyState
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>}
          title="No leads yet"
          body="As soon as someone completes one of your quizzes, they'll show up here."
          action={<PrimaryButton href="/dashboard/embed">Get the embed code</PrimaryButton>}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Leads"
      topbarRight={
        <button onClick={function () { downloadCsv(filtered); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid ' + C.BORDER, background: C.SURFACE, color: C.TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.FONT }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          Export CSV
        </button>
      }
    >
      <div style={{ display: selectedLead ? 'grid' : 'block', gridTemplateColumns: selectedLead ? '1fr 360px' : '1fr', gap: 0, minHeight: 'calc(100vh - 120px)' }}>
        {/* ═══ MAIN AREA ═══ */}
        <div style={{ padding: 0 }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.03em', color: C.TEXT, margin: '0 0 4px' }}>Leads</h1>
              <p style={{ fontSize: 13, color: C.TEXT_MUTED, margin: 0 }}>Track and manage people who completed your quizzes</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid ' + C.BORDER, borderRadius: 8, background: C.SURFACE, fontSize: 12, color: C.TEXT_SECONDARY, cursor: 'default' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              This 30 days
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Leads', val: totalLeads, change: totalLeads > 0 ? '↑ ' + totalLeads + ' total' : '— No data yet', up: totalLeads > 0, iconBg: 'rgba(13,115,119,.08)', iconColor: C.ACCENT, iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
              { label: 'New This Week', val: leads.filter(function (l) { var d = new Date(l.created_at); var week = new Date(); week.setDate(week.getDate() - 7); return d >= week; }).length, change: leads.length > 0 ? 'of ' + leads.length + ' total' : '— No data yet', up: leads.filter(function (l) { var d = new Date(l.created_at); var week = new Date(); week.setDate(week.getDate() - 7); return d >= week; }).length > 0, iconBg: 'rgba(5,150,105,.08)', iconColor: '#059669', iconPath: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6' },
              { label: 'Quizzes with Leads', val: totalQuizzes, change: totalQuizzes > 0 ? totalQuizzes + ' active' : '— No data yet', up: false, iconBg: 'rgba(37,99,235,.08)', iconColor: '#2563EB', iconPath: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6' },
              { label: 'High Intent Leads', val: highIntent, change: highIntent > 0 ? '↑ ' + highIntent + ' high intent' : '— No change', up: highIntent > 0, iconBg: 'rgba(220,38,38,.08)', iconColor: '#DC2626', iconPath: 'M12 2c-4 4-8 7-8 12a8 8 0 0016 0c0-5-4-8-8-12z' },
            ].map(function (s) {
              return (
                <div key={s.label} style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: C.TEXT_MUTED, marginBottom: 6 }}>
                    {s.label}
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={s.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.iconPath} /></svg>
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', color: C.TEXT }}>{s.val}</div>
                  <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: s.up ? '#059669' : C.TEXT_MUTED }}>{s.change}</div>
                </div>
              );
            })}
          </div>

          {/* filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {([
              { key: 'all' as const, label: 'All', cnt: totalLeads },
              { key: 'high' as const, label: 'High intent', cnt: highIntent },
              { key: 'new' as const, label: 'New', cnt: newLeads },
              { key: 'low' as const, label: 'Low score', cnt: filtered.filter(function (l) { return getIntentLabel(l.score) === 'low'; }).length },
            ]).map(function (f) {
              var active = filter === f.key;
              return (
                <button key={f.key} onClick={function () { setFilter(f.key); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: active ? '1px solid ' + C.ACCENT : '1px solid ' + C.BORDER, background: active ? C.ACCENT : C.SURFACE, color: active ? '#fff' : C.TEXT_SECONDARY, fontFamily: C.FONT }}>
                  {f.label} <span style={{ fontWeight: 400, opacity: 0.7 }}>{f.cnt}</span>
                </button>
              );
            })}
          </div>

          {/* sort + view toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
              Sort by: Newest <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            <div style={{ display: 'flex', border: '1px solid ' + C.BORDER, borderRadius: 6, overflow: 'hidden' }}>
              <button onClick={function () { setViewMode('grid'); }} style={{ padding: '5px 8px', border: 'none', background: viewMode === 'grid' ? C.ACCENT : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={viewMode === 'grid' ? '#fff' : C.TEXT_MUTED} stroke="none"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
              </button>
              <button onClick={function () { setViewMode('list'); }} style={{ padding: '5px 8px', border: 'none', background: viewMode === 'list' ? C.ACCENT : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'list' ? '#fff' : C.TEXT_MUTED} strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
            </div>
          </div>

          {/* ═══ LEAD GRID ═══ */}
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: selectedLead ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 }}>
              {filtered.map(function (l) {
                var intent = getIntentLabel(l.score);
                var isSelected = selectedLead?.id === l.id;
                return (
                  <div key={l.id} onClick={function () { fetchLeadDetail(l); }} style={{ background: C.SURFACE, border: isSelected ? '1.5px solid ' + C.ACCENT : '1px solid ' + C.BORDER, borderRadius: 10, padding: 14, cursor: 'pointer', position: 'relative', boxShadow: isSelected ? '0 0 0 1px ' + C.ACCENT : 'none', transition: 'border-color .15s' }}>
                    <div style={{ position: 'absolute', top: 12, right: 12, color: C.TEXT_MUTED, fontSize: 16, letterSpacing: 1 }}>···</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(l.email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{getInitials(l.name, l.email)}</div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name || l.email.split('@')[0]}</div>
                        <div style={{ fontSize: 11, color: C.TEXT_MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: C.TEXT_SUBTLE, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Quiz</div>
                    <div style={{ fontSize: 12, color: C.TEXT_SECONDARY, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.quizzes?.title || 'Unknown'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.02em', color: C.TEXT }}>{l.score != null ? l.score + ' /100' : '—'}</div>
                      <IntentBadge intent={intent} />
                    </div>
                    <div style={{ fontSize: 10, color: C.TEXT_SUBTLE, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      {timeAgo(l.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ═══ LIST VIEW ═══ */
            <div style={{ background: C.SURFACE, border: '1px solid ' + C.BORDER, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.GRAY_50 }}>
                    {['Name', 'Email', 'Quiz', 'Score', 'Captured'].map(function (h) {
                      return <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: C.TEXT_MUTED, borderBottom: '1px solid ' + C.BORDER }}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(function (l) {
                    var intent = getIntentLabel(l.score);
                    return (
                      <tr key={l.id} onClick={function () { fetchLeadDetail(l); }} style={{ borderBottom: '1px solid ' + C.BORDER, cursor: 'pointer' }} onMouseEnter={function (e) { e.currentTarget.style.background = C.GRAY_50; }} onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: C.TEXT }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(l.email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{getInitials(l.name, l.email)}</div>
                            {l.name || l.email.split('@')[0]}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: C.TEXT_SECONDARY }}>{l.email}</td>
                        <td style={{ padding: '12px 16px', color: C.TEXT_MUTED, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.quizzes?.title || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700 }}>{l.score ?? '—'}</span>
                            <IntentBadge intent={intent} />
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: C.TEXT_MUTED }}>{timeAgo(l.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: C.TEXT_MUTED, fontSize: 14 }}>No leads match your filters.</div>}
            </div>
          )}
        </div>

        {/* ═══ DETAIL PANEL ═══ */}
        {selectedLead && (
          <div style={{ borderLeft: '1px solid ' + C.BORDER, background: C.SURFACE, overflow: 'auto', maxHeight: 'calc(100vh - 80px)', position: 'sticky', top: 0 }}>
            {/* header */}
            <div style={{ padding: 20, display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarColor(selectedLead.email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{getInitials(selectedLead.name, selectedLead.email)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.TEXT, marginBottom: 2 }}>{selectedLead.name || selectedLead.email.split('@')[0]}</div>
                <div style={{ fontSize: 12, color: C.TEXT_MUTED, marginBottom: 8 }}>{selectedLead.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.ACCENT }}>{selectedLead.score != null ? selectedLead.score + ' /100' : '—'}</span>
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
                      { icon: 'M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8zM12 13a3 3 0 100-6 3 3 0 000 6z', label: 'Source', val: 'Quiz Embed' },
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 6px', borderRadius: 8, border: '1px solid ' + C.BORDER, background: C.SURFACE, fontSize: 11, color: C.TEXT_SECONDARY, cursor: 'pointer', fontFamily: C.FONT }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        Send email
                      </button>
                      <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 6px', borderRadius: 8, border: '1px solid rgba(220,38,38,.2)', background: C.SURFACE, fontSize: 11, color: '#DC2626', cursor: 'pointer', fontFamily: C.FONT }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        Delete lead
                      </button>
                    </div>
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
    </DashboardShell>
  );
}
