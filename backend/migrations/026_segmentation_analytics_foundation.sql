-- Migration 026: Lead Segmentation & Analytics Foundation
-- Foundation for: internal segmentation engine, per-question analytics,
-- partial completion capture, enhanced lead data, multi-language readiness.
-- Philosophy: ZERO dependency on third-party email/CRM tools.
-- Everything runs inside Squarespell.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. LEAD TAGS — flexible tagging system (replaces Mailchimp/Klaviyo tags)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#0D7377',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_user ON lead_tags(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. LEAD TAG ASSIGNMENTS — many-to-many link between leads and tags
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'manual',  -- 'manual' | 'auto_rule' | 'quiz_outcome' | 'score_range'
  UNIQUE(lead_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_tag_assign_lead ON lead_tag_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tag_assign_tag ON lead_tag_assignments(tag_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. SEGMENTS — saved filter queries (replaces Mailchimp/Klaviyo segments)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Rules stored as JSONB array of conditions:
  -- [{ field: 'outcome_id', op: 'eq', value: 'uuid' },
  --  { field: 'score', op: 'gte', value: 80 },
  --  { field: 'tag', op: 'has', value: 'hot-lead' },
  --  { field: 'answer', op: 'eq', value: { question_index: 2, option_index: 1 } },
  --  { field: 'quiz_id', op: 'eq', value: 'uuid' },
  --  { field: 'created_at', op: 'gte', value: '2025-01-01' },
  --  { field: 'language', op: 'eq', value: 'fr' }]
  -- op: eq | neq | gt | gte | lt | lte | has | not_has | contains | in
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Cached count for quick display (refreshed on demand)
  cached_count INT DEFAULT 0,
  cached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_segments_user ON lead_segments(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. AUTO-TAGGING RULES — auto-apply tags based on quiz answers/scores
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auto_tag_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
  -- Conditions use same format as segments
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,  -- NULL = apply to all quizzes
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_tag_rules_user ON auto_tag_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_tag_rules_quiz ON auto_tag_rules(quiz_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. QUESTION-LEVEL ANALYTICS EVENTS — per-question tracking
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS quiz_question_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  session_id TEXT NOT NULL,           -- anonymous visitor session
  question_index INT NOT NULL,        -- which question (0-based)
  event_type TEXT NOT NULL,           -- 'view' | 'answer' | 'skip' | 'back'
  answer_data JSONB,                  -- { option_index: 2, value: '...' } or null for view/skip
  time_spent_ms INT,                  -- milliseconds on this question
  device_type TEXT,                   -- 'mobile' | 'desktop' | 'tablet'
  language TEXT DEFAULT 'en',         -- for multi-language analytics
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Composite index for funnel queries: "for quiz X, how many sessions reached question N?"
CREATE INDEX IF NOT EXISTS idx_qqe_quiz_question ON quiz_question_events(quiz_id, question_index);
CREATE INDEX IF NOT EXISTS idx_qqe_quiz_session ON quiz_question_events(quiz_id, session_id);
CREATE INDEX IF NOT EXISTS idx_qqe_created ON quiz_question_events(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. PARTIAL COMPLETIONS — capture abandoned quiz sessions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partial_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  -- Progressive answer storage: updated on each question answer
  answers JSONB DEFAULT '{}'::jsonb,
  last_question_index INT DEFAULT 0,
  total_questions INT,
  -- Optional: if they entered email before abandoning
  email TEXT,
  name TEXT,
  -- Lifecycle
  status TEXT DEFAULT 'in_progress',  -- 'in_progress' | 'abandoned' | 'converted'
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  converted_lead_id UUID REFERENCES leads(id),
  device_type TEXT,
  language TEXT DEFAULT 'en',
  UNIQUE(quiz_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_partial_quiz ON partial_completions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_partial_status ON partial_completions(status);
CREATE INDEX IF NOT EXISTS idx_partial_activity ON partial_completions(last_activity_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. LEAD CUSTOM FIELDS — extensible per-user field definitions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,            -- machine name: 'skincare_concern'
  field_label TEXT NOT NULL,          -- display: 'Skincare Concern'
  field_type TEXT DEFAULT 'text',     -- 'text' | 'number' | 'boolean' | 'select' | 'multi_select'
  options JSONB,                      -- for select/multi_select: ['acne','aging','dryness']
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_user ON lead_custom_fields(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. LEAD CUSTOM FIELD VALUES — actual values per lead
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lead_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES lead_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_values_lead ON lead_custom_field_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_custom_values_field ON lead_custom_field_values(field_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. EMAIL AUTOMATION RULES — internal automation (replaces Zapier triggers)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Trigger: what fires this rule
  -- { type: 'lead_created' | 'tag_added' | 'segment_entered' | 'quiz_completed',
  --   quiz_id?: 'uuid', tag_id?: 'uuid', segment_id?: 'uuid' }
  trigger_config JSONB NOT NULL,
  -- Action: what to do
  -- { type: 'send_email' | 'add_tag' | 'start_sequence',
  --   email_template?: {...}, tag_id?: 'uuid', sequence_id?: 'uuid' }
  action_config JSONB NOT NULL,
  -- Delay before action (0 = immediate)
  delay_minutes INT DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  last_fired_at TIMESTAMPTZ,
  fire_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_user ON email_automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_enabled ON email_automation_rules(enabled) WHERE enabled = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. AUTOMATION EXECUTION LOG — track every automation fire
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automation_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES email_automation_rules(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'success',      -- 'success' | 'failed' | 'skipped'
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_exec_rule ON automation_execution_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_exec_time ON automation_execution_log(executed_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. QUIZ TRANSLATIONS — multi-language support (translation layer)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS quiz_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,         -- ISO 639-1: 'fr', 'es', 'de', 'ar', etc.
  -- Full translation of all quiz content as JSONB overlay:
  -- { title: '...', questions: [{text:'...', options:[{text:'...',explanation:'...'}]}],
  --   outcomes: [{title:'...', description:'...', cta_text:'...'}],
  --   lead_gate: { heading:'...', subheading:'...', fields:[{label:'...',placeholder:'...'}] } }
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Status tracking
  status TEXT DEFAULT 'draft',         -- 'draft' | 'complete' | 'needs_review'
  completeness_pct INT DEFAULT 0,      -- 0-100, auto-calculated
  last_edited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_quiz_trans_quiz ON quiz_translations(quiz_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. ALTER EXISTING TABLES — add columns for new capabilities
-- ═══════════════════════════════════════════════════════════════════════════

-- Add language tracking to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score_label TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score NUMERIC;

-- Add default language + enabled languages to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS enabled_languages TEXT[] DEFAULT ARRAY['en'];

-- Add segment_id to email sequences for segment-triggered sequences
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES lead_segments(id);
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS tag_trigger_id UUID REFERENCES lead_tags(id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. HELPER FUNCTION: Mark stale partial completions as abandoned
-- Designed to run via cron (every 30 minutes)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION mark_abandoned_sessions(stale_minutes INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE partial_completions
  SET status = 'abandoned'
  WHERE status = 'in_progress'
    AND last_activity_at < now() - (stale_minutes || ' minutes')::interval;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
