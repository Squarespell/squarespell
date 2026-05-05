import 'dotenv/config';
import * as Sentry from '@sentry/node';

// Sentry must be initialized before other imports to catch all errors.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    // Filter out health check transactions to reduce noise
    beforeSendTransaction(event) {
      if (event.transaction === 'GET /health' || event.transaction === 'GET /api/health') {
        return null;
      }
      return event;
    },
  });
}

import publicReportRouter from './routes/publicReport';
import express from 'express';
import cors from 'cors';
import quizRoutes from './routes/quiz';
import quizzesFromUrlRoutes from './routes/quizzesFromUrl';
import { generateRouter, publicQuizRouter, leadsRouter, analyticsRouter, scrapeBrandRouter, userRouter, stripeRouter, cronRouter, trialReminderRouter, integrationsRouter, previewRouter, mediaRouter, referralsRouter, publicReferralRouter, whiteLabelRouter, publicWhiteLabelRouter, adminAnalyticsRouter } from './routes/allRoutes';
import emailsRouter from './routes/emails';
import resendWebhookRouter from './routes/resendWebhook';
import { segmentationRouter } from './routes/segmentation';
import { questionAnalyticsRouter, publicQuestionEventsRouter } from './routes/questionAnalytics';
import { publicPartialRouter, partialAnalyticsRouter } from './routes/partialCompletion';
import { automationRouter } from './routes/automation';
import { aiEmailRouter } from './routes/aiEmails';
import { translationsRouter, publicTranslationsRouter } from './routes/translations';
import { richResultsRouter, publicRichResultsRouter } from './routes/richResults';
import { commerceRouter } from './routes/commerce';
import { gdprRouter, publicGdprRouter } from './routes/gdpr';
import { extendedFeaturesRouter, publicExtendedRouter } from './routes/extendedFeatures';
import unsubscribeRouter from './routes/unsubscribe';
import clerkWebhookRoute from './routes/clerkWebhook';
import { log } from './lib/logger';
import { requestLogger } from './middleware/requestLogger';
import { requireAuth, attachUser } from './middleware/auth';
import { supabase } from './db/supabaseClient';

const app = express();
const PORT = process.env.PORT || 3001;

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/clerk/webhook', express.raw({ type: 'application/json' }));

/* ------------------------------------------------------------------ */
/* CORS                                                                */
/* ------------------------------------------------------------------ */
//
// Squarespell now serves the same Next.js app from multiple subdomains:
//   app.squarespell.com    - authenticated dashboard
//   quiz.squarespell.com   - public /try flow + embed.js
//   squarespell.com        - marketing site (root + www)
//
// CORS_ORIGINS env var (comma-separated) is the canonical allowlist.
// FRONTEND_URL is preserved for backward compatibility with the old
// single-origin setup. Anything not on the list is rejected.
//
// Public endpoints (preview-generate, claim-quiz, public quiz fetch)
// remain wildcard so they can be called from any embedded site, but the
// previous middleware ordering bug (the restrictive CORS overwriting the
// wildcard headers) is fixed by routing them through a single dispatcher.

const DEFAULT_ALLOWED_ORIGINS = [
  'https://app.squarespell.com',
  'https://quiz.squarespell.com',
  'https://squarespell.com',
  'https://www.squarespell.com',
];

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const legacyOrigin = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];

const ALLOWED_ORIGINS = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins, ...legacyOrigin]),
);

const PUBLIC_PATH_PREFIXES = [
  '/api/preview-generate',
  '/api/preview-analyze',
  '/api/claim-quiz',
  '/api/quiz',
  '/api/save-preview',
  '/api/scrape-brand',
  '/api/public/unsubscribe',
  '/api/public/resubscribe',
  '/api/public/white-label',
  '/api/webhooks',
  '/api/emails/unsplash',
];

