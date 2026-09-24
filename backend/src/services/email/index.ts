import type { EmailProvider } from './provider';
import { hostingerSmtpProvider } from './hostingerSmtpProvider';

// Selects the email transport once, at module load. Real sends always go
// through Hostinger SMTP; the in-memory test transport only activates when
// EMAIL_TRANSPORT=test *and* NODE_ENV is not production, so it can never be
// enabled by staging or production configuration -- neither sets
// EMAIL_TRANSPORT at all, and this throws if that is ever attempted anyway.
function resolveProvider(): EmailProvider {
  if (process.env.EMAIL_TRANSPORT === 'test') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_TRANSPORT=test is not permitted when NODE_ENV=production');
    }
    // Required lazily so this module stays loadable even in a build that
    // has stripped test-only files, and so the test transport's in-memory
    // store is never reachable from a path a production build depends on.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { testEmailProvider } = require('./testProvider');
    return testEmailProvider;
  }
  return hostingerSmtpProvider;
}

export const emailProvider: EmailProvider = resolveProvider();

