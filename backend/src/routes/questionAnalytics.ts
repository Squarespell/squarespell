/**
 * questionAnalytics.ts — Routes for per-question drop-off analytics.
 *
 * Public endpoint: POST /api/public/quiz-events (called from quiz renderer)
 * Private endpoints: GET /api/analytics/:quizId/funnel, /api/analytics/:quizId/question/:index/distribution
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';
import {
  trackQuestionEvent,
  trackQuestionEventsBatch,
  getDropOffFunnel,
  getQuestionAnswerDistribution,
} from '../services/questionAnalytics';
import type { QuestionEvent } from '../services/questionAnalytics';

export var questionAnalyticsRouter = Router();
export var publicQuestionEventsRouter = Router();

// ── PUBLIC: Quiz renderer sends events here ──────────────────────────────────

// POST /api/public/quiz-events — single event
publicQuestionEventsRouter.post('/quiz-events', async function(req, res) {
  try {
    var { quiz_id, session_id, question_index, event_type, answer_data, time_spent_ms, device_type, language } = req.body;
    if (!quiz_id || !session_id || question_index === undefined || !event_type) {
      return res.status(400).json({ error: 'quiz_id, session_id, question_index, event_type required' });
    }

    var validTypes = ['view', 'answer', 'skip', 'back'];
    if (!validTypes.includes(event_type)) {
      return res.status(400).json({ error: 'event_type must be one of: ' + validTypes.join(', ') });
    }

    await trackQuestionEvent({
      quiz_id: quiz_id,
      session_id: session_id,
      question_index: Number(question_index),
      event_type: event_type,
      answer_data: answer_data,
      time_spent_ms: time_spent_ms ? Number(time_spent_ms) : undefined,
      device_type: device_type,
      language: language,
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/quiz-events/batch — batch events (for buffered sends)
publicQuestionEventsRouter.post('/quiz-events/batch', async function(req, res) {
  try {
    var { events } = req.body;
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }
    if (events.length > 50) {
      return res.status(400).json({ error: 'max 50 events per batch' });
    }

    var mapped: QuestionEvent[] = events.map(function(e: any) {
      return {
        quiz_id: e.quiz_id,
        session_id: e.session_id,
        question_index: Number(e.question_index),
        event_type: e.event_type,
        answer_data: e.answer_data,
        time_spent_ms: e.time_spent_ms ? Number(e.time_spent_ms) : undefined,
        device_type: e.device_type,
        language: e.language,
      };
    });

    await trackQuestionEventsBatch(mapped);
    res.json({ ok: true, count: mapped.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PRIVATE: Dashboard analytics endpoints ───────────────────────────────────

// GET /api/analytics/:quizId/funnel — full drop-off funnel
questionAnalyticsRouter.get('/:quizId/funnel', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    // Verify quiz ownership
    var { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', req.params.quizId)
      .eq('user_id', req.userId)
      .single();

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var dateFrom = req.query.from as string | undefined;
    var dateTo = req.query.to as string | undefined;

    var funnel = await getDropOffFunnel(req.params.quizId, dateFrom, dateTo);
    res.json(funnel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/:quizId/question/:index/distribution — answer distribution for one question
questionAnalyticsRouter.get('/:quizId/question/:index/distribution', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', req.params.quizId)
      .eq('user_id', req.userId)
      .single();

    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    var result = await getQuestionAnswerDistribution(req.params.quizId, parseInt(req.params.index));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
