'use client';

/**
 * /dashboard/analytics - Roll-up analytics across every quiz the user owns (2026 redesign, screen 10).
 *
 * Fans out to the per-quiz endpoints (/api/analytics/:quizId and /timeseries) and sums the results.
 * Date presets map to the API's `since` filter; "Custom" picks a start date (the API has no end-date filter, so the
 * range always runs to today and is labelled that way). The per-quiz table can be exported as CSV.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { DisplayTitle, EmptyState, PrimaryButton, Pill, PageLoading } from '../_components/PageShell';
import { QuizCover } from '../_components/QuizCover';
import { TrendChart, TrendLegend, dayRange, shortDay } from '../_components/TrendChart';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type Quiz = {
  id: string;
  title: string;
  slug: string;
  status: 'live' | 'draft';
  view_count: number;
  lead_count: number;
  created_at?: string;
  updated_at?: string;
};

type Analytics = { views: number; completions: number; leads: number; completion_rate: number; lead_rate: number };
type Series = { dates: string[]; views: number[]; completions?: number[]; leads: number[] };
type Row = Quiz & { analytics: Analytics | null; series: Series | null };
type DatePreset = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

var DATE_PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

function getSinceDate(preset: DatePreset, customFrom: string): Date | null {
  if (preset === 'all') return null;
  if (preset === 'custom') return customFrom ? new Date(customFrom + 'T00:00:00') : null;
  var now = new Date();
  var days = ({ today: 0, '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[preset] ?? 30;
  if (days === 0) { now.setHours(0, 0, 0, 0); return now; }
  now.setDate(now.getDate() - days);
  return now;
}

/** Smallest timeseries window the API offers that still covers `since`. */
function periodFor(since: Date | null): string {
  if (!since) return 'all';
  var days = (Date.now() - since.getTime()) / 86400000;
  if (days <= 7) return '7d';
  if (days <= 30) return '30d';
  if (days <= 90) return '90d';
  return 'all';
}

function fmt(n: number): string { return (n || 0).toLocaleString('en-US'); }
function pct(n: number): string { return !isFinite(n) ? '0%' : (Math.round(n * 10) / 10) + '%'; }

var PAGE_CSS = `
  .sq-an-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
  .sq-an-main { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 20px; margin-bottom: 20px; }
  .sq-an-row:hover { background: ${C.GRAY_25}; }
  .sq-seg { display: flex; border: 1px solid ${C.BORDER}; border-radius: 6px; background: #fff; overflow: hidden; }
  .sq-seg button { height: 44px; padding: 0 18px; border: none; border-left: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 14px ${C.FONT}; cursor: pointer; white-space: nowrap; }
  .sq-seg button:first-child { border-left: none; }
  .sq-seg button[aria-pressed="true"] { background: ${C.ACCENT}; color: #fff; }
  @media (max-width: 1200px) { .sq-an-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } .sq-an-main { grid-template-columns: 1fr; } }
  @media (max-width: 720px) { .sq-an-kpis { grid-template-columns: 1fr 1fr; } }
`;

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="stat" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 20px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, minWidth: 0 }}>
      <span style={{ width: 56, height: 56, borderRadius: 6, background: C.PERIWINKLE_SOFT, color: C.INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: C.GRAY_600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </div>
  );
}

var I = {
  eye: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  people: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" /><circle cx="17" cy="9" r="2.8" /><path d="M16.5 14.6c2.9.2 5 2.2 5 5.4" /></svg>,
  person: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></svg>,
  percent: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>,
  trend: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>,
  bars: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 20v-6M12 20V8M18 20V4" /></svg>,
  download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></svg>,
  arrow: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  search: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
};

