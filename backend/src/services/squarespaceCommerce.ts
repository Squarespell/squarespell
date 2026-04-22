/**
 * squarespaceCommerce.ts — Squarespace Commerce integration.
 *
 * Syncs product catalog from Squarespace Commerce API.
 * Maps products to quiz outcomes for recommendation quizzes.
 * Checks inventory in real-time for available recommendations.
 *
 * Squarespace Commerce API: https://developers.squarespace.com/commerce-apis
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import { encryptConfig, decryptConfig } from '../utils/encryption';

var SQUARESPACE_API_BASE = 'https://api.squarespace.com/1.0';

// ── Types ────────────────────────────────────────────────────────────────────

interface SquarespaceProduct {
  id: string;
  name: string;
  description: string;
  url: string;
  urlSlug: string;
  images: Array<{ url: string; originalSize: { width: number; height: number } }>;
  variants: Array<{
    id: string;
    sku: string;
    pricing: { basePrice: { value: string; currency: string } };
    stock: { quantity: number; unlimited: boolean };
  }>;
  isVisible: boolean;
  categories: string[];
  tags: string[];
}

// ── API Client ───────────────────────────────────────────────────────────────

async function squarespaceApiFetch(apiKey: string, endpoint: string, params?: Record<string, string>): Promise<any> {
  var url = SQUARESPACE_API_BASE + endpoint;
  if (params) {
    var qs = Object.entries(params).map(function(e) { return e[0] + '=' + encodeURIComponent(e[1]); }).join('&');
    url += '?' + qs;
  }

  var response = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'User-Agent': 'Squarespell/1.0',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    var errText = await response.text().catch(function() { return 'Unknown error'; });
    throw new Error('Squarespace API error ' + response.status + ': ' + errText);
  }

  return response.json();
}

// ── Connection Management ────────────────────────────────────────────────────

export async function connectSquarespaceSite(
  userId: string,
  apiKey: string,
  siteUrl?: string
): Promise<{ data: any; error: any }> {
  try {
    // Validate the API key by fetching site info
    var siteInfo = await squarespaceApiFetch(apiKey, '/commerce/inventory');

    // We don't get site_id directly, generate from user+url
    var siteId = 'sq_' + userId.slice(0, 8) + '_' + Date.now();

    var encrypted = encryptConfig({ api_key: apiKey });

    var { data, error } = await supabase
      .from('squarespace_connections')
      .upsert({
        user_id: userId,
        site_id: siteId,
        api_key_encrypted: encrypted.api_key,
        site_url: siteUrl || null,
        sync_status: 'pending',
      }, { onConflict: 'user_id,site_id' })
      .select()
      .single();

    if (error) return { data: null, error };

    // Trigger initial sync (non-blocking)
    syncProducts(data.id, userId, apiKey).catch(function(e) {
      log.info('[Commerce] Initial sync failed', { err: e?.message });
    });

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

export async function disconnectSquarespaceSite(connectionId: string, userId: string): Promise<{ error: any }> {
  // Delete products first, then connection
  await supabase.from('squarespace_products').delete().eq('connection_id', connectionId);
  var { error } = await supabase
    .from('squarespace_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId);
  return { error };
}

// ── Product Sync ─────────────────────────────────────────────────────────────

export async function syncProducts(connectionId: string, userId: string, apiKey?: string): Promise<number> {
  try {
    // Get API key if not provided
    if (!apiKey) {
      var { data: conn } = await supabase
        .from('squarespace_connections')
        .select('api_key_encrypted')
        .eq('id', connectionId)
        .single();
      if (!conn) throw new Error('Connection not found');
      var decrypted = decryptConfig({ api_key: conn.api_key_encrypted });
      apiKey = decrypted.api_key;
    }

    // Mark syncing
    await supabase
      .from('squarespace_connections')
      .update({ sync_status: 'syncing' })
      .eq('id', connectionId);

    // Fetch all products (paginate)
    var allProducts: SquarespaceProduct[] = [];
    var cursor: string | undefined;
    var hasMore = true;

    while (hasMore) {
      var params: Record<string, string> = {};
      if (cursor) params.cursor = cursor;

      var response = await squarespaceApiFetch(apiKey!, '/commerce/products', params);
      var products = response.products || response.result || [];
      allProducts = allProducts.concat(products);
      cursor = response.pagination?.nextPageCursor;
      hasMore = !!cursor;

      // Safety limit
      if (allProducts.length > 5000) break;
    }

    // Upsert products
    var syncCount = 0;
    for (var i = 0; i < allProducts.length; i++) {
      var prod = allProducts[i];
      var mainImage = prod.images?.[0]?.url || null;
      var firstVariant = prod.variants?.[0];
      var priceCents = firstVariant?.pricing?.basePrice?.value
        ? Math.round(parseFloat(firstVariant.pricing.basePrice.value) * 100)
        : null;
      var currency = firstVariant?.pricing?.basePrice?.currency || 'USD';
      var isAvailable = prod.isVisible && (
        prod.variants?.some(function(v) { return v.stock?.unlimited || (v.stock?.quantity || 0) > 0; }) ?? true
      );

      await supabase.from('squarespace_products').upsert({
        connection_id: connectionId,
        user_id: userId,
        squarespace_id: prod.id,
        name: prod.name,
        description: (prod.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
        slug: prod.urlSlug,
        url: prod.url,
        image_url: mainImage,
        price_cents: priceCents,
        currency: currency,
        is_available: isAvailable,
        variant_count: prod.variants?.length || 0,
        categories: prod.categories || [],
        tags: prod.tags || [],
        raw_data: prod,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'connection_id,squarespace_id' });

      syncCount++;
    }

    // Mark synced
    await supabase
      .from('squarespace_connections')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', connectionId);

    log.info('[Commerce] Synced ' + syncCount + ' products', { connectionId });
    return syncCount;
  } catch (err: any) {
    await supabase
      .from('squarespace_connections')
      .update({ sync_status: 'error', sync_error: err.message })
      .eq('id', connectionId);
    throw err;
  }
}

// ── Product Queries ──────────────────────────────────────────────────────────

export async function getUserProducts(userId: string, availableOnly?: boolean): Promise<any[]> {
  var query = supabase
    .from('squarespace_products')
    .select('id, name, description, slug, url, image_url, price_cents, currency, is_available, categories, tags')
    .eq('user_id', userId)
    .order('name');

  if (availableOnly) query = query.eq('is_available', true);

  var { data } = await query;
  return data || [];
}

export async function getProductById(productId: string): Promise<any | null> {
  var { data } = await supabase
    .from('squarespace_products')
    .select('*')
    .eq('id', productId)
    .single();
  return data;
}

// ── Product-Outcome Mapping ──────────────────────────────────────────────────

export async function mapProductToOutcome(
  quizId: string,
  outcomeId: string,
  productId: string,
  displayOrder?: number,
  customHeadline?: string,
  customDescription?: string
): Promise<{ data: any; error: any }> {
  var { data, error } = await supabase
    .from('product_outcome_mappings')
    .upsert({
      quiz_id: quizId,
      outcome_id: outcomeId,
      product_id: productId,
      display_order: displayOrder || 0,
      custom_headline: customHeadline || null,
      custom_description: customDescription || null,
    }, { onConflict: 'quiz_id,outcome_id,product_id' })
    .select()
    .single();
  return { data, error };
}

export async function removeProductFromOutcome(quizId: string, outcomeId: string, productId: string): Promise<{ error: any }> {
  var { error } = await supabase
    .from('product_outcome_mappings')
    .delete()
    .eq('quiz_id', quizId)
    .eq('outcome_id', outcomeId)
    .eq('product_id', productId);
  return { error };
}

export async function getOutcomeProducts(quizId: string, outcomeId: string): Promise<any[]> {
  var { data } = await supabase
    .from('product_outcome_mappings')
    .select('*, squarespace_products(id, name, description, image_url, price_cents, currency, url, is_available)')
    .eq('quiz_id', quizId)
    .eq('outcome_id', outcomeId)
    .order('display_order');

  return (data || []).map(function(m: any) {
    var p = m.squarespace_products;
    return {
      mapping_id: m.id,
      product_id: p?.id,
      name: m.custom_headline || p?.name,
      description: m.custom_description || p?.description,
      image_url: p?.image_url,
      price_cents: p?.price_cents,
      currency: p?.currency,
      url: p?.url,
      is_available: p?.is_available,
      display_order: m.display_order,
    };
  });
}

/**
 * Build add-to-cart URL for a Squarespace product.
 * Squarespace Commerce uses: /cart/add?productId=XXX
 */
export function buildAddToCartUrl(siteUrl: string, squarespaceProductId: string, variantId?: string): string {
  var base = siteUrl.replace(/\/+$/, '');
  var url = base + '/cart/add?productId=' + squarespaceProductId;
  if (variantId) url += '&variantId=' + variantId;
  return url;
}
