import type { Metadata } from 'next';

var SITE = 'https://squarespell.com';
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
    images: [
      {
        url: SITE + '/og-quiz-funnel.png',
        width: 1200,
        height: 630,
        alt: 'Squarespell Quiz AI Quiz Funnel Builder — create quizzes that capture leads on Squarespace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Quiz Funnels for Squarespace — Capture 3× More Leads',
    description:
      'Build AI-powered quiz funnels in under 2 minutes. Segment visitors, capture emails, convert more leads.',
    images: [SITE + '/og-quiz-funnel.png'],
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  other: {
    'google-site-verification': '',
  },
};

export default function QuizFunnelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
