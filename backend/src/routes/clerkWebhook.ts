import { log } from '../lib/logger';
import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { supabase } from '../db/supabaseClient';
import { sendPlatformEmail } from '../services/platformEmails';
import { resendProvider } from '../services/email/resendProvider';

const router = Router();

// Verified sender for Squarespell Quiz's own domain (see docs/relaunch/SQUARESPELL_PRODUCTION_READINESS.md).
var CLERK_EMAIL_FROM = process.env.CLERK_EMAIL_FROM || 'Squarespell Quiz <hello@mail.squarespellquiz.com>';
// Only the verification-code template is self-delivered. Every other Clerk email (magic link,
// invitation, etc.) keeps "Delivered by Clerk" on and is never sent here, even if this endpoint
// happens to receive its email.created event.
var SELF_DELIVERED_SLUG = 'verification_code';

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

  if (evt?.type === 'email.created') {
    return handleEmailCreated(evt, res);
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

/**
 * Self-delivers Clerk's "Delivered by Clerk" verification-code email via Resend, so staging
 * sign-up no longer depends on Clerk's shared, low-deliverability development sender.
 * Clerk pre-renders the email (the OTP is already baked into `data.body`) — this only relays
 * it, it never constructs the email itself, so the dashboard template stays the source of truth.
 * Gated by CLERK_SELF_DELIVERY_ENABLED (default off) so the branch can be deployed dark.
 */
async function handleEmailCreated(evt: any, res: Response) {
  try {
    if (process.env.CLERK_SELF_DELIVERY_ENABLED !== 'true') {
      return res.json({ received: true, skipped: 'self_delivery_disabled' });
    }

    var d = evt.data || {};
    if (d.slug !== SELF_DELIVERED_SLUG) {
      return res.json({ received: true, skipped: 'slug_not_self_delivered' });
    }

    var emailId = d.id;
    var toEmail = d.to_email_address;
    var subject = d.subject;
    var html = d.body;
    if (!emailId || !toEmail || !subject || !html) {
      log.warn('[ClerkWebhook] email.created missing required fields', { hasId: !!emailId });
      return res.status(400).json({ error: 'Malformed event' });
    }

    // Reserve the delivery slot before sending, keyed on Clerk's own email id. A concurrent
    // Svix retry hits the unique constraint below and skips instead of sending a second time.
    var { data: reserved, error: reserveErr } = await supabase
      .from('clerk_email_deliveries')
      .insert({ clerk_email_id: emailId, slug: d.slug, to_email: toEmail })
      .select('id')
      .single();

    if (reserveErr || !reserved) {
      if (reserveErr?.code === '23505') {
        log.info('[ClerkWebhook] Duplicate email.created event ignored', { emailId });
        return res.json({ received: true, skipped: 'duplicate' });
      }
      log.error('[ClerkWebhook] Failed to reserve delivery row', { emailId, err: reserveErr?.message });
      return res.status(500).json({ error: 'Handler failed' });
    }

    try {
      var result = await resendProvider.send({ from: CLERK_EMAIL_FROM, to: toEmail, subject, html });
      await supabase.from('clerk_email_deliveries').update({ resend_message_id: result.messageId }).eq('id', reserved.id);
      log.info('[ClerkWebhook] Self-delivered verification email', { emailId, slug: d.slug });
      return res.json({ received: true });
    } catch (sendErr: any) {
      // Release the reservation so the next Svix retry can attempt delivery again.
      await supabase.from('clerk_email_deliveries').delete().eq('id', reserved.id);
      log.error('[ClerkWebhook] Resend send failed for self-delivered email', { emailId, err: sendErr?.message });
      return res.status(500).json({ error: 'Send failed' });
    }
  } catch (e: any) {
    log.error('[ClerkWebhook] email.created handler error', { err: e?.message });
    return res.status(500).json({ error: 'Handler failed' });
  }
}

export default router;
