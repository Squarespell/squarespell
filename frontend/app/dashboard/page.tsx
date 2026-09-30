'use client';

/**
 * /dashboard - Overview (2026 cobalt-and-ivory redesign, screen 09)
 *
 * Sections:
 *  1. Editorial welcome header with Create quiz and a template shortcut
 *  2. KPI strip (views, completions, leads, completion rate) with the date range selector
 *  3. Quiz performance chart (views + leads) beside the top quizzes list
 *  4. Recent leads table with quiz/source filters
 *  5. Conversion funnel, lead sources and question drop-off
 *  6. Recent activity (only when there is any) and the A/B testing prompt
 *
 * All values are fetched from APIs - NO hardcoded fake data.
 * Data binding pattern: state variables populated via useEffect fetch calls.
 */

import { useEffect, useRef, useState, Suspense, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from './_components/DashboardShell';
import { useDashboardAuth } from './_components/useDashboardAuth';
import { PageLoading, DisplayTitle, Pill } from './_components/PageShell';
import { QuizCover } from './_components/QuizCover';
import { NewQuizModal } from './quizzes/_components/NewQuizModal';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

// ═══════ TYPES ═══════

type Quiz = {
  id: string;
  title: string;
  status: 'live' | 'draft';
  slug: string;
  lead_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

type UserPlan = {
  plan: string;
  quiz_count: number;
  limits: Record<string, number>;
  trial_ends_at: string | null;
  email: string;
};

type DashboardAnalytics = {
  total_views: number;
  total_leads: number;
  completion_rate: number;
  lead_rate: number;
  active_quizzes: number;
  quiz_limit: number;
  views_change: number;
  leads_change: number;
  completion_change: number;
  lead_rate_change: number;
  compare_label: string;
};

type Lead = {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  quiz_id: string;
  score: number | null;
  source: string | null;
  status: string | null;
  quizzes?: { id: string; title: string; slug: string } | null;
};

type FunnelData = {
  views: number;
  started: number;
  completed: number;
  leads: number;
};

type LeadSource = {
  name: string;
  count: number;
  percentage: number;
  color: string;
};

type DropoffQuestion = {
  question: string;
  dropoff_rate: number;
  completion_rate: number;
};

type ActivityItem = {
  id: string;
  type: 'lead' | 'quiz' | 'integration' | 'ab_test' | 'export';
  title: string;
  description: string;
  time: string;
};

type ChartPoint = {
  label: string;
  views: number;
  leads: number;
};

// ═══════ HELPERS ═══════

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatRelative(dateStr: string): string {
  var d = new Date(dateStr);
  var now = new Date();
  var diffMs = now.getTime() - d.getTime();
  var mins = Math.floor(diffMs / 60000);
  var hrs = Math.floor(diffMs / 3600000);
  var days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hrs < 24) return hrs + 'h ago';
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsFrom(name: string | null, email: string): string {
  var source = name || email || '';
  var parts = source.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'SQ';
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=;path=/;max-age=0';
}

var SOURCE_COLORS = ['#3154FF', '#8FA2FF', '#BFCAFF', '#0B1233', '#8B93B5'];

var DASH_CSS = `
  .sq-dash-hero { display: grid; grid-template-columns: minmax(0, 1fr) 440px; gap: 32px; align-items: start; margin-bottom: 32px; }
  .sq-dash-main { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(320px, 1fr); gap: 20px; margin-bottom: 20px; }
  .sq-dash-trio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
  .sq-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) auto; background: #fff; border: 1px solid ${C.BORDER}; border-radius: 8px; margin-bottom: 20px; }
  .sq-kpi { display: flex; align-items: center; gap: 16px; padding: 22px 24px; border-right: 1px solid ${C.BORDER}; min-width: 0; }
  .sq-link-arrow { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; color: ${C.ACCENT}; text-decoration: none; }
  .sq-link-arrow:hover { color: ${C.ACCENT_HOVER}; }
  .sq-tip:hover { border-color: ${C.GRAY_300}; }
  .sq-topq:hover .sq-topq-title { color: ${C.ACCENT}; }
  @media (max-width: 1180px) {
    .sq-dash-hero { grid-template-columns: 1fr; }
    .sq-dash-main { grid-template-columns: 1fr; }
    .sq-dash-trio { grid-template-columns: 1fr 1fr; }
    .sq-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sq-kpi:nth-child(2n) { border-right: none; }
    .sq-kpi { border-bottom: 1px solid ${C.BORDER}; }
    .sq-kpis-range { grid-column: 1 / -1; }
  }
  @media (max-width: 720px) { .sq-dash-trio { grid-template-columns: 1fr; } .sq-kpis { grid-template-columns: 1fr; } .sq-kpi { border-right: none; } }
`;

/* Text links carry no arrow, matching the landing page. */
var ARROW = null;

/** Hairline white panel with an optional header row. */
function Panel({ title, subtitle, action, children, bodyPad = '4px 24px 24px' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; bodyPad?: string }) {
  return (
    <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '22px 24px 14px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 21, fontWeight: 500, letterSpacing: '-0.02em', color: C.INK }}>{title}</h2>
          {subtitle && <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding: bodyPad }}>{children}</div>
    </section>
  );
}

function KpiIcon({ children }: { children: ReactNode }) {
  return (
    <span style={{ width: 52, height: 52, borderRadius: '50%', background: C.PERIWINKLE_SOFT, color: C.ACCENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </span>
  );
}

function RateRing({ pct }: { pct: number }) {
  var r = 22;
  var circ = 2 * Math.PI * r;
  var clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="26" cy="26" r={r} fill="none" stroke={C.GRAY_100} strokeWidth="5" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={C.ACCENT} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={(clamped / 100) * circ + ' ' + circ} transform="rotate(-90 26 26)" />
    </svg>
  );
}

function Kpi({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="sq-kpi">
      {icon}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 30, fontWeight: 500, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 15, color: C.GRAY_600, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

var RANGE_OPTIONS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 0, label: 'All time' },
];

function RangeSelect({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 14, color: C.INK, display: 'flex', pointerEvents: 'none' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      </span>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Date range</span>
      <select
        value={value}
        onChange={function(e) { onChange(parseInt(e.target.value, 10)); }}
        style={{ appearance: 'none', WebkitAppearance: 'none', height: 44, padding: '0 40px 0 42px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 15, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer' }}
      >
        {RANGE_OPTIONS.map(function(o) { return <option key={o.days} value={o.days}>{o.label}</option>; })}
      </select>
      <span style={{ position: 'absolute', right: 14, pointerEvents: 'none', display: 'flex', color: C.INK }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </span>
    </label>
  );
}

// ═══════ PERFORMANCE CHART ═══════

function PerformanceChart({ data, period, onPeriodChange }: { data: ChartPoint[]; period: string; onPeriodChange: (p: string) => void }) {
  var periodToggle = (
    <div role="group" aria-label="Chart range" style={{ display: 'flex', gap: 2, background: C.GRAY_100, borderRadius: 6, padding: 2, flexShrink: 0 }}>
      {[{ v: 'daily', l: '7 days' }, { v: 'weekly', l: '30 days' }, { v: 'monthly', l: '90 days' }].map(function(p) {
        var isActive = period === p.v;
        return (
          <button
            key={p.v}
            type="button"
            aria-pressed={isActive}
            onClick={function() { onPeriodChange(p.v); }}
            style={{ padding: '6px 12px', borderRadius: 5, fontSize: 13, fontWeight: 500, color: isActive ? C.ACCENT : C.GRAY_500, background: isActive ? '#fff' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: C.FONT, boxShadow: isActive ? C.SHADOW_SM : 'none' }}
          >
            {p.l}
          </button>
        );
      })}
    </div>
  );

  var legend = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 14, color: C.GRAY_600 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: C.ACCENT }} />Views</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: C.BRAND_300 }} />Leads</span>
    </div>
  );

  var hasData = data.some(function(d) { return d.views > 0 || d.leads > 0; });

  var chartW = 820;
  var chartH = 250;
  var padL = 36;
  var padR = 12;
  var usableW = chartW - padL - padR;
  var maxVal = 1;
  data.forEach(function(d) { maxVal = Math.max(maxVal, d.views, d.leads); });
  // Round the axis up to a friendly number so gridlines read cleanly.
  var rawStep = maxVal / 4;
  var mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1))));
  var step = [1, 2, 5, 10].map(function(m) { return m * mag; }).filter(function(v) { return v >= rawStep; })[0] || 10 * mag;
  var top = step * 4;
  function yPos(val: number) { return chartH - 24 - (val / top) * (chartH - 44); }
  var stepX = data.length > 1 ? usableW / (data.length - 1) : 0;
  function pts(key: 'views' | 'leads') {
    return data.map(function(d, i) { return { x: padL + i * stepX, y: yPos(d[key]) }; });
  }
  function lineD(p: { x: number; y: number }[]) {
    return p.map(function(pt, i) { return (i === 0 ? 'M' : 'L') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1); }).join(' ');
  }
  var viewsP = pts('views');
  var leadsP = pts('leads');
  var baseY = yPos(0);
  var areaD = viewsP.length ? lineD(viewsP) + ' L' + viewsP[viewsP.length - 1].x + ' ' + baseY + ' L' + viewsP[0].x + ' ' + baseY + ' Z' : '';
  var labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <Panel
      title="Quiz performance"
      subtitle="Views and leads over time"
      action={<div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{legend}{periodToggle}</div>}
    >
      {!hasData ? (
        <div style={{ position: 'relative', height: 250 }}>
          <svg viewBox={'0 0 ' + chartW + ' ' + chartH} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
            {[0, 1, 2, 3, 4].map(function(i) {
              var y = 20 + i * ((chartH - 44) / 4);
              return <line key={i} x1={padL} x2={chartW - padR} y1={y} y2={y} stroke={C.GRAY_100} />;
            })}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>No activity in this period</div>
            <div style={{ fontSize: 14, color: C.GRAY_500 }}>Views and leads appear here once people take your live quizzes.</div>
          </div>
        </div>
      ) : (
        <svg viewBox={'0 0 ' + chartW + ' ' + (chartH + 4)} width="100%" style={{ display: 'block' }} role="img" aria-label="Views and leads over time">
          <defs>
            <linearGradient id="sqViewsGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.ACCENT} stopOpacity="0.16" />
              <stop offset="100%" stopColor={C.ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map(function(i) {
            var v = step * i;
            var y = yPos(v);
            return (
              <g key={i}>
                <line x1={padL} x2={chartW - padR} y1={y} y2={y} stroke={C.GRAY_100} />
                <text x={padL - 10} y={y + 4} fontSize="11" fill={C.GRAY_500} textAnchor="end" fontFamily="Inter">{v}</text>
              </g>
            );
          })}
          {data.map(function(d, i) {
            var last = data.length - 1;
            if (i !== last && (i % labelEvery !== 0 || last - i < labelEvery * 0.6)) return null;
            var x = padL + i * stepX;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={20} y2={baseY} stroke={C.GRAY_100} strokeDasharray="3 4" />
                <text x={x} y={chartH} fontSize="11" fill={C.GRAY_500} textAnchor="middle" fontFamily="Inter">{d.label}</text>
              </g>
            );
          })}
          <path d={areaD} fill="url(#sqViewsGrad)" />
          <path d={lineD(leadsP)} fill="none" stroke={C.BRAND_300} strokeWidth="2" strokeLinejoin="round" />
          <path d={lineD(viewsP)} fill="none" stroke={C.ACCENT} strokeWidth="2.25" strokeLinejoin="round" />
          {viewsP.length > 0 && <circle cx={viewsP[viewsP.length - 1].x} cy={viewsP[viewsP.length - 1].y} r="4.5" fill={C.ACCENT} stroke="#fff" strokeWidth="2" />}
          {leadsP.length > 0 && <circle cx={leadsP[leadsP.length - 1].x} cy={leadsP[leadsP.length - 1].y} r="4" fill={C.BRAND_300} stroke="#fff" strokeWidth="2" />}
        </svg>
      )}
    </Panel>
  );
}

