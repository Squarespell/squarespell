'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { listCampaigns, getQuota, deleteCampaign, createCampaign, Campaign } from '../../../lib/emails';
import { DisplayTitle, PageLoading } from '../_components/PageShell';
import { QuizCover } from '../_components/QuizCover';

/* ─── helpers ─── */
function campaignType(c: Campaign): 'broadcast' | 'automation' | 'quiz-result' | 'follow-up' {
  if (c.mode === 'live') return 'automation';
  if (c.source_quiz_id && (c.name || '').toLowerCase().includes('result')) return 'quiz-result';
  if ((c.name || '').toLowerCase().includes('follow')) return 'follow-up';
  return 'broadcast';
}

var TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  'broadcast':   { label: 'Broadcast',    color: '#161719', bg: '#EFEEE7' },
  'automation':  { label: 'Automation',   color: '#2442E6', bg: '#EEF1FF' },
  'quiz-result': { label: 'Result email', color: '#1B33B8', bg: '#DDE3FF' },
  'follow-up':   { label: 'Follow-up',    color: '#161719', bg: '#F6FBD0' },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

function statusOf(c: Campaign): { label: string; dot: string; bg: string; fg: string } {
  var live = { dot: '#1F9D57', bg: '#EAF6EE', fg: '#0E7A3F' };
  var neutral = { dot: '#6E6D68', bg: '#EFEEE7', fg: '#35352F' };
  if (c.status === 'failed') return { label: 'Failed', dot: '#C0271B', bg: '#FDF0EE', fg: '#C0271B' };
  if (c.mode === 'live') return c.status === 'draft' ? Object.assign({ label: 'Draft' }, neutral) : Object.assign({ label: 'Live' }, live);
  if (c.status === 'sent') return Object.assign({ label: 'Sent' }, live);
  if (c.status === 'sending') return Object.assign({ label: 'Sending' }, live);
  if (c.status === 'scheduled') return { label: 'Scheduled', dot: '#3154FF', bg: '#EEF1FF', fg: '#2442E6' };
  return Object.assign({ label: 'Draft' }, neutral);
}

