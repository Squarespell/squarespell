import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import { Resend } from 'resend';
import { buildUnsubscribeUrl, buildUnsubscribeHeaders, isUnsubscribed, canSpamFooterHtml } from './unsubscribe';
import { applyMergeTags, buildMergeContextFromData } from './mergeTags';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function appendUtm(url: string, campaign: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'squarespell');
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'email');
    if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', campaign || 'sequence');
    return u.toString();
  } catch { return url; }
}


interface EmailInSequence {
  delay_days: number;
  subject: string;
  body: string;
  cta_url?: string;
  cta_text?: string;
}

interface SequenceConditions {
  outcome_ids?: string[];
  score_min?: number | null;
  score_max?: number | null;
  segments?: string[];
  mode?: string | null;
}

/**
 * Check if a lead matches a sequence's conditions
 */
export function matchesConditions(
  sequence: any,
  outcomeId: string | null,
  score: number | null,
  segments: string[] = [],
  quizMode: string | null = null
): boolean {
  const conditions = sequence.conditions as SequenceConditions || {};

  // Empty conditions object means match all leads (backward compatible)
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  // Check outcome_ids condition
  if (conditions.outcome_ids && conditions.outcome_ids.length > 0) {
    if (!outcomeId || !conditions.outcome_ids.includes(outcomeId)) {
      return false;
    }
  }

  // Check score_min condition
  if (conditions.score_min !== null && conditions.score_min !== undefined) {
    if (score === null || score === undefined || score < conditions.score_min) {
      return false;
    }
  }

  // Check score_max condition
  if (conditions.score_max !== null && conditions.score_max !== undefined) {
    if (score === null || score === undefined || score > conditions.score_max) {
      return false;
    }
  }

  // Check segments condition
  if (conditions.segments && conditions.segments.length > 0) {
    const hasMatchingSegment = conditions.segments.some(seg => segments.includes(seg));
    if (!hasMatchingSegment) {
      return false;
    }
  }

  // Check mode condition
  if (conditions.mode) {
    if (quizMode !== conditions.mode) {
      return false;
    }
  }

  return true;
}

/**
 * Enqueue email sequences for a lead after they submit the quiz
 * Called after a lead is saved with their outcome_id, score, etc.
 *
 * @param leadId - The lead's ID
 * @param quizId - The quiz's ID
 * @param outcomeId - The matched outcome ID (can be null)
 * @param score - The calculated score (can be null)
 * @param segments - Array of segment tags the lead belongs to
 * @param quizMode - The quiz mode (lead_quiz, price_calculator, etc.)
 */
export async function enqueueSequenceEmails(
  leadId: string,
  quizId: string,
  outcomeId: string | null,
  score: number | null = null,
  segments: string[] = [],
  quizMode: string | null = null
): Promise<void> {
  try {
    // Get all enabled email sequences for this quiz
    const { data: sequences, error: sequenceError } = await supabase
      .from('email_sequences')
      .select('id, emails, conditions, name')
      .eq('quiz_id', quizId)
      .eq('enabled', true);

    if (sequenceError || !sequences || sequences.length === 0) {
      log.info(`[EmailSequence] No sequences found for quiz ${quizId}`);
      return;
    }

    let totalEnqueued = 0;

    // Check each sequence to see if it matches this lead's conditions
    for (const sequence of sequences) {
      if (!matchesConditions(sequence, outcomeId, score, segments, quizMode)) {
        log.info(`[EmailSequence] Lead ${leadId} does not match sequence "${sequence.name}"`);
        continue;
      }

      const emails = sequence.emails as EmailInSequence[];
      if (!Array.isArray(emails) || emails.length === 0) {
        log.info(`[EmailSequence] Sequence "${sequence.name}" is empty, skipping`);
        continue;
      }

      // Create queue entries for each email in the sequence
      const queueEntries = emails.map((email, index) => {
        const sendAt = new Date();
        sendAt.setDate(sendAt.getDate() + email.delay_days);
        return {
          lead_id: leadId,
          sequence_id: sequence.id,
          email_index: index,
          send_at: sendAt.toISOString(),
          status: 'pending',
        };
      });

      const { error: insertError } = await supabase
        .from('email_sequence_queue')
        .insert(queueEntries);

      if (insertError) {
        log.error(`[EmailSequence] Failed to enqueue sequence "${sequence.name}": ${insertError.message}`);
        continue;
      }

      totalEnqueued += queueEntries.length;
      log.info(`[EmailSequence] Enqueued ${queueEntries.length} emails from sequence "${sequence.name}" for lead ${leadId}`);
    }

    if (totalEnqueued === 0) {
      log.info(`[EmailSequence] No matching sequences for lead ${leadId}`);
    }
  } catch (err: any) {
    log.error('[EmailSequence] Error enqueueing sequences:', { err: err.message });
  }
}

/**
 * Process pending emails in the queue
 * Called by cron job (e.g., every 5 minutes)
 */
