/**
 * gdprCompliance.ts — GDPR compliance engine.
 *
 * Handles: consent recording, data export (right to access),
 * data deletion (right to be forgotten), cookie consent config.
 */

import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import crypto from 'crypto';

// ── Consent Recording ────────────────────────────────────────────────────────

export async function recordConsent(params: {
  lead_id?: string;
  email: string;
  quiz_id?: string;
  consent_type: 'email_marketing' | 'data_processing' | 'cookie';
  consent_given: boolean;
  consent_text?: string;
  ip_address?: string;
  user_agent?: string;
}): Promise<void> {
  try {
    await supabase.from('consent_records').insert({
      lead_id: params.lead_id || null,
      email: params.email,
      quiz_id: params.quiz_id || null,
      consent_type: params.consent_type,
      consent_given: params.consent_given,
      consent_text: params.consent_text || null,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
    });
  } catch (err: any) {
    log.info('[GDPR] Consent record failed', { err: err?.message });
  }
}

export async function getConsentHistory(email: string): Promise<any[]> {
  var { data } = await supabase
    .from('consent_records')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });
  return data || [];
}

// ── Data Export (Right to Access) ────────────────────────────────────────────

/**
 * Export ALL data held about an email address.
 * Returns structured JSON for the data subject.
 */
export async function exportUserData(email: string, quizOwnerId: string): Promise<{
  leads: any[];
  consent_records: any[];
  partial_completions: any[];
  tags: any[];
  email_sequences_sent: any[];
}> {
  // All leads for this email under this quiz owner
  var { data: leads } = await supabase
    .from('leads')
    .select('id, quiz_id, name, email, answers, outcome_id, score, language, created_at')
    .eq('email', email)
    .eq('user_id', quizOwnerId);

  // Consent records
  var { data: consents } = await supabase
    .from('consent_records')
    .select('consent_type, consent_given, consent_text, created_at')
    .eq('email', email);

  // Partial completions
  var { data: partials } = await supabase
    .from('partial_completions')
    .select('quiz_id, answers, last_question_index, email, status, started_at, last_activity_at')
    .eq('email', email);

  // Tags
  var leadIds = (leads || []).map(function(l) { return l.id; });
  var tags: any[] = [];
  if (leadIds.length > 0) {
    var { data: tagData } = await supabase
      .from('lead_tag_assignments')
      .select('lead_id, assigned_at, source, lead_tags(name)')
      .in('lead_id', leadIds);
    tags = tagData || [];
  }

  // Email sequence sends
  var { data: emailsSent } = await supabase
    .from('email_sequence_queue')
    .select('sequence_id, email_index, send_at, status, created_at')
    .in('lead_id', leadIds.length > 0 ? leadIds : ['none']);

  return {
    leads: leads || [],
    consent_records: consents || [],
    partial_completions: partials || [],
    tags: tags,
    email_sequences_sent: emailsSent || [],
  };
}

// ── Data Deletion (Right to be Forgotten) ────────────────────────────────────

/**
 * Initiate a data deletion request. Sends confirmation email.
 */
export async function initiateDeletionRequest(
  email: string,
  quizOwnerId: string
): Promise<{ token: string; request_id: string }> {
  var token = crypto.randomBytes(32).toString('hex');

  var { data, error } = await supabase
    .from('data_deletion_requests')
    .insert({
      email: email,
      user_id: quizOwnerId,
      confirmation_token: token,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) throw error || new Error('Failed to create deletion request');

  return { token: token, request_id: data.id };
}

/**
 * Confirm and execute data deletion.
 */
export async function confirmAndExecuteDeletion(token: string): Promise<{
  success: boolean;
  deleted_records: Record<string, number>;
}> {
  // Find pending request
  var { data: request } = await supabase
    .from('data_deletion_requests')
    .select('*')
    .eq('confirmation_token', token)
    .eq('status', 'pending')
    .single();

  if (!request) return { success: false, deleted_records: {} };

  var email = request.email;
  var userId = request.user_id;

  // Mark as processing
  await supabase
    .from('data_deletion_requests')
    .update({ status: 'processing', confirmed_at: new Date().toISOString() })
    .eq('id', request.id);

  var deleted: Record<string, number> = {};

  try {
    // Get lead IDs for cascade deletes
    var { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('user_id', userId);

    var leadIds = (leads || []).map(function(l) { return l.id; });

    // Delete tag assignments
    if (leadIds.length > 0) {
      var { count: tagCount } = await supabase
        .from('lead_tag_assignments')
        .delete({ count: 'exact' })
        .in('lead_id', leadIds);
      deleted.tag_assignments = tagCount || 0;

      // Delete email queue entries
      var { count: queueCount } = await supabase
        .from('email_sequence_queue')
        .delete({ count: 'exact' })
        .in('lead_id', leadIds);
      deleted.email_queue = queueCount || 0;

      // Delete custom field values
      var { count: fieldCount } = await supabase
        .from('lead_custom_field_values')
        .delete({ count: 'exact' })
        .in('lead_id', leadIds);
      deleted.custom_fields = fieldCount || 0;
    }

    // Delete leads
    var { count: leadCount } = await supabase
      .from('leads')
      .delete({ count: 'exact' })
      .eq('email', email)
      .eq('user_id', userId);
    deleted.leads = leadCount || 0;

    // Delete partial completions
    var { count: partialCount } = await supabase
      .from('partial_completions')
      .delete({ count: 'exact' })
      .eq('email', email);
    deleted.partial_completions = partialCount || 0;

    // Delete consent records
    var { count: consentCount } = await supabase
      .from('consent_records')
      .delete({ count: 'exact' })
      .eq('email', email);
    deleted.consent_records = consentCount || 0;

    // Mark completed
    await supabase
      .from('data_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        deleted_records: deleted,
      })
      .eq('id', request.id);

    log.info('[GDPR] Data deletion completed', { email, deleted });
    return { success: true, deleted_records: deleted };
  } catch (err: any) {
    log.info('[GDPR] Deletion error', { email, err: err?.message });
    await supabase
      .from('data_deletion_requests')
      .update({ status: 'pending' })
      .eq('id', request.id);
    return { success: false, deleted_records: deleted };
  }
}

// ── Cookie Consent Config ────────────────────────────────────────────────────

/**
 * Get cookie consent configuration for a quiz embed.
 * Returns settings the embed script uses to show/hide cookie banner.
 */
export async function getCookieConsentConfig(quizId: string): Promise<{
  enabled: boolean;
  banner_text: string;
  accept_text: string;
  decline_text: string;
  policy_url: string;
}> {
  var { data: quiz } = await supabase
    .from('quizzes')
    .select('settings')
    .eq('id', quizId)
    .single();

  var settings = (quiz?.settings || {}) as any;
  var cookie = settings.cookie_consent || {};

  return {
    enabled: cookie.enabled || false,
    banner_text: cookie.banner_text || 'This quiz uses cookies to improve your experience.',
    accept_text: cookie.accept_text || 'Accept',
    decline_text: cookie.decline_text || 'Decline',
    policy_url: cookie.policy_url || '',
  };
}