function FunnelStep({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'blue' | 'acid' }) {
  var bg = tone === 'acid' ? C.ACID_SOFT : C.PERIWINKLE_SOFT;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: bg, borderRadius: 6, overflow: 'hidden' }}>
      <span style={{ width: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone === 'acid' ? C.INK : C.ACCENT, borderRight: '1px solid rgba(22,23,25,0.06)' }}>{icon}</span>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 14, color: C.GRAY_600 }}>{label}</div>
        <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 26, fontWeight: 700, color: C.INK, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [rows, setRows] = useState<Row[]>([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [error, setError] = useState(false);
  var [datePreset, setDatePreset] = useState<DatePreset>('30d');
  var [customFrom, setCustomFrom] = useState('');
  var [showCustomPicker, setShowCustomPicker] = useState(false);
  var [search, setSearch] = useState('');
  var [sortBy, setSortBy] = useState('updated');
  var [appliedSince, setAppliedSince] = useState<Date | null>(getSinceDate('30d', ''));
  var hasDataRef = useRef(false);

  var fetchData = useCallback(function(preset?: DatePreset, cFrom?: string) {
    if (!token) return;
    var activePreset = preset !== undefined ? preset : datePreset;
    var activeFrom = cFrom !== undefined ? cFrom : customFrom;
    var since = getSinceDate(activePreset, activeFrom);
    var period = periodFor(since);
    setAppliedSince(since);
    setError(false);
    if (hasDataRef.current) setRefreshing(true); else setLoading(true);

    var auth = { headers: { Authorization: 'Bearer ' + token } };
    fetch(API + '/api/quizzes', auth)
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load quizzes');
        return res.json();
      })
      .then(function(quizzes: Quiz[]) {
        return Promise.all((Array.isArray(quizzes) ? quizzes : []).map(function(q) {
          var url = API + '/api/analytics/' + q.id + (since ? '?since=' + encodeURIComponent(since.toISOString()) : '');
          var a = fetch(url, auth).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
          var s = fetch(API + '/api/analytics/' + q.id + '/timeseries?period=' + period, auth).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
          return Promise.all([a, s]).then(function(res) { return Object.assign({}, q, { analytics: res[0], series: res[1] }) as Row; });
        }));
      })
      .then(function(results: Row[]) { hasDataRef.current = true; setRows(results); })
      .catch(function(e) { console.error(e); setError(true); })
      .finally(function() { setLoading(false); setRefreshing(false); });
  }, [token, datePreset, customFrom]);

  useEffect(function() { fetchData(); }, [token]);

  function handlePresetChange(preset: DatePreset) {
    setDatePreset(preset);
    if (preset === 'custom') { setShowCustomPicker(true); return; }
    setShowCustomPicker(false);
    fetchData(preset);
  }

  var totals = useMemo(function() {
    var views = 0, completions = 0, leads = 0;
    rows.forEach(function(r) {
      if (!r.analytics) return;
      views += r.analytics.views || 0;
      completions += r.analytics.completions || 0;
      leads += r.analytics.leads || 0;
    });
    return {
      views: views, completions: completions, leads: leads,
      completion_rate: views > 0 ? (completions / views) * 100 : 0,
      lead_rate: views > 0 ? (leads / views) * 100 : 0,
      lead_from_completion: completions > 0 ? (leads / completions) * 100 : 0,
    };
  }, [rows]);

  // Zero-filled daily buckets for the selected window, summed across quizzes.
  var chart = useMemo(function() {
    var from = appliedSince;
    if (!from) {
      var earliest = '';
      rows.forEach(function(r) { (r.series?.dates || []).forEach(function(d) { if (!earliest || d < earliest) earliest = d; }); });
      from = earliest ? new Date(earliest + 'T00:00:00Z') : new Date(Date.now() - 29 * 86400000);
    }
    var keys = dayRange(from);
    var idx: Record<string, number> = {};
    keys.forEach(function(k, i) { idx[k] = i; });
    var views = keys.map(function() { return 0; });
    var comps = keys.map(function() { return 0; });
    var leads = keys.map(function() { return 0; });
    rows.forEach(function(r) {
      var s = r.series;
      if (!s || !Array.isArray(s.dates)) return;
      s.dates.forEach(function(d, i) {
        var at = idx[d];
        if (at === undefined) return;
        views[at] += (s.views && s.views[i]) || 0;
        comps[at] += (s.completions && s.completions[i]) || 0;
        leads[at] += (s.leads && s.leads[i]) || 0;
      });
    });
    return { labels: keys.map(shortDay), views: views, comps: comps, leads: leads };
  }, [rows, appliedSince]);

  var shownRows = useMemo(function() {
    var q = search.trim().toLowerCase();
    var list = rows.filter(function(r) { return (r.title || '').toLowerCase().indexOf(q) > -1; });
    list.sort(function(a, b) {
      if (sortBy === 'views') return (b.analytics?.views || 0) - (a.analytics?.views || 0);
      if (sortBy === 'leads') return (b.analytics?.leads || 0) - (a.analytics?.leads || 0);
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });
    return list;
  }, [rows, search, sortBy]);

  var coverOrder = useMemo(function() {
    var o: Record<string, number> = {};
    rows.slice().sort(function(a, b) { return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(); }).forEach(function(r, i) { o[r.id] = i; });
    return o;
  }, [rows]);

  function exportCsv() {
    var header = ['Quiz', 'Status', 'Views', 'Completions', 'Leads', 'Completion rate', 'Lead rate'];
    var lines = [header.join(',')].concat(shownRows.map(function(r) {
      var a = r.analytics || { views: 0, completions: 0, leads: 0 } as Analytics;
      var cr = a.views > 0 ? (a.completions / a.views) * 100 : 0;
      var lr = a.views > 0 ? (a.leads / a.views) * 100 : 0;
      return ['"' + (r.title || 'Untitled').replace(/"/g, '""') + '"', r.status, a.views || 0, a.completions || 0, a.leads || 0, pct(cr), pct(lr)].join(',');
    }));
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'squarespell-analytics-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  if (authStatus === 'loading' || loading) {
    return <DashboardShell title="Analytics"><PageLoading /></DashboardShell>;
  }

  if (error) {
    return (
      <DashboardShell title="Analytics">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 28, fontWeight: 700, color: C.INK, marginBottom: 8 }}>Could not load analytics</div>
          <div style={{ fontSize: 15, color: C.GRAY_600, marginBottom: 20 }}>The server may be starting up. Please try again.</div>
          <PrimaryButton onClick={function() { fetchData(); }}>Retry</PrimaryButton>
        </div>
      </DashboardShell>
    );
  }

  var th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.GRAY_500, borderBottom: '1px solid ' + C.BORDER, whiteSpace: 'nowrap' };
  var td: React.CSSProperties = { padding: '12px 14px', fontSize: 15, color: C.INK, borderBottom: '1px solid ' + C.BORDER_LIGHT, fontVariantNumeric: 'tabular-nums' };

  return (
    <DashboardShell title="Analytics">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ minWidth: 0 }}>
          <DisplayTitle size="xl">Analytics.</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Quiz performance across every quiz you&apos;ve published.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingTop: 8 }}>
          <div className="sq-seg" role="group" aria-label="Date range">
            {DATE_PRESETS.map(function(p) {
              return <button key={p.key} type="button" aria-pressed={datePreset === p.key} onClick={function() { handlePresetChange(p.key); }}>{p.label}</button>;
            })}
          </div>
          <Link href="/dashboard/analytics/attribution" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 46, padding: '0 20px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
            {I.bars} Attribution
          </Link>
          <button type="button" onClick={exportCsv} disabled={rows.length === 0} aria-label="Export CSV" title="Export CSV" style={{ width: 46, height: 46, borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: rows.length ? 'pointer' : 'default', opacity: rows.length ? 1 : 0.5 }}>
            {I.download}
          </button>
        </div>
      </div>

      {showCustomPicker && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -12, marginBottom: 24, padding: '12px 16px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, width: 'fit-content', flexWrap: 'wrap' }}>
          <label htmlFor="sq-an-from" style={{ fontSize: 14, color: C.GRAY_600 }}>Show data since</label>
          <input id="sq-an-from" type="date" value={customFrom} max={new Date().toISOString().slice(0, 10)} onChange={function(e) { setCustomFrom(e.target.value); }}
            style={{ height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', color: C.INK, fontSize: 14, fontFamily: C.FONT }} />
          <span style={{ fontSize: 14, color: C.GRAY_500 }}>to today</span>
          <PrimaryButton disabled={!customFrom} onClick={function() { setShowCustomPicker(false); fetchData('custom', customFrom); }}>Apply</PrimaryButton>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={I.bars}
          title="No analytics yet"
          body="Once you publish a quiz and start getting visitors, you'll see views, completions and lead capture here."
          action={<PrimaryButton href="/dashboard/quizzes">Go to your quizzes</PrimaryButton>}
        />
      ) : (
        <div style={{ opacity: refreshing ? 0.55 : 1, transition: 'opacity .15s' }}>
          <div className="sq-an-kpis">
            <KpiCard icon={I.eye} label="Total views" value={fmt(totals.views)} />
            <KpiCard icon={I.people} label="Completions" value={fmt(totals.completions)} />
            <KpiCard icon={I.person} label="Leads captured" value={fmt(totals.leads)} />
            <KpiCard icon={I.percent} label="Completion rate" value={pct(totals.completion_rate)} />
            <KpiCard icon={I.trend} label="Lead rate" value={pct(totals.lead_rate)} />
          </div>

          <div className="sq-an-main">
            <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '22px 24px 16px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.INK }}>Views, completions and leads</h2>
                <TrendLegend series={[{ key: 'v', label: 'Views', color: C.ACCENT, values: [] }, { key: 'c', label: 'Completions', color: C.BRAND_300, values: [] }, { key: 'l', label: 'Leads', color: C.ACID, values: [] }]} />
              </div>
              <TrendChart
                labels={chart.labels}
                series={[
                  { key: 'v', label: 'Views', color: C.ACCENT, values: chart.views },
                  { key: 'c', label: 'Completions', color: C.BRAND_300, values: chart.comps },
                  { key: 'l', label: 'Leads', color: C.ACID, values: chart.leads },
                ]}
              />
            </section>

            <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '22px 24px 24px', minWidth: 0 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: C.INK }} title="How visitors move from viewing a quiz to becoming a lead">Quiz funnel</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px', columnGap: 16, rowGap: 0, alignItems: 'center' }}>
                <FunnelStep icon={I.eye} label="Views" value={totals.views} tone="blue" />
                <div>
                  <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.INK }}>{totals.views > 0 ? pct(totals.completion_rate) : '—'}</div>
                  <div style={{ fontSize: 13, color: C.GRAY_500 }}>to completion</div>
                </div>
                <div style={{ height: 18, marginLeft: 32, borderLeft: '1px solid ' + C.GRAY_400 }} /><div />
                <FunnelStep icon={I.people} label="Completions" value={totals.completions} tone="blue" />
                <div>
                  <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.INK }}>{totals.completions > 0 ? pct(totals.lead_from_completion) : '—'}</div>
                  <div style={{ fontSize: 13, color: C.GRAY_500 }}>to lead</div>
                </div>
                <div style={{ height: 18, marginLeft: 32, borderLeft: '1px solid ' + C.GRAY_400 }} /><div />
                <FunnelStep icon={I.person} label="Leads captured" value={totals.leads} tone="acid" />
                <div />
              </div>
            </section>
          </div>

          <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '18px 20px' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.INK }}>All quizzes ({rows.length})</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 12, color: C.GRAY_500, display: 'flex' }}>{I.search}</span>
                  <input type="search" aria-label="Search quizzes" placeholder="Search quizzes..." value={search} onChange={function(e) { setSearch(e.target.value); }}
                    style={{ width: 280, maxWidth: '100%', height: 40, padding: '0 12px 0 38px', borderRadius: 6, border: '1px solid ' + C.BORDER, fontSize: 14, fontFamily: C.FONT, color: C.INK }} />
                </label>
                <select aria-label="Sort quizzes" value={sortBy} onChange={function(e) { setSortBy(e.target.value); }}
                  style={{ height: 40, padding: '0 12px', borderRadius: 6, border: '1px solid ' + C.BORDER, fontSize: 14, fontFamily: C.FONT, color: C.INK, background: '#fff', cursor: 'pointer' }}>
                  <option value="updated">Recently updated</option>
                  <option value="views">Most views</option>
                  <option value="leads">Most leads</option>
                  <option value="title">Name A–Z</option>
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto', padding: '0 6px 6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={th}>Quiz</th><th style={th}>Status</th><th style={th}>Views</th><th style={th}>Completions</th><th style={th}>Leads</th><th style={th}>Completion rate</th><th style={th}>Lead rate</th><th style={th} />
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map(function(r) {
                    var a = r.analytics;
                    var v = a?.views || 0;
                    return (
                      <tr key={r.id} className="sq-an-row">
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ width: 64, height: 36, borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}><QuizCover id={r.id} title={r.title} height={36} compact variant={coverOrder[r.id]} /></span>
                            <span style={{ fontWeight: 500 }}>{r.title || 'Untitled'}</span>
                          </div>
                        </td>
                        <td style={td}><Pill variant={r.status === 'live' ? 'live' : 'draft'}>{r.status === 'live' ? 'Live' : 'Draft'}</Pill></td>
                        <td style={td}>{a ? fmt(v) : '—'}</td>
                        <td style={td}>{a ? fmt(a.completions) : '—'}</td>
                        <td style={td}>{a ? fmt(a.leads) : '—'}</td>
                        <td style={{ ...td, color: C.GRAY_600 }}>{a ? pct(v > 0 ? (a.completions / v) * 100 : 0) : '—'}</td>
                        <td style={{ ...td, color: C.GRAY_600 }}>{a ? pct(v > 0 ? (a.leads / v) * 100 : 0) : '—'}</td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Link href={'/dashboard/analytics/' + r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.ACCENT, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>View details {I.arrow}</Link>
                        </td>
                      </tr>
                    );
                  })}
                  {shownRows.length === 0 && (
                    <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: C.GRAY_500 }}>No quizzes match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
