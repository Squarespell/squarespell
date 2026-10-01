'use client';
import { AuthProvider, useAuth } from '../lib/auth/client';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import { setAuthToken } from '../lib/api';
import { ToastProvider } from '../lib/toast';
import './globals.css';

// Self-hosted, optimized loading (no render-blocking Google Fonts request).
// Inter is the platform's primary typeface — see SQUARESPELL-SYSTEM-DESIGN.md
// typography section for rationale. Exposed as --font-inter and consumed by
// the --font / --font-body CSS variables in globals.css.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

function AuthTokenSync() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      // Pass the getToken *function* so every API call gets a current token (cached until shortly before expiry).
      setAuthToken(
        () => getToken().then(t => t || ''),
        () => getToken({ skipCache: true }).then(t => t || '')
      );
    } else {
      setAuthToken(null);
    }
  }, [isLoaded, isSignedIn, getToken]);
  return null;
}

function Footer() {
  // No footer on app domain - marketing site (squarespell.com) has its own
  // footer. The full footer markup previously lived below an early `return
  // null` (so it was 100% dead/unreachable code - removed during cleanup).
  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <html lang="en" className={inter.variable}>
        <head>
          {/* 2026 redesign display typefaces: Inter Tight for headings, Instrument Serif for editorial quiz cover art. */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700;800&family=Instrument+Serif&display=swap" />
        </head>
        <body>
          <ToastProvider>
          <AuthTokenSync />
          {children}
          <Footer />
          </ToastProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
