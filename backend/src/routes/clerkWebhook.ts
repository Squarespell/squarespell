import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { supabase } from '../db/supabaseClient';
const router = Router();
router.post('/webhook', async (req: Request, res: Response) => {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: any;
  try {
    evt = wh.verify(req.body, { 'svix-id': req.headers['svix-id'] as string, 'svix-timestamp': req.headers['svix-timestamp'] as string, 'svix-signature': req.headers['svix-signature'] as string });
  } catch { return res.status(400).json({ error: 'Invalid signature' }); }
  if (evt.type === 'user.created') {
    const { id, email_addresses } = evt.data;
    await supabase.from('users').upsert({ clerk_user_id: id, email: email_addresses?.[0]?.email_address ?? '', plan: 'free' }, { onConflict: 'clerk_user_id' });
  }
  res.json({ received: true });
});
export default router;
