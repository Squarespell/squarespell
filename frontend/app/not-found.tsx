/**
 * Global 404 surface. Branded replacement for Next.js's default page.
 * Rendered when no route matches (including /q/[slug] with a bad slug,
 * deleted quizzes, etc.).
 */

import type { Metadata } from 'next';
import Link from 'next/link';

// Without this the 404 had no <title> of its own (the root layout is a client component and sets none).
// No robots entry needed: Next.js already adds <meta name="robots" content="noindex"> to the 404 response.
export const metadata: Metadata = {
  title: 'Page not found | Squarespell Quiz',
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#F5F7FF',
        color: '#0B1233',
        fontFamily: '"Inter", system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#3154FF',
            margin: '0 0 10px',
          }}
        >
          404
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          We couldn&apos;t find that page
        </h1>
        <p style={{ fontSize: 14, opacity: 0.66, lineHeight: 1.55, margin: '0 0 24px' }}>
          This page doesn't exist. Try returning to the dashboard or going back
          home.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              padding: '12px 22px',
              borderRadius: 100,
              background: '#3154FF',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: '12px 22px',
              borderRadius: 100,
              background: 'transparent',
              color: '#0B1233',
              border: '1px solid #E2E7FF',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
