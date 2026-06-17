import type { Metadata } from 'next';

// NOTE: this page is served from app.squarespell.com (see middleware.ts —
// the bare squarespell.com domain is a separate Squarespace-hosted marketing
// site, not this Next.js app).
//
// The marketing/SEO content for "Squarespell Quiz" now lives at
// squarespell.com/quiz. This route was trimmed down to a functional
// gateway (URL input + sign in/up) to avoid duplicating that marketing
// copy across two domains, so it's marked noindex with a canonical
// pointing at the page that should actually rank.
var CANONICAL = 'https://squarespell.com/quiz';

export var metadata: Metadata = {
  title: 'Squarespell Quiz — Build Your Quiz',
  description: 'Paste your Squarespace URL to generate a branded lead-capture quiz with Squarespell Quiz.',
  alternates: {
    canonical: CANONICAL,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function QuizFunnelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
