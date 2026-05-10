import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email Preferences - Squarespell Quiz',
  robots: 'noindex, nofollow',
};

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
