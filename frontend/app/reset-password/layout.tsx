import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';

// Authentication pages are never indexed.
export const metadata: Metadata = {
  title: 'Choose a new password | Squarespell Quiz',
  ...pageSeo('/reset-password', { indexable: false }),
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
