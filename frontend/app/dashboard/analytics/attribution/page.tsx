'use client';

/**
 * /dashboard/analytics/attribution - Cross-quiz attribution (2026 redesign, screen 11: "From quiz to customer.").
 *
 * A five-stage journey (views, leads, emails sent, email clicks, revenue) summed across quizzes, then a per-quiz
 * table. Rows with outcome data expand to an outcome breakdown. Rates with no denominator show a dash, never 0%.
 */

import { useEffect, useMemo, useState, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { DashboardShell } from '../../_components/DashboardShell';
import { DASHBOARD_COLORS as C } from '../../_components/dashboardColors';
import { DisplayTitle, Breadcrumb, EmptyState, PageLoading } from '../../_components/PageShell';
import { QuizCover } from '../../_components/QuizCover';
import { api } from '@/lib/api';

interface OutcomeAttribution { outcome_id: string; outcome_name: string; leads: number }

interface QuizAttribution {
  quiz_id: string;
  quiz_title: string;
  views: number;
  leads: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  revenue_cents: number;
  outcomes: OutcomeAttribution[];
}

interface Totals { leads: number; emails_sent: number; emails_opened: number; emails_clicked: number; revenue_cents: number }

var EMPTY_TOTALS: Totals = { leads: 0, emails_sent: 0, emails_opened: 0, emails_clicked: 0, revenue_cents: 0 };

function pct(num: number, den: number): string {
  if (!den) return '–';
  return ((num / den) * 100).toFixed(1) + '%';
}

function dollars(cents: number): string {
  if (!cents) return '$0';
  return '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

var PAGE_CSS = `
  .sq-journey { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); background: #fff; border: 1px solid ${C.BORDER}; border-radius: 8px; margin-bottom: 44px; }
  .sq-journey-step { position: relative; display: flex; gap: 16px; padding: 26px 28px; min-width: 0; }
  .sq-journey-step + .sq-journey-step::before { content: ''; position: absolute; left: 0; top: 26px; bottom: 26px; border-left: 1px solid ${C.BORDER}; }
  .sq-journey-arrow { position: absolute; right: -9px; top: 50%; transform: translateY(-50%); color: ${C.INK}; background: #fff; z-index: 1; display: flex; }
  .sq-attr-row:hover { background: ${C.GRAY_25}; }
  .sq-attr-hero-art { display: block; }
  @media (max-width: 1180px) { .sq-journey { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sq-journey-arrow { display: none; } .sq-journey-step + .sq-journey-step::before { display: none; } .sq-attr-hero-art { display: none; } }
`;

var ICONS: Record<string, React.ReactNode> = {
  views: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  leads: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></svg>,
  emails: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  clicks: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 3 14 7-6 2-2 6z" /></svg>,
  revenue: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.2-4.5 3.2c0 4.3 9 2.3 9 6.8 0 2-2 3.3-4.5 3.3s-4.5-1.2-4.5-3.2" /></svg>,
};

function JourneyStep({ icon, label, value, caption, last, acid }: { icon: string; label: string; value: string; caption: string; last?: boolean; acid?: boolean }) {
  return (
    <div className="sq-journey-step">
      <span style={{ width: 52, height: 52, borderRadius: '50%', background: acid ? C.ACID_SOFT : C.PERIWINKLE_SOFT, color: C.INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ICONS[icon]}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: C.INK, marginTop: 12 }}>{label}</div>
        <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', color: C.INK, lineHeight: 1.1, margin: '6px 0 8px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 14, color: C.GRAY_500 }}>{caption}</div>
      </div>
    </div>
  );
}

