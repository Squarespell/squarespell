'use client';
import { EmptyState } from '@/app/dashboard/_components/PageShell';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './analytics.module.css';
export default function AnalyticsPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [excludeBots, setExcludeBots] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sq_exclude_bots') === 'true';
    }
    return false;
  });
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [heatmap, setHeatmap] = useState<any>(null);

  function sinceDate(range: string): string | undefined {
    if (range === 'all') return undefined;
    var days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }

  function rangeName(range: string): string {
    if (range === '7d') return 'Last 7 days';
    if (range === '30d') return 'Last 30 days';
    if (range === '90d') return 'Last 90 days';
    return 'All time';
  }

  const loadData = useCallback((filterBots: boolean, range: string) => {
    setLoading(true);
    var since = range === 'all' ? undefined : sinceDate(range);
    Promise.all([
      api.getQuiz(params.quizId),
      api.getAnalytics(params.quizId, { exclude_bots: filterBots, since: since }),
      api.getLeads(params.quizId).catch(function() { return []; }),
      api.getFunnel(params.quizId, { exclude_bots: filterBots }),
      api.getQuestionHeatmap(params.quizId).catch(function () { return null; }),
    ]).then(([q, s, l, f, h]) => { setQuiz(q); setStats(s); setLeads(l); setFunnel(f); setHeatmap(h); }).finally(() => setLoading(false));
  }, [params.quizId]);

  useEffect(() => {
    loadData(excludeBots, dateRange);
  }, [params.quizId, excludeBots, dateRange, loadData]);

  function toggleBotFilter() {
    const next = !excludeBots;
    setExcludeBots(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sq_exclude_bots', String(next));
    }
  }

  function exportCsv() {
    setExporting(true);
    var apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';
    var clerk = typeof window !== 'undefined' ? (window as any).Clerk : null;
    var tokenPromise = clerk && clerk.session ? clerk.session.getToken() : Promise.resolve('');
    tokenPromise.then(function(token: string) {
      var headers: Record<string, string> = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(apiUrl + '/api/quizzes/' + params.quizId + '/leads/export', { headers: headers });
    }).then(function(res: Response) {
      return res.blob();
    }).then(function(blob: Blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (quiz?.title || 'leads') + '-leads.csv';
      a.click();
      URL.revokeObjectURL(url);
    }).finally(function() { setExporting(false); });
  }
  if (loading) return <div className={styles.loading}>Loading analytics...</div>;
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.push(`/dashboard/${params.quizId}`)}>&#8592; Back to editor</button>
        <div><h1 className={styles.title}>{quiz?.title}</h1><div className={`${styles.status} ${quiz?.status==='live'?styles.live:styles.draft}`}>{quiz?.status}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.04)', borderRadius: 6, padding: 2 }}>
            {(['7d', '30d', '90d', 'all'] as const).map(function (r) {
              var active = r === dateRange;
              return (
                <button
                  key={r}
                  onClick={function () { setDateRange(r); }}
                  style={{
                    padding: '5px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s ease',
                    background: active ? 'rgba(13,115,119,0.15)' : 'transparent',
                    color: active ? '#0D7377' : 'rgba(0,0,0,0.4)',
                  }}
                >
                  {r === 'all' ? 'All' : r}
                </button>
              );
            })}
          </div>
          <button
            onClick={toggleBotFilter}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
              background: excludeBots ? 'rgba(13,115,119,0.1)' : 'rgba(0,0,0,0.06)',
              border: excludeBots ? '1px solid rgba(13,115,119,0.3)' : '1px solid rgba(0,0,0,0.12)',
              color: excludeBots ? '#0D7377' : 'rgba(0,0,0,0.5)',
            }}
            title={excludeBots ? 'Bot traffic is excluded from analytics' : 'Bot traffic is included in analytics'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
            {excludeBots ? 'Bots excluded' : 'Include bots'}
          </button>
          <button
            onClick={function () { router.push('/dashboard/analytics/' + params.quizId + '/ab-tests'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.5)',
              fontFamily: '"DM Sans",system-ui,sans-serif',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M8 3H3v5" />
              <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
              <path d="m15 9 6-6" />
            </svg>
            A/B tests
          </button>
          <button className={styles.exportBtn} onClick={exportCsv} disabled={exporting||(stats?.leads??0)===0}>{exporting?'Exporting...':`Export ${stats?.leads??0} leads CSV`}</button>
        </div>
      </div>
      <div className={styles.statGrid}>
        {[{label:'Total views',value:stats?.views??0,unit:'',sub:rangeName(dateRange) + (excludeBots ? ' (humans only)' : '')},{label:'Completions',value:stats?.completions??0,unit:'',sub:'Finished the quiz'},{label:'Completion rate',value:stats?.completion_rate??0,unit:'%',sub:'Industry avg 34%',highlight:(stats?.completion_rate??0)>=34},{label:'Leads captured',value:stats?.leads??0,unit:'',sub:'Emails collected'},{label:'Lead rate',value:stats?.lead_rate??0,unit:'%',sub:'Industry avg 42%',highlight:(stats?.lead_rate??0)>=42}].map(s=>(
          <div key={s.label} className={`${styles.statCard} ${s.highlight?styles.statHighlight:''}`}>
            <div className={styles.statValue}>{s.value}<span className={styles.statUnit}>{s.unit}</span></div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statSub} ${s.highlight?styles.statSubGood:''}`}>{s.highlight&&'\u2191 '}{s.sub}</div>
          </div>
        ))}
      </div>
      <div className={styles.funnelCard}>
        <h2 className={styles.sectionTitle}>Full funnel: quiz to email CTR</h2>
        <div className={styles.funnelRows}>
          {(function () {
            var views = funnel?.viewed ?? stats?.views ?? 0;
            var completed = funnel?.completed ?? stats?.completions ?? 0;
            var leads = funnel?.lead_captured ?? stats?.leads ?? 0;
            var emailSent = funnel?.email_sent ?? 0;
            var emailClicked = funnel?.email_clicked ?? 0;
            var pct = function (v: number) { return views > 0 ? Math.round((v / views) * 100) : 0; };
            return [
              { label: 'Views', value: views, pct: 100 },
              { label: 'Completions', value: completed, pct: pct(completed) },
              { label: 'Leads captured', value: leads, pct: pct(leads) },
              { label: 'Emails delivered', value: emailSent, pct: pct(emailSent) },
              { label: 'Email clicks', value: emailClicked, pct: pct(emailClicked) },
            ];
          })().map(function (row) {
            return (
              <div key={row.label} className={styles.funnelRow}>
                <div className={styles.funnelLabel}>{row.label}</div>
                <div className={styles.funnelBar}><div className={styles.funnelFill} style={{ width: row.pct + '%' }} /></div>
                <div className={styles.funnelCount}>{row.value}</div>
                <div className={styles.funnelPct}>{row.pct}%</div>
              </div>
            );
          })}
        </div>
        {funnel?.outcome_breakdown && Object.keys(funnel.outcome_breakdown).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(0,0,0,0.4)', marginBottom: 10 }}>Outcome breakdown</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(funnel.outcome_breakdown).map(function (entry) {
                var outcomeId = entry[0] as string;
                var count = entry[1] as number;
                var outcomeTitle = quiz?.outcomes?.find(function (o: any) { return o.id === outcomeId; })?.title || outcomeId;
                return (
                  <div key={outcomeId} style={{
                    padding: '8px 14px',
                    background: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{outcomeTitle}</div>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{count} lead{count !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {heatmap && heatmap.questions && heatmap.questions.length > 0 && (
        <div className={styles.heatmapCard}>
          <h2 className={styles.sectionTitle}>Question heatmap</h2>
          {heatmap.questions.map(function (q: any, qi: number) {
            var maxCount = Math.max(1, ...(q.options || []).map(function (o: any) { return o.count; }));
            var barColors = ['#0D7377', '#2D6A4F', '#4a9e3f', '#3b7dd8', '#9b59b6', '#e67e22', '#e74c3c', '#1abc9c'];
            return (
              <div key={qi} className={styles.heatmapQuestion}>
                <div className={styles.heatmapQHeader}>
                  <span className={styles.heatmapQNum}>Q{qi + 1}</span>
                  <span className={styles.heatmapQText}>{q.text}</span>
                  <span className={styles.heatmapMeta}>{q.answered} answered</span>
                </div>
                <div className={styles.heatmapOptions}>
                  {(q.options || []).map(function (opt: any, oi: number) {
                    var color = barColors[oi % barColors.length];
                    return (
                      <div key={oi} className={styles.heatmapOption}>
                        <span className={styles.heatmapOptLabel} title={opt.text}>{opt.text}</span>
                        <div className={styles.heatmapBar}>
                          <div className={styles.heatmapBarFill} style={{ width: (opt.count / maxCount * 100) + '%', background: color }} />
                        </div>
                        <span className={styles.heatmapOptCount}>{opt.count}</span>
                        <span className={styles.heatmapOptPct}>{opt.pct}%</span>
                      </div>
                    );
                  })}
                </div>
                {q.dropoff > 0 && (
                  <div className={q.dropoff_rate > 20 ? styles.heatmapDropoff + ' ' + styles.heatmapDropoffBad : styles.heatmapDropoff}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></svg>
                    {q.dropoff} dropped off ({q.dropoff_rate}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.leadsCard}>
        <div className={styles.leadsHeader}><h2 className={styles.sectionTitle}>Leads</h2>{leads.length>0&&<button className={styles.exportBtnSmall} onClick={exportCsv} disabled={exporting}>{exporting?'...':'Export CSV'}</button>}</div>
        {leads.length===0?<EmptyState title="No leads yet" body="Share your quiz to start collecting emails." />:(
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Name</th><th>Email</th><th>Outcome</th><th>Date</th></tr></thead><tbody>{leads.map((lead:any)=><tr key={lead.id}><td>{lead.name||' - '}</td><td>{lead.email}</td><td><span className={styles.outcomePill}>{lead.outcome_id?quiz?.outcomes?.find((o:any)=>o.id===lead.outcome_id)?.title??lead.outcome_id:' - '}</span></td><td>{new Date(lead.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
