'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

export default function Dashboard() {
  const { getToken, signOut } = useAuth();
  const router = useRouter();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (window as any).__signOut = () => signOut();
    (window as any).__goTo = (path: string) => router.push(path);
    async function loadData() {
      try {
        const token = await getToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        const [qRes, pRes] = await Promise.all([
          fetch(`${API}/api/quizzes`, { headers }),
          fetch(`${API}/api/user/plan`, { headers }),
        ]);
        if (qRes.ok) {
          const quizzes = await qRes.json();
          const totalViews = quizzes.reduce((s: number, q: any) => s + (q.views || 0), 0);
          const totalLeads = quizzes.reduce((s: number, q: any) => s + (q.leads || 0), 0);
          const v = document.getElementById('sq-views'); if (v && totalViews > 0) v.textContent = totalViews;
          const l = document.getElementById('sq-leads'); if (l && totalLeads > 0) l.textContent = totalLeads;
          if (quizzes.length > 0) {
            const tbody = document.getElementById('sq-tbody');
            if (tbody) tbody.innerHTML = quizzes.slice(0,5).map((q: any) => `
              <tr onclick="window.__goTo('/dashboard/${q.id}')">
                <td style="font-weight:600;color:#f0f2f5">${q.title.slice(0,24)}</td>
                <td><span class="badge-hot">🔥 Hot</span></td>
                <td><span class="pipe-stage pipe-new">New</span></td>
                <td>${new Date(q.created_at).toLocaleDateString()}</td>
              </tr>`).join('');
          }
        }
      } catch(e) { console.log(e); }
    }
    loadData();
  }, []);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
:root{
  --acc:#D2FF1D;--bg:#07090c;--bg2:#0d1018;--bg3:#131720;
  --g1:rgba(255,255,255,.055);--g2:rgba(255,255,255,.034);--g3:rgba(255,255,255,.018);
  --b1:rgba(255,255,255,.09);--b2:rgba(255,255,255,.058);--b3:rgba(255,255,255,.034);
  --t1:#f0f2f5;--t2:rgba(240,242,245,.68);--t3:rgba(240,242,245,.42);--t4:rgba(240,242,245,.22);
  --acc-dim:rgba(210,255,29,.09);--acc-b:rgba(210,255,29,.18);
  --green:#4ade80;--red:#f87171;--yellow:#fbbf24;
  --fam:'DM Sans',system-ui,sans-serif;--mono:'DM Mono',monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--fam);background:var(--bg);color:var(--t1);min-height:100vh}
