/**
 * richResults.ts — Rich results page engine.
 *
 * Manages dynamic content blocks on quiz result pages:
 * product cards, social sharing, CTAs, testimonials, countdowns.
 * Renders product data from Squarespace Commerce when linked.
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

interface ResultBlock {
  id?: string;
  quiz_id: string;
  outcome_id: string;
  block_type: 'product_card' | 'social_share' | 'cta_button' | 'text' | 'image' | 'video' | 'testimonial' | 'countdown';
  block_order: number;
  config: Record<string, any>;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getResultBlocks(quizId: string, outcomeId: string): Promise<any[]> {
  var { data } = await supabase
    .from('result_page_blocks')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('outcome_id', outcomeId)
    .order('block_order');
  return data || [];
}

export async function upsertResultBlock(block: ResultBlock): Promise<{ data: any; error: any }> {
  if (block.id) {
    var { data, error } = await supabase
      .from('result_page_blocks')
      .update({
        block_type: block.block_type,
        block_order: block.block_order,
        config: block.config,
      })
      .eq('id', block.id)
      .select()
      .single();
    return { data, error };
  }
  var { data: d2, error: e2 } = await supabase
    .from('result_page_blocks')
    .insert({
      quiz_id: block.quiz_id,
      outcome_id: block.outcome_id,
      block_type: block.block_type,
      block_order: block.block_order,
      config: block.config,
    })
    .select()
    .single();
  return { data: d2, error: e2 };
}

export async function deleteResultBlock(blockId: string): Promise<{ error: any }> {
  var { error } = await supabase
    .from('result_page_blocks')
    .delete()
    .eq('id', blockId);
  return { error };
}

export async function reorderResultBlocks(quizId: string, outcomeId: string, blockIds: string[]): Promise<void> {
  for (var i = 0; i < blockIds.length; i++) {
    await supabase
      .from('result_page_blocks')
      .update({ block_order: i })
      .eq('id', blockIds[i])
      .eq('quiz_id', quizId);
  }
}

/**
 * Get fully resolved result page for a public quiz outcome.
 * Merges result blocks with live product data from Squarespace.
 */
export async function getResolvedResultPage(quizId: string, outcomeId: string): Promise<{
  blocks: any[];
  products: any[];
}> {
  var blocks = await getResultBlocks(quizId, outcomeId);

  // Find product_card blocks and resolve product data
  var productBlocks = blocks.filter(function(b) { return b.block_type === 'product_card'; });
  var products: any[] = [];

  if (productBlocks.length > 0) {
    // Fetch mapped products
    var { data: mappings } = await supabase
      .from('product_outcome_mappings')
      .select('*, squarespace_products(*)')
      .eq('quiz_id', quizId)
      .eq('outcome_id', outcomeId)
      .order('display_order');

    if (mappings) {
      products = mappings.map(function(m: any) {
        var prod = m.squarespace_products;
        return {
          id: prod?.id,
          name: m.custom_headline || prod?.name,
          description: m.custom_description || prod?.description,
          image_url: prod?.image_url,
          price_cents: prod?.price_cents,
          currency: prod?.currency,
          url: prod?.url,
          is_available: prod?.is_available,
          display_order: m.display_order,
        };
      }).filter(function(p: any) { return p.is_available !== false; });
    }
  }

  return { blocks, products };
}

export type { ResultBlock };
