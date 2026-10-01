/**
 * Security headers.
 *
 * Every page gets nosniff, a strict referrer policy, HSTS and a locked-down Permissions-Policy. Pages are only
 * allowed inside frames on our own site (stops clickjacking of the dashboard, admin and sign-in), except the pages
 * that exist to be embedded on customers' websites: /embed/*, /quiz/*, /q/* and /pricing-embed. The production
 * proxy (infra/hostinger-production/Caddyfile.production) additionally opens /embed/<slug> to any site.
 */
const EVERYWHERE = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")' },
];

const NOT_EMBEDDABLE = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
];

/** @type {import('next').NextConfig} */
module.exports = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: EVERYWHERE },
      { source: '/((?!embed/|embed\\.js|quiz/|q/|pricing-embed).*)', headers: NOT_EMBEDDABLE },
    ];
  },
};
