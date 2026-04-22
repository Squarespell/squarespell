/**
 * automationEngine.ts — Internal Email Automation Engine
 *
 * Replaces Zapier triggers + Mailchimp/Klaviyo automation.
 * Processes automation rules when events fire:
 * - lead_created: new lead submitted
 * - tag_added: tag assigned to lead
 * - segment_entered: lead matches segment for first time
 * - quiz_completed: lead completes specific quiz
 *
 * Actions:
 * - send_email: send a single email using internal templates
 * - add_tag: apply a tag to the lead
 * - start_sequence: enqueue an email sequence
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import { Resend } from 'resend';
import { buildUnsubscribeUrl, buildUnsubscribeHeaders, isUnsubscribed } from './unsubscribe';
import { applyMergeTags, buildMergeContextFromData } from './mergeTags';
import { assignTag } from './segmentation';
import { enqueueSequenceEmails } from './emailSequence';

var resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
var APP_URL = process.env.APP_URL || 'https://app.squarespell.com';

// ── Types ────────────────────────────────────────────────────────────────────

interface TriggerConfig {
  type: 'lead_created' | 'tag_added' | 'segment_entered' | 'quiz_completed';
  quiz_id?: string;
  tag_id?: string;
  segment_id?: string;
}

interface ActionConfig {
  type: 'send_email' | 'add_tag' | 'start_sequence';
  // For send_email:
  email_subject?: string;
  email_body?: string;
  email_cta_url?: string;
  email_cta_text?: string;
  // For add_tag:
  tag_id?: string;
  // For start_sequence:
  sequence_id?: string;
}

interface AutomationRule {
  id: string;
  user_id: string;
  trigger_config: TriggerConfig;
  action_config: ActionConfig;
  delay_minutes: number;
  enabled: boolean;
}

interface EventPayload {
  event_type: 'lead_created' | 'tag_added' | 'segment_entered' | 'quiz_completed';
  lead_id: string;
  user_id: string;
  quiz_id?: string;
  tag_id?: string;
  segment_id?: string;
  lead_email?: string;
  lead_name?: string;
  outcome_id?: string;
  score?: number | null;
  answers?: Record<string, any>;
}

// ── Answer-Aware Merge Tags ──────────────────────────────────────────────────

/**
 * Extend merge tags with answer data for personalized emails.
 * Available tags:
 *   {{lead.name}}, {{lead.email}}, {{lead.score}}, {{lead.outcome}}
 *   {{answer.0}}, {{answer.1}}, ... (answer text for each question index)
 *   {{quiz.title}}, {{quiz.slug}}
 */
function buildAnswerAwareMergeTags(
  leadData: any,
  quizData: any,
  answers: Record<string, any>
): Record<string, string> {
  var tags: Record<string, string> = {};

  // Lead fields
  tags['lead.name'] = leadData?.name || '';
  tags['lead.email'] = leadData?.email || '';
  tags['lead.score'] = String(leadData?.score ?? '');
  tags['lead.score_label'] = leadData?.lead_score_label || '';

  // Outcome
  if (leadData?.outcome_id && quizData?.outcomes) {
    var outcome = (quizData.outcomes as any[]).find(function(o: any) {
      return o.id === leadData.outcome_id;
    });
    tags['lead.outcome'] = outcome?.title || '';
    tags['lead.outcome_description'] = outcome?.description || '';
  }

  // Quiz fields
  tags['quiz.title'] = quizData?.title || '';
  tags['quiz.slug'] = quizData?.slug || '';

  // Answer fields — map question index to selected option text
  if (answers && quizData?.questions) {
    var questions = quizData.questions as any[];
    Object.keys(answers).forEach(function(qi) {
      var qIndex = parseInt(qi);
      var question = questions[qIndex];
      if (!question) return;

      var answerValue = answers[qi];
      var optionIndex = typeof answerValue === 'object' ? answerValue?.option_index : answerValue;
      var option = question.options?.[optionIndex];

      tags['answer.' + qi] = option?.text || String(answerValue);
      tags['question.' + qi] = question.text || '';
    });
  }

  return tags;
}

/**
 * Apply merge tags to a string.
 */
function replaceMergeTags(template: string, tags: Record<string, string>): string {
  var result = template;
  Object.keys(tags).forEach(function(key) {
    var regex = new RegExp('\\{\\{' + key.replace('.', '\\.') + '\\}\\}', 'g');
    result = result.replace(regex, tags[key]);
  });
  return result;
}

// ── Action Executors ─────────────────────────────────────────────────────────

