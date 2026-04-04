'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

export default function NewQuizPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (window as any).__goTo = (path: string) => router.push(path);
    (window as any).__generateQuiz = async (url: string, goal: string) => {
      if (!url) { alert('Please enter your website URL'); return; }
      setGenerating(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API}/api/generate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, business_type: 'coaching', goal: goal || 'Generate more leads' }),
        });
        if (res.ok) {
          const data = await res.json();
          router.push(`/dashboard/${data.id || ''}`);
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to generate quiz');
        }
      } catch(e) { alert('Something went wrong. Please try again.'); }
      setGenerating(false);
    };
  }, []);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
:root{
  --acc:#D2FF1D;--bg:#07090c;--bg2:#0d1018;
  --g1:rgba(255,255,255,.055);--g2:rgba(255,255,255,.034);
  --b1:rgba(255,255,255,.09);--b2:rgba(255,255,255,.058);--b3:rgba(255,255,255,.034);
  --t1:#f0f2f5;--t2:rgba(240,242,245,.68);--t3:rgba(240,242,245,.42);--t4:rgba(240,242,245,.22);
  --acc-dim:rgba(210,255,29,.09);--acc-b:rgba(210,255,29,.18);
  --green:#4ade80;--yellow:#fbbf24;--fam:'DM Sans',system-ui,sans-serif;
}
body{font-family:var(--fam);background:var(--bg);color:var(--t1);min-height:100vh}
.gnav{position:fixed;top:0;left:0;right:0;z-index:300;background:rgba(7,9,12,.88);backdrop-filter:blur(32px);border-bottom:.5px solid var(--b2);height:56px;display:flex;align-items:center;padding:0 24px;gap:16px}
.gnav-mark{width:28px;height:28px;background:var(--acc);border-radius:8px;display:flex;align-items:center;justify-content:center}
.gnav-name{font-size:15px;font-weight:700;color:var(--t1);letter-spacing:-.03em}
.gnav-back{font-size:13px;color:var(--t3);cursor:pointer;display:flex;align-items:center;gap:6px;margin-left:auto;transition:color .15s}
.gnav-back:hover{color:var(--t1)}
.dsidebar{position:fixed;top:56px;left:0;bottom:0;width:210px;background:var(--bg2);border-right:.5px solid var(--b2);padding:16px 10px;z-index:100;display:flex;flex-direction:column;gap:2px;overflow-y:auto;scrollbar-width:none}
.dsi{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;color:var(--t3);font-size:14px;font-weight:500;transition:all .15s;border:none;background:transparent;font-family:var(--fam);width:100%;text-align:left}
.dsi:hover{background:var(--g1);color:var(--t2)}
.dsi.on{background:var(--acc-dim);border:.5px solid var(--acc-b);color:var(--acc)}
.dsi svg{flex-shrink:0;opacity:.7;width:16px;height:16px}
.dsi.on svg{opacity:1}
.dsec{font-size:11px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.1em;padding:16px 12px 7px}
.dcontent{margin-left:210px;padding:28px 36px;min-height:calc(100vh - 56px);padding-top:84px}
.h2{font-size:32px;font-weight:800;color:var(--t1);line-height:1.1;letter-spacing:-.045em}
.h3{font-size:22px;font-weight:700;color:var(--t1);letter-spacing:-.035em}
.body{font-size:15px;color:var(--t2);line-height:1.6}
.body-lg{font-size:18px;color:var(--t2);line-height:1.65}
.label{font-size:11px;font-weight:700;color:var(--acc);letter-spacing:.08em;text-transform:uppercase}
.chip{background:var(--g2);border:.5px solid var(--b2);border-radius:20px;padding:3px 10px;font-size:12px;color:var(--t3);font-weight:500;display:inline-flex;align-items:center;gap:4px}
.chip-acc{background:var(--acc-dim);border:.5px solid var(--acc-b);border-radius:20px;padding:3px 10px;font-size:12px;color:var(--acc);font-weight:600;display:inline-flex;align-items:center;gap:4px}
.btn-p{background:var(--acc);color:#07090c;border:none;border-radius:11px;padding:14px 24px;font-size:15px;font-weight:700;font-family:var(--fam);cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:background .15s,transform .1s;letter-spacing:-.02em}
.btn-p:hover{background:#c8f517;transform:translateY(-1px)}
.btn-s{background:var(--g1);color:var(--t1);border:.5px solid var(--b1);border-radius:11px;padding:13px 22px;font-size:15px;font-weight:500;font-family:var(--fam);cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .15s}
.btn-s:hover{border-color:rgba(255,255,255,.16)}
.tmpl-card{background:var(--g1);border:.5px solid var(--b1);border-radius:13px;padding:20px;cursor:pointer;transition:all .2s}
.tmpl-card:hover{border-color:var(--acc-b);transform:translateY(-2px)}
.inp-row{background:var(--g2);border:.5px solid var(--b2);border-radius:11px;padding:14px 16px;display:flex;align-items:center;gap:9px;transition:border-color .15s}
.inp-row:focus-within{border-color:var(--acc-b)}
.inp{background:transparent;border:none;outline:none;font-size:15px;color:var(--t1);font-family:var(--fam);flex:1}
.inp::placeholder{color:var(--t4)}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--b1);border-radius:3px}
@media(max-width:1100px){.dcontent{margin-left:0!important}.dsidebar{display:none!important}}
.spinner{display:none;width:20px;height:20px;border:2px solid rgba(7,9,12,.3);border-top-color:#07090c;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body>

<nav class="gnav">
  <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="window.__goTo('/')">
    <div class="gnav-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
    <span class="gnav-name">Squarespell</span>
  </div>
  <span class="gnav-back" onclick="window.__goTo('/dashboard')">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
    Back to dashboard
  </span>
</nav>

<aside class="dsidebar">
  <p class="dsec">Pages</p>
  <button class="dsi" onclick="window.__goTo('/')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Landing</button>
  <button class="dsi" onclick="window.__goTo('/sign-in')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Sign in</button>
  <button class="dsi" onclick="window.__goTo('/dashboard')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Dashboard</button>
  <button class="dsi" onclick="window.__goTo('/dashboard/leads')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Leads</button>
  <button class="dsi on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Editor</button>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>Templates</button>
  <button class="dsi" onclick="window.__goTo('/pricing')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Pricing</button>
  <p class="dsec">Quiz flow</p>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>Question</button>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Lead gate</button>
  <button class="dsi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v8"/></svg>Result</button>
</aside>

<div class="dcontent">

  <!-- Templates section -->
  <div style="text-align:center;margin-bottom:36px">
    <p class="label" style="margin-bottom:10px">Quick start</p>
    <p class="h2" style="margin-bottom:12px">Ready-made funnel templates</p>
    <p class="body-lg" style="max-width:440px;margin:0 auto">Choose your business type. AI adapts the template to your brand automatically.</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:40px">
    <div class="tmpl-card" onclick="document.getElementById('url-inp').focus()">
      <div style="width:40px;height:40px;background:rgba(210,255,29,.1);border:.5px solid var(--acc-b);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px"><span style="font-size:20px">🎯</span></div>
      <p style="font-size:15px;font-weight:700;color:var(--t1);margin-bottom:6px">Coaching</p>
      <p style="font-size:13px;color:var(--t3);line-height:1.5;margin-bottom:12px">Qualify discovery call prospects by urgency, budget, and alignment.</p>
      <div style="margin-bottom:13px"><span class="chip-acc">12% avg conversion</span></div>
      <button class="btn-s" style="font-size:13px;padding:10px 16px;width:100%" onclick="event.stopPropagation();setGoal('coaching')">Use template</button>
    </div>
    <div class="tmpl-card" onclick="document.getElementById('url-inp').focus()">
      <div style="width:40px;height:40px;background:rgba(96,165,250,.08);border:.5px solid rgba(96,165,250,.18);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px"><span style="font-size:20px">🏢</span></div>
      <p style="font-size:15px;font-weight:700;color:var(--t1);margin-bottom:6px">Agency</p>
      <p style="font-size:13px;color:var(--t3);line-height:1.5;margin-bottom:12px">Qualify clients by project type and budget. Filter time-wasters automatically.</p>
      <div style="margin-bottom:13px"><span class="chip">White-label ready</span></div>
      <button class="btn-s" style="font-size:13px;padding:10px 16px;width:100%" onclick="event.stopPropagation();setGoal('agency')">Use template</button>
    </div>
    <div class="tmpl-card" onclick="document.getElementById('url-inp').focus()">
      <div style="width:40px;height:40px;background:rgba(251,191,36,.08);border:.5px solid rgba(251,191,36,.18);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px"><span style="font-size:20px">✨</span></div>
      <p style="font-size:15px;font-weight:700;color:var(--t1);margin-bottom:6px">Creators</p>
      <p style="font-size:13px;color:var(--t3);line-height:1.5;margin-bottom:12px">Match followers to your right offer. Grow your list with qualified subscribers.</p>
      <div style="margin-bottom:13px"><span class="chip">Content-focused</span></div>
      <button class="btn-s" style="font-size:13px;padding:10px 16px;width:100%" onclick="event.stopPropagation();setGoal('creator')">Use template</button>
    </div>
    <div class="tmpl-card" onclick="document.getElementById('url-inp').focus()">
      <div style="width:40px;height:40px;background:rgba(167,139,250,.08);border:.5px solid rgba(167,139,250,.18);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px"><span style="font-size:20px">📍</span></div>
      <p style="font-size:15px;font-weight:700;color:var(--t1);margin-bottom:6px">Local Business</p>
      <p style="font-size:13px;color:var(--t3);line-height:1.5;margin-bottom:12px">Capture local leads and pre-qualify by area, budget, and timeline.</p>
      <div style="margin-bottom:13px"><span class="chip">Local SEO boost</span></div>
      <button class="btn-s" style="font-size:13px;padding:10px 16px;width:100%" onclick="event.stopPropagation();setGoal('local')">Use template</button>
    </div>
  </div>

  <!-- AI Generator -->
  <div style="background:var(--acc-dim);border:.5px solid var(--acc-b);border-radius:16px;padding:36px;text-align:center">
    <p class="h3" style="margin-bottom:12px">AI Quiz Generator</p>
    <p class="body" style="max-width:480px;margin:0 auto 26px">Paste your Squarespace URL. AI reads your brand, industry, and audience — then builds a complete quiz in 30 seconds.</p>
    <div id="goal-tag" style="display:inline-flex;align-items:center;gap:6px;background:rgba(210,255,29,.08);border:.5px solid var(--acc-b);border-radius:20px;padding:5px 14px;margin-bottom:20px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <span id="goal-label" style="font-size:13px;font-weight:700;color:var(--acc)">Generate more leads</span>
    </div>
    <div style="display:flex;gap:12px;max-width:560px;margin:0 auto">
      <div class="inp-row" style="flex:1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>
        <input id="url-inp" class="inp" placeholder="https://yourbusiness.squarespace.com"/>
      </div>
      <button class="btn-p" id="gen-btn" onclick="handleGenerate()">
        Generate quiz
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07090c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span class="spinner" id="spinner"></span>
      </button>
    </div>
    <p style="font-size:13px;color:var(--t4);margin-top:14px">Takes ~30 seconds · No credit card required</p>
  </div>

</div>

<script>
let selectedGoal = 'Generate more leads';

function setGoal(type) {
  const goals = {
    coaching: 'Qualify coaching discovery calls',
    agency: 'Qualify agency clients by budget',
    creator: 'Match followers to the right offer',
    local: 'Capture and qualify local leads'
  };
  selectedGoal = goals[type] || 'Generate more leads';
  document.getElementById('goal-label').textContent = selectedGoal;
  document.getElementById('url-inp').scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('url-inp').focus();
}

function handleGenerate() {
  const url = document.getElementById('url-inp').value.trim();
  const btn = document.getElementById('gen-btn');
  const spinner = document.getElementById('spinner');
  btn.disabled = true;
  spinner.style.display = 'block';
  window.__generateQuiz(url, selectedGoal);
}
</script>
</body></html>`;

  if (generating) {
    return (
      <div style={{width:'100%',height:'100vh',background:'#07090c',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px'}}>
        <div style={{width:'40px',height:'40px',border:'3px solid rgba(210,255,29,.2)',borderTopColor:'#D2FF1D',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
        <p style={{color:'rgba(240,242,245,.42)',fontFamily:'DM Sans, sans-serif',fontSize:'14px'}}>Building your quiz…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return <div style={{width:'100%',height:'100vh',overflow:'auto'}} dangerouslySetInnerHTML={{__html:html}}/>;
}
