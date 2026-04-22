/**
 * questionAnalytics.ts — Per-question drop-off analytics engine.
 *
 * Tracks: question views, answers, skips, back-navigation, time per question.
 * Produces: drop-off funnel, question-level engagement metrics, device breakdown.
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuestionEvent {
  quiz_id: string;
  session_id: string;
  question_index: number;
  event_type: 'view' | 'answer' | 'skip' | 'back';
  answer_data?: any;
  time_spent_ms?: number;
  device_type?: string;
  language?: string;
}

interface DropOffStep {
  question_index: number;
  question_text: string;
  views: number;
  answers: number;
  skips: number;
  drop_off_rate: number;       // % who viewed but didn't answer
  avg_time_ms: number;
  back_count: number;
}

interface QuestionFunnelResult {
  quiz_id: string;
  total_sessions: number;
  completed_sessions: number;
  overall_completion_rate: number;
  steps: DropOffStep[];
  device_breakdown: { mobile: number; desktop: number; tablet: number };
}

// ── Event Tracking ───────���───────────────────────────────────────────────────

/**
 * Record a question-level event. Called from the public quiz renderer.
 */
export async function trackQuestionEvent(event: QuestionEvent): Promise<void> {
  try {
    await supabase.from('quiz_question_events').insert({
      quiz_id: event.quiz_id,
      session_id: event.session_id,
      question_index: event.question_index,
      event_type: event.event_type,
      answer_data: event.answer_data || null,
      time_spent_ms: event.time_spent_ms || null,
      device_type: event.device_type || null,
      language: event.language || 'en',
    });
  } catch (err: any) {
    log.info('[QuestionAnalytics] Track event failed', { err: err?.message });
  }
}

/**
 * Batch insert multiple events (for clients that buffer).
 */
export async function trackQuestionEventsBatch(events: QuestionEvent[]): Promise<void> {
  if (!events || events.length === 0) return;
  try {
    var rows = events.map(function(e) {
      return {
        quiz_id: e.quiz_id,
        session_id: e.session_id,
        question_index: e.question_index,
        event_type: e.event_type,
        answer_data: e.answer_data || null,
        time_spent_ms: e.time_spent_ms || null,
        device_type: e.device_type || null,
        language: e.language || 'en',
      };
    });
    await supabase.from('quiz_question_events').insert(rows);
  } catch (err: any) {
    log.info('[QuestionAnalytics] Batch track failed', { err: err?.message });
  }
}

// ── Funnel Analysis ─────���────────────────────────────────────────────────────

/**
 * Build complete drop-off funnel for a quiz.
 * Returns per-question metrics showing exactly where users abandon.
 */
