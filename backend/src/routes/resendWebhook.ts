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

    // 4. Auto-suppress on hard bounce or spam complaint
    if (type === 'bounced' || type === 'complained') {
      const recipientEmail = e?.data?.to?.[0] || e?.data?.email_id;
      if (recipientEmail) {
        const source = type === 'bounced' ? 'hard_bounce' : 'spam_complaint';
        await supabase.from('email_unsubscribes')
          .upsert({ email: recipientEmail, source }, { onConflict: 'email' })
          .select();
        console.log(`[Webhook] Auto-suppressed ${recipientEmail} (${source})`);
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
