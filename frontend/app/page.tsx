import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import HomePage from '@/components/marketing/home/HomePage';

/**
 * Root route of the Squarespell Quiz application.
 *
 * Signed-in users go straight to the dashboard. Everyone else sees the public
 * homepage. The URL field on that page hands off to the existing no-login
 * builder at /tools/quiz-funnel/build.
 *
 * Indexing follows the NEXT_PUBLIC_ALLOW_INDEXING build flag (see lib/site.ts); canonical URL and Open Graph come from pageSeo().
 */
export const metadata: Metadata = {
  title: 'Squarespell Quiz | AI quiz funnels built from your website',
  description:
    'Paste your website URL and Squarespell Quiz drafts the questions, scoring, outcomes and lead capture. Edit every detail, then embed it on Squarespace and other sites that allow custom code.',
  ...pageSeo('/', { title: 'Squarespell Quiz | AI quiz funnels built from your website', description: 'Paste your website URL and Squarespell Quiz drafts the questions, scoring, outcomes and lead capture. Edit every detail, then embed it on Squarespace and other sites that allow custom code.' }),
};

export default function Page() {
  const { userId } = auth();
  if (userId) redirect('/dashboard');
  return <HomePage />;
}
