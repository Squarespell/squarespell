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
  const [loading, setLoading] = useState(true);
  const [excludeBots, setExcludeBots] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sq_exclude_bots') === 'true';
    }
    return false;
  });

  const loadData = useCallback((filterBots: boolean) => {
    setLoading(true);
    Promise.all([
      api.getQuiz(params.quizId),
      api.getAnalytics(params.quizId, { exclude_bots: filterBots }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${params.quizId}/leads`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
    ]).then(([q, s, l]) => { setQuiz(q); setStats(s); setLeads(l); }).finally(() => setLoading(false));
  }, [params.quizId]);

  useEffect(() => {
    loadData(excludeBots);
  }, [params.quizId, excludeBots, loadData]);

  function toggleBotFilter() {
    const next = !excludeBots;
    setExcludeBots(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sq_exclude_bots', String(next));
    }
  }

  async function exportCsv() {
    setExporting(true);
    try { const res=await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${params.quizId}/leads/export`,{credentials:'include'}); const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${quiz?.title??'leads'}-leads.csv`; a.click(); URL.revokeObjectURL(url); } finally { setExporting(false); }
  }
  if (loading) return <div className={styles.loading}>Loading analytics...</div>;
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.push(`/dashboard/${params.quizId}`)}>&#8592; Back to editor</button>
        <div><h1 className={styles.title}>{quiz?.title}</h1><div className={`${styles.status} ${quiz?.status==='live'?styles.live:styles.draft}`}>{quiz?.status}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={toggleBotFilter}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
              background: excludeBots ? 'rgba(210,255,29,0.1)' : 'rgba(255,255,255,0.06)',
              border: excludeBots ? '1px solid rgba(210,255,29,0.3)' : '1px solid rgba(255,255,255,0.12)',
              color: excludeBots ? '#D2FF1D' : 'rgba(255,255,255,0.5)',
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
          <button className={styles.exportBtn} onClick={exportCsv} disabled={exporting||leads.length===0}>{exporting?'Exporting...':`Export ${leads.length} leads CSV`}</button>
        </div>
      </div>
      <div className={styles.statGrid}>
        {[{label:'Total views',value:stats?.views??0,unit:'',sub:excludeBots ? 'Humans only' : 'All time'},{label:'Completions',value:stats?.completions??0,unit:'',sub:'Finished the quiz'},{label:'Completion rate',value:stats?.completion_rate??0,unit:'%',sub:'Industry avg 34%',highlight:(stats?.completion_rate??0)>=34},{label:'Leads captured',value:stats?.leads??0,unit:'',sub:'Emails collected'},{label:'Lead rate',value:stats?.lead_rate??0,unit:'%',sub:'Industry avg 42%',highlight:(stats?.lead_rate??0)>=42}].map(s=>(
          <div key={s.label} className={`${styles.statCard} ${s.highlight?styles.statHighlight:''}`}>
            <div className={styles.statValue}>{s.value}<span className={styles.statUnit}>{s.unit}</span></div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statSub} ${s.highlight?styles.statSubGood:''}`}>{s.highlight&&'\u2191 '}{s.sub}</div>
          </div>
        ))}
      </div>
      <div className={styles.funnelCard}>
        <h2 className={styles.sectionTitle}>Funnel breakdown</h2>
        <div className={styles.funnelRows}>
          {[{label:'Views',value:stats?.views??0,pct:100},{label:'Completions',value:stats?.completions??0,pct:stats?.views?Math.round(((stats?.completions??0)/stats.views)*100):0},{label:'Leads',value:stats?.leads??0,pct:stats?.views?Math.round(((stats?.leads??0)/stats.views)*100):0}].map(row=>(
            <div key={row.label} className={styles.funnelRow}><div className={styles.funnelLabel}>{row.label}</div><div className={styles.funnelBar}><div className={styles.funnelFill} style={{width:`${row.pct}%`}}/></div><div className={styles.funnelCount}>{row.value}</div><div className={styles.funnelPct}>{row.pct}%</div></div>
          ))}
        </div>
      </div>
      <div className={styles.leadsCard}>
        <div className={styles.leadsHeader}><h2 className={styles.sectionTitle}>Leads</h2>{leads.length>0&&<button className={styles.exportBtnSmall} onClick={exportCsv} disabled={exporting}>{exporting?'...':'Export CSV'}</button>}</div>
        {leads.length===0?<EmptyState title="No leads yet" body="Share your quiz to start collecting emails." />:(
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Name</th><th>Email</th><th>Outcome</th><th>Date</th></tr></thead><tbody>{leads.map((lead:any)=><tr key={lead.id}><td>{lead.name||' - '}</td><td>{lead.email}</td><td><span className={styles.outcomePill}>{lead.outcome_id?quiz?.outcomes?.find((o:any)=>o.id===lead.outcome_id)?.title??lead.outcome_id:' - '}</span></td><td>{new Date(lead.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
