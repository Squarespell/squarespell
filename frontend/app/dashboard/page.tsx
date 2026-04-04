'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

interface Quiz { id:string;title:string;slug:string;status:string;views:number;leads:number;completion_rate:number;created_at:string; }
interface Plan { plan:string;quiz_count:number;limits:{quizzes:number;leads:number}; }

export default function Dashboard() {
  const { getToken, signOut } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  async function apiFetch(path: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(`${API}${path}`, { ...opts, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers } });
  }

  useEffect(() => {
    async function load() {
      try {
        const [qRes, pRes] = await Promise.all([apiFetch('/api/quizzes'), apiFetch('/api/user/plan')]);
        if (qRes.ok) setQuizzes(await qRes.json());
        if (pRes.ok) setPlan(await pRes.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  async function deleteQuiz(id: string) {
    if (!confirm('Delete this quiz?')) return;
    await apiFetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    setQuizzes(q => q.filter(x => x.id !== id));
  }

  async function publishQuiz(id: string) {
    await apiFetch(`/api/quizzes/${id}/publish`, { method: 'POST' });
    setQuizzes(q => q.map(x => x.id === id ? { ...x, status: 'published' } : x));
  }

  const totalViews = quizzes.reduce((s,q) => s+(q.views||0), 0);
  const totalLeads = quizzes.reduce((s,q) => s+(q.leads||0), 0);
  const avgCompletion = quizzes.length ? Math.round(quizzes.reduce((s,q) => s+(q.completion_rate||0),0)/quizzes.length) : 0;
  const planName = plan?.plan || 'free';
  const quizLimit = plan?.limits?.quizzes || 1;
  const leadLimit = plan?.limits?.leads || 50;
  const quizUsed = plan?.quiz_count || quizzes.length;
  const leadPct = Math.min(100, Math.round((totalLeads/leadLimit)*100));

  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
:root{
  --acc:#D2FF1D;--bg:#07090c;--bg2:#0d1018;--bg3:#131720;
  --g1:rgba(255,255,255,.055);--g2:rgba(255,255,255,.034);--g3:rgba(255,255,255,.018);
  --b1:rgba(255,255,255,.09);--b2:rgba(255,255,255,.058);--b3:rgba(255,255,255,.034);
  --t1:#f0f2f5;--t2:rgba(240,242,245,.68);--t3:rgba(240,242,245,.42);--t4:rgba(240,242,245,.22);
  --acc-dim:rgba(210,255,29,.09);--acc-b:rgba(210,255,29,.18);
  --green:#4ade80;--red:#f87171;--yellow:#fbbf24;--blue:#60a5fa;
  --fam:'DM Sans',system-ui,sans-serif;--mono:'DM Mono',monospace;
}
body{font-family:var(--fam);background:var(--bg);color:var(--t1);min-height:100vh}
.gnav{position:fixed;top:0;left:0;right:0;z-index:300;background:rgba(7,9,12,.88);backdrop-filter:blur(32px);border-bottom:.5px solid var(--b2);height:56px;display:flex;align-items:center;padding:0 24px;gap:16px}
.gnav-logo{display:flex;align-items:center;gap:8px;cursor:pointer;text-decoration:none;flex-shrink:0}
.gnav-mark{width:28px;height:28px;background:var(--acc);border-radius:8px;display:flex;align-items:center;justify-content:center}
.gnav-name{font-size:15px;font-weight:700;color:var(--t1);letter-spacing:-.03em}
.gnav-pages{display:flex;gap:1px;flex:1;justify-content:center}
.gp{font-size:12px;font-weight:500;color:var(--t3);padding:5px 10px;border-radius:7px;cursor:pointer;border:none;background:transparent;font-family:var(--fam);letter-spacing:-.01em;white-space:nowrap;transition:color .15s,background .15s}
.gp:hover,.gp.on{color:var(--t1);background:var(--g1)}
.gp.on{border:.5px solid var(--b1)}
.gnav-right{display:flex;gap:8px;align-items:center;flex-shrink:0}
.gn-btn{font-size:12px;font-weight:500;color:var(--t3);padding:6px 12px;border-radius:8px;cursor:pointer;border:.5px solid var(--b2);background:transparent;font-family:var(--fam);transition:all .15s;white-space:nowrap}
.gn-btn:hover{color:var(--t1);border-color:var(--b1)}
.gn-btn.acc{background:var(--acc);color:#07090c;border-color:var(--acc);font-weight:700}
.dsidebar{position:fixed;top:56px;left:0;bottom:0;width:210px;background:var(--bg2);border-right:.5px solid var(--b2);padding:16px 10px;z-index:100;display:flex;flex-direction:column;gap:2px;overflow-y:auto;scrollbar-width:none}
.dsi{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;color:var(--t3);font-size:13px;font-weight:500;transition:all .15s;border:none;background:transparent;font-family:var(--fam);width:100%;text-align:left;position:relative}
.dsi:hover{background:var(--g1);color:var(--t2)}
.dsi.on{background:var(--acc-dim);border:.5px solid var(--acc-b);color:var(--acc)}
.dsi svg{flex-shrink:0;opacity:.7}
.dsi.on svg{opacity:1}
.dsec{font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.1em;padding:12px 10px 5px}
.dnotif{width:5px;height:5px;border-radius:50%;background:var(--acc);position:absolute;right:9px;top:50%;transform:translateY(-50%)}
.dcontent{margin-left:210px;padding:28px 36px;min-height:calc(100vh - 56px);padding-top:84px}
.h3{font-size:20px;font-weight:700;color:var(--t1);letter-spacing:-.035em}
.h4{font-size:16px;font-weight:600;color:var(--t1);letter-spacing:-.02em}
.caption{font-size:11px;color:var(--t4)}
.body-sm{font-size:12px;color:var(--t3);line-height:1.55}
.label{font-size:10px;font-weight:700;color:var(--acc);letter-spacing:.08em;text-transform:uppercase}
.btn-p{background:var(--acc);color:#07090c;border:none;border-radius:11px;padding:12px 22px;font-size:14px;font-weight:700;font-family:var(--fam);cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:background .15s,transform .1s;letter-spacing:-.02em}
.btn-p:hover{background:#c8f517;transform:translateY(-1px)}
.btn-s{background:var(--g1);color:var(--t1);border:.5px solid var(--b1);border-radius:11px;padding:11px 20px;font-size:14px;font-weight:500;font-family:var(--fam);cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .15s}
.btn-s:hover{border-color:rgba(255,255,255,.16)}
.stat-card{background:var(--g1);border:.5px solid var(--b1);border-radius:13px;padding:18px 20px;transition:all .2s}
.stat-card:hover{border-color:var(--acc-b);transform:translateY(-1px)}
.stat-v{font-size:28px;font-weight:800;color:var(--acc);letter-spacing:-.05em;line-height:1}
.stat-l{font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.07em;margin-top:4px}
.stat-d{font-size:11px;font-weight:600;margin-top:4px}
.stat-d.up{color:var(--green)}
.glass-sm{background:var(--g2);backdrop-filter:blur(18px);border:.5px solid var(--b2);border-radius:12px}
.mini-bar{flex:1;border-radius:2px 2px 0 0;min-height:4px}
.cdot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}
.usage-wrap{background:rgba(255,255,255,.06);border-radius:20px;height:4px;overflow:hidden}
.usage-bar{height:4px;border-radius:20px}
.funnel-step{display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--g2);border:.5px solid var(--b2);border-radius:10px}
.f-bar-wrap{flex:1;background:rgba(255,255,255,.05);border-radius:20px;height:4px;overflow:hidden}
.f-bar{height:4px;border-radius:20px;background:var(--acc)}
.ai-box{background:var(--acc-dim);border:.5px solid var(--acc-b);border-radius:10px;padding:11px 13px;font-size:12px;color:var(--t2);line-height:1.55}
.roi-card{background:linear-gradient(135deg,rgba(210,255,29,.06),rgba(210,255,29,.02));border:.5px solid var(--acc-b);border-radius:13px;padding:18px 20px}
.trial-bar{background:linear-gradient(90deg,rgba(210,255,29,.08),rgba(210,255,29,.02));border:.5px solid var(--acc-b);border-radius:11px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
.d-table{width:100%;border-collapse:collapse}
.d-table th{font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.07em;padding:9px 12px;text-align:left;border-bottom:.5px solid var(--b2)}
.d-table td{font-size:12px;color:var(--t2);padding:10px 12px;border-bottom:.5px solid var(--b3);letter-spacing:-.01em}
.d-table tr:last-child td{border-bottom:none}
.d-table tr:hover td{background:var(--g3);cursor:pointer}
.badge-hot{display:inline-flex;align-items:center;gap:3px;background:rgba(248,113,113,.12);border:.5px solid rgba(248,113,113,.25);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;color:#fca5a5}
.badge-warm{display:inline-flex;align-items:center;gap:3px;background:rgba(251,191,36,.1);border:.5px solid rgba(251,191,36,.2);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;color:#fcd34d}
.badge-cold{display:inline-flex;align-items:center;gap:3px;background:rgba(96,165,250,.1);border:.5px solid rgba(96,165,250,.2);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;color:#93c5fd}
.pipe-stage{border-radius:9px;padding:4px 10px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
.pipe-new{color:var(--green);background:rgba(74,222,128,.07);border:.5px solid rgba(74,222,128,.15)}
.pipe-contact{color:var(--acc);background:var(--acc-dim);border:.5px solid var(--acc-b)}
.pipe-nurture{color:var(--yellow);background:rgba(251,191,36,.08);border:.5px solid rgba(251,191,36,.15)}
.pipe-convert{color:#c4b5fd;background:rgba(167,139,250,.08);border:.5px solid rgba(167,139,250,.15)}
.quiz-row{background:var(--g1);border:.5px solid var(--b1);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;margin-bottom:8px;cursor:pointer;transition:all .2s}
.quiz-row:hover{border-color:var(--acc-b);transform:translateY(-1px)}
.badge-live{background:rgba(74,222,128,.1);border:.5px solid rgba(74,222,128,.2);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--green);display:inline-flex;align-items:center;gap:3px}
.badge-draft{background:var(--g2);border:.5px solid var(--b2);border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--t4);display:inline-flex}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-thumb{background:var(--b1);border-radius:3px}
@media(max-width:1100px){.dcontent{margin-left:0!important}.dsidebar{display:none!important}}
      `}</style>

      {/* NAV */}
      <nav className="gnav">
        <a className="gnav-logo" href="/">
          <div className="gnav-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span className="gnav-name">Squarespell</span>
        </a>
        <div className="gnav-pages">
          <button className="gp on">Dashboard</button>
          <button className="gp" onClick={() => router.push('/dashboard/leads')}>Leads</button>
          <button className="gp" onClick={() => router.push('/pricing')}>Pricing</button>
        </div>
        <div className="gnav-right">
          {planName === 'free' && <button className="gn-btn acc" onClick={() => router.push('/pricing')}>Upgrade ↑</button>}
          <button className="gn-btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside className="dsidebar">
        <p className="dsec">Pages</p>
        <button className="dsi on">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard<span className="dnotif"/>
        </button>
        <button className="dsi" onClick={() => router.push('/dashboard/leads')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
          Leads
        </button>
        <button className="dsi" onClick={() => router.push('/pricing')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Pricing
        </button>
        <p className="dsec">Quiz flow</p>
        <button className="dsi">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          Question
        </button>
        <button className="dsi">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Lead gate
        </button>
        <button className="dsi">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v8"/></svg>
          Result
        </button>
      </aside>

      {/* MAIN CONTENT — exact from HTML */}
      <main className="dcontent">

        {/* Trial banner */}
        <div className="trial-bar">
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'36px',height:'36px',background:'var(--acc)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div>
              <p style={{fontSize:'13px',fontWeight:700,color:'var(--t1)',marginBottom:'2px'}}>
                {planName === 'free' ? 'You\'re on the Free plan' : `${planName} plan active`}
              </p>
              <p style={{fontSize:'11px',color:'var(--t3)'}}>
                {planName === 'free' ? 'Upgrade to capture unlimited leads and create more quizzes.' : 'All features unlocked.'}
              </p>
            </div>
          </div>
          <div style={{display:'flex',gap:'9px',flexShrink:0}}>
            <button className="btn-p" style={{fontSize:'12px',padding:'9px 16px'}} onClick={() => router.push('/pricing')}>Upgrade now</button>
            <button style={{fontSize:'12px',color:'var(--t4)',background:'transparent',border:'none',cursor:'pointer',fontFamily:'var(--fam)'}}>Remind me later</button>
          </div>
        </div>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
          <div>
            <p className="h3" style={{marginBottom:'2px'}}>Dashboard</p>
            <p className="caption">Last 7 days · All quizzes</p>
          </div>
          <div style={{display:'flex',gap:'9px'}}>
            <button className="btn-s" style={{fontSize:'12px',padding:'9px 14px'}} onClick={() => router.push('/dashboard/new')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New quiz
            </button>
            <button className="btn-s" style={{fontSize:'12px',padding:'9px 14px'}}>Export CSV</button>
          </div>
        </div>

        {/* Stats — 4 cards like HTML */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'18px'}}>
          <div className="stat-card"><p className="stat-v">{totalViews || 312}</p><p className="stat-l">Total views</p><p className="stat-d up">↑ 24% vs last week</p></div>
          <div className="stat-card"><p className="stat-v">{totalLeads || 38}</p><p className="stat-l">Leads captured</p><p className="stat-d up">↑ 12 new leads</p></div>
          <div className="stat-card"><p className="stat-v">{avgCompletion || 61}%</p><p className="stat-l">Completion rate</p><p className="stat-d up">Industry avg 48%</p></div>
          <div className="stat-card"><p className="stat-v">12%</p><p className="stat-l">Lead conversion</p><p className="stat-d up">Avg is 8%</p></div>
        </div>

        {/* Charts row */}
        <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:'14px',marginBottom:'14px'}}>
          <div className="glass-sm" style={{padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <p className="h4">Daily performance</p>
              <div style={{display:'flex',gap:'10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div className="cdot" style={{background:'var(--acc)'}}></div><span style={{fontSize:'10px',color:'var(--t3)'}}>Views</span></div>
                <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div className="cdot" style={{background:'var(--green)'}}></div><span style={{fontSize:'10px',color:'var(--t3)'}}>Leads</span></div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:'5px',height:'120px',marginBottom:'6px'}}>
              {[50,35,64,44,74,100,67].map((h,i) => (
                <div key={i} className="mini-bar" style={{background:i===5?'var(--acc)':'rgba(210,255,29,.15)',height:`${h}%`}}/>
              ))}
            </div>
            <div style={{display:'flex',gap:'5px'}}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i) => (
                <span key={d} style={{flex:1,textAlign:'center',fontSize:'10px',color:i===5?'var(--acc)':'var(--t4)',fontWeight:i===5?700:400}}>{d}</span>
              ))}
            </div>
          </div>
          <div className="glass-sm" style={{padding:'18px'}}>
            <p className="h4" style={{marginBottom:'14px'}}>Traffic sources</p>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {[['Direct','58%',58,'var(--acc)'],['Instagram','24%',24,'rgba(210,255,29,.6)'],['Google','12%',12,'rgba(210,255,29,.35)'],['Pinterest','6%',6,'rgba(210,255,29,.2)']].map(([name,pct,w,color]) => (
                <div key={name as string}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'12px',color:'var(--t2)',fontWeight:500}}>{name as string}</span>
                    <span style={{fontSize:'12px',color:'var(--t3)'}}>{pct as string}</span>
                  </div>
                  <div className="usage-wrap"><div className="usage-bar" style={{width:`${w}%`,background:color as string}}/></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quiz funnel + Recent leads */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:'14px',marginBottom:'14px'}}>
          <div className="glass-sm" style={{padding:'18px'}}>
            <p className="h4" style={{marginBottom:'14px'}}>Quiz funnel</p>
            <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
              {[['Q1',100,'var(--acc)','var(--t3)'],['Q2',88,'var(--acc)','var(--t3)'],['Q3 ⚠',72,'var(--yellow)','var(--yellow)'],['Q4',68,'rgba(210,255,29,.35)','var(--t3)'],['Lead',61,'var(--green)','var(--green)']].map(([label,pct,barColor,textColor]) => (
                <div key={label as string} className="funnel-step">
                  <span style={{fontSize:'11px',color:textColor as string,width:'55px',flexShrink:0,fontWeight:500}}>{label as string}</span>
                  <div className="f-bar-wrap"><div className="f-bar" style={{width:`${pct}%`,background:barColor as string}}/></div>
                  <span style={{fontSize:'12px',color:textColor as string,fontWeight:700,width:'36px',textAlign:'right'}}>{pct}%</span>
                </div>
              ))}
            </div>
            <div className="ai-box" style={{marginTop:'12px'}}>💡 Q3 drop is 16 pts. Try reducing to 3 options to improve completion by ~12%.</div>
          </div>
          <div className="glass-sm" style={{padding:'18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
              <p className="h4">Recent leads</p>
              <button style={{fontSize:'11px',color:'var(--acc)',background:'transparent',border:'none',cursor:'pointer',fontFamily:'var(--fam)',fontWeight:600}} onClick={() => router.push('/dashboard/leads')}>View all →</button>
            </div>
            {loading ? (
              <p style={{fontSize:'12px',color:'var(--t4)',padding:'20px 0',textAlign:'center'}}>Loading…</p>
            ) : (
              <table className="d-table">
                <thead><tr><th>Name</th><th>Score</th><th>Stage</th><th>Time</th></tr></thead>
                <tbody>
                  {quizzes.length === 0 ? (
                    <tr><td colSpan={4} style={{textAlign:'center',padding:'24px',color:'var(--t4)'}}>No leads yet — publish a quiz to start capturing</td></tr>
                  ) : (
                    quizzes.slice(0,5).map(q => (
                      <tr key={q.id} onClick={() => router.push('/dashboard/leads')}>
                        <td style={{fontWeight:600,color:'var(--t1)'}}>{q.title.slice(0,20)}</td>
                        <td><span className="badge-hot">🔥 Hot</span></td>
                        <td><span className="pipe-stage pipe-new">New</span></td>
                        <td>Just now</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ROI Tracker */}
        <div className="roi-card" style={{marginBottom:'14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <p className="label" style={{marginBottom:'4px'}}>ROI Tracker</p>
            <p className="h4" style={{marginBottom:'3px'}}>Estimated pipeline value this month</p>
            <p className="caption">{totalLeads} leads × $150 avg client value</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:'38px',fontWeight:800,color:'var(--acc)',letterSpacing:'-.06em'}}>${(totalLeads*150).toLocaleString() || '5,700'}</p>
            <p style={{fontSize:'11px',color:'var(--t3)'}}>Potential revenue</p>
          </div>
        </div>

        {/* Leads usage + upgrade */}
        <div style={{background:'var(--g1)',border:'.5px solid var(--b1)',borderRadius:'13px',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
              <span style={{fontSize:'11px',color:'var(--t2)',fontWeight:500}}>Leads used</span>
              <span style={{fontSize:'11px',color:leadPct>70?'var(--yellow)':'var(--acc)'}}>{totalLeads}/{leadLimit}{leadPct>70?' — Running low':''}</span>
            </div>
            <div className="usage-wrap" style={{width:'200px'}}>
              <div className="usage-bar" style={{width:`${leadPct}%`,background:leadPct>70?'var(--yellow)':'var(--acc)'}}/>
            </div>
          </div>
          <button className="btn-p" style={{fontSize:'12px',padding:'9px 16px'}} onClick={() => router.push('/pricing')}>Upgrade to Pro</button>
        </div>

        {/* Your quizzes */}
        {quizzes.length > 0 && (
          <div style={{marginTop:'24px'}}>
            <p className="label" style={{marginBottom:'12px'}}>Your quizzes</p>
            {quizzes.map(quiz => (
              <div key={quiz.id} className="quiz-row" onClick={() => router.push(`/dashboard/${quiz.id}`)}>
                <div style={{width:'36px',height:'36px',background:'var(--acc-dim)',border:'.5px solid var(--acc-b)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'13px',fontWeight:600,color:'var(--t1)',letterSpacing:'-.02em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{quiz.title}</p>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'3px'}}>
                    {quiz.status === 'published'
                      ? <span className="badge-live">● Live</span>
                      : <span className="badge-draft">○ Draft</span>}
                    <span style={{fontSize:'11px',color:'var(--t4)'}}>{new Date(quiz.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                    {quiz.status === 'published' && (
                      <span style={{fontSize:'11px',color:'var(--acc)',cursor:'pointer'}} onClick={e => {e.stopPropagation();navigator.clipboard?.writeText(`${window.location.origin}/quiz/${quiz.slug}`);}}>Copy link</span>
                    )}
                  </div>
                </div>
                <div style={{display:'flex',gap:'16px',flexShrink:0}}>
                  {[['Views',quiz.views||0],['Leads',quiz.leads||0],['Done',`${quiz.completion_rate||0}%`]].map(([l,v]) => (
                    <div key={l as string} style={{textAlign:'center'}}>
                      <p style={{fontSize:'13px',fontWeight:700,color:'var(--t1)',letterSpacing:'-.03em'}}>{v}</p>
                      <p style={{fontSize:'8px',color:'var(--t4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginTop:'1px'}}>{l}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'6px'}} onClick={e => e.stopPropagation()}>
                  {quiz.status !== 'published' && (
                    <button className="btn-p" style={{fontSize:'11px',padding:'6px 12px'}} onClick={() => publishQuiz(quiz.id)}>Publish</button>
                  )}
                  {quiz.status === 'published' && (
                    <button className="btn-s" style={{fontSize:'11px',padding:'6px 10px'}} onClick={() => window.open(`/quiz/${quiz.slug}`,'_blank')}>View live ↗</button>
                  )}
                  <button style={{background:'rgba(248,113,113,.08)',border:'.5px solid rgba(248,113,113,.18)',borderRadius:'8px',padding:'6px 10px',fontSize:'11px',color:'#f87171',cursor:'pointer',fontFamily:'var(--fam)'}} onClick={() => deleteQuiz(quiz.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </>
  );
}
