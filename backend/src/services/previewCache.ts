import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PreviewQuizEntry {
  quiz: any;
  brand: any;
  url: string;
}

interface PreviewSessionEntry {
  brand: any;
  url: string;
  onboarding_questions: any[];
  answers: Record<string, string>;
}

// ── Quiz Cache ──────────────────────────────────────────────────────────────

export async function setQuizCache(token: string, entry: PreviewQuizEntry): Promise<void> {
  await supabase.from('preview_cache').upsert({
    token,
    cache_type: 'quiz',
    data: entry,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(), // 24h
  });
}

export async function getQuizCache(token: string): Promise<PreviewQuizEntry | null> {
  const { data } = await supabase
    .from('preview_cache')
    .select('data')
    .eq('token', token)
    .eq('cache_type', 'quiz')
    .gt('expires_at', new Date().toISOString())
    .single();

  return data?.data as PreviewQuizEntry | null;
}

export async function deleteQuizCache(token: string): Promise<void> {
  await supabase.from('preview_cache').delete().eq('token', token);
}

// ── Session Cache ───────────────────────────────────────────────────────────

export async function setSessionCache(token: string, entry: PreviewSessionEntry): Promise<void> {
  await supabase.from('preview_cache').upsert({
    token,
    cache_type: 'session',
    data: entry,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(), // 24h
  });
}

export async function getSessionCache(token: string): Promise<PreviewSessionEntry | null> {
  const { data } = await supabase
    .from('preview_cache')
    .select('data')
    .eq('token', token)
    .eq('cache_type', 'session')
    .gt('expires_at', new Date().toISOString())
    .single();

  return data?.data as PreviewSessionEntry | null;
}

export async function updateSessionAnswers(token: string, answers: Record<string, string>): Promise<PreviewSessionEntry | null> {
  const existing = await getSessionCache(token);
  if (!existing) return null;

  existing.answers = { ...existing.answers, ...answers };
  await setSessionCache(token, existing);
  return existing;
}

// ── Cleanup (called from cron endpoint) ─────────────────────────────────────

export async function cleanupExpiredCache(): Promise<number> {
  const { data } = await supabase
    .from('preview_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('token');

  return data?.length || 0;
}