function relTime(s?: string | null): string {
  if (!s) return '—';
  var ms = Date.now() - new Date(s).getTime();
  var m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000), d = Math.floor(ms / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  if (d < 30) return d + (d === 1 ? ' day ago' : ' days ago');
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

var PAGE_CSS = `
  .ec-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(300px, 380px); align-items: center; gap: 0; margin-bottom: 32px; }
  .ec-metric { display: flex; gap: 20px; padding: 0 32px; min-width: 0; }
  .ec-metric + .ec-metric { border-left: 1px solid ${C.BORDER}; }
  .ec-metric:first-child { padding-left: 0; }
  .ec-row:hover { background: ${C.GRAY_25}; }
  .ec-btn { display: inline-flex; align-items: center; justify-content: center; height: 40px; padding: 0 16px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 15px ${C.FONT}; cursor: pointer; text-decoration: none; white-space: nowrap; }
  .ec-btn:hover { border-color: ${C.GRAY_300}; }
  .ec-menu-item { display: block; width: 100%; text-align: left; padding: 9px 12px; border: none; background: none; border-radius: 6px; font: 400 14px ${C.FONT}; color: ${C.INK}; cursor: pointer; }
  .ec-menu-item:hover { background: ${C.GRAY_50}; }
  .ec-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 1250px) { .ec-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 20px; } .ec-upgrade { grid-column: 1 / -1; } .ec-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 800px) { .ec-metrics { grid-template-columns: 1fr; } .ec-metric + .ec-metric { border-left: none; } .ec-metric { padding: 0; } .ec-grid { grid-template-columns: 1fr; } }
`;

function MetricIcon({ d }: { d: string }) {
  return (
    <span style={{ width: 50, height: 50, borderRadius: '50%', border: '1px solid ' + C.BORDER, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.INK, flexShrink: 0 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
    </span>
  );
}

/* ─── page (2026 redesign, screen 20) ─── */
export default function EmailCampaignsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var router = useRouter();
  var [items, setItems] = useState<Campaign[]>([]);
  var [quota, setQuota] = useState<{ used: number; cap: number; plan: string } | null>(null);
  var [loading, setLoading] = useState(true);
  var [filter, setFilter] = useState<'all' | 'draft' | 'live' | 'automations'>('all');
  var [search, setSearch] = useState('');
  var [sortBy, setSortBy] = useState('updated');
  var [view, setView] = useState<'list' | 'grid'>('list');
  var [menuOpen, setMenuOpen] = useState<string | null>(null);
  var [actionLoading, setActionLoading] = useState<string | null>(null);
  var [err, setErr] = useState<string | null>(null);
  var menuRef = useRef<HTMLDivElement>(null);
  var [page, setPage] = useState(1);
  var perPage = 10;

  useEffect(function () {
    if (!token) return;
    var cancelled = false;
    (async function () {
      try {
        var results = await Promise.all([
          listCampaigns().catch(function () { return [] as Campaign[]; }),
          getQuota().catch(function () { return null; }),
        ]);
        if (cancelled) return;
        setItems(Array.isArray(results[0]) ? results[0] : []);
        setQuota(results[1]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Could not load campaigns');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return function () { cancelled = true; };
  }, [token]);

  useEffect(function () {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    }
    if (menuOpen) document.addEventListener('mousedown', handle);
    return function () { document.removeEventListener('mousedown', handle); };
  }, [menuOpen]);

  async function handleArchive(c: Campaign) {
    setActionLoading(c.id); setMenuOpen(null);
    try {
      await deleteCampaign(c.id);
      setItems(function (prev) { return prev.filter(function (x) { return x.id !== c.id; }); });
    } catch (e: any) { setErr('Could not archive: ' + (e?.message || 'Unknown error')); }
    setActionLoading(null);
  }

  async function handleDuplicate(c: Campaign) {
    setActionLoading(c.id); setMenuOpen(null);
    try {
      var dup = await createCampaign({
        name: (c.name || 'Untitled') + ' (copy)',
        subject: c.subject, from_name: c.from_name, from_email: c.from_email,
        html: c.html, mode: c.mode || 'blast',
        source_quiz_id: c.source_quiz_id || undefined,
        source_filters: c.source_filters || undefined,
      } as any);
      router.push('/dashboard/emails/' + dup.id);
    } catch (e: any) { setErr('Could not duplicate: ' + (e?.message || 'Unknown error')); }
    setActionLoading(null);
  }

  function isLive(c: Campaign) { var l = statusOf(c).label; return l === 'Live' || l === 'Sent' || l === 'Sending'; }

  var counts = {
    all: items.length,
    draft: items.filter(function (c) { return statusOf(c).label === 'Draft'; }).length,
    live: items.filter(isLive).length,
    automations: items.filter(function (c) { return c.mode === 'live'; }).length,
  };

  var filtered = items.filter(function (c) {
    if (filter === 'draft' && statusOf(c).label !== 'Draft') return false;
    if (filter === 'live' && !isLive(c)) return false;
    if (filter === 'automations' && c.mode !== 'live') return false;
    if (search) {
      var q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q);
    }
    return true;
  }).sort(function (a, b) {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'sent') return (b.sent_count || 0) - (a.sent_count || 0);
    return new Date(b.last_run_at || b.created_at).getTime() - new Date(a.last_run_at || a.created_at).getTime();
  });

  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  var safePage = Math.min(page, totalPages);
  var paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  var totalSent = items.reduce(function (s, c) { return s + (c.sent_count || 0); }, 0);
  var sentItems = items.filter(function (c) { return (c.sent_count || 0) > 0; });
  var avgOpen = sentItems.length > 0
    ? sentItems.reduce(function (s, c) { var sent = c.sent_count || 0; var opened = (c as any).opened_count || 0; return s + (sent > 0 ? (opened / sent) * 100 : 0); }, 0) / sentItems.length
    : 0;
  var unlimited = !quota || quota.cap < 0;
  var pct = quota && quota.cap > 0 ? Math.min(100, Math.round((quota.used / quota.cap) * 100)) : 0;
  var showUpgrade = !!quota && quota.cap > 0 && (quota.plan || '').toLowerCase() !== 'business';

  if (authStatus !== 'ready' || loading) {
    return <DashboardShell title="Email campaigns"><PageLoading /></DashboardShell>;
  }

  var th: React.CSSProperties = { textAlign: 'left', padding: '16px 14px', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.GRAY_500, borderBottom: '1px solid ' + C.BORDER, whiteSpace: 'nowrap' };
  var td: React.CSSProperties = { padding: '12px 14px', fontSize: 15, color: C.INK, borderBottom: '1px solid ' + C.BORDER_LIGHT, verticalAlign: 'middle' };

  function Actions({ c }: { c: Campaign }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="ec-btn" onClick={function () { window.open('/dashboard/emails/' + c.id + '?preview=1', '_blank'); }}>Preview</button>
        <Link href={'/dashboard/emails/' + c.id} className="ec-btn">Edit</Link>
        <div style={{ position: 'relative' }} ref={menuOpen === c.id ? menuRef : undefined}>
          <button type="button" className="ec-btn" aria-label={'More actions for ' + (c.name || 'campaign')} aria-haspopup="menu" aria-expanded={menuOpen === c.id}
            onClick={function (e) { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }} style={{ width: 40, padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
          </button>
          {menuOpen === c.id && (
            <div role="menu" style={{ position: 'absolute', right: 0, top: 46, zIndex: 30, minWidth: 170, padding: 6, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, boxShadow: C.SHADOW_LG }}>
              <button type="button" role="menuitem" className="ec-menu-item" disabled={actionLoading === c.id} onClick={function () { handleDuplicate(c); }}>Duplicate</button>
              <button type="button" role="menuitem" className="ec-menu-item" disabled={actionLoading === c.id} onClick={function () { handleArchive(c); }} style={{ color: C.DANGER }}>Archive</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function TypePill({ c }: { c: Campaign }) {
    var t = TYPE_META[campaignType(c)];
    return <span style={{ display: 'inline-flex', height: 28, alignItems: 'center', padding: '0 12px', borderRadius: 4, background: t.bg, color: t.color, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{t.label}</span>;
  }

  function StatusPill({ c }: { c: Campaign }) {
    var st = statusOf(c);
    return <span style={{ display: 'inline-flex', height: 28, alignItems: 'center', gap: 8, padding: '0 12px', borderRadius: 4, background: st.bg, color: st.fg, fontSize: 13, fontWeight: 500 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot }} />{st.label}</span>;
  }

  return (
    <DashboardShell title="Email campaigns">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 36 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.GRAY_500, marginBottom: 14 }}>Engage</div>
          <DisplayTitle size="xl">Email campaigns.</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Send campaigns and automations to your leads.</p>
        </div>
        <Link href="/dashboard/emails/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, height: 56, padding: '0 28px', marginTop: 28, borderRadius: 6, background: C.ACCENT, color: '#fff', fontSize: 18, fontWeight: 500, textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Create campaign
        </Link>
      </div>

      {err && (
        <div role="alert" style={{ padding: '12px 16px', background: C.DANGER_LIGHT, borderRadius: 6, color: C.DANGER, fontSize: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
          {err}
          <button type="button" aria-label="Dismiss" onClick={function () { setErr(null); }} style={{ background: 'none', border: 'none', color: C.DANGER, cursor: 'pointer', fontSize: 18 }}>&times;</button>
        </div>
      )}

      {/* Metrics */}
      <div className="ec-metrics">
        <div className="ec-metric stat">
          <MetricIcon d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
          <div>
            <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1 }}>{totalSent.toLocaleString()}</div>
            <div style={{ fontSize: 17, color: C.INK, marginTop: 6 }}>emails sent</div>
            <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4 }}>{totalSent > 0 ? 'across ' + sentItems.length + ' ' + (sentItems.length === 1 ? 'campaign' : 'campaigns') : 'No emails sent yet'}</div>
          </div>
        </div>
        <div className="ec-metric stat">
          <MetricIcon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />
          <div>
            <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1 }}>{Math.round(avgOpen)}%</div>
            <div style={{ fontSize: 17, color: C.INK, marginTop: 6 }}>average open rate</div>
            <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4 }}>{sentItems.length > 0 ? 'across sent campaigns' : 'Send campaigns to track'}</div>
          </div>
        </div>
        <div className="ec-metric stat" style={{ alignItems: 'flex-start' }}>
          <MetricIcon d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1 }}>
              {(quota?.used || 0).toLocaleString()}<span style={{ fontSize: 22, fontWeight: 600 }}> / {unlimited ? 'Unlimited' : (quota?.cap || 0).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 17, color: C.INK, marginTop: 6 }}>monthly email usage</div>
            {!unlimited && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.GRAY_100, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: C.ACCENT }} /></div>
                <span style={{ fontSize: 14, color: C.INK }}>{pct}%</span>
              </div>
            )}
          </div>
        </div>
        {showUpgrade && (
          <div className="ec-upgrade" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 20px', borderRadius: 6, background: C.ACID_SOFT }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.INK} strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
            <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>Reaching more leads?</div><div style={{ fontSize: 14, color: C.GRAY_600 }}>Upgrade to unlock more emails.</div></div>
            <Link href="/dashboard/billing" className="ec-btn">Upgrade plan</Link>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 380, maxWidth: '100%' }}>
          <span style={{ position: 'absolute', left: 16, color: C.GRAY_600, display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input type="search" aria-label="Search campaigns" placeholder="Search campaigns..." value={search} onChange={function (e) { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', height: 46, padding: '0 14px 0 46px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 15, fontFamily: C.FONT, color: C.INK }} />
        </label>
        <div role="group" aria-label="Filter campaigns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {([['all', 'All'], ['draft', 'Draft'], ['live', 'Live'], ['automations', 'Automations']] as const).map(function (f) {
            var active = filter === f[0];
            return (
              <button key={f[0]} type="button" aria-pressed={active} onClick={function () { setFilter(f[0]); setPage(1); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 44, padding: '0 20px', borderRadius: 999, border: '1px solid ' + (active ? C.INK : C.BORDER), background: active ? C.INK : '#fff', color: active ? '#fff' : C.INK, fontSize: 15, fontFamily: C.FONT, cursor: 'pointer' }}>
                {f[1]}<span style={{ fontSize: 12, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,.18)' : C.GRAY_100, color: active ? '#fff' : C.GRAY_600 }}>{counts[f[0]]}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <select aria-label="Sort campaigns" value={sortBy} onChange={function (e) { setSortBy(e.target.value); }} style={{ height: 46, minWidth: 180, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 15, fontFamily: C.FONT, color: C.INK, cursor: 'pointer' }}>
            <option value="updated">Recently updated</option>
            <option value="sent">Most sent</option>
            <option value="name">Name A–Z</option>
          </select>
          <div role="group" aria-label="View" style={{ display: 'flex', border: '1px solid ' + C.BORDER, borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
            {(['list', 'grid'] as const).map(function (v) {
              return (
                <button key={v} type="button" aria-pressed={view === v} aria-label={v === 'list' ? 'List view' : 'Grid view'} onClick={function () { setView(v); }}
                  style={{ width: 52, height: 44, border: 'none', background: view === v ? C.INK : '#fff', color: view === v ? '#fff' : C.INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {v === 'list'
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></svg>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '56px 20px', textAlign: 'center', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
          <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 28, fontWeight: 700, color: C.INK }}>No campaigns yet.</div>
          <p style={{ margin: '6px 0 20px', fontSize: 16, color: C.GRAY_600 }}>Send a one-off campaign or set up an automation that follows up after every quiz.</p>
          <Link href="/dashboard/emails/new" className="ec-btn" style={{ background: C.ACCENT, color: '#fff', borderColor: C.ACCENT }}>Create campaign</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.GRAY_600 }}>No campaigns match.</div>
      ) : view === 'list' ? (
        <div style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr><th style={{ ...th, paddingLeft: 24 }}>Campaign</th><th style={th}>Type</th><th style={th}>Status</th><th style={th}>Sent</th><th style={th}>Opened</th><th style={th}>Updated</th><th style={{ ...th, textAlign: 'right', paddingRight: 24 }}>Actions</th></tr>
            </thead>
            <tbody>
              {paginated.map(function (c) {
                var sent = c.sent_count || 0;
                var opened = (c as any).opened_count || 0;
                var snippet = stripHtml(c.html || '').slice(0, 90);
                return (
                  <tr key={c.id} className="ec-row">
                    <td style={{ ...td, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <span style={{ width: 118, height: 66, borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: '1px solid ' + C.BORDER_LIGHT }}><QuizCover id={c.id} title={c.subject || c.name} height={66} compact /></span>
                        <div style={{ minWidth: 0, maxWidth: 320 }}>
                          <Link href={'/dashboard/emails/' + c.id} style={{ fontSize: 17, fontWeight: 500, color: C.INK, textDecoration: 'none' }}>{c.name || c.subject || 'Untitled'}</Link>
                          <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{snippet || c.subject}</div>
                        </div>
                      </div>
                    </td>
                    <td style={td}><TypePill c={c} /></td>
                    <td style={td}><StatusPill c={c} /></td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{sent.toLocaleString()}</td>
                    <td style={td}><div style={{ fontVariantNumeric: 'tabular-nums' }}>{opened.toLocaleString()}</div><div style={{ fontSize: 13, color: C.GRAY_500 }}>{sent > 0 ? Math.round((opened / sent) * 100) + '%' : '—'}</div></td>
                    <td style={{ ...td, color: C.GRAY_600, whiteSpace: 'nowrap' }}>{relTime(c.last_run_at || c.created_at)}</td>
                    <td style={{ ...td, paddingRight: 24 }}><Actions c={c} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ec-grid">
          {paginated.map(function (c) {
            return (
              <article key={c.id} style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
                <div style={{ borderRadius: '7px 7px 0 0', overflow: 'hidden' }}><QuizCover id={c.id} title={c.subject || c.name} height={140} /></div>
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><TypePill c={c} /><StatusPill c={c} /></div>
                  <div style={{ fontSize: 17, fontWeight: 500, color: C.INK }}>{c.name || c.subject || 'Untitled'}</div>
                  <div style={{ fontSize: 14, color: C.GRAY_500, margin: '4px 0 14px' }}>{(c.sent_count || 0).toLocaleString()} sent · {relTime(c.last_run_at || c.created_at)}</div>
                  <Actions c={c} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
          <span style={{ fontSize: 15, color: C.GRAY_600 }}>Showing {paginated.length} of {filtered.length} {filtered.length === 1 ? 'campaign' : 'campaigns'}</span>
          <nav aria-label="Pagination" style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ec-btn" aria-label="Previous page" disabled={safePage <= 1} onClick={function () { setPage(safePage - 1); }} style={{ width: 42, padding: 0, color: safePage <= 1 ? C.GRAY_300 : C.INK }}>←</button>
            {Array.from({ length: totalPages }).map(function (_, i) {
              var n = i + 1;
              return <button key={n} type="button" className="ec-btn" aria-current={n === safePage ? 'page' : undefined} onClick={function () { setPage(n); }} style={{ width: 42, padding: 0, background: n === safePage ? C.ACCENT : '#fff', color: n === safePage ? '#fff' : C.INK, borderColor: n === safePage ? C.ACCENT : C.BORDER }}>{n}</button>;
            })}
            <button type="button" className="ec-btn" aria-label="Next page" disabled={safePage >= totalPages} onClick={function () { setPage(safePage + 1); }} style={{ width: 42, padding: 0, color: safePage >= totalPages ? C.GRAY_300 : C.INK }}>→</button>
          </nav>
        </div>
      )}
    </DashboardShell>
  );
}
