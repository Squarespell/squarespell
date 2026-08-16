import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAuditByToken } from '@/lib/db';
import { Auditor } from '@/components/Auditor';
import { Masthead, Footer } from '@/components/Chrome';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const report = await getAuditByToken(token);
  if (!report) return { title: 'Report not found | Squarespell Site Auditor', robots: { index: false } };
  return {
    title: `${report.host} scored ${report.score.overall}/100 | Squarespell Site Auditor`,
    description: report.summary?.narrative?.slice(0, 200),
    // Not indexed: these pages are somebody's audit, not our content. They are
    // still shared privately, so the preview card matters.
    robots: { index: false, follow: false },
    openGraph: {
      title: `${report.host} scored ${report.score.overall} out of 100`,
      description: report.summary?.headline || undefined,
      type: 'article',
      // The static brand card rather than a per-report one: see the note in
      // scripts/make-og.tsx for why the dynamic version was removed.
      images: ['/og.png'],
    },
    twitter: { card: 'summary_large_image', images: ['/og.png'] },
  };
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getAuditByToken(token);
  if (!report) notFound();

  return (
    <>
      <Masthead />
      <main>
        <Auditor initialReport={report} />
      </main>
      <Footer />
    </>
  );
}
