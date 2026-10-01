-- 035: columns the email campaign and team code already writes, missing from the tables the migrations create.
--
-- email_campaigns: routes/emails.ts, the scheduled-send dispatcher, smart campaigns and email A/B tests read and
-- write mode, source_quiz_id, source_filters, trigger_type, trigger_delay_minutes, sent_count, last_run_at and the
-- ab_test_* columns, but src/db/migrations/20260415_email_automation.sql only creates the basic table, so creating a
-- campaign failed ("column mode does not exist") on a database built from this repository.
-- team_members: changing a member's role sets updated_at, which 018 never created.
--
-- Additive and idempotent: every column is ADD COLUMN IF NOT EXISTS, so a database that already has them is
-- unchanged. email_campaigns is created here when missing because the email automation file runs after the numbered
-- migrations (scripts/migrate.sh); its own CREATE TABLE IF NOT EXISTS then does nothing.

CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  name text not null,
  subject text not null,
  from_name text not null,
  from_email text not null,
  html text not null,
  status text not null default 'draft',
  scheduled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'blast';
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS source_quiz_id UUID;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS source_filters JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS trigger_delay_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test_sample_pct INTEGER;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test_winner_variant_id TEXT;
CREATE INDEX IF NOT EXISTS email_campaigns_tenant_idx ON email_campaigns (tenant_id);

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
