/**
 * Vitest setup for the hermetic integration suite.
 *
 * Every value below is a LOCAL TEST FIXTURE that isolates external services
 * (Supabase, Clerk, Stripe, Resend, Anthropic). None is a real credential and
 * none is used to hide a product failure: the code under test still runs its
 * real verification/parsing/limit logic against local fakes.
 */
import crypto from 'crypto';
import { vi, beforeEach } from 'vitest';
import { PUBLIC_PEM } from './clerkFake';
import { startAnthropicStub } from './anthropicStub';
import { createFakeSupabase } from './fakeSupabase';
import { getDb } from './db';

const set = (k: string, v: string) => { if (!process.env[k]) process.env[k] = v; };

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'error';
set('SUPABASE_URL', 'http://127.0.0.1:9/fixture-supabase');
set('SUPABASE_SERVICE_ROLE_KEY', 'fixture-service-role');
set('CLERK_SECRET_KEY', 'sk_test_local_fixture');
process.env.CLERK_JWT_KEY = PUBLIC_PEM;
set('STRIPE_SECRET_KEY', 'sk_test_local_fixture');
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_' + crypto.randomBytes(24).toString('hex');
process.env.CLERK_WEBHOOK_SECRET = 'whsec_' + crypto.randomBytes(24).toString('base64');
set('RESEND_API_KEY', 're_local_fixture');
process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + crypto.randomBytes(24).toString('base64');
set('ANTHROPIC_API_KEY', 'sk-ant-local-fixture');
set('ENCRYPTION_KEY', crypto.randomBytes(32).toString('hex'));
set('REPORT_SECRET', 'local-report-secret');
process.env.CRON_SECRET = 'local-cron-secret';
set('FRONTEND_URL', 'https://app.example.test');
set('APP_URL', 'https://app.example.test');
set('BACKEND_URL', 'https://api.example.test');
set('ADMIN_EMAILS', 'admin@example.test');
// Local price-id fixtures (env var NAMES are the ones the code reads).
set('STRIPE_CORE_PRICE_ID', 'price_local_core_m');
set('STRIPE_CORE_YEARLY_PRICE_ID', 'price_local_core_y');
set('STRIPE_PRO_PRICE_ID', 'price_local_pro_m');
set('STRIPE_PRO_YEARLY_PRICE_ID', 'price_local_pro_y');
set('STRIPE_BUSINESS_PRICE_ID', 'price_local_business_m');
set('STRIPE_BUSINESS_YEARLY_PRICE_ID', 'price_local_business_y');
// Keep provider timeouts short so failure-path tests are fast.
set('ANTHROPIC_TIMEOUT_MS', '1500');
set('ANTHROPIC_MAX_RETRIES', '1');
// Never let a test reach a real Redis: the limiter is left unconfigured (fails open, like production without Upstash).
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.SENTRY_DSN;

process.env.ANTHROPIC_BASE_URL = await startAnthropicStub();

const lazyDb: any = { query: async (...a: any[]) => (await getDb()).query(...(a as [any, any])) };
const fake = createFakeSupabase(lazyDb);

vi.mock('@supabase/supabase-js', () => ({ createClient: () => fake }));
vi.mock('resend', async () => ({ Resend: (await import('./resendFake')).FakeResend }));
vi.mock('@clerk/clerk-sdk-node', async () => ({
  clerkClient: { users: { getUser: async (id: string) => (await import('./clerkDirectory')).getClerkUser(id) } },
}));
vi.mock('stripe', async (importOriginal) => {
  const mod: any = await importOriginal();
  const Real = mod.default ?? mod;
  const f = await import('./stripeFake');
  class FakeStripe extends Real {
    constructor(key: string, cfg?: any) {
      super(key, cfg);
      (this as any).checkout = {
        sessions: {
          create: async (p: any) => {
            if (f.stripeBehaviour.failCheckout) throw new Error('stripe unreachable (fixture)');
            f.stripeCalls.checkout.push(p);
            return { id: 'cs_test_local', url: 'https://checkout.stripe.test/session' };
          },
        },
      };
      (this as any).subscriptions = {
        retrieve: async () => ({ items: { data: [{ id: 'si_local' }] } }),
        update: async (id: string, p: any) => { f.stripeCalls.subsUpdate.push({ id, p }); return { id }; },
      };
    }
  }
  return { ...mod, default: FakeStripe };
});

// In-memory rate-limit counters must not leak between tests.
beforeEach(async () => {
  const mod: any = await import('../../services/rateLimiter');
  mod.resetMemoryLimiters?.();
});
