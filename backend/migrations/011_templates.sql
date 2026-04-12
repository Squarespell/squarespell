-- Migration 011: Templates library

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('lead_quiz', 'price_calculator', 'service_recommender', 'client_qualifier', 'segmentation_quiz')),
  category TEXT,
  quiz_data JSONB NOT NULL,
  thumbnail_url TEXT,
  popularity INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_mode ON templates (mode);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates (category);
