-- Run this entire file in Supabase SQL Editor (copy-paste all at once)

CREATE TABLE users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id          TEXT UNIQUE NOT NULL,
  email                  TEXT NOT NULL,
  plan                   TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at        TIMESTAMPTZ,
  quiz_count             INT NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  slug        TEXT UNIQUE NOT NULL,
  questions   JSONB NOT NULL DEFAULT '[]',
  outcomes    JSONB NOT NULL DEFAULT '[]',
  branding    JSONB NOT NULL DEFAULT '{}',
  settings    JSONB NOT NULL DEFAULT '{}',
  lead_count  INT NOT NULL DEFAULT 0,
  view_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT NOT NULL,
  answers     JSONB NOT NULL DEFAULT '{}',
  outcome_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  session_id  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_user_id    ON quizzes(user_id);
CREATE INDEX idx_quizzes_slug       ON quizzes(slug);
CREATE INDEX idx_leads_quiz_id      ON leads(quiz_id);
CREATE INDEX idx_analytics_quiz_id  ON analytics_events(quiz_id);
CREATE INDEX idx_analytics_type     ON analytics_events(event_type);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION increment_quiz_count(uid UUID)
RETURNS void AS $$
  UPDATE users SET quiz_count = quiz_count + 1 WHERE id = uid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_view_count(qid UUID)
RETURNS void AS $$
  UPDATE quizzes SET view_count = view_count + 1 WHERE id = qid;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_lead_count(qid UUID)
RETURNS void AS $$
  UPDATE quizzes SET lead_count = lead_count + 1 WHERE id = qid;
$$ LANGUAGE sql;

ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads            DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY;
