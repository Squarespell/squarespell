import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';

// Authentication pages are never indexed.
export const metadata: Metadata = {
  title: 'Reset your password | Squarespell Quiz',
  ...pageSeo('/forgot-password', { indexable: false }),
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