async function executeSendEmail(
  rule: AutomationRule,
  payload: EventPayload,
  mergeTags: Record<string, string>
): Promise<void> {
  var action = rule.action_config;
  if (!action.email_subject || !action.email_body) return;
  if (!payload.lead_email) return;

  // Check unsubscribe
  var unsubscribed = await isUnsubscribed(payload.lead_email);
  if (unsubscribed) {
    log.info('[Automation] Skipping email - unsubscribed', { email: payload.lead_email });
    return;
  }

  if (!resend) {
    log.info('[Automation] No Resend key configured');
    return;
  }

  var subject = replaceMergeTags(action.email_subject, mergeTags);
  var body = replaceMergeTags(action.email_body, mergeTags);
  var ctaHtml = '';
  if (action.email_cta_url && action.email_cta_text) {
    var ctaUrl = replaceMergeTags(action.email_cta_url, mergeTags);
    ctaHtml = '<a href="' + ctaUrl + '" style="display:inline-block;margin-top:16px;background:#0D7377;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">' + action.email_cta_text + '</a>';
  }

  var unsubUrl = buildUnsubscribeUrl(payload.lead_email);

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Squarespell <hello@squarespell.com>',
    to: payload.lead_email,
    subject: subject,
    html: '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">' +
      body + ctaHtml +
      '<p style="margin-top:32px;font-size:12px;color:#888"><a href="' + unsubUrl + '" style="color:#888">Unsubscribe</a></p></div>',
    headers: buildUnsubscribeHeaders(payload.lead_email),
  });
}

async function executeAddTag(rule: AutomationRule, payload: EventPayload): Promise<void> {
  var tagId = rule.action_config.tag_id;
  if (!tagId) return;
  await assignTag(payload.lead_id, tagId, 'automation');
}

async function executeStartSequence(rule: AutomationRule, payload: EventPayload): Promise<void> {
  var sequenceId = rule.action_config.sequence_id;
  if (!sequenceId) return;
  // Find sequence and enqueue
  var { data: seq } = await supabase
    .from('email_sequences')
    .select('quiz_id, outcome_id')
    .eq('id', sequenceId)
    .single();
  if (seq) {
    await enqueueSequenceEmails(
      payload.lead_id,
      seq.quiz_id,
      payload.outcome_id || seq.outcome_id,
      payload.score ?? null,
      [],
      null
    );
  }
}

// ── Core Engine ──────────────────────────────────────────────────────────────

/**
 * Process an event against all automation rules for a user.
 * Called after: lead creation, tag assignment, etc.
 */
export async function processAutomationEvent(payload: EventPayload): Promise<void> {
  try {
    // Fetch all enabled rules for this user
    var { data: rules } = await supabase
      .from('email_automation_rules')
      .select('*')
      .eq('user_id', payload.user_id)
      .eq('enabled', true);

    if (!rules || rules.length === 0) return;

    // Match rules against event
    var matchingRules = rules.filter(function(rule: any) {
      var trigger = rule.trigger_config as TriggerConfig;
      if (trigger.type !== payload.event_type) return false;
      if (trigger.quiz_id && trigger.quiz_id !== payload.quiz_id) return false;
      if (trigger.tag_id && trigger.tag_id !== payload.tag_id) return false;
      if (trigger.segment_id && trigger.segment_id !== payload.segment_id) return false;
      return true;
    });

    if (matchingRules.length === 0) return;

    // Fetch lead + quiz data for merge tags
    var { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', payload.lead_id)
      .single();

    var quizData: any = null;
    if (payload.quiz_id) {
      var { data: qd } = await supabase
        .from('quizzes')
        .select('title, slug, questions, outcomes')
        .eq('id', payload.quiz_id)
        .single();
      quizData = qd;
    }

    var mergeTags = buildAnswerAwareMergeTags(
      leadData,
      quizData,
      payload.answers || leadData?.answers || {}
    );

    // Execute each matching rule
    for (var i = 0; i < matchingRules.length; i++) {
      var rule = matchingRules[i] as AutomationRule;
      var status = 'success';
      var errorMsg: string | null = null;

      try {
        // Handle delay (schedule for later if delay > 0)
        if (rule.delay_minutes > 0) {
          // For delayed actions, we store in the email queue with future send_at
          // For now, execute immediately (delay support via cron in future iteration)
          log.info('[Automation] Delay not yet implemented, executing immediately', {
            ruleId: rule.id,
            delayMinutes: rule.delay_minutes,
          });
        }

        switch (rule.action_config.type) {
          case 'send_email':
            await executeSendEmail(rule, payload, mergeTags);
            break;
          case 'add_tag':
            await executeAddTag(rule, payload);
            break;
          case 'start_sequence':
            await executeStartSequence(rule, payload);
            break;
          default:
            status = 'skipped';
            errorMsg = 'Unknown action type: ' + rule.action_config.type;
        }
      } catch (execErr: any) {
        status = 'failed';
        errorMsg = execErr?.message || 'Unknown error';
      }

      // Log execution
      await supabase.from('automation_execution_log').insert({
        rule_id: rule.id,
        lead_id: payload.lead_id,
        status: status,
        error_message: errorMsg,
      });

      // Update rule stats
      await supabase
        .from('email_automation_rules')
        .update({
          last_fired_at: new Date().toISOString(),
          fire_count: (rule as any).fire_count + 1,
        })
        .eq('id', rule.id);
    }

    log.info('[Automation] Processed ' + matchingRules.length + ' rules for event', {
      event: payload.event_type,
      leadId: payload.lead_id,
    });
  } catch (err: any) {
    log.info('[Automation] Engine error', { err: err?.message });
  }
}
