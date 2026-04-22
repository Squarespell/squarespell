'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  email: string;
  role: TeamRole;
  invited_by?: string;
  accepted_at?: string;
  created_at: string;
};

type Team = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  user_role: TeamRole;
  members?: TeamMember[];
};

type TeamQuiz = {
  id: string;
  title: string;
  slug: string;
  created_at: string;
};

var ROLE_COLORS: Record<TeamRole, { bg: string; text: string }> = {
  owner: { bg: '#0D7377', text: '#FFFFFF' },
  admin: { bg: '#2D6A4F', text: '#FFFFFF' },
  editor: { bg: '#B45309', text: '#FFFFFF' },
  viewer: { bg: '#6B6B6B', text: '#FFFFFF' },
};

export default function TeamPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [teams, setTeams] = useState<Team[]>([]);
  var [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  var [teamQuizzes, setTeamQuizzes] = useState<TeamQuiz[]>([]);
  var [createTeamOpen, setCreateTeamOpen] = useState(false);
  var [newTeamName, setNewTeamName] = useState('');
  var [inviteOpen, setInviteOpen] = useState(false);
  var [inviteEmail, setInviteEmail] = useState('');
  var [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');

  useEffect(function() {
    if (!token || authStatus === 'loading') return;
    fetchTeams();
  }, [token, authStatus]);

  useEffect(function() {
    if (!selectedTeam || !token) return;
    fetchTeamDetails();
    fetchTeamQuizzes();
  }, [selectedTeam, token]);

  async function fetchTeams() {
    try {
      var res = await fetch(API + '/api/teams', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      var data = await res.json();
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching teams:', err);
    }
  }

  async function fetchTeamDetails() {
    if (!selectedTeam) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to fetch team details');
      var data = await res.json();
      setSelectedTeam(data);
    } catch (err: any) {
      console.error('Error fetching team details:', err);
    }
  }

  async function fetchTeamQuizzes() {
    if (!selectedTeam) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/quizzes', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        var data = await res.json();
        setTeamQuizzes(data);
      }
    } catch (err: any) {
      console.error('Error fetching team quizzes:', err);
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      var res = await fetch(API + '/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ name: newTeamName }),
      });

      if (!res.ok) {
        var errData = await res.json();
        throw new Error(errData.error || 'Failed to create team');
      }

      var newTeam = await res.json();
      setTeams([...teams, newTeam]);
      setSelectedTeam(newTeam);
      setNewTeamName('');
      setCreateTeamOpen(false);
      setSuccess('Team created successfully');
      setTimeout(function() { setSuccess(''); }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam) return;
    setLoading(true);
    setError('');

    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        var errData = await res.json();
        throw new Error(errData.error || 'Failed to invite member');
      }

      setInviteEmail('');
      setInviteRole('editor');
      setInviteOpen(false);
      setSuccess('Member invited successfully');
      setTimeout(function() { setSuccess(''); }, 3000);
      await fetchTeamDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedTeam) return;
    if (!confirm('Remove this member from the team?')) return;

    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/members/' + userId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });

      if (!res.ok) throw new Error('Failed to remove member');
      setSuccess('Member removed');
      setTimeout(function() { setSuccess(''); }, 3000);
      await fetchTeamDetails();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleUpdateRole(userId: string, newRole: TeamRole) {
    if (!selectedTeam) return;

    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/members/' + userId, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) throw new Error('Failed to update role');
      setSuccess('Role updated');
      setTimeout(function() { setSuccess(''); }, 3000);
      await fetchTeamDetails();
    } catch (err: any) {
      setError(err.message);
    }
  }

  var isOwnerOrAdmin =
    selectedTeam && (selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'admin');

  if (authStatus === 'loading') return <DashboardShell><div style={{ padding: '2rem' }}>Loading...</div></DashboardShell>;

  return (
    <DashboardShell>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: C.TEXT }}>
          Team Management
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', marginTop: '2rem' }}>
          {/* Teams List Sidebar */}
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={function() { setCreateTeamOpen(!createTeamOpen); }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: C.ACCENT,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Create Team
              </button>
            </div>

            {createTeamOpen && (
              <form
                onSubmit={handleCreateTeam}
                style={{
                  padding: '1rem',
                  background: C.SURFACE,
                  border: '1px solid ' + C.BORDER,
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <input
                  type="text"
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={function(e) { setNewTeamName(e.target.value); }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: C.BG,
                    border: '1px solid ' + C.BORDER,
                    borderRadius: '0.375rem',
                    color: C.TEXT,
                    marginBottom: '0.5rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !newTeamName.trim()}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: C.ACCENT,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading || !newTeamName.trim() ? 0.5 : 1,
                    fontSize: '0.875rem',
                  }}
                >
                  Create
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {teams.map(function(team) { return (
                <button
                  key={team.id}
                  onClick={function() { setSelectedTeam(team); }}
                  style={{
                    padding: '0.75rem',
                    background: selectedTeam?.id === team.id ? C.ELEVATED : C.SURFACE,
                    border: selectedTeam?.id === team.id ? '1px solid ' + C.ACCENT : '1px solid ' + C.BORDER,
                    borderLeft: selectedTeam?.id === team.id ? '3px solid ' + C.ACCENT : 'none',
                    borderRadius: '0.375rem',
                    color: C.TEXT,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: selectedTeam?.id === team.id ? 'bold' : 'normal',
                  }}
                >
                  {team.name}
                </button>
              ); })}
            </div>
          </div>

          {/* Team Details */}
          {selectedTeam && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: C.TEXT }}>
                  {selectedTeam.name}
                </h2>
                <p style={{ color: C.TEXT_MUTED, fontSize: '0.875rem' }}>
                  Created {new Date(selectedTeam.created_at).toLocaleDateString()}
                </p>
              </div>

              {error && (
                <div style={{ padding: '0.75rem', background: C.DANGER_LIGHT, color: C.DANGER, borderRadius: '0.375rem', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ padding: '0.75rem', background: C.SUCCESS_LIGHT, color: C.SUCCESS, borderRadius: '0.375rem', marginBottom: '1rem' }}>
                  {success}
                </div>
              )}

              {/* Members Section */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: C.TEXT }}>
                    Members ({selectedTeam.members?.length || 0})
                  </h3>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={function() { setInviteOpen(!inviteOpen); }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: C.ACCENT,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Invite Member
                    </button>
                  )}
                </div>

                {inviteOpen && isOwnerOrAdmin && (
                  <form
                    onSubmit={handleInviteMember}
                    style={{
                      padding: '1rem',
                      background: C.SURFACE,
                      border: '1px solid ' + C.BORDER,
                      borderRadius: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', color: C.TEXT, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={function(e) { setInviteEmail(e.target.value); }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: C.BG,
                          border: '1px solid ' + C.BORDER,
                          borderRadius: '0.375rem',
                          color: C.TEXT,
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', color: C.TEXT, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={function(e) { setInviteRole(e.target.value as TeamRole); }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: C.BG,
                          border: '1px solid ' + C.BORDER,
                          borderRadius: '0.375rem',
                          color: C.TEXT,
                        }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !inviteEmail.trim()}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: C.ACCENT,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading || !inviteEmail.trim() ? 0.5 : 1,
                        fontSize: '0.875rem',
                      }}
                    >
                      Send Invite
                    </button>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedTeam.members?.map(function(member) { return (
                    <div
                      key={member.id}
                      style={{
                        padding: '1rem',
                        background: C.SURFACE,
                        border: '1px solid ' + C.BORDER,
                        borderRadius: '0.375rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ color: C.TEXT, fontWeight: '500', marginBottom: '0.25rem' }}>
                          {member.email}
                        </div>
                        <div style={{ color: C.TEXT_MUTED, fontSize: '0.75rem' }}>
                          {member.accepted_at ? 'Accepted' : 'Pending'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {isOwnerOrAdmin && member.role !== 'owner' ? (
                          <>
                            <select
                              value={member.role}
                              onChange={function(e) { handleUpdateRole(member.user_id, e.target.value as TeamRole); }}
                              style={{
                                padding: '0.375rem',
                                background: C.BG,
                                border: '1px solid ' + C.BORDER,
                                borderRadius: '0.25rem',
                                color: C.TEXT,
                                fontSize: '0.75rem',
                              }}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={function() { handleRemoveMember(member.user_id); }}
                              style={{
                                padding: '0.375rem 0.75rem',
                                background: C.DANGER_LIGHT,
                                color: C.DANGER,
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <div
                            style={{
                              ...ROLE_COLORS[member.role],
                              padding: '0.375rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  ); })}
                </div>
              </div>

              {/* Shared Quizzes Section */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: C.TEXT }}>
                  Shared Quizzes ({teamQuizzes.length})
                </h3>
                {teamQuizzes.length === 0 ? (
                  <p style={{ color: C.TEXT_MUTED, fontSize: '0.875rem' }}>
                    No quizzes shared with this team yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {teamQuizzes.map(function(quiz) { return (
                      <div
                        key={quiz.id}
                        style={{
                          padding: '1rem',
                          background: C.SURFACE,
                          border: '1px solid ' + C.BORDER,
                          borderRadius: '0.375rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Link
                          href={'/quiz/' + quiz.slug}
                          style={{
                            color: C.ACCENT,
                            textDecoration: 'none',
                            fontWeight: '500',
                            flex: 1,
                          }}
                        >
                          {quiz.title}
                        </Link>
                        {isOwnerOrAdmin && (
                          <button
                            onClick={async function() {
                              if (!confirm('Remove this quiz from the team?')) return;
                              try {
                                var res = await fetch(
                                  API + '/api/teams/' + selectedTeam.id + '/quizzes/' + quiz.id,
                                  {
                                    method: 'DELETE',
                                    headers: { Authorization: 'Bearer ' + token },
                                  }
                                );
                                if (!res.ok) throw new Error('Failed to remove quiz');
                                await fetchTeamQuizzes();
                              } catch (err: any) {
                                setError(err.message);
                              }
                            }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              background: C.DANGER_LIGHT,
                              color: C.DANGER,
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedTeam && (
            <div style={{ padding: '2rem', color: C.TEXT_MUTED, textAlign: 'center' }}>
              No teams yet. Create one to get started.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
