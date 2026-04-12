-- ============================================================================
-- Migration: Multi-User Team Access with Role-Based Permissions
-- Allows quiz owners to invite team members with owner/admin/editor/viewer roles
-- ============================================================================

-- Teams: represents a team that can own and share quizzes
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,  -- clerk_user_id (references users.clerk_user_id, not users.id)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team members: links users to teams with role-based access
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- clerk_user_id
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by TEXT,  -- clerk_user_id of who sent the invite
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Team quizzes: associates quizzes with teams for sharing
CREATE TABLE IF NOT EXISTS team_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, quiz_id)
);

-- Indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams (owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members (email);
CREATE INDEX IF NOT EXISTS idx_team_quizzes_team_id ON team_quizzes (team_id);
CREATE INDEX IF NOT EXISTS idx_team_quizzes_quiz_id ON team_quizzes (quiz_id);
