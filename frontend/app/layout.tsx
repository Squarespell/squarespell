'use client';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import '../lib/authFetch';
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
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>
        <KeepAlive />
        {children}
        <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
