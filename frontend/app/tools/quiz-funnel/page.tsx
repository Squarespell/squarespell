'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QUIZ_BUILDER_PATH } from '@/lib/urls'

/* ─── tokens ─── */
const A='#0f7377',AH='#0b6165',T='#0d1117',M='#6b7280',B='#e5e7eb',S='#f9fafb',W='#ffffff'
const F="'Inter', system-ui, sans-serif"

/* ─── functional gateway page ───
   The marketing/SEO content for the quiz product now lives on
   squarespell.com/quiz (Squarespace). This route is just the working
   tool: paste a URL, land in the builder, or sign in/sign up. Keeping
   this page lean avoids duplicating marketing copy across two domains. */
export default function QuizFunnelPage(){
  const router=useRouter()
  const [url,setUrl]=useState('')

  function go(e:React.FormEvent){
    e.preventDefault()
    if(!url.trim())return
    const u=url.trim().startsWith('http')?url.trim():'https://'+url.trim()
    router.push(`${QUIZ_BUILDER_PATH}?url=${encodeURIComponent(u)}`)
  }

  return(
    <div style={{fontFamily:F,background:W,minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      <nav style={{borderBottom:`1px solid ${B}`}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 24px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <Link href="/" style={{display:'flex',alignItems:'center',gap:9,textDecoration:'none'}}>
            <div style={{width:30,height:30,background:A,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="2" fill="#fff"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="16"/><line x1="12" y1="11" x2="17" y2="16"/><circle cx="7" cy="18" r="2" fill="#fff"/><circle cx="17" cy="18" r="2" fill="#fff"/></svg>
            </div>
            <span style={{fontSize:15,fontWeight:800,color:T,letterSpacing:'-.02em'}}>Squarespell <span style={{color:A}}>Quiz</span></span>
          </Link>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Link href="/sign-in" style={{fontSize:13,fontWeight:600,color:M,textDecoration:'none',padding:'7px 14px'}}>Sign in</Link>
            <Link href="/sign-up" style={{fontSize:13,fontWeight:700,color:W,background:A,textDecoration:'none',padding:'8px 18px',borderRadius:8}} onMouseEnter={e=>(e.currentTarget.style.background=AH)} onMouseLeave={e=>(e.currentTarget.style.background=A)}>Sign up free</Link>
          </div>
        </div>
      </nav>

      <main style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 24px'}}>
        <div style={{maxWidth:560,width:'100%',textAlign:'center' as const}}>
          <h1 style={{fontSize:'clamp(26px,4vw,34px)',fontWeight:800,color:T,letterSpacing:'-.03em',lineHeight:1.2,marginBottom:12}}>
            Paste your Squarespace URL
          </h1>
          <p style={{fontSize:15,color:M,lineHeight:1.6,marginBottom:32}}>
            AI reads your brand and builds a matching quiz in seconds.
          </p>
          <form onSubmit={go} style={{display:'flex',gap:0,background:W,border:`1px solid ${B}`,borderRadius:12,padding:6,boxShadow:'0 4px 16px rgba(0,0,0,.08)'}}>
            <input
              value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://yoursite.squarespace.com"
              style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:15,color:T,padding:'10px 14px',fontFamily:F}}
            />
            <button type="submit" style={{background:A,color:W,border:'none',borderRadius:8,padding:'10px 22px',fontSize:14,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap' as const,fontFamily:F}} onMouseEnter={e=>(e.currentTarget.style.background=AH)} onMouseLeave={e=>(e.currentTarget.style.background=A)}>
              Analyze & build →
            </button>
          </form>
          <div style={{marginTop:20,fontSize:13,color:M}}>
            Already have an account? <Link href="/sign-in" style={{color:A,fontWeight:600,textDecoration:'none'}}>Sign in</Link>
          </div>
        </div>
      </main>

      <footer style={{borderTop:`1px solid ${B}`,padding:'20px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:10}}>
          <div style={{fontSize:12,color:'#9ca3af'}}>© 2026 Squarespell Quiz. All rights reserved.</div>
          <div style={{display:'flex',gap:16}}>
            {[{label:'Privacy',href:'/privacy'},{label:'Terms',href:'/terms'},{label:'squarespell.com',href:'https://squarespell.com/quiz'}].map(l=>(
              <a key={l.label} href={l.href} style={{fontSize:12,color:'#9ca3af',textDecoration:'none'}}>{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
