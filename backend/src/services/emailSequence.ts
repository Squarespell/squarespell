import { supabase } from '../db/supabaseClient';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
      console.log(`[EmailSequence] No sequences found for quiz ${quizId}`);
      return;
    }

    let totalEnqueued = 0;

    // Check each sequence to see if it matches this lead's conditions
    for (const sequence of sequences) {
      if (!matchesConditions(sequence, outcomeId, score, segments, quizMode)) {
        console.log(`[EmailSequence] Lead ${leadId} does not match sequence "${sequence.name}"`);
        continue;
      }

      const emails = sequence.emails as EmailInSequence[];
      if (!Array.isArray(emails) || emails.length === 0) {
        console.log(`[EmailSequence] Sequence "${sequence.name}" is empty, skipping`);
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
        console.error(`[EmailSequence] Failed to enqueue sequence "${sequence.name}": ${insertError.message}`);
        continue;
      }

      totalEnqueued += queueEntries.length;
      console.log(`[EmailSequence] Enqueued ${queueEntries.length} emails from sequence "${sequence.name}" for lead ${leadId}`);
    }

    if (totalEnqueued === 0) {
      console.log(`[EmailSequence] No matching sequences for lead ${leadId}`);
    }
  } catch (err: any) {
    console.error('[EmailSequence] Error enqueueing sequences:', err.message);
  }
}

/**
 * Process pending emails in the queue
 * Called by cron job (e.g., every 5 minutes)
 */
export async function processEmailQueue(): Promise<{ processed: number; failed: number }> {
  if (!resend) {
    console.warn('[EmailSequence] Resend not configured, skipping');
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
          quiz_id
        )
        `
      )
      .eq('status', 'pending')
      .lte('send_at', now.toISOString())
      .limit(100);

    if (queryError) {
      console.error('[EmailSequence] Query error:', queryError.message);
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
          console.warn(`[EmailSequence] Invalid email config or lead for queue item ${item.id}`);
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

        // Get quiz info for branding
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('title, branding')
          .eq('id', leadData.quiz_id)
          .single();

        const primaryColor = (quiz?.branding as any)?.colors?.primary || '#D2FF1D';
        const siteName = (quiz?.branding as any)?.site_name || 'Squarespell Quiz';

        // Build HTML email body
        let htmlBody = emailConfig.body;

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
          ? `<a href="${emailConfig.cta_url}" style="display:inline-block;padding:14px 32px;background:#0a0f05;color:#fff;border-radius:24px;text-decoration:none;font-weight:600;font-size:16px">${
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

        // Send email via Resend
        await resend.emails.send({
          from: `${siteName} <results@squarespell.com>`,
          to: leadData.email,
          subject: emailConfig.subject,
          html: htmlBody,
        });

        // Mark as sent
        await supabase
          .from('email_sequence_queue')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        console.log(`[EmailSequence] Sent email ${item.email_index + 1} to ${leadData.email}`);
        processed++;
      } catch (err: any) {
        console.error(`[EmailSequence] Failed to send email for queue item ${item.id}:`, err.message);

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

    console.log(`[EmailSequence] Processed: ${processed}, Failed: ${failed}`);
    return { processed, failed };
  } catch (err: any) {
    console.error('[EmailSequence] Processing error:', err.message);
    return { processed: 0, failed: 0 };
  }
}
