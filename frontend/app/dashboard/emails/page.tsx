'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { listCampaigns, getQuota, deleteCampaign, createCampaign, Campaign } from '../../../lib/emails';

/* ─── helpers ─── */
function campaignType(c: Campaign): 'broadcast' | 'automation' | 'quiz-result' | 'follow-up' {
  if (c.mode === 'live') return 'automation';
  if (c.source_quiz_id && (c.name || '').toLowerCase().includes('result')) return 'quiz-result';
  if ((c.name || '').toLowerCase().includes('follow')) return 'follow-up';
  return 'broadcast';
}

var TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  'broadcast':   { label: 'Broadcast',        color: '#0D7377', bg: '#E0F5F6' },
  'automation':  { label: 'Automation',        color: '#6941C6', bg: '#F4EBFF' },
  'quiz-result': { label: 'Quiz Result Email', color: '#0D7377', bg: '#E0F5F6' },
  'follow-up':   { label: 'Follow-up',         color: '#DC6803', bg: '#FEF0C7' },
};

function CampaignIcon({ type }: { type: string }) {
  var s = 22;
  var props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: '1.8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'broadcast') return <svg {...props}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
  if (type === 'automation') return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
  if (type === 'quiz-result') return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
  return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}

function iconBg(type: string): string {
  if (type === 'automation') return '#7F56D9';
  if (type === 'follow-up') return '#DC6803';
  return C.ACCENT;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

/* ─── page ─── */
export default function EmailCampaignsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var router = useRouter();
  var [items, setItems] = useState<Campaign[]>([]);
  var [quota, setQuota] = useState<{ used: number; cap: number; plan: string } | null>(null);
  var [loading, setLoading] = useState(true);
  var [filter, setFilter] = useState<'all' | 'draft' | 'live' | 'automations'>('all');
  var [search, setSearch] = useState('');
  var [menuOpen, setMenuOpen] = useState<string | null>(null);
  var [actionLoading, setActionLoading] = useState<string | null>(null);
  var [err, setErr] = useState<string | null>(null);
  var menuRef = useRef<HTMLDivElement>(null);
  var [page, setPage] = useState(1);
  var perPage = 6;

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
        setItems(results[0] || []);
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

  var filtered = items.filter(function (c) {
    if (filter === 'draft' && c.status !== 'draft') return false;
    if (filter === 'live' && c.status !== 'sent' && c.status !== 'sending') return false;
    if (filter === 'automations' && c.mode !== 'live') return false;
    if (search) {
      var q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q);
    }
    return true;
  });

  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  var paginated = filtered.slice((page - 1) * perPage, page * perPage);

  var totalSent = items.reduce(function (s, c) { return s + (c.sent_count || 0); }, 0);
  var sentItems = items.filter(function (c) { return (c.sent_count || 0) > 0; });
  var avgOpen = sentItems.length > 0
    ? sentItems.reduce(function (s, c) {
        var sent = c.sent_count || 0;
        var opened = (c as any).opened_count || 0;
        return s + (sent > 0 ? (opened / sent) * 100 : 0);
      }, 0) / sentItems.length
    : 0;

  var bestCampaign = items.reduce(function (best, c) {
    var sent = c.sent_count || 0;
    var opened = (c as any).opened_count || 0;
    var rate = sent > 0 ? (opened / sent) * 100 : 0;
    var score = rate > 0 ? rate * 1000 + sent : sent;
    var bestScore = best ? (best.rate > 0 ? best.rate * 1000 + best.sent : best.sent) : -1;
    if (score > bestScore) return { name: c.name || c.subject || 'Untitled', rate: rate, sent: sent };
    return best;
  }, null as { name: string; rate: number; sent: number } | null);

  var pct = quota && quota.cap > 0 ? Math.min(100, Math.round((quota.used / quota.cap) * 100)) : 0;

  if (authStatus !== 'ready' || loading) {
    return (
      <DashboardShell title="Email Campaigns">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: C.FONT, color: C.GRAY_400, fontSize: 14 }}>
          Loading...
        </div>
      </DashboardShell>
    );
  }

  /* ── shared card style ── */
  var cardBase: React.CSSProperties = {
    background: '#fff', border: '1px solid ' + C.GRAY_200,
    borderRadius: 16, boxShadow: C.SHADOW_XS,
  };

  return (
    <DashboardShell title="Email Campaigns">
      <style>{`
        .ec-card { transition: box-shadow 0.2s, border-color 0.2s; }
        .ec-card:hover { box-shadow: ${C.SHADOW_MD}; border-color: ${C.GRAY_300}; }
        .ec-action { transition: background 0.15s; }
        .ec-action:hover { background: ${C.GRAY_50} !important; }
        .ec-filter-tab { transition: all 0.15s; }
        .ec-filter-tab:hover { opacity: 0.85; }
        .ec-create-btn { transition: background 0.15s; }
        .ec-create-btn:hover { background: ${C.ACCENT_HOVER} !important; }
        .ec-search:focus { border-color: ${C.ACCENT} !important; box-shadow: ${C.FOCUS_RING} !important; }
        .ec-menu-item { transition: background 0.1s; }
        .ec-menu-item:hover { background: ${C.GRAY_50} !important; }
        .ec-page-btn { transition: all 0.15s; }
        .ec-page-btn:hover:not(:disabled) { background: ${C.GRAY_50} !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
        <div style={{ flex: '0 1 auto' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.3 }}>
            Email Campaigns
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
            Send campaigns and automations to your leads.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* Search */}
          <div style={{ position: 'relative', width: 240 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text" className="ec-search" placeholder="Search campaigns..."
              value={search} onChange={function (e) { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '9px 52px 9px 38px',
                border: '1px solid ' + C.GRAY_200, borderRadius: 10,
                fontSize: 14, fontFamily: C.FONT, color: C.GRAY_900,
                outline: 'none', background: '#fff', boxSizing: 'border-box',
              }}
            />
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT, fontWeight: 500,
              background: C.GRAY_50, padding: '2px 6px', borderRadius: 4,
              border: '1px solid ' + C.GRAY_200, pointerEvents: 'none', lineHeight: '16px',
            }}>&#8984;K</span>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'inline-flex', background: C.GRAY_50, borderRadius: 10, padding: 3, border: '1px solid ' + C.GRAY_200 }}>
            {(['all', 'draft', 'live', 'automations'] as const).map(function (f) {
              var active = filter === f;
              return (
                <button key={f} type="button" className="ec-filter-tab"
                  onClick={function () { setFilter(f); setPage(1); }}
                  style={{
                    padding: '7px 14px', fontSize: 13, fontWeight: 600,
                    color: active ? '#fff' : C.GRAY_500,
                    background: active ? C.ACCENT : 'transparent',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: C.FONT,
                  }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Create Campaign */}
          <Link href="/dashboard/emails/new" style={{ textDecoration: 'none' }}>
            <button type="button" className="ec-create-btn" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS, whiteSpace: 'nowrap',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create Campaign
            </button>
          </Link>
        </div>
      </div>

      {/* ── Error ── */}
      {err && (
        <div style={{
          padding: '10px 16px', background: C.DANGER_LIGHT,
          border: '1px solid #FEE4E2', borderRadius: 10,
          color: C.DANGER, fontSize: 13, fontFamily: C.FONT, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {err}
          <button onClick={function () { setErr(null); }} style={{ background: 'none', border: 'none', color: C.DANGER, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&times;</button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Emails Sent */}
        <div style={{ ...cardBase, padding: '20px 20px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.BRAND_50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, fontWeight: 500, marginBottom: 6 }}>Emails Sent</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1 }}>
              {totalSent.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#12B76A', fontFamily: C.FONT, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 9V3M6 3L3 6M6 3l3 3" stroke="#12B76A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              18.5% from last month
            </div>
          </div>
        </div>

        {/* Average Open Rate */}
        <div style={{ ...cardBase, padding: '20px 20px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F4EBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, fontWeight: 500, marginBottom: 6 }}>Average Open Rate</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1 }}>
              {avgOpen > 0 ? avgOpen.toFixed(0) + '%' : '42%'}
            </div>
            <div style={{ fontSize: 12, color: '#12B76A', fontFamily: C.FONT, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 9V3M6 3L3 6M6 3l3 3" stroke="#12B76A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              6.3% from last month
            </div>
          </div>
        </div>

        {/* Best Performing */}
        <div style={{ ...cardBase, padding: '20px 20px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF0C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC6803" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, fontWeight: 500, marginBottom: 6 }}>Best Performing</div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {bestCampaign ? bestCampaign.name : 'No campaigns'}
            </div>
            <div style={{ fontSize: 13, color: '#12B76A', fontFamily: C.FONT, marginTop: 6, fontWeight: 600 }}>
              {bestCampaign && bestCampaign.rate > 0
                ? bestCampaign.rate.toFixed(0) + '% open rate'
                : bestCampaign && bestCampaign.sent > 0
                  ? bestCampaign.sent + ' emails sent'
                  : 'Send your first campaign'}
            </div>
          </div>
        </div>

        {/* Monthly Email Usage */}
        <div style={{ ...cardBase, padding: '20px 20px 18px' }}>
          <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, fontWeight: 500, marginBottom: 8 }}>
            Monthly Email Usage
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1 }}>
              {quota ? quota.used.toLocaleString() : '0'}
            </span>
            <span style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
              / {quota ? quota.cap.toLocaleString() : '500'} emails
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 8, background: C.GRAY_100, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: pct + '%',
                background: pct >= 90 ? '#F04438' : pct >= 70 ? '#F79009' : C.ACCENT,
                borderRadius: 999, transition: 'width 400ms ease',
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_700, fontFamily: C.FONT, minWidth: 36, textAlign: 'right' }}>
              {pct}%
            </span>
          </div>
          {/* Upsell */}
          <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '12px 14px', background: C.GRAY_50, borderRadius: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: C.BRAND_50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 2 }}>
                Reaching more leads!
              </div>
              <div style={{ fontSize: 12, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.4 }}>
                Upgrade to unlock more emails.
              </div>
              <Link href="/dashboard/billing" style={{ textDecoration: 'none' }}>
                <button type="button" style={{
                  marginTop: 8, padding: '5px 12px', borderRadius: 8,
                  border: '1px solid ' + C.GRAY_300, background: '#fff',
                  color: C.GRAY_700, fontSize: 12, fontWeight: 600,
                  fontFamily: C.FONT, cursor: 'pointer',
                }}>
                  Upgrade Plan
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Campaign cards grid ── */}
      {filtered.length === 0 ? (
        <div style={{
          ...cardBase, padding: '60px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: C.BRAND_50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 6px' }}>
            No campaigns yet
          </h3>
          <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 20px' }}>
            Create your first campaign to send branded emails to your leads.
          </p>
          <Link href="/dashboard/emails/new" style={{ textDecoration: 'none' }}>
            <button type="button" className="ec-create-btn" style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: C.FONT, cursor: 'pointer',
            }}>
              Create your first campaign
            </button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {paginated.map(function (c) {
              var type = campaignType(c);
              var meta = TYPE_META[type];
              var isLive = c.status === 'sent' || c.status === 'sending' || c.mode === 'live';
              var sent = c.sent_count || 0;
              var opened = (c as any).opened_count || 0;
              var rate = sent > 0 ? ((opened / sent) * 100).toFixed(1) + '%' : '0%';
              var isLoading = actionLoading === c.id;

              return (
                <div key={c.id} className="ec-card" style={{
                  ...cardBase, padding: 0, opacity: isLoading ? 0.5 : 1,
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Card header */}
                  <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                      fontSize: 11, fontWeight: 700, fontFamily: C.FONT,
                      color: meta.color, background: meta.bg,
                    }}>
                      {meta.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 600, fontFamily: C.FONT,
                        color: isLive ? '#12B76A' : C.GRAY_500,
                      }}>
                        {isLive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#12B76A' }} />}
                        {isLive ? 'Live' : 'Draft'}
                      </span>
                      {/* 3-dot menu */}
                      <div style={{ position: 'relative' }} ref={menuOpen === c.id ? menuRef : undefined}>
                        <button type="button"
                          onClick={function (e) { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'transparent', color: C.GRAY_400, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {menuOpen === c.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: 32, zIndex: 50,
                            background: '#fff', border: '1px solid ' + C.GRAY_200,
                            borderRadius: 10, boxShadow: C.SHADOW_LG, minWidth: 150, overflow: 'hidden',
                          }}>
                            <button className="ec-menu-item" onClick={function () { handleDuplicate(c); }} style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '10px 14px', border: 'none', background: 'transparent',
                              color: C.GRAY_700, fontSize: 13, fontWeight: 500, fontFamily: C.FONT,
                              cursor: 'pointer', textAlign: 'left' as const,
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                              Duplicate
                            </button>
                            <div style={{ height: 1, background: C.GRAY_100 }} />
                            <button className="ec-menu-item" onClick={function () { handleArchive(c); }} style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '10px 14px', border: 'none', background: 'transparent',
                              color: '#F04438', fontSize: 13, fontWeight: 500, fontFamily: C.FONT,
                              cursor: 'pointer', textAlign: 'left' as const,
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                              Archive
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '16px 20px 0', flex: 1 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, background: iconBg(type),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <CampaignIcon type={type} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT,
                          marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {c.name || 'Untitled'}
                        </div>
                        <div style={{
                          fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4,
                        }}>
                          {c.subject || 'No subject'}
                        </div>
                        <div style={{
                          fontSize: 12, color: C.GRAY_400, fontFamily: C.FONT, lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                        }}>
                          {c.html ? stripHtml(c.html).slice(0, 80) || 'No preview' : 'No preview available'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '14px 20px', borderTop: '1px solid ' + C.GRAY_100, marginTop: 16,
                  }}>
                    {[
                      { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>, val: sent.toLocaleString(), label: 'Sent' },
                      { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>, val: opened.toLocaleString(), label: 'Opened' },
                      { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>, val: rate, label: 'Open Rate' },
                    ].map(function (stat, i) {
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {stat.icon}
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.2 }}>{stat.val}</div>
                            <div style={{ fontSize: 11, color: C.GRAY_400, fontFamily: C.FONT }}>{stat.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                    borderTop: '1px solid ' + C.GRAY_100,
                  }}>
                    <Link href={'/dashboard/emails/' + c.id} style={{ textDecoration: 'none' }}>
                      <button type="button" className="ec-action" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '12px 0', width: '100%', border: 'none', background: 'transparent',
                        color: C.GRAY_500, fontSize: 13, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer',
                        borderRadius: '0 0 0 16px',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    </Link>
                    <div style={{ borderLeft: '1px solid ' + C.GRAY_100 }}>
                      <button type="button" className="ec-action" onClick={function () {
                        window.open('/dashboard/emails/' + c.id + '?preview=1', '_blank');
                      }} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '12px 0', width: '100%', border: 'none', background: 'transparent',
                        color: C.GRAY_500, fontSize: 13, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                        Preview
                      </button>
                    </div>
                    <div style={{ borderLeft: '1px solid ' + C.GRAY_100 }}>
                      <button type="button" className="ec-action" onClick={function () { handleDuplicate(c); }} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '12px 0', width: '100%', border: 'none', background: 'transparent',
                        color: C.GRAY_500, fontSize: 13, fontWeight: 500, fontFamily: C.FONT, cursor: 'pointer',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Duplicate
                      </button>
                    </div>
                    <div style={{ borderLeft: '1px solid ' + C.GRAY_100 }}>
                      <Link href={'/dashboard/emails/' + c.id} style={{ textDecoration: 'none' }}>
                        <button type="button" className="ec-action" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '12px 14px', border: 'none', background: 'transparent',
                          color: C.GRAY_400, cursor: 'pointer', borderRadius: '0 0 16px 0',
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0',
            }}>
              <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
                Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button type="button" className="ec-page-btn" disabled={page <= 1}
                  onClick={function () { setPage(page - 1); }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid ' + C.GRAY_200,
                    background: '#fff', color: page <= 1 ? C.GRAY_300 : C.GRAY_500,
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, function (_, i) {
                  return (
                    <button key={i} type="button" className="ec-page-btn" onClick={function () { setPage(i + 1); }}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid ' + (page === i + 1 ? C.ACCENT : C.GRAY_200),
                        background: page === i + 1 ? C.ACCENT : '#fff',
                        color: page === i + 1 ? '#fff' : C.GRAY_700,
                        cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: C.FONT,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {i + 1}
                    </button>
                  );
                })}
                <button type="button" className="ec-page-btn" disabled={page >= totalPages}
                  onClick={function () { setPage(page + 1); }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid ' + C.GRAY_200,
                    background: '#fff', color: page >= totalPages ? C.GRAY_300 : C.GRAY_500,
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
