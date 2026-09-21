'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TRIAL_DAYS } from '@/lib/plans';
import { builderHref } from './routes';
import { TrustBar } from './TrustBar';
import { ProofStrip } from './ProofStrip';

const STEP_LABELS = ['Analyze', 'Build', 'Publish'] as const;

// Copy shown in the hero product scene while it cycles. These mirror the
// Photography Style template that ships in lib/quiz/templates.ts.
const STAGES = [
  { question: 'Which editing style are you drawn to?', count: 'QUESTION 2 OF 6', score: '84', label: 'high intent' },
  { question: 'What is your photography budget?', count: 'QUESTION 4 OF 6', score: '92', label: 'qualified' },
  { question: 'The Storyteller Collection', count: 'YOUR PHOTOGRAPHY MATCH', score: '1', label: 'new lead' },
];

export function HeroSection() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [step, setStep] = useState(0);
  const [fade, setFade] = useState(true);
  const stepRef = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const swap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useRef(false);
  const stage = STAGES[step];

  const show = useCallback((i: number) => {
    stepRef.current = i;
    setFade(false);
    if (swap.current) clearTimeout(swap.current);
    swap.current = setTimeout(() => {
      setStep(i);
      setFade(true);
    }, 180);
  }, []);

  const start = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    // Cycling stops for reduced-motion users and while the tab is hidden.
    if (reduced.current || document.hidden) return;
    timer.current = setInterval(() => show((stepRef.current + 1) % STAGES.length), 3600);
  }, [show]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mq.matches;
    const onChange = () => {
      reduced.current = mq.matches;
      start();
    };
    mq.addEventListener('change', onChange);
    document.addEventListener('visibilitychange', start);
    start();
    return () => {
      mq.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', start);
      if (timer.current) clearInterval(timer.current);
      if (swap.current) clearTimeout(swap.current);
    };
  }, [start]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    router.push(builderHref(url));
  }

  const urlForm = (
    <form className="url-builder" onSubmit={onSubmit}>
      <span className="url-prefix">https://</span>
      <input aria-label="Your website URL" id="website-url" placeholder="yourwebsite.com" autoComplete="url" required value={url} onChange={(e) => setUrl(e.target.value)} />
      <button className="button teal" type="submit">Build my quiz <span className="arr">↗</span></button>
    </form>
  );

  const steps = (
    <div className="product-steps">
      {STEP_LABELS.map((label, i) => (
        <button key={label} type="button" className={'pstep' + (i === step ? ' active' : '')} aria-pressed={i === step} onClick={() => { show(i); start(); }}>
          <b>{i + 1}</b>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <section className="hero"><div className="shell"><div className="hero-grid"><div className="hero-copy reveal"><div className="kicker">AI quiz funnel builder</div><h1>Your website,<span>turned into a quiz.</span></h1><p>Paste your URL. Squarespell reads your brand and drafts the questions, scoring, outcomes and lead capture. You edit every detail before it goes live.</p>{urlForm}<div className="hero-note"><span><i></i>{TRIAL_DAYS}-day Pro trial</span><span><i></i>No credit card</span><span><i></i>Keep every lead</span></div></div><div className="hero-visual reveal" id="product"><div className="browser"><div className="browser-bar"><i className="browser-dot"></i><i className="browser-dot"></i><i className="browser-dot"></i><span className="browser-address">squarespellquiz.com / editor</span><span className="browser-status">Draft saved</span></div><div className="product-shell"><aside className="product-nav"><div className="mini-logo"><span className="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><circle cx="12" cy="4" r="2" fill="#fff"></circle><path d="M12 6v5M12 11L7 16M12 11l5 5"></path><circle cx="7" cy="18" r="2" fill="#fff"></circle><circle cx="17" cy="18" r="2" fill="#fff"></circle></svg></span>Quiz</div>{steps}</aside><div className="product-main"><div className="product-top"><strong>Photography Style Quiz</strong><span>Preview · Desktop</span></div><div className="preview-frame"><div className="preview-quiz" id="hero-preview"><img className="quiz-photo" src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=82&fit=crop" alt="Wedding ceremony from the Photography Style Quiz template" /><div className="quiz-panel"><span className="quiz-brand">RIVERLIGHT PHOTOGRAPHY</span>{<span className="q-count">{stage.count}</span>}{<h3 style={{ opacity: fade ? 1 : 0, transition: 'opacity .18s' }}>{stage.question}</h3>}<div className="image-options"><button className="image-option"><img src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=300&q=80&fit=crop" alt="" /><span>Light and airy</span></button><button className="image-option"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300&q=80&fit=crop" alt="" /><span>Bold and dramatic</span></button><button className="image-option"><img src="https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=300&q=80&fit=crop" alt="" /><span>Warm and vintage</span></button><button className="image-option"><img src="https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=300&q=80&fit=crop" alt="" /><span>Classic and timeless</span></button></div><div className="preview-footer"><div className="progress"><i></i></div><span>2 / 6</span></div></div></div></div></div></div></div><div className="scan-card brand-data"><h4>Brand matched</h4><div className="swatches"><i></i><i></i><i></i></div><p>Colors, typography and voice pulled from the website.</p></div><div className="scan-card score-data pulse"><h4>Example lead score</h4>{<div className="score">{stage.score} <small>{stage.label}</small></div>}<p>Example only. Budget and timeline signals detected.</p></div><div className="hero-sticker"><span><strong>16</strong>real templates<br />ready to edit</span></div></div></div>{<TrustBar />}{<ProofStrip />}</div></section>
  );
}
