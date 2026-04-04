'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

interface Quiz {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  leads: number;
  completion_rate: number;
  created_at: string;
}

interface Plan {
  plan: string;
  quiz_count: number;
  limits: { quizzes: number; leads: number };
}

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
:root{
  --acc:#D2FF1D;--bg:#07090c;--bg2:#0d1018;--bg3:#131720;
  --g1:rgba(255,255,255,.055);--g2:rgba(255,255,255,.034);--g3:rgba(255,255,255,.018);
  --b1:rgba(255,255,255,.09);--b2:rgba(255,255,255,.058);--b3:rgba(255,255,255,.034);
  --t1:#f0f2f5;--t2:rgba(240,242,245,.68);--t3:rgba(240,242,245,.42);--t4:rgba(240,242,245,.22);
  --acc-dim:rgba(210,255,29,.09);--acc-b:rgba(210,255,29,.18);
  --green:#4ade80;--red:#f87171;--yellow:#fbbf24;
  --fam:'DM Sans',system-ui,sans-serif;--mono:'DM Mono',monospace;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
body{font-family:var(--fam);background:var(--bg);color:var(--t1);min-height:100vh}
/* NAV */
.gnav{position:fixed;top:0;left:0;right:0;z-index:300;background:rgba(7,9,12,.88);
  backdrop-filter:blur(32px);border-bottom:.5px solid var(--b2);height:56px;
  display:flex;align-items:center;padding:0 24px;gap:16px}
.gnav-logo{display:flex;align-items:center;gap:8px;cursor:pointer;text-decoration:none}
.gnav-mark{width:28px;height:28px;background:var(--acc);border-radius:8px;display:flex;align-items:center;justify-content:center}
.gnav-name{font-size:15px;font-weight:700;color:var(--t1);letter-spacing:-.03em}
.gnav-right{display:flex;gap:8px;align-items:center;margin-left:auto}
.gn-btn{font-size:12px;font-weight:500;color:var(--t3);padding:6px 12px;border-radius:8px;
  cursor:pointer;border:.5px solid var(--b2);background:transparent;font-family:var(--fam);
  transition:all .15s;white-space:nowrap}
.gn-btn:hover{color:var(--t1);border-color:var(--b1)}
.gn-btn.acc{background:var(--acc);color:#07090c;border-color:var(--acc);font-weight:700}
/* SIDEBAR */
.dsidebar{position:fixed;top:56px;left:0;bottom:0;width:210px;background:var(--bg2);
  border-right:.5px solid var(--b2);padding:16px 10px;z-index:100;
  display:flex;flex-direction:column;gap:2px;overflow-y:auto;scrollbar-width:none}
.dsi{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;
  cursor:pointer;color:var(--t3);font-size:13px;font-weight:500;transition:all .15s;
  border:none;background:transparent;font-family:var(--fam);width:100%;text-align:left;position:relative}
.dsi:hover{background:var(--g1);color:var(--t2)}
.dsi.on{background:var(--acc-dim);border:.5px solid var(--acc-b);color:var(--acc)}
.dsi svg{flex-shrink:0;opacity:.7}
.dsi.on svg{opacity:1}
.dsec{font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;
  letter-spacing:.1em;padding:12px 10px 5px}
.dnotif{width:5px;height:5px;border-radius:50%;background:var(--acc);
  position:absolute;right:9px;top:50%;transform:translateY(-50%)}
/* MAIN CONTENT */
.dcontent{margin-left:210px;padding:28px 36px;min-height:calc(100vh - 56px);padding-top:84px}
/* TYPOGRAPHY */
.h3{font-size:20px;font-weight:700;color:var(--t1);letter-spacing:-.035em}
.h4{font-size:15px;font-weight:600;color:var(--t1);letter-spacing:-.02em}
.body{font-size:14px;color:var(--t2);line-height:1.6}
.body-sm{font-size:12px;color:var(--t3);line-height:1.55}
.label{font-size:10px;font-weight:700;color:var(--acc);letter-spacing:.08em;text-transform:uppercase}
/* BUTTONS */
.btn-p{background:var(--acc);color:#07090c;border:none;border-radius:11px;padding:10px 18px;
  font-size:13px;font-weight:700;font-family:var(--fam);cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;transition:all .15s;letter-spacing:-.02em}
.btn-p:hover{background:#c8f517;transform:translateY(-1px)}
.btn-s{background:var(--g1);color:var(--t1);border:.5px solid var(--b1);border-radius:11px;
  padding:9px 16px;font-size:13px;font-weight:500;font-family:var(--fam);cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;transition:all .15s}
.btn-s:hover{border-color:rgba(255,255,255,.16)}
/* STAT CARD */
.stat-card{background:var(--g1);border:.5px solid var(--b1);border-radius:13px;padding:18px 20px;
  transition:all .2s}
.stat-card:hover{border-color:var(--acc-b);transform:translateY(-1px)}
.stat-v{font-size:28px;font-weight:800;color:var(--acc);letter-spacing:-.05em;line-height:1}
.stat-l{font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;
  letter-spacing:.07em;margin-top:4px}
.stat-d{font-size:11px;font-weight:600;margin-top:4px;color:var(--green)}
/* QUIZ CARD */
.quiz-card{background:var(--g1);border:.5px solid var(--b1);border-radius:14px;padding:18px 20px;
  transition:all .2s;cursor:pointer;display:flex;align-items:center;gap:16px;margin-bottom:8px}
.quiz-card:hover{border-color:var(--acc-b);transform:translateY(-1px)}
.quiz-icon{width:40px;height:40px;background:var(--acc-dim);border:.5px solid var(--acc-b);
  border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.quiz-info{flex:1;min-width:0}
.quiz-title{font-size:14px;font-weight:600;color:var(--t1);letter-spacing:-.02em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.quiz-meta{font-size:11px;color:var(--t4);margin-top:3px}
.quiz-stats{display:flex;gap:16px;flex-shrink:0}
.qs{text-align:center}
.qs-v{font-size:14px;font-weight:700;color:var(--t1);letter-spacing:-.03em}
.qs-l{font-size:9px;color:var(--t4);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:1px}
/* STATUS BADGE */
.badge{display:inline-flex;align-items:center;gap:4px;border-radius:20px;
  padding:3px 9px;font-size:10px;font-weight:700}
.badge-live{background:rgba(74,222,128,.1);border:.5px solid rgba(74,222,128,.2);color:var(--green)}
.badge-draft{background:var(--g2);border:.5px solid var(--b2);color:var(--t4)}
/* TRIAL BAR */
.trial-bar{background:linear-gradient(90deg,rgba(210,255,29,.08),rgba(210,255,29,.02));
  border:.5px solid var(--acc-b);border-radius:11px;padding:12px 18px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
/* USAGE */
.usage-wrap{background:rgba(255,255,255,.06);border-radius:20px;height:4px;overflow:hidden;flex:1}
.usage-bar{height:4px;border-radius:20px;background:var(--acc)}
/* EMPTY STATE */
.empty{text-align:center;padding:60px 20px}
/* CHIP */
.chip{background:var(--g2);border:.5px solid var(--b2);border-radius:20px;
  padding:3px 10px;font-size:11px;color:var(--t3);font-weight:500;display:inline-flex;align-items:center;gap:4px}
/* AI BOX */
.ai-box{background:var(--acc-dim);border:.5px solid var(--acc-b);border-radius:10px;
  padding:11px 13px;font-size:12px;color:var(--t2);line-height:1.55}
/* SCROLLBAR */
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:var(--b1);border-radius:3px}
/* RESPONSIVE */
@media(max-width:900px){.dcontent{margin-left:0}.dsidebar{display:none}}
/* FADE IN */
.fade{animation:fadeUp .3s ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
/* ACTION MENU */
.action-menu{position:relative}
.action-drop{position:absolute;right:0;top:calc(100% + 6px);background:var(--bg2);
  border:.5px solid var(--b1);border-radius:10px;padding:4px;z-index:50;
  min-width:150px;box-shadow:0 16px 40px rgba(0,0,0,.5);display:none}
.action-menu:hover .action-drop,.action-menu.open .action-drop{display:block}
.action-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;
  font-size:12px;color:var(--t2);cursor:pointer;transition:all .15s;
  border:none;background:transparent;font-family:var(--fam);width:100%;text-align:left}
.action-item:hover{background:var(--g1);color:var(--t1)}
.action-item.danger{color:var(--red)}
.action-item.danger:hover{background:rgba(248,113,113,.08)}
`;

export default function DashboardPage() {
  const { getToken, signOut } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  async function apiFetch(path: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers },
    });
  }

  useEffect(() => {
    async function load() {
      try {
        const [qRes, pRes] = await Promise.all([
          apiFetch('/api/quizzes'),
          apiFetch('/api/user/plan'),
        ]);
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

  const totalViews = quizzes.reduce((s, q) => s + (q.views || 0), 0);
  const totalLeads = quizzes.reduce((s, q) => s + (q.leads || 0), 0);
  const avgCompletion = quizzes.length
    ? Math.round(quizzes.reduce((s, q) => s + (q.completion_rate || 0), 0) / quizzes.length)
    : 0;

  const planName = plan?.plan || 'free';
  const quizLimit = plan?.limits?.quizzes || 1;
  const leadLimit = plan?.limits?.leads || 50;
  const quizUsed = plan?.quiz_count || quizzes.length;
  const canCreate = quizUsed < quizLimit;

  return (
    <>
      <style>{STYLE}</style>

      {/* ── NAV ── */}
      <nav className="gnav">
        <a href="/" className="gnav-logo">
          <div className="gnav-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <span className="gnav-name">Squarespell</span>
        </a>
        <div className="gnav-right">
          <span className="chip" style={{ textTransform: 'capitalize' }}>{planName}</span>
          {planName === 'free' && (
            <button className="gn-btn acc" onClick={() => router.push('/pricing')}>Upgrade ↑</button>
          )}
          <button className="gn-btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </nav>

      {/* ── SIDEBAR ── */}
      <aside className="dsidebar">
        <p className="dsec">Menu</p>
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
        <p className="dsec" style={{ marginTop: '8px' }}>Plan</p>
        <div style={{ padding: '10px', background: 'var(--g2)', border: '.5px solid var(--b2)', borderRadius: '10px', margin: '0 0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'capitalize' }}>{planName} plan</span>
            <span style={{ fontSize: '11px', color: 'var(--acc)', fontWeight: 700 }}>{quizUsed}/{quizLimit}</span>
          </div>
          <div className="usage-wrap">
            <div className="usage-bar" style={{ width: `${Math.min(100, (quizUsed / quizLimit) * 100)}%` }}/>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--t4)', marginTop: '5px' }}>Quizzes used</p>
        </div>
        {planName === 'free' && (
          <button className="btn-p" style={{ width: '100%', marginTop: '8px', fontSize: '12px', padding: '9px' }}
            onClick={() => router.push('/pricing')}>
            Upgrade plan ↑
          </button>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="dcontent">
        {/* Trial / upgrade bar */}
        {planName === 'free' && (
          <div className="trial-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span style={{ fontSize: '13px', color: 'var(--t2)' }}>You're on the <strong style={{ color: 'var(--acc)' }}>Free plan</strong> — 1 quiz, 50 leads</span>
            </div>
            <button className="btn-p" style={{ fontSize: '12px', padding: '7px 14px' }}
              onClick={() => router.push('/pricing')}>
              Upgrade — from $19/mo →
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 className="h3">Your quizzes</h1>
            <p className="body-sm" style={{ marginTop: '3px' }}>Manage and track your quiz funnels</p>
          </div>
          <button
            className="btn-p"
            onClick={() => canCreate ? router.push('/dashboard/new') : router.push('/pricing')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {canCreate ? 'New quiz' : 'Upgrade to create more'}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '28px' }} className="fade">
          <div className="stat-card">
            <p className="stat-v">{totalViews.toLocaleString()}</p>
            <p className="stat-l">Total views</p>
            <p className="stat-d">All quizzes</p>
          </div>
          <div className="stat-card">
            <p className="stat-v">{totalLeads.toLocaleString()}</p>
            <p className="stat-l">Total leads</p>
            <p className="stat-d" style={{ color: totalLeads > 0 ? 'var(--green)' : 'var(--t4)' }}>
              {totalLeads > 0 ? `+${totalLeads} captured` : 'None yet'}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-v">{avgCompletion}%</p>
            <p className="stat-l">Avg completion</p>
            <p className="stat-d" style={{ color: avgCompletion > 50 ? 'var(--green)' : 'var(--t4)' }}>
              {avgCompletion > 50 ? 'Above average' : 'Keep optimising'}
            </p>
          </div>
        </div>

        {/* AI tip */}
        {quizzes.length > 0 && totalLeads === 0 && (
          <div className="ai-box" style={{ marginBottom: '20px' }}>
            <p style={{ fontWeight: 700, color: 'var(--acc)', marginBottom: '4px', fontSize: '12px' }}>
              ⚡ Quick tip
            </p>
            <p>Share your quiz link on social media or embed it on your Squarespace site to start capturing leads. Quizzes with 3–5 questions convert best.</p>
          </div>
        )}

        {/* Quiz list */}
        {loading ? (
          <div style={{ display: 'flex', gap: '6px', padding: '40px 0' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--acc)', opacity: i === 1 ? 1 : .4, animation: 'fadeUp .6s ease infinite alternate' }}/>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="empty fade">
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>🎯</div>
            <p className="h4" style={{ marginBottom: '8px' }}>No quizzes yet</p>
            <p className="body-sm" style={{ marginBottom: '20px', maxWidth: '320px', margin: '0 auto 20px' }}>
              Create your first AI-powered quiz funnel. Paste your URL and the AI builds it in 30 seconds.
            </p>
            <button className="btn-p" onClick={() => router.push('/dashboard/new')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create your first quiz
            </button>
          </div>
        ) : (
          <div className="fade">
            <p className="label" style={{ marginBottom: '12px' }}>{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</p>
            {quizzes.map(quiz => (
              <div key={quiz.id} className="quiz-card"
                onClick={() => router.push(`/dashboard/${quiz.id}`)}>
                <div className="quiz-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                <div className="quiz-info">
                  <p className="quiz-title">{quiz.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span className={`badge ${quiz.status === 'published' ? 'badge-live' : 'badge-draft'}`}>
                      {quiz.status === 'published' ? '● Live' : '○ Draft'}
                    </span>
                    <span className="quiz-meta">
                      {new Date(quiz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {quiz.status === 'published' && (
                      <span className="quiz-meta" style={{ color: 'var(--acc)', cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(`${window.location.origin}/quiz/${quiz.slug}`); }}>
                        Copy link
                      </span>
                    )}
                  </div>
                </div>
                <div className="quiz-stats">
                  <div className="qs">
                    <p className="qs-v">{quiz.views || 0}</p>
                    <p className="qs-l">Views</p>
                  </div>
                  <div className="qs">
                    <p className="qs-v">{quiz.leads || 0}</p>
                    <p className="qs-l">Leads</p>
                  </div>
                  <div className="qs">
                    <p className="qs-v">{quiz.completion_rate || 0}%</p>
                    <p className="qs-l">Done</p>
                  </div>
                </div>
                {/* Actions */}
                <div className={`action-menu${openMenu === quiz.id ? ' open' : ''}`}
                  onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === quiz.id ? null : quiz.id); }}>
                  <button className="btn-s" style={{ padding: '6px 10px', fontSize: '12px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>
                  <div className="action-drop">
                    <button className="action-item" onClick={() => router.push(`/dashboard/${quiz.id}`)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit quiz
                    </button>
                    {quiz.status !== 'published' && (
                      <button className="action-item" onClick={() => publishQuiz(quiz.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Publish
                      </button>
                    )}
                    {quiz.status === 'published' && (
                      <button className="action-item" onClick={() => window.open(`/quiz/${quiz.slug}`, '_blank')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        View live
                      </button>
                    )}
                    <button className="action-item danger" onClick={() => deleteQuiz(quiz.id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
