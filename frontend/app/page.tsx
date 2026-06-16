import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Root route on app.squarespell.com.
 *
 * Signed-in users go to the dashboard. Everyone else goes to the quiz-funnel
 * marketing landing page (the de-facto home of the app subdomain), where the
 * hero URL input drops them into the no-login quiz builder.
 *
 * This is a server component (not 'use client') so the redirect happens
 * before any HTML ships — no client-side "Redirecting…" flash, and it lets
 * this route export real metadata, which the previous client-side version
 * structurally could not do.
 */

export const metadata: Metadata = {
  title: 'Squarespell Quiz — AI Quiz Funnels for Squarespace',
  description:
    'Turn website visitors into segmented leads with AI-generated quiz funnels. Build a branded quiz from any URL in minutes, capture leads, and route them with personalized results — no login required to try it.',
  alternates: {
    canonical: 'https://app.squarespell.com/',
  },
};

export default function HomePage() {
  const { userId } = auth();
  redirect(userId ? '/dashboard' : '/tools/quiz-funnel');
}
