import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

// ── Role Hierarchy ─────────────────────────────────────────────────────────
// Higher index = higher privilege
const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 3,
  admin: 2,
  editor: 1,
  viewer: 0,
};

// ── Team Creation & Management ─────────────────────────────────────────────

/**
 * Create a new team with the given owner.
 * Automatically adds the owner as a member with 'owner' role.
 */
export async function createTeam(ownerId: string, name: string): Promise<any> {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ owner_id: ownerId, name })
    .select()
    .single();

  if (teamError) throw new Error(`Failed to create team: ${teamError.message}`);

  // Add owner as member
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: ownerId,
      email: '', // Will be filled in later if needed
      role: 'owner',
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    throw new Error(`Failed to add owner to team: ${memberError.message}`);
  }

  return team;
}

/**
 * Get all teams that a user belongs to.
 */
export async function getUserTeams(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id, role, teams(id, name, owner_id, created_at, updated_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch user teams: ${error.message}`);

  return data?.map(tm => ({
    ...tm.teams,
    user_role: tm.role,
  })) ?? [];
}

/**
 * Get team details with all members.
 */
export async function getTeamDetails(teamId: string): Promise<any> {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (teamError) throw new Error(`Failed to fetch team: ${teamError.message}`);

  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (membersError) {
    throw new Error(`Failed to fetch team members: ${membersError.message}`);
  }

  return {
    ...team,
    members: members ?? [],
  };
}

// ── Member Management ──────────────────────────────────────────────────────

/**
 * Invite a member to a team.
 * Creates a pending invitation (accepted_at is null until they accept).
 */
export async function inviteMember(
  teamId: string,
  email: string,
  role: TeamRole,
  invitedBy: string
): Promise<any> {
  // For now, we'll generate a temporary user_id based on email
  // In a real system, you'd lookup the user by email or use a separate invite code system
  const user_id = email.replace(/[^a-z0-9]/g, '_').toLowerCase();

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id,
      email,
      role,
      invited_by: invitedBy,
      // accepted_at is null - indicates pending invitation
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate')) {
      throw new Error('User is already a member of this team');
    }
    throw new Error(`Failed to invite member: ${error.message}`);
  }

  return data;
}

/**
 * Accept an invitation to join a team.
 * Sets accepted_at timestamp and updates user_id if known.
 */
export async function acceptInvite(
  teamId: string,
  userId: string,
  email: string
): Promise<any> {
  const { data, error } = await supabase
    .from('team_members')
    .update({
      accepted_at: new Date().toISOString(),
      user_id: userId,
    })
    .eq('team_id', teamId)
    .eq('email', email)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to accept invitation: ${error.message}`);
  }

  return data;
}

/**
 * Remove a member from a team.
 * Cannot remove the team owner.
 */
export async function removeMember(teamId: string, userId: string): Promise<void> {
  // Check if trying to remove the owner
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (memberError || !member) {
    throw new Error('Member not found');
  }

  if (member.role === 'owner') {
    throw new Error('Cannot remove team owner');
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }
}

/**
 * Update a team member's role.
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole
): Promise<any> {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update member role: ${error.message}`);
  }

  return data;
}

/**
 * Get all members of a team.
 */
export async function getTeamMembers(teamId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch team members: ${error.message}`);
  }

  return data ?? [];
}

// ── Quiz Sharing ───────────────────────────────────────────────────────────

/**
 * Share a quiz with a team.
 */
export async function addQuizToTeam(teamId: string, quizId: string): Promise<any> {
  const { data, error } = await supabase
    .from('team_quizzes')
    .insert({ team_id: teamId, quiz_id: quizId })
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate')) {
      throw new Error('Quiz is already shared with this team');
    }
    throw new Error(`Failed to add quiz to team: ${error.message}`);
  }

  return data;
}

/**
 * Remove a quiz from team access.
 */
export async function removeQuizFromTeam(teamId: string, quizId: string): Promise<void> {
  const { error } = await supabase
    .from('team_quizzes')
    .delete()
    .eq('team_id', teamId)
    .eq('quiz_id', quizId);

  if (error) {
    throw new Error(`Failed to remove quiz from team: ${error.message}`);
  }
}

/**
 * Get all quizzes shared with a team.
 */
export async function getTeamQuizzes(teamId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('team_quizzes')
    .select('quiz_id, quizzes(id, title, slug, created_at)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch team quizzes: ${error.message}`);
  }

  return data?.map(tq => tq.quizzes) ?? [];
}

// ── Access Control ─────────────────────────────────────────────────────────

/**
 * Check if a user can access a quiz.
 * Returns true if user owns the quiz or is in a team that has the quiz shared.
 */
export async function canAccessQuiz(userId: string, quizId: string): Promise<boolean> {
  // Check if user owns the quiz
  const { data: ownedQuiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('user_id', userId)
    .single();

  if (ownedQuiz) return true;

  // Check if user is in a team that has the quiz shared
  const { data: teamQuiz } = await supabase
    .from('team_quizzes')
    .select('team_id')
    .eq('quiz_id', quizId)
    .then(result => {
      if (result.error) return { data: null };
      return result;
    });

  if (!teamQuiz) return false;

  // Check if user is a member of any of those teams
  const teamIds = Array.isArray(teamQuiz) ? teamQuiz.map(tq => tq.team_id) : [];

  if (teamIds.length === 0) return false;

  const { data: userTeamMembership } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .in('team_id', teamIds)
    .single();

  return !!userTeamMembership;
}

/**
 * Check if a user has a minimum required role in a team.
 * Returns true if user's role meets or exceeds the minimum role required.
 */
export async function checkTeamPermission(
  teamId: string,
  userId: string,
  minRole: TeamRole
): Promise<boolean> {
  const { data: member, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (error || !member) {
    return false;
  }

  const userRoleHierarchy = ROLE_HIERARCHY[member.role as TeamRole];
  const minRoleHierarchy = ROLE_HIERARCHY[minRole];

  return userRoleHierarchy >= minRoleHierarchy;
}

/**
 * Get a user's role in a team.
 */
export async function getUserTeamRole(
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const { data: member, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (error || !member) {
    return null;
  }

  return member.role as TeamRole;
}