export async function processEmailQueue(): Promise<{ processed: number; failed: number }> {
  if (!resend) {
    log.warn('[EmailSequence] Resend not configured, skipping');
    return { processed: 0, failed: 0 };
  }

  try {
    // Find all pending emails where send_at <= now
    const now = new Date();
    const { data: queueItems, error: queryError } = await supabase
      .from('email_sequence_queue')
      .select(
        `
        id,
        lead_id,
        sequence_id,
        email_index,
        email_sequences!inner(
          id,
          quiz_id,
          emails
        ),
        leads!inner(
          id,
          email,
          name,
          quiz_id,
          answers,
          outcome_id,
          score
        )
        `
      )
      .eq('status', 'pending')
      .lte('send_at', now.toISOString())
      .limit(100);

    if (queryError) {
      log.error('[EmailSequence] Query error:', { err: queryError.message });
      return { processed: 0, failed: 0 };
    }

    if (!queueItems || queueItems.length === 0) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        const sequenceData = (item as any).email_sequences;
        const leadData = (item as any).leads;
        const emails = sequenceData?.emails as EmailInSequence[];
        const emailConfig = emails?.[item.email_index];

        if (!emailConfig || !leadData?.email) {
          log.warn(`[EmailSequence] Invalid email config or lead for queue item ${item.id}`);
          // Mark as failed if we can't find config
          await supabase
            .from('email_sequence_queue')
            .update({
              status: 'failed',
              error_message: 'Missing email configuration or lead email',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
          failed++;
          continue;
        }

        // Check if recipient has unsubscribed
        if (await isUnsubscribed(leadData.email)) {
          log.info(`[EmailSequence] Skipping ${leadData.email} - unsubscribed`);
          await supabase
            .from('email_sequence_queue')
            .update({ status: 'skipped', error_message: 'Recipient unsubscribed', updated_at: new Date().toISOString() })
            .eq('id', item.id);
          continue;
        }

        // Get quiz info for branding (fall back to user-level brand kit)
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('title, slug, questions, outcomes, branding, user_id')
          .eq('id', leadData.quiz_id)
          .single();

        let effectiveBranding = quiz?.branding as Record<string, any> | null;
        if (!effectiveBranding?.colors?.primary && quiz?.user_id) {
          const { data: owner } = await supabase
            .from('users')
            .select('brand_kit')
            .eq('id', quiz.user_id)
            .single();
          if (owner?.brand_kit) {
            effectiveBranding = { ...owner.brand_kit, ...(effectiveBranding || {}) };
          }
        }

        const primaryColor = (effectiveBranding as any)?.colors?.primary || '#D2FF1D';
        const siteName = (effectiveBranding as any)?.site_name || 'Squarespell Quiz';

        // Resolve merge tags ({{outcome_name}}, {{answer:q1}}, etc.)
        const mergeCtx = buildMergeContextFromData(
          {
            email: leadData.email,
            name: leadData.name,
            answers: leadData.answers,
            outcome_id: leadData.outcome_id,
            score: leadData.score,
          },
          {
            title: quiz?.title,
            slug: (quiz as any)?.slug,
            questions: quiz?.questions as any[],
            outcomes: quiz?.outcomes as any[],
            branding: effectiveBranding as Record<string, any>,
          },
        );
        const resolvedSubject = applyMergeTags(emailConfig.subject, mergeCtx);

        // Build HTML email body
        let htmlBody = applyMergeTags(emailConfig.body, mergeCtx);

        // If body doesn't look like HTML, wrap it in basic styling
        if (!htmlBody.includes('<html') && !htmlBody.includes('<!DOCTYPE')) {
          htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;padding:40px 32px">
      <h1 style="font-size:24px;margin:0 0 24px;color:#1a1a1a">${quiz?.title || 'Quiz Update'}</h1>
      <div style="color:#333;font-size:16px;line-height:1.6;margin:0 0 24px">${emailConfig.body}</div>
      ${
        emailConfig.cta_url
          ? `<a href="${appendUtm(emailConfig.cta_url || '', 'sequence')}" style="display:inline-block;padding:14px 32px;background:#0a0f05;color:#fff;border-radius:24px;text-decoration:none;font-weight:600;font-size:16px">${
              emailConfig.cta_text || 'Learn More'
            }</a>`
          : ''
      }
    </div>
    <p style="text-align:center;font-size:12px;color:#999;margin:24px 0 0">Powered by Squarespell</p>
  </div>
</body>
</html>`;
        }

        // Add CAN-SPAM compliant footer with business address + unsubscribe
        const unsubFooter = canSpamFooterHtml(leadData.email, { quizId: leadData.quiz_id, siteName });
        // Inject before closing body tag, or append
        if (htmlBody.includes('</body>')) {
          htmlBody = htmlBody.replace('</body>', unsubFooter + '</body>');
        } else {
          htmlBody += unsubFooter;
        }

        // Send email via Resend
        const unsubHeaders = buildUnsubscribeHeaders(leadData.email, leadData.quiz_id);
        await resend.emails.send({
          from: `${siteName} <results@squarespell.com>`,
          to: leadData.email,
          subject: resolvedSubject,
          html: htmlBody,
          headers: unsubHeaders,
        });

        // Mark as sent
        await supabase
          .from('email_sequence_queue')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        log.info(`[EmailSequence] Sent email ${item.email_index + 1} to ${leadData.email}`);
        processed++;
      } catch (err: any) {
        log.error('[EmailSequence] Failed to send email for queue item ${item.id}:', { err: err.message });

        // Mark as failed with error message
        await supabase
          .from('email_sequence_queue')
          .update({
            status: 'failed',
            error_message: err.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        failed++;
      }
    }

    log.info(`[EmailSequence] Processed: ${processed}, Failed: ${failed}`);
    return { processed, failed };
  } catch (err: any) {
    log.error('[EmailSequence] Processing error:', { err: err.message });
    return { processed: 0, failed: 0 };
  }
}
