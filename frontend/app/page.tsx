import type { Metadata } from 'next';
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
 * Staging is not indexable. Before public launch the robots rule below must be
 * removed and the final domain's canonical URL and Open Graph image added.
 */
export const metadata: Metadata = {
  title: 'Squarespell Quiz | AI quiz funnels built from your website',
  description:
    'Paste your website URL and Squarespell Quiz drafts the questions, scoring, outcomes and lead capture. Edit every detail, then embed it on Squarespace and other sites that allow custom code.',
  robots: { index: false, follow: false },
};

export default function Page() {
  const { userId } = auth();
  if (userId) redirect('/dashboard');
  return <HomePage />;
}
