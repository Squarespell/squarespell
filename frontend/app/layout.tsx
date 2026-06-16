'use client';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import { setAuthToken } from '../lib/api';
import { startKeepAlive } from '../lib/keepAlive';
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
      // Pass the getToken *function* so every API call fetches a fresh token
      // instead of caching a single string that goes stale on rotation.
      setAuthToken(
        () => getToken().then(t => t || ''),
        () => getToken({ skipCache: true } as any).then(t => t || '')
      );
    } else {
      // Grace period: when Clerk rotates the session token, isSignedIn can
      // briefly flip to false. Do NOT nuke the token immediately — wait 12s
      // to see if Clerk recovers (matches the useDashboardAuth grace window).
      const timer = setTimeout(() => {
        // Re-check: if still not signed in after the grace period, clear it.
        getToken().then(t => {
          if (!t) setAuthToken(null);
        }).catch(() => setAuthToken(null));
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, getToken]);
  return null;
}

function KeepAlive() {
  useEffect(() => { startKeepAlive(); }, []);
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
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body>
          <ToastProvider>
          <AuthTokenSync />
          <KeepAlive />
          {children}
          <Footer />
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
