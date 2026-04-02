'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styles from './QuizRunner.module.css';

function postToParent(type: string, data?: Record<string, any>) {
  if (typeof window === 'undefined' || window.self === window.top) return;
  window.parent.postMessage({ source: 'squarespell', type, ...data }, '*');
}

export default function QuizRunner({ quiz, slug }: { quiz: any; slug: string }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [leadDone, setLeadDone] = useState(false);
  const [outcome, setOutcome] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const questions: any[] = quiz.questions ?? [];
  const current = questions[step];
  const branding = quiz.branding ?? {};
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isEmbedded = sp?.get('embed') === '1';
  const bgColor = sp?.get('bg') || branding.colors?.background || '#0a0f05';
  const accent = sp?.get('accent') || branding.colors?.primary || '#D2FF1D';
  const textColor = sp?.get('fg') || branding.colors?.text || '#e8f5c8';
  const font = sp?.get('font') || branding.font_family || 'Poppins';

  useEffect(() => {
    postToParent('resize', { height: document.body.scrollHeight });
  }, [step, leadDone]);

  function selectAnswer(qid: string, value: any) {
    if (Object.keys(answers).length === 0) postToParent('start');
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }

  function calculateOutcome() {
    let score = 0;
    questions.forEach(q => {
      const ans = answers[q.id]; const sel = Array.isArray(ans) ? ans : [ans];
      sel.forEach((id: string) => { const opt = q.options?.find((o: any) => o.id === id); score += opt?.score_value ?? 0; });
    });
    return (quiz.outcomes ?? []).find((o: any) => score >= o.score_range?.min && score <= o.score_range?.max) ?? quiz.outcomes?.[0];
  }

  async function submitLead() {
    if (!email) return; setSubmitting(true);
    const resolved = calculateOutcome();
    await api.submitLead(slug, { name, email, answers, outcome_id: resolved?.id });
    await api.trackEvent(slug, { event_type: 'complete', session_id: 'anon' });
    postToParent('lead_captured', { email });
    postToParent('complete', { outcome_id: resolved?.id, lead_email: email });
    setOutcome(resolved); setLeadDone(true); setSubmitting(false);
  }

  const style: React.CSSProperties = { background: bgColor, color: textColor, fontFamily: `'${font}', sans-serif`, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' };

  if (leadDone && outcome) return (
    <div style={style}><div className={styles.resultCard} style={isEmbedded ? { border: 'none', background: 'transparent' } : {}}>
      <h1 style={{ color: accent }}>{outcome.title}</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>{outcome.subtitle}</p>
      <div className={styles.scoreCards}>{outcome.score_cards?.map((sc: any, i: number) => <div key={i} className={styles.scoreCard} style={{ borderColor: accent }}><div style={{ fontSize: 28, fontWeight: 800, color: accent }}>{sc.value}<span style={{ fontSize: 14 }}>{sc.unit}</span></div><div style={{ fontSize: 12, opacity: 0.6 }}>{sc.label}</div></div>)}</div>
      <div className={styles.insights}>{outcome.insights?.map((ins: string, i: number) => <div key={i} className={styles.insight}>✓ {ins}</div>)}</div>
      {outcome.recommendation && <a href={outcome.recommendation.cta_url} style={{ background: accent, color: '#0a0f05', borderRadius: 20, padding: '14px 28px', display: 'inline-block', fontWeight: 700, marginTop: 24 }}>{outcome.recommendation.cta_text}</a>}
    </div></div>
  );

  if (!current) return null;

  if (current.type === 'lead_capture') return (
    <div style={style}><div className={styles.card} style={isEmbedded ? { background: 'transparent', border: 'none' } : {}}>
      <h2>{current.text}</h2>
      <p style={{ opacity: 0.6, marginBottom: 24 }}>{current.description}</p>
      {current.fields?.map((f: any) => <input key={f.id} type={f.type} placeholder={f.label} value={f.id === 'name' ? name : email} onChange={e => f.id === 'name' ? setName(e.target.value) : setEmail(e.target.value)} style={{ marginBottom: 12 }} />)}
      <button onClick={submitLead} disabled={submitting} style={{ background: accent, color: '#0a0f05', width: '100%', padding: '16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 16, marginTop: 8, cursor: 'pointer' }}>{submitting ? 'Getting your results...' : 'Get My Results'}</button>
      {current.consent_text && <p style={{ fontSize: 12, opacity: 0.4, marginTop: 8 }}>{current.consent_text}</p>}
    </div></div>
  );

  const progress = Math.round((step / questions.length) * 100);
  return (
    <div style={style}><div className={styles.card} style={isEmbedded ? { background: 'transparent', border: 'none' } : {}}>
      <div className={styles.progress}><div className={styles.progressBar} style={{ width: `${progress}%`, background: accent }} /></div>
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>Question {step + 1} of {questions.length}</p>
      <h2 style={{ marginBottom: 24 }}>{current.text}</h2>
      {current.description && <p style={{ opacity: 0.6, marginBottom: 20 }}>{current.description}</p>}
      {(current.type === 'single_choice' || current.type === 'multi_select') && <div className={styles.options}>{current.options?.map((opt: any) => {
        const isSel = current.type === 'single_choice' ? answers[current.id] === opt.id : (answers[current.id] ?? []).includes(opt.id);
        return <div key={opt.id} className={styles.option} style={{ borderColor: isSel ? accent : '#2a3e14', background: isSel ? `${accent}18` : 'transparent' }} onClick={() => {
          if (current.type === 'single_choice') selectAnswer(current.id, opt.id);
          else { const prev: string[] = answers[current.id] ?? []; selectAnswer(current.id, prev.includes(opt.id) ? prev.filter((x: string) => x !== opt.id) : [...prev, opt.id]); }
        }}>{opt.is_other ? <input placeholder="Describe your situation..." style={{ background: 'transparent', border: 'none', width: '100%', color: textColor }} onChange={e => selectAnswer(`${current.id}_other_text`, e.target.value)} /> : <span>{opt.label}</span>}</div>;
      })}</div>}
      {current.type === 'text_input' && <textarea rows={3} placeholder={current.placeholder ?? 'Type your answer...'} style={{ marginBottom: 16 }} onChange={e => selectAnswer(current.id, e.target.value)} />}
      <button onClick={() => setStep(s => s + 1)} style={{ background: accent, color: '#0a0f05', width: '100%', padding: '16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 16, marginTop: 16, cursor: 'pointer' }}>{step === questions.length - 1 ? 'See My Results' : 'Continue'}</button>
    </div></div>
  );
}
