-- ============================================================================
-- Migration: Add integrations table + performance indices + schema enhancements
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Integrations table (for Zapier webhooks, Mailchimp, Klaviyo, etc.)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'webhook', 'mailchimp', 'klaviyo', 'google_sheets'
  config JSONB DEFAULT '{}',  -- { url: '...' } for webhooks, { api_key, list_id } for email platforms
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Email logs table (track digest emails, trial reminders to prevent duplicates)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'weekly_digest', 'trial_day1', 'trial_day5', 'trial_day7', 'lead_notification'
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Quiz enhancements
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS embed_format TEXT DEFAULT 'inline';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS email_gate_position TEXT DEFAULT 'before_results';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS badge_hidden BOOLEAN DEFAULT false;

-- 4. User enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_digest BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_extended BOOLEAN DEFAULT false;

-- 5. Lead enhancements
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_url TEXT;

-- 6. Performance indices
CREATE INDEX IF NOT EXISTS idx_leads_quiz_id ON leads(quiz_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_outcome_id ON leads(outcome_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_slug ON quizzes(slug);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_quiz_id ON analytics_events(quiz_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(active);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);

-- 7. Row Level Security (recommended for production)
-- Uncomment these when ready to enable RLS:
-- ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage their own integrations" ON integrations
--   FOR ALL USING (user_id = auth.uid());
-- ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own email logs" ON email_logs
--   FOR SELECT USING (user_id = auth.uid());
