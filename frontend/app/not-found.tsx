/**
 * Global 404 surface. Branded replacement for Next.js's default page.
 * Rendered when no route matches (including /q/[slug] with a bad slug,
 * deleted quizzes, etc.).
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#07090c',
        color: '#f0f2f5',
        fontFamily: '"DM Sans", system-ui, sans-serif',
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
            color: '#D2FF1D',
            margin: '0 0 10px',
          }}
        >
          404
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          We couldn&apos;t find that page
        </h1>
        <p style={{ fontSize: 14, opacity: 0.66, lineHeight: 1.55, margin: '0 0 24px' }}>
          The link may be broken, or the quiz may have been unpublished. Try
          the dashboard or head back home.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              padding: '12px 22px',
              borderRadius: 100,
              background: '#D2FF1D',
              color: '#07090c',
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
              color: '#f0f2f5',
              border: '1px solid rgba(255,255,255,0.12)',
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
