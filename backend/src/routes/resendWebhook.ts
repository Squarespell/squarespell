import { log } from '../lib/logger';
import { Router } from 'express';
import { supabase } from '../db/supabaseClient';
import { trackEngagementEvent } from '../services/leadScoring';
import { suppressEmail } from '../services/unsubscribe';
import { Webhook } from 'svix';

const r = Router();

/** First recipient address of the event; a message id (no '@') is never treated as an address. */
function firstAddress(e: any): string | null {
  const a = e?.data?.to?.[0];
  return typeof a === 'string' && a.includes('@') ? a : null;
}

// Resend webhook: delivered, opened, clicked, bounced, complained
// This route is mounted publicly (no auth) so Resend can POST to it.
// Docs: https://resend.com/docs/dashboard/webhooks/introduction
r.post('/resend', async (req, res) => {
  // Authenticate: Resend signs webhooks with Svix. Without this, anyone could POST fabricated bounce/complaint events.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    log.error('[Webhook] RESEND_WEBHOOK_SECRET is not configured; refusing Resend events');
    return res.status(503).json({ error: 'Webhook not configured', code: 'webhook_not_configured' });
  }
  let e: any;
  try {
    e = new Webhook(secret).verify(req.body, {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    });
  } catch {
    return res.status(400).json({ error: 'Invalid signature', code: 'invalid_signature' });
  }
  try {
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
      const recipientEmail = firstAddress(e);
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
          const { error: supErr } = await suppressEmail(recipientEmail, 'hard_bounce');
          if (supErr) log.error('[Webhook] could not suppress hard bounce', { err: supErr.message });
          else log.info('[Webhook] Hard bounce - suppressed', { email: recipientEmail });
        } else {
          log.info(`[Webhook] Soft bounce for ${recipientEmail} - not suppressing`);
        }
      }
    }

    if (type === 'complained') {
      const recipientEmail = firstAddress(e);
      if (recipientEmail) {
        const { error: supErr } = await suppressEmail(recipientEmail, 'spam_complaint');
        if (supErr) log.error('[Webhook] could not suppress complaint', { err: supErr.message });
        else log.info('[Webhook] Spam complaint - suppressed', { email: recipientEmail });
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
