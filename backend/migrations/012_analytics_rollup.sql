-- Migration 012: Daily analytics rollup table
-- Optimizes historical analytics queries by storing daily aggregated metrics

CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  starts INT DEFAULT 0,
  completions INT DEFAULT 0,
  leads INT DEFAULT 0,
  UNIQUE(quiz_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_quiz_date ON analytics_daily (quiz_id, date);
