import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';

/**
 * /pricing's page.tsx is 'use client' (uses useAuth/useSearchParams for
 * plan-state and billing-toggle interactivity), so it cannot export
 * `metadata` itself. Same nested-layout pattern used for /quiz/[slug],
 * /embed/[slug], /unsubscribe, and /tools/quiz-funnel.
 */
const TITLE = 'Pricing | Squarespell Quiz';
const DESCRIPTION =
  'Simple, transparent pricing for Squarespell Quiz. Compare plans and find the right fit for capturing and converting leads with AI-powered quiz funnels.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...pageSeo('/pricing', { title: TITLE, description: DESCRIPTION }),
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
