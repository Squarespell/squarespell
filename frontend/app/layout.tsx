'use client';
import { useEffect } from 'react';
import '../lib/authFetch';
import { startKeepAlive } from '../lib/keepAlive';
import { ToastProvider } from '../lib/toast';
import './globals.css';

// next/font/google was removed: it fetches font metadata from Google's
// servers at *build* time (not just runtime), which made CI builds fail
// whenever that network call was unreliable. --font-inter is now simply
// unset, so the var(--font-inter, 'Inter') fallback chain already in
// globals.css degrades straight to the system font stack -- see the
// typography section of SQUARESPELL-SYSTEM-DESIGN.md for the prior rationale.

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
    <html lang="en">
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