// ═══════ TOP QUIZZES ═══════

function TopQuizzesList({ quizzes }: { quizzes: Quiz[] }) {
  var sorted = quizzes.slice().sort(function(a, b) { return (b.view_count || 0) - (a.view_count || 0); }).slice(0, 4);
  var order: Record<string, number> = {};
  quizzes.slice().sort(function(a, b) { return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); }).forEach(function(q, i) { order[q.id] = i; });
  return (
    <Panel title="Top quizzes" action={<Link href="/dashboard/quizzes" className="sq-link-arrow">View all {ARROW}</Link>} bodyPad="0 24px 12px">
      {sorted.length === 0 ? (
        <div style={{ padding: '24px 0 16px', fontSize: 14, color: C.GRAY_500 }}>Your quizzes will be ranked here by views.</div>
      ) : sorted.map(function(q, i) {
        return (
          <Link key={q.id} href={'/dashboard/' + q.id} className="sq-topq" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid ' + C.BORDER_LIGHT, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 132, height: 60, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
              <QuizCover id={q.id} title={q.title} height={60} compact variant={order[q.id]} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sq-topq-title" style={{ fontSize: 15, fontWeight: 500, color: C.INK, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.title || 'Untitled quiz'}</div>
              <div style={{ fontSize: 13, color: C.GRAY_500, marginTop: 4 }}>
                {formatNumber(q.view_count || 0)} {q.view_count === 1 ? 'view' : 'views'}
                <span style={{ margin: '0 6px', color: C.GRAY_300 }}>·</span>
                {formatNumber(q.lead_count || 0)} {q.lead_count === 1 ? 'lead' : 'leads'}
              </div>
            </div>
            <Pill variant={q.status === 'live' ? 'live' : 'draft'}>{q.status === 'live' ? 'Live' : 'Draft'}</Pill>
          </Link>
        );
      })}
    </Panel>
  );
}

