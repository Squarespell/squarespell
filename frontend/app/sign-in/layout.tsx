import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';

// Authentication pages are never indexed.
export const metadata: Metadata = {
  title: 'Sign in | Squarespell Quiz',
  ...pageSeo('/sign-in', { indexable: false }),
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
