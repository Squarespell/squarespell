import { log } from '../lib/logger';
import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { supabase } from '../db/supabaseClient';
import { sendPlatformEmail } from '../services/platformEmails';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[ClerkWebhook] CLERK_WEBHOOK_SECRET not set, rejecting');
    return res.status(503).json({ error: 'Webhook not configured' });
  }
  let evt: any;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(req.body, {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    });
  } catch (e: any) {
    log.warn('[ClerkWebhook] verify failed:', { detail: e?.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }
  try {
    if (evt?.type === 'user.created') {
      var clerkId = evt.data.id;
      var emailAddr = evt.data.email_addresses?.[0]?.email_address || '';
      var fName = evt.data.first_name || '';
      var { data: upserted } = await supabase.from('users').upsert(
        { clerk_user_id: clerkId, email: emailAddr, plan: 'free' },
        { onConflict: 'clerk_user_id' },
      ).select('id').single();

      // Fire welcome email asynchronously — don't block the webhook response
      if (upserted && emailAddr) {
        sendPlatformEmail({
          userId: upserted.id,
          email: emailAddr,
          emailType: 'welcome',
          firstName: fName,
        }).catch(function(err) {
          log.error('[ClerkWebhook] Welcome email failed:', { err: err?.message });
        });
      }
    }
    res.json({ received: true });
  } catch (e: any) {
    log.error('[ClerkWebhook] handler error:', { err: e?.message });
    res.status(500).json({ error: 'Handler failed' });
  }
});

export default router;
