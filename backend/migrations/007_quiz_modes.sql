-- Migration 007: Quiz mode system
-- Adds mode field to quizzes table for the 5-mode engine

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'lead_quiz'
  CHECK (mode IN ('lead_quiz', 'price_calculator', 'service_recommender', 'client_qualifier', 'segmentation_quiz'));

CREATE INDEX IF NOT EXISTS idx_quizzes_mode ON quizzes (mode);
