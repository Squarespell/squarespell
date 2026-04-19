'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, PageLoading, Pill } from '../_components/PageShell';
import { listCampaigns, getQuota, deleteCampaign, createCampaign, Campaign } from '../../../lib/emails';

type StatusVariant = 'live' | 'draft' | 'neutral' | 'accent';

function statusVariant(s: string): StatusVariant {
  if (s === 'sent' || s === 'sending') return 'live';
  if (s === 'draft') return 'draft';
  if (s === 'scheduled') return 'accent';
  return 'neutral';
}

function statusLabel(s: string): string {
  if (s === 'sent') return 'Sent';
  if (s === 'sending') return 'Sending';
  if (s === 'draft') return 'Draft';
  if (s === 'scheduled') return 'Scheduled';
  if (s === 'failed') return 'Failed';
  return s;
}

function quotaBarColor(pct: number): string {
  if (pct >= 90) return '#ff5c5c';
  if (pct >= 70) return '#ffb020';
  return C.ACCENT;
}

function timeAgo(dateStr: string): string {
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diff = now - then;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  var days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

export default function EmailsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var router = useRouter();
  var [items, setItems] = useState<Campaign[]>([]);
  var [quota, setQuota] = useState<{used:number;cap:number;plan:string}|null>(null);
  var [loading, setLoading] = useState(true);
  var [err, setErr] = useState<string | null>(null);
  var [menuOpen, setMenuOpen] = useState<string | null>(null);
  var [actionLoading, setActionLoading] = useState<string | null>(null);
  var menuRef = useRef<HTMLDivElement>(null);

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    (async function() {
      try {
        var results = await Promise.all([
          listCampaigns().catch(function() { return [] as Campaign[]; }),
          getQuota().catch(function() { return null; }),
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
    return function() { cancelled = true; };
  }, [token]);

  // Close menu on outside click
  useEffect(function() {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    if (menuOpen) { document.addEventListener('mousedown', handleClick); }
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [menuOpen]);

  var handleArchive = async function(campaign: Campaign) {
    setActionLoading(campaign.id);
    setMenuOpen(null);
    try {
      await deleteCampaign(campaign.id);
      setItems(function(prev) { return prev.filter(function(c) { return c.id !== campaign.id; }); });
    } catch (e: any) {
      setErr('Could not archive: ' + (e?.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  var handleDuplicate = async function(campaign: Campaign) {
    setActionLoading(campaign.id);
    setMenuOpen(null);
    try {
      var dup = await createCampaign({
        name: (campaign.name || 'Untitled') + ' (copy)',
        subject: campaign.subject,
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        html: campaign.html,
        mode: campaign.mode || 'blast',
        source_quiz_id: campaign.source_quiz_id || undefined,
        source_filters: campaign.source_filters || undefined,
      } as any);
      router.push('/dashboard/emails/' + dup.id);
    } catch (e: any) {
      setErr('Could not duplicate: ' + (e?.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  if (authStatus !== 'ready' || loading) {
    return <DashboardShell><PageLoading /></DashboardShell>;
  }

  var pct = quota && quota.cap > 0 ? Math.min(100, Math.round((quota.used / quota.cap) * 100)) : 0;
  var barColor = quotaBarColor(pct);
  var totalSent = items.reduce(function(sum, c) { return sum + (c.sent_count || 0); }, 0);

  return (
    <DashboardShell>
      <PageHeader
        title="Emails"
        subtitle="Send campaigns and automations to your leads."
        actions={
          <Link href="/dashboard/emails/new">
            <PrimaryButton>New campaign</PrimaryButton>
          </Link>
        }
      />

      {quota && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, marginBottom: 10 }}>
            <div>
              <div style={{ color: C.TEXT, fontWeight: 600 }}>Monthly email usage</div>
              <div style={{ color: C.TEXT_MUTED, fontSize: 12, marginTop: 2 }}>Plan: {quota.plan}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.TEXT, fontWeight: 600 }}>
                {quota.used.toLocaleString()} / {quota.cap.toLocaleString()}
              </div>
              <div style={{ color: C.TEXT_MUTED, fontSize: 12, marginTop: 2 }}>{pct}% used</div>
            </div>
          </div>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: barColor, transition: 'width 400ms ease' }} />
          </div>
          {pct >= 90 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#ff5c5c' }}>
              You have used {pct}% of your monthly cap. Upgrade your plan to keep sending without interruption.
            </div>
          )}
          {pct >= 70 && pct < 90 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#ffb020' }}>
              You are approaching your monthly cap. Consider upgrading soon.
            </div>
          )}
        </Card>
      )}

      {/* Quick links */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Link href="/dashboard/emails/deliverability" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 6,
          background: C.ELEVATED, border: '1px solid ' + C.BORDER,
          color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Deliverability
        </Link>
        <Link href="/dashboard/emails/suppressions" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 6,
          background: C.ELEVATED, border: '1px solid ' + C.BORDER,
          color: C.TEXT_MUTED, fontSize: 12, fontWeight: 600,
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          Suppressions
        </Link>
      </div>

      {err && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#ff5c5c', fontSize: 14 }}>{err}</div>
            <button onClick={function() { setErr(null); }} style={{
              background: 'none', border: 'none', color: C.TEXT_MUTED, cursor: 'pointer', fontSize: 12,
            }}>Dismiss</button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          body="Create your first campaign to send branded emails to your leads."
          action={
            <Link href="/dashboard/emails/new">
              <PrimaryButton>Create your first campaign</PrimaryButton>
            </Link>
          }
        />
      ) : (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ color: C.TEXT, fontWeight: 600 }}>
              {items.length} campaign{items.length === 1 ? '' : 's'}
            </div>
            <div style={{ color: C.TEXT_MUTED, fontSize: 13 }}>
              {totalSent.toLocaleString()} total sent
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.TEXT_MUTED, fontSize: 11, textTransform: 'uppercase' as any, letterSpacing: 0.5 }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Subject</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Sent</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Created</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(function(c) {
                  var isLoading = actionLoading === c.id;
                  return (
                    <tr key={c.id}
                      style={{
                        borderTop: '1px solid ' + C.BORDER,
                        opacity: isLoading ? 0.5 : 1,
                        transition: 'background 0.1s, opacity 0.2s',
                      }}
                      onMouseEnter={function(e) { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                      onMouseLeave={function(e) { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 12px', color: C.TEXT, fontWeight: 500 }}>
                        <Link href={'/dashboard/emails/' + c.id} style={{ color: C.TEXT, textDecoration: 'none' }}>
                          {c.name || 'Untitled campaign'}
                        </Link>
                      </td>
                      <td style={{ padding: '14px 12px', color: C.TEXT_MUTED, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.subject || 'No subject'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <Pill variant={statusVariant(c.status)}>{statusLabel(c.status)}</Pill>
                      </td>
                      <td style={{ padding: '14px 12px', color: C.TEXT, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {(c.sent_count || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 12px', color: C.TEXT_MUTED, fontSize: 13 }}>
                        {timeAgo(c.created_at)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Link href={'/dashboard/emails/' + c.id} style={{
                            color: C.ACCENT, fontSize: 13, textDecoration: 'none', fontWeight: 500,
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid ' + C.ACCENT,
                            background: 'transparent',
                            transition: 'background 0.1s',
                          }}>
                            Open
                          </Link>
                          <div style={{ position: 'relative' }} ref={menuOpen === c.id ? menuRef : undefined}>
                            <button
                              onClick={function(e) {
                                e.stopPropagation();
                                setMenuOpen(function(prev) { return prev === c.id ? null : c.id; });
                              }}
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: '1px solid ' + (menuOpen === c.id ? C.ACCENT : C.BORDER),
                                background: menuOpen === c.id ? C.ACCENT_LIGHT : 'transparent',
                                color: menuOpen === c.id ? C.ACCENT : C.TEXT_MUTED,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.1s',
                              }}
                              title="More actions"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>

                            {menuOpen === c.id && (
                              <div style={{
                                position: 'absolute', right: 0, top: 36, zIndex: 50,
                                background: '#FFFFFF', border: '1px solid ' + C.BORDER,
                                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                minWidth: 160, overflow: 'hidden',
                              }}>
                                <MenuAction
                                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                                  label="Duplicate"
                                  onClick={function() { handleDuplicate(c); }}
                                />
                                {c.status === 'draft' && (
                                  <MenuAction
                                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                                    label="Edit"
                                    onClick={function() { setMenuOpen(null); router.push('/dashboard/emails/' + c.id); }}
                                  />
                                )}
                                <div style={{ height: 1, background: C.BORDER, margin: '2px 0' }} />
                                <MenuAction
                                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M1 4h22"/><path d="M10 4V2h4v2"/></svg>}
                                  label="Archive"
                                  color="#dc2626"
                                  onClick={function() { handleArchive(c); }}
                                  disabled={c.status === 'sending'}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}

function MenuAction({ icon, label, onClick, color, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; color?: string; disabled?: boolean;
}) {
  var [hover, setHover] = useState(false);
  return (
    <button
      onClick={function(e) { e.stopPropagation(); if (!disabled) onClick(); }}
      onMouseEnter={function() { setHover(true); }}
      onMouseLeave={function() { setHover(false); }}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '10px 14px', border: 'none',
        background: hover ? 'rgba(0,0,0,0.04)' : 'transparent',
        color: disabled ? C.TEXT_MUTED : (color || C.TEXT),
        fontSize: 13, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left' as any, transition: 'background 0.1s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ color: disabled ? C.TEXT_MUTED : (color || C.TEXT_SUBTLE), display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
}
