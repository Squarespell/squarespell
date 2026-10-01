-- Rollback for 035_campaign_and_team_columns.sql. Drops only the columns it added; the code that writes them will
-- fail again afterwards (that was the bug 035 fixed). email_campaigns itself is left in place.
ALTER TABLE team_members DROP COLUMN IF EXISTS updated_at;
DROP INDEX IF EXISTS email_campaigns_tenant_idx;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS ab_test_winner_variant_id;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS ab_test_sample_pct;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS ab_test_enabled;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS last_run_at;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS sent_count;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS trigger_delay_minutes;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS trigger_type;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS source_filters;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS source_quiz_id;
ALTER TABLE email_campaigns DROP COLUMN IF EXISTS mode;
