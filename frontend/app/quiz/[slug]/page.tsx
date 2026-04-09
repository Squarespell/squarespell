'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-backend.onrender.com';

interface QuizOption { id: string; text: string; result_id?: string; }
interface QuizQuestion { id: string; question: string; options: QuizOption[]; }
interface QuizResult { id: string; title: string; description: string; recommendation?: string; }
interface Quiz {
  id: string; slug: string; title: string;
  questions: QuizQuestion[]; results: QuizResult[];
  settings?: { primary_color?: string; cta_text?: string; cta_url?: string; show_branding?: boolean; };
}

type Stage = 'loading' | 'error' | 'question' | 'leadgate' | 'result';

function getResult(quiz: Quiz, answers: Record<string, string>): QuizResult {
  const counts: Record<string, number> = {};
  quiz.results.forEach(r => { counts[r.id] = 0; });
  Object.values(answers).forEach(optId => {
    quiz.questions.forEach(q => {
      q.options.forEach(opt => {
        if (opt.id === optId && opt.result_id) {
          counts[opt.result_id] = (counts[opt.result_id] || 0) + 1;
        }
      });
    });
  });
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return quiz.results.find(r => r.id === topId) || quiz.results[0];
}

export default function QuizPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);
  const leadScore = 78 + Math.floor(Math.random() * 20);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/quiz/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setStage('error'); return; }
        setQuiz(data);
        setStage('question');
        // track view
        fetch(`${API}/api/quiz/${slug}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: 'view', session_id: crypto.randomUUID?.() || Math.random().toString(36).slice(2) }),
        }).catch(() => {});
      })
      .catch(() => { setError('Failed to load quiz.'); setStage('error'); });
  }, [slug]);

  const selectOption = useCallback((id: string) => {
    if (!animating) setSelected(id);
  }, [animating]);

  const next = useCallback(() => {
    if (!quiz || !selected || animating) return;
    const q = quiz.questions[currentQ];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setAnimating(true);
    setTimeout(() => {
      if (currentQ + 1 < quiz.questions.length) {
        setCurrentQ(c => c + 1);
        setSelected(null);
      } else {
        setStage('leadgate');
      }
      setAnimating(false);
    }, 240);
  }, [quiz, selected, animating, currentQ, answers]);

  const submitLead = useCallback(async () => {
    if (!quiz || !email.trim()) { setLeadError('Please enter your email'); return; }
    setSubmitting(true);
    setLeadError('');
    try {
      await fetch(`${API}/api/quiz/${slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: firstName, email, answers, outcome_id: getResult(quiz, answers).id }),
      });
      const resultData = getResult(quiz, answers);
      setResult(resultData);
      setStage('result');
      // Track completion event
      fetch(`${API}/api/quiz/${slug}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'complete', session_id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), metadata: { outcome_id: resultData.id } }),
      }).catch(() => {});
      // Notify parent iframe (for embed)
      if (window.parent !== window) {
        window.parent.postMessage({ source: 'squarespell', type: 'complete', outcome_id: resultData.id }, '*');
      }
    } catch {
      setLeadError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [quiz, slug, email, firstName, answers]);

  useEffect(() => {
    if (stage !== 'question' || !quiz) return;
    const q = quiz.questions[currentQ];
    const handler = (e: KeyboardEvent) => {
      const idx = ['a','b','c','d'].indexOf(e.key.toLowerCase());
      if (idx >= 0 && idx < q.options.length) selectOption(q.options[idx].id);
      if (e.key === 'Enter' && selected) next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stage, quiz, currentQ, selected, selectOption, next]);

  const accent = quiz?.settings?.primary_color || '#D2FF1D';
  const showBranding = quiz?.settings?.show_branding !== false;
  const progress = stage === 'question'
    ? Math.round((currentQ / (quiz?.questions.length || 1)) * 100)
    : stage === 'leadgate' ? 90 : 100;
  const letters = ['A','B','C','D','E'];

  if (stage === 'loading') return (
    <div style={{ background:'#07090c', minHeight:'100svh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:12 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:accent, animation:`bounce 1.2s ${i*0.2}s infinite` }} />
          ))}
        </div>
        <p style={{ fontSize:12, color:'rgba(240,242,245,.3)', fontFamily:'DM Sans, sans-serif' }}>Loading quiz...</p>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );

  if (stage === 'error') return (
    <div style={{ background:'#07090c', minHeight:'100svh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:340 }}>
        <div style={{ fontSize:40, marginBottom:14 }}>😕</div>
        <p style={{ fontSize:17, fontWeight:800, color:'#f0f2f5', marginBottom:8, letterSpacing:'-.04em', fontFamily:'DM Sans, sans-serif' }}>Quiz not found</p>
        <p style={{ fontSize:13, color:'rgba(240,242,245,.42)', lineHeight:1.6, fontFamily:'DM Sans, sans-serif' }}>{error || 'This quiz may have been removed.'}</p>
      </div>
    </div>
  );

  if (!quiz) return null;

  const currentQuestion = quiz.questions[currentQ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
        body{font-family:'DM Sans',system-ui,sans-serif;background:#07090c;color:#f0f2f5}
        :root{--acc:${accent};--bg:#07090c;--g1:rgba(255,255,255,.055);--g2:rgba(255,255,255,.034);--b1:rgba(255,255,255,.09);--b2:rgba(255,255,255,.058);--t1:#f0f2f5;--t2:rgba(240,242,245,.68);--t3:rgba(240,242,245,.42);--t4:rgba(240,242,245,.22);--green:#4ade80}
        .wrap{min-height:100svh;display:flex;flex-direction:column;max-width:540px;margin:0 auto;position:relative}
        .prog{height:2px;background:rgba(255,255,255,.06)}
        .prog-fill{height:2px;background:var(--acc);transition:width .4s cubic-bezier(.4,0,.2,1)}
        .status{display:flex;justify-content:space-between;align-items:center;padding:10px 20px;font-size:11px;color:var(--t3)}
        .content{padding:8px 20px 24px;flex:1;display:flex;flex-direction:column}
        .xp-row{display:flex;align-items:center;gap:8px;margin-bottom:20px;padding:8px 12px;background:var(--g2);border:.5px solid var(--b2);border-radius:9px}
        .xp-bar-bg{flex:1;background:rgba(255,255,255,.06);border-radius:20px;height:3px}
        .xp-bar{height:3px;border-radius:20px;background:var(--acc);transition:width .4s}
        .qlabel{font-size:9px;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}
        .qtext{font-size:18px;font-weight:800;color:var(--t1);margin-bottom:20px;letter-spacing:-.04em;line-height:1.22}
        .opt{display:flex;align-items:center;gap:11px;padding:12px 14px;background:var(--g2);border:.5px solid var(--b2);border-radius:11px;cursor:pointer;margin-bottom:8px;transition:all .15s;user-select:none}
        .opt:hover{background:var(--g1);border-color:var(--b1);transform:translateY(-1px)}
        .opt.on{background:rgba(210,255,29,.09);border-color:rgba(210,255,29,.18)}
        .key{width:24px;height:24px;background:var(--g1);border:.5px solid var(--b1);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--t3);flex-shrink:0;transition:all .15s}
        .opt.on .key{background:var(--acc);color:#07090c;border-color:transparent}
        .opt-lbl{font-size:13px;color:var(--t2);line-height:1.35;transition:color .15s}
        .opt.on .opt-lbl{color:var(--t1);font-weight:600}
        .btn-p{background:var(--acc);color:#07090c;border:none;border-radius:11px;padding:14px;font-size:14px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;letter-spacing:-.02em}
        .btn-p:hover:not(:disabled){background:#c8f517;transform:translateY(-1px)}
        .btn-p:disabled{opacity:.5;cursor:not-allowed}
        .btn-s{background:var(--g1);color:var(--t1);border:.5px solid var(--b1);border-radius:11px;padding:13px;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s}
        .glass{background:var(--g1);border:.5px solid var(--b1);border-radius:16px}
        .inp-row{background:var(--g2);border:.5px solid var(--b2);border-radius:11px;padding:12px 14px;display:flex;align-items:center;gap:9px;transition:border-color .15s}
        .inp-row:focus-within{border-color:rgba(210,255,29,.18)}
        .inp{background:transparent;border:none;outline:none;font-size:13px;color:var(--t1);font-family:'DM Sans',sans-serif;flex:1}
        .inp::placeholder{color:var(--t4)}
        .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
        .stat{background:var(--g1);border:.5px solid var(--b1);border-radius:11px;padding:12px;text-align:center}
        .stat-v{font-size:20px;font-weight:800;color:var(--acc);letter-spacing:-.05em;line-height:1}
        .stat-l{font-size:8px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.07em;margin-top:3px}
        .ai-box{background:rgba(210,255,29,.09);border:.5px solid rgba(210,255,29,.18);border-radius:11px;padding:13px 14px;margin-bottom:14px}
        .branding{padding:16px 20px;text-align:center;border-top:.5px solid var(--b2);margin-top:auto}
        .slide{animation:slideIn .24s cubic-bezier(.4,0,.2,1) both}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        .fade{animation:fadeIn .3s ease both}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .err{font-size:11px;color:#f87171;margin-top:6px;text-align:center}
        .safe{height:28px}
      `}</style>

      <div className="wrap">
        <div className="prog"><div className="prog-fill" style={{ width:`${progress}%` }} /></div>

        <div className="status">
          <span style={{ fontWeight:700, color:'var(--t2)', fontSize:13, letterSpacing:'-.02em' }}>{quiz.title}</span>
          {stage === 'question' && <span style={{ color:'var(--acc)', fontWeight:700, fontSize:11 }}>{currentQ+1} of {quiz.questions.length}</span>}
          {stage === 'leadgate' && <span style={{ color:'var(--acc)', fontWeight:700, fontSize:11 }}>Almost done!</span>}
          {stage === 'result' && <span style={{ background:'rgba(248,113,113,.12)', border:'.5px solid rgba(248,113,113,.25)', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#fca5a5' }}>Hot lead</span>}
        </div>

        {stage === 'question' && currentQuestion && (
          <div className="content slide" key={currentQ}>
            <div className="xp-row">
              <div className="xp-bar-bg"><div className="xp-bar" style={{ width:`${progress}%` }} /></div>
              <span style={{ fontSize:10, color:'var(--t4)', fontWeight:600 }}>{progress}% done</span>
            </div>
            <p className="qlabel">Question {currentQ+1}</p>
            <p className="qtext">{currentQuestion.question}</p>
            <div style={{ flex:1 }}>
              {currentQuestion.options.map((opt, i) => (
                <div key={opt.id} className={`opt${selected===opt.id?' on':''}`} onClick={() => selectOption(opt.id)}>
                  <div className="key">{letters[i]}</div>
                  <span className="opt-lbl">{opt.text}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize:10, color:'var(--t4)', textAlign:'center', margin:'8px 0 16px', fontFamily:'monospace' }}>press A–D to select · Enter to continue</p>
            <button className="btn-p" onClick={next} disabled={!selected || animating}>
              {currentQ+1 < quiz.questions.length ? 'Next' : 'See my results'}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <div className="safe" />
          </div>
        )}

        {stage === 'leadgate' && (
          <div className="content fade" style={{ textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:13 }}>🎯</div>
            <p style={{ fontSize:20, fontWeight:800, color:'var(--t1)', letterSpacing:'-.04em', marginBottom:7 }}>Your results are ready!</p>
            <p style={{ fontSize:12, color:'var(--t3)', lineHeight:1.65, marginBottom:20 }}>Enter your details to unlock your personalised profile and action plan.</p>
            <div className="glass" style={{ padding:16, textAlign:'left', marginBottom:12 }}>
              <div style={{ marginBottom:9 }}>
                <label style={{ fontSize:10, fontWeight:500, color:'var(--t4)', display:'block', marginBottom:5 }}>First name</label>
                <div className="inp-row"><input className="inp" placeholder="Your first name" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:500, color:'var(--t4)', display:'block', marginBottom:5 }}>Email address</label>
                <div className="inp-row">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && submitLead()} />
                </div>
              </div>
              <button className="btn-p" onClick={submitLead} disabled={submitting || !email.trim()} style={{ marginBottom:10 }}>
                {submitting ? 'Loading...' : 'Show my personalised results 🎉'}
              </button>
              {leadError && <p className="err">{leadError}</p>}
              <p style={{ textAlign:'center', fontSize:10, color:'var(--t4)' }}>No spam. Unsubscribe anytime.</p>
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
              {['GDPR compliant','No spam','Secure'].map(t => (
                <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:'var(--t4)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{t}
                </span>
              ))}
            </div>
            <div className="safe" />
          </div>
        )}

        {stage === 'result' && result && (
          <div className="content fade" style={{ textAlign:'center' }}>
            <div style={{ fontSize:50, marginBottom:14 }}>🚀</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12 }}>
              <span style={{ background:'rgba(248,113,113,.12)', border:'.5px solid rgba(248,113,113,.25)', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#fca5a5' }}>Hot lead score</span>
              <span style={{ background:'rgba(210,255,29,.09)', border:'.5px solid rgba(210,255,29,.18)', borderRadius:20, padding:'3px 10px', fontSize:11, color:'var(--acc)', fontWeight:600 }}>{leadScore} / 100</span>
            </div>
            <p style={{ fontSize:9, fontWeight:700, color:'var(--acc)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:7 }}>Your result</p>
            <p style={{ fontSize:20, fontWeight:800, color:'var(--t1)', marginBottom:10, letterSpacing:'-.04em' }}>{result.title}</p>
            <p style={{ fontSize:12, color:'var(--t3)', lineHeight:1.65, marginBottom:16 }}>{result.description}</p>
            {result.recommendation && (
              <div className="ai-box" style={{ textAlign:'left' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--acc)', marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  AI Recommendation
                </p>
                <p style={{ fontSize:12, color:'rgba(240,242,245,.68)', lineHeight:1.6 }}>{result.recommendation}</p>
              </div>
            )}
            <div className="stat-grid">
              <div className="stat"><p className="stat-v">{leadScore}</p><p className="stat-l">Lead score</p></div>
              <div className="stat"><p className="stat-v">14%</p><p className="stat-l">Avg conversion</p></div>
              <div className="stat"><p className="stat-v">4x</p><p className="stat-l">vs contact form</p></div>
            </div>
            {quiz.settings?.cta_url ? (
              <a href={quiz.settings.cta_url} style={{ textDecoration:'none', display:'block', marginBottom:9 }}>
                <button className="btn-p">{quiz.settings?.cta_text || 'Get started'}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </a>
            ) : (
              <button className="btn-p" style={{ marginBottom:9 }} onClick={() => window.open('https://squarespell.com','_blank')}>
                {quiz.settings?.cta_text || 'Get my free quiz template'}
              </button>
            )}
            <button className="btn-s" onClick={() => navigator.share ? navigator.share({title:result.title,url:window.location.href}) : navigator.clipboard?.writeText(window.location.href)}>
              Share my result
            </button>
            <div className="safe" />
          </div>
        )}

        {showBranding && (
          <div className="branding">
            <a href="https://squarespell.com" target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'var(--t4)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
              <span style={{ width:14, height:14, background:'var(--acc)', borderRadius:4, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </span>
              Powered by Squarespell
            </a>
          </div>
        )}
      </div>
    </>
  );
}
