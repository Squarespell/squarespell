-- ============================================================================
-- Migration: Conditional Email Sequences Per Segment
-- Allows sequences to be triggered based on outcome, score range, and segments
-- ============================================================================

-- Add conditions column to email_sequences for segment-based triggering
ALTER TABLE email_sequences
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}';

-- Conditions structure: {
--   outcome_ids: string[],        // Specific outcomes that trigger this
--   score_min: number | null,     // Minimum score (inclusive)
--   score_max: number | null,     // Maximum score (inclusive)
--   segments: string[],           // Segment tags (e.g., "enterprise", "small-business")
--   mode: string | null           // Optional: quiz mode filter
-- }
-- If conditions is empty object {}, the sequence matches all leads (backward compatible)

-- Add sequence_id column to email_sequence_queue if not present
ALTER TABLE email_sequence_queue
ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE;

-- Create a comment documenting the conditions structure
COMMENT ON COLUMN email_sequences.conditions IS 'JSONB conditions for matching leads: { outcome_ids: string[], score_min: number|null, score_max: number|null, segments: string[], mode: string|null }. Empty object {} matches all leads.';

-- Drop and recreate the unique constraint to make it optional (allowing sequences without outcome_id)
ALTER TABLE email_sequences DROP CONSTRAINT IF EXISTS email_sequences_quiz_id_outcome_id_key;

-- Add new unique constraint allowing multiple sequences per quiz
-- (they will be differentiated by their conditions)
ALTER TABLE email_sequences ADD CONSTRAINT email_sequences_quiz_id_name_key UNIQUE(quiz_id, id);

-- Create a name column to distinguish sequences with different conditions
ALTER TABLE email_sequences
ADD COLUMN IF NOT EXISTS name TEXT;

-- Set default name if not present
UPDATE email_sequences SET name = COALESCE(outcome_id, 'Sequence ' || id::text) WHERE name IS NULL;

-- Make name non-null
ALTER TABLE email_sequences
ALTER COLUMN name SET NOT NULL;

-- Create indices for efficient conditional sequence matching
CREATE INDEX IF NOT EXISTS idx_email_sequences_conditions ON email_sequences USING GIN(conditions);
CREATE INDEX IF NOT EXISTS idx_email_sequences_enabled_quiz ON email_sequences(enabled, quiz_id);
