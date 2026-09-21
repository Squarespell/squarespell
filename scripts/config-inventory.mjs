#!/usr/bin/env node
/**
 * Squarespell Quiz - configuration inventory (names only, never values).
 *
 *   node scripts/config-inventory.mjs            -> markdown table on stdout
 *   node scripts/config-inventory.mjs --check    -> exit 1 if code references an env var that has no ownership entry
 *   node scripts/config-inventory.mjs --json
 *
 * It scans backend/src and the frontend for process.env.NAME / NEXT_PUBLIC_* and joins the result with the ownership
 * table below. `presence in live dashboards` is intentionally TO_BE_FILLED: only the owner can see the dashboards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN = ['backend/src', 'frontend/app', 'frontend/lib', 'frontend/components', 'frontend/middleware.ts', 'frontend/next.config.js', 'frontend/sentry.client.config.ts', 'frontend/sentry.server.config.ts', 'render.yaml', '.github/workflows'];
const SKIP_DIR = new Set(['node_modules', '.next', 'dist', '__tests__']);
const BUILTIN = new Set(['NODE_ENV', 'PORT', 'VERCEL_ENV', 'VERCEL_URL', 'NEXT_RUNTIME', 'CI', 'npm_package_version']);

// name -> [service, purpose, ownershipClear, needsNewValueForSquarespellquizCom, note]
const V = (service, purpose, clear, newValue, note = '') => ({ service, purpose, clear, newValue, note });
const OWN = {
  // Supabase
  SUPABASE_URL: V('Supabase', 'prod (Render); dev via local .env', 'yes', 'no (until DB migration in Phase 3)', 'project ref is public; URL only'),
  SUPABASE_SERVICE_ROLE_KEY: V('Supabase', 'prod (Render)', 'yes', 'rotate at cutover', 'server-only secret'),
  NEXT_PUBLIC_SUPABASE_URL: V('Supabase', 'prod (Vercel)', 'unclear: declared in frontend/.env.example, no code reference found', 'no', 'frontend does not query Supabase directly in the scanned code'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: V('Supabase', 'prod (Vercel)', 'unclear: declared in frontend/.env.example, no code reference found', 'no', 'same'),
  // Clerk
  CLERK_SECRET_KEY: V('Clerk', 'prod (Render + Vercel) - currently a DEVELOPMENT instance', 'yes', 'YES - new production Clerk app', 'sk_test/sk_live pair'),
  CLERK_WEBHOOK_SECRET: V('Clerk', 'prod (Render)', 'yes', 'YES - new endpoint signing secret', 'webhook may not be registered'),
  CLERK_JWT_KEY: V('Clerk', 'optional (Phase 1): networkless verification', 'yes', 'YES if used (new instance key)', 'new in Phase 1; unset = JWKS via Clerk API'),
  CLERK_API_URL: V('Clerk', 'optional (Phase 1): API base override', 'yes', 'no', 'new in Phase 1; tests use a closed local port'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: V('Clerk', 'prod (Vercel)', 'yes', 'YES - new production publishable key', ''),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: V('Clerk', 'prod (Vercel)', 'yes', 'review (redirect paths)', ''),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: V('Clerk', 'prod (Vercel)', 'yes', 'review (redirect paths)', ''),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: V('Clerk', 'prod (Vercel)', 'yes', 'review', ''),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: V('Clerk', 'prod (Vercel)', 'yes', 'review', ''),
  // Stripe
  STRIPE_SECRET_KEY: V('Stripe', 'prod (Render) - LIVE key of the account shared with the marketplace', 'yes (account shared; restrict key scope)', 'no (same Squarespell Limited account) - consider a restricted key', ''),
  STRIPE_WEBHOOK_SECRET: V('Stripe', 'prod (Render) - endpoint currently DISABLED', 'yes', 'YES if the endpoint URL changes', 'endpoint /api/stripe/webhook'),
  STRIPE_QUIZ_PAYMENT_WEBHOOK_SECRET: V('Stripe', 'optional (Phase 1): quiz-payment endpoint secret', 'yes', 'YES if that endpoint is registered', 'falls back to STRIPE_WEBHOOK_SECRET'),
  STRIPE_CORE_PRICE_ID: V('Stripe', 'prod (Render)', 'NO: render.yaml/.env.example named STARTER; Stripe catalog is Starter/Pro/Agency', 'Phase 2 decision', 'no default; missing = 503'),
  STRIPE_CORE_YEARLY_PRICE_ID: V('Stripe', 'prod (Render)', 'NO (see CORE monthly)', 'Phase 2 decision', ''),
  STRIPE_PRO_PRICE_ID: V('Stripe', 'prod (Render)', 'partly: name matches, prices differ ($39 Stripe vs $19 app)', 'Phase 2 decision', ''),
  STRIPE_PRO_YEARLY_PRICE_ID: V('Stripe', 'prod (Render)', 'partly (see PRO monthly)', 'Phase 2 decision', ''),
  STRIPE_BUSINESS_PRICE_ID: V('Stripe', 'prod (Render)', 'NO: render.yaml/.env.example named AGENCY', 'Phase 2 decision', ''),
  STRIPE_BUSINESS_YEARLY_PRICE_ID: V('Stripe', 'prod (Render)', 'NO (see BUSINESS monthly)', 'Phase 2 decision', ''),
  STRIPE_STARTER_PRICE_ID: V('Stripe', 'declared in render.yaml / .env.example only - no code reads it', 'NO: orphan declaration', 'Phase 2 decision', 'code reads STRIPE_CORE_PRICE_ID'),
  STRIPE_STARTER_YEARLY_PRICE_ID: V('Stripe', 'declared only - orphan', 'NO', 'Phase 2 decision', ''),
  STRIPE_AGENCY_PRICE_ID: V('Stripe', 'declared only - orphan', 'NO', 'Phase 2 decision', 'code reads STRIPE_BUSINESS_PRICE_ID'),
  STRIPE_AGENCY_YEARLY_PRICE_ID: V('Stripe', 'declared only - orphan', 'NO', 'Phase 2 decision', ''),
  STRIPE_LEAD_500_PRICE_ID: V('Stripe', 'prod (Render) add-on packs - no matching catalog product seen in Phase 0', 'unclear', 'Phase 2 decision', ''),
  STRIPE_LEAD_1500_PRICE_ID: V('Stripe', 'add-on pack', 'unclear', 'Phase 2 decision', ''),
  STRIPE_LEAD_3000_PRICE_ID: V('Stripe', 'add-on pack', 'unclear', 'Phase 2 decision', ''),
  STRIPE_EMAIL_1000_PRICE_ID: V('Stripe', 'add-on pack', 'unclear', 'Phase 2 decision', ''),
  STRIPE_EMAIL_5000_PRICE_ID: V('Stripe', 'add-on pack', 'unclear', 'Phase 2 decision', ''),
  STRIPE_EMAIL_10000_PRICE_ID: V('Stripe', 'add-on pack', 'unclear', 'Phase 2 decision', ''),
  // Resend / email
  RESEND_WEBHOOK_SECRET: V('Resend', 'optional->required (Phase 1): Svix signing secret for /api/webhooks/resend', 'yes', 'YES if the endpoint URL changes', 'unset = the Resend webhook endpoint answers 503'),
  DISABLE_INPROCESS_EMAIL_QUEUE: V('Render (app config)', 'optional (Phase 1) kill switch for the in-process queue drain', 'yes', 'no', ''),
  RESEND_API_KEY: V('Resend', 'prod (Render)', 'yes (provider/sender domain unverified in Phase 0)', 'YES - new sender domain/key for squarespellquiz.com', ''),
  EMAIL_FROM: V('Resend', 'prod (Render)', 'yes', 'YES - sender on squarespellquiz.com', 'default hello@squarespell.com hard-coded fallback'),
  PLATFORM_EMAIL_FROM: V('Resend', 'prod (Render)', 'yes', 'YES', ''),
  BUSINESS_ADDRESS: V('other (CAN-SPAM footer)', 'prod (Render)', 'yes', 'review', 'default is a hard-coded Delaware address'),
  // Anthropic
  ANTHROPIC_API_KEY: V('Anthropic', 'prod (Render)', 'yes', 'YES - dedicated Quiz key (Phase 0 target)', ''),
  ANTHROPIC_BASE_URL: V('Anthropic', 'SDK-read (tests point it at a local stub)', 'yes', 'no', 'not set in production'),
  ANTHROPIC_TIMEOUT_MS: V('Anthropic', 'optional (Phase 1) per-call timeout', 'yes', 'no', 'default 40000'),
  ANTHROPIC_MAX_RETRIES: V('Anthropic', 'optional (Phase 1) retry budget', 'yes', 'no', 'default 1'),
  // URLs
  FRONTEND_URL: V('Render (app config)', 'prod: checkout redirects, CORS', 'yes', 'YES - squarespellquiz.com app host', ''),
  APP_URL: V('Render (app config)', 'prod: links in emails', 'yes', 'YES', 'default https://app.squarespell.com'),
  MARKETING_URL: V('Render (app config)', 'prod', 'yes', 'YES', 'default https://squarespell.com'),
  CORS_ORIGINS: V('Render (app config)', 'prod: allowlist', 'yes', 'YES', 'defaults are app./quiz./www. squarespell.com'),
  BACKEND_URL: V('Render (app config)', 'prod: unsubscribe/report links, cron', 'yes', 'YES if API host changes', ''),
  API_URL: V('Render (app config)', 'legacy alias of BACKEND_URL', 'unclear (alias)', 'as BACKEND_URL', ''),
  API_BASE_URL: V('Render (app config)', 'legacy alias for keep-alive self ping', 'unclear (alias)', 'as BACKEND_URL', ''),
  RENDER_EXTERNAL_URL: V('Render', 'set in render.yaml (value in file); enables in-process timers', 'yes', 'YES if API host changes', ''),
  NEXT_PUBLIC_API_URL: V('Vercel', 'prod/preview: frontend -> API base', 'yes', 'YES (API host)', 'default https://squarespell-api.onrender.com hard-coded in ~30 files'),
  // Secrets / app
  REPORT_SECRET: V('Render (app secret)', 'prod: HMAC for PDF report links', 'yes', 'rotate at cutover', 'default in code if unset - verify'),
  CRON_SECRET: V('Render + Vercel + GitHub (shared secret)', 'prod: authenticates cron calls', 'yes (3 places must match)', 'rotate at cutover', 'unset now fails closed (503)'),
  ENCRYPTION_KEY: V('Render (app secret)', 'prod: AES-256-GCM for integration configs', 'yes', 'DO NOT rotate without re-encrypting stored configs', ''),
  ADMIN_EMAILS: V('Render (app config)', 'prod: admin dashboard allow-list', 'yes', 'review', ''),
  // Rate limiting / monitoring
  UPSTASH_REDIS_REST_URL: V('other (Upstash Redis)', 'prod (Render) - optional', 'unclear: account owner not documented', 'YES if Upstash is kept (dedicated DB)', 'unset = per-process limiter (Phase 1)'),
  UPSTASH_REDIS_REST_TOKEN: V('other (Upstash Redis)', 'prod (Render) - optional', 'unclear', 'YES', ''),
  SENTRY_DSN: V('other (Sentry)', 'prod (Render) - optional', 'unclear: Sentry org/project not documented', 'YES - dedicated Quiz project', ''),
  NEXT_PUBLIC_SENTRY_DSN: V('other (Sentry)', 'prod (Vercel) - optional', 'unclear', 'YES', ''),
  NEXT_PUBLIC_SITE_URL: V('Squarespell (build argument)', 'production frontend build - canonical origin', 'yes', 'YES - https://squarespellquiz.com', 'defaults to the production domain when unset'),
  NEXT_PUBLIC_ALLOW_INDEXING: V('Squarespell (build argument)', 'production frontend build - search indexing switch', 'yes', 'YES - true only in the approved launch build', 'default off: robots.txt disallows all and pages are noindex'),
  SENTRY_ORG: V('other (Sentry)', 'Vercel build (source maps)', 'unclear', 'YES', ''),
  SENTRY_PROJECT: V('other (Sentry)', 'Vercel build (source maps)', 'unclear', 'YES', ''),
  SENTRY_AUTH_TOKEN: V('other (Sentry)', 'Vercel build (source maps)', 'unclear', 'YES', ''),
  TURNSTILE_SECRET_KEY: V('other (Cloudflare Turnstile)', 'prod - optional', 'unclear', 'YES', 'unset = bot check is a no-op'),
  LOG_LEVEL: V('Render (app config)', 'prod', 'yes', 'no', ''),
  // Names that appear only in backend/.env.staging.example (the code does not read them)
  CORS_ORIGIN: V('Render (app config)', 'staging example only - code reads CORS_ORIGINS', 'NO: doc drift', 'n/a', 'wrong name in .env.staging.example'),
  UPSTASH_REDIS_URL: V('other (Upstash Redis)', 'staging example only - code reads UPSTASH_REDIS_REST_URL', 'NO: doc drift', 'n/a', 'wrong name in .env.staging.example'),
  UPSTASH_REDIS_TOKEN: V('other (Upstash Redis)', 'staging example only - code reads UPSTASH_REDIS_REST_TOKEN', 'NO: doc drift', 'n/a', 'wrong name in .env.staging.example'),
  // Media
  PEXELS_ACCESS_KEY: V('other (Pexels)', 'prod - optional stock-photo search', 'unclear', 'YES', ''),
  UNSPLASH_ACCESS_KEY: V('other (Unsplash)', 'prod - optional stock-photo search', 'unclear', 'YES', ''),
  // Frontend misc
  CRON_SECRET_FRONTEND: V('Vercel', 'keepalive route', 'yes', 'rotate', ''),
  NEXT_PUBLIC_QUIZ_URL: V('Vercel', 'documented as intentionally NOT an env var', 'n/a', 'n/a', 'URLs are hard-coded constants in frontend/lib/urls.ts'),
  NEXT_PUBLIC_APP_URL: V('Vercel', 'documented as intentionally NOT an env var', 'n/a', 'n/a', ''),
  NEXT_PUBLIC_MARKETING_URL: V('Vercel', 'documented as intentionally NOT an env var', 'n/a', 'n/a', ''),
  GITHUB_TOKEN: V('GitHub Actions', 'n/a', 'n/a', 'n/a', ''),
};

function walk(p, out = []) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isFile()) { out.push(abs); return out; }
  for (const f of fs.readdirSync(abs)) {
    if (SKIP_DIR.has(f)) continue;
    walk(path.join(p, f), out);
  }
  return out;
}

const refs = new Map(); // name -> Set(file)
const add = (name, file) => { if (!refs.has(name)) refs.set(name, new Set()); refs.get(name).add(path.relative(ROOT, file)); };
for (const p of SCAN) {
  for (const f of walk(p)) {
    if (!/\.(ts|tsx|js|mjs|yml|yaml)$/.test(f)) continue;
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) add(m[1], f);
    for (const m of text.matchAll(/process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]/g)) add(m[1], f);
    if (/render\.yaml$/.test(f)) for (const m of text.matchAll(/- key: ([A-Z][A-Z0-9_]+)/g)) add(m[1], f);
    if (/\.github\/workflows/.test(f)) for (const m of text.matchAll(/\$\{\{\s*(?:secrets|env)\.([A-Z][A-Z0-9_]+)/g)) add(m[1], f);
  }
}
// .env.example declarations (documentation references)
for (const f of ['backend/.env.example', 'frontend/.env.example', 'backend/.env.staging.example', 'frontend/.env.staging.example']) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue;
  for (const m of fs.readFileSync(abs, 'utf8').matchAll(/^([A-Z][A-Z0-9_]+)=/gm)) add(m[1], abs);
}

const names = [...refs.keys()].filter((n) => !BUILTIN.has(n)).sort();
const missing = names.filter((n) => !OWN[n]);

if (process.argv.includes('--check')) {
  if (missing.length) { console.error('Environment variables without an ownership entry in scripts/config-inventory.mjs: ' + missing.join(', ')); process.exit(1); }
  console.log(`OK: ${names.length} variables, all have an ownership entry`);
  process.exit(0);
}

const rows = names.map((n) => {
  const o = OWN[n] || V('UNMAPPED', '', 'no', '', '');
  const files = [...refs.get(n)].sort();
  return { name: n, service: o.service, purpose: o.purpose, files, product: 'Quiz SaaS', clear: o.clear, newValue: o.newValue, note: o.note, presence: 'TO_BE_FILLED' };
});
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
console.log('| Variable | Owning service | Purpose / environment | Referenced in | Product | Ownership clear? | New value for squarespellquiz.com? | Presence in live dashboards |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  const f = r.files.length > 3 ? r.files.slice(0, 3).join(', ') + ` (+${r.files.length - 3})` : r.files.join(', ');
  console.log(`| \`${r.name}\` | ${r.service} | ${r.purpose}${r.note ? ' - ' + r.note : ''} | ${f} | ${r.product} | ${r.clear} | ${r.newValue} | ${r.presence} |`);
}