.gnav{position:fixed;top:0;left:0;right:0;z-index:300;background:rgba(7,9,12,.88);backdrop-filter:blur(32px);border-bottom:.5px solid var(--b2);height:56px;display:flex;align-items:center;padding:0 24px;gap:16px}
.gnav-mark{width:28px;height:28px;background:var(--acc);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.gnav-name{font-size:15px;font-weight:700;color:var(--t1);letter-spacing:-.03em}
.gnav-right{display:flex;gap:8px;align-items:center;margin-left:auto}
.gn-btn{font-size:12px;font-weight:500;color:var(--t3);padding:6px 12px;border-radius:8px;cursor:pointer;border:.5px solid var(--b2);background:transparent;font-family:var(--fam);transition:all .15s}
.gn-btn:hover{color:var(--t1);border-color:var(--b1)}
.gn-btn.acc{background:var(--acc);color:#07090c;border-color:var(--acc);font-weight:700}
.dsidebar{position:fixed;top:56px;left:0;bottom:0;width:210px;background:var(--bg2);border-right:.5px solid var(--b2);padding:16px 10px;z-index:100;display:flex;flex-direction:column;gap:2px;overflow-y:auto;scrollbar-width:none}
.dsi{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;color:var(--t3);font-size:14px;font-weight:500;transition:all .15s;border:none;background:transparent;font-family:var(--fam);width:100%;text-align:left;position:relative;letter-spacing:-.01em}
.dsi:hover{background:var(--g1);color:var(--t2)}
.dsi.on{background:var(--acc-dim);border:.5px solid var(--acc-b);color:var(--acc)}
.dsi svg{flex-shrink:0;opacity:.7;width:16px;height:16px}
.dsi.on svg{opacity:1}
.dsec{font-size:11px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.1em;padding:16px 12px 7px}
.dnotif{width:5px;height:5px;border-radius:50%;background:var(--acc);position:absolute;right:9px;top:50%;transform:translateY(-50%)}
.dcontent{margin-left:210px;padding:28px 36px;min-height:calc(100vh - 56px);padding-top:84px}
.h3{font-size:20px;font-weight:700;color:var(--t1);letter-spacing:-.035em}
.h4{font-size:16px;font-weight:600;color:var(--t1);letter-spacing:-.02em}
.caption{font-size:11px;color:var(--t4)}
.label{font-size:10px;font-weight:700;color:var(--acc);letter-spacing:.08em;text-transform:uppercase}
.btn-p{background:var(--acc);color:#07090c;border:none;border-radius:11px;padding:12px 22px;font-size:14px;font-weight:700;font-family:var(--fam);cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:background .15s,transform .1s;letter-spacing:-.02em}
.btn-p:hover{background:#c8f517;transform:translateY(-1px)}
.btn-s{background:var(--g1);color:var(--t1);border:.5px solid var(--b1);border-radius:11px;padding:11px 20px;font-size:14px;font-weight:500;font-family:var(--fam);cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .15s}
.btn-s:hover{border-color:rgba(255,255,255,.16)}
.stat-card{background:var(--g1);border:.5px solid var(--b1);border-radius:13px;padding:18px 20px;transition:all .2s}
.stat-card:hover{border-color:var(--acc-b);transform:translateY(-1px)}
.stat-v{font-size:28px;font-weight:800;color:var(--acc);letter-spacing:-.05em;line-height:1}
.stat-l{font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.07em;margin-top:4px}
.stat-d{font-size:11px;font-weight:600;margin-top:4px;color:var(--green)}
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
.d-table td{font-size:12px;color:var(--t2);padding:10px 12px;border-bottom:.5px solid var(--b3)}
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
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--b1);border-radius:3px}
@media(max-width:1100px){.dcontent{margin-left:0!important}.dsidebar{display:none!important}}
</style></head><body>

<nav class="gnav">
  <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="window.__goTo('/')">
    <div class="gnav-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
    <span class="gnav-name">Squarespell</span>
  </div>
  <div class="gnav-right">
    <button class="gn-btn acc" onclick="window.__goTo('/pricing')">Upgrade ↑</button>
    <button class="gn-btn" onclick="window.__signOut()">Sign out</button>
  </div>
</nav>

<aside class="dsidebar">
  <p class="dsec">Pages</p>
  <button class="dsi" onclick="window.__goTo('/')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Landing</button>
  <button class="dsi" onclick="window.__goTo('/sign-in')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Sign in</button>
  <button class="dsi on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Dashboard<span class="dnotif"></span></button>
  <button class="dsi" onclick="window.__goTo('/dashboard/analytics')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Analytics</button>
  <button class="dsi" onclick="window.__goTo('/dashboard/leads')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>Leads</button>
  <button class="dsi" onclick="window.__goTo('/dashboard/new')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editor</button>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>Templates</button>
  <button class="dsi" onclick="window.__goTo('/pricing')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Pricing</button>
  <button class="dsi" onclick="window.__goTo('/dashboard/account')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Account</button>
  <p class="dsec">Quiz flow</p>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>Question</button>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Lead gate</button>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v8"/></svg>Result</button>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>Payment</button>
</aside>

<div class="dcontent">
  <div class="trial-bar">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:36px;height:36px;background:var(--acc);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07090c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
      <div><p style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:2px">5 days left on your free trial</p><p style="font-size:11px;color:var(--t3)">Upgrade before trial ends to keep your leads and quizzes.</p></div>
    </div>
    <div style="display:flex;gap:9px;flex-shrink:0">
      <button class="btn-p" style="font-size:12px;padding:9px 16px" onclick="window.__goTo('/pricing')">Upgrade now</button>
      <button style="font-size:12px;color:var(--t4);background:transparent;border:none;cursor:pointer;font-family:var(--fam)">Remind me later</button>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div><p class="h3" style="margin-bottom:2px">Dashboard</p><p class="caption">Last 7 days · All quizzes</p></div>
    <div style="display:flex;gap:9px">
      <button class="btn-s" style="font-size:12px;padding:9px 14px" onclick="window.__goTo('/dashboard/new')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New quiz</button>
      <button class="btn-s" style="font-size:12px;padding:9px 14px">Export CSV</button>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">
    <div class="stat-card"><p class="stat-v" id="sq-views">312</p><p class="stat-l">Total views</p><p class="stat-d">↑ 24% vs last week</p></div>
    <div class="stat-card"><p class="stat-v" id="sq-leads">38</p><p class="stat-l">Leads captured</p><p class="stat-d">↑ 12 new leads</p></div>
    <div class="stat-card"><p class="stat-v">61%</p><p class="stat-l">Completion rate</p><p class="stat-d">Industry avg 48%</p></div>
    <div class="stat-card"><p class="stat-v">12%</p><p class="stat-l">Lead conversion</p><p class="stat-d">Avg is 8%</p></div>
  </div>

  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:14px;margin-bottom:14px">
    <div class="glass-sm" style="padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><p class="h4">Daily performance</p><div style="display:flex;gap:10px"><div style="display:flex;align-items:center;gap:4px"><div class="cdot" style="background:var(--acc)"></div><span style="font-size:10px;color:var(--t3)">Views</span></div><div style="display:flex;align-items:center;gap:4px"><div class="cdot" style="background:var(--green)"></div><span style="font-size:10px;color:var(--t3)">Leads</span></div></div></div>
      <div style="display:flex;align-items:flex-end;gap:5px;height:120px;margin-bottom:6px">
        <div class="mini-bar" style="background:rgba(210,255,29,.15);height:50%"></div>
        <div class="mini-bar" style="background:rgba(210,255,29,.15);height:35%"></div>
        <div class="mini-bar" style="background:rgba(210,255,29,.15);height:64%"></div>
        <div class="mini-bar" style="background:rgba(210,255,29,.15);height:44%"></div>
        <div class="mini-bar" style="background:rgba(210,255,29,.15);height:74%"></div>
        <div class="mini-bar" style="background:var(--acc);height:100%"></div>
        <div class="mini-bar" style="background:rgba(210,255,29,.15);height:67%"></div>
      </div>
      <div style="display:flex;gap:5px"><span style="flex:1;text-align:center;font-size:10px;color:var(--t4)">Mon</span><span style="flex:1;text-align:center;font-size:10px;color:var(--t4)">Tue</span><span style="flex:1;text-align:center;font-size:10px;color:var(--t4)">Wed</span><span style="flex:1;text-align:center;font-size:10px;color:var(--t4)">Thu</span><span style="flex:1;text-align:center;font-size:10px;color:var(--t4)">Fri</span><span style="flex:1;text-align:center;font-size:10px;color:var(--acc);font-weight:700">Sat</span><span style="flex:1;text-align:center;font-size:10px;color:var(--t4)">Sun</span></div>
    </div>
    <div class="glass-sm" style="padding:18px">
      <p class="h4" style="margin-bottom:14px">Traffic sources</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;color:var(--t2);font-weight:500">Direct</span><span style="font-size:12px;color:var(--t3)">58%</span></div><div class="usage-wrap"><div class="usage-bar" style="width:58%;background:var(--acc)"></div></div></div>
        <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;color:var(--t2);font-weight:500">Instagram</span><span style="font-size:12px;color:var(--t3)">24%</span></div><div class="usage-wrap"><div class="usage-bar" style="width:24%;background:rgba(210,255,29,.6)"></div></div></div>
        <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;color:var(--t2);font-weight:500">Google</span><span style="font-size:12px;color:var(--t3)">12%</span></div><div class="usage-wrap"><div class="usage-bar" style="width:12%;background:rgba(210,255,29,.35)"></div></div></div>
        <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;color:var(--t2);font-weight:500">Pinterest</span><span style="font-size:12px;color:var(--t3)">6%</span></div><div class="usage-wrap"><div class="usage-bar" style="width:6%;background:rgba(210,255,29,.2)"></div></div></div>
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:14px;margin-bottom:14px">
    <div class="glass-sm" style="padding:18px">
      <p class="h4" style="margin-bottom:14px">Quiz funnel</p>
      <div style="display:flex;flex-direction:column;gap:7px">
        <div class="funnel-step"><span style="font-size:11px;color:var(--t3);width:55px;flex-shrink:0;font-weight:500">Q1</span><div class="f-bar-wrap"><div class="f-bar" style="width:100%"></div></div><span style="font-size:12px;color:var(--t1);font-weight:700;width:36px;text-align:right">100%</span></div>
        <div class="funnel-step"><span style="font-size:11px;color:var(--t3);width:55px;flex-shrink:0;font-weight:500">Q2</span><div class="f-bar-wrap"><div class="f-bar" style="width:88%"></div></div><span style="font-size:12px;color:var(--t1);font-weight:700;width:36px;text-align:right">88%</span></div>
        <div class="funnel-step"><span style="font-size:11px;color:var(--yellow);width:55px;flex-shrink:0;font-weight:600">Q3 ⚠</span><div class="f-bar-wrap"><div class="f-bar" style="width:72%;background:var(--yellow)"></div></div><span style="font-size:12px;color:var(--yellow);font-weight:700;width:36px;text-align:right">72%</span></div>
        <div class="funnel-step"><span style="font-size:11px;color:var(--t3);width:55px;flex-shrink:0;font-weight:500">Q4</span><div class="f-bar-wrap"><div class="f-bar" style="width:68%;background:rgba(210,255,29,.35)"></div></div><span style="font-size:12px;color:var(--t1);font-weight:700;width:36px;text-align:right">68%</span></div>
        <div class="funnel-step"><span style="font-size:11px;color:var(--t3);width:55px;flex-shrink:0;font-weight:500">Lead</span><div class="f-bar-wrap"><div class="f-bar" style="width:61%;background:var(--green)"></div></div><span style="font-size:12px;color:var(--green);font-weight:700;width:36px;text-align:right">61%</span></div>
      </div>
      <div class="ai-box" style="margin-top:12px">💡 Q3 drop is 16 pts. Try reducing to 3 options to improve completion by ~12%.</div>
    </div>
    <div class="glass-sm" style="padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><p class="h4">Recent leads</p><button style="font-size:11px;color:var(--acc);background:transparent;border:none;cursor:pointer;font-family:var(--fam);font-weight:600" onclick="window.__goTo('/dashboard/leads')">View all →</button></div>
      <table class="d-table">
        <thead><tr><th>Name</th><th>Score</th><th>Stage</th><th>Time</th></tr></thead>
        <tbody id="sq-tbody">
          <tr onclick="window.__goTo('/dashboard/leads')"><td style="font-weight:600;color:var(--t1)">Sarah Chen</td><td><span class="badge-hot">🔥 Hot</span></td><td><span class="pipe-stage pipe-new">New</span></td><td>2m ago</td></tr>
          <tr onclick="window.__goTo('/dashboard/leads')"><td style="font-weight:600;color:var(--t1)">Marcus Riley</td><td><span class="badge-warm">⚡ Warm</span></td><td><span class="pipe-stage pipe-contact">Contacted</span></td><td>18m ago</td></tr>
          <tr onclick="window.__goTo('/dashboard/leads')"><td style="font-weight:600;color:var(--t1)">Jade Park</td><td><span class="badge-hot">🔥 Hot</span></td><td><span class="pipe-stage pipe-nurture">Nurtured</span></td><td>1h ago</td></tr>
          <tr onclick="window.__goTo('/dashboard/leads')"><td style="font-weight:600;color:var(--t1)">Tom Lee</td><td><span class="badge-cold">❄ Cold</span></td><td><span class="pipe-stage pipe-new">New</span></td><td>3h ago</td></tr>
          <tr onclick="window.__goTo('/dashboard/leads')"><td style="font-weight:600;color:var(--t1)">Amy Liu</td><td><span class="badge-warm">⚡ Warm</span></td><td><span class="pipe-stage pipe-convert">Converted</span></td><td>5h ago</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="roi-card" style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
    <div><p class="label" style="margin-bottom:4px">ROI Tracker</p><p class="h4" style="margin-bottom:3px">Estimated pipeline value this month</p><p class="caption">38 leads × $150 avg client value</p></div>
    <div style="text-align:right"><p style="font-size:38px;font-weight:800;color:var(--acc);letter-spacing:-.06em">$5,700</p><p style="font-size:11px;color:var(--t3)">Potential revenue</p></div>
  </div>

  <div style="background:var(--g1);border:.5px solid var(--b1);border-radius:13px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:var(--t2);font-weight:500">Leads used (trial)</span><span style="font-size:11px;color:var(--yellow)">38/50 — Running low</span></div><div class="usage-wrap" style="width:200px"><div class="usage-bar" style="width:76%;background:var(--yellow)"></div></div></div>
    <button class="btn-p" style="font-size:12px;padding:9px 16px" onclick="window.__goTo('/pricing')">Upgrade to Pro</button>
  </div>
</div>
</body></html>`;

  return <div style={{width:'100%',height:'100vh',overflow:'auto'}} dangerouslySetInnerHTML={{__html:html}}/>;
}
