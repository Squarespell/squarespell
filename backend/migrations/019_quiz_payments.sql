-- ============================================================================
-- Migration: Quiz Payment Collection
-- Allows quiz owners to collect payments at quiz completion
-- ============================================================================

-- Quiz payments table to track payment records
CREATE TABLE IF NOT EXISTS quiz_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_quiz_payments_quiz_id ON quiz_payments (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_payments_lead_id ON quiz_payments (lead_id);
CREATE INDEX IF NOT EXISTS idx_quiz_payments_stripe_session_id ON quiz_payments (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_payments_stripe_payment_intent_id ON quiz_payments (stripe_payment_intent_id);
