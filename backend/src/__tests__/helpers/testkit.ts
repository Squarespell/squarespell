import crypto from 'node:crypto';
import request from 'supertest';
import { signToken } from './clerkFake';
import { sql } from './db';
import { clerkDirectory } from './clerkDirectory';
import { SESSION_COOKIE_NAME, csrfTokenFor } from '../../services/auth/sessions';

let n = 0;
export type TestUser = { clerkId: string; id: string; email: string; token: string; csrfToken: string };

/**
 * Insert a DB user row directly (as the Clerk webhook / first-login flow
 * would) and a real session row for it, so `bearer()` can authenticate as
 * this user against the new session-cookie auth. `clerkId`/Clerk token are
 * kept only because a handful of tests still exercise the Clerk webhook
 * route directly; the app's own requireAuth no longer reads either.
 */
export async function makeUser(opts: { plan?: string; createdDaysAgo?: number; quizCount?: number; email?: string } = {}): Promise<TestUser> {
  n++;
  const clerkId = `user_local_${Date.now()}_${n}`;
  const email = opts.email ?? `owner${n}@quiz-test.example`;
  clerkDirectory[clerkId] = email;
  const created = new Date(Date.now() - (opts.createdDaysAgo ?? 1) * 86400000).toISOString();
  const rows = await sql<{ id: string }>(
    `INSERT INTO users (clerk_user_id, email, plan, quiz_count, created_at, email_verified_at) VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
    [clerkId, email, opts.plan ?? 'pro', opts.quizCount ?? 0, created],
  );
  const id = rows[0].id;

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const csrfToken = csrfTokenFor(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await sql(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
    [id, tokenHash, expiresAt],
  );

  return { clerkId, id, email, token, csrfToken };
}

/** Session cookie + matching CSRF header for a TestUser, for `.set(bearer(user))`. */
export const bearer = (u: { token: string; csrfToken: string }) => ({
  Cookie: `${SESSION_COOKIE_NAME}=${u.token}`,
  'x-csrf-token': u.csrfToken,
});

export function sampleQuiz(over: Record<string, any> = {}) {
  return {
    title: 'P1-TEST Quiz',
    questions: [
      { id: 'q1', text: 'Q1', type: 'single', options: [{ id: 'a', text: 'A', score: 0 }, { id: 'b', text: 'B', score: 1 }, { id: 'c', text: 'C', score: 2 }] },
      { id: 'q2', text: 'Q2', type: 'single', options: [{ id: 'a', text: 'A', score: 0 }, { id: 'b', text: 'B', score: 1 }, { id: 'c', text: 'C', score: 2 }] },
    ],
    outcomes: [
      { id: 'low', title: 'Low', description: 'low', minScore: 0, maxScore: 1 },
      { id: 'mid', title: 'Mid', description: 'mid', minScore: 2, maxScore: 3 },
      { id: 'high', title: 'High', description: 'high', minScore: 4, maxScore: 4 },
    ],
    ...over,
  };
}

/** Insert a quiz row directly (bypasses plan guards) and return it. */
export async function makeQuiz(owner: { id: string }, over: { title?: string; status?: string; slug?: string; questions?: any; outcomes?: any; settings?: any; mode?: string } = {}) {
  n++;
  const q = sampleQuiz();
  const rows = await sql<any>(
    `INSERT INTO quizzes (user_id, title, slug, status, questions, outcomes, settings, mode) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8) RETURNING *`,
    [owner.id, over.title ?? 'P1-TEST Quiz ' + n, over.slug ?? `p1-test-${Date.now().toString(36)}-${n}`, over.status ?? 'live',
      JSON.stringify(over.questions ?? q.questions), JSON.stringify(over.outcomes ?? q.outcomes), JSON.stringify(over.settings ?? {}), over.mode ?? 'lead_quiz'],
  );
  return rows[0];
}

export async function getApp() {
  const mod = await import('../../app');
  return mod.app;
}

export async function api() {
  return request(await getApp());
}

export async function waitFor(fn: () => boolean | Promise<boolean>, ms = 3000, step = 25) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); }
  return false;
}

let ipCounter = 0;
/** A distinct client IP per call (so per-IP rate limits do not couple unrelated test requests). */
export const nextIp = () => `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${(ipCounter++ & 255) + 1}`;
