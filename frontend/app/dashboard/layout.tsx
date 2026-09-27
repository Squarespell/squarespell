// Every page under /dashboard reads the sq_session cookie at request time via
// useDashboardAuth() (which calls useSearchParams(), requiring a Suspense
// boundary during static generation) and always needs a live session check
// anyway, so static prerendering is never useful here.
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
