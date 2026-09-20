import Anthropic from '@anthropic-ai/sdk';

/**
 * Bounded-cost Anthropic client.
 *
 * @anthropic-ai/sdk 0.20.x hard-codes `timeout: 600000` inside messages.create(), which silently overrides the
 * client-level `timeout` option, and defaults to 2 retries: one hung request could keep a user waiting ~30 minutes
 * and bill up to three attempts. This wrapper applies the timeout and retry budget per request instead.
 *
 * ANTHROPIC_TIMEOUT_MS (default 40000) and ANTHROPIC_MAX_RETRIES (default 1) tune it.
 */
export function anthropicRequestOptions() {
  const timeout = Number(process.env.ANTHROPIC_TIMEOUT_MS) || 40_000;
  const raw = process.env.ANTHROPIC_MAX_RETRIES;
  const maxRetries = raw !== undefined && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : 1;
  return { timeout, maxRetries };
}

export function createAnthropic(apiKey: string | undefined): Anthropic {
  const client = new Anthropic({ apiKey, ...anthropicRequestOptions() });
  const original = client.messages.create.bind(client.messages) as (body: any, opts?: any) => any;
  (client.messages as any).create = (body: any, opts?: any) => original(body, { ...anthropicRequestOptions(), ...(opts || {}) });
  return client;
}
