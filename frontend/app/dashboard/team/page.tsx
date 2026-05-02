'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';
type TeamMember = {
  id: string; team_id: string; user_id: string; email: string;
  role: TeamRole; invited_by?: string; accepted_at?: string; created_at: string;
};
type Team = {
  id: string; name: string; owner_id: string;
  created_at: string; updated_at: string; user_role: TeamRole;
  members?: TeamMember[];
};
type TeamQuiz = { id: string; title: string; slug: string; created_at: string };

/* ── shared card ── */
var cardBase: React.CSSProperties = {
  background: '#fff', border: '1px solid ' + C.GRAY_200,
  borderRadius: 16, boxShadow: C.SHADOW_XS,
};

/* ── Team People illustration ── */
function TeamIllustration() {
  return (
    <div style={{ position: 'relative', width: 160, height: 140, margin: '0 auto 28px' }}>
      {/* Large circle background */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 130, height: 130, borderRadius: '50%',
        background: 'radial-gradient(circle, ' + C.GRAY_100 + ' 0%, ' + C.GRAY_50 + ' 60%, transparent 80%)',
      }} />
      {/* People group icon */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -55%)',
      }}>
        <svg width="80" height="56" viewBox="0 0 80 56" fill="none">
          {/* Left person */}
          <circle cx="18" cy="16" r="8" fill={C.GRAY_300} />
          <path d="M6 44c0-6.627 5.373-12 12-12s12 5.373 12 12" fill={C.GRAY_300} />
          {/* Center person (front, slightly larger) */}
          <circle cx="40" cy="12" r="10" fill={C.GRAY_300} />
          <path d="M24 48c0-8.837 7.163-16 16-16s16 7.163 16 16" fill={C.GRAY_300} />
          {/* Right person */}
          <circle cx="62" cy="16" r="8" fill={C.GRAY_300} />
          <path d="M50 44c0-6.627 5.373-12 12-12s12 5.373 12 12" fill={C.GRAY_300} />
        </svg>
      </div>
      {/* + badge (bottom-right of people) */}
      <div style={{
        position: 'absolute', bottom: 18, right: 28,
        width: 28, height: 28, borderRadius: '50%',
        background: C.ACCENT, display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 2,
        boxShadow: '0 2px 4px rgba(13, 115, 119, 0.3)',
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      {/* Sparkles */}
      <svg width="12" height="12" viewBox="0 0 14 14" style={{ position: 'absolute', top: 14, left: 20 }}>
        <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.3" />
      </svg>
      <svg width="8" height="8" viewBox="0 0 14 14" style={{ position: 'absolute', top: 6, left: 40 }}>
        <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.2" />
      </svg>
      <svg width="10" height="10" viewBox="0 0 14 14" style={{ position: 'absolute', top: 10, right: 18 }}>
        <path d="M7 0l1.5 5.5L14 7l-5.5 1.5L7 14l-1.5-5.5L0 7l5.5-1.5z" fill={C.ACCENT} opacity="0.45" />
      </svg>
      {/* Small decorative diamonds */}
      <svg width="8" height="8" viewBox="0 0 10 10" style={{ position: 'absolute', bottom: 38, left: 14 }}>
        <path d="M5 0L6.5 3.5L10 5L6.5 6.5L5 10L3.5 6.5L0 5L3.5 3.5Z" fill={C.ACCENT} opacity="0.25" />
      </svg>
      <svg width="6" height="6" viewBox="0 0 10 10" style={{ position: 'absolute', top: 36, right: 10 }}>
        <path d="M5 0L6.5 3.5L10 5L6.5 6.5L5 10L3.5 6.5L0 5L3.5 3.5Z" fill={C.ACCENT} opacity="0.2" />
      </svg>
    </div>
  );
}