const restrictedCors = cors({
  origin: (origin, callback) => {
    // Server-to-server / curl / health checks have no Origin header.
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
});

const publicCors = cors({
  origin: '*',
  credentials: false,
});

app.use((req, res, next) => {
  const isPublic = PUBLIC_PATH_PREFIXES.some((p) => req.path.startsWith(p));
  if (isPublic) return publicCors(req, res, next);
  return restrictedCors(req, res, next);
});

app.use(express.urlencoded({ extended: true }));
app.use('/api/media', express.json({ limit: '25mb' }));
app.use(express.json());
app.use(requestLogger);

// Public preview endpoint (no auth, rate-limited)  -  registered BEFORE auth routes
app.use('/api', previewRouter);

app.use('/api/public', publicReportRouter);
app.use('/api/public', unsubscribeRouter);
app.use('/api/quizzes', quizzesFromUrlRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api', generateRouter);
app.use('/api', leadsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api', scrapeBrandRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/clerk', clerkWebhookRoute);
app.use('/api/quiz', publicQuizRouter);
app.use('/api/user', userRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/cron', cronRouter);
app.use('/api/cron', trialReminderRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/webhooks', resendWebhookRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/public/referral', publicReferralRouter);
app.use('/api/white-label', whiteLabelRouter);
app.use('/api/public/white-label', publicWhiteLabelRouter);
app.use('/api/admin', adminAnalyticsRouter);
app.use('/api', segmentationRouter);
app.use('/api/analytics', questionAnalyticsRouter);
app.use('/api/public', publicQuestionEventsRouter);
app.use('/api/public', publicPartialRouter);
app.use('/api/analytics', partialAnalyticsRouter);
app.use('/api/automations', automationRouter);
app.use('/api/ai-emails', aiEmailRouter);
app.use('/api/quizzes', translationsRouter);
app.use('/api/public', publicTranslationsRouter);
app.use('/api/quizzes', richResultsRouter);
app.use('/api/public', publicRichResultsRouter);
app.use('/api/commerce', commerceRouter);
app.use('/api/gdpr', gdprRouter);
app.use('/api/public', publicGdprRouter);
app.use('/api', extendedFeaturesRouter);
app.use('/api/public', publicExtendedRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Dashboard activity feed — returns recent leads + emails as activity items
app.get('/api/dashboard/activity', requireAuth, attachUser, async (req: any, res) => {
  try {
    const userId = req.dbUserId;
    if (!userId) return res.json([]);
    const activities: any[] = [];
    // Recent leads (last 5)
    const { data: recentLeads } = await supabase.from('leads')
      .select('id, email, name, created_at, quiz_id')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
    for (const l of recentLeads || []) {
      activities.push({
        id: 'lead-' + l.id,
        type: 'lead',
        title: 'New lead captured',
        description: (l.name || l.email || 'Anonymous') + ' completed a quiz',
        time: l.created_at,
      });
    }
    // Recent email sends (last 3)
    const { data: recentSends } = await supabase.from('email_sends')
      .select('id, to_email, status, created_at, campaign_id')
      .eq('tenant_id', userId).order('created_at', { ascending: false }).limit(3);
    for (const s of recentSends || []) {
      activities.push({
        id: 'email-' + s.id,
        type: 'integration',
        title: 'Email ' + (s.status === 'delivered' ? 'delivered' : s.status === 'sent' ? 'sent' : s.status),
        description: 'To ' + s.to_email,
        time: s.created_at,
      });
    }
    // Sort by time descending
    activities.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());
    res.json(activities.slice(0, 8));
  } catch (e: any) {
    res.json([]);
  }
});

// Sentry error handler must be registered after all routes
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.listen(PORT, () => {
  log.info('Backend running', { port: Number(PORT) });

  // Keep-alive self-ping to prevent Render cold starts.
  // Pings /health every 5 minutes. Only runs when RENDER_EXTERNAL_URL is set
  // (i.e. on Render, not local dev).
  var externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL;
  if (externalUrl) {
    var KEEP_ALIVE_MS = 5 * 60 * 1000; // 5 minutes
    setInterval(function() {
      fetch(externalUrl + '/health')
        .then(function() { /* healthy */ })
        .catch(function() { /* swallow errors */ });
    }, KEEP_ALIVE_MS);
    log.info('Keep-alive enabled', { url: externalUrl + '/health', intervalMs: KEEP_ALIVE_MS });

    // Weekly digest - runs every Monday at ~9 AM UTC via an interval check.
    // On each tick (every 30 min), check if it's Monday 9:00-9:29 UTC and
    // if digest hasn't been sent today. If so, trigger the digest endpoint.
    var DIGEST_CHECK_MS = 30 * 60 * 1000; // 30 minutes
    var lastDigestDate = '';
    setInterval(function() {
      var now = new Date();
      var day = now.getUTCDay(); // 0=Sun, 1=Mon
      var hour = now.getUTCHours();
      var dateStr = now.toISOString().slice(0, 10);
      if (day === 1 && hour === 9 && lastDigestDate !== dateStr) {
        lastDigestDate = dateStr;
        log.info('[Cron] Triggering weekly digest');
        var cronSecret = process.env.CRON_SECRET || '';
        fetch(externalUrl + '/cron/weekly-digest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-cron-secret': cronSecret },
        })
          .then(function(r) { return r.json(); })
          .then(function(data) { log.info('[Cron] Weekly digest result', { detail: JSON.stringify(data) }); })
          .catch(function(err) { log.error('[Cron] Weekly digest trigger failed', { err: String(err) }); });
      }
    }, DIGEST_CHECK_MS);
    log.info('Weekly digest scheduler enabled (Mon 9AM UTC)');

    // Preview cache cleanup — run every 30 minutes alongside the digest check
    setInterval(function() {
      var cronSecret = process.env.CRON_SECRET || '';
      fetch(externalUrl + '/cron/cleanup-preview-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': cronSecret },
      })
        .then(function(r) { return r.json(); })
        .then(function(data: any) { if (data.deleted > 0) log.info('[Cron] Preview cache cleanup: ' + data.deleted + ' removed'); })
        .catch(function() { /* silent — non-critical cleanup */ });
    }, DIGEST_CHECK_MS);
    log.info('Preview cache cleanup scheduler enabled (every 30 min)');
  }
});
