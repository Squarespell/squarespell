-- ============================================================================
-- Migration: A/B Testing System
-- Supports variant quizzes with traffic splitting and conversion tracking
-- ============================================================================

-- A/B tests: define variants and track their performance
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
  variants JSONB NOT NULL DEFAULT '[]',  -- [{ variant_id: string, quiz_id: uuid, weight: number }]
  winner_variant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Track visitor assignments to variants
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, visitor_id)
);

-- Indices for efficient querying
CREATE INDEX IF NOT EXISTS idx_ab_tests_user_id ON ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_quiz_id ON ab_tests(quiz_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_variant ON ab_test_assignments(test_id, variant_id);
