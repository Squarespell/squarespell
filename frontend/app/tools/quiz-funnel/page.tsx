'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'
import { QUIZ_TEMPLATE_CATALOG } from '@/lib/quiz/templates'

/* ─── tokens ─── */
const A='#0f7377',AH='#0b6165',AL='#e8f5f5',T='#0d1117',M='#6b7280',B='#e5e7eb',S='#f9fafb',W='#ffffff'
const F="'Inter', system-ui, sans-serif"
const sh={sm:'0 1px 3px rgba(0,0,0,.07)',md:'0 4px 16px rgba(0,0,0,.08)',lg:'0 12px 40px rgba(0,0,0,.10)',xl:'0 24px 64px rgba(0,0,0,.13)'}

/* ─── tiny helpers ─── */
function Tag({label}:{label:string}){
  return <div style={{display:'inline-flex',alignItems:'center',gap:6,background:AL,color:A,fontSize:11,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase' as const,padding:'5px 14px',borderRadius:100,marginBottom:20,fontFamily:F}}>{label}</div>
}

function SidebarNav({active}:{active:string}){
  const sections=[
    {label:'OVERVIEW',items:['Dashboard','Analytics']},
    {label:'QUIZZES',items:['All quizzes','Templates']},
    {label:'LEADS',items:['All leads','Segmentation']},
    {label:'ENGAGE',items:['Email Campaigns','Automations']},
  ]
  return(
    <div style={{width:170,borderRight:`1px solid ${B}`,background:W,padding:'12px 0',flexShrink:0,fontSize:11,fontFamily:F}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'0 12px 14px'}}>
        <div style={{width:22,height:22,background:A,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#fff"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#fff"/><circle cx="17" cy="18" r="2" fill="#fff"/></svg>
        </div>
        <span style={{fontSize:10,fontWeight:800,color:T}}>Squarespell Quiz</span>
      </div>
      {sections.map(s=>(
        <div key={s.label}>
          <div style={{fontSize:9,fontWeight:700,color:'#9ca3af',padding:'6px 12px 3px',letterSpacing:'.08em'}}>{s.label}</div>
          {s.items.map(item=>(
            <div key={item} style={{padding:'5px 12px',fontSize:11,fontWeight:item===active?700:500,color:item===active?A:'#374151',background:item===active?AL:'transparent',borderLeft:item===active?`2px solid ${A}`:'2px solid transparent',cursor:'pointer'}}>{item}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

function BrowserFrame({children,url}:{children:React.ReactNode,url?:string}){
  return(
    <div style={{border:`1px solid ${B}`,borderRadius:16,overflow:'hidden',boxShadow:sh.xl,background:W}}>
      <div style={{background:'#f3f4f6',padding:'9px 14px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',gap:8}}>
        <div style={{display:'flex',gap:5}}>
          {['#ef4444','#f59e0b','#22c55e'].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}
        </div>
        <div style={{flex:1,background:W,border:`1px solid ${B}`,borderRadius:5,padding:'3px 10px',fontSize:10,color:M,maxWidth:240,margin:'0 auto',textAlign:'center' as const}}>{url||'app.squarespell.com'}</div>
      </div>
      {children}
    </div>
  )
}

/* ─── dashboard mockup ─── */
function DashboardMockup(){
  const stats=[{l:'Total Responses',v:'2,847',u:'+23%'},{l:'Completion Rate',v:'68.4%',u:'+5%'},{l:'Leads Captured',v:'1,924',u:'+31%'},{l:'Active Quizzes',v:'4',u:'+1'},{l:'Avg Score',v:'73/100',u:'+4%'}]
  return(
    <BrowserFrame url="app.squarespell.com/dashboard">
      <div style={{display:'flex',height:360,fontFamily:F}}>
        <SidebarNav active="Dashboard"/>
        <div style={{flex:1,padding:18,background:S,overflow:'hidden'}}>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap' as const}}>
            {stats.map(s=>(
              <div key={s.l} style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'10px 12px',flex:'1 1 80px',minWidth:80}}>
                <div style={{fontSize:8,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.06em',marginBottom:3}}>{s.l}</div>
                <div style={{fontSize:16,fontWeight:800,color:T,letterSpacing:'-.02em'}}>{s.v}</div>
                <div style={{fontSize:9,color:'#16a34a',fontWeight:600,marginTop:2}}>↑ {s.u}</div>
              </div>
            ))}
          </div>
          <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'14px',marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:T,marginBottom:10}}>Responses over time</div>
            <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none">
              <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A} stopOpacity="0.15"/><stop offset="100%" stopColor={A} stopOpacity="0"/></linearGradient></defs>
              <path d="M0,65 C30,60 50,40 80,35 C110,30 130,45 160,38 C190,31 210,20 240,18 C270,16 290,25 320,20 C350,15 370,10 400,8" fill="none" stroke={A} strokeWidth="2"/>
              <path d="M0,65 C30,60 50,40 80,35 C110,30 130,45 160,38 C190,31 210,20 240,18 C270,16 290,25 320,20 C350,15 370,10 400,8 L400,80 L0,80Z" fill="url(#ag)"/>
            </svg>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'12px'}}>
              <div style={{fontSize:10,fontWeight:700,color:T,marginBottom:8}}>Top Quizzes</div>
              {[['Photography Style','847','78%'],['Wedding Planner','403','71%'],['Fitness Goal Finder','321','65%']].map(([n,r,c])=>(
                <div key={n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',borderBottom:`1px solid ${B}`,fontSize:9}}>
                  <span style={{color:T,fontWeight:600}}>{n}</span>
                  <span style={{color:M}}>{r} leads · {c}</span>
                </div>
              ))}
            </div>
            <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'12px'}}>
              <div style={{fontSize:10,fontWeight:700,color:T,marginBottom:8}}>Conversion Funnel</div>
              {[['Views','5,200','100%'],['Started','3,847','74%'],['Completed','2,847','55%'],['Leads','1,924','37%']].map(([l,v,p])=>(
                <div key={l} style={{marginBottom:5}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:8,marginBottom:2}}>
                    <span style={{color:M}}>{l}</span><span style={{color:T,fontWeight:700}}>{v}</span>
                  </div>
                  <div style={{height:4,background:'#f3f4f6',borderRadius:100}}><div style={{height:'100%',width:p,background:A,borderRadius:100}}/></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ─── leads mockup ─── */
function LeadsMockup(){
  const leads=[
    {name:'Sarah Miller',email:'sarah@gmail.com',quiz:'Photography Style',score:92,intent:'High'},
    {name:'James Chen',email:'james@studio.co',quiz:'Wedding Planner',score:67,intent:'New'},
    {name:'Emily Ross',email:'emily@mail.com',quiz:'Fitness Goal',score:84,intent:'High'},
    {name:'Tom Walker',email:'tom@work.net',quiz:'Photography Style',score:38,intent:'Low'},
    {name:'Priya Patel',email:'priya@co.in',quiz:'Product Finder',score:73,intent:'New'},
  ]
  const intentColor:Record<string,string>={High:'#16a34a',New:'#d97706',Low:'#9ca3af'}
  const intentBg:Record<string,string>={High:'#f0fdf4',New:'#fffbeb',Low:'#f9fafb'}
  return(
    <BrowserFrame url="app.squarespell.com/dashboard/leads">
      <div style={{display:'flex',height:340,fontFamily:F}}>
        <SidebarNav active="All leads"/>
        <div style={{flex:1,padding:16,background:S,overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:T}}>All Leads</div>
            <div style={{display:'flex',gap:6}}>
              <div style={{fontSize:10,padding:'4px 10px',borderRadius:6,border:`1px solid ${B}`,background:W,color:M,cursor:'pointer'}}>Filter</div>
              <div style={{fontSize:10,padding:'4px 10px',borderRadius:6,background:A,color:W,cursor:'pointer',fontWeight:600}}>Export CSV</div>
            </div>
          </div>
          <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1.4fr 1.6fr 1.2fr .6fr .5fr .6fr',padding:'8px 12px',borderBottom:`1px solid ${B}`,background:S}}>
              {['Name','Email','Quiz','Score','Intent','Date'].map(h=><div key={h} style={{fontSize:9,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{h}</div>)}
            </div>
            {leads.map((l,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1.4fr 1.6fr 1.2fr .6fr .5fr .6fr',padding:'8px 12px',borderBottom:i<leads.length-1?`1px solid ${B}`:'none',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:W,fontWeight:700,flexShrink:0}}>{l.name.split(' ').map(n=>n[0]).join('')}</div>
                  <span style={{fontSize:11,fontWeight:600,color:T}}>{l.name}</span>
                </div>
                <div style={{fontSize:10,color:M}}>{l.email}</div>
                <div style={{fontSize:10,color:T}}>{l.quiz}</div>
                <div style={{fontSize:11,fontWeight:700,color:T}}>{l.score}</div>
                <div style={{display:'inline-flex'}}><span style={{fontSize:9,fontWeight:700,color:intentColor[l.intent],background:intentBg[l.intent],padding:'2px 7px',borderRadius:100}}>{l.intent}</span></div>
                <div style={{fontSize:10,color:M}}>Today</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ─── editor mockup ─── */
function EditorMockup(){
  const blocks=[
    {type:'settings',label:'Quiz Settings',icon:'⚙'},
    {type:'question',label:'Q1 — What photography style...','icon':'?',active:true},
    {type:'question',label:'Q2 — Which editing style...',icon:'?'},
    {type:'question',label:'Q3 — How would you describe...',icon:'?'},
    {type:'outcome',label:'Outcome: Storyteller',icon:'★'},
    {type:'outcome',label:'Outcome: Artist',icon:'★'},
  ]
  return(
    <BrowserFrame url="app.squarespell.com/dashboard/quiz/edit">
      <div style={{display:'flex',height:380,fontFamily:F}}>
        <div style={{width:200,borderRight:`1px solid ${B}`,background:W,padding:'10px 0',fontSize:11,overflow:'hidden'}}>
          <div style={{padding:'0 10px 10px',fontSize:12,fontWeight:800,color:T}}>Quiz Editor</div>
          {blocks.map((b,i)=>(
            <div key={i} style={{padding:'7px 10px',margin:'0 8px 3px',borderRadius:7,background:b.active?AL:'transparent',border:b.active?`1px solid ${A}`:b.type==='outcome'?'1px solid transparent':'1px solid transparent',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:10,color:b.type==='settings'?A:b.type==='outcome'?'#7c3aed':M}}>{b.icon}</span>
              <span style={{fontSize:10,fontWeight:b.active?700:500,color:b.active?A:T,overflow:'hidden',whiteSpace:'nowrap' as const,textOverflow:'ellipsis'}}>{b.label}</span>
            </div>
          ))}
          <div style={{margin:'10px 8px 0',padding:'7px 10px',borderRadius:7,border:`1px dashed ${B}`,cursor:'pointer',fontSize:10,color:M,textAlign:'center' as const}}>+ Add block</div>
        </div>
        <div style={{flex:1,padding:16,background:S,overflow:'auto'}}>
          <div style={{background:W,border:`1px solid ${B}`,borderRadius:10,padding:16,marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:6}}>Question text</div>
            <div style={{border:`1px solid ${A}`,borderRadius:7,padding:'8px 12px',fontSize:12,color:T,fontWeight:600,boxShadow:`0 0 0 3px ${AL}`}}>What photography style resonates most with you?</div>
            <div style={{fontSize:9,color:M,marginTop:4}}>Subtitle (optional) — helps visitors understand what to choose</div>
          </div>
          <div style={{background:W,border:`1px solid ${B}`,borderRadius:10,padding:16,marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:9,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.07em'}}>Answer options</div>
              <div style={{display:'flex',gap:4}}>
                {['List','Grid','Full Bg','Thumbnails','Split'].map((l,i)=>(
                  <div key={l} style={{fontSize:8,padding:'3px 7px',borderRadius:5,background:i===1?A:'#f3f4f6',color:i===1?W:M,cursor:'pointer',fontWeight:i===1?700:400}}>{l}</div>
                ))}
              </div>
            </div>
            {[['A','Candid, emotional moments',4],['B','Perfectly styled portraits',3],['C','The venue and details',2],['D','Fun party shots',1]].map(([ltr,txt,sc])=>(
              <div key={ltr as string} style={{display:'flex',alignItems:'center',gap:8,padding:'7px',border:`1px solid ${B}`,borderRadius:7,marginBottom:6,background:S}}>
                <div style={{width:20,height:20,borderRadius:5,background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:W,fontWeight:700,flexShrink:0}}>{ltr}</div>
                <span style={{flex:1,fontSize:11,color:T}}>{txt}</span>
                <div style={{fontSize:9,color:M,whiteSpace:'nowrap' as const}}>Score: {sc}</div>
                <span style={{fontSize:10,color:'#d1d5db',cursor:'grab'}}>⋮⋮</span>
              </div>
            ))}
            <div style={{padding:'6px 8px',border:`1px dashed ${B}`,borderRadius:7,fontSize:10,color:M,cursor:'pointer',textAlign:'center' as const}}>+ Add option</div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ─── analytics mockup ─── */
function AnalyticsMockup(){
  return(
    <BrowserFrame url="app.squarespell.com/dashboard/analytics">
      <div style={{display:'flex',height:360,fontFamily:F}}>
        <SidebarNav active="Analytics"/>
        <div style={{flex:1,padding:16,background:S,overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:T}}>Analytics Overview</div>
            <div style={{fontSize:10,padding:'4px 10px',borderRadius:6,border:`1px solid ${B}`,background:W,color:M}}>Last 30 days ▾</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
            {[['Views','5,200','↑ 18%'],['Completions','2,847','↑ 23%'],['Leads','1,924','↑ 31%'],['Lead Rate','37%','↑ 6%']].map(([l,v,u])=>(
              <div key={l} style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:8,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.06em',marginBottom:3}}>{l}</div>
                <div style={{fontSize:17,fontWeight:800,color:T,letterSpacing:'-.02em'}}>{v}</div>
                <div style={{fontSize:9,color:'#16a34a',fontWeight:600,marginTop:2}}>{u}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.8fr 1fr',gap:8,marginBottom:8}}>
            <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'12px'}}>
              <div style={{fontSize:10,fontWeight:700,color:T,marginBottom:10}}>Views vs Leads — Last 30 days</div>
              <svg width="100%" height="90" viewBox="0 0 300 90" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A} stopOpacity=".18"/><stop offset="100%" stopColor={A} stopOpacity="0"/></linearGradient>
                  <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity=".12"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/></linearGradient>
                </defs>
                <path d="M0,70 C40,60 70,45 100,40 C130,35 150,50 180,42 C210,34 240,25 270,18 C285,14 295,12 300,10" fill="none" stroke={A} strokeWidth="2"/>
                <path d="M0,70 C40,60 70,45 100,40 C130,35 150,50 180,42 C210,34 240,25 270,18 C285,14 295,12 300,10 L300,90 L0,90Z" fill="url(#vg)"/>
                <path d="M0,82 C40,76 70,65 100,60 C130,55 150,68 180,60 C210,52 240,44 270,36 C285,32 295,29 300,27" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4 2"/>
                <path d="M0,82 C40,76 70,65 100,60 C130,55 150,68 180,60 C210,52 240,44 270,36 C285,32 295,29 300,27 L300,90 L0,90Z" fill="url(#lg2)"/>
              </svg>
              <div style={{display:'flex',gap:12,marginTop:6}}>
                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:M}}><div style={{width:12,height:2,background:A}}/> Views</div>
                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:9,color:M}}><div style={{width:12,height:2,background:'#7c3aed'}}/> Leads</div>
              </div>
            </div>
            <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'12px'}}>
              <div style={{fontSize:10,fontWeight:700,color:T,marginBottom:10}}>Question Drop-off</div>
              {[['Q1 — Photography style','92%'],['Q2 — Editing preference','84%'],['Q3 — Event vibe','79%'],['Q4 — Budget range','68%'],['Lead gate','37%']].map(([q,p])=>(
                <div key={q as string} style={{marginBottom:6}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:8,marginBottom:2}}>
                    <span style={{color:M,maxWidth:100,overflow:'hidden',whiteSpace:'nowrap' as const,textOverflow:'ellipsis'}}>{q}</span>
                    <span style={{color:T,fontWeight:700}}>{p}</span>
                  </div>
                  <div style={{height:4,background:'#f3f4f6',borderRadius:100}}><div style={{height:'100%',width:p,background:parseFloat(p)>70?A:'#f59e0b',borderRadius:100}}/></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ─── email mockup ─── */
function EmailMockup(){
  const campaigns=[
    {name:'Welcome Sequence',type:'Automation',status:'Active',sent:'1,243',opens:'42.3%',clicks:'18.2%',tc:A,tb:AL},
    {name:'Photography Tips',type:'Broadcast',status:'Active',sent:'847',opens:'38.1%',clicks:'12.4%',tc:'#7c3aed',tb:'#f5f3ff'},
    {name:'High-Score Follow-up',type:'Quiz Result',status:'Active',sent:'412',opens:'61.7%',clicks:'29.3%',tc:'#d97706',tb:'#fffbeb'},
    {name:'30-Day Re-engagement',type:'Automation',status:'Draft',sent:'—',opens:'—',clicks:'—',tc:A,tb:AL},
  ]
  return(
    <BrowserFrame url="app.squarespell.com/dashboard/emails">
      <div style={{display:'flex',height:340,fontFamily:F}}>
        <SidebarNav active="Email Campaigns"/>
        <div style={{flex:1,padding:16,background:S,overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:T}}>Email Campaigns</div>
            <div style={{fontSize:10,padding:'5px 12px',borderRadius:6,background:A,color:W,cursor:'pointer',fontWeight:600}}>+ New Campaign</div>
          </div>
          <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr .8fr .7fr .7fr .7fr',padding:'8px 12px',borderBottom:`1px solid ${B}`,background:S}}>
              {['Campaign','Type','Status','Sent','Opens','Clicks'].map(h=><div key={h} style={{fontSize:9,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{h}</div>)}
            </div>
            {campaigns.map((c,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr .8fr .7fr .7fr .7fr',padding:'9px 12px',borderBottom:i<campaigns.length-1?`1px solid ${B}`:'none',alignItems:'center'}}>
                <div style={{fontSize:11,fontWeight:600,color:T}}>{c.name}</div>
                <div style={{display:'inline-flex'}}><span style={{fontSize:9,fontWeight:700,color:c.tc,background:c.tb,padding:'2px 7px',borderRadius:100}}>{c.type}</span></div>
                <div style={{display:'inline-flex'}}><span style={{fontSize:9,fontWeight:600,color:c.status==='Active'?'#16a34a':'#9ca3af',background:c.status==='Active'?'#f0fdf4':'#f9fafb',padding:'2px 7px',borderRadius:100}}>{c.status}</span></div>
                <div style={{fontSize:11,color:T}}>{c.sent}</div>
                <div style={{fontSize:11,color:T}}>{c.opens}</div>
                <div style={{fontSize:11,color:T}}>{c.clicks}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:10}}>
            {[['1,243','Emails sent this month'],['42.3%','Average open rate'],['18.2%','Average click rate']].map(([v,l])=>(
              <div key={l as string} style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:16,fontWeight:800,color:T,letterSpacing:'-.02em'}}>{v}</div>
                <div style={{fontSize:9,color:M,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

/* ─── quiz delivery mockup ─── */
function QuizMockup(){
  return(
    <div style={{background:W,borderRadius:16,border:`1px solid ${B}`,boxShadow:sh.xl,overflow:'hidden',maxWidth:360,margin:'0 auto',fontFamily:F}}>
      <div style={{background:A,padding:'14px 20px',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:24,height:24,background:'rgba(255,255,255,.2)',borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:W,fontWeight:800}}>S</div>
        <span style={{color:W,fontSize:12,fontWeight:600}}>Sarah Photography</span>
      </div>
      <div style={{padding:'20px'}}>
        <div style={{height:3,background:'#f0fafa',borderRadius:100,marginBottom:16}}><div style={{height:'100%',width:'40%',background:A,borderRadius:100}}/></div>
        <div style={{fontSize:9,color:M,marginBottom:8,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' as const}}>Question 2 of 5</div>
        <div style={{fontSize:15,fontWeight:800,color:T,lineHeight:1.3,marginBottom:16}}>Which editing style are you drawn to?</div>
        {[['A','Light & airy'],['B','Bold & dramatic'],['C','Warm & vintage'],['D','Classic & timeless']].map(([ltr,txt],i)=>(
          <div key={ltr as string} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:`1.5px solid ${i===0?A:B}`,borderRadius:9,marginBottom:8,background:i===0?AL:W,cursor:'pointer',transition:'all .15s'}}>
            <div style={{width:22,height:22,borderRadius:5,background:i===0?A:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:i===0?W:M,fontWeight:700,flexShrink:0}}>{ltr}</div>
            <span style={{fontSize:12,fontWeight:i===0?700:500,color:i===0?T:M}}>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── lead gate mockup ─── */
function LeadGateMockup(){
  return(
    <div style={{background:W,borderRadius:16,border:`1px solid ${B}`,boxShadow:sh.xl,overflow:'hidden',maxWidth:360,margin:'0 auto',fontFamily:F}}>
      <div style={{background:'linear-gradient(135deg, #0b2c2e 0%, #061819 100%)',padding:'28px 24px',textAlign:'center' as const}}>
        <div style={{width:40,height:40,borderRadius:10,background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:20}}>🎯</div>
        <div style={{fontSize:16,fontWeight:800,color:W,letterSpacing:'-.02em',marginBottom:6}}>Your result is ready</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.6)',lineHeight:1.5}}>Enter your email to unlock your personalised photography style profile</div>
      </div>
      <div style={{padding:'20px'}}>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:M,marginBottom:5,letterSpacing:'.04em'}}>FIRST NAME</div>
          <div style={{border:`1px solid ${B}`,borderRadius:8,padding:'9px 12px',fontSize:12,color:'#9ca3af'}}>Sarah</div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:M,marginBottom:5,letterSpacing:'.04em'}}>EMAIL ADDRESS</div>
          <div style={{border:`1.5px solid ${A}`,borderRadius:8,padding:'9px 12px',fontSize:12,color:T,boxShadow:`0 0 0 3px ${AL}`}}>sarah@example.com</div>
        </div>
        <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:16,padding:'10px 12px',background:S,borderRadius:8}}>
          <div style={{width:14,height:14,border:`1.5px solid ${A}`,borderRadius:3,background:A,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{fontSize:10,color:M,lineHeight:1.5}}>I agree to receive personalised recommendations and emails. Unsubscribe anytime.</div>
        </div>
        <div style={{background:A,color:W,borderRadius:9,padding:'12px',textAlign:'center' as const,fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:`0 4px 12px rgba(15,115,119,.25)`}}>Show my result →</div>
      </div>
    </div>
  )
}

/* ─── integrations grid ─── */
function IntegrationsGrid(){
  const integrations=[
    {name:'Mailchimp',color:'#FFE01B',bg:'#fffde7',letter:'M'},
    {name:'Klaviyo',color:'#1B1B1B',bg:'#f9f9f9',letter:'K'},
    {name:'ConvertKit',color:'#FB6970',bg:'#fff0f1',letter:'C'},
    {name:'HubSpot',color:'#FF7A59',bg:'#fff4f1',letter:'H'},
    {name:'Zapier',color:'#FF4A00',bg:'#fff3f0',letter:'Z'},
    {name:'Google Sheets',color:'#0F9D58',bg:'#f0fdf4',letter:'G'},
    {name:'ActiveCampaign',color:'#356AE6',bg:'#eff4ff',letter:'A'},
    {name:'Salesforce',color:'#00A1E0',bg:'#f0faff',letter:'S'},
    {name:'Webhook',color:'#374151',bg:'#f9fafb',letter:'W'},
    {name:'Slack',color:'#4A154B',bg:'#fdf4ff',letter:'S'},
    {name:'Google Analytics',color:'#E37400',bg:'#fffbf0',letter:'G'},
    {name:'Make',color:'#6D00CC',bg:'#faf0ff',letter:'M'},
  ]
  return(
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12}}>
      {integrations.map(ig=>(
        <div key={ig.name} style={{background:W,border:`1px solid ${B}`,borderRadius:12,padding:'16px 14px',display:'flex',alignItems:'center',gap:10,transition:'all .2s',cursor:'pointer'}}>
          <div style={{width:32,height:32,borderRadius:8,background:ig.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:13,fontWeight:800,color:ig.color,border:`1px solid ${B}`}}>{ig.letter}</div>
          <span style={{fontSize:12,fontWeight:600,color:T}}>{ig.name}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── main page ─── */
export default function QuizFunnelPage(){
  const router=useRouter()
  const [url,setUrl]=useState('')
  const [heroPhase,setHeroPhase]=useState(0)
  const [billing,setBilling]=useState<'monthly'|'yearly'>('monthly')
  const [faq,setFaq]=useState<number|null>(null)

  useEffect(()=>{
    const t=setInterval(()=>setHeroPhase(p=>(p+1)%3),3500)
    return ()=>clearInterval(t)
  },[])

  function go(e:React.FormEvent){
    e.preventDefault()
    if(!url.trim())return
    const u=url.trim().startsWith('http')?url.trim():'https://'+url.trim()
    router.push(`${QUIZ_BUILDER_PATH}?url=${encodeURIComponent(u)}`)
  }

  const exampleUrls=['sarahphotography.com','wildflowerbakery.com','fitwithjess.com']

  const plans=[
    {
      name:'Core',monthly:12,yearly:9,save:36,leads:'1,000',quizzes:'5',emails:'1,000',
      features:['AI quiz generation','One-click Squarespace embed','Branching logic & scoring','Quiz scheduling','Analytics dashboard','Lead dashboard + CSV export','Remove Squarespell branding'],
      missing:['A/B testing','Email sequences','Zapier & CRM integrations','Custom CSS','Per-question drop-off'],
      cta:'Start free trial',highlighted:false
    },
    {
      name:'Pro',monthly:19,yearly:16,save:36,leads:'3,000',quizzes:'Unlimited',emails:'3,000',
      features:['Everything in Core','A/B testing & variant analysis','Email sequences & automations','Mailchimp, Klaviyo, ConvertKit','HubSpot, Salesforce via Zapier','Webhooks & 5,000+ Zapier apps','Google Sheets native sync','Per-question drop-off analysis','Custom CSS & advanced styling','Priority support'],
      missing:['White-label','Custom domain','Team seats','API access'],
      cta:'Start free trial',highlighted:true
    },
    {
      name:'Business',monthly:35,yearly:29,save:72,leads:'Unlimited',quizzes:'Unlimited',emails:'Unlimited',
      features:['Everything in Pro','White-label (remove all branding)','Custom quiz domain','3 team seats','API access','Dedicated onboarding','Priority email + chat support'],
      missing:[],
      cta:'Start free trial',highlighted:false
    },
  ]

  const faqs=[
    {q:'How does the 14-day free trial work?',a:'You get full Pro access — AI generation, A/B testing, all integrations — for 14 days. No credit card required. After the trial you can choose any plan, or drop to a free reader mode until you\'re ready.'},
    {q:'What counts as a lead?',a:'Every quiz completion that includes an email address counts as one lead. Visitors who complete a quiz without entering an email (before the lead gate) are counted as completions, not leads.'},
    {q:'Does it work with every Squarespace template?',a:'Yes. The embed is a standard JavaScript snippet that works with all Squarespace 7.1 templates. Drop it into any Code Block, Page Header, or Code Injection section.'},
    {q:'What integrations are included on Pro?',a:'Native: Mailchimp, Klaviyo, ConvertKit, Google Sheets, and Webhooks. Via Zapier: HubSpot, Salesforce, Pipedrive, ActiveCampaign, Drip, and 5,000+ other apps.'},
    {q:'Can I A/B test different quiz versions?',a:'Yes — on Pro and Business. You can create up to 4 variants of a quiz (different questions, option order, or styling), split traffic by percentage, and see which version drives the highest lead rate. The dashboard declares a winner when statistical significance is reached.'},
    {q:'Can I send result emails automatically?',a:'Yes. Set up a Quiz Result Email campaign and it fires automatically when each lead completes the quiz — personalised with their specific outcome. You can also build drip sequences triggered by score range or specific answers.'},
    {q:'Can I cancel anytime?',a:'Yes. Month-to-month plans cancel immediately with no fees. Annual plans are non-refundable but can be cancelled to prevent renewal.'},
  ]

  /* ─── nav ─── */
  const nav=(
    <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,.92)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderBottom:`1px solid ${B}`,fontFamily:F}}>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:9,textDecoration:'none'}}>
          <div style={{width:30,height:30,background:A,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#fff"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#fff"/><circle cx="17" cy="18" r="2" fill="#fff"/></svg>
          </div>
          <span style={{fontSize:15,fontWeight:800,color:T,letterSpacing:'-.02em'}}>Squarespell <span style={{color:A}}>Quiz</span></span>
        </Link>
        <div style={{display:'flex',alignItems:'center',gap:28}}>
          {[['#features','Features'],['#workflow','How it works'],['#templates','Templates'],['#pricing','Pricing']].map(([h,l])=>(
            <a key={l} href={h} style={{fontSize:13,fontWeight:500,color:M,textDecoration:'none',transition:'color .15s'}} onMouseEnter={e=>(e.currentTarget.style.color=T)} onMouseLeave={e=>(e.currentTarget.style.color=M)}>{l}</a>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Link href="/sign-in" style={{fontSize:13,fontWeight:600,color:M,textDecoration:'none',padding:'7px 14px'}}>Sign in</Link>
          <Link href={QUIZ_BUILDER_PATH} style={{fontSize:13,fontWeight:700,color:W,background:A,textDecoration:'none',padding:'8px 18px',borderRadius:8,boxShadow:`0 2px 8px rgba(15,115,119,.25)`,transition:'background .15s'}} onMouseEnter={e=>(e.currentTarget.style.background=AH)} onMouseLeave={e=>(e.currentTarget.style.background=A)}>Get started free</Link>
        </div>
      </div>
    </nav>
  )

  /* ─── hero ─── */
  const heroPhaseLabels=[
    {step:'1. Paste your URL',label:'Analyzing your site...'},
    {step:'2. Brand detected',label:'Colors, fonts & business type extracted'},
    {step:'3. Quiz generated',label:'Ready to publish in seconds'},
  ]
  const hero=(
    <section style={{background:'#0a0f1a',padding:'100px 32px 80px',fontFamily:F,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(15,115,119,.25) 0%, transparent 60%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(255,255,255,.03) 1px, transparent 1px)',backgroundSize:'32px 32px',pointerEvents:'none'}}/>
      <div style={{maxWidth:1100,margin:'0 auto',position:'relative'}}>
        <div style={{textAlign:'center' as const,marginBottom:56}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(15,115,119,.15)',border:'1px solid rgba(15,115,119,.3)',borderRadius:100,padding:'5px 14px 5px 6px',marginBottom:24}}>
            <span style={{background:A,borderRadius:100,fontSize:10,fontWeight:700,color:W,padding:'2px 8px',letterSpacing:'.04em'}}>NEW</span>
            <span style={{fontSize:12,color:'rgba(255,255,255,.7)',fontWeight:500}}>AI quiz builder for Squarespace — no login required</span>
          </div>
          <h1 style={{fontSize:'clamp(40px,5.5vw,72px)',fontWeight:800,color:W,letterSpacing:'-.04em',lineHeight:1.05,marginBottom:20,maxWidth:820,margin:'0 auto 20px'}}>
            Turn your Squarespace site<br/>into a <span style={{color:'#2dd4bf'}}>lead-generating quiz</span>
          </h1>
          <p style={{fontSize:'clamp(16px,2vw,20px)',color:'rgba(255,255,255,.55)',lineHeight:1.65,maxWidth:560,margin:'0 auto 40px',fontWeight:400}}>
            Paste your URL. AI reads your brand, generates a quiz, and you publish it in minutes — no design or coding needed.
          </p>
          <form onSubmit={go} style={{display:'flex',gap:0,maxWidth:560,margin:'0 auto 16px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:6,backdropFilter:'blur(8px)'}}>
            <input
              value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="Paste your Squarespace URL..."
              style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:15,color:W,padding:'10px 14px',fontFamily:F}}
            />
            <button type="submit" style={{background:A,color:W,border:'none',borderRadius:8,padding:'10px 22px',fontSize:14,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' as const,fontFamily:F,boxShadow:`0 4px 12px rgba(15,115,119,.4)`}}>
              Analyze & build →
            </button>
          </form>
          <div style={{display:'flex',justifyContent:'center',gap:20,fontSize:12,color:'rgba(255,255,255,.35)',fontWeight:500}}>
            {['No credit card required','14-day free trial','Setup in under 5 minutes'].map(t=>(
              <span key={t} style={{display:'flex',alignItems:'center',gap:5}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero visual — 3-phase preview */}
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'center',gap:0,marginBottom:16}}>
            {heroPhaseLabels.map((p,i)=>(
              <div key={i} onClick={()=>setHeroPhase(i)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 16px',cursor:'pointer',borderBottom:i===heroPhase?`2px solid ${A}`:'2px solid rgba(255,255,255,.1)',transition:'all .3s'}}>
                <span style={{fontSize:10,fontWeight:700,color:i===heroPhase?A:'rgba(255,255,255,.3)',letterSpacing:'.04em'}}>{p.step}</span>
              </div>
            ))}
          </div>
          <div style={{borderRadius:16,overflow:'hidden',boxShadow:'0 40px 120px rgba(0,0,0,.5)',border:'1px solid rgba(255,255,255,.08)'}}>
            <div style={{background:'#1a1f2e',padding:'9px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
              <div style={{display:'flex',gap:5}}>{['#ef4444','#f59e0b','#22c55e'].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
              <div style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',borderRadius:5,padding:'3px 10px',fontSize:10,color:'rgba(255,255,255,.4)',maxWidth:240,margin:'0 auto',textAlign:'center' as const}}>
                {heroPhase===0?'app.squarespell.com/build':heroPhase===1?'Analyzing wildflowerbakery.com...':'app.squarespell.com/dashboard/quiz/edit'}
              </div>
            </div>
            <div style={{minHeight:340,background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',padding:24,transition:'all .5s'}}>
              {heroPhase===0&&(
                <div style={{textAlign:'center' as const,fontFamily:F}}>
                  <div style={{fontSize:24,fontWeight:800,color:T,marginBottom:8}}>Paste your Squarespace URL</div>
                  <div style={{fontSize:14,color:M,marginBottom:24}}>AI will analyze your site and build a quiz matched to your brand</div>
                  <div style={{display:'flex',gap:8,background:W,border:`2px solid ${A}`,borderRadius:12,padding:8,maxWidth:480,margin:'0 auto',boxShadow:sh.md}}>
                    <div style={{flex:1,padding:'8px 12px',fontSize:15,color:T,fontFamily:'monospace',textAlign:'left' as const}}>
                      <span style={{color:M}}>https://</span>
                      <span style={{color:T,fontWeight:600}}>wildflowerbakery.com</span>
                      <span style={{display:'inline-block',width:2,height:18,background:A,marginLeft:2,animation:'blink 1s step-end infinite',verticalAlign:'middle'}}/>
                    </div>
                    <div style={{background:A,color:W,borderRadius:8,padding:'8px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Analyze →</div>
                  </div>
                  <div style={{display:'flex',justifyContent:'center',gap:12,marginTop:16}}>
                    {exampleUrls.map(u=>(
                      <div key={u} style={{fontSize:11,color:M,padding:'4px 10px',border:`1px solid ${B}`,borderRadius:100,cursor:'pointer'}}>{u}</div>
                    ))}
                  </div>
                </div>
              )}
              {heroPhase===1&&(
                <div style={{width:'100%',maxWidth:640,fontFamily:F}}>
                  <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:A,boxShadow:`0 0 0 4px ${AL}`}}/>
                        <span style={{fontSize:13,fontWeight:700,color:A}}>Analyzing wildflowerbakery.com...</span>
                      </div>
                      {[{label:'Reading site content',done:true},{label:'Extracting brand colors',done:true},{label:'Detecting business type',done:true},{label:'Matching quiz templates',done:false}].map((s,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:W,border:`1px solid ${B}`,borderRadius:8,marginBottom:6}}>
                          <div style={{width:18,height:18,borderRadius:'50%',background:s.done?A:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {s.done?<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:6,height:6,borderRadius:'50%',border:`2px solid ${A}`,borderTopColor:'transparent',animation:'spin .6s linear infinite'}}/>}
                          </div>
                          <span style={{fontSize:12,color:s.done?T:M,fontWeight:s.done?600:400}}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{width:200,background:W,border:`1px solid ${B}`,borderRadius:12,padding:'14px',boxShadow:sh.md,flexShrink:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:10}}>Brand detected</div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${B}`}}>
                        <div style={{width:32,height:32,borderRadius:8,background:'#d4a373',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:W}}>W</div>
                        <div><div style={{fontSize:12,fontWeight:700,color:T}}>Wildflower Bakery</div><div style={{fontSize:10,color:M}}>wildflowerbakery.com</div></div>
                      </div>
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:9,color:M,marginBottom:5}}>Brand colors</div>
                        <div style={{display:'flex',gap:4}}>
                          {['#d4a373','#e9c46a','#264653','#f4f1de'].map(c=><div key={c} style={{width:22,height:22,borderRadius:5,background:c,border:`2px solid rgba(255,255,255,.6)`,boxShadow:sh.sm}}/>)}
                        </div>
                      </div>
                      {[['Business type','Bakery & café'],['Audience','Local food lovers'],['Tone','Warm & inviting']].map(([l,v])=>(
                        <div key={l as string} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:10,borderBottom:`1px solid ${B}`}}>
                          <span style={{color:M}}>{l}</span><span style={{color:T,fontWeight:600}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {heroPhase===2&&(
                <div style={{width:'100%',display:'flex',gap:16,fontFamily:F}}>
                  <div style={{flex:1}}>
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{fontSize:12,fontWeight:700,color:'#15803d'}}>Quiz generated in 28 seconds</span>
                    </div>
                    <div style={{background:W,border:`1px solid ${B}`,borderRadius:10,padding:'12px',boxShadow:sh.sm,marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:T,marginBottom:8}}>What\'s Your Baking Personality?</div>
                      {['Q1 — What draws you into a bakery first?','Q2 — Choose your perfect afternoon treat','Q3 — How do you feel about baking at home?','Q4 — What matters most in a bakery visit?','Q5 — Which dessert matches your mood?'].map((q,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:i<4?`1px solid ${B}`:'none',fontSize:10}}>
                          <div style={{width:18,height:18,borderRadius:5,background:AL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:A,flexShrink:0}}>Q{i+1}</div>
                          <span style={{color:T}}>{q}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <div style={{flex:1,background:A,color:W,borderRadius:8,padding:'9px',textAlign:'center' as const,fontSize:12,fontWeight:700,cursor:'pointer'}}>Publish quiz →</div>
                      <div style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'9px 12px',fontSize:12,fontWeight:600,color:T,cursor:'pointer'}}>Edit first</div>
                    </div>
                  </div>
                  <QuizMockup/>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </section>
  )

  /* ─── logos ─── */
  const logos=(
    <section style={{background:W,padding:'36px 32px',borderBottom:`1px solid ${B}`,fontFamily:F}}>
      <div style={{maxWidth:900,margin:'0 auto',textAlign:'center' as const}}>
        <div style={{fontSize:12,fontWeight:600,color:'#9ca3af',letterSpacing:'.06em',marginBottom:20,textTransform:'uppercase' as const}}>Connects natively with the tools you already use</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:32,flexWrap:'wrap' as const}}>
          {['Squarespace','Mailchimp','Klaviyo','ConvertKit','Zapier','HubSpot','Google Sheets'].map(name=>(
            <div key={name} style={{fontSize:14,fontWeight:700,color:'#9ca3af',letterSpacing:'-.01em'}}>{name}</div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ─── problem ─── */
  const problem=(
    <section style={{background:S,padding:'80px 32px',fontFamily:F}}>
      <div style={{maxWidth:760,margin:'0 auto',textAlign:'center' as const}}>
        <Tag label="The problem"/>
        <h2 style={{fontSize:'clamp(28px,4vw,44px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.15,marginBottom:16}}>
          Your Squarespace site gets traffic.<br/>Almost none of it becomes leads.
        </h2>
        <p style={{fontSize:17,color:M,lineHeight:1.7,marginBottom:40}}>
          Contact forms convert at 1–2%. Static landing pages give you no data about who's visiting or what they need. You can't personalise follow-ups because you don't know anything about your visitors.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {[
            {stat:'1–2%',label:'Average contact form conversion rate',bad:true},
            {stat:'0',label:'Data collected about visitor intent',bad:true},
            {stat:'67%',label:'Of leads ignored because they\'re not segmented',bad:true},
          ].map(({stat,label,bad})=>(
            <div key={label} style={{background:W,border:`1px solid ${B}`,borderRadius:12,padding:'24px 20px',textAlign:'center' as const}}>
              <div style={{fontSize:36,fontWeight:800,color:'#ef4444',letterSpacing:'-.03em',marginBottom:6}}>{stat}</div>
              <div style={{fontSize:13,color:M,lineHeight:1.5}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ─── how it works ─── */
  const howItWorks=(
    <section id="workflow" style={{background:W,padding:'100px 32px',fontFamily:F}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center' as const,marginBottom:60}}>
          <Tag label="How it works"/>
          <h2 style={{fontSize:'clamp(28px,4vw,44px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.15,marginBottom:12}}>From URL to live quiz in minutes</h2>
          <p style={{fontSize:17,color:M,lineHeight:1.65}}>Three steps. No design tools. No developer.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24,position:'relative' as const}}>
          <div style={{position:'absolute' as const,top:36,left:'calc(33% + 20px)',right:'calc(33% + 20px)',height:2,background:`linear-gradient(to right, ${A}, ${A})`,opacity:.2,pointerEvents:'none'}}/>
          {[
            {n:'01',title:'Paste your URL',desc:'Drop in your Squarespace URL. AI reads your site — brand colors, fonts, copy, products, and business type — in seconds.',icon:(
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            )},
            {n:'02',title:'AI builds your quiz',desc:'Choose AI generation or a template. Your quiz arrives pre-filled with questions, answer options, scoring, and outcomes matched to your brand and audience.',icon:(
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            )},
            {n:'03',title:'Publish & capture leads',desc:'Embed in any Squarespace page with one snippet. Leads flow into your dashboard with scores, answers, and intent levels. Route them to Mailchimp, Klaviyo, or Zapier automatically.',icon:(
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            )},
          ].map(step=>(
            <div key={step.n} style={{textAlign:'center' as const,padding:'32px 24px',background:S,borderRadius:16,border:`1px solid ${B}`}}>
              <div style={{width:56,height:56,borderRadius:14,background:AL,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',color:A}}>{step.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:A,letterSpacing:'.08em',marginBottom:8}}>{step.n}</div>
              <div style={{fontSize:18,fontWeight:800,color:T,letterSpacing:'-.02em',marginBottom:10}}>{step.title}</div>
              <div style={{fontSize:14,color:M,lineHeight:1.65}}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ─── features ─── */
  function FeatureRow({tag,title,desc,bullets,mockup,flip=false}:{tag:string,title:string,desc:string,bullets:string[],mockup:React.ReactNode,flip?:boolean}){
    return(
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center',maxWidth:1100,margin:'0 auto',padding:'80px 32px'}}>
        {flip&&<div style={{borderRadius:16,overflow:'hidden'}}>{mockup}</div>}
        <div>
          <Tag label={tag}/>
          <h2 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.18,marginBottom:14}}>{title}</h2>
          <p style={{fontSize:16,color:M,lineHeight:1.7,marginBottom:24}}>{desc}</p>
          <ul style={{listStyle:'none',padding:0,margin:0}}>
            {bullets.map(b=>(
              <li key={b} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10,fontSize:14,color:'#374151',fontWeight:500}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:AL,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>
        {!flip&&<div style={{borderRadius:16,overflow:'hidden'}}>{mockup}</div>}
      </div>
    )
  }

  /* ─── answer layouts section ─── */
  const layoutNames=['List','Grid','Full Background','Thumbnails','Split']
  const layoutDescs=['Vertical button list — ideal for text-heavy options','2-column image grid — perfect for visual choices','Full-bleed imagery with question overlay','Horizontal strip with image + text per option','Left media, right question — premium editorial look']
  const [activeLayout,setActiveLayout]=useState(0)

  const answerLayouts=(
    <section style={{background:S,padding:'100px 32px',fontFamily:F}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center' as const,marginBottom:48}}>
          <Tag label="5 answer layouts"/>
          <h2 style={{fontSize:'clamp(28px,4vw,44px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.15,marginBottom:12}}>Quiz layouts that match your brand</h2>
          <p style={{fontSize:17,color:M,lineHeight:1.65}}>Every quiz question can use a different layout. Mix and match to create the exact visual experience you want.</p>
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:36,flexWrap:'wrap' as const}}>
          {layoutNames.map((n,i)=>(
            <button key={n} onClick={()=>setActiveLayout(i)} style={{padding:'8px 18px',borderRadius:8,border:`1.5px solid ${i===activeLayout?A:B}`,background:i===activeLayout?AL:W,color:i===activeLayout?A:M,fontSize:13,fontWeight:i===activeLayout?700:500,cursor:'pointer',fontFamily:F,transition:'all .2s'}}>{n}</button>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:48,alignItems:'center'}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:T,letterSpacing:'-.02em',marginBottom:8}}>{layoutNames[activeLayout]} layout</div>
            <div style={{fontSize:15,color:M,lineHeight:1.65,marginBottom:24}}>{layoutDescs[activeLayout]}</div>
            <div style={{background:W,border:`1px solid ${B}`,borderRadius:12,padding:'20px'}}>
              <div style={{fontSize:10,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:12}}>Best used for</div>
              {[['Text-only answer options','✓ List'],['Photo-driven visual choices','✓ Grid'],['High-impact brand moments','✓ Full Bg'],['Quick visual scanning','✓ Thumbnails'],['Editorial storytelling','✓ Split']].filter((_,i)=>i===activeLayout||activeLayout===4&&i===4||true).slice(0,3).map(([use,rec])=>(
                <div key={use as string} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${B}`,fontSize:13}}>
                  <span style={{color:'#374151'}}>{use}</span><span style={{color:A,fontWeight:700}}>{rec}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:W,borderRadius:16,border:`1px solid ${B}`,boxShadow:sh.lg,overflow:'hidden'}}>
            {activeLayout===0&&(
              <div style={{padding:24,fontFamily:F}}>
                <div style={{height:3,background:'#f0fafa',borderRadius:100,marginBottom:16}}><div style={{height:'100%',width:'60%',background:A,borderRadius:100}}/></div>
                <div style={{fontSize:15,fontWeight:800,color:T,marginBottom:14,lineHeight:1.3}}>What moment matters most to you on your big day?</div>
                {['Candid, emotional moments','Perfectly styled portraits','The venue and details','Fun party and dancing shots'].map((opt,i)=>(
                  <div key={opt} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',border:`1.5px solid ${i===0?A:B}`,borderRadius:9,marginBottom:8,background:i===0?AL:W,cursor:'pointer'}}>
                    <div style={{width:22,height:22,borderRadius:5,background:i===0?A:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:i===0?W:M,fontWeight:700}}>{'ABCD'[i]}</div>
                    <span style={{fontSize:13,fontWeight:i===0?700:400,color:i===0?T:M}}>{opt}</span>
                  </div>
                ))}
              </div>
            )}
            {activeLayout===1&&(
              <div style={{padding:20,fontFamily:F}}>
                <div style={{fontSize:14,fontWeight:800,color:T,marginBottom:14,lineHeight:1.3}}>Which editing style are you drawn to?</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[['Light & airy','#fef9f0'],['Bold & dramatic','#1a1a2e'],['Warm & vintage','#8b4513'],['Classic & timeless','#2c3e50']].map(([opt,bg],i)=>(
                    <div key={opt as string} style={{borderRadius:10,overflow:'hidden',border:`2px solid ${i===2?A:B}`,cursor:'pointer',position:'relative' as const}}>
                      <div style={{height:70,background:bg as string,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <div style={{width:24,height:24,borderRadius:6,background:i===2?A:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:W,fontWeight:800}}>{'ABCD'[i]}</div>
                      </div>
                      <div style={{padding:'8px',fontSize:11,fontWeight:600,color:T,background:W}}>{opt}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeLayout===2&&(
              <div style={{position:'relative' as const,height:240,background:'linear-gradient(135deg,#1a1a2e,#16213e)',display:'flex',alignItems:'flex-end',fontFamily:F}}>
                <div style={{position:'absolute' as const,inset:0,background:'rgba(0,0,0,.3)'}}/>
                <div style={{position:'relative' as const,zIndex:1,padding:20,width:'100%'}}>
                  <div style={{fontSize:16,fontWeight:800,color:W,marginBottom:12}}>What draws you to a venue first?</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {['The architecture','The natural light','The intimate feel','The grand scale'].map((opt,i)=>(
                      <div key={opt} style={{padding:'9px 12px',background:i===0?'rgba(255,255,255,.25)':'rgba(255,255,255,.08)',border:`1px solid ${i===0?'rgba(255,255,255,.6)':'rgba(255,255,255,.15)'}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
                        <span style={{width:18,height:18,borderRadius:5,background:i===0?W:'rgba(255,255,255,.15)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,color:i===0?T:W,fontWeight:700}}>{'ABCD'[i]}</span>
                        <span style={{fontSize:11,color:W,fontWeight:i===0?700:400}}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeLayout===3&&(
              <div style={{padding:20,fontFamily:F}}>
                <div style={{fontSize:14,fontWeight:800,color:T,marginBottom:14}}>How would you describe the vibe?</div>
                <div style={{display:'flex',gap:8,overflowX:'auto' as const}}>
                  {[['Romantic','#e8d5b7'],['Elegant','#1a1a2e'],['Bohemian','#6b4c3b'],['Modern','#2c3e50']].map(([opt,bg],i)=>(
                    <div key={opt as string} style={{flexShrink:0,textAlign:'center' as const,cursor:'pointer',border:`2px solid ${i===0?A:B}`,borderRadius:10,overflow:'hidden',width:80}}>
                      <div style={{height:60,background:bg as string,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <div style={{width:18,height:18,borderRadius:4,background:i===0?A:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:W,fontWeight:700}}>{'ABCD'[i]}</div>
                      </div>
                      <div style={{padding:'6px 4px',fontSize:10,fontWeight:600,color:T,background:W}}>{opt}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeLayout===4&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',height:240,fontFamily:F}}>
                <div style={{background:'linear-gradient(135deg,#0b2c2e,#061819)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>📸</div>
                <div style={{padding:16,display:'flex',flexDirection:'column' as const,justifyContent:'center'}}>
                  <div style={{fontSize:13,fontWeight:800,color:T,marginBottom:10,lineHeight:1.3}}>What photography style resonates?</div>
                  {['Candid moments','Styled portraits','Bold dramatic'].map((opt,i)=>(
                    <div key={opt} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 9px',border:`1.5px solid ${i===0?A:B}`,borderRadius:7,marginBottom:6,background:i===0?AL:W,cursor:'pointer'}}>
                      <div style={{width:18,height:18,borderRadius:4,background:i===0?A:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:i===0?W:M,fontWeight:700}}>{'ABC'[i]}</div>
                      <span style={{fontSize:11,fontWeight:i===0?700:400,color:i===0?T:M}}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  /* ─── ab testing section ─── */
  const abTesting=(
    <section style={{background:W,padding:'80px 32px',fontFamily:F}}>
      <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'center'}}>
        <div>
          <Tag label="A/B Testing"/>
          <h2 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.18,marginBottom:14}}>Run quiz experiments. Declare winners on data.</h2>
          <p style={{fontSize:16,color:M,lineHeight:1.7,marginBottom:24}}>Create up to 4 quiz variants with different questions, option order, or styling. Traffic splits automatically. The dashboard shows which version drives the highest lead rate and declares a statistically significant winner.</p>
          {['Test question phrasing and option order','Compare different answer layout styles','Split traffic 50/50 or custom percentage','Statistical significance detection','One-click promote winner to main quiz'].map(b=>(
            <div key={b} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10,fontSize:14,color:'#374151',fontWeight:500}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:AL,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              {b}
            </div>
          ))}
        </div>
        <div style={{background:W,border:`1px solid ${B}`,borderRadius:16,padding:24,boxShadow:sh.lg}}>
          <div style={{fontSize:12,fontWeight:700,color:T,marginBottom:16}}>Photography Style Quiz — A/B Test</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            {[{label:'Variant A',sub:'Original',metric:'12.4%',name:'Lead rate',diff:'',base:true},{label:'Variant B',sub:'New headline',metric:'18.7%',name:'Lead rate',diff:'+51%',winner:true}].map(v=>(
              <div key={v.label} style={{border:`2px solid ${v.winner?A:B}`,borderRadius:12,padding:'14px',position:'relative' as const,background:v.winner?AL:W}}>
                {v.winner&&<div style={{position:'absolute' as const,top:-10,right:12,background:A,color:W,fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:100,letterSpacing:'.04em'}}>WINNER</div>}
                <div style={{fontSize:10,fontWeight:700,color:v.winner?A:M,marginBottom:2}}>{v.label}</div>
                <div style={{fontSize:11,color:M,marginBottom:10}}>{v.sub}</div>
                <div style={{fontSize:28,fontWeight:800,color:T,letterSpacing:'-.03em'}}>{v.metric}</div>
                <div style={{fontSize:11,color:M}}>{v.name}</div>
                {v.diff&&<div style={{fontSize:12,fontWeight:700,color:'#16a34a',marginTop:4}}>{v.diff} vs. A</div>}
              </div>
            ))}
          </div>
          {[['Views','2,400','2,385'],['Completions','1,680 (70%)','1,978 (83%)'],['Leads','298 (12.4%)','447 (18.7%)']].map(([m,a,b])=>(
            <div key={m as string} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',padding:'7px 0',borderBottom:`1px solid ${B}`,fontSize:11}}>
              <span style={{color:M}}>{m}</span><span style={{color:T,fontWeight:600}}>{a}</span><span style={{color:A,fontWeight:700}}>{b}</span>
            </div>
          ))}
          <div style={{marginTop:14,padding:'10px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:11,color:'#15803d',fontWeight:600}}>
            ✓ Statistical significance reached — Variant B wins with 95% confidence
          </div>
        </div>
      </div>
    </section>
  )

  /* ─── integrations section ─── */
  const integrationsList=[
    {name:'Mailchimp',color:'#FFE01B',letter:'M'},{name:'Klaviyo',color:'#1B1B1B',letter:'K'},
    {name:'ConvertKit',color:'#FB6970',letter:'C'},{name:'HubSpot',color:'#FF7A59',letter:'H'},
    {name:'Zapier',color:'#FF4A00',letter:'Z'},{name:'Google Sheets',color:'#0F9D58',letter:'G'},
    {name:'ActiveCampaign',color:'#356AE6',letter:'A'},{name:'Salesforce',color:'#00A1E0',letter:'S'},
    {name:'Webhook',color:'#374151',letter:'W'},{name:'Slack',color:'#4A154B',letter:'S'},
    {name:'Google Analytics',color:'#E37400',letter:'G'},{name:'Pipedrive',color:'#BD4E00',letter:'P'},
    {name:'Drip',color:'#7B61FF',letter:'D'},{name:'Make',color:'#6D00CC',letter:'M'},
    {name:'Airtable',color:'#18BFFF',letter:'A'},{name:'Notion',color:'#000000',letter:'N'},
  ]
  const integrationsSection=(
    <section style={{background:S,padding:'100px 32px',fontFamily:F}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center' as const,marginBottom:48}}>
          <Tag label="30+ Integrations"/>
          <h2 style={{fontSize:'clamp(28px,4vw,44px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.15,marginBottom:12}}>Send leads wherever they need to go</h2>
          <p style={{fontSize:17,color:M,lineHeight:1.65,maxWidth:560,margin:'0 auto'}}>Native connectors for your email platform. Zapier for everything else. Leads arrive with scores, answers, and outcome tags — ready to trigger personalised sequences.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:24}}>
          {integrationsList.map(ig=>(
            <div key={ig.name} style={{background:W,border:`1px solid ${B}`,borderRadius:10,padding:'14px 12px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',transition:'all .2s',boxShadow:sh.sm}}>
              <div style={{width:30,height:30,borderRadius:7,background:ig.color+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:12,fontWeight:800,color:ig.color,border:`1px solid ${ig.color}22`}}>{ig.letter}</div>
              <span style={{fontSize:12,fontWeight:600,color:T}}>{ig.name}</span>
            </div>
          ))}
        </div>
        <div style={{textAlign:'center' as const}}>
          <div style={{fontSize:13,color:M}}>+ Drip, Brevo, MailerLite, Constant Contact, AWeber, Monday.com, and 20+ more via Zapier</div>
        </div>
      </div>
    </section>
  )

  /* ─── embed section ─── */
  const embedModes=[
    {name:'Inline',desc:'Embeds directly in your page flow. Visitors engage without leaving.',code:`<div data-squarespell-quiz="your-quiz-slug"></div>\n<script src="https://app.squarespell.com/embed.js" async></script>`},
    {name:'Popup',desc:'Opens in a centered overlay when a visitor clicks your button.',code:`<div data-squarespell-quiz="your-quiz-slug"\n     data-mode="popup"\n     data-button-text="Take the quiz">\n</div>`},
    {name:'Tab',desc:'A sticky tab on the side of every page — always visible, never intrusive.',code:`<div data-squarespell-quiz="your-quiz-slug"\n     data-mode="tab"\n     data-tab-text="Find your style">\n</div>`},
  ]
  const [embedMode,setEmbedMode]=useState(0)
  const embedSection=(
    <section style={{background:W,padding:'100px 32px',fontFamily:F}}>
      <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'start'}}>
        <div>
          <Tag label="One-click Squarespace embed"/>
          <h2 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.18,marginBottom:14}}>Three embed modes. One code snippet.</h2>
          <p style={{fontSize:16,color:M,lineHeight:1.7,marginBottom:28}}>Copy one snippet into a Squarespace Code Block. Your quiz appears instantly — inline in the page, as a popup, or as a floating tab. No plugin needed.</p>
          <div style={{display:'flex',gap:8,marginBottom:24}}>
            {embedModes.map((m,i)=>(
              <button key={m.name} onClick={()=>setEmbedMode(i)} style={{padding:'8px 16px',borderRadius:8,border:`1.5px solid ${i===embedMode?A:B}`,background:i===embedMode?AL:W,color:i===embedMode?A:M,fontSize:13,fontWeight:i===embedMode?700:500,cursor:'pointer',fontFamily:F}}>{m.name}</button>
            ))}
          </div>
          <div style={{marginBottom:16,fontSize:15,color:'#374151',lineHeight:1.6}}>{embedModes[embedMode].desc}</div>
          <div style={{background:'#0d1117',borderRadius:10,padding:'16px',fontFamily:'ui-monospace,monospace',fontSize:12,color:'#e5e7eb',lineHeight:1.6,whiteSpace:'pre' as const,overflowX:'auto' as const}}>{embedModes[embedMode].code}</div>
        </div>
        <div>
          <div style={{background:S,borderRadius:16,border:`1px solid ${B}`,overflow:'hidden',boxShadow:sh.lg}}>
            <div style={{background:'#f3f4f6',padding:'9px 14px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',gap:8}}>
              <div style={{display:'flex',gap:5}}>{['#ef4444','#f59e0b','#22c55e'].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:c}}/>)}</div>
              <div style={{flex:1,background:W,border:`1px solid ${B}`,borderRadius:5,padding:'3px 10px',fontSize:10,color:M,maxWidth:220,margin:'0 auto',textAlign:'center' as const}}>yoursquarespacesite.com</div>
            </div>
            <div style={{padding:'24px',minHeight:280}}>
              <div style={{background:'#dbeafe',height:60,borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#1d4ed8',fontWeight:600}}>Your Squarespace page content</div>
              {embedMode===0&&<QuizMockup/>}
              {embedMode===1&&(
                <div style={{position:'relative' as const}}>
                  <div style={{background:'rgba(0,0,0,.4)',borderRadius:8,height:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{background:W,borderRadius:12,padding:20,width:220,boxShadow:sh.xl}}>
                      <div style={{fontSize:13,fontWeight:800,color:T,marginBottom:8}}>What's your photography style?</div>
                      <div style={{fontSize:11,color:M,marginBottom:12}}>Answer 5 quick questions to find your perfect match</div>
                      <div style={{background:A,color:W,borderRadius:7,padding:'8px',textAlign:'center' as const,fontSize:12,fontWeight:700,cursor:'pointer'}}>Start the quiz →</div>
                    </div>
                  </div>
                </div>
              )}
              {embedMode===2&&(
                <div style={{position:'relative' as const,height:200}}>
                  <div style={{background:'#dbeafe',height:160,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#1d4ed8',fontWeight:600}}>More page content...</div>
                  <div style={{position:'absolute' as const,right:-24,top:60,background:A,color:W,fontSize:11,fontWeight:700,padding:'8px 10px',borderRadius:'8px 0 0 8px',cursor:'pointer',writingMode:'vertical-rl' as const,textOrientation:'mixed' as const,letterSpacing:'.04em',boxShadow:sh.md}}>Find your style</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  /* ─── templates ─── */
  const displayTemplates=QUIZ_TEMPLATE_CATALOG.slice(0,6)
  const templateSection=(
    <section id="templates" style={{background:S,padding:'100px 32px',fontFamily:F}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center' as const,marginBottom:48}}>
          <Tag label="13 templates"/>
          <h2 style={{fontSize:'clamp(28px,4vw,44px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.15,marginBottom:12}}>Start from a proven quiz structure</h2>
          <p style={{fontSize:17,color:M,lineHeight:1.65}}>13 templates built for real Squarespace businesses. Each includes real questions, image choices, scoring, and outcomes — ready to customise.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
          {displayTemplates.map(tpl=>(
            <div key={tpl.id} style={{background:W,border:`1px solid ${B}`,borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'all .2s',boxShadow:sh.sm}}>
              <div style={{height:120,background:`linear-gradient(135deg, ${A}22, ${A}11)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>
                {tpl.category==='photography'?'📸':tpl.category==='food_dining'?'🥐':tpl.category==='fitness_wellness'?'💪':tpl.category==='weddings_events'?'💍':tpl.category==='online_store'?'🛍':tpl.category==='coaches_consultants'?'🎯':'✨'}
              </div>
              <div style={{padding:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div style={{fontSize:14,fontWeight:800,color:T}}>{tpl.name}</div>
                  <div style={{fontSize:10,color:M,background:S,padding:'2px 8px',borderRadius:100,border:`1px solid ${B}`,whiteSpace:'nowrap' as const,marginLeft:8,flexShrink:0}}>{tpl.category.replace(/_/g,' ')}</div>
                </div>
                <div style={{fontSize:12,color:M,lineHeight:1.55,marginBottom:12}}>{tpl.description}</div>
                <Link href={`${QUIZ_BUILDER_PATH}?template=${tpl.id}`} style={{display:'block',textAlign:'center' as const,background:AL,color:A,fontSize:12,fontWeight:700,padding:'8px',borderRadius:7,textDecoration:'none',transition:'background .15s'}}>Use this template →</Link>
              </div>
            </div>
          ))}
        </div>
        <div style={{textAlign:'center' as const}}>
          <div style={{fontSize:13,color:M}}>+ 7 more templates: Real Estate, Skincare, Travel Style, Podcast Personality, Nonprofit, Home Interior, Creative Archetype</div>
        </div>
      </div>
    </section>
  )

  /* ─── pricing ─── */
  const pricingSection=(
    <section id="pricing" style={{background:W,padding:'100px 32px',fontFamily:F}}>
      <div style={{maxWidth:1060,margin:'0 auto'}}>
        <div style={{textAlign:'center' as const,marginBottom:48}}>
          <Tag label="Pricing"/>
          <h2 style={{fontSize:'clamp(28px,4vw,44px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.15,marginBottom:12}}>Start free. Grow on your terms.</h2>
          <p style={{fontSize:17,color:M,lineHeight:1.65,marginBottom:28}}>14-day free trial. No credit card required. Cancel anytime.</p>
          <div style={{display:'inline-flex',background:S,border:`1px solid ${B}`,borderRadius:10,padding:4,gap:0}}>
            {(['monthly','yearly'] as const).map(p=>(
              <button key={p} onClick={()=>setBilling(p)} style={{padding:'7px 20px',borderRadius:7,border:'none',background:billing===p?W:'transparent',color:billing===p?T:M,fontSize:13,fontWeight:billing===p?700:500,cursor:'pointer',fontFamily:F,boxShadow:billing===p?sh.sm:'none',transition:'all .2s'}}>
                {p==='monthly'?'Monthly':(<span>Yearly <span style={{fontSize:11,color:'#16a34a',fontWeight:700}}>Save up to $72</span></span>)}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,alignItems:'start'}}>
          {plans.map(plan=>(
            <div key={plan.name} style={{border:`2px solid ${plan.highlighted?A:B}`,borderRadius:16,padding:'28px 24px',position:'relative' as const,background:plan.highlighted?AL:W,boxShadow:plan.highlighted?`0 0 0 4px ${AL}, ${sh.lg}`:sh.sm}}>
              {plan.highlighted&&<div style={{position:'absolute' as const,top:-14,left:'50%',transform:'translateX(-50%)',background:A,color:W,fontSize:11,fontWeight:800,padding:'4px 16px',borderRadius:100,whiteSpace:'nowrap' as const,letterSpacing:'.04em'}}>MOST POPULAR</div>}
              <div style={{fontSize:20,fontWeight:800,color:T,marginBottom:6}}>{plan.name}</div>
              <div style={{marginBottom:16}}>
                <span style={{fontSize:36,fontWeight:800,color:T,letterSpacing:'-.03em'}}>${billing==='monthly'?plan.monthly:plan.yearly}</span>
                <span style={{fontSize:14,color:M}}>/mo</span>
                {billing==='yearly'&&<div style={{fontSize:11,color:'#16a34a',fontWeight:600,marginTop:2}}>Save ${plan.save}/year</div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:20}}>
                {[[plan.quizzes,'quizzes'],[plan.leads,'leads/mo'],[plan.emails,'emails/mo']].map(([v,l])=>(
                  <div key={l as string} style={{background:W,border:`1px solid ${B}`,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                    <div style={{fontSize:14,fontWeight:800,color:T}}>{v}</div>
                    <div style={{fontSize:9,color:M,fontWeight:600}}>{l}</div>
                  </div>
                ))}
              </div>
              <Link href={QUIZ_BUILDER_PATH} style={{display:'block',textAlign:'center' as const,background:plan.highlighted?A:W,color:plan.highlighted?W:T,border:`1.5px solid ${plan.highlighted?A:B}`,borderRadius:9,padding:'12px',fontSize:14,fontWeight:700,textDecoration:'none',marginBottom:20,boxShadow:plan.highlighted?`0 4px 12px rgba(15,115,119,.3)`:sh.sm,transition:'all .2s'}}>{plan.cta}</Link>
              <div style={{marginBottom:12}}>
                {plan.features.map(f=>(
                  <div key={f} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,fontSize:13,color:'#374151'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </div>
                ))}
                {plan.missing.map(f=>(
                  <div key={f} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,fontSize:13,color:'#9ca3af'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ─── faq ─── */
  const faqSection=(
    <section style={{background:S,padding:'100px 32px',fontFamily:F}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{textAlign:'center' as const,marginBottom:48}}>
          <Tag label="FAQ"/>
          <h2 style={{fontSize:'clamp(28px,4vw,40px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.15}}>Common questions</h2>
        </div>
        {faqs.map((f,i)=>(
          <div key={i} style={{border:`1px solid ${B}`,borderRadius:12,marginBottom:10,background:W,overflow:'hidden'}}>
            <button onClick={()=>setFaq(faq===i?null:i)} style={{width:'100%',padding:'18px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'none',border:'none',cursor:'pointer',fontFamily:F,textAlign:'left' as const}}>
              <span style={{fontSize:15,fontWeight:700,color:T}}>{f.q}</span>
              <span style={{fontSize:20,color:M,flexShrink:0,marginLeft:12,transform:faq===i?'rotate(45deg)':'rotate(0)',transition:'transform .2s',display:'inline-block'}}>+</span>
            </button>
            {faq===i&&<div style={{padding:'0 20px 18px',fontSize:14,color:M,lineHeight:1.7}}>{f.a}</div>}
          </div>
        ))}
      </div>
    </section>
  )

  /* ─── cta ─── */
  const ctaSection=(
    <section style={{background:'#0a0f1a',padding:'100px 32px',fontFamily:F,textAlign:'center' as const,position:'relative' as const,overflow:'hidden'}}>
      <div style={{position:'absolute' as const,inset:0,background:'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(15,115,119,.2) 0%, transparent 70%)',pointerEvents:'none'}}/>
      <div style={{position:'relative' as const,maxWidth:640,margin:'0 auto'}}>
        <h2 style={{fontSize:'clamp(32px,5vw,56px)',fontWeight:800,color:W,letterSpacing:'-.04em',lineHeight:1.1,marginBottom:16}}>
          Your next lead is<br/><span style={{color:'#2dd4bf'}}>one quiz away</span>
        </h2>
        <p style={{fontSize:18,color:'rgba(255,255,255,.55)',lineHeight:1.65,marginBottom:36}}>Paste your URL. AI builds your quiz in seconds. Start capturing leads today.</p>
        <form onSubmit={go} style={{display:'flex',gap:0,maxWidth:480,margin:'0 auto 16px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:6}}>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste your Squarespace URL..." style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:14,color:W,padding:'10px 14px',fontFamily:F}}/>
          <button type="submit" style={{background:A,color:W,border:'none',borderRadius:8,padding:'10px 20px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:F}}>Build for free →</button>
        </form>
        <div style={{fontSize:12,color:'rgba(255,255,255,.3)'}}>No credit card · 14-day trial · Cancel anytime</div>
      </div>
    </section>
  )

  /* ─── footer ─── */
  const footer=(
    <footer style={{background:'#0a0f1a',borderTop:'1px solid rgba(255,255,255,.06)',padding:'48px 32px 32px',fontFamily:F}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr',gap:40,marginBottom:40}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:12}}>
              <div style={{width:28,height:28,background:A,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#fff"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#fff"/><circle cx="17" cy="18" r="2" fill="#fff"/></svg>
              </div>
              <span style={{fontSize:13,fontWeight:800,color:W}}>Squarespell Quiz</span>
            </div>
            <p style={{fontSize:13,color:'rgba(255,255,255,.4)',lineHeight:1.6,maxWidth:200}}>AI-powered quiz funnels for Squarespace. Turn visitors into segmented leads in minutes.</p>
          </div>
          {[
            {heading:'Product',links:['Features','Templates','Pricing','Changelog']},
            {heading:'Resources',links:['Documentation','API Reference','Help Center','Blog']},
            {heading:'Company',links:['About','Contact','Privacy','Terms']},
          ].map(col=>(
            <div key={col.heading}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:14}}>{col.heading}</div>
              {col.links.map(l=>(
                <div key={l} style={{marginBottom:8}}>
                  <a href="#" style={{fontSize:13,color:'rgba(255,255,255,.45)',textDecoration:'none',transition:'color .15s'}} onMouseEnter={e=>(e.currentTarget.style.color=W)} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.45)')}>{l}</a>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:24,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:12,color:'rgba(255,255,255,.25)'}}>© 2026 Squarespell Quiz. All rights reserved.</div>
          <div style={{display:'flex',gap:16}}>
            {['Privacy','Terms'].map(l=><a key={l} href="#" style={{fontSize:12,color:'rgba(255,255,255,.25)',textDecoration:'none'}}>{l}</a>)}
          </div>
        </div>
      </div>
    </footer>
  )

  return(
    <div style={{fontFamily:F,background:W}}>
      {nav}
      {hero}
      {logos}
      {problem}
      {howItWorks}

      {/* Features */}
      <section id="features" style={{background:W}}>
        <FeatureRow
          tag="AI Brand Analysis"
          title="AI reads your website and builds a branded quiz in seconds"
          desc="Paste your Squarespace URL. Squarespell analyzes your site content, extracts your brand colors, fonts, business type, and audience, then generates a complete quiz with matched questions, scoring, and outcomes — pre-styled in your brand."
          bullets={['Extracts primary colors, background, and text colors from your site','Detects business type, audience, and brand tone automatically','Generates quiz questions from your actual products and content','Matches templates to your business category','Everything editable after generation']}
          mockup={<BrowserFrame url="app.squarespell.com/build"><div style={{padding:20,background:S,display:'flex',gap:16,alignItems:'flex-start',fontFamily:F,minHeight:300}}>
            <div style={{flex:1}}>
              <div style={{background:W,border:`1px solid ${B}`,borderRadius:10,padding:'14px',marginBottom:12,boxShadow:sh.sm}}>
                <div style={{fontSize:10,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:8}}>Analyzing...</div>
                {[{l:'Reading site content',d:true},{l:'Extracting brand colors',d:true},{l:'Detecting business type',d:true},{l:'Generating quiz',d:false}].map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:i<3?`1px solid ${B}`:'none',fontSize:11}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:s.d?A:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {s.d?<svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:5,height:5,borderRadius:'50%',background:A,opacity:.5}}/>}
                    </div>
                    <span style={{color:s.d?T:M,fontWeight:s.d?600:400}}>{s.l}</span>
                  </div>
                ))}
              </div>
              <div style={{background:W,border:`1px solid ${B}`,borderRadius:10,padding:'14px',boxShadow:sh.sm}}>
                <div style={{fontSize:10,fontWeight:700,color:M,textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:8}}>Brand detected</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${B}`}}>
                  <div style={{width:28,height:28,borderRadius:7,background:A,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:W}}>S</div>
                  <div><div style={{fontSize:12,fontWeight:700,color:T}}>Sarah Photography</div><div style={{fontSize:10,color:M}}>sarahphoto.com</div></div>
                </div>
                <div style={{display:'flex',gap:4,marginBottom:10}}>
                  {['#0f7377','#2dd4bf','#0d1117','#f9fafb'].map(c=><div key={c} style={{width:20,height:20,borderRadius:5,background:c,border:'2px solid rgba(255,255,255,.6)',boxShadow:sh.sm}}/>)}
                </div>
                {[['Type','Wedding photography'],['Audience','Engaged couples'],['Tone','Romantic & professional']].map(([l,v])=>(
                  <div key={l as string} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'4px 0',borderBottom:`1px solid ${B}`}}><span style={{color:M}}>{l}</span><span style={{color:T,fontWeight:600}}>{v}</span></div>
                ))}
              </div>
            </div>
            <QuizMockup/>
          </div></BrowserFrame>}
        />
      </section>

      <section style={{background:S}}>
        <FeatureRow
          tag="Block-based Quiz Editor"
          title="Build any quiz with a visual block editor"
          desc="Add questions, outcomes, lead gates, and global settings as individual blocks. Drag to reorder. Edit inline. The preview updates live on the right as you build."
          bullets={['6 question types: single choice, multiple choice, text input, image choice, rating scale, slider','5 answer layout modes per question','Weighted scoring per answer — set score values individually','Branching logic: send respondents down different paths based on answers','Score-range matching: map point totals to specific outcomes','Lead gate block: customise headline, subtext, button, and GDPR consent']}
          mockup={<EditorMockup/>}
          flip
        />
      </section>

      <section style={{background:W}}>
        {answerLayouts}
      </section>

      <section style={{background:S}}>
        <FeatureRow
          tag="Lead Capture & Scoring"
          title="Every submission becomes a scored, segmented lead"
          desc="The lead gate collects name and email before showing results. Every lead gets an automatic intent score based on their answers. Filter by quiz, score range, or intent level — then export or sync to your email platform."
          bullets={['Customisable lead gate: headline, subtext, button text, GDPR toggle','Automatic intent scoring: High (≥70), New (40–69), Low (<40)','Full answer history per lead — see exactly what they chose','Filter by quiz, date range, score, and intent level','Bulk CSV export or sync to Mailchimp, Klaviyo, ConvertKit','Outcome tags sent alongside every lead to your email platform']}
          mockup={<div style={{display:'grid',gap:16}}><LeadGateMockup/><LeadsMockup/></div>}
        />
      </section>

      <section style={{background:W}}>
        <FeatureRow
          tag="Analytics & Reporting"
          title="Know exactly where every lead comes from and why"
          desc="Per-quiz analytics show you views, completions, leads, and lead rate. The question drop-off chart shows exactly where respondents abandon. Outcome distribution tells you which results resonate most."
          bullets={['5 KPIs per quiz: views, completions, leads, completion rate, lead rate','Views vs. leads timeline — identify peaks and drop-offs','Per-question drop-off analysis — fix the questions that lose people','Outcome distribution chart — see which results are most common','Lead source breakdown — direct, referral, social','Date range presets: today, 7d, 30d, 90d, custom']}
          mockup={<AnalyticsMockup/>}
          flip
        />
      </section>

      {abTesting}

      <section style={{background:S}}>
        <FeatureRow
          tag="Email Campaigns & Automations"
          title="Send personalised emails triggered by quiz results"
          desc="Build Quiz Result emails that fire the moment someone completes your quiz — personalised with their specific outcome. Add drip sequences triggered by score range or answer combination. All from the same dashboard."
          bullets={['Quiz Result Email: fires instantly on completion, personalised to outcome','Broadcast campaigns: one-time sends to all leads or a segment','Drip automations: multi-step sequences triggered by score or answer','Block-based email editor: text, image, button, divider blocks','Audience targeting: all leads, specific quiz, specific segment','Open rate, click rate, bounce tracking per campaign']}
          mockup={<EmailMockup/>}
        />
      </section>

      {integrationsSection}
      {embedSection}
      {templateSection}
      {pricingSection}
      {faqSection}
      {ctaSection}
      {footer}
    </div>
  )
}
