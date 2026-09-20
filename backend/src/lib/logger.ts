/**
 * Structured JSON logger for Squarespell backend.
 *
 * Zero external dependencies - writes newline-delimited JSON to stdout/stderr.
 * Render, Datadog, and most log aggregators parse NDJSON automatically.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.info('Quiz generated', { quizId, userId });
 *   log.error('Scrape failed', { url, err });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_NUM: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function shouldLog(level: LogLevel): boolean {
  const min: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  return LEVEL_NUM[level] >= (LEVEL_NUM[min] ?? LEVEL_NUM.info);
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
    };
  }
  return { message: String(err) };
}

// ── Redaction ────────────────────────────────────────────────────────────────
// Logs go to a third-party store (Render, Sentry). They must never carry credentials or customer PII.
const SECRET_KEY = /(authorization|cookie|secret|passw(or)?d|token|api[-_]?key|signature|credential|private[-_]?key|x-cron)/i;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const TOKEN_PATTERNS: RegExp[] = [
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}\b/g,   // Stripe / Clerk keys
  /\bwhsec_[A-Za-z0-9+/=]{8,}\b/g,                       // webhook signing secrets
  /\bre_[A-Za-z0-9_]{12,}\b/g,                           // Resend
  /\bsk-ant-[A-Za-z0-9_-]{8,}\b/g,                       // Anthropic
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, // JWTs
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
];

function maskEmail(_m: string, domain: string): string {
  return '***@' + domain;
}

export function scrubString(v: string): string {
  let out = v;
  for (const re of TOKEN_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out.replace(EMAIL_RE, maskEmail);
}

function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    msg: scrubString(String(msg)),
  };

  if (data) {
    // Flatten err field into structured error object
    if (data.err !== undefined) {
      entry.error = redact(serializeError(data.err));
      const rest = { ...data };
      delete rest.err;
      Object.assign(entry, redact(rest));
    } else {
      Object.assign(entry, redact(data));
    }
  }

  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const log = {
  debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
  info:  (msg: string, data?: Record<string, unknown>) => emit('info', msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => emit('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),

  /** Create a child logger with preset fields merged into every entry. */
  child(defaults: Record<string, unknown>) {
    return {
      debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, { ...defaults, ...data }),
      info:  (msg: string, data?: Record<string, unknown>) => emit('info', msg, { ...defaults, ...data }),
      warn:  (msg: string, data?: Record<string, unknown>) => emit('warn', msg, { ...defaults, ...data }),
      error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, { ...defaults, ...data }),
    };
  },
};
