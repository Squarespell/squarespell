/**
 * extendedFeatures.ts — Routes for custom CSS, embed performance, skip logic validation.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import { getCustomCss, saveCustomCss } from '../services/customCss';
import { logEmbedPerformance, getEmbedPerformanceStats, generateLightweightLoader } from '../services/embedPerformance';
import { validateShowConditions } from '../services/skipLogic';
import { QUESTION_TYPES, validateQuestionAnswer } from '../services/questionTypes';

export var extendedFeaturesRouter = Router();
export var publicExtendedRouter = Router();

// ── Custom CSS ───────────────────────────────────────────────────────────────

// GET /api/quizzes/:id/custom-css
extendedFeaturesRouter.get('/quizzes/:id/custom-css', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var css = await getCustomCss(req.params.id);
    res.json({ css: css });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/quizzes/:id/custom-css
extendedFeaturesRouter.put('/quizzes/:id/custom-css', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { css } = req.body;
    var result = await saveCustomCss(req.params.id, req.userId!, css || '');
    if (result.error) return res.status(400).json({ error: result.error.message });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Skip Logic Validation ────────────────────────────────────────────────────

// POST /api/quizzes/:id/validate-conditions
extendedFeaturesRouter.post('/quizzes/:id/validate-conditions', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { question_index, conditions, total_questions } = req.body;
    if (question_index === undefined || !conditions) {
      return res.status(400).json({ error: 'question_index, conditions required' });
    }
    var result = validateShowConditions(question_index, conditions, total_questions || 20);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Question Types ───────────────────────────────────────────────────────────

// GET /api/question-types — list available question types
extendedFeaturesRouter.get('/question-types', async function(_req, res) {
  res.json(QUESTION_TYPES);
});

// POST /api/validate-answer — validate an answer for a question type
extendedFeaturesRouter.post('/validate-answer', async function(req, res) {
  try {
    var { question, answer } = req.body;
    if (!question) return res.status(400).json({ error: 'question object required' });
    var result = validateQuestionAnswer(question, answer);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Embed Performance ────────────────────────────────────────────────────────

// GET /api/analytics/:quizId/embed-performance — performance stats
extendedFeaturesRouter.get('/analytics/:quizId/embed-performance', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes').select('id').eq('id', req.params.quizId).eq('user_id', req.userId).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    var days = parseInt(req.query.days as string) || 30;
    var stats = await getEmbedPerformanceStats(req.params.quizId, days);
    res.json(stats);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/embed/loader/:slug — generate lightweight loader script
extendedFeaturesRouter.get('/embed/loader/:slug', async function(req, res) {
  try {
    var mode = (req.query.mode as string) || 'inline';
    var script = generateLightweightLoader(req.params.slug, mode);
    res.type('application/javascript').send(script);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Public: Performance tracking from embed ──────────────────────────────────

// POST /api/public/embed-perf — log performance metrics
publicExtendedRouter.post('/embed-perf', async function(req, res) {
  try {
    var { quiz_id, session_id, load_time_ms, ttfb_ms, fcp_ms, device_type, connection_type } = req.body;
    if (!quiz_id || !load_time_ms) return res.status(400).json({ error: 'quiz_id, load_time_ms required' });
    await logEmbedPerformance({
      quiz_id: quiz_id,
      session_id: session_id,
      load_time_ms: Number(load_time_ms),
      ttfb_ms: ttfb_ms ? Number(ttfb_ms) : undefined,
      fcp_ms: fcp_ms ? Number(fcp_ms) : undefined,
      device_type: device_type,
      connection_type: connection_type,
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
