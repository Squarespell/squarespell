import type { Metadata } from 'next';
import { pageSeo } from '@/lib/site';

// /templates/page.tsx is a client component, so its metadata lives in this layout.
const TITLE = 'Quiz templates | Squarespell Quiz';
const DESCRIPTION = 'Start from a ready-made quiz template and customise the questions, scoring, outcomes and lead capture.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...pageSeo('/templates', { title: TITLE, description: DESCRIPTION }),
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
