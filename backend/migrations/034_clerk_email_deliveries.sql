-- 034: Clerk self-delivered email idempotency and crash-safe delivery state.
--
-- Tracks each Clerk `email.created` event we relay through Resend with an explicit
-- status rather than mere row existence, so a process crash between "reserved" and
-- "sent" can be told apart from "already sent" and safely retried instead of either
-- losing the email or sending it twice. Paired with a Resend-native idempotency key
-- (see backend/src/routes/clerkWebhook.ts) so even a genuinely concurrent retry that
-- reaches Resend a second time is deduplicated by Resend itself, not just by this table.
--
-- Deliberately excludes recipient address, OTP, subject, HTML/text body and the raw
-- webhook payload -- this table exists to make retries safe, not to store PII.

CREATE TABLE IF NOT EXISTS clerk_email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_email_id TEXT NOT NULL UNIQUE,
  clerk_event_id TEXT,
  slug TEXT NOT NULL,
  resend_idempotency_key TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'failed')),
  attempt_count INT NOT NULL DEFAULT 1,
  failure_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clerk_email_deliveries_status
  ON clerk_email_deliveries (status, updated_at);
