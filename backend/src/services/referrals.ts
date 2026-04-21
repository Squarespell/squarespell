import { supabase } from '../db/supabaseClient';
import { log } from '../lib/logger';
import crypto from 'crypto';

/**
 * Generate a unique referral code for a user.
 * Format: first 4 chars of user ID + 6 random alphanumeric chars
 */
export async function generateReferralCode(userId: string): Promise<string> {
  var prefix = userId.substring(0, 4).toUpperCase();
  var suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  var code = prefix + suffix;

  // Verify uniqueness
  var { data: existing } = await supabase
    .from('referral_codes')
    .select('id')
    .eq('code', code)
    .single();

  if (existing) {
    // Collision - try again recursively (extremely unlikely)
    return generateReferralCode(userId);
  }

  return code;
}

/**
 * Get or create a referral code for a user.
 * Returns the code and its ID.
 */
export async function getReferralCode(userId: string): Promise<{ code: string; id: string } | null> {
  try {
    // Check if user already has a code
    var { data: existing } = await supabase
      .from('referral_codes')
      .select('id, code')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (existing) {
      return { code: existing.code, id: existing.id };
    }

    // Generate new code
    var newCode = await generateReferralCode(userId);

    var { data: created, error } = await supabase
      .from('referral_codes')
      .insert({
        user_id: userId,
        code: newCode,
        reward_type: 'discount',
        reward_amount: 25,
        max_uses: 999,
        active: true,
        created_at: new Date().toISOString(),
      })
      .select('id, code')
      .single();

    if (error) {
      log.error('[Referrals] Failed to create code:', { detail: error.message, userId });
      return null;
    }

    return created ? { code: created.code, id: created.id } : null;
  } catch (e: any) {
    log.error('[Referrals] getReferralCode error:', { detail: e.message, userId });
    return null;
  }
}

/**
 * Track a referral when someone signs up with a code.
 * Records the referral_code_id and referred_email.
 */
export async function trackReferral(referralCode: string, referredEmail: string): Promise<{ id: string } | null> {
  try {
    // Find the referral code
    var { data: codeRecord } = await supabase
      .from('referral_codes')
      .select('id, user_id, max_uses')
      .eq('code', referralCode)
      .eq('active', true)
      .single();

    if (!codeRecord) {
      log.warn('[Referrals] Referral code not found:', { code: referralCode });
      return null;
    }

    // Check if code has reached max uses
    var { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact' })
      .eq('referral_code_id', codeRecord.id);

    if (count !== null && count >= codeRecord.max_uses) {
      log.warn('[Referrals] Code max uses reached:', { code: referralCode });
      return null;
    }

    // Create referral record
    var { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: codeRecord.user_id,
        referral_code_id: codeRecord.id,
        referred_email: referredEmail,
        status: 'pending',
        reward_granted: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      log.error('[Referrals] Failed to track referral:', { detail: error.message, code: referralCode });
      return null;
    }

    return referral ? { id: referral.id } : null;
  } catch (e: any) {
    log.error('[Referrals] trackReferral error:', { detail: e.message, code: referralCode });
    return null;
  }
}

/**
 * Convert a referral to "converted" status when referred user subscribes to a paid plan.
 * This is called after the referred user purchases a subscription.
 */
export async function convertReferral(
  referredEmail: string,
  referralCode: string
): Promise<{ success: boolean }> {
  try {
    // Find the referral record
    var { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('id, referrer_id, referral_code_id')
      .eq('referred_email', referredEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!referral || fetchError) {
      log.warn('[Referrals] Referral not found for conversion:', { email: referredEmail });
      return { success: false };
    }

    // Mark as converted
    var { error: updateError } = await supabase
      .from('referrals')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    if (updateError) {
      log.error('[Referrals] Failed to convert referral:', { detail: updateError.message, referralId: referral.id });
      return { success: false };
    }

    log.info('[Referrals] Referral converted:', { referralId: referral.id, referrerId: referral.referrer_id });
    return { success: true };
  } catch (e: any) {
    log.error('[Referrals] convertReferral error:', { detail: e.message, email: referredEmail });
    return { success: false };
  }
}

/**
 * Get referral statistics for a user.
 * Returns total referred, converted, pending, and total reward earned.
 */
export async function getReferralStats(userId: string): Promise<{
  totalReferred: number;
  converted: number;
  pending: number;
  rewardEarned: number;
} | null> {
  try {
    // Get all referral codes for this user
    var { data: codes } = await supabase
      .from('referral_codes')
      .select('id, reward_amount')
      .eq('user_id', userId)
      .eq('active', true);

    if (!codes || codes.length === 0) {
      return {
        totalReferred: 0,
        converted: 0,
        pending: 0,
        rewardEarned: 0,
      };
    }

    var codeIds = codes.map((c: any) => c.id);

    // Get referral statistics
    var { data: referrals } = await supabase
      .from('referrals')
      .select('id, status, reward_granted')
      .in('referral_code_id', codeIds);

    if (!referrals) {
      return {
        totalReferred: 0,
        converted: 0,
        pending: 0,
        rewardEarned: 0,
      };
    }

    var totalReferred = referrals.length;
    var converted = referrals.filter((r: any) => r.status === 'converted').length;
    var pending = referrals.filter((r: any) => r.status === 'pending').length;

    // Calculate reward earned - each converted referral earns the reward_amount
    var rewardEarned = 0;
    if (codes && codes.length > 0) {
      var codesMap = new Map(codes.map((c: any) => [c.id, c.reward_amount]));
      referrals.forEach((r: any) => {
        if (r.status === 'converted' && r.reward_granted) {
          var rewardAmount = codesMap.get(r.referral_code_id);
          if (rewardAmount) {
            rewardEarned += rewardAmount;
          }
        }
      });
    }

    return {
      totalReferred,
      converted,
      pending,
      rewardEarned,
    };
  } catch (e: any) {
    log.error('[Referrals] getReferralStats error:', { detail: e.message, userId });
    return null;
  }
}

/**
 * List all referrals for a user with details.
 * Returns array of referrals with email, status, dates, etc.
 */
export async function listReferrals(userId: string, limit: number = 100): Promise<any[]> {
  try {
    // Get all referral codes for this user
    var { data: codes } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true);

    if (!codes || codes.length === 0) {
      return [];
    }

    var codeIds = codes.map((c: any) => c.id);

    // Get all referrals
    var { data: referrals, error } = await supabase
      .from('referrals')
      .select('id, referred_email, status, created_at, converted_at')
      .in('referral_code_id', codeIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('[Referrals] Failed to list referrals:', { detail: error.message, userId });
      return [];
    }

    return referrals || [];
  } catch (e: any) {
    log.error('[Referrals] listReferrals error:', { detail: e.message, userId });
    return [];
  }
}
