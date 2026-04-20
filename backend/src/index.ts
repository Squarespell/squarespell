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
import { generateRouter, publicQuizRouter, leadsRouter, analyticsRouter, scrapeBrandRouter, userRouter, stripeRouter, cronRouter, trialReminderRouter, integrationsRouter, previewRouter } from './routes/allRoutes';
import emailsRouter from './routes/emails';
import resendWebhookRouter from './routes/resendWebhook';
import unsubscribeRouter from './routes/unsubscribe';
import clerkWebhookRoute from './routes/clerkWebhook';
import { log } from './lib/logger';
import { requestLogger } from './middleware/requestLogger';

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
app.use('/api/webhooks', resendWebhookRouter);
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

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
  }
});
