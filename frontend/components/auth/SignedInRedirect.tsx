'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/client';

/** Sends a signed-in visitor from a public page (the homepage) to their dashboard. Renders nothing. */
export default function SignedInRedirect({ to = '/dashboard' }: { to?: string }) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  useEffect(() => { if (isSignedIn) router.replace(to); }, [isSignedIn, router, to]);
  return null;
}
