import type { Response } from 'express';
import { log } from './logger';

/** A failure of the AI provider, translated into a stable code + HTTP status the UI can act on. */
export class AiServiceError extends Error {
  readonly code: 'ai_timeout' | 'ai_unavailable' | 'ai_rate_limited' | 'ai_bad_response';
  readonly status: number;
  constructor(code: AiServiceError['code'], message: string) {
    super(message);
    this.name = 'AiServiceError';
    this.code = code;
    this.status = code === 'ai_timeout' ? 504 : code === 'ai_rate_limited' ? 503 : 502;
  }
}

/** Map an @anthropic-ai/sdk (or network) error to an AiServiceError. Never includes provider bodies or keys. */
export function toAiError(err: unknown): AiServiceError {
  if (err instanceof AiServiceError) return err;
  const e: any = err;
  const name = String(e?.name || '');
  const status = Number(e?.status);
  if (/Timeout/i.test(name) || /timed out|timeout/i.test(String(e?.message))) {
    return new AiServiceError('ai_timeout', 'The AI service took too long to respond. Please try again.');
  }
  if (status === 429) {
    return new AiServiceError('ai_rate_limited', 'The AI service is busy right now. Please try again in a minute.');
  }
  return new AiServiceError('ai_unavailable', 'The AI service is temporarily unavailable. Please try again shortly.');
}

/** Route helper: if `err` is an AI failure, answer with explicit JSON and return true. */
export function respondIfAiError(res: Response, err: unknown, context: string): boolean {
  if (!(err instanceof AiServiceError)) return false;
  log.error(`[AI] ${context} failed`, { code: err.code });
  if (err.code === 'ai_rate_limited') res.setHeader('Retry-After', '60');
  res.status(err.status).json({ error: err.message, code: err.code });
  return true;
}
