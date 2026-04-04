'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Quiz { id: string; title: string; status: string; leads_count?: number; created_at: string; }
interface Plan { plan: string; quiz_count: number; limits: { quizzes: number; leads: number }; }

export default function DashboardPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getQuizzes(), api.getUserPlan()])
      .then(([q, p]) => { setQuizzes(q); setPlan(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07090c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(240,242,245,.42)', fontFamily: 'system-ui' }}>Loading...</p>
    </div>
  );

  const atLimit = plan && quizzes.length >= plan.limits.quizzes;

  return (
    <div style={{ minHeight: '100vh', background: '#07090c', fontFamily: 'system-ui,sans-serif', color: '#f0f2f5' }}>
      {plan?.plan === 'free' && (
        <div style={{ background: 'rgba(210,255,29,.06)', borderBottom: '.5px solid rgba(210,255,29,.18)', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#D2FF1D' }}>⏱ 5 days left on your free trial</span>
          <button onClick={() => router.push('/pricing')} style={{ background: '#D2FF1D', color: '#07090c', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Upgrade now</button>
        </div>
      )}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.045em', marginBottom: 3 }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: 'rgba(240,242,245,.42)' }}>{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} · {plan?.plan || 'free'} plan</p>
          </div>
          <button onClick={() => atLimit ? router.push('/pricing') : router.push('/dashboard/new')} style={{ background: '#D2FF1D', color: '#07090c', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {atLimit ? '⬆ Upgrade to create more' : '+ New quiz'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total quizzes', value: quizzes.length, sub: `of ${plan?.limits.quizzes || 1} allowed` },
            { label: 'Total leads', value: quizzes.reduce((a, q) => a + (q.leads_count || 0), 0), sub: 'across all quizzes' },
            { label: 'Plan', value: (plan?.plan || 'free').charAt(0).toUpperCase() + (plan?.plan || 'free').slice(1), sub: '5 days remaining' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,.055)', border: '.5px solid rgba(255,255,255,.09)', borderRadius: 13, padding: '18px 20px' }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#D2FF1D', letterSpacing: '-.05em' }}>{s.value}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(240,242,245,.4)', textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 4 }}>{s.label}</p>
              <p style={{ fontSize: 11, color: 'rgba(240,242,245,.42)', marginTop: 3 }}>{s.sub}</p>
            </div>
          ))}
        </div>
        {quizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', background: 'rgba(255,255,255,.03)', border: '.5px solid rgba(255,255,255,.07)', borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✦</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Create your first quiz</h2>
            <p style={{ fontSize: 14, color: 'rgba(240,242,245,.42)', marginBottom: 22 }}>Paste your website URL and AI builds it in 30 seconds.</p>
            <button onClick={() => router.push('/dashboard/new')} style={{ background: '#D2FF1D', color: '#07090c', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Build my quiz free →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizzes.map(quiz => (
              <div key={quiz.id} style={{ background: 'rgba(255,255,255,.04)', border: '.5px solid rgba(255,255,255,.08)', borderRadius: 13, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => router.push(`/dashboard/${quiz.id}`)}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{quiz.title}</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 11, color: quiz.status === 'published' ? '#4ade80' : 'rgba(240,242,245,.42)', fontWeight: 600 }}>{quiz.status === 'published' ? '● Live' : '○ Draft'}</span>
                    <span style={{ fontSize: 11, color: 'rgba(240,242,245,.42)' }}>{quiz.leads_count || 0} leads</span>
                    <span style={{ fontSize: 11, color: 'rgba(240,242,245,.42)' }}>{new Date(quiz.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={e => { e.stopPropagation(); router.push(`/dashboard/leads?quiz=${quiz.id}`); }} style={{ background: 'rgba(255,255,255,.05)', border: '.5px solid rgba(255,255,255,.09)', color: 'rgba(240,242,245,.7)', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>Leads</button>
                  <button onClick={e => { e.stopPropagation(); router.push(`/dashboard/${quiz.id}`); }} style={{ background: 'rgba(210,255,29,.08)', border: '.5px solid rgba(210,255,29,.18)', color: '#D2FF1D', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
