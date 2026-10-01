/**
 * Where to go after signing in or up. A quiz built before sign-up ("from=try") carries its claim code along; a
 * dashboard page the visitor was sent away from ("next") is honoured when it is a path on this site.
 */
export function authDestinations(searchParams: { get(name: string): string | null }) {
  const fromTry = searchParams.get('from') === 'try';
  const rawClaim = searchParams.get('claim') || '';
  const claim = /^[A-Za-z0-9_-]{1,128}$/.test(rawClaim) ? rawClaim : '';
  const rawNext = searchParams.get('next') || '';
  const next = /^\/dashboard(?:[/?#][^\s\\]*)?$/.test(rawNext) && !rawNext.startsWith('//') ? rawNext : '';
  const dest = fromTry ? `/dashboard?new=true${claim ? `&claim=${claim}` : ''}` : next || '/dashboard';
  const suffix = fromTry ? `?from=try${claim ? `&claim=${claim}` : ''}` : '';
  return { dest, signInUrl: '/sign-in' + suffix, signUpUrl: '/sign-up' + suffix };
}
