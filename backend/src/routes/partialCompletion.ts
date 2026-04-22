/**
 * partialCompletion.ts — Routes for partial completion capture.
 *
 * Public: POST /api/public/quiz-progress (called from quiz renderer on each answer)
 * Private: GET /api/analytics/:quizId/partial-completions
 *          GET /api/analytics/:quizId/partial-stats
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import {
  upsertPartialCompletion,
  getPartialCompletions,
  getPartialCompletionStats,
} from '../services/partialCompletion';

export var publicPartialRouter = Router();
export var partialAnalyticsRouter = Router();

// ── PUBLIC: Quiz renderer reports progress here ──────────────────────────────

// POST /api/public/quiz-progress — save answer as it happens
publicPartialRouter.post('/quiz-progress', async function(req, res) {
  try {
    var { quiz_id, session_id, question_index, answer_data, total_questions, email, name, device_type, language } = req.body;
    if (!quiz_id || !session_id || question_index === undefined) {
      return res.status(400).json({ error: 'quiz_id, session_id, question_index required' });
    }

    await upsertPartialCompletion({
      quiz_id: quiz_id,
      session_id: session_id,
      question_index: Number(question_index),
      answer_data: answer_data,
      total_questions: Number(total_questions || 0),
      email: email,
      name: name,
      device_type: device_type,
      language: language,
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PRIVATE: Dashboard partial completion analytics ──────────────────────────

// GET /api/analytics/:quizId/partial-completions — list abandoned sessions
partialAnalyticsRouter.get('/:quizId/partial-completions', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var status = req.query.status as string | undefined;
    var limit = parseInt(req.query.limit as string) || 50;
    var offset = parseInt(req.query.offset as string) || 0;

    var result = await getPartialCompletions(
      req.params.quizId,
      req.userId!,
      status,
      limit,
      offset
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/:quizId/partial-stats — aggregate stats
partialAnalyticsRouter.get('/:quizId/partial-stats', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var stats = await getPartialCompletionStats(req.params.quizId, req.userId!);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
