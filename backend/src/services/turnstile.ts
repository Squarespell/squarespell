// Server-side verification for Cloudflare Turnstile tokens. The frontend
// (QuizRunner.tsx) already renders the Turnstile widget and sends the
// resulting token as `cf_turnstile_response` on lead submission — but until
// now nothing on the backend actually verified that token, so it provided
// zero real protection (a bot could submit without ever loading the widget).
//
// Verification is a no-op (always "valid") when TURNSTILE_SECRET_KEY isn't
// configured, so this is safe to deploy before/without Cloudflare being set
// up, and won't break local dev or environments that don't use Turnstile.

import { log } from '../lib/logger';

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstileToken(token: unknown, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not configured — don't block submissions.

  if (!token || typeof token !== 'string') return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await resp.json()) as { success?: boolean };
    return data?.success === true;
  } catch (err) {
    log.error('[Turnstile] Verification request failed', { err });
    // Fail closed on verification errors so a Cloudflare outage doesn't
    // silently disable bot protection — but only once it's actually
    // configured (handled by the early return above otherwise).
    return false;
  }
}
