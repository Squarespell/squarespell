/**
 * commerce.ts — API routes for Squarespace Commerce integration.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import {
  connectSquarespaceSite, disconnectSquarespaceSite, syncProducts,
  getUserProducts, mapProductToOutcome, removeProductFromOutcome,
  getOutcomeProducts,
} from '../services/squarespaceCommerce';

export var commerceRouter = Router();

// ── Connection Management ────────────────────────────────────────────────────

// POST /api/commerce/connect — connect Squarespace site
commerceRouter.post('/connect', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { api_key, site_url } = req.body;
    if (!api_key) return res.status(400).json({ error: 'api_key required' });
    var result = await connectSquarespaceSite(req.userId!, api_key, site_url);
    if (result.error) return res.status(400).json({ error: result.error.message });
    res.status(201).json(result.data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/commerce/connections/:id — disconnect
commerceRouter.delete('/connections/:id', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var result = await disconnectSquarespaceSite(req.params.id, req.userId!);
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/commerce/connections — list connections
commerceRouter.get('/connections', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data } = await supabase
      .from('squarespace_connections')
      .select('id, site_id, site_url, site_title, sync_status, sync_error, last_synced_at, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    res.json(data || []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/commerce/connections/:id/sync — trigger product sync
commerceRouter.post('/connections/:id/sync', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var count = await syncProducts(req.params.id, req.userId!);
    res.json({ synced: count });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Products ─────────────────────────────────────────────────────────────────

// GET /api/commerce/products — list all synced products
commerceRouter.get('/products', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var available = req.query.available === 'true';
    var products = await getUserProducts(req.userId!, available);
    res.json(products);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Product-Outcome Mapping ──────────────────────────────────────────────────

// GET /api/commerce/quizzes/:quizId/outcomes/:outcomeId/products
commerceRouter.get('/quizzes/:quizId/outcomes/:outcomeId/products', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var products = await getOutcomeProducts(req.params.quizId, req.params.outcomeId);
    res.json(products);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/commerce/quizzes/:quizId/outcomes/:outcomeId/products
commerceRouter.post('/quizzes/:quizId/outcomes/:outcomeId/products', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { product_id, display_order, custom_headline, custom_description } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id required' });
    var result = await mapProductToOutcome(
      req.params.quizId, req.params.outcomeId, product_id,
      display_order, custom_headline, custom_description
    );
    if (result.error) return res.status(400).json({ error: result.error.message });
    res.status(201).json(result.data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/commerce/quizzes/:quizId/outcomes/:outcomeId/products/:productId
commerceRouter.delete('/quizzes/:quizId/outcomes/:outcomeId/products/:productId', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var result = await removeProductFromOutcome(req.params.quizId, req.params.outcomeId, req.params.productId);
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
