import { log } from '../lib/logger';
import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { supabase } from '../db/supabaseClient';

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
      const { id, email_addresses } = evt.data;
      await supabase.from('users').upsert(
        { clerk_user_id: id, email: email_addresses?.[0]?.email_address ?? '', plan: 'free' },
        { onConflict: 'clerk_user_id' },
      );
    }
    res.json({ received: true });
  } catch (e: any) {
    log.error('[ClerkWebhook] handler error:', { err: e?.message });
    res.status(500).json({ error: 'Handler failed' });
  }
});

export default router;
