import type { EmailProvider } from './provider';
import { hostingerSmtpProvider } from './hostingerSmtpProvider';
import { testEmailProvider } from './testProvider';

// Selects the email transport once, at module load. Real sends always go
// through Hostinger SMTP; the in-memory test transport only activates when
// EMAIL_TRANSPORT=test *and* NODE_ENV is not production, so it can never be
// enabled by staging or production configuration -- neither sets
// EMAIL_TRANSPORT at all, and this throws if that is ever attempted anyway.
// A static import (not a lazy require) is used because a bare `require()`
// of a relative TS module does not resolve under Vitest's ESM transform;
// testProvider.ts has no side effects at import time either way.
function resolveProvider(): EmailProvider {
  if (process.env.EMAIL_TRANSPORT === 'test') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_TRANSPORT=test is not permitted when NODE_ENV=production');
    }
    return testEmailProvider;
  }
  return hostingerSmtpProvider;
}

export const emailProvider: EmailProvider = resolveProvider();