export async function getDropOffFunnel(
  quizId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<QuestionFunnelResult> {
  // Fetch quiz for question text
  var { data: quiz } = await supabase
    .from('quizzes')
    .select('questions')
    .eq('id', quizId)
    .single();

  var questions = (quiz?.questions || []) as any[];

  // Build date filters
  var query = supabase
    .from('quiz_question_events')
    .select('session_id, question_index, event_type, time_spent_ms, device_type')
    .eq('quiz_id', quizId);

  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);

  var { data: events } = await query;
  if (!events || events.length === 0) {
    return {
      quiz_id: quizId,
      total_sessions: 0,
      completed_sessions: 0,
      overall_completion_rate: 0,
      steps: [],
      device_breakdown: { mobile: 0, desktop: 0, tablet: 0 },
    };
  }

  // Aggregate by question_index
  var sessionSet = new Set<string>();
  var deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
  var sessionDevices = new Map<string, string>();

  // Per-question accumulators
  var stepMap = new Map<number, {
    views: Set<string>;
    answers: Set<string>;
    skips: Set<string>;
    backs: number;
    totalTimeMs: number;
    timeCount: number;
  }>();

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    sessionSet.add(ev.session_id);

    // Track device per session (first event wins)
    if (!sessionDevices.has(ev.session_id) && ev.device_type) {
      sessionDevices.set(ev.session_id, ev.device_type);
    }

    var qi = ev.question_index;
    if (!stepMap.has(qi)) {
      stepMap.set(qi, {
        views: new Set(),
        answers: new Set(),
        skips: new Set(),
        backs: 0,
        totalTimeMs: 0,
        timeCount: 0,
      });
    }
    var step = stepMap.get(qi)!;

    switch (ev.event_type) {
      case 'view':
        step.views.add(ev.session_id);
        break;
      case 'answer':
        step.answers.add(ev.session_id);
        if (ev.time_spent_ms) {
          step.totalTimeMs += ev.time_spent_ms;
          step.timeCount++;
        }
        break;
      case 'skip':
        step.skips.add(ev.session_id);
        break;
      case 'back':
        step.backs++;
        break;
    }
  }

  // Count devices
  sessionDevices.forEach(function(device) {
    if (device === 'mobile') deviceCounts.mobile++;
    else if (device === 'tablet') deviceCounts.tablet++;
    else deviceCounts.desktop++;
  });

  // Build steps array
  var totalSessions = sessionSet.size;
  var maxQuestionIndex = Math.max.apply(null, Array.from(stepMap.keys()));
  var steps: DropOffStep[] = [];

  // Find completed sessions (those who answered the last question)
  var lastStep = stepMap.get(maxQuestionIndex);
  var completedSessions = lastStep ? lastStep.answers.size : 0;

  for (var q = 0; q <= maxQuestionIndex; q++) {
    var s = stepMap.get(q);
    var questionText = questions[q]?.text || 'Question ' + (q + 1);

    if (!s) {
      steps.push({
        question_index: q,
        question_text: questionText,
        views: 0,
        answers: 0,
        skips: 0,
        drop_off_rate: 100,
        avg_time_ms: 0,
        back_count: 0,
      });
      continue;
    }

    var views = s.views.size;
    var answers = s.answers.size;
    var dropOffRate = views > 0 ? Math.round(((views - answers) / views) * 100) : 0;
    var avgTime = s.timeCount > 0 ? Math.round(s.totalTimeMs / s.timeCount) : 0;

    steps.push({
      question_index: q,
      question_text: questionText,
      views: views,
      answers: answers,
      skips: s.skips.size,
      drop_off_rate: dropOffRate,
      avg_time_ms: avgTime,
      back_count: s.backs,
    });
  }

  return {
    quiz_id: quizId,
    total_sessions: totalSessions,
    completed_sessions: completedSessions,
    overall_completion_rate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    steps: steps,
    device_breakdown: deviceCounts,
  };
}

/**
 * Get question-level answer distribution for a specific question.
 */
export async function getQuestionAnswerDistribution(quizId: string, questionIndex: number) {
  var { data: events } = await supabase
    .from('quiz_question_events')
    .select('answer_data, session_id')
    .eq('quiz_id', quizId)
    .eq('question_index', questionIndex)
    .eq('event_type', 'answer');

  if (!events || events.length === 0) return { total: 0, distribution: [] };

  // Count unique sessions per answer option
  var optionCounts = new Map<string, Set<string>>();

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var key = ev.answer_data?.option_index !== undefined
      ? String(ev.answer_data.option_index)
      : 'other';
    if (!optionCounts.has(key)) optionCounts.set(key, new Set());
    optionCounts.get(key)!.add(ev.session_id);
  }

  var total = new Set(events.map(function(e) { return e.session_id; })).size;
  var distribution: any[] = [];

  optionCounts.forEach(function(sessions, optionKey) {
    distribution.push({
      option_index: optionKey === 'other' ? null : parseInt(optionKey),
      count: sessions.size,
      percentage: total > 0 ? Math.round((sessions.size / total) * 100) : 0,
    });
  });

  distribution.sort(function(a, b) { return b.count - a.count; });

  return { total: total, distribution: distribution };
}

export type { QuestionEvent, QuestionFunnelResult, DropOffStep };
