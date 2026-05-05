import { log } from '../lib/logger';
import { Router } from 'express';
import { supabase } from '../db/supabaseClient';
import { trackEngagementEvent } from '../services/leadScoring';

const r = Router();

// Resend webhook: delivered, opened, clicked, bounced, complained
// This route is mounted publicly (no auth) so Resend can POST to it.
// Docs: https://resend.com/docs/dashboard/webhooks/introduction
r.post('/resend', async (req, res) => {
  try {
    const e = req.body;
    const sendId = e?.data?.headers?.['X-Send-Id'];
    const type = (e?.type || '').replace('email.', '');
    if (!sendId || !type) return res.json({ ok: true });

    // Deduplication: Resend can deliver the same webhook multiple times.
    // Check if we already processed this exact event (same send_id + type + timestamp).
    const occurredAt = e?.created_at || new Date().toISOString();
    const { data: existing } = await supabase.from('email_events')
      .select('id')
      .eq('send_id', sendId)
      .eq('type', type)
      .eq('occurred_at', occurredAt)
      .limit(1)
      .maybeSingle();
    if (existing) {
      // Already processed this event — skip to avoid duplicate side effects
      return res.json({ ok: true });
    }

    // 1. Store event in email_events for analytics
    await supabase.from('email_events').insert({
      send_id: sendId,
      type,
      meta: e,
      occurred_at: occurredAt,
    });

    // 2. Update email_sends status based on event type
    const statusMap: Record<string, string> = {
      delivered: 'delivered',
      bounced: 'bounced',
      complained: 'complained',
    };
    const newStatus = statusMap[type];
    if (newStatus) {
      await supabase.from('email_sends')
        .update({ status: newStatus })
        .eq('id', sendId);
    }

    // 3. Track first open and first click timestamps
    if (type === 'opened') {
      const { data: send } = await supabase.from('email_sends')
        .select('id').eq('id', sendId).is('opened_at', null).maybeSingle();
      if (send) {
        await supabase.from('email_sends')
          .update({ opened_at: e?.created_at || new Date().toISOString() })
          .eq('id', sendId);
      }
    }

    if (type === 'clicked') {
      const { data: send } = await supabase.from('email_sends')
        .select('id').eq('id', sendId).is('clicked_at', null).maybeSingle();
      if (send) {
        await supabase.from('email_sends')
          .update({ clicked_at: e?.created_at || new Date().toISOString() })
          .eq('id', sendId);
      }
    }

    // 4a. Feed engagement events into lead scoring system
    if (type === 'opened' || type === 'clicked' || type === 'delivered') {
      try {
        const { data: sendRow } = await supabase.from('email_sends')
          .select('to_email, tenant_id, campaign_id')
          .eq('id', sendId).single();
        if (sendRow?.to_email && sendRow?.tenant_id) {
          // Look up the lead by email + tenant
          const { data: lead } = await supabase.from('leads')
            .select('id')
            .eq('email', sendRow.to_email)
            .eq('user_id', sendRow.tenant_id)
            .limit(1).maybeSingle();
          if (lead) {
            var eventType: 'email_sent' | 'email_opened' | 'email_clicked' =
              type === 'opened' ? 'email_opened'
              : type === 'clicked' ? 'email_clicked'
              : 'email_sent';
            await trackEngagementEvent(
              lead.id,
              sendRow.tenant_id,
              eventType,
              sendRow.campaign_id || undefined,
            );
          }
        }
      } catch (engErr: any) {
        log.error('[Webhook] Lead scoring update failed (non-critical)', { err: engErr.message });
      }
    }

    // 4b. Classify bounces and auto-suppress hard bounces + complaints
    if (type === 'bounced') {
      const recipientEmail = e?.data?.to?.[0] || e?.data?.email_id;
      // Resend bounce payloads include bounce_type or error codes
      const bounceMessage = (e?.data?.bounce?.message || e?.data?.error?.message || '').toLowerCase();
      const bounceType = e?.data?.bounce?.type || '';

      // Classify: hard bounce = permanent failure, soft bounce = temporary
      const hardPatterns = /invalid|not exist|unknown user|no such|mailbox not found|rejected|undeliverable|disabled|permanent|hard/i;
      const isHard = bounceType === 'hard'
        || bounceType === 'permanent'
        || hardPatterns.test(bounceMessage)
        || (!bounceType && !bounceMessage); // Default to hard if no details

      const bounceClass = isHard ? 'hard_bounce' : 'soft_bounce';

      // Update email_sends with bounce classification
      await supabase.from('email_sends')
        .update({ status: 'bounced', metadata: { bounce_type: bounceClass, bounce_message: bounceMessage || null } })
        .eq('id', sendId);

      if (recipientEmail) {
        if (isHard) {
          // Only suppress on hard bounces
          await supabase.from('email_unsubscribes')
            .upsert({ email: recipientEmail, source: 'hard_bounce' }, { onConflict: 'email' })
            .select();
          log.info(`[Webhook] Hard bounce - suppressed ${recipientEmail}`);
        } else {
          log.info(`[Webhook] Soft bounce for ${recipientEmail} - not suppressing`);
        }
      }
    }

    if (type === 'complained') {
      const recipientEmail = e?.data?.to?.[0] || e?.data?.email_id;
      if (recipientEmail) {
        await supabase.from('email_unsubscribes')
          .upsert({ email: recipientEmail, source: 'spam_complaint' }, { onConflict: 'email' })
          .select();
        log.info(`[Webhook] Spam complaint - suppressed ${recipientEmail}`);
      }
    }

    res.json({ ok: true });
  } catch (err: any) {
    log.error('[Webhook] Resend error:', { err: err.message });
    // Always return 200 to Resend so it does not retry forever
    res.json({ ok: true });
  }
});

export default r;