/* ── page ── */
export default function TeamPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [teams, setTeams] = useState<Team[]>([]);
  var [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  var [teamQuizzes, setTeamQuizzes] = useState<TeamQuiz[]>([]);
  var [showCreate, setShowCreate] = useState(false);
  var [newTeamName, setNewTeamName] = useState('');
  var [inviteOpen, setInviteOpen] = useState(false);
  var [inviteEmail, setInviteEmail] = useState('');
  var [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  var [loading, setLoading] = useState(false);
  var [pageLoading, setPageLoading] = useState(true);
  var [error, setError] = useState('');
  var [success, setSuccess] = useState('');
  var [saving, setSaving] = useState(false);

  useEffect(function () {
    if (!token || authStatus === 'loading') return;
    fetchTeams();
  }, [token, authStatus]);

  useEffect(function () {
    if (!selectedTeam || !token) return;
    fetchTeamDetails();
    fetchTeamQuizzes();
  }, [selectedTeam?.id, token]);

  async function fetchTeams() {
    try {
      var res = await fetch(API + '/api/teams', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        var data = await res.json();
        setTeams(data);
        if (data.length > 0 && !selectedTeam) setSelectedTeam(data[0]);
      }
    } catch (err: any) { console.error(err); }
    setPageLoading(false);
  }

  async function fetchTeamDetails() {
    if (!selectedTeam) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) { var data = await res.json(); setSelectedTeam(data); }
    } catch (err: any) { console.error(err); }
  }

  async function fetchTeamQuizzes() {
    if (!selectedTeam) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/quizzes', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) { var data = await res.json(); setTeamQuizzes(data); }
    } catch (err: any) { console.error(err); }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setSaving(true); setError('');
    try {
      var res = await fetch(API + '/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (!res.ok) { var errData = await res.json(); throw new Error(errData.error || 'Failed to create team'); }
      var newTeam = await res.json();
      setTeams(function (prev) { return [...prev, newTeam]; });
      setSelectedTeam(newTeam);
      setNewTeamName(''); setShowCreate(false);
      setSuccess('Team created successfully');
      setTimeout(function () { setSuccess(''); }, 3000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam || !inviteEmail.trim()) return;
    setSaving(true); setError('');
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) { var errData = await res.json(); throw new Error(errData.error || 'Failed to invite member'); }
      setInviteEmail(''); setInviteRole('editor'); setInviteOpen(false);
      setSuccess('Member invited successfully');
      setTimeout(function () { setSuccess(''); }, 3000);
      await fetchTeamDetails();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedTeam || !confirm('Remove this member from the team?')) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/members/' + userId, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to remove member');
      setSuccess('Member removed');
      setTimeout(function () { setSuccess(''); }, 3000);
      await fetchTeamDetails();
    } catch (err: any) { setError(err.message); }
  }

  async function handleUpdateRole(userId: string, newRole: TeamRole) {
    if (!selectedTeam) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/members/' + userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      setSuccess('Role updated');
      setTimeout(function () { setSuccess(''); }, 3000);
      await fetchTeamDetails();
    } catch (err: any) { setError(err.message); }
  }

  async function handleRemoveQuiz(quizId: string) {
    if (!selectedTeam || !confirm('Remove this quiz from the team?')) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id + '/quizzes/' + quizId, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to remove quiz');
      await fetchTeamQuizzes();
    } catch (err: any) { setError(err.message); }
  }

  var isOwnerOrAdmin = selectedTeam && (selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'admin');

  /* ── input style ── */
  var inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid ' + C.GRAY_200,
    borderRadius: 10, fontSize: 14, fontFamily: C.FONT, color: C.GRAY_900,
    outline: 'none', boxSizing: 'border-box', background: '#fff',
  };

  if (authStatus === 'loading' || pageLoading) {
    return (
      <DashboardShell title="Teams">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: C.FONT, color: C.GRAY_400, fontSize: 14 }}>Loading...</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Teams">
      <style>{`
        .tm-create:hover { background: ${C.ACCENT_HOVER} !important; }
        .tm-card:hover { box-shadow: ${C.SHADOW_MD}; border-color: ${C.GRAY_300}; }
        .tm-action:hover { background: ${C.GRAY_50} !important; }
        .tm-info:hover { box-shadow: ${C.SHADOW_MD}; }
        .tm-input:focus { border-color: ${C.ACCENT} !important; box-shadow: ${C.FOCUS_RING} !important; }
        .tm-team-btn:hover { background: ${C.GRAY_50} !important; border-color: ${C.GRAY_300} !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.3 }}>
            Teams
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
            Manage your teams and collaborate with your members.
          </p>
        </div>
        <button type="button" className="tm-create"
          onClick={function () { setShowCreate(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 600,
            fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS, whiteSpace: 'nowrap',
          }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Team
        </button>
      </div>

      {/* ── Error / Success ── */}
      {error && (
        <div style={{
          padding: '10px 16px', background: C.DANGER_LIGHT,
          border: '1px solid #FEE4E2', borderRadius: 10,
          color: C.DANGER, fontSize: 13, fontFamily: C.FONT, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {error}
          <button onClick={function () { setError(''); }} style={{ background: 'none', border: 'none', color: C.DANGER, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&times;</button>
        </div>
      )}
      {success && (
        <div style={{
          padding: '10px 16px', background: C.SUCCESS_LIGHT,
          border: '1px solid #D1FAE5', borderRadius: 10,
          color: C.SUCCESS, fontSize: 13, fontFamily: C.FONT, marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {success}
          <button onClick={function () { setSuccess(''); }} style={{ background: 'none', border: 'none', color: C.SUCCESS, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&times;</button>
        </div>
      )}

      {/* ── No teams empty state ── */}
      {teams.length === 0 && !selectedTeam ? (
        <>
          <div style={{
            ...cardBase, padding: '48px 24px 44px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20,
          }}>
            <TeamIllustration />

            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, margin: '0 0 8px' }}>
              You don't have any teams yet
            </h3>
            <p style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT, margin: '0 0 28px', textAlign: 'center', maxWidth: 380, lineHeight: 1.5 }}>
              Create your first team to start collaborating with your members.
            </p>

            <button type="button" className="tm-create"
              onClick={function () { setShowCreate(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: C.ACCENT, color: '#fff', fontSize: 15, fontWeight: 600,
                fontFamily: C.FONT, cursor: 'pointer', boxShadow: C.SHADOW_XS,
              }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create your first team
            </button>
          </div>

          {/* ── Bottom info cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { iconBg: C.BRAND_50, title: 'Collaborate', desc: 'Work together with your team members',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
              { iconBg: C.BRAND_50, title: 'Organize', desc: 'Keep your projects and work organized',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
              { iconBg: C.BRAND_50, title: 'Grow', desc: 'Scale your business with your team',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg> },
            ].map(function (card, i) {
              return (
                <div key={i} className="tm-info" style={{
                  ...cardBase, padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start',
                  transition: 'box-shadow 0.2s',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: card.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {card.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>{card.title}</div>
                    <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>{card.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Teams list + detail view ── */
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Team sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teams.map(function (team) {
              var active = selectedTeam?.id === team.id;
              return (
                <button key={team.id} type="button" className="tm-team-btn"
                  onClick={function () { setSelectedTeam(team); }}
                  style={{
                    padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                    background: active ? C.BRAND_25 : '#fff',
                    border: '1px solid ' + (active ? C.ACCENT : C.GRAY_200),
                    borderLeft: active ? '3px solid ' + C.ACCENT : '1px solid ' + C.GRAY_200,
                    borderRadius: 12, fontFamily: C.FONT, fontSize: 14,
                    fontWeight: active ? 600 : 500, color: active ? C.ACCENT : C.GRAY_700,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: active ? C.BRAND_50 : C.GRAY_100,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? C.ACCENT : C.GRAY_400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div>{team.name}</div>
                      <div style={{ fontSize: 12, color: C.GRAY_400, fontWeight: 400, marginTop: 2 }}>
                        {team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Team detail */}
          {selectedTeam && (
            <div>
              {/* Team header */}
              <div style={{ ...cardBase, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>{selectedTeam.name}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT }}>
                      Created {new Date(selectedTeam.created_at).toLocaleDateString()}
                      <span style={{ color: C.GRAY_300, margin: '0 6px' }}>&middot;</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: C.BRAND_50, color: C.ACCENT,
                      }}>
                        {selectedTeam.user_role.charAt(0).toUpperCase() + selectedTeam.user_role.slice(1)}
                      </span>
                    </p>
                  </div>
                  {isOwnerOrAdmin && (
                    <button type="button" className="tm-create"
                      onClick={function () { setInviteOpen(true); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '9px 18px', borderRadius: 10, border: 'none',
                        background: C.ACCENT, color: '#fff', fontSize: 13, fontWeight: 600,
                        fontFamily: C.FONT, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3.333v9.334M3.333 8h9.334" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Invite Member
                    </button>
                  )}
                </div>
              </div>

              {/* Members section */}
              <div style={{ ...cardBase, padding: 0, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid ' + C.GRAY_200 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>
                    Members ({selectedTeam.members?.length || 0})
                  </h3>
                </div>
                {(!selectedTeam.members || selectedTeam.members.length === 0) ? (
                  <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>No members yet. Invite your first team member.</div>
                  </div>
                ) : (
                  selectedTeam.members.map(function (member, i) {
                    return (
                      <div key={member.id} style={{
                        padding: '14px 24px',
                        borderBottom: i < (selectedTeam.members?.length || 0) - 1 ? '1px solid ' + C.GRAY_100 : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Avatar */}
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: C.ACCENT, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: C.FONT,
                          }}>
                            {(member.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT }}>
                              {member.email}
                            </div>
                            <div style={{ fontSize: 12, color: C.GRAY_400, fontFamily: C.FONT, marginTop: 1 }}>
                              {member.accepted_at ? 'Active' : 'Pending invite'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          {isOwnerOrAdmin && member.role !== 'owner' ? (
                            <>
                              <select value={member.role}
                                onChange={function (e) { handleUpdateRole(member.user_id, e.target.value as TeamRole); }}
                                style={{
                                  padding: '6px 10px', border: '1px solid ' + C.GRAY_200,
                                  borderRadius: 8, background: '#fff', color: C.GRAY_700,
                                  fontSize: 12, fontWeight: 600, fontFamily: C.FONT,
                                  cursor: 'pointer', outline: 'none',
                                }}>
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button type="button" className="tm-action" onClick={function () { handleRemoveMember(member.user_id); }}
                                style={{
                                  padding: '6px 12px', border: '1px solid ' + C.GRAY_200,
                                  borderRadius: 8, background: '#fff', color: '#F04438',
                                  fontSize: 12, fontWeight: 600, fontFamily: C.FONT, cursor: 'pointer',
                                }}>
                                Remove
                              </button>
                            </>
                          ) : (
                            <span style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              fontFamily: C.FONT,
                              background: member.role === 'owner' ? C.BRAND_50 : C.GRAY_100,
                              color: member.role === 'owner' ? C.ACCENT : C.GRAY_500,
                            }}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Shared Quizzes */}
              <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid ' + C.GRAY_200 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>
                    Shared Quizzes ({teamQuizzes.length})
                  </h3>
                </div>
                {teamQuizzes.length === 0 ? (
                  <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>No quizzes shared with this team yet.</div>
                  </div>
                ) : (
                  teamQuizzes.map(function (quiz, i) {
                    return (
                      <div key={quiz.id} style={{
                        padding: '14px 24px',
                        borderBottom: i < teamQuizzes.length - 1 ? '1px solid ' + C.GRAY_100 : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, background: '#F4EBFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <Link href={'/quiz/' + quiz.slug} style={{
                            fontSize: 14, fontWeight: 600, color: C.ACCENT,
                            textDecoration: 'none', fontFamily: C.FONT,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {quiz.title}
                          </Link>
                        </div>
                        {isOwnerOrAdmin && (
                          <button type="button" className="tm-action"
                            onClick={function () { handleRemoveQuiz(quiz.id); }}
                            style={{
                              padding: '6px 12px', border: '1px solid ' + C.GRAY_200,
                              borderRadius: 8, background: '#fff', color: '#F04438',
                              fontSize: 12, fontWeight: 600, fontFamily: C.FONT,
                              cursor: 'pointer', flexShrink: 0,
                            }}>
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Team modal ── */}
      {showCreate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(16, 24, 40, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}
          onClick={function (e) { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28,
            width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(16, 24, 40, 0.18)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 24 }}>
              Create a new team
            </div>
            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_600, marginBottom: 6, fontFamily: C.FONT }}>Team name</label>
                <input type="text" className="tm-input" placeholder="e.g. Marketing team"
                  value={newTeamName} onChange={function (e) { setNewTeamName(e.target.value); }}
                  style={inputStyle} autoFocus />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={function () { setShowCreate(false); }}
                  style={{
                    padding: '10px 18px', borderRadius: 10, border: '1px solid ' + C.GRAY_200,
                    background: '#fff', color: C.GRAY_600, fontSize: 14, fontWeight: 600,
                    fontFamily: C.FONT, cursor: 'pointer',
                  }}>Cancel</button>
                <button type="submit" className="tm-create"
                  disabled={!newTeamName.trim() || saving}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: !newTeamName.trim() || saving ? C.GRAY_200 : C.ACCENT,
                    color: !newTeamName.trim() || saving ? C.GRAY_400 : '#fff',
                    fontSize: 14, fontWeight: 600, fontFamily: C.FONT,
                    cursor: !newTeamName.trim() || saving ? 'not-allowed' : 'pointer',
                  }}>
                  {saving ? 'Creating...' : 'Create team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Invite Member modal ── */}
      {inviteOpen && selectedTeam && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(16, 24, 40, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}
          onClick={function (e) { if (e.target === e.currentTarget) setInviteOpen(false); }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28,
            width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(16, 24, 40, 0.18)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 24 }}>
              Invite a team member
            </div>
            <form onSubmit={handleInviteMember}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_600, marginBottom: 6, fontFamily: C.FONT }}>Email</label>
                <input type="email" className="tm-input" placeholder="user@example.com"
                  value={inviteEmail} onChange={function (e) { setInviteEmail(e.target.value); }}
                  style={inputStyle} autoFocus />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.GRAY_600, marginBottom: 6, fontFamily: C.FONT }}>Role</label>
                <select value={inviteRole} onChange={function (e) { setInviteRole(e.target.value as TeamRole); }}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={function () { setInviteOpen(false); }}
                  style={{
                    padding: '10px 18px', borderRadius: 10, border: '1px solid ' + C.GRAY_200,
                    background: '#fff', color: C.GRAY_600, fontSize: 14, fontWeight: 600,
                    fontFamily: C.FONT, cursor: 'pointer',
                  }}>Cancel</button>
                <button type="submit" className="tm-create"
                  disabled={!inviteEmail.trim() || saving}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: !inviteEmail.trim() || saving ? C.GRAY_200 : C.ACCENT,
                    color: !inviteEmail.trim() || saving ? C.GRAY_400 : '#fff',
                    fontSize: 14, fontWeight: 600, fontFamily: C.FONT,
                    cursor: !inviteEmail.trim() || saving ? 'not-allowed' : 'pointer',
                  }}>
                  {saving ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
