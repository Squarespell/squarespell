/**
 * Minimal embed layout
 *
 * This layout is used ONLY for embedded quizzes (/embed/[slug]).
 * It provides a clean HTML shell without:
 * - Clerk authentication providers
 * - Dashboard navigation
 * - Heavy client-side overhead
 *
 * The parent root layout is NOT applied to this segment, reducing bundle size.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quiz',
  robots: 'noindex, nofollow',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: 'transparent' }}>
        {children}
      </body>
    </html>
  );
}
