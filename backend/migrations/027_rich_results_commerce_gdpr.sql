-- Migration 027: Rich Results, Squarespace Commerce, GDPR, Question Types, Custom CSS
-- Covers all remaining systems from the gap analysis.

-- ══════════════════════════════════════════════════════════════════���════════
-- 1. RICH RESULTS — extended outcome content blocks
-- ═══════════════════════════════════════════════════════════════════════════

-- Outcome content blocks stored in quiz.outcomes JSONB already.
-- We add a dedicated table for reusable result page components:
CREATE TABLE IF NOT EXISTS result_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  outcome_id TEXT NOT NULL,
  block_type TEXT NOT NULL,           -- 'product_card' | 'social_share' | 'cta_button' | 'text' | 'image' | 'video' | 'testimonial' | 'countdown'
  block_order INT DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- product_card: { product_id, title, image, price, url, badge }
  -- social_share: { platforms: ['facebook','twitter','linkedin','email'], share_text, share_url }
  -- cta_button: { text, url, style: 'primary'|'secondary', new_tab }
  -- text: { content, alignment }
  -- image: { url, alt, width }
  -- testimonial: { quote, author, avatar_url, rating }
  -- countdown: { end_date, label, expired_text }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_blocks_quiz ON result_page_blocks(quiz_id, outcome_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SQUARESPACE COMMERCE — product catalog sync
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS squarespace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,     -- AES-256 encrypted Squarespace API key
  site_url TEXT,
  site_title TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',  -- 'pending' | 'syncing' | 'synced' | 'error'
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, site_id)
);

CREATE TABLE IF NOT EXISTS squarespace_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES squarespace_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  squarespace_id TEXT NOT NULL,        -- Squarespace product ID
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT,
  url TEXT,                            -- full product URL
  image_url TEXT,
  price_cents INT,
  currency TEXT DEFAULT 'USD',
  is_available BOOLEAN DEFAULT true,
  variant_count INT DEFAULT 0,
  categories JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  raw_data JSONB,                      -- full Squarespace API response
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(connection_id, squarespace_id)
);

CREATE INDEX IF NOT EXISTS idx_sq_products_user ON squarespace_products(user_id);
CREATE INDEX IF NOT EXISTS idx_sq_products_conn ON squarespace_products(connection_id);
CREATE INDEX IF NOT EXISTS idx_sq_products_available ON squarespace_products(user_id, is_available);

-- Product-to-outcome mapping
CREATE TABLE IF NOT EXISTS product_outcome_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  outcome_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES squarespace_products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  custom_headline TEXT,                -- override product name for this outcome
  custom_description TEXT,             -- override description
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_id, outcome_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_mappings_quiz ON product_outcome_mappings(quiz_id, outcome_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. GDPR COMPLIANCE — consent records + data requests
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  quiz_id UUID,
  consent_type TEXT NOT NULL,          -- 'email_marketing' | 'data_processing' | 'cookie'
  consent_given BOOLEAN NOT NULL,
  consent_text TEXT,                   -- exact text shown
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_email ON consent_records(email);
CREATE INDEX IF NOT EXISTS idx_consent_lead ON consent_records(lead_id);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID NOT NULL,               -- quiz owner's user_id
  status TEXT DEFAULT 'pending',       -- 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled'
  confirmation_token TEXT UNIQUE,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deleted_records JSONB,               -- { leads: N, events: N, partials: N }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_email ON data_deletion_requests(email);
CREATE INDEX IF NOT EXISTS idx_deletion_status ON data_deletion_requests(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CUSTOM CSS — per-quiz CSS overrides
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT '';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ENHANCED QUESTION TYPES — extend quiz JSONB schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Question types are stored in quiz.questions JSONB.
-- New types: 'slider', 'rating', 'open_text', 'date', 'file_upload'
-- No schema change needed — types are stored in questions[].type field.
-- This comment documents the expected JSONB shape for each:
--
-- slider:     { type:'slider', text:'...', min:0, max:100, step:1, labels:{min:'Low',max:'High'} }
-- rating:     { type:'rating', text:'...', max_stars:5, labels:{1:'Poor',5:'Excellent'} }
-- open_text:  { type:'open_text', text:'...', placeholder:'...', validation:'email'|'url'|'phone'|null, max_length:500 }
-- date:       { type:'date', text:'...', min_date:'2025-01-01', max_date:'2026-12-31' }
-- file_upload: { type:'file_upload', text:'...', accept:'.pdf,.jpg,.png', max_size_mb:5 }

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. EMBED PERFORMANCE — preload hints tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- Track embed load performance for optimization
CREATE TABLE IF NOT EXISTS embed_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL,
  session_id TEXT,
  load_time_ms INT,                    -- total load time
  ttfb_ms INT,                         -- time to first byte
  fcp_ms INT,                          -- first contentful paint
  device_type TEXT,
  connection_type TEXT,                -- '4g' | '3g' | 'wifi' | 'unknown'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embed_perf_quiz ON embed_performance_logs(quiz_id);
