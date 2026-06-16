/**
 * gdpr.ts — API routes for GDPR compliance.
 */

import { Router } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import {
  recordConsent, getConsentHistory, exportUserData,
  initiateDeletionRequest, confirmAndExecuteDeletion,
  getCookieConsentConfig,
} from '../services/gdprCompliance';
import { deletionLimiter, safeLimit } from '../services/rateLimiter';

export var gdprRouter = Router();
export var publicGdprRouter = Router();

// ── Private: Quiz owner endpoints ───────────────────────────────────────��────

// GET /api/gdpr/consent/:email — consent history for a lead
gdprRouter.get('/consent/:email', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var history = await getConsentHistory(req.params.email);
    res.json(history);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/gdpr/export/:email — export all data for a lead (right to access)
gdprRouter.get('/export/:email', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var data = await exportUserData(req.params.email, req.userId!);
    res.json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/gdpr/delete-request — initiate deletion for a lead
gdprRouter.post('/delete-request', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    var { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    var result = await initiateDeletionRequest(email, req.userId!);
    res.json({ request_id: result.request_id, message: 'Deletion request created. Confirm to execute.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/gdpr/confirm-delete — confirm and execute deletion
gdprRouter.post('/confirm-delete', requireAuth, attachUser, async function(req: AuthenticatedRequest, res) {
  try {
    // Rate limit: 5 confirm attempts per hour per user to prevent token brute-force
    var { success: allowed } = await safeLimit(deletionLimiter, req.userId!);
    if (!allowed) return res.status(429).json({ error: 'Too many requests. Try again later.' });

    var { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    // Pass userId so service can verify ownership of the deletion request
    var result = await confirmAndExecuteDeletion(token, req.userId!);
    if (!result.success) return res.status(404).json({ error: 'Invalid or expired token' });
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── Public: Embed / lead-facing endpoints ────────────────────────────────────

// POST /api/public/consent — record consent from quiz embed
publicGdprRouter.post('/consent', async function(req, res) {
  try {
    var { email, quiz_id, consent_type, consent_given, consent_text } = req.body;
    if (!email || !consent_type) return res.status(400).json({ error: 'email, consent_type required' });

    await recordConsent({
      email: email,
      quiz_id: quiz_id,
      consent_type: consent_type,
      consent_given: consent_given !== false,
      consent_text: consent_text,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/public/cookie-consent/:quizId — get cookie consent config for embed
publicGdprRouter.get('/cookie-consent/:quizId', async function(req, res) {
  try {
    var config = await getCookieConsentConfig(req.params.quizId);
    res.json(config);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
