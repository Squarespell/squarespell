'use client';
import { useEffect, useState } from 'react';
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
  useEffect(() => {
    Promise.all([api.getQuiz(params.quizId), api.getAnalytics(params.quizId), fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${params.quizId}/leads`,{credentials:'include'}).then(r=>r.ok?r.json():[])]).then(([q,s,l])=>{setQuiz(q);setStats(s);setLeads(l);}).finally(()=>setLoading(false));
  }, [params.quizId]);
  async function exportCsv() {
    setExporting(true);
    try { const res=await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${params.quizId}/leads/export`,{credentials:'include'}); const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${quiz?.title??'leads'}-leads.csv`; a.click(); URL.revokeObjectURL(url); } finally { setExporting(false); }
  }
  if (loading) return <div className={styles.loading}>Loading analytics...</div>;
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.push(`/dashboard/${params.quizId}`)}>← Back to editor</button>
        <div><h1 className={styles.title}>{quiz?.title}</h1><div className={`${styles.status} ${quiz?.status==='live'?styles.live:styles.draft}`}>{quiz?.status}</div></div>
        <button className={styles.exportBtn} onClick={exportCsv} disabled={exporting||leads.length===0}>{exporting?'Exporting...':`Export ${leads.length} leads CSV`}</button>
      </div>
      <div className={styles.statGrid}>
        {[{label:'Total views',value:stats?.views??0,unit:'',sub:'All time'},{label:'Completions',value:stats?.completions??0,unit:'',sub:'Finished the quiz'},{label:'Completion rate',value:stats?.completion_rate??0,unit:'%',sub:'Industry avg 34%',highlight:(stats?.completion_rate??0)>=34},{label:'Leads captured',value:stats?.leads??0,unit:'',sub:'Emails collected'},{label:'Lead rate',value:stats?.lead_rate??0,unit:'%',sub:'Industry avg 42%',highlight:(stats?.lead_rate??0)>=42}].map(s=>(
          <div key={s.label} className={`${styles.statCard} ${s.highlight?styles.statHighlight:''}`}>
            <div className={styles.statValue}>{s.value}<span className={styles.statUnit}>{s.unit}</span></div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statSub} ${s.highlight?styles.statSubGood:''}`}>{s.highlight&&'↑ '}{s.sub}</div>
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
        {leads.length===0?<div className={styles.empty}>No leads yet. Share your quiz to start collecting emails.</div>:(
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Name</th><th>Email</th><th>Outcome</th><th>Date</th></tr></thead><tbody>{leads.map((lead:any)=><tr key={lead.id}><td>{lead.name||'—'}</td><td>{lead.email}</td><td><span className={styles.outcomePill}>{lead.outcome_id?quiz?.outcomes?.find((o:any)=>o.id===lead.outcome_id)?.title??lead.outcome_id:'—'}</span></td><td>{new Date(lead.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
