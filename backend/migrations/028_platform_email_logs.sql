-- 028: Platform email logs — tracks every lifecycle email sent from Squarespell
-- to its own users (welcome, trial reminders, billing notifications, etc.)
-- so we never send the same email type to the same user twice.

CREATE TABLE IF NOT EXISTS platform_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One email type per user — the dedup key
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_email_logs_dedup
  ON platform_email_logs (user_id, email_type);

-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_platform_email_logs_user
  ON platform_email_logs (user_id);

-- Fast lookup by type (for analytics: "how many welcome emails sent?")
CREATE INDEX IF NOT EXISTS idx_platform_email_logs_type
  ON platform_email_logs (email_type, sent_at);

-- Track last_login for win-back emails
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
