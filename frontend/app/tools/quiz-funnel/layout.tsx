import type { Metadata } from 'next';

// NOTE: this page is served from app.squarespell.com (see middleware.ts —
// the bare squarespell.com domain is a separate Squarespace-hosted marketing
// site, not this Next.js app). Canonical/OG URLs must point at the host that
// actually serves this route, or search engines and social scrapers will
// resolve them to the wrong site.
var SITE = 'https://app.squarespell.com';
var PATH = '/tools/quiz-funnel';
var FULL = SITE + PATH;

export var metadata: Metadata = {
  title: 'AI Quiz Funnels for Squarespace — Capture 3× More Leads | Squarespell Quiz',
  description:
    'Build AI-powered quiz funnels for your Squarespace site in under 2 minutes. Segment visitors, capture emails, and convert 3× more leads with personalized result pages. Free plan available.',
  keywords: [
    'quiz funnel',
    'squarespace quiz',
    'lead generation quiz',
    'ai quiz builder',
    'squarespace lead capture',
    'quiz funnel builder',
    'email capture quiz',
    'squarespace marketing',
    'interactive quiz',
    'lead magnet quiz',
    'squarespace plugins',
    'squarespace tools',
    'quiz lead generation',
    'website quiz builder',
    'conversion optimization squarespace',
  ],
  alternates: {
    canonical: FULL,
  },
  openGraph: {
    type: 'website',
    url: FULL,
    title: 'AI Quiz Funnels for Squarespace — Capture 3× More Leads',
    description:
      'Build AI-powered quiz funnels for your Squarespace site in under 2 minutes. Segment visitors, capture emails, and convert 3× more leads.',
    siteName: 'Squarespell Quiz',
    locale: 'en_US',
    // NOTE: og-quiz-funnel.png referenced previously does not exist anywhere
    // in /public, which means every social share of this page was rendering
    // a broken image. Omitting `images` until a real 1200x630 OG asset is
    // designed and added is safer than shipping a dead link.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Quiz Funnels for Squarespace — Capture 3× More Leads',
    description:
      'Build AI-powered quiz funnels in under 2 minutes. Segment visitors, capture emails, convert more leads.',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
};

export default function QuizFunnelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
