import { log } from '../lib/logger';
import { Router } from 'express';
import { supabase } from '../db/supabaseClient';

const r = Router();

const APP_URL = process.env.FRONTEND_URL || 'https://app.squarespell.com';

/** Escape HTML entities to prevent XSS */
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * GET /api/public/unsubscribe?token=<base64>
 * Renders a simple HTML confirmation page (no frontend needed).
 * token = base64(JSON.stringify({ email, quiz_id? }))
 */
r.get('/unsubscribe', async (req, res) => {
  const token = req.query.token as string;
  const emailParam = req.query.email as string;

  let email = '';
  let quizId: string | null = null;

  // Support both token-based and plain email param (legacy)
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
      email = decoded.email || '';
      quizId = decoded.quiz_id || null;
    } catch {
      email = '';
    }
  } else if (emailParam) {
    email = emailParam;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).send(buildPage('Invalid Link', 'This unsubscribe link is invalid or expired.', false));
  }

  // Check current status
  const { data: existing } = await supabase
    .from('email_unsubscribes')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existing) {
    return res.send(buildPage('Already Unsubscribed', `<strong>${escHtml(email)}</strong> is already unsubscribed. You will not receive any more emails from us.`, false));
  }

  // Show confirmation form
  const formAction = `${process.env.BACKEND_URL || process.env.API_URL || 'https://squarespell-api.onrender.com'}/api/public/unsubscribe`;
  res.send(buildPage('Unsubscribe', `
    <p>Unsubscribe <strong>${escHtml(email)}</strong> from all Squarespell emails?</p>
    <form method="POST" action="${escHtml(formAction)}">
      <input type="hidden" name="email" value="${escHtml(email)}" />
      ${quizId ? `<input type="hidden" name="quiz_id" value="${escHtml(quizId)}" />` : ''}
      <button type="submit" style="display:inline-block;margin-top:16px;padding:14px 32px;background:#D2FF1D;color:#07090c;border:none;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer;">Confirm Unsubscribe</button>
    </form>
  `, true));
});

/**
 * POST /api/public/unsubscribe
 * Handles form submission and RFC 8058 one-click (List-Unsubscribe-Post).
 * Accepts both form-urlencoded and JSON.
 */
r.post('/unsubscribe', async (req, res) => {
  // RFC 8058 one-click sends List-Unsubscribe=One-Click in body
  const isOneClick = req.body?.['List-Unsubscribe'] === 'One-Click';

  let email = '';
  let quizId: string | null = null;

  if (isOneClick) {
    // One-click: email is in query param token
    const token = req.query.token as string;
    const emailParam = req.query.email as string;
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
        email = decoded.email || '';
        quizId = decoded.quiz_id || null;
      } catch {
        // fall through
      }
    } else if (emailParam) {
      email = emailParam;
    }
  } else {
    email = req.body?.email || '';
    quizId = req.body?.quiz_id || null;
  }

  if (!email) {
    return res.status(400).send(buildPage('Error', 'Missing email address.', false));
  }

  const normalized = email.trim().toLowerCase();

  // Upsert into unsubscribes table
  const { error } = await supabase
    .from('email_unsubscribes')
    .upsert(
      { email: normalized, quiz_id: quizId || null, source: isOneClick ? 'one_click' : 'web' },
      { onConflict: 'email' }
    );

  if (error) {
    log.error('[Unsubscribe] DB error:', { err: error.message });
    return res.status(500).send(buildPage('Error', 'Something went wrong. Please try again.', false));
  }

  log.info('[Unsubscribe] User unsubscribed', { email: normalized, method: isOneClick ? 'one-click' : 'web form' });

  // For one-click (mail client), return 200 with no body
  if (isOneClick) {
    return res.status(200).end();
  }

  // For web form, show confirmation
  res.send(buildPage('Unsubscribed', `
    <p><strong>${escHtml(normalized)}</strong> has been unsubscribed.</p>
    <p style="color:#888;margin-top:12px;">You will no longer receive emails from Squarespell quizzes. This may take up to 24 hours to take full effect.</p>
  `, false));
});

/**
 * GET /api/public/unsubscribe/status?email=<email>
 * Check if an email is unsubscribed (used by frontend preference page).
 */
r.get('/unsubscribe/status', async (req, res) => {
  const email = ((req.query.email as string) || '').trim().toLowerCase();
  if (!email) return res.json({ unsubscribed: false });

  const { data } = await supabase
    .from('email_unsubscribes')
    .select('id, created_at')
    .eq('email', email)
    .maybeSingle();

  res.json({ unsubscribed: !!data, since: data?.created_at || null });
});

/**
 * POST /api/public/resubscribe
 * Allow users to resubscribe from the preference page.
 */
r.post('/resubscribe', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email required' });

  const { error } = await supabase
    .from('email_unsubscribes')
    .delete()
    .eq('email', email);

  if (error) {
    log.error('[Resubscribe] DB error:', { err: error.message });
    return res.status(500).json({ error: 'Failed to resubscribe' });
  }

  log.info(`[Resubscribe] ${email} resubscribed`);
  res.json({ ok: true });
});

/** Build a simple branded HTML page for unsubscribe flow */
function buildPage(title: string, body: string, showForm: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} - Squarespell</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #07090c; color: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #0f1219; border-radius: 16px; padding: 48px 40px; max-width: 480px; width: 100%; text-align: center; }
    .logo { color: #D2FF1D; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; font-weight: 700; }
    h1 { font-size: 24px; margin-bottom: 16px; color: #f0f2f5; }
    p { color: #a0a0b0; font-size: 15px; line-height: 1.6; }
    strong { color: #f0f2f5; }
    a { color: #D2FF1D; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1a1f2e; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Squarespell</div>
    <h1>${title}</h1>
    <div>${body}</div>
    <div class="footer">
      <a href="https://squarespell.com">squarespell.com</a>
    </div>
  </div>
</body>
</html>`;
}

export default r;
