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

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_NUM[level] >= LEVEL_NUM[MIN_LEVEL];
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

function emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    msg,
  };

  if (data) {
    // Flatten err field into structured error object
    if (data.err !== undefined) {
      entry.error = serializeError(data.err);
      const rest = { ...data };
      delete rest.err;
      Object.assign(entry, rest);
    } else {
      Object.assign(entry, data);
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
