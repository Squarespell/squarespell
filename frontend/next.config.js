// deploy 1777985130

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    const antiFraming = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
    ];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // The dashboard and the sign-in/sign-up pages must never be framed by another site (clickjacking).
      // Quiz and embed pages are intentionally left framable: customers embed them on their own sites.
      { source: '/dashboard/:path*', headers: antiFraming },
      { source: '/sign-in', headers: antiFraming },
      { source: '/sign-up', headers: antiFraming },
    ];
  },
};

module.exports = nextConfig;
