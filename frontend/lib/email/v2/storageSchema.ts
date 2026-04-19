// ============================================================================
// Phase 3: Task 3.8 - Template Storage Schema
// ============================================================================
// Database schema for default_templates, user_templates, template_versions.
// Maps to Supabase tables. Max 10 versions per template (FIFO eviction).
// ============================================================================

import type { EmailTemplateV2, TemplateCategory, SiteType } from './schema';

// ---------------------------------------------------------------------------
// default_templates - System-provided templates shipped with the product
// ---------------------------------------------------------------------------

export interface DefaultTemplateRow {
  id: string;                        // uuid, primary key
  slug: string;                      // unique human-readable key, e.g. "quiz-result-v2"
  name: string;                      // display name shown in template gallery
  description: string;               // one-line summary for the gallery card
  category: TemplateCategory;        // template purpose category
  site_type: SiteType | null;        // optional site type filter
  thumbnail_url: string;             // gallery preview image URL
  template_json: EmailTemplateV2;    // full v2 template JSON (jsonb column)
  sort_order: number;                // display order in gallery (lower = first)
  is_active: boolean;                // soft toggle - hidden from gallery when false
  created_at: string;                // timestamp with time zone, auto-set
  updated_at: string;                // timestamp with time zone, auto-updated
}

// ---------------------------------------------------------------------------
// user_templates - User-created or user-customized templates
// ---------------------------------------------------------------------------

export interface UserTemplateRow {
  id: string;                        // uuid, primary key
  user_id: string;                   // references auth.users(id)
  site_id: string | null;            // references sites(id), null = global
  name: string;                      // user-chosen name
  description: string;               // optional user notes
  category: TemplateCategory;        // template purpose category
  source_template_id: string | null; // references default_templates(id) if cloned
  template_json: EmailTemplateV2;    // full v2 template JSON (jsonb column)
  thumbnail_url: string | null;      // auto-generated preview or null
  is_favorite: boolean;              // user bookmarked this template
  last_used_at: string | null;       // timestamp of last time template was used to create an email
  version: number;                   // current version number, starts at 1
  created_at: string;                // timestamp with time zone
  updated_at: string;                // timestamp with time zone
}

// ---------------------------------------------------------------------------
// template_versions - Version history per user template (max 10 per template)
// ---------------------------------------------------------------------------

export interface TemplateVersionRow {
  id: string;                        // uuid, primary key
  template_id: string;               // references user_templates(id) on delete cascade
  version: number;                   // sequential version number (1, 2, 3...)
  template_json: EmailTemplateV2;    // snapshot of template JSON at this version
  change_summary: string;            // auto-generated or user-provided change note
  created_at: string;                // timestamp with time zone
  created_by: string;                // references auth.users(id) - who saved this version
}

// ---------------------------------------------------------------------------
// SQL Migration (for reference - apply via Supabase migration)
// ---------------------------------------------------------------------------

export const STORAGE_SCHEMA_SQL = `
-- Default templates table
CREATE TABLE IF NOT EXISTS default_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  site_type text,
  thumbnail_url text NOT NULL DEFAULT '',
  template_json jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User templates table
CREATE TABLE IF NOT EXISTS user_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  source_template_id uuid REFERENCES default_templates(id) ON DELETE SET NULL,
  template_json jsonb NOT NULL,
  thumbnail_url text,
  is_favorite boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Template versions table (max 10 per template, FIFO)
CREATE TABLE IF NOT EXISTS template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES user_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  template_json jsonb NOT NULL,
  change_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE (template_id, version)
);

-- Indexes
CREATE INDEX idx_user_templates_user ON user_templates(user_id);
CREATE INDEX idx_user_templates_site ON user_templates(site_id);
CREATE INDEX idx_user_templates_category ON user_templates(category);
CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_default_templates_category ON default_templates(category);
CREATE INDEX idx_default_templates_active ON default_templates(is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE default_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active default templates
CREATE POLICY "Public read default templates"
  ON default_templates FOR SELECT
  USING (is_active = true);

-- Users can CRUD their own templates
CREATE POLICY "Users manage own templates"
  ON user_templates FOR ALL
  USING (auth.uid() = user_id);

-- Users can read/write versions of their own templates
CREATE POLICY "Users manage own template versions"
  ON template_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_templates
      WHERE user_templates.id = template_versions.template_id
      AND user_templates.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER default_templates_updated_at
  BEFORE UPDATE ON default_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_templates_updated_at
  BEFORE UPDATE ON user_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- FIFO version eviction: keep max 10 versions per template
CREATE OR REPLACE FUNCTION enforce_max_versions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM template_versions
  WHERE id IN (
    SELECT id FROM template_versions
    WHERE template_id = NEW.template_id
    ORDER BY version DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_versions_fifo
  AFTER INSERT ON template_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_max_versions();
`;

// ---------------------------------------------------------------------------
// Helper Types for API layer
// ---------------------------------------------------------------------------

/** POST /api/templates body */
export interface CreateTemplatePayload {
  name: string;
  description?: string;
  category: TemplateCategory;
  site_id?: string;
  source_template_id?: string;
  template_json: EmailTemplateV2;
}

/** PATCH /api/templates/:id body */
export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  template_json?: EmailTemplateV2;
  is_favorite?: boolean;
  change_summary?: string;           // if provided, a version snapshot is created
}

/** GET /api/templates response item */
export interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail_url: string | null;
  is_favorite: boolean;
  last_used_at: string | null;
  version: number;
  updated_at: string;
  source_template_id: string | null;
}

/** GET /api/templates/:id/versions response item */
export interface VersionListItem {
  id: string;
  version: number;
  change_summary: string;
  created_at: string;
}
