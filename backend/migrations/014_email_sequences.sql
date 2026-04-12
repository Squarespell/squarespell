-- ============================================================================
-- Migration: Email Sequences for Per-Outcome Automated Follow-ups
-- Supports automated email sequences (Day 0, Day 3, Day 7, etc.)
-- ============================================================================

-- Email sequences: define a sequence of emails for each outcome
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  outcome_id TEXT NOT NULL,
  emails JSONB NOT NULL DEFAULT '[]',  -- [{ delay_days: 3, subject: string, body: string, cta_url?: string, cta_text?: string }]
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_id, outcome_id)
);

-- Queue for tracking scheduled email sends
CREATE TABLE IF NOT EXISTS email_sequence_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  email_index INT NOT NULL DEFAULT 0,
  send_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_sequence_queue (status, send_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_lead_id ON email_sequence_queue (lead_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_sequence_id ON email_sequence_queue (sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_quiz_id ON email_sequences (quiz_id);

-- Add booking_url field to outcomes (stored in outcomes JSONB array in quizzes table)
-- Note: This is stored as part of the quiz.outcomes JSONB, not a separate column
-- Outcome shape: { id, title, description, cta_url, cta_text, booking_url, ... }
