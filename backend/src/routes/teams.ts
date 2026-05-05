import { Router, Response } from 'express';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import {
  createTeam,
  getUserTeams,
  getTeamDetails,
  inviteMember,
  removeMember,
  updateMemberRole,
  getTeamQuizzes,
  removeQuizFromTeam,
  checkTeamPermission,
  getUserTeamRole,
} from '../services/teamService';

const router = Router();

// All team routes require authentication
router.use(requireAuth, attachUser);

// ── GET /api/teams — list teams for current user ────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Use Clerk userId (stored in team_members.user_id as clerk_user_id)
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const teams = await getUserTeams(userId);
    res.json(teams);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch teams' });
  }
});

// ── POST /api/teams — create a new team ─────────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await createTeam(userId, name.trim());
    // Return in the shape the frontend expects
    res.status(201).json({ ...team, user_role: 'owner', members: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create team' });
  }
});

// ── GET /api/teams/:id — get team details with members ──────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const teamId = req.params.id;

    // Verify user is a member
    const role = await getUserTeamRole(teamId, userId);
    if (!role) return res.status(403).json({ error: 'Not a member of this team' });

    const team = await getTeamDetails(teamId);
    res.json({ ...team, user_role: role });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch team' });
  }
});

// ── GET /api/teams/:id/quizzes — list quizzes shared with team ──────────────
router.get('/:id/quizzes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const teamId = req.params.id;

    const role = await getUserTeamRole(teamId, userId);
    if (!role) return res.status(403).json({ error: 'Not a member of this team' });

    const quizzes = await getTeamQuizzes(teamId);
    res.json(quizzes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch team quizzes' });
  }
});

// ── POST /api/teams/:id/members — invite a member ───────────────────────────
router.post('/:id/members', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const teamId = req.params.id;

    // Only owner/admin can invite
    const canInvite = await checkTeamPermission(teamId, userId, 'admin');
    if (!canInvite) return res.status(403).json({ error: 'Only owners and admins can invite members' });

    const { email, role } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin, editor, viewer)' });
    }

    const member = await inviteMember(teamId, email.trim().toLowerCase(), role, userId);
    res.status(201).json(member);
  } catch (err: any) {
    const status = err.message.includes('already a member') ? 409 : 500;
    res.status(status).json({ error: err.message || 'Failed to invite member' });
  }
});

// ── PATCH /api/teams/:id/members/:userId — update member role ────────────────
router.patch('/:id/members/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const teamId = req.params.id;
    const targetUserId = req.params.userId;

    // Only owner/admin can update roles
    const canManage = await checkTeamPermission(teamId, currentUserId, 'admin');
    if (!canManage) return res.status(403).json({ error: 'Insufficient permissions' });

    const { role } = req.body;
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const updated = await updateMemberRole(teamId, targetUserId, role);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update role' });
  }
});

// ── DELETE /api/teams/:id/members/:userId — remove member ────────────────────
router.delete('/:id/members/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const teamId = req.params.id;
    const targetUserId = req.params.userId;

    // Only owner/admin can remove (or user can remove themselves)
    if (targetUserId !== currentUserId) {
      const canManage = await checkTeamPermission(teamId, currentUserId, 'admin');
      if (!canManage) return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await removeMember(teamId, targetUserId);
    res.json({ removed: true });
  } catch (err: any) {
    const status = err.message.includes('Cannot remove team owner') ? 403 : 500;
    res.status(status).json({ error: err.message || 'Failed to remove member' });
  }
});

// ── DELETE /api/teams/:id/quizzes/:quizId — remove quiz from team ────────────
router.delete('/:id/quizzes/:quizId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const teamId = req.params.id;
    const quizId = req.params.quizId;

    const canManage = await checkTeamPermission(teamId, currentUserId, 'editor');
    if (!canManage) return res.status(403).json({ error: 'Insufficient permissions' });

    await removeQuizFromTeam(teamId, quizId);
    res.json({ removed: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove quiz' });
  }
});

export default router;
