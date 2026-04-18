import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import crypto from 'crypto';

interface Variant {
  variant_id: string;
  quiz_id: string;
  weight: number;
}

interface TestStats {
  variant_id: string;
  impressions: number;
  conversions: number;
  conversion_rate: number;
}

interface ABTest {
  id: string;
  user_id: string;
  quiz_id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  variants: Variant[];
  winner_variant_id: string | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

/**
 * Assign a visitor to a variant using deterministic hash-based assignment.
 * Respects variant weights and checks for existing assignments (sticky).
 */
export async function assignVariant(
  testId: string,
  visitorId: string
): Promise<{ variant_id: string; test_id: string }> {
  try {
    // Check if visitor is already assigned
    const { data: existing, error: existingError } = await supabase
      .from('ab_test_assignments')
      .select('variant_id')
      .eq('test_id', testId)
      .eq('visitor_id', visitorId)
      .single();

    if (!existingError && existing) {
      return {
        variant_id: existing.variant_id,
        test_id: testId,
      };
    }

    // Get the test to access variants
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('variants, status')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      throw new Error(`Test not found: ${testId}`);
    }

    // Only assign if test is running
    if (test.status !== 'running') {
      throw new Error(`Test is not running, status: ${test.status}`);
    }

    const variants: Variant[] = test.variants || [];
    if (!variants || variants.length === 0) {
      throw new Error('No variants in test');
    }

    // Calculate total weight
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight <= 0) {
      throw new Error('Invalid variant weights');
    }

    // Deterministic assignment using hash of testId + visitorId
    const hash = crypto
      .createHash('sha256')
      .update(`${testId}:${visitorId}`)
      .digest();

    // Convert first 8 bytes of hash to number between 0 and totalWeight
    const hashValue = hash.readUInt32BE(0) % 0x100000000; // 32-bit number
    const bucket = (hashValue / 0x100000000) * totalWeight;

    // Find variant based on bucket
    let accumulated = 0;
    let selectedVariant = variants[0];

    for (const variant of variants) {
      accumulated += variant.weight;
      if (bucket < accumulated) {
        selectedVariant = variant;
        break;
      }
    }

    // Record assignment
    const { error: insertError } = await supabase
      .from('ab_test_assignments')
      .insert({
        test_id: testId,
        visitor_id: visitorId,
        variant_id: selectedVariant.variant_id,
      });

    if (insertError) {
      log.error('[ABTesting] Failed to insert assignment:', { err: insertError.message });
      throw insertError;
    }

    console.log(
      `[ABTesting] Assigned visitor ${visitorId} to variant ${selectedVariant.variant_id}`
    );

    return {
      variant_id: selectedVariant.variant_id,
      test_id: testId,
    };
  } catch (err: any) {
    log.error('[ABTesting] Assignment error:', { err: err.message });
    throw err;
  }
}

/**
 * Get statistics for an A/B test.
 * Returns per-variant impressions, conversions, and conversion rate.
 */
export async function getTestStats(testId: string): Promise<TestStats[]> {
  try {
    // Get the test to access variants and their quiz_ids
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('variants')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const variants: Variant[] = test.variants || [];
    const stats: TestStats[] = [];

    // For each variant, count impressions and conversions
    for (const variant of variants) {
      // Count assignments (impressions) for this variant
      const { count: impressions, error: impressionError } = await supabase
        .from('ab_test_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('test_id', testId)
        .eq('variant_id', variant.variant_id);

      if (impressionError) {
        log.error('[ABTesting] Error counting impressions for variant ${variant.variant_id}:', { err: impressionError.message });
        continue;
      }

      // Count conversions: leads created for this variant's quiz
      const { count: conversions, error: conversionError } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', variant.quiz_id);

      if (conversionError) {
        log.error('[ABTesting] Error counting conversions for variant ${variant.variant_id}:', { err: conversionError.message });
        continue;
      }

      const impressionCount = impressions ?? 0;
      const conversionCount = conversions ?? 0;
      const conversionRate =
        impressionCount > 0 ? (conversionCount / impressionCount) * 100 : 0;

      stats.push({
        variant_id: variant.variant_id,
        impressions: impressionCount,
        conversions: conversionCount,
        conversion_rate: conversionRate,
      });
    }

    return stats;
  } catch (err: any) {
    log.error('[ABTesting] Get stats error:', { err: err.message });
    throw err;
  }
}

/**
 * Declare a winner and complete the A/B test.
 */
export async function declareWinner(
  testId: string,
  variantId: string
): Promise<ABTest> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('ab_tests')
      .update({
        status: 'completed',
        winner_variant_id: variantId,
        ended_at: now,
        updated_at: now,
      })
      .eq('id', testId)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to declare winner');
    }

    log.info(`[ABTesting] Declared winner for test ${testId}: ${variantId}`);

    return data;
  } catch (err: any) {
    log.error('[ABTesting] Declare winner error:', { err: err.message });
    throw err;
  }
}

/**
 * Create an A/B test for a quiz.
 */
export async function createTest(
  userId: string,
  quizId: string,
  name: string,
  variants: Variant[]
): Promise<ABTest> {
  try {
    const { data, error } = await supabase
      .from('ab_tests')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        name,
        variants,
        status: 'draft',
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to create test');
    }

    log.info(`[ABTesting] Created test ${data.id} with ${variants.length} variants`);

    return data;
  } catch (err: any) {
    log.error('[ABTesting] Create test error:', { err: err.message });
    throw err;
  }
}

/**
 * Update test status.
 */
export async function updateTestStatus(
  testId: string,
  status: 'running' | 'paused' | 'completed'
): Promise<ABTest> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('ab_tests')
      .update({
        status,
        updated_at: now,
        ...(status === 'completed' && { ended_at: now }),
      })
      .eq('id', testId)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Failed to update test status');
    }

    log.info(`[ABTesting] Updated test ${testId} status to ${status}`);

    return data;
  } catch (err: any) {
    log.error('[ABTesting] Update status error:', { err: err.message });
    throw err;
  }
}

/**
 * Get a single test with all details.
 */
export async function getTest(testId: string): Promise<ABTest | null> {
  try {
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (err: any) {
    log.error('[ABTesting] Get test error:', { err: err.message });
    return null;
  }
}

/**
 * List all tests for a quiz.
 */
export async function listTestsForQuiz(quizId: string): Promise<ABTest[]> {
  try {
    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data;
  } catch (err: any) {
    log.error('[ABTesting] List tests error:', { err: err.message });
    return [];
  }
}
