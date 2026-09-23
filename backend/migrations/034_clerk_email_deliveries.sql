-- 034: Clerk self-delivered email idempotency — tracks each Clerk `email.created`
-- event we have relayed through Resend so a Svix retry never sends the same
-- verification-code email twice.

CREATE TABLE IF NOT EXISTS clerk_email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_email_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  to_email TEXT NOT NULL,
  resend_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clerk_email_deliveries_created
  ON clerk_email_deliveries (created_at);
