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

import { app } from './app';
import { supabase } from './db/supabaseClient';
import { log } from './lib/logger';

const PORT = process.env.PORT || 3001;

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

    // Supabase keepalive — free tier pauses after 7 days of no DB traffic.
    // Run a lightweight query every 4 days so the project stays ACTIVE_HEALTHY.
    var SUPABASE_KEEPALIVE_MS = 4 * 24 * 60 * 60 * 1000; // 4 days
    setInterval(async function() {
      try {
        await supabase.from('users').select('id').limit(1);
        log.info('[Keepalive] Supabase ping OK');
      } catch (e: any) {
        log.warn('[Keepalive] Supabase ping failed', { err: String(e) });
      }
    }, SUPABASE_KEEPALIVE_MS);
    log.info('Supabase keepalive enabled (every 4 days)');
  }
});
