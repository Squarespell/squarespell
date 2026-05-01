-- Migration 029: Add optimistic locking to quizzes table
-- Adds a version column that auto-increments on every update.
-- The API checks this version on PATCH to prevent silent overwrites.

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Also add outcome_snapshot to leads for denormalized outcome data
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outcome_title TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outcome_description TEXT;

-- Add TTL column to preview_cache for cleanup
ALTER TABLE preview_cache ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours');

-- Create index for preview_cache cleanup
CREATE INDEX IF NOT EXISTS idx_preview_cache_expires ON preview_cache (expires_at);
