'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { embedScriptUrl, publicQuizUrl } from '@/lib/urls';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface Quiz { id: string; title: string; slug: string; status: string; }

export default function EmbedPage({ params }: { params: { id: string } }) {
  const { getToken } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  useEffect(() => {
    getToken().then(token => {
      fetch(`${API}/api/quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then((quizzes: Quiz[]) => {
          const found = quizzes.find(q => q.id === params.id);
          setQuiz(found || null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, []);

  const quizUrl = quiz ? publicQuizUrl(quiz.slug) : '';

  const embedScript = quiz
    ? `<div data-squarespell-quiz="${quiz.slug}"></div>
<script src="${embedScriptUrl()}" data-quiz="${quiz.slug}" async></script>`
    : '';

  const iframeEmbed = quiz
    ? `<iframe src="${quizUrl}" width="100%" height="600" frameborder="0" allow="clipboard-write"></iframe>`
    : '';

  const copy = (text: string, which: 'script' | 'full') => {
    navigator.clipboard.writeText(text).then(() => {
      if (which === 'script') { setCopied(true); setTimeout(() => setCopied(false), 2000); }
      else { setCopiedFull(true); setTimeout(() => setCopiedFull(false), 2000); }
    });
  };

  if (loading) return (
    <div style={{ background:'#F7F7F5', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'2px solid rgba(13,115,119,.2)', borderTopColor:'#0f7377', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!quiz) return (
    <div style={{ background:'#F7F7F5', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#1A1A1A', fontFamily:'Poppins, sans-serif' }}>
      <p>Quiz not found.</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
        body{font-family:'Poppins',system-ui,sans-serif;background:#F7F7F5;color:#1A1A1A}
        :root{--acc:#0f7377;--g1:rgba(0,0,0,.055);--g2:rgba(0,0,0,.034);--b1:rgba(0,0,0,.09);--b2:rgba(0,0,0,.058);--t1:#1A1A1A;--t3:rgba(26,26,26,.42);--t4:rgba(26,26,26,.22)}
      `}</style>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom:36 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--acc)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:8 }}>Embed your quiz</p>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-.04em', marginBottom:8 }}>{quiz.title}</h1>
          <p style={{ fontSize:14, color:'var(--t3)' }}>Copy the code below and paste it into any Squarespace Code Block to embed your quiz.</p>
        </div>

        {/* Step 1 - Script embed */}
        <div style={{ background:'var(--g1)', border:'.5px solid var(--b1)', borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:26, height:26, background:'var(--acc)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#FFFFFF', flexShrink:0 }}>1</div>
              <div>
                <p style={{ fontSize:15, fontWeight:700, letterSpacing:'-.02em' }}>Embed code</p>
                <p style={{ fontSize:12, color:'var(--t3)' }}>Recommended  -  paste into a Code Block in Squarespace</p>
              </div>
            </div>
            <button
              onClick={() => copy(embedScript, 'script')}
              style={{ background: copied ? 'rgba(45,106,79,.15)' : 'var(--acc)', color: copied ? '#2D6A4F' : '#FFFFFF', border: copied ? '.5px solid rgba(45,106,79,.3)' : 'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Poppins, sans-serif', transition:'all .2s', whiteSpace:'nowrap' }}
            >
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>
          <div style={{ background:'#EEEDE9', borderRadius:10, padding:18, fontFamily:'DM Mono, monospace', fontSize:13, color:'rgba(26,26,26,.7)', lineHeight:1.7, overflowX:'auto', border:'.5px solid var(--b2)', whiteSpace:'pre' }}>
            {`<div data-squarespell-quiz="${quiz.slug}"></div>\n<script src="${embedScriptUrl()}" data-quiz="${quiz.slug}" async><\/script>`}
          </div>
        </div>

        {/* Step 2 - How to add */}
        <div style={{ background:'var(--g1)', border:'.5px solid var(--b1)', borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ width:26, height:26, background:'rgba(0,0,0,.06)', border:'.5px solid var(--b1)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'var(--t1)', flexShrink:0 }}>2</div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, letterSpacing:'-.02em' }}>Add to Squarespace</p>
              <p style={{ fontSize:12, color:'var(--t3)' }}>3 steps to go live</p>
            </div>
          </div>
          <div style={{ background:'rgba(13,115,119,.08)', border:'1px solid rgba(13,115,119,.18)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'rgba(26,26,26,.6)', lineHeight:1.6 }}>
            <strong style={{ color:'var(--t1)' }}>Important:</strong> Use a <strong>Code Block</strong> on your page, not Code Injection (Settings &rarr; Advanced). Code Injection goes in the page header where the quiz container can be stripped.
          </div>
          {[
            { step:'Open your Squarespace page editor', detail:'Go to the page where you want the quiz to appear.' },
            { step:'Add a Code Block', detail:'Click + to add a new block, search for "Code" and insert a Code Block.' },
            { step:'Paste and save', detail:'Paste the embed code above into the code block, uncheck "Display Source", and click Save.' },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', gap:14, marginBottom: i < 2 ? 16 : 0 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--g2)', border:'.5px solid var(--b2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'rgba(26,26,26,.42)', flexShrink:0, marginTop:1 }}>{i+1}</div>
              <div>
                <p style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{item.step}</p>
                <p style={{ fontSize:12, color:'var(--t3)' }}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alternative - Direct link */}
        <div style={{ background:'var(--g2)', border:'.5px solid var(--b2)', borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:700, letterSpacing:'-.02em', marginBottom:3 }}>Direct link</p>
              <p style={{ fontSize:12, color:'var(--t3)' }}>Share this URL directly or use as a button link</p>
            </div>
            <button
              onClick={() => copy(quizUrl, 'full')}
              style={{ background: copiedFull ? 'rgba(45,106,79,.15)' : 'var(--g1)', color: copiedFull ? '#2D6A4F' : 'var(--t1)', border: `.5px solid ${copiedFull ? 'rgba(45,106,79,.3)' : 'var(--b1)'}`, borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'Poppins, sans-serif', transition:'all .2s', whiteSpace:'nowrap' }}
            >
              {copiedFull ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
          <div style={{ background:'#EEEDE9', borderRadius:9, padding:'12px 16px', fontFamily:'DM Mono, monospace', fontSize:13, color:'rgba(13,115,119,.8)', border:'.5px solid var(--b2)' }}>
            {quizUrl}
          </div>
        </div>

        {/* Preview link */}
        <div style={{ textAlign:'center', paddingTop:8 }}>
          <a href={quizUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(26,26,26,.42)', textDecoration:'none', transition:'color .2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Preview your quiz
          </a>
        </div>

      </div>
    </>
  );
}
