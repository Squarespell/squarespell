/**
 * emailAbTesting.ts — Email A/B testing engine.
 *
 * Inspired by Mailchimp's A/B test logic and Klaviyo's smart sending:
 *  - Split audience into test groups
 *  - Send variant A to group 1, variant B to group 2
 *  - Track opens/clicks per variant
 *  - Auto-declare winner after statistical significance or time threshold
 *  - Send winning variant to remaining audience
 *
 * Code-style: var, function(){}, string concatenation (project convention).
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import { generateSubjectLines } from './aiEmailEngine';
import type { CampaignGoal } from './aiEmailEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AbTestConfig {
  campaign_id: string;
  variants: AbVariant[];
  sample_percentage: number;   // % of audience to test (e.g. 20)
  winning_metric: 'open_rate' | 'click_rate' | 'conversion_rate';
  auto_send_winner: boolean;
  test_duration_hours: number;  // max hours before declaring winner
}

export interface AbVariant {
  label: string;              // A, B, C, D
  subject: string;
  html: string;
  weight: number;             // split weight (default 50/50)
}

export interface AbTestResult {
  test_id: string;
  campaign_id: string;
  status: 'running' | 'completed' | 'cancelled';
  variants: AbVariantResult[];
  winner: AbVariantResult | null;
  confidence: number;
  total_test_sends: number;
}

export interface AbVariantResult {
  variant_id: string;
  label: string;
  sends: number;
  opens: number;
  clicks: number;
  open_rate: number;
  click_rate: number;
  is_winner: boolean;
}

// ---------------------------------------------------------------------------
// Create A/B test for a campaign
// ---------------------------------------------------------------------------

export async function createEmailAbTest(
  campaignId: string,
  config: Omit<AbTestConfig, 'campaign_id'>
): Promise<{ test_id: string; variants_created: number }> {
  // Enable A/B testing on the campaign
  await supabase
    .from('email_campaigns')
    .update({
      ab_test_enabled: true,
      ab_test_sample_pct: config.sample_percentage || 20,
    })
    .eq('id', campaignId);

  // Create variant records
  var variantsCreated = 0;
  for (var i = 0; i < config.variants.length; i++) {
    var v = config.variants[i];
    var { error } = await supabase.from('email_ab_variants').insert({
      campaign_id: campaignId,
      variant_label: v.label || String.fromCharCode(65 + i),
      subject: v.subject,
      html: v.html,
      weight: v.weight || Math.floor(100 / config.variants.length),
    });

    if (!error) variantsCreated++;
  }

  log.info('[EmailAB] Created A/B test', {
    campaign_id: campaignId,
    variants: variantsCreated,
  });

  return { test_id: campaignId, variants_created: variantsCreated };
}

// ---------------------------------------------------------------------------
// AI-powered variant generation
// ---------------------------------------------------------------------------

export async function generateAbVariants(
  campaignId: string,
  goal: CampaignGoal,
  baseHtml: string,
  variantCount: number
): Promise<AbVariant[]> {
  // Generate different subject lines using AI
  var subjectResult = await generateSubjectLines(goal, {}, variantCount);
  var subjects = subjectResult.subjects;

  var variants: AbVariant[] = [];
  var weightPerVariant = Math.floor(100 / variantCount);

  for (var i = 0; i < Math.min(subjects.length, variantCount); i++) {
    variants.push({
      label: String.fromCharCode(65 + i),  // A, B, C...
      subject: subjects[i].text,
      html: baseHtml,  // Same body, different subjects (most impactful test)
      weight: weightPerVariant,
    });
  }

  return variants;
}

// ---------------------------------------------------------------------------
// Assign variant to a recipient (deterministic by email hash)
// ---------------------------------------------------------------------------

export function assignVariant(
  email: string,
  variants: { label: string; weight: number }[]
): string {
  // Simple hash-based assignment for consistency
  var hash = 0;
  for (var i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash) % 100;

  var cumWeight = 0;
  for (var j = 0; j < variants.length; j++) {
    cumWeight += variants[j].weight;
    if (hash < cumWeight) return variants[j].label;
  }

  return variants[0].label;
}

// ---------------------------------------------------------------------------
// Get A/B test results
// ---------------------------------------------------------------------------

export async function getAbTestResults(campaignId: string): Promise<AbTestResult | null> {
  var { data: variants, error } = await supabase
    .from('email_ab_variants')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('variant_label', { ascending: true });

  if (error || !variants || variants.length === 0) return null;

  var variantResults: AbVariantResult[] = variants.map(function(v: any) {
    var opens = v.opens_count || 0;
    var sends = v.sends_count || 0;
    var clicks = v.clicks_count || 0;
    return {
      variant_id: v.id,
      label: v.variant_label,
      sends: sends,
      opens: opens,
      clicks: clicks,
      open_rate: sends > 0 ? Math.round((opens / sends) * 10000) / 100 : 0,
      click_rate: sends > 0 ? Math.round((clicks / sends) * 10000) / 100 : 0,
      is_winner: v.is_winner || false,
    };
  });

  // Determine winner
  var winner = findWinner(variantResults, 'open_rate');
  var totalSends = variantResults.reduce(function(sum, v) { return sum + v.sends; }, 0);

  // Check if we have a declared winner in DB
  var { data: campaign } = await supabase
    .from('email_campaigns')
    .select('ab_test_winner_variant_id')
    .eq('id', campaignId)
    .single();

  var status: 'running' | 'completed' | 'cancelled' = 'running';
  if (campaign?.ab_test_winner_variant_id) {
    status = 'completed';
  }

  return {
    test_id: campaignId,
    campaign_id: campaignId,
    status: status,
    variants: variantResults,
    winner: winner,
    confidence: calculateConfidence(variantResults),
    total_test_sends: totalSends,
  };
}

// ---------------------------------------------------------------------------
// Statistical winner detection
// ---------------------------------------------------------------------------

function findWinner(
  variants: AbVariantResult[],
  metric: 'open_rate' | 'click_rate'
): AbVariantResult | null {
  if (variants.length < 2) return variants[0] || null;

  // Need minimum 30 sends per variant for meaningful results
  var eligible = variants.filter(function(v) { return v.sends >= 30; });
  if (eligible.length < 2) return null;

  // Sort by metric descending
  eligible.sort(function(a, b) {
    return (b[metric] || 0) - (a[metric] || 0);
  });

  var best = eligible[0];
  var second = eligible[1];

  // Need at least 10% relative difference to declare winner
  if (best[metric] > 0 && second[metric] > 0) {
    var relDiff = (best[metric] - second[metric]) / second[metric];
    if (relDiff >= 0.10) {
      best.is_winner = true;
      return best;
    }
  }

  return null; // No clear winner yet
}

function calculateConfidence(variants: AbVariantResult[]): number {
  if (variants.length < 2) return 0;

  var totalSends = variants.reduce(function(s, v) { return s + v.sends; }, 0);
  if (totalSends < 60) return 0;

  // Simplified confidence calculation
  // Based on sample size and effect size
  var sorted = variants.slice().sort(function(a, b) { return b.open_rate - a.open_rate; });
  var best = sorted[0];
  var second = sorted[1];

  if (best.open_rate === 0 || second.open_rate === 0) return 0;

  var diff = best.open_rate - second.open_rate;
  var avgRate = (best.open_rate + second.open_rate) / 2;
  var effectSize = diff / avgRate;

  // More sends + bigger effect = higher confidence
  var sampleFactor = Math.min(totalSends / 200, 1); // max at 200 total sends
  var effectFactor = Math.min(effectSize / 0.2, 1);  // max at 20% relative diff

  var confidence = Math.round(sampleFactor * effectFactor * 95);
  return Math.min(confidence, 99);
}

// ---------------------------------------------------------------------------
// Auto-declare winner and send to remaining audience
// ---------------------------------------------------------------------------

export async function checkAndDeclareWinner(
  campaignId: string,
  minConfidence: number
): Promise<{ declared: boolean; winner_label?: string; confidence?: number }> {
  var results = await getAbTestResults(campaignId);
  if (!results || results.status === 'completed') {
    return { declared: false };
  }

  if (results.confidence < minConfidence) {
    return { declared: false };
  }

  if (!results.winner) {
    return { declared: false };
  }

  // Declare winner
  await supabase
    .from('email_campaigns')
    .update({
      ab_test_winner_variant_id: results.winner.variant_id,
      subject: results.winner.label, // Update campaign subject to winner
    })
    .eq('id', campaignId);

  await supabase
    .from('email_ab_variants')
    .update({ is_winner: true })
    .eq('id', results.winner.variant_id);

  log.info('[EmailAB] Winner declared', {
    campaign_id: campaignId,
    winner: results.winner.label,
    confidence: results.confidence,
  });

  return {
    declared: true,
    winner_label: results.winner.label,
    confidence: results.confidence,
  };
}

// ---------------------------------------------------------------------------
// Record variant engagement
// ---------------------------------------------------------------------------

export async function recordVariantEvent(
  campaignId: string,
  variantLabel: string,
  eventType: 'send' | 'open' | 'click'
): Promise<void> {
  var field = eventType === 'send' ? 'sends_count'
    : eventType === 'open' ? 'opens_count'
    : 'clicks_count';

  // Get current count and increment
  var { data: variant } = await supabase
    .from('email_ab_variants')
    .select('id, ' + field)
    .eq('campaign_id', campaignId)
    .eq('variant_label', variantLabel)
    .single();

  if (variant) {
    var update: Record<string, any> = {};
    update[field] = ((variant as any)[field] || 0) + 1;
    await supabase
      .from('email_ab_variants')
      .update(update)
      .eq('id', (variant as any).id);
  }
}