export default function AttributionPage() {
  var [quizzes, setQuizzes] = useState<QuizAttribution[]>([]);
  var [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState('');
  var [filter, setFilter] = useState('all');
  var [expanded, setExpanded] = useState<string | null>(null);

  var loadData = useCallback(function () {
    setLoading(true);
    api.getAttribution()
      .then(function (d: any) {
        setQuizzes(Array.isArray(d?.quizzes) ? d.quizzes : []);
        setTotals(Object.assign({}, EMPTY_TOTALS, d?.totals || {}));
      })
      .catch(function () { setQuizzes([]); setTotals(EMPTY_TOTALS); })
      .finally(function () { setLoading(false); });
  }, []);

  useEffect(function () { loadData(); }, [loadData]);

  var totalViews = useMemo(function () { return quizzes.reduce(function (s, q) { return s + (q.views || 0); }, 0); }, [quizzes]);

  var shown = useMemo(function () {
    var term = search.trim().toLowerCase();
    return quizzes.filter(function (q) {
      if (term && (q.quiz_title || '').toLowerCase().indexOf(term) < 0) return false;
      if (filter === 'leads') return q.leads > 0;
      if (filter === 'revenue') return q.revenue_cents > 0;
      if (filter === 'emails') return q.emails_sent > 0;
      return true;
    });
  }, [quizzes, search, filter]);

  if (loading) {
    return <DashboardShell title="Attribution"><PageLoading /></DashboardShell>;
  }

  var th: React.CSSProperties = { padding: '14px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.GRAY_500, textAlign: 'center', borderBottom: '1px solid ' + C.BORDER, whiteSpace: 'nowrap' };
  var td: React.CSSProperties = { padding: '12px 16px', fontSize: 15, color: C.INK, textAlign: 'center', borderBottom: '1px solid ' + C.BORDER_LIGHT, fontVariantNumeric: 'tabular-nums' };

  return (
    <DashboardShell title="Attribution">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* Hero */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 40 }}>
        <div style={{ minWidth: 0, maxWidth: 900 }}>
          <Breadcrumb items={[{ label: 'Analytics', href: '/dashboard/analytics' }, { label: 'Attribution' }]} />
          <DisplayTitle size="xl">From quiz to customer.</DisplayTitle>
          <p style={{ margin: '16px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Track the full journey from quiz view to conversion across all quizzes.</p>
        </div>
        <svg className="sq-attr-hero-art" width="360" height="190" viewBox="0 0 360 190" aria-hidden="true" style={{ flexShrink: 0, marginTop: -8 }}>
          <path d="M20 170 C 20 90, 60 50, 150 46 L 170 46" fill="none" stroke={C.INK} strokeWidth="1.2" />
          <path d="M162 40 L 170 46 L 162 52" fill="none" stroke={C.INK} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="42" cy="84" r="9" fill={C.ACID} />
          <text x="54" y="136" fontSize="10" letterSpacing="2.4" fill={C.INK} fontFamily="Inter">CURIOSITY</text>
          <text x="54" y="152" fontSize="10" letterSpacing="2.4" fill={C.INK} fontFamily="Inter">LEADS TO</text>
          <text x="54" y="168" fontSize="10" letterSpacing="2.4" fill={C.INK} fontFamily="Inter">OPPORTUNITY</text>
          <rect x="220" y="0" width="140" height="190" fill={C.PERIWINKLE} />
          <path d="M220 60 A 120 120 0 0 1 340 180 L 340 190 L 220 190 Z" fill={C.ACCENT} />
        </svg>
      </div>

      {/* Journey */}
      <div className="sq-journey">
        <JourneyStep icon="views" label="Views" value={totalViews.toLocaleString()} caption="Total quiz views" />
        <JourneyStep icon="leads" label="Leads" value={totals.leads.toLocaleString()} caption="People who opted in" />
        <JourneyStep icon="emails" label="Emails" value={totals.emails_sent.toLocaleString()} caption={totals.emails_sent > 0 ? 'Emails sent · ' + pct(totals.emails_opened, totals.emails_sent) + ' opened' : 'Emails sent'} />
        <JourneyStep icon="clicks" label="Clicks" value={totals.emails_clicked.toLocaleString()} caption={totals.emails_sent > 0 ? 'Email clicks · ' + pct(totals.emails_clicked, totals.emails_sent) + ' CTR' : 'Email clicks'} />
        <JourneyStep icon="revenue" label="Revenue" value={dollars(totals.revenue_cents)} caption={totals.revenue_cents > 0 ? 'Total revenue' : 'No payments yet'} last acid />
      </div>

      {/* Per-quiz performance */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: C.DISPLAY_FONT, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', color: C.INK }}>Quiz performance</h2>
          <p style={{ margin: '6px 0 0', fontSize: 16, color: C.GRAY_600 }}>See how each quiz contributes to your growth.</p>
        </div>
        {quizzes.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 14, color: C.GRAY_500, display: 'flex' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </span>
              <input type="search" aria-label="Search quizzes" placeholder="Search quizzes..." value={search} onChange={function (e) { setSearch(e.target.value); }}
                style={{ width: 320, maxWidth: '100%', height: 44, padding: '0 14px 0 42px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 15, fontFamily: C.FONT, color: C.INK }} />
            </label>
            <select aria-label="Filter quizzes" value={filter} onChange={function (e) { setFilter(e.target.value); }}
              style={{ height: 44, padding: '0 14px', minWidth: 180, borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 15, fontFamily: C.FONT, color: C.INK, cursor: 'pointer' }}>
              <option value="all">All quizzes</option>
              <option value="leads">With leads</option>
              <option value="emails">With emails sent</option>
              <option value="revenue">With revenue</option>
            </select>
          </div>
        )}
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ICONS.views}
          title="No attribution data yet"
          body="Publish quizzes and send email campaigns to follow people from their first view to a sale."
        />
      ) : (
        <div style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left', paddingLeft: 28 }}>Quiz</th>
                <th style={th}>Views</th><th style={th}>Leads</th><th style={th}>Emails</th><th style={th}>Click rate</th><th style={th}>Revenue</th><th style={th} />
              </tr>
            </thead>
            <tbody>
              {shown.map(function (q) {
                var open = expanded === q.quiz_id;
                var hasOutcomes = Array.isArray(q.outcomes) && q.outcomes.length > 0;
                return (
                  <Fragment key={q.quiz_id}>
                    <tr className="sq-attr-row">
                      <td style={{ ...td, textAlign: 'left', paddingLeft: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <span style={{ width: 96, height: 52, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}><QuizCover id={q.quiz_id} title={q.quiz_title} height={52} compact /></span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 16 }}>{q.quiz_title || 'Untitled quiz'}</div>
                            {hasOutcomes && (
                              <button type="button" aria-expanded={open} onClick={function () { setExpanded(open ? null : q.quiz_id); }}
                                style={{ marginTop: 4, padding: 0, border: 'none', background: 'none', color: C.ACCENT, fontSize: 13, cursor: 'pointer', fontFamily: C.FONT }}>
                                {open ? 'Hide outcomes' : 'Outcome breakdown'}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={td}>{(q.views || 0).toLocaleString()}</td>
                      <td style={td}>{(q.leads || 0).toLocaleString()}</td>
                      <td style={td}>{(q.emails_sent || 0).toLocaleString()}</td>
                      <td style={td}>{pct(q.emails_clicked, q.emails_sent)}</td>
                      <td style={td}>{dollars(q.revenue_cents)}</td>
                      <td style={{ ...td, paddingRight: 28, textAlign: 'right' }}>
                        <Link href={'/dashboard/analytics/' + q.quiz_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 38, padding: '0 18px', borderRadius: 6, border: '1px solid ' + C.BORDER, color: C.INK, fontSize: 15, textDecoration: 'none', background: '#fff' }}>
                          View
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </Link>
                      </td>
                    </tr>
                    {open && hasOutcomes && (
                      <tr>
                        <td colSpan={7} style={{ padding: '6px 28px 18px 140px', background: C.GRAY_25, borderBottom: '1px solid ' + C.BORDER_LIGHT }}>
                          {q.outcomes.map(function (o) {
                            var share = q.leads > 0 ? (o.leads / q.leads) * 100 : 0;
                            return (
                              <div key={o.outcome_id} style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr) 90px 60px', gap: 14, alignItems: 'center', padding: '6px 0', fontSize: 14 }}>
                                <span style={{ color: C.INK }}>{o.outcome_name}</span>
                                <span style={{ height: 6, borderRadius: 3, background: C.GRAY_100, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: share + '%', background: C.ACCENT }} /></span>
                                <span style={{ color: C.GRAY_600, textAlign: 'right' }}>{o.leads} {o.leads === 1 ? 'lead' : 'leads'}</span>
                                <span style={{ color: C.GRAY_500, textAlign: 'right' }}>{pct(o.leads, q.leads)}</span>
                              </div>
                            );
                          })}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, color: C.GRAY_500 }}>No quizzes match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
