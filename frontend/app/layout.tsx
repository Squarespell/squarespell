'use client';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthToken } from '../lib/api';
import './globals.css';

function AuthTokenSync() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      getToken().then(t => setAuthToken(t));
    } else {
      setAuthToken(null);
    }
  }, [isSignedIn, getToken]);
  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AuthTokenSync />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
