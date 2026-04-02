'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './editor.module.css';
type Tab = 'questions' | 'results' | 'settings';
export default function QuizEditorPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('questions');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [brandUrl, setBrandUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const slug = quiz?.slug ?? '';
  const hostedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quiz/${slug}`;
  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL}/embed/quiz-embed.js" data-quiz="${slug}" data-height="auto" async></script>`;
  useEffect(() => {
    api.getQuiz(params.quizId).then(setQuiz);
    api.getAnalytics(params.quizId).then(setAnalytics).catch(() => {});
  }, [params.quizId]);
  async function save(updates: any) { setSaving(true); const u = await api.updateQuiz(params.quizId, updates); setQuiz(u); setSaving(false); }
  async function publish() { setPublishing(true); await api.publishQuiz(params.quizId); setQuiz((q: any) => ({ ...q, status: 'live' })); setPublishing(false); }
  async function scanBrand() {
    if (!brandUrl) return; setScanning(true);
    try { const b = await api.scrapeBrand(brandUrl.startsWith('http') ? brandUrl : 'https://' + brandUrl); await save({ branding: { ...quiz.branding, ...b, auto_detected: true } }); } catch {}
    setScanning(false);
  }
  function copyEmbed() { navigator.clipboard.writeText(embedCode); setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2000); }
  function updateQuestion(qi: number, field: string, value: any) { const q = [...(quiz.questions ?? [])]; q[qi] = { ...q[qi], [field]: value }; save({ questions: q }); }
  function updateOption(qi: number, oi: number, label: string) { const q = [...(quiz.questions ?? [])]; const o = [...(q[qi].options ?? [])]; o[oi] = { ...o[oi], label }; q[qi] = { ...q[qi], options: o }; save({ questions: q }); }
  function moveQuestion(idx: number, dir: -1|1) { const q = [...(quiz.questions ?? [])]; const t = idx + dir; if (t < 0 || t >= q.length) return; [q[idx], q[t]] = [q[t], q[idx]]; save({ questions: q }); }
  if (!quiz) return <div className={styles.loading}>Loading editor...</div>;
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <button className={styles.back} onClick={() => router.push('/dashboard')}>← Back</button>
        <div className={styles.quizTitle}>{quiz.title}</div>
        <div className={`${styles.statusBadge} ${quiz.status === 'live' ? styles.live : styles.draft}`}>{quiz.status}</div>
        {analytics && <div className={styles.miniStats}>
          <div className={styles.stat}><span>{analytics.views}</span>Views</div>
          <div className={styles.stat}><span>{analytics.completion_rate}%</span>Complete</div>
          <div className={styles.stat}><span>{analytics.leads}</span>Leads</div>
        </div>}
        {quiz.status !== 'live' && <button className={styles.publishBtn} onClick={publish} disabled={publishing}>{publishing ? 'Publishing...' : '🚀 Publish quiz'}</button>}
        {quiz.status === 'live' && <div className={styles.linkBox}><div className={styles.linkLabel}>Hosted link</div><a href={hostedUrl} target="_blank" rel="noopener" className={styles.link}>{hostedUrl.replace('https://','')}</a></div>}
        {quiz.status === 'live' && <div className={styles.embedBox}><div className={styles.linkLabel}>Embed code</div><pre className={styles.embedPre}>{embedCode}</pre><button className={styles.copyBtn} onClick={copyEmbed}>{embedCopied ? '✓ Copied!' : 'Copy code'}</button></div>}
      </aside>
      <main className={styles.main}>
        <div className={styles.tabs}>
          {(['questions','results','settings'] as Tab[]).map(t => <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
          {saving && <span className={styles.saving}>Saving...</span>}
        </div>
        {tab === 'questions' && <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Quiz title</h2>
          <input className={styles.titleInput} value={quiz.title} onChange={e => save({ title: e.target.value })} />
          <h2 className={styles.sectionTitle} style={{ marginTop: 32 }}>Questions</h2>
          {(quiz.questions ?? []).map((q: any, qi: number) => q.type === 'lead_capture' ? null : (
            <div key={q.id} className={styles.questionCard}>
              <div className={styles.questionHeader}><span className={styles.qType}>{q.type.replace('_',' ')}</span><div className={styles.qActions}><button onClick={() => moveQuestion(qi,-1)}>↑</button><button onClick={() => moveQuestion(qi,1)}>↓</button></div></div>
              <input className={styles.qText} value={q.text} onChange={e => updateQuestion(qi,'text',e.target.value)} placeholder="Question text..." />
              {q.options && <div className={styles.options}><div className={styles.optionsLabel}>Options</div>{q.options.map((opt: any, oi: number) => <div key={opt.id} className={styles.optionRow}><input value={opt.label} onChange={e => updateOption(qi,oi,e.target.value)} placeholder={opt.is_other ? 'Other (free text)' : `Option ${oi+1}`} className={styles.optionInput} disabled={opt.is_other} />{opt.is_other && <span className={styles.otherTag}>AI processed</span>}</div>)}</div>}
            </div>
          ))}
        </div>}
        {tab === 'results' && <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Outcomes</h2>
          {(quiz.outcomes ?? []).map((o: any, oi: number) => (
            <div key={o.id} className={styles.outcomeCard}>
              <input className={styles.qText} value={o.title} onChange={e => { const outcomes=[...quiz.outcomes]; outcomes[oi]={...outcomes[oi],title:e.target.value}; save({outcomes}); }} placeholder="Outcome title" />
              <textarea className={styles.outcomeSubtitle} value={o.subtitle} rows={2} onChange={e => { const outcomes=[...quiz.outcomes]; outcomes[oi]={...outcomes[oi],subtitle:e.target.value}; save({outcomes}); }} placeholder="Subtitle shown to the visitor" />
              <div className={styles.scoreRange}>Score range: {o.score_range?.min} – {o.score_range?.max}</div>
              <div className={styles.optionsLabel}>CTA</div>
              <input className={styles.optionInput} style={{marginBottom:8}} value={o.recommendation?.cta_text??''} onChange={e => { const outcomes=[...quiz.outcomes]; outcomes[oi].recommendation={...outcomes[oi].recommendation,cta_text:e.target.value}; save({outcomes}); }} placeholder="CTA button text" />
              <input className={styles.optionInput} value={o.recommendation?.cta_url??''} onChange={e => { const outcomes=[...quiz.outcomes]; outcomes[oi].recommendation={...outcomes[oi].recommendation,cta_url:e.target.value}; save({outcomes}); }} placeholder="CTA URL" />
            </div>
          ))}
        </div>}
        {tab === 'settings' && <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Website branding</h2>
          <p className={styles.settingsSub}>Paste your Squarespace URL and AI will auto-detect your colors and font.</p>
          <div className={styles.brandRow}><input className={styles.brandInput} placeholder="yoursite.squarespace.com" value={brandUrl} onChange={e => setBrandUrl(e.target.value)} /><button className={styles.scanBtn} onClick={scanBrand} disabled={scanning}>{scanning ? 'Scanning...' : 'Scan →'}</button></div>
          {quiz.branding?.auto_detected && <div className={styles.brandPreview}><div className={styles.swatchRow}>{Object.entries(quiz.branding.colors??{}).map(([k,v])=><div key={k} className={styles.swatch}><div className={styles.swatchColor} style={{background:v as string}}/><div className={styles.swatchLabel}>{k}</div></div>)}</div><div className={styles.fontRow}>Font detected: <strong>{quiz.branding.font_family}</strong></div></div>}
          <h2 className={styles.sectionTitle} style={{marginTop:32}}>Lead capture</h2>
          <label className={styles.toggle}><input type="checkbox" checked={quiz.settings?.lead_capture_enabled??true} onChange={e => save({settings:{...quiz.settings,lead_capture_enabled:e.target.checked}})} /><span>Require name + email before showing results</span></label>
          <h2 className={styles.sectionTitle} style={{marginTop:32}}>Redirect after result</h2>
          <label className={styles.toggle}><input type="checkbox" checked={quiz.settings?.redirect_after_result??false} onChange={e => save({settings:{...quiz.settings,redirect_after_result:e.target.checked}})} /><span>Redirect visitor to a URL after showing results</span></label>
          {quiz.settings?.redirect_after_result && <input className={styles.brandInput} style={{marginTop:12}} placeholder="https://yoursite.com/thank-you" value={quiz.settings?.redirect_url??''} onChange={e => save({settings:{...quiz.settings,redirect_url:e.target.value}})} />}
        </div>}
      </main>
    </div>
  );
}
