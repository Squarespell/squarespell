-- Migration 010: Lead scoring visibility
-- Adds score column for easier querying and filtering of leads by score

ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER;

-- Create an index on score for filtering performance
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);

-- Backfill existing leads with scores from answers
-- This calculates score based on the quiz questions structure
-- Score is stored when a lead is created, so this query finds leads
-- where score wasn't explicitly computed and stored
-- Note: For existing leads without explicit score storage,
-- the score should be recalculated from answers when exposing to users
