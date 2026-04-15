import { supabase } from '../db/supabaseClient';

/** Kebab-case a title: strip accents, drop non-alphanum, collapse spaces, cap 60 chars. */
export function slugifyTitle(input: string): string {
  const cleaned = (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || 'quiz';
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 6);
}

/** Generate a unique kebab slug. If base collides, append a 4-char suffix. */
export async function makeUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugifyTitle(title);
  let candidate = base;
  for (let i = 0; i < 8; i++) {
    const { data } = await supabase.from('quizzes').select('id').eq('slug', candidate).limit(1);
    const taken = (data || []).some((r: any) => !excludeId || r.id !== excludeId);
    if (!taken) return candidate;
    candidate = `${base}-${shortId()}`;
  }
  return `${base}-${shortId()}${shortId()}`;
}

/** Detects the legacy 8-char random slug (pre-pretty-URL scheme). */
export function isLegacyRandomSlug(s: string | null | undefined): boolean {
  return /^[a-z0-9]{8}$/.test(s || '');
}