// ═══════ RECENT LEADS ═══════

function RecentLeadsTable({ leads, quizzes }: { leads: Lead[]; quizzes: Quiz[] }) {
  var [leadQuizFilter, setLeadQuizFilter] = useState('all');
  var [leadSourceFilter, setLeadSourceFilter] = useState('all');

  var quizMap: Record<string, string> = {};
  quizzes.forEach(function(q) { quizMap[q.id] = q.title; });
  var uniqueSources: string[] = [];
  leads.forEach(function(l) { var s = l.source || 'Direct'; if (uniqueSources.indexOf(s) < 0) uniqueSources.push(s); });

  var rows = leads.filter(function(lead) {
    if (leadQuizFilter !== 'all' && lead.quiz_id !== leadQuizFilter) return false;
    if (leadSourceFilter !== 'all' && (lead.source || 'Direct') !== leadSourceFilter) return false;
    return true;
  }).slice(0, 5);

  var selectStyle: React.CSSProperties = { height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 13, fontFamily: C.FONT, maxWidth: 220, cursor: 'pointer' };
  var th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.GRAY_500, borderBottom: '1px solid ' + C.BORDER };
  var td: React.CSSProperties = { padding: '14px 12px', fontSize: 15, color: C.INK, borderBottom: '1px solid ' + C.BORDER_LIGHT, verticalAlign: 'middle' };

  return (
    <div style={{ marginBottom: 20 }}>
      <Panel
        title="Recent leads"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {leads.length > 0 && (
              <>
                <select aria-label="Filter by quiz" value={leadQuizFilter} onChange={function(e) { setLeadQuizFilter(e.target.value); }} style={selectStyle}>
                  <option value="all">All quizzes</option>
                  {quizzes.map(function(q) { return <option key={q.id} value={q.id}>{q.title || 'Untitled'}</option>; })}
                </select>
                <select aria-label="Filter by source" value={leadSourceFilter} onChange={function(e) { setLeadSourceFilter(e.target.value); }} style={selectStyle}>
                  <option value="all">All sources</option>
                  {uniqueSources.map(function(s) { return <option key={s} value={s}>{s}</option>; })}
                </select>
              </>
            )}
            <Link href="/dashboard/leads" className="sq-link-arrow">View all {ARROW}</Link>
          </div>
        }
        bodyPad="0 12px 8px"
      >
        {leads.length === 0 ? (
          <div style={{ padding: '18px 12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.INK }}>No leads yet</div>
              <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 2 }}>Publish a quiz and add it to your website to start capturing leads.</div>
            </div>
            <Link href="/dashboard/embed" className="sq-link-arrow">Get embed code {ARROW}</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.FONT, minWidth: 720 }}>
              <thead>
                <tr><th style={th}>Name</th><th style={th}>Quiz</th><th style={th}>Email</th><th style={th}>Score</th><th style={th}>Source</th><th style={th}>Date</th></tr>
              </thead>
              <tbody>
                {rows.map(function(lead) {
                  var submitted = new Date(lead.created_at);
                  return (
                    <tr key={lead.id}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 36, height: 36, borderRadius: '50%', background: C.PERIWINKLE_SOFT, color: C.BRAND_700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{initialsFrom(lead.name, lead.email)}</span>
                          <span style={{ fontWeight: 500 }}>{lead.name || lead.email.split('@')[0]}</span>
                        </div>
                      </td>
                      <td style={td}>{lead.quizzes?.title || quizMap[lead.quiz_id] || 'Quiz'}</td>
                      <td style={{ ...td, color: C.GRAY_600 }}>{lead.email}</td>
                      <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{lead.score !== null && lead.score !== undefined ? lead.score : '—'}</td>
                      <td style={{ ...td, color: C.GRAY_600 }}>{lead.source || 'Direct'}</td>
                      <td style={{ ...td, color: C.GRAY_600, whiteSpace: 'nowrap' }}>{submitted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ ...td, color: C.GRAY_500, textAlign: 'center' }}>No leads match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ═══════ FUNNEL / SOURCES / DROP-OFF ═══════

function ConversionFunnel({ funnel }: { funnel: FunnelData }) {
  var steps = [
    { label: 'Views', value: funnel.views },
    { label: 'Started', value: funnel.started },
    { label: 'Completed', value: funnel.completed },
    { label: 'Leads', value: funnel.leads },
  ];
  return (
    <Panel title="Conversion funnel" subtitle="Across all quizzes in this period">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map(function(s, i) {
          var pct = funnel.views > 0 ? (s.value / funnel.views) * 100 : 0;
          return (
            <div key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                <span style={{ color: C.GRAY_600 }}>{s.label}</span>
                <span style={{ color: C.INK, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(s.value)}
                  {i > 0 && <span style={{ color: C.GRAY_500, fontWeight: 400, marginLeft: 8 }}>{funnel.views > 0 ? pct.toFixed(1) + '%' : '—'}</span>}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: C.GRAY_100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (funnel.views > 0 ? Math.max(pct, s.value > 0 ? 2 : 0) : 0) + '%', background: i === 3 ? C.INK : C.ACCENT, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LeadSourcesList({ sources, total }: { sources: LeadSource[]; total: number }) {
  return (
    <Panel title="Lead sources" subtitle={formatNumber(total) + ' ' + (total === 1 ? 'lead' : 'leads') + ' in total'}>
      {sources.length === 0 ? (
        <div style={{ fontSize: 14, color: C.GRAY_500, padding: '8px 0' }}>Where your leads come from will show here.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sources.map(function(src) {
            return (
              <div key={src.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.INK }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: src.color }} />{src.name}</span>
                  <span style={{ color: C.GRAY_600, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(src.count)} · {src.percentage.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: C.GRAY_100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: src.percentage + '%', background: src.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function QuestionDropoff({ questions, quizzes, selectedQuizId, onQuizChange }: {
  questions: DropoffQuestion[];
  quizzes: Array<{ id: string; title: string }>;
  selectedQuizId?: string;
  onQuizChange: (quizId: string) => void;
}) {
  return (
    <Panel
      title="Question drop-off"
      action={quizzes.length > 0 ? (
        <select
          aria-label="Quiz for drop-off analysis"
          value={selectedQuizId || ''}
          onChange={function(e) { onQuizChange(e.target.value); }}
          style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 13, fontFamily: C.FONT, maxWidth: 170, cursor: 'pointer' }}
        >
          {quizzes.map(function(q) { return <option key={q.id} value={q.id}>{q.title || 'Untitled'}</option>; })}
        </select>
      ) : undefined}
    >
      {questions.length === 0 ? (
        <div style={{ fontSize: 14, color: C.GRAY_500, padding: '8px 0' }}>Drop-off by question appears once this quiz has responses.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map(function(q, qi) {
            return (
              <div key={qi} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px', gap: 12, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: C.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{qi + 1}. {q.question || 'Question ' + (qi + 1)}</div>
                  <div style={{ height: 6, borderRadius: 3, background: C.GRAY_100, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ height: '100%', width: (q.completion_rate || 0) + '%', background: C.ACCENT }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, color: C.GRAY_600, fontVariantNumeric: 'tabular-nums' }}>{q.dropoff_rate || 0}% off</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <Link href="/dashboard/analytics" className="sq-link-arrow">View full analytics {ARROW}</Link>
      </div>
    </Panel>
  );
}

function RecentActivityList({ activities }: { activities: ActivityItem[] }) {
  return (
    <Panel title="Recent activity">
      {activities.map(function(act, ai) {
        return (
          <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderTop: ai === 0 ? 'none' : '1px solid ' + C.BORDER_LIGHT }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ACCENT, marginTop: 7, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.INK }}>{act.title}</div>
              <div style={{ fontSize: 13, color: C.GRAY_500 }}>{act.description}</div>
            </div>
            <span style={{ fontSize: 12, color: C.GRAY_500, whiteSpace: 'nowrap' }}>{act.time && act.time.includes('T') ? formatRelative(act.time) : act.time}</span>
          </div>
        );
      })}
    </Panel>
  );
}

function ABTestingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 20px 18px 24px', background: C.INK, color: '#fff', borderRadius: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.INK, background: C.ACID, borderRadius: 4, padding: '4px 8px' }}>A/B testing</span>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Find out which version of a quiz converts better.</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Test different questions, paths and designs side by side.</div>
      </div>
      <Link href="/dashboard/quizzes" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', borderRadius: 6, background: '#fff', color: C.INK, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
        Choose a quiz {ARROW}
      </Link>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ width: 36, height: 36, borderRadius: 6, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

// ═══════ MAIN OVERVIEW ═══════

function OverviewInner() {
  var router = useRouter();
  var searchParams = useSearchParams();
  var { token, status: authStatus } = useDashboardAuth();

  // Data state
  var [quizzes, setQuizzes] = useState<Quiz[]>([]);
  var [leads, setLeads] = useState<Lead[]>([]);
  var [loading, setLoading] = useState(true);
  var [analytics, setAnalytics] = useState<DashboardAnalytics>({
    total_views: 0, total_leads: 0, completion_rate: 0, lead_rate: 0,
    active_quizzes: 0, quiz_limit: 20, views_change: 0, leads_change: 0,
    completion_change: 0, lead_rate_change: 0, compare_label: '',
  });
  var [chartData, setChartData] = useState<ChartPoint[]>([]);
  var [chartPeriod, setChartPeriod] = useState('weekly');
  var [funnel, setFunnel] = useState<FunnelData>({ views: 0, started: 0, completed: 0, leads: 0 });
  var [sources, setSources] = useState<LeadSource[]>([]);
  var [dropoffQuestions, setDropoffQuestions] = useState<DropoffQuestion[]>([]);
  var [dropoffQuizTitle, setDropoffQuizTitle] = useState('');
  var [dropoffQuizId, setDropoffQuizId] = useState('');
  var [activities, setActivities] = useState<ActivityItem[]>([]);
  var [showABBanner, setShowABBanner] = useState(true);
  var [newQuizOpen, setNewQuizOpen] = useState(false);
  var [dateRange, setDateRange] = useState('');
  var [userName, setUserName] = useState('');
  var [datePickerOpen, setDatePickerOpen] = useState(false);
  var [selectedDays, setSelectedDays] = useState(30);
  var initRef = useRef(false);
  var dateChangeRef = useRef(false);

  // Claim flow (preserved from original)
  useEffect(function() {
    if (!token || initRef.current) return;
    initRef.current = true;
    var cancelled = false;

    (async function() {
      var quizClaimed = false;
      var claimedQuizId = '';
      try {
        var claimToken = searchParams?.get('claim') || '';
        if (!claimToken) claimToken = getCookie('sq_claim');
        if (!claimToken) claimToken = sessionStorage.getItem('sq_claim_token') || '';

        var previewPayload: any = null;
        try {
          var raw = localStorage.getItem('squarespell_preview') || sessionStorage.getItem('squarespell_preview');
          if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed?.quiz && parsed?.url && Date.now() - (parsed.createdAt || 0) < 14400000) {
              previewPayload = parsed;
              if (!claimToken) claimToken = parsed.claim_token || '';
            }
          }
        } catch {}

        if (claimToken || previewPayload) {
          var claimRes = await fetch(API + '/api/claim-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
              claim_token: claimToken,
              quiz: previewPayload?.quiz,
              brand: previewPayload?.brand,
              url: previewPayload?.url,
            }),
          });
          var claimData = await claimRes.json().catch(function() { return {}; });
          if (claimRes.ok && claimData.claimed) {
            quizClaimed = true;
            claimedQuizId = claimData.quiz_id || '';
          } else if (previewPayload) {
            var saveRes = await fetch(API + '/api/save-preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
              body: JSON.stringify({ quiz: previewPayload.quiz, brand: previewPayload.brand, url: previewPayload.url }),
            });
            var saveData = await saveRes.json().catch(function() { return {}; });
            if (saveRes.ok && saveData.saved) {
              quizClaimed = true;
              claimedQuizId = saveData.quiz_id || '';
            }
          }
          if (quizClaimed) {
            clearCookie('sq_claim');
            try { sessionStorage.removeItem('sq_claim_token'); } catch {}
            try { localStorage.removeItem('squarespell_preview'); sessionStorage.removeItem('squarespell_preview'); } catch {}
          }
        }
      } catch {}

      if (quizClaimed && claimedQuizId) {
        router.replace('/dashboard/' + claimedQuizId + '?justClaimed=1');
        return;
      }

      // No claim - proceed to load dashboard data
      if (!cancelled) await loadDashboardData();
    })();

    async function loadDashboardData() {
      if (!token) return;
      setLoading(true);

      try {
        // Parallel fetch: quizzes, leads, plan, activity
        var results = await Promise.all([
          fetch(API + '/api/quizzes', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
          fetch(API + '/api/leads', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
          fetch(API + '/api/user/plan', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
          fetch(API + '/api/dashboard/activity', { headers: { Authorization: 'Bearer ' + token } }).catch(function() { return null; }),
        ]);

        var quizRes = results[0];
        var leadRes = results[1];
        var planRes = results[2];
        var actRes = results[3];

        // Parse quizzes
        var quizData: Quiz[] = [];
        if (quizRes && quizRes.ok) {
          var quizJson = await quizRes.json();
          quizData = Array.isArray(quizJson) ? quizJson : [];
          if (!cancelled) setQuizzes(quizData);
        }

        // Parse leads
        var leadData: Lead[] = [];
        if (leadRes && leadRes.ok) {
          var leadJson = await leadRes.json();
          leadData = Array.isArray(leadJson) ? leadJson : (leadJson && Array.isArray(leadJson.leads) ? leadJson.leads : []);
          if (!cancelled) setLeads(leadData.slice(0, 10));
        }

        // Parse plan for user name
        if (planRes && planRes.ok) {
          var planData = await planRes.json();
          if (!cancelled && planData.email) {
            setUserName(planData.email.split('@')[0]);
          }
        }

        // Parse activity
        if (actRes && actRes.ok) {
          var actData = await actRes.json();
          if (!cancelled) setActivities(Array.isArray(actData) ? actData.slice(0, 5) : []);
        }

        // Compute aggregated analytics across all quizzes
        var totalViews = 0;
        var totalLeads = 0;
        var totalCompletions = 0;
        var totalStarted = 0;
        var activeCount = 0;

        for (var qi = 0; qi < quizData.length; qi++) {
          if (quizData[qi].status === 'live') activeCount++;
          totalViews += quizData[qi].view_count || 0;
          totalLeads += quizData[qi].lead_count || 0;

          try {
            var sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - selectedDays);
            var sinceParam = selectedDays > 0 ? '?since=' + encodeURIComponent(sinceDate.toISOString()) : '';
            var ar = await fetch(API + '/api/analytics/' + quizData[qi].id + sinceParam, {
              headers: { Authorization: 'Bearer ' + token },
            });
            if (ar.ok) {
              var ad = await ar.json();
              totalCompletions += ad.completions || 0;
              totalStarted += ad.started || ad.completions || 0;
            }
          } catch {}
        }

        if (!cancelled) {
          var compRate = totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0;
          var ldRate = totalViews > 0 ? (totalLeads / totalViews) * 100 : 0;
          setAnalytics({
            total_views: totalViews,
            total_leads: totalLeads,
            completion_rate: compRate,
            lead_rate: ldRate,
            active_quizzes: activeCount,
            quiz_limit: 20,
            views_change: 0,
            leads_change: 0,
            completion_change: 0,
            lead_rate_change: 0,
            compare_label: '',
          });

          setFunnel({
            views: totalViews,
            started: totalStarted,
            completed: totalCompletions,
            leads: totalLeads,
          });

          // Lead sources from lead data
          var sourceMap: Record<string, number> = {};
          for (var li = 0; li < leadData.length; li++) {
            var src = leadData[li].source || 'Direct';
            sourceMap[src] = (sourceMap[src] || 0) + 1;
          }
          var sourceEntries = Object.entries(sourceMap).sort(function(a, b) { return b[1] - a[1]; });
          var sourcesArr: LeadSource[] = sourceEntries.map(function(entry, si) {
            return {
              name: entry[0],
              count: entry[1],
              percentage: totalLeads > 0 ? (entry[1] / totalLeads) * 100 : 0,
              color: SOURCE_COLORS[si % SOURCE_COLORS.length],
            };
          });
          setSources(sourcesArr);

          // Set date range display
          var now = new Date();
          if (selectedDays > 0) {
            var rangeStart = new Date(now.getTime() - selectedDays * 86400000);
            setDateRange(
              rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
              ' \u2013 ' +
              now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            );
          } else {
            setDateRange('All time');
          }
        }

        // Fetch dropoff for top quiz
        if (quizData.length > 0 && !cancelled) {
          var topQuiz = quizData.slice().sort(function(a, b) { return b.view_count - a.view_count; })[0];
          setDropoffQuizTitle(topQuiz.title);
          setDropoffQuizId(topQuiz.id);
          try {
            var doRes = await fetch(API + '/api/analytics/' + topQuiz.id + '/dropoff', {
              headers: { Authorization: 'Bearer ' + token },
            });
            if (doRes.ok) {
              var doData = await doRes.json();
              if (!cancelled && Array.isArray(doData)) {
                setDropoffQuestions(doData.slice(0, 5));
              }
            }
          } catch {}
        }

      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    return function() { cancelled = true; };
  }, [token, router, searchParams]);

  // Re-fetch analytics when date range changes
  useEffect(function() {
    if (!dateChangeRef.current) {
      dateChangeRef.current = true;
      return;
    }
    if (!token || quizzes.length === 0) return;
    var cancelled = false;

    (async function() {
      var totalViews = 0;
      var totalLeads = 0;
      var totalCompletions = 0;
      var totalStarted = 0;

      for (var qi = 0; qi < quizzes.length; qi++) {
        totalViews += quizzes[qi].view_count || 0;
        totalLeads += quizzes[qi].lead_count || 0;
        try {
          var sinceDate = new Date();
          sinceDate.setDate(sinceDate.getDate() - selectedDays);
          var sinceParam = selectedDays > 0 ? '?since=' + encodeURIComponent(sinceDate.toISOString()) : '';
          var ar = await fetch(API + '/api/analytics/' + quizzes[qi].id + sinceParam, {
            headers: { Authorization: 'Bearer ' + token },
          });
          if (ar.ok) {
            var ad = await ar.json();
            totalCompletions += ad.completions || 0;
            totalStarted += ad.started || ad.completions || 0;
            totalViews = (totalViews - (quizzes[qi].view_count || 0)) + (ad.views || 0);
            totalLeads = (totalLeads - (quizzes[qi].lead_count || 0)) + (ad.leads || 0);
          }
        } catch {}
      }

      if (!cancelled) {
        var compRate = totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0;
        var ldRate = totalViews > 0 ? (totalLeads / totalViews) * 100 : 0;
        setAnalytics({
          total_views: totalViews,
          total_leads: totalLeads,
          completion_rate: compRate,
          lead_rate: ldRate,
          active_quizzes: quizzes.filter(function(q) { return q.status === 'live'; }).length,
          quiz_limit: 20,
          views_change: 0, leads_change: 0, completion_change: 0, lead_rate_change: 0, compare_label: '',
        });

        setFunnel({
          views: totalViews,
          started: totalStarted,
          completed: totalCompletions,
          leads: totalLeads,
        });

        // Update date range display
        var now = new Date();
        if (selectedDays > 0) {
          var rangeStart = new Date(now.getTime() - selectedDays * 86400000);
          setDateRange(
            rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
            ' \u2013 ' +
            now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          );
        } else {
          setDateRange('All time');
        }
      }
    })();

    return function() { cancelled = true; };
  }, [selectedDays]);

  // Handle dropoff quiz change
  function handleDropoffQuizChange(quizId: string) {
    setDropoffQuizId(quizId);
    var selectedQuiz = quizzes.find(function(q) { return q.id === quizId; });
    if (selectedQuiz) setDropoffQuizTitle(selectedQuiz.title);
    if (!token) return;
    fetch(API + '/api/analytics/' + quizId + '/dropoff', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(r) { return r.ok ? r.json() : []; })
      .then(function(data) {
        if (Array.isArray(data)) setDropoffQuestions(data.slice(0, 5));
      })
      .catch(function() {});
  }

  // Fetch chart timeseries
  useEffect(function() {
    if (!token || quizzes.length === 0) return;
    var cancelled = false;

    var periodMap: Record<string, string> = { daily: '7d', weekly: '30d', monthly: '90d' };
    var range = periodMap[chartPeriod] || '30d';

    (async function() {
      var allDates: Record<string, { views: number; leads: number }> = {};

      for (var qi = 0; qi < quizzes.length; qi++) {
        try {
          var tsRes = await fetch(API + '/api/analytics/' + quizzes[qi].id + '/timeseries?period=' + range, {
            headers: { Authorization: 'Bearer ' + token },
          });
          if (tsRes.ok) {
            var tsData = await tsRes.json();
            if (tsData.dates && Array.isArray(tsData.dates)) {
              for (var di = 0; di < tsData.dates.length; di++) {
                var dateKey = tsData.dates[di];
                if (!allDates[dateKey]) allDates[dateKey] = { views: 0, leads: 0 };
                allDates[dateKey].views += (tsData.views[di] || 0);
                allDates[dateKey].leads += (tsData.leads[di] || 0);
              }
            }
          }
        } catch {}
      }

      var sortedDates = Object.keys(allDates).sort(); // chronological, oldest on the left
      var points: ChartPoint[] = sortedDates.map(function(d) {
        var parts = d.split('-');
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          label: months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10),
          views: allDates[d].views,
          leads: allDates[d].leads,
        };
      });

      if (!cancelled) setChartData(points);
    })();

    return function() { cancelled = true; };
  }, [token, quizzes, chartPeriod]);

  // Respect a previous dismissal of the A/B testing prompt.
  useEffect(function() {
    try { if (localStorage.getItem('sq_ab_banner_dismissed') === '1') setShowABBanner(false); } catch {}
  }, []);

  // Resolve username from Clerk
  useEffect(function() {
    try {
      var el = document.querySelector('[data-clerk-user-firstname]');
      if (el && el.textContent) setUserName(el.textContent);
    } catch {}
  }, []);

  if (authStatus === 'loading' || loading) {
    return (
      <DashboardShell title="Dashboard">
        <PageLoading />
      </DashboardShell>
    );
  }

  var displayName = userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : '';

  return (
    <DashboardShell title="Dashboard">
      <style dangerouslySetInnerHTML={{ __html: DASH_CSS }} />
      <NewQuizModal open={newQuizOpen} onClose={function() { setNewQuizOpen(false); }} />

      {/* Welcome header */}
      <div className="sq-dash-hero">
        <div style={{ minWidth: 0 }}>
          <DisplayTitle size="xl">{displayName ? 'Welcome back, ' + displayName + '.' : 'Welcome back.'}</DisplayTitle>
          <p style={{ margin: '16px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600, lineHeight: 1.4 }}>
            Here&apos;s what&apos;s happening with your quizzes.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            type="button"
            onClick={function() { setNewQuizOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, height: 60, padding: '0 28px', borderRadius: 6, border: 'none', background: C.ACCENT, color: '#fff', fontSize: 19, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer' }}
            onMouseEnter={function(e) { e.currentTarget.style.background = C.ACCENT_HOVER; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = C.ACCENT; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Create quiz
          </button>
          <Link href="/dashboard/templates" className="sq-tip" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
            <span style={{ width: 40, height: 40, borderRadius: 6, background: C.ACID_SOFT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V16h5v-.2c0-.8.4-1.5 1.1-2A6 6 0 0 0 12 3z" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 500, color: C.INK }}>Turn curiosity into connection.</span>
              <span style={{ display: 'block', fontSize: 14, color: C.GRAY_500, marginTop: 2 }}>Start from a ready-made template.</span>
            </span>
            <span style={{ color: C.INK, display: 'flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </span>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="sq-kpis">
        <Kpi
          icon={<KpiIcon><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg></KpiIcon>}
          value={formatNumber(analytics.total_views)}
          label={analytics.total_views === 1 ? 'View' : 'Views'}
        />
        <Kpi
          icon={<KpiIcon><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" /><circle cx="17" cy="9" r="2.8" /><path d="M16.5 14.6c2.9.2 5 2.2 5 5.4" /></svg></KpiIcon>}
          value={formatNumber(funnel.completed)}
          label={funnel.completed === 1 ? 'Completion' : 'Completions'}
        />
        <Kpi
          icon={<KpiIcon><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></svg></KpiIcon>}
          value={formatNumber(analytics.total_leads)}
          label={analytics.total_leads === 1 ? 'Lead' : 'Leads'}
        />
        <Kpi
          icon={<RateRing pct={analytics.completion_rate} />}
          value={(Math.round(analytics.completion_rate * 10) / 10) + '%'}
          label="Completion rate"
        />
        <div className="sq-kpis-range" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px' }}>
          <RangeSelect value={selectedDays} onChange={function(d) { setSelectedDays(d); }} />
        </div>
      </div>

      {/* Chart + top quizzes */}
      <div className="sq-dash-main">
        <PerformanceChart data={chartData} period={chartPeriod} onPeriodChange={setChartPeriod} />
        <TopQuizzesList quizzes={quizzes} />
      </div>

      {/* Recent leads */}
      <RecentLeadsTable leads={leads} quizzes={quizzes} />

      {/* Deeper insight */}
      <div className="sq-dash-trio">
        <ConversionFunnel funnel={funnel} />
        <LeadSourcesList sources={sources} total={analytics.total_leads} />
        <QuestionDropoff
          questions={dropoffQuestions}
          quizzes={quizzes.map(function(q) { return { id: q.id, title: q.title }; })}
          selectedQuizId={dropoffQuizId}
          onQuizChange={handleDropoffQuizChange}
        />
      </div>

      {activities.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <RecentActivityList activities={activities} />
        </div>
      )}

      {showABBanner && quizzes.length > 0 && (
        <ABTestingBanner onDismiss={function() {
          setShowABBanner(false);
          try { localStorage.setItem('sq_ab_banner_dismissed', '1'); } catch {}
        }} />
      )}
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Dashboard">
          <PageLoading />
        </DashboardShell>
      }
    >
      <OverviewInner />
    </Suspense>
  );
}
