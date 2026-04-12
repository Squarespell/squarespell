-- Migration 005: Idempotent lead submissions and GDPR consent
-- Prevents duplicate leads from client retries and adds GDPR compliance

ALTER TABLE leads ADD COLUMN IF NOT EXISTS submission_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_submission_id ON leads (submission_id) WHERE submission_id IS NOT NULL;

-- Partial index to prevent duplicates for (quiz_id, email) pairs
-- Only enforced when both are present
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_quiz_email ON leads (quiz_id, email) WHERE email IS NOT NULL;

-- GDPR consent fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_text TEXT;
