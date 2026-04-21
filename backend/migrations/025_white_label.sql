-- ============================================================================
-- Migration 025: White-Label Branding for Agency Tier
-- ============================================================================

-- Add white-label columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_brand_name TEXT,
  ADD COLUMN IF NOT EXISTS custom_brand_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_brand_color TEXT,
  ADD COLUMN IF NOT EXISTS hide_powered_by BOOLEAN NOT NULL DEFAULT false;

-- Index for white-label lookups
CREATE INDEX IF NOT EXISTS idx_users_white_label ON users(id) WHERE white_label_enabled = true;
