'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import UpgradeBanner from '@/components/UpgradeBanner';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([api.getQuizzes(), api.getUserPlan()])
      .then(([q, p]) => { setQuizzes(q); setPlan(p); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.layout}>
      <Suspense fallback={null}><UpgradeBanner /></Suspense>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Squarespell</div>
        <div className={styles.planBadge}>{plan?.plan?.toUpperCase()}</div>
        <div className={styles.usage}>{plan?.quiz_count} / {plan?.limits?.quizzes === Infinity ? '∞' : plan?.limits?.quizzes} quizzes</div>
        <button className={styles.newBtn} onClick={() => router.push('/dashboard/new')}>+ New Quiz</button>
      </aside>
      <main className={styles.main}>
        <h1 className={styles.heading}>Your Quizzes</h1>
        {quizzes.length === 0 && <div className={styles.empty}>No quizzes yet. Create your first one!</div>}
        <div className={styles.grid}>
          {quizzes.map(q => (
            <div key={q.id} className={styles.card} onClick={() => router.push(`/dashboard/${q.id}`)}>
              <div className={styles.cardTitle}>{q.title}</div>
              <div className={styles.cardMeta}>
                <span className={q.status === 'live' ? styles.live : styles.draft}>{q.status}</span>
                <span>{q.view_count} views · {q.lead_count} leads</span>
                <button className={styles.analyticsLink} onClick={e => { e.stopPropagation(); router.push(`/dashboard/analytics/${q.id}`); }}>Analytics →</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
