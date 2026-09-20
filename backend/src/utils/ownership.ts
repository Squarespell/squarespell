import { supabase } from '../db/supabaseClient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

/** Every check returns false for a malformed id or a resource owned by someone else (callers answer 404). */
export async function ownsQuiz(quizId: string, dbUserId?: string): Promise<boolean> {
  if (!dbUserId || !isUuid(quizId)) return false;
  const { data } = await supabase.from('quizzes').select('id').eq('id', quizId).eq('user_id', dbUserId).maybeSingle();
  return !!data;
}

export async function ownsLead(leadId: string, dbUserId?: string): Promise<boolean> {
  if (!dbUserId || !isUuid(leadId)) return false;
  const { data } = await supabase.from('leads').select('id').eq('id', leadId).eq('user_id', dbUserId).maybeSingle();
  return !!data;
}

export async function ownsTag(tagId: string, dbUserId?: string): Promise<boolean> {
  if (!dbUserId || !isUuid(tagId)) return false;
  const { data } = await supabase.from('lead_tags').select('id').eq('id', tagId).eq('user_id', dbUserId).maybeSingle();
  return !!data;
}

export async function ownsConnection(id: string, dbUserId?: string): Promise<boolean> {
  if (!dbUserId || !isUuid(id)) return false;
  const { data } = await supabase.from('squarespace_connections').select('id').eq('id', id).eq('user_id', dbUserId).maybeSingle();
  return !!data;
}

export async function ownsProduct(id: string, dbUserId?: string): Promise<boolean> {
  if (!dbUserId || !isUuid(id)) return false;
  const { data } = await supabase.from('squarespace_products').select('id').eq('id', id).eq('user_id', dbUserId).maybeSingle();
  return !!data;
}

/** ids of every quiz the user owns (used to scope cross-table privacy exports). */
export async function ownedQuizIds(dbUserId?: string): Promise<string[]> {
  if (!dbUserId) return [];
  const { data } = await supabase.from('quizzes').select('id').eq('user_id', dbUserId);
  return (data || []).map((r: any) => r.id);
}
