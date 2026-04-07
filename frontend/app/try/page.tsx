'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const ACC = '#D2FF1D';
const BG = '#07090c';

const examples = ['coach.squarespace.com', 'studio.squarespace.com', 'agency.squarespace.com'];
const loadingMessages = ['Reading your brand colors...', 'Detecting your fonts...', 'Generating quiz questions...', 'Almost ready...'];

export default function TryPage() {
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<'input' | 'loading' | 'preview'>('input');
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (stage !== 'loading') return;
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / 4000) * 100);
      setProgress(pct);
      setMsgIdx(Math.min(3, Math.floor(elapsed / 1000)));
      if (elapsed >= 4000) { clearInterval(iv); setStage('preview'); }
    }, 50);
    return () => clearInterval(iv);
  }, [stage]);

  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '') || 'yoursite';
  const quizTitle = domain.includes('coach') ? 'What type of coaching do you need?' :
    domain.includes('studio') ? 'Which creative style matches you?' :
    domain.includes('agency') ? 'What service does your business need most?' :
    'What solution is right for you?';

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '"DM Sans",system-ui,sans-serif', color: '#f0f2f5' }}>
      {/* Topbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', background: ACC, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#07090c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#f0f2f5', letterSpacing: '-0.03em' }}>Squarespell</span>
        </Link>
        <div style={{ fontSize: '14px', color: 'rgba(240,242,245,0.5)' }}>
          Already have an account?{' '}
          <Link href="/sign-in" style={{ color: ACC, fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(210,255,29,0.08)', border: '1px solid rgba(210,255,29,0.2)', borderRadius: '100px', padding: '6px 16px', marginBottom: '28px', fontSize: '13px', fontWeight: 700, color: ACC }}>
          Free · No credit card required
        </div>

        <h1 style={{ fontSize: 'clamp(36px,5vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: '16px' }}>
          See your quiz in 30 seconds
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.5)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
          Enter your Squarespace site URL. AI reads your brand and builds a quiz instantly.
        </p>

        {stage === 'input' && (
          <div>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="yoursite.squarespace.com"
              style={{ width: '100%', height: '56px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#f0f2f5', fontSize: '15px', padding: '0 20px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              {examples.map(ex => (
                <button key={ex} onClick={() => setUrl(ex)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', color: 'rgba(240,242,245,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {ex}
                </button>
              ))}
            </div>
            <button
              onClick={() => { if (url.trim()) setStage('loading'); }}
              style={{ width: '100%', height: '56px', background: url.trim() ? ACC : 'rgba(210,255,29,0.3)', color: BG, fontSize: '15px', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: url.trim() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'background 0.15s' }}
            >
              Build my quiz →
            </button>
            <p style={{ fontSize: '13px', color: 'rgba(240,242,245,0.3)', marginTop: '12px' }}>Takes 30 seconds · No sign up required</p>
          </div>
        )}

        {stage === 'loading' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '6px', height: '6px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ height: '6px', background: ACC, borderRadius: '6px', width: `${progress}%`, transition: 'width 0.1s linear' }} />
            </div>
            <p style={{ fontSize: '15px', color: 'rgba(240,242,245,0.6)', fontWeight: 500 }}>{loadingMessages[msgIdx]}</p>
          </div>
        )}

        {stage === 'preview' && (
          <div style={{ animation: 'fadeIn .5s ease', textAlign: 'left' }}>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
            {/* Quiz preview card */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>Live preview</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '20px', color: '#f0f2f5' }}>{quizTitle}</p>
              {['Getting more qualified leads', 'Improving my conversion rate', 'Building a stronger brand presence'].map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: i === 0 ? 'rgba(210,255,29,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(210,255,29,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', marginBottom: '8px', cursor: 'pointer' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: i === 0 ? ACC : 'rgba(255,255,255,0.06)', border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: i === 0 ? BG : 'rgba(240,242,245,0.4)', flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: '16px', color: i === 0 ? '#f0f2f5' : 'rgba(240,242,245,0.6)' }}>{opt}</span>
                </div>
              ))}
            </div>

            {/* Success bar */}
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: '15px', color: '#4ade80', fontWeight: 600 }}>Your quiz is ready! Sign up to publish it and start capturing leads.</span>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/sign-up?from=try" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '52px', background: ACC, color: BG, fontSize: '15px', fontWeight: 700, borderRadius: '12px', textDecoration: 'none' }}>
                Publish my quiz →
              </Link>
              <Link href="/pricing" style={{ flex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '52px', padding: '0 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f2f5', fontSize: '15px', fontWeight: 500, borderRadius: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                See pricing
              </Link>
            </div>
          </div>
        )}

        {/* Trust row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '56px', flexWrap: 'wrap' }}>
          {[['No credit card', '1'], ['Live in 2 minutes', '2'], ['Leads auto-captured', '3']].map(([text, i]) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(240,242,245,0.4)' }}>
              {i === '1' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              {i === '2' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
              {i === '3' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,242,245,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
              {text}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
