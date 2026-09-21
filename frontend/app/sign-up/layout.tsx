import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';

// Authentication pages are never indexed.
export const metadata: Metadata = {
  title: 'Sign up | Squarespell Quiz',
  ...pageSeo('/sign-up', { indexable: false }),
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
