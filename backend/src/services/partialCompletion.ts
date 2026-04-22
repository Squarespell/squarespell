/**
 * partialCompletion.ts — Progressive answer capture for abandoned sessions.
 *
 * Saves answers as they happen. If user abandons at Q5 of 8, we still have Q1-Q5.
 * Sessions auto-mark as 'abandoned' after 30 min inactivity (via cron).
 * When a lead submits, partial completion is marked 'converted'.
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

interface PartialUpdate {
  quiz_id: string;
  session_id: string;
  question_index: number;
  answer_data: any;
  total_questions: number;
  email?: string;
  name?: string;
  device_type?: string;
  language?: string;
}

// ── Upsert Partial Completion ────────────────────────────────────────────────

/**
 * Called on every question answer from the public quiz renderer.
 * Creates or updates the partial completion record.
 */
export async function upsertPartialCompletion(update: PartialUpdate): Promise<void> {
  try {
    // Check if session exists
    var { data: existing } = await supabase
      .from('partial_completions')
      .select('id, answers')
      .eq('quiz_id', update.quiz_id)
      .eq('session_id', update.session_id)
      .single();

    if (existing) {
      // Merge new answer into existing answers
      var answers = existing.answers || {};
      answers[String(update.question_index)] = update.answer_data;

      var updateObj: any = {
        answers: answers,
        last_question_index: update.question_index,
        last_activity_at: new Date().toISOString(),
      };
      if (update.email) updateObj.email = update.email;
      if (update.name) updateObj.name = update.name;

      await supabase
        .from('partial_completions')
        .update(updateObj)
        .eq('id', existing.id);
    } else {
      // Create new partial completion
      var initialAnswers: Record<string, any> = {};
      initialAnswers[String(update.question_index)] = update.answer_data;

      await supabase
        .from('partial_completions')
        .insert({
          quiz_id: update.quiz_id,
          session_id: update.session_id,
          answers: initialAnswers,
          last_question_index: update.question_index,
          total_questions: update.total_questions,
          email: update.email || null,
          name: update.name || null,
          device_type: update.device_type || null,
          language: update.language || 'en',
          status: 'in_progress',
        });
    }
  } catch (err: any) {
    log.info('[PartialCompletion] Upsert failed', { err: err?.message });
  }
}

/**
 * Mark a session as converted when the lead fully submits.
 * Called from the lead creation route.
 */
export async function markPartialAsConverted(quizId: string, sessionId: string, leadId: string): Promise<void> {
  try {
    await supabase
      .from('partial_completions')
      .update({
        status: 'converted',
        converted_lead_id: leadId,
        last_activity_at: new Date().toISOString(),
      })
      .eq('quiz_id', quizId)
      .eq('session_id', sessionId);
  } catch (err: any) {
    log.info('[PartialCompletion] Mark converted failed', { err: err?.message });
  }
}

/**
 * Get partial completions for a quiz (dashboard view).
 * Returns abandoned sessions with their partial answers.
 */
export async function getPartialCompletions(
  quizId: string,
  userId: string,
  status?: string,
  limit?: number,
  offset?: number
): Promise<{ data: any[]; total: number }> {
  // Verify ownership
  var { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('user_id', userId)
    .single();

  if (!quiz) return { data: [], total: 0 };

  var query = supabase
    .from('partial_completions')
    .select('*', { count: 'exact' })
    .eq('quiz_id', quizId)
    .order('last_activity_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (limit) query = query.limit(limit);
  if (offset) query = query.range(offset, offset + (limit || 50) - 1);

  var { data, count } = await query;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * Get aggregate stats for partial completions.
 */
export async function getPartialCompletionStats(quizId: string, userId: string): Promise<{
  total: number;
  in_progress: number;
  abandoned: number;
  converted: number;
  recovery_rate: number;
  avg_questions_before_abandon: number;
  emails_captured: number;
}> {
  var { data: quiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('user_id', userId)
    .single();

  if (!quiz) return {
    total: 0, in_progress: 0, abandoned: 0, converted: 0,
    recovery_rate: 0, avg_questions_before_abandon: 0, emails_captured: 0,
  };

  var { data: all } = await supabase
    .from('partial_completions')
    .select('status, last_question_index, total_questions, email')
    .eq('quiz_id', quizId);

  if (!all || all.length === 0) return {
    total: 0, in_progress: 0, abandoned: 0, converted: 0,
    recovery_rate: 0, avg_questions_before_abandon: 0, emails_captured: 0,
  };

  var total = all.length;
  var inProgress = 0;
  var abandoned = 0;
  var converted = 0;
  var emailsCaptured = 0;
  var abandonQuestionSum = 0;
  var abandonCount = 0;

  for (var i = 0; i < all.length; i++) {
    var row = all[i];
    if (row.status === 'in_progress') inProgress++;
    if (row.status === 'abandoned') {
      abandoned++;
      abandonQuestionSum += (row.last_question_index || 0);
      abandonCount++;
    }
    if (row.status === 'converted') converted++;
    if (row.email) emailsCaptured++;
  }

  var recoveryRate = (abandoned + converted) > 0
    ? Math.round((converted / (abandoned + converted)) * 100)
    : 0;

  var avgQuestionsBeforeAbandon = abandonCount > 0
    ? Math.round(abandonQuestionSum / abandonCount * 10) / 10
    : 0;

  return {
    total: total,
    in_progress: inProgress,
    abandoned: abandoned,
    converted: converted,
    recovery_rate: recoveryRate,
    avg_questions_before_abandon: avgQuestionsBeforeAbandon,
    emails_captured: emailsCaptured,
  };
}

/**
 * Cron: Mark stale sessions as abandoned (called every 30 min).
 */
export async function markStaleSessionsAbandoned(staleMinutes?: number): Promise<number> {
  try {
    var { data } = await supabase.rpc('mark_abandoned_sessions', {
      stale_minutes: staleMinutes || 30,
    });
    var affected = typeof data === 'number' ? data : 0;
    if (affected > 0) {
      log.info('[PartialCompletion] Marked ' + affected + ' sessions as abandoned');
    }
    return affected;
  } catch (err: any) {
    log.info('[PartialCompletion] Cron failed', { err: err?.message });
    return 0;
  }
}
