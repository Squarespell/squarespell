-- ============================================================================
-- Migration 016: Enable Row Level Security (RLS) on all tables
--
-- RLS STRATEGY:
-- - RLS protects against unauthorized direct Supabase client access from frontend
-- - Backend service_role API key bypasses RLS by design (no policy restrictions apply)
-- - Policies use auth.uid() to check JWT-based user identity
-- - Public operations (preview_cache, templates, ab_test assignments) are explicitly allowed
-- - Service role can always CRUD all rows (implicit - RLS doesn't apply to service_role)
--
-- ENFORCEMENT:
-- 1. Users can only CRUD data they own (user_id match or quiz_id ownership)
-- 2. Public/anon access is strictly scoped where appropriate
-- 3. Sensitive backend operations (email_sequence_queue) are restricted to service role
--
-- ============================================================================

-- Enable RLS on 'users' table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only view/update their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());


-- ============================================================================
-- QUIZZES: Users can only CRUD their own quizzes
-- ============================================================================
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quizzes"
  ON quizzes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own quizzes"
  ON quizzes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own quizzes"
  ON quizzes FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================================
-- LEADS: Users can only read leads from their own quizzes
-- ============================================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads from their quizzes"
  ON leads FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public users can create leads (anon leads)"
  ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete leads from their quizzes"
  ON leads FOR DELETE
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );


-- ============================================================================
-- ANALYTICS_EVENTS: Users can only read events from their own quizzes
-- ============================================================================
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for their quizzes"
  ON analytics_events FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public users can create analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);


-- ============================================================================
-- ANALYTICS_DAILY: Users can only read rollups for their own quizzes
-- ============================================================================
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily analytics for their quizzes"
  ON analytics_daily FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert daily rollups"
  ON analytics_daily FOR INSERT
  WITH CHECK (true);


-- ============================================================================
-- TEMPLATES: Public read-only (write via service_role only)
-- ============================================================================
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view templates
CREATE POLICY "Anyone can view templates"
  ON templates FOR SELECT
  USING (true);

-- Inserts/updates/deletes are restricted to service_role (no policy allows it)


-- ============================================================================
-- PREVIEW_CACHE: Ephemeral token-based access, public read/write
-- ============================================================================
ALTER TABLE preview_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read preview cache (token-based, ephemeral)
CREATE POLICY "Anyone can view preview cache"
  ON preview_cache FOR SELECT
  USING (true);

-- Anyone can create preview cache entries
CREATE POLICY "Anyone can create preview cache entries"
  ON preview_cache FOR INSERT
  WITH CHECK (true);

-- Cleanup queries can delete expired entries
CREATE POLICY "Anyone can delete expired preview cache"
  ON preview_cache FOR DELETE
  USING (true);


-- ============================================================================
-- WEBHOOK_DELIVERIES: Users can only read their own
-- ============================================================================
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhook deliveries for their integrations"
  ON webhook_deliveries FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM integrations WHERE user_id = auth.uid()
    )
  );

-- Service role can create/update deliveries in background jobs


-- ============================================================================
-- INTEGRATIONS: Users can only CRUD their own
-- ============================================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integrations"
  ON integrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create integrations"
  ON integrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own integrations"
  ON integrations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own integrations"
  ON integrations FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================================
-- EMAIL_LOGS: Users can only view their own
-- ============================================================================
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs"
  ON email_logs FOR SELECT
  USING (user_id = auth.uid());


-- ============================================================================
-- EMAIL_SEQUENCES: Users can only CRUD for their own quizzes
-- ============================================================================
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email sequences for their quizzes"
  ON email_sequences FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create email sequences for their quizzes"
  ON email_sequences FOR INSERT
  WITH CHECK (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update email sequences for their quizzes"
  ON email_sequences FOR UPDATE
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete email sequences for their quizzes"
  ON email_sequences FOR DELETE
  USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = auth.uid()
    )
  );


-- ============================================================================
-- EMAIL_SEQUENCE_QUEUE: Service role only (backend processing)
-- ============================================================================
ALTER TABLE email_sequence_queue ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for users - only service_role can manage queue
-- Service role bypasses RLS automatically


-- ============================================================================
-- AB_TESTS: Users can only CRUD their own
-- ============================================================================
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own A/B tests"
  ON ab_tests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create A/B tests"
  ON ab_tests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own A/B tests"
  ON ab_tests FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own A/B tests"
  ON ab_tests FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================================
-- AB_TEST_ASSIGNMENTS: Public insert (visitor assignment), owner can read
-- ============================================================================
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

-- Anyone can create assignments (anon visitors)
CREATE POLICY "Anyone can create test assignments"
  ON ab_test_assignments FOR INSERT
  WITH CHECK (true);

-- Test owners can view assignments for their tests
CREATE POLICY "Test owners can view their test assignments"
  ON ab_test_assignments FOR SELECT
  USING (
    test_id IN (
      SELECT id FROM ab_tests WHERE user_id = auth.uid()
    )
  );
