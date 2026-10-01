import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';

// Authentication pages are never indexed.
export const metadata: Metadata = {
  title: 'Confirm your email | Squarespell Quiz',
  ...pageSeo('/verify-email', { indexable: false }),
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
