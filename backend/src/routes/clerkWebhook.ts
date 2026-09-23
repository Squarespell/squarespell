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
// A 'pending' row younger than this is treated as an active in-flight attempt (most likely a
// concurrent/overlapping webhook delivery) and is left alone rather than sent again. Older than
// this, it is assumed the process that reserved it crashed before finishing, and is reclaimed.
var PENDING_STALE_MS = 2 * 60 * 1000;

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
    return handleEmailCreated(evt, req.headers['svix-id'] as string | undefined, res);
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

/** Known-safe Resend error slugs / our own labels only — never the raw error message, which could echo the payload. */
function sanitizeFailureCategory(code: any): string {
  var s = typeof code === 'string' ? code : '';
  return /^[a-z0-9_]{1,64}$/i.test(s) ? s : 'unknown';
}

async function loadOrReserveDeliveryRow(emailId: string, clerkEventId: string | undefined, slug: string, idempotencyKey: string) {
  var { data: inserted, error: insErr } = await supabase
    .from('clerk_email_deliveries')
    .insert({
      clerk_email_id: emailId,
      clerk_event_id: clerkEventId || null,
      slug,
      resend_idempotency_key: idempotencyKey,
      status: 'pending',
      attempt_count: 1,
    })
    .select('*')
    .single();
  if (inserted) return { row: inserted, fresh: true };

  if (insErr?.code === '23505') {
    var { data: existing } = await supabase.from('clerk_email_deliveries').select('*').eq('clerk_email_id', emailId).single();
    return { row: existing, fresh: false };
  }
  throw insErr;
}

/**
 * Self-delivers Clerk's "Delivered by Clerk" verification-code email via Resend, so staging
 * sign-up no longer depends on Clerk's shared, low-deliverability development sender.
 * Clerk pre-renders the email (the OTP is already baked into `data.body`) — this only relays
 * it, it never constructs the email itself, so the dashboard template stays the source of truth.
 * Gated by CLERK_SELF_DELIVERY_ENABLED (default off) so the branch can be deployed dark.
 *
 * Crash safety: every send carries a Resend idempotency key derived only from Clerk's own email
 * id (`clerk-verification/<id>`), so Resend itself deduplicates a retry that reaches it a second
 * time even if this process crashes between reserving the row and recording the result — the
 * retry gets Resend's cached result back instead of sending again. The `clerk_email_deliveries`
 * row tracks an explicit pending/accepted/failed state (not mere existence) so a crash before the
 * Resend call is also recoverable: a stale 'pending' row is reclaimed and retried, a 'failed' row
 * is retried, and an 'accepted' row short-circuits without ever calling Resend again.
 */
async function handleEmailCreated(evt: any, clerkEventId: string | undefined, res: Response) {
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

    // Deterministic per Clerk email id, never per attempt — this is what lets Resend's own
    // idempotency layer catch a duplicate send even if our DB bookkeeping below is itself
    // interrupted by a crash.
    var idempotencyKey = 'clerk-verification/' + emailId;

    var { row, fresh } = await loadOrReserveDeliveryRow(emailId, clerkEventId, d.slug, idempotencyKey);
    if (!row) {
      log.error('[ClerkWebhook] Failed to load or reserve delivery row', { emailId });
      return res.status(500).json({ error: 'Handler failed' });
    }

    if (!fresh) {
      if (row.status === 'accepted') {
        log.info('[ClerkWebhook] Duplicate email.created event ignored (already accepted)', { emailId });
        return res.json({ received: true, skipped: 'duplicate' });
      }

      if (row.status === 'pending') {
        var ageMs = Date.now() - new Date(row.updated_at).getTime();
        if (ageMs < PENDING_STALE_MS) {
          // Very likely a genuinely concurrent/overlapping delivery of the same event while the
          // original attempt is still in flight. Returning a non-2xx (rather than swallowing it
          // with a 200) keeps Svix's retry as the backstop: if the in-flight attempt then crashes,
          // a later retry will find this row stale and reclaim it instead of the email being lost.
          log.info('[ClerkWebhook] email.created still in flight, not sending again yet', { emailId, ageMs });
          return res.status(409).json({ error: 'In progress, retry later' });
        }
        // Stale: the process that reserved this row almost certainly crashed before finishing. Reclaim it.
        var { data: reclaimed } = await supabase
          .from('clerk_email_deliveries')
          .update({ attempt_count: row.attempt_count + 1, updated_at: new Date().toISOString() })
          .eq('id', row.id)
          .eq('status', 'pending')
          .select('*')
          .single();
        if (!reclaimed) {
          // Someone else moved it forward between our read and this write (e.g. to accepted).
          log.info('[ClerkWebhook] email.created resolved concurrently, nothing to do', { emailId });
          return res.json({ received: true, skipped: 'resolved_concurrently' });
        }
        row = reclaimed;
      } else if (row.status === 'failed') {
        var { data: retried } = await supabase
          .from('clerk_email_deliveries')
          .update({ status: 'pending', attempt_count: row.attempt_count + 1, updated_at: new Date().toISOString() })
          .eq('id', row.id)
          .select('*')
          .single();
        row = retried || row;
      }
    }

    try {
      var result = await resendProvider.send({ from: CLERK_EMAIL_FROM, to: toEmail, subject, html, idempotencyKey: row.resend_idempotency_key });
      await supabase.from('clerk_email_deliveries')
        .update({ status: 'accepted', resend_message_id: result.messageId, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      log.info('[ClerkWebhook] Self-delivered verification email', { emailId, slug: d.slug });
      return res.json({ received: true });
    } catch (sendErr: any) {
      var code = sendErr?.code;
      if (code === 'concurrent_idempotent_requests') {
        // Another request with this exact idempotency key is still being processed by Resend
        // itself. Leave the row pending (not failed) and ask for a retry once it resolves.
        await supabase.from('clerk_email_deliveries').update({ updated_at: new Date().toISOString() }).eq('id', row.id);
        log.info('[ClerkWebhook] Resend idempotency conflict, will retry', { emailId });
        return res.status(409).json({ error: 'Send in progress at Resend, retry later' });
      }
      await supabase.from('clerk_email_deliveries')
        .update({ status: 'failed', failure_category: sanitizeFailureCategory(code), updated_at: new Date().toISOString() })
        .eq('id', row.id);
      log.error('[ClerkWebhook] Resend send failed for self-delivered email', { emailId, err: sendErr?.message });
      return res.status(500).json({ error: 'Send failed' });
    }
  } catch (e: any) {
    log.error('[ClerkWebhook] email.created handler error', { err: e?.message });
    return res.status(500).json({ error: 'Handler failed' });
  }
}

export default router;
