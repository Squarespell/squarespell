/**
 * richResults.ts — API routes for rich result page blocks.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import {
  getResultBlocks, upsertResultBlock, deleteResultBlock,
  reorderResultBlocks, getResolvedResultPage,
} from '../services/richResults';

export var richResultsRouter = Router();
export var publicRichResultsRouter = Router();

// ── Private: Manage result blocks ────────────────────────────────────────────

// GET /api/quizzes/:quizId/outcomes/:outcomeId/blocks
richResultsRouter.get('/:quizId/outcomes/:outcomeId/blocks', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.userId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    var blocks = await getResultBlocks(req.params.quizId, req.params.outcomeId);
    res.json(blocks);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/quizzes/:quizId/outcomes/:outcomeId/blocks
richResultsRouter.post('/:quizId/outcomes/:outcomeId/blocks', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.userId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var { block_type, block_order, config } = req.body;
    if (!block_type) return res.status(400).json({ error: 'block_type required' });

    var result = await upsertResultBlock({
      quiz_id: req.params.quizId,
      outcome_id: req.params.outcomeId,
      block_type: block_type,
      block_order: block_order || 0,
      config: config || {},
    });
    if (result.error) return res.status(400).json({ error: result.error.message });
    res.status(201).json(result.data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/quizzes/:quizId/outcomes/:outcomeId/blocks/:blockId
richResultsRouter.patch('/:quizId/outcomes/:outcomeId/blocks/:blockId', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { block_type, block_order, config } = req.body;
    var result = await upsertResultBlock({
      id: req.params.blockId,
      quiz_id: req.params.quizId,
      outcome_id: req.params.outcomeId,
      block_type: block_type,
      block_order: block_order || 0,
      config: config || {},
    });
    if (result.error) return res.status(400).json({ error: result.error.message });
    res.json(result.data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/quizzes/:quizId/outcomes/:outcomeId/blocks/:blockId
richResultsRouter.delete('/:quizId/outcomes/:outcomeId/blocks/:blockId', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var result = await deleteResultBlock(req.params.blockId);
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/quizzes/:quizId/outcomes/:outcomeId/blocks/reorder
richResultsRouter.put('/:quizId/outcomes/:outcomeId/blocks/reorder', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { block_ids } = req.body;
    if (!block_ids || !Array.isArray(block_ids)) return res.status(400).json({ error: 'block_ids array required' });
    await reorderResultBlocks(req.params.quizId, req.params.outcomeId, block_ids);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Public: Render resolved result page ──────────────────────────────────────

// GET /api/public/quiz/:slug/results/:outcomeId
publicRichResultsRouter.get('/quiz/:slug/results/:outcomeId', async function(req, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes').select('id').eq('slug', req.params.slug).eq('status', 'live').single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var result = await getResolvedResultPage(quiz.id, req.params.outcomeId);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
