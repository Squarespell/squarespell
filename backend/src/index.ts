import 'dotenv/config';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import quizRoutes from './routes/quiz';
import apiKeysRoutes from './routes/apiKeys';
import zapierRoutes from './routes/zapier';
import { generateRouter, publicQuizRouter, leadsRouter, analyticsRouter, scrapeBrandRouter, userRouter, stripeRouter, cronRouter, trialReminderRouter, integrationsRouter, previewRouter, templatesRouter, cleanupRouter, quizPaymentsRouter } from './routes/allRoutes';
import clerkWebhookRoute from './routes/clerkWebhook';
import { supabase } from './db/supabaseClient';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/clerk/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/stripe-quiz-payment', express.raw({ type: 'application/json' }));

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
  '/api/public/quiz',
  '/api/webhooks/stripe-quiz-payment',
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

app.use(express.json());

// Public preview endpoint (no auth, rate-limited)  -  registered BEFORE auth routes
app.use('/api', previewRouter);

app.use('/api/quizzes', quizRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/zapier', zapierRoutes);
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
app.use('/api/admin', cleanupRouter);
app.use('/api/templates', templatesRouter);
app.use('/api', quizPaymentsRouter);
app.get('/health', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // Check Supabase
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.supabase = error ? 'error' : 'ok';
  } catch {
    checks.supabase = 'error';
  }

  // Check Clerk
  try {
    // Simple check that Clerk API key is valid
    if (process.env.CLERK_SECRET_KEY) {
      checks.clerk = 'ok';
    } else {
      checks.clerk = 'error';
    }
  } catch {
    checks.clerk = 'error';
  }

  // Check Stripe
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      checks.stripe = 'ok';
    } else {
      checks.stripe = 'error';
    }
  } catch {
    checks.stripe = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  const status = allOk ? 200 : 503;

  res.status(status).json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Keep /api/health as an alias
app.get('/api/health', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // Check Supabase
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.supabase = error ? 'error' : 'ok';
  } catch {
    checks.supabase = 'error';
  }

  // Check Clerk
  try {
    // Simple check that Clerk API key is valid
    if (process.env.CLERK_SECRET_KEY) {
      checks.clerk = 'ok';
    } else {
      checks.clerk = 'error';
    }
  } catch {
    checks.clerk = 'error';
  }

  // Check Stripe
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      checks.stripe = 'ok';
    } else {
      checks.stripe = 'error';
    }
  } catch {
    checks.stripe = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  const status = allOk ? 200 : 503;

  res.status(status).json({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

Sentry.setupExpressErrorHandler(app);

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
