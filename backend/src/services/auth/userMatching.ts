import { supabase } from '../../db/supabaseClient';
import { log } from '../../lib/logger';

export interface MatchedUser {
  id: string;
  plan: string;
  isNewUser: boolean;
}

/**
 * Finds the existing user row for a normalized, just-verified email, or
 * creates one. Matching is case-insensitive via the migration's unique
 * index on lower(trim(email)), which guarantees this can never attach a
 * session to more than one user or create a duplicate, even under
 * concurrent signups for the same email. (ilike here assumes stored
 * emails carry no surrounding whitespace, true for every Clerk-created
 * row since Clerk itself stores addresses trimmed and lowercased.)
 */
export async function matchOrCreateUser(emailNormalized: string): Promise<MatchedUser> {
  const { data: existing, error: lookupError } = await supabase
    .from('users')
    .select('id, plan')
    .ilike('email', emailNormalized)
    .maybeSingle();

  if (lookupError) {
    log.error('matchOrCreateUser: lookup failed', { err: lookupError.message });
    throw new Error('user_lookup_failed');
  }

  if (existing) {
    await supabase.from('users').update({ email_verified_at: new Date().toISOString() }).eq('id', existing.id);
    return { id: existing.id, plan: existing.plan || 'free', isNewUser: false };
  }

  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert({
      email: emailNormalized,
      plan: 'free',
      quiz_count: 0,
      email_verified_at: new Date().toISOString(),
    })
    .select('id, plan')
    .single();

  if (insertError) {
    // 23505 = unique violation on the normalized-email index: a concurrent
    // verify-code for the same email created the row first. Use it instead
    // of failing -- this is exactly the no-duplicate guarantee migration
    // 035's index exists for.
    if (insertError.code === '23505') {
      const { data: raced, error: raceLookupError } = await supabase
        .from('users')
        .select('id, plan')
        .ilike('email', emailNormalized)
        .maybeSingle();
      if (raced && !raceLookupError) {
        return { id: raced.id, plan: raced.plan || 'free', isNewUser: false };
      }
    }
    log.error('matchOrCreateUser: insert failed', { err: insertError.message });
    throw new Error('user_create_failed');
  }

  return { id: created.id, plan: created.plan || 'free', isNewUser: true };
}

