import { Router } from 'express';
import { supabase } from '../db/supabaseClient';

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

    // 1. Store event in email_events for analytics
    await supabase.from('email_events').insert({
      send_id: sendId,
      type,
      meta: e,
      occurred_at: e?.created_at || new Date().toISOString(),
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

    // 4. Classify bounces and auto-suppress hard bounces + complaints
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
          console.log(`[Webhook] Hard bounce - suppressed ${recipientEmail}`);
        } else {
          console.log(`[Webhook] Soft bounce for ${recipientEmail} - not suppressing`);
        }
      }
    }

    if (type === 'complained') {
      const recipientEmail = e?.data?.to?.[0] || e?.data?.email_id;
      if (recipientEmail) {
        await supabase.from('email_unsubscribes')
          .upsert({ email: recipientEmail, source: 'spam_complaint' }, { onConflict: 'email' })
          .select();
        console.log(`[Webhook] Spam complaint - suppressed ${recipientEmail}`);
      }
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Webhook] Resend error:', err.message);
    // Always return 200 to Resend so it does not retry forever
    res.json({ ok: true });
  }
});

export default r;
