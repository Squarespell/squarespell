/**
 * /q/[slug] — permanent redirect to the canonical /quiz/[slug] route.
 *
 * Why this exists:
 *   Historical dashboard helpers (and published marketing snippets) advertised
 *   a shortlink shape of `https://quiz.squarespell.com/q/:slug`, but the only
 *   real handler is at /quiz/:slug. Rather than break every pre-existing link
 *   (or force visitors through a broken 404), this server component issues a
 *   permanent redirect to the canonical URL and preserves the query string.
 *
 *   The `publicQuizUrl` helper in `lib/urls.ts` has been updated to emit the
 *   canonical `/quiz/:slug` URL directly; this file is the belt-and-braces
 *   safety net for old snippets already embedded on customer sites.
 */

import { redirect, permanentRedirect } from 'next/navigation';

type Props = {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function stringifySearchParams(sp?: Props['searchParams']): string {
  if (!sp) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export default function QuizShortlink({ params, searchParams }: Props) {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  if (!slug) {
    redirect('/');
  }
  // 308 — preserves method + is cacheable. OK for embed iframes.
  permanentRedirect(`/quiz/${encodeURIComponent(slug)}${stringifySearchParams(searchParams)}`);
}
