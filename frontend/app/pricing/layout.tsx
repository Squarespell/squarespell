import type { Metadata } from 'next';

/**
 * /pricing's page.tsx is 'use client' (uses useAuth/useSearchParams for
 * plan-state and billing-toggle interactivity), so it cannot export
 * `metadata` itself. Same nested-layout pattern used for /quiz/[slug],
 * /embed/[slug], /unsubscribe, and /tools/quiz-funnel.
 */
export const metadata: Metadata = {
  title: 'Pricing | Squarespell Quiz',
  description:
    'Simple, transparent pricing for Squarespell Quiz. Compare plans and find the right fit for capturing and converting leads with AI-powered quiz funnels.',
  openGraph: {
    title: 'Pricing | Squarespell Quiz',
    description:
      'Simple, transparent pricing for Squarespell Quiz. Compare plans and find the right fit for capturing and converting leads with AI-powered quiz funnels.',
    url: 'https://app.squarespell.com/pricing',
    siteName: 'Squarespell Quiz',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Squarespell Quiz',
    description: 'Simple, transparent pricing for Squarespell Quiz.',
  },
  alternates: {
    canonical: 'https://app.squarespell.com/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
