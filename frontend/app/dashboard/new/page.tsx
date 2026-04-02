'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import UpgradePrompt from '@/components/UpgradePrompt';
import styles from './new.module.css';

const BUSINESS_TYPES = ['Health & Wellness','Photography','Interior Design','Coaching & Consulting','Food & Beverage','Fitness & Personal Training','Beauty & Skincare','E-commerce / Products','Events & Wedding Planning','Other'];
const GOALS = ['Generate more leads','Qualify website visitors','Recommend the right product or service','Book more discovery calls','Grow my email list','Educate my audience'];

export default function NewQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState<'url'|'type'|'goal'|'generating'>('url');
  const [url, setUrl] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userPlan, setUserPlan] = useState('free');

  function handleUrlNext() {
    const norm = url.startsWith('http') ? url : 'https://' + url;
    try { new URL(norm); setUrl(norm); setError(''); setStep('type'); }
    catch { setError('Please enter a valid website URL'); }
  }

  function handleTypeNext() {
    if (!businessType) { setError('Please select a business type'); return; }
    setError(''); setStep('goal');
  }

  async function handleGenerate() {
    if (!goal) { setError('Please select a goal'); return; }
    setError(''); setStep('generating');
    try {
      const p = await api.getUserPlan(); setUserPlan(p.plan);
      const generated = await api.generateQuiz({ url, business_type: businessType, goal });
      const quiz = await api.createQuiz({ title: generated.title, questions: generated.questions, outcomes: generated.outcomes, branding: {}, settings: { lead_capture_enabled: true, show_progress_bar: true } });
      router.push(`/dashboard/${quiz.id}`);
    } catch (e: any) {
      if (e.message?.includes('limit')) { setShowUpgrade(true); setStep('goal'); }
      else { setError(e.message ?? 'Generation failed. Please try again.'); setStep('goal'); }
    }
  }

  return (
    <div className={styles.page}>
      {showUpgrade && <UpgradePrompt reason="quiz_limit" currentPlan={userPlan} onDismiss={() => setShowUpgrade(false)} />}
      <div className={styles.card}>
        <div className={styles.dots}>
          {(['url','type','goal'] as const).map((s, i) => <div key={s} className={`${styles.dot} ${step === s || (step === 'generating' && i === 2) ? styles.dotActive : ''}`} />)}
        </div>
        {step === 'url' && <>
          <h1 className={styles.heading}>What's your website URL?</h1>
          <p className={styles.sub}>AI will scan it to understand your brand and generate the perfect quiz.</p>
          <input type="text" placeholder="yourwebsite.com" value={url} autoFocus onChange={e => { setUrl(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleUrlNext()} className={styles.input} />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btn} onClick={handleUrlNext}>Continue →</button>
        </>}
        {step === 'type' && <>
          <h1 className={styles.heading}>What type of business are you?</h1>
          <p className={styles.sub}>This helps the AI write quiz copy that fits your audience.</p>
          <div className={styles.pillGrid}>{BUSINESS_TYPES.map(t => <button key={t} className={`${styles.pill} ${businessType === t ? styles.pillActive : ''}`} onClick={() => { setBusinessType(t); setError(''); }}>{t}</button>)}</div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.navRow}><button className={styles.btnGhost} onClick={() => setStep('url')}>← Back</button><button className={styles.btn} onClick={handleTypeNext}>Continue →</button></div>
        </>}
        {step === 'goal' && <>
          <h1 className={styles.heading}>What's the goal of this quiz?</h1>
          <p className={styles.sub}>The AI will optimise your quiz outcomes around this goal.</p>
          <div className={styles.goalList}>{GOALS.map(g => <button key={g} className={`${styles.goalOption} ${goal === g ? styles.goalActive : ''}`} onClick={() => { setGoal(g); setError(''); }}><span className={styles.goalCheck}>{goal === g ? '●' : '○'}</span>{g}</button>)}</div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.navRow}><button className={styles.btnGhost} onClick={() => setStep('type')}>← Back</button><button className={styles.btn} onClick={handleGenerate}>Generate my quiz ✦</button></div>
        </>}
        {step === 'generating' && <div className={styles.generating}>
          <div className={styles.spinner} />
          <h2>Building your quiz...</h2>
          <p>AI is reading your website, writing questions and crafting personalised outcomes.</p>
          <div className={styles.steps}>{['Scanning your website','Writing quiz questions','Crafting outcome copy','Saving to your dashboard'].map((s, i) => <div key={s} className={styles.genStep} style={{ animationDelay: `${i * 0.8}s` }}>{s}</div>)}</div>
        </div>}
      </div>
    </div>
  );
}
