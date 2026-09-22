'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardShell } from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { PageLoading } from '../../_components/PageShell';
import { connectApi, QuizSummary } from '@/lib/connect/client';
import { AnnounceProvider, SitesStyles } from '../_components/primitives';
import { SiteDetailBody } from '../_components/SiteDetail';

/** /dashboard/sites/[siteId]: the full-page version of the website details drawer. */
export default function SiteDetailPage() {
  const { token, status } = useDashboardAuth();
  const params = useParams<{ siteId: string }>();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    const api = connectApi(token);
    api.config().then((c) => setEnabled(c.enabled)).catch(() => setEnabled(false));
    api.quizzes().then((q) => setQuizzes(Array.isArray(q) ? q : [])).catch(() => setQuizzes([]));
  }, [token]);

  if (status === 'loading' || enabled === null) return <DashboardShell title="Website details"><PageLoading /></DashboardShell>;
  if (!enabled) {
    return (
      <DashboardShell title="Website details">
        <div className="sx-scope"><SitesStyles /><div className="sx-empty"><h2>Website connections are not available yet</h2><p>You can still use the manual embed code.</p><Link className="sx-btn sx-btn-primary" href="/dashboard/embed">Open manual embed</Link></div></div>
      </DashboardShell>
    );
  }
  return (
    <DashboardShell title="Website details">
      <AnnounceProvider>
        <div className="sx-scope">
          <SitesStyles />
          <p style={{ margin: '0 0 14px' }}><Link href="/dashboard/sites" className="sx-btn sx-btn-sm">Back to Sites</Link></p>
          <div className="sx-card" style={{ maxWidth: 820 }}>
            <SiteDetailBody token={token || ''} siteId={params.siteId} quizzes={quizzes} onChanged={() => undefined} onDisconnected={() => router.push('/dashboard/sites')} onFinishSetup={() => router.push('/dashboard/sites')} />
          </div>
        </div>
      </AnnounceProvider>
    </DashboardShell>
  );
}
