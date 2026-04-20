-- Saved email templates: users can save their email designs as reusable templates
-- with category tags for organization.

CREATE TABLE IF NOT EXISTS saved_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  thumbnail_html TEXT,
  blocks JSONB,
  v2_sections JSONB,
  subject TEXT,
  preheader TEXT,
  is_v2 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_templates_user ON saved_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_templates_category ON saved_templates(category);
