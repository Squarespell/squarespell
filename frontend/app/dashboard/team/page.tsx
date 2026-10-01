'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { DisplayTitle, PageLoading, SettingsTabs } from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

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
  var [memberTab, setMemberTab] = useState<'members' | 'quizzes' | 'invites'>('members');
  var [moreOpen, setMoreOpen] = useState(false);
  var [planInfo, setPlanInfo] = useState<{ plan: string; limits?: Record<string, number>; email?: string } | null>(null);

  useEffect(function () {
    if (!token) return;
    fetch(API + '/api/user/plan', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) setPlanInfo(d); })
      .catch(function () {});
  }, [token]);

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
        var list = Array.isArray(data) ? data : (data && Array.isArray(data.teams) ? data.teams : []);
        setTeams(list);
        if (list.length > 0 && !selectedTeam) setSelectedTeam(list[0]);
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
      if (res.ok) { var data = await res.json(); setTeamQuizzes(Array.isArray(data) ? data : []); }
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
      if (!res.ok) { var errData: any = {}; try { errData = await res.json(); } catch {} throw new Error(errData.error || 'Failed to create team'); }
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
      if (!res.ok) { var errData: any = {}; try { errData = await res.json(); } catch {} throw new Error(errData.error || 'Failed to invite member'); }
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

  async function handleDeleteTeam() {
    if (!selectedTeam || !confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;
    try {
      var res = await fetch(API + '/api/teams/' + selectedTeam.id, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to delete team');
      setSuccess('Team deleted');
      setTimeout(function () { setSuccess(''); }, 3000);
      setSelectedTeam(null);
      await fetchTeams();
    } catch (err: any) { setError(err.message); }
  }

  var isOwnerOrAdmin = selectedTeam && (selectedTeam.user_role === 'owner' || selectedTeam.user_role === 'admin');
  var isOwner = selectedTeam && selectedTeam.user_role === 'owner';

  var ROLE_INFO: { role: TeamRole; label: string; desc: string; icon: string }[] = [
    { role: 'owner', label: 'Owner', desc: 'Full access. Can manage the team, billing and all settings.', icon: 'M3 8l4 3 5-6 5 6 4-3-2 11H5z' },
    { role: 'admin', label: 'Admin', desc: 'Can manage members and content (no billing access).', icon: 'M12 11a4 4 0 100-8 4 4 0 000 8zM5 21c0-3.9 3.1-7 7-7s7 3.1 7 7' },
    { role: 'editor', label: 'Editor', desc: 'Can create and edit quizzes, templates and content.', icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z' },
    { role: 'viewer', label: 'Viewer', desc: 'Can view quizzes and results (read-only access).', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z' },
  ];
  var ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };
  var PLAN_LABEL: Record<string, string> = { core: 'Core', pro: 'Pro', business: 'Business', trial: 'Trial', free: 'Free', starter: 'Core', growth: 'Pro', agency: 'Business' };

  var inputStyle: React.CSSProperties = { width: '100%', height: 46, padding: '0 14px', border: '1px solid ' + C.BORDER, borderRadius: 6, fontSize: 15, fontFamily: C.FONT, color: C.INK, background: '#fff' };

  if (authStatus === 'loading' || pageLoading) {
    return <DashboardShell title="Team"><PageLoading /></DashboardShell>;
  }

  var members = (selectedTeam?.members || []);
  var activeMembers = members.filter(function (m) { return m.role === 'owner' || !!m.accepted_at; });
  var pendingInvites = members.filter(function (m) { return m.role !== 'owner' && !m.accepted_at; });
  var planKey = (planInfo?.plan || '').toLowerCase();
  var planName = PLAN_LABEL[planKey] || (planInfo?.plan || '');
  var seatsText = planKey === 'business' || planKey === 'agency' ? '3 included' : planKey === 'trial' ? 'Trial' : 'Business plan';
  function unl(n?: number) { return n == null || n < 0 || n >= 999999 ? 'Unlimited' : n.toLocaleString(); }
  function nameOf(m: TeamMember) { var n = (m.email || '').split('@')[0]; return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Member'; }

  var th: React.CSSProperties = { textAlign: 'left', padding: '12px 10px', fontSize: 14, fontWeight: 400, color: C.GRAY_500, borderBottom: '1px solid ' + C.BORDER };
  var td: React.CSSProperties = { padding: '12px 10px', fontSize: 15, color: C.INK, borderBottom: '1px solid ' + C.BORDER_LIGHT };

  return (
    <DashboardShell title="Team">
      <style dangerouslySetInnerHTML={{ __html: `
        .tm-grid { display: grid; grid-template-columns: 260px minmax(0, 1fr) 340px; gap: 24px; align-items: start; }
        .tm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 20px; border-radius: 6px; border: 1px solid ${C.BORDER}; background: #fff; color: ${C.INK}; font: 500 15px ${C.FONT}; cursor: pointer; text-decoration: none; white-space: nowrap; }
        .tm-btn:hover { border-color: ${C.GRAY_300}; }
        .tm-primary { background: ${C.ACCENT}; border-color: ${C.ACCENT}; color: #fff; }
        .tm-primary:hover { background: ${C.ACCENT_HOVER}; }
        @media (max-width: 1250px) { .tm-grid { grid-template-columns: 1fr; } }
      ` }} />

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: C.ACCENT, background: C.GRAY_50, border: '1px solid ' + C.BORDER, padding: '6px 13px', borderRadius: 999, marginBottom: 16 }}><i style={{ width: 6, height: 6, borderRadius: '50%', background: C.ACCENT, display: 'inline-block' }} />Team</div>
        <DisplayTitle size="xl">Better quizzes, together.</DisplayTitle>
        <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>Manage your teams and collaborate with your members.</p>
      </div>

      <SettingsTabs />

      {error && <div role="alert" style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 6, background: C.DANGER_LIGHT, color: C.DANGER, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>{error}<button type="button" aria-label="Dismiss" onClick={function () { setError(''); }} style={{ border: 'none', background: 'none', color: C.DANGER, cursor: 'pointer', fontSize: 16 }}>×</button></div>}
      {success && <div role="status" style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 6, background: C.SUCCESS_LIGHT, color: C.SUCCESS_700, fontSize: 14 }}>{success}</div>}

      <div className="tm-grid">
        {/* Plan + help */}
        <aside style={{ display: 'grid', gap: 16 }}>
          <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '20px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: C.GRAY_500 }}>YOUR PLAN</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.INK, marginTop: 8 }}>{planName ? planName + ' plan' : '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.SUCCESS_700, marginTop: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.SUCCESS_500 }} />Active</div>
            <ul style={{ listStyle: 'none', margin: '16px 0', padding: 0, display: 'grid', gap: 10, fontSize: 14 }}>
              {[['Leads', unl(planInfo?.limits?.leads)], ['Quizzes', unl(planInfo?.limits?.quizzes)], ['Team members', seatsText]].map(function (r) {
                return <li key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', color: C.GRAY_700 }}><span>✓ {r[0]}</span><span style={{ color: C.SUCCESS_700 }}>{r[1]}</span></li>;
              })}
            </ul>
            <Link href="/dashboard/billing" className="tm-btn" style={{ width: '100%' }}>Manage plan</Link>
          </section>
          <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>Need help?</div>
            <p style={{ margin: '6px 0 12px', fontSize: 14, color: C.GRAY_600 }}>Learn more about teams in our help center.</p>
            <a href="/support" target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, color: C.ACCENT, textDecoration: 'none' }}>View documentation</a>
          </section>
        </aside>

        {/* Team workspace */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {teams.length > 0 && (
              <label style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, height: 54, padding: '0 14px', border: '1px solid ' + C.BORDER, borderRadius: 6, background: '#fff' }}>
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Select team</span>
                <select value={selectedTeam?.id || ''} onChange={function (e) { var t = teams.find(function (x) { return x.id === e.target.value; }); if (t) { setSelectedTeam(t); setMemberTab('members'); } }}
                  style={{ border: 'none', background: 'transparent', fontSize: 16, fontFamily: C.FONT, color: C.INK, cursor: 'pointer', minWidth: 160 }}>
                  {teams.map(function (t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}
                </select>
              </label>
            )}
            <button type="button" className="tm-btn tm-primary" style={{ height: 54 }} onClick={function () { setShowCreate(true); }}>+ New team</button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: 10, marginBottom: 16, padding: 16, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, flexWrap: 'wrap' }}>
              <input aria-label="Team name" autoFocus value={newTeamName} onChange={function (e) { setNewTeamName(e.target.value); }} placeholder="Team name" style={{ ...inputStyle, flex: '1 1 240px' }} />
              <button type="submit" className="tm-btn tm-primary" disabled={saving || !newTeamName.trim()}>{saving ? 'Creating...' : 'Create team'}</button>
              <button type="button" className="tm-btn" onClick={function () { setShowCreate(false); setNewTeamName(''); }}>Cancel</button>
            </form>
          )}

          {!selectedTeam ? (
            <section style={{ padding: '48px 24px', textAlign: 'center', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
              <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 26, fontWeight: 500, color: C.INK }}>No teams yet</div>
              <p style={{ margin: '6px 0 18px', fontSize: 16, color: C.GRAY_600 }}>Create a team to invite members and collaborate. Team seats are included with the Business plan.</p>
              <button type="button" className="tm-btn tm-primary" onClick={function () { setShowCreate(true); }}>+ New team</button>
            </section>
          ) : (
            <>
              <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                  <span style={{ width: 56, height: 56, borderRadius: 6, background: C.PERIWINKLE_SOFT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.ACCENT }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M17 11a3 3 0 100-6M22 21c0-3-1.8-5-4.5-5.7" /></svg>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 26, fontWeight: 500, color: C.INK }}>{selectedTeam.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.GRAY_500, marginTop: 2 }}>
                      {selectedTeam.created_at && <span>Created {new Date(selectedTeam.created_at).toLocaleDateString()}</span>}
                      <span>· {activeMembers.length} {activeMembers.length === 1 ? 'member' : 'members'}</span>
                      <span style={{ padding: '2px 10px', borderRadius: 4, background: C.PERIWINKLE_SOFT, color: C.BRAND_700 }}>{ROLE_LABEL[selectedTeam.user_role] || selectedTeam.user_role}</span>
                    </div>
                  </div>
                  {isOwnerOrAdmin && <button type="button" className="tm-btn tm-primary" onClick={function () { setInviteOpen(true); }}>+ Invite member</button>}
                  {isOwner && (
                    <div style={{ position: 'relative' }}>
                      <button type="button" className="tm-btn" aria-label="More team actions" aria-haspopup="menu" aria-expanded={moreOpen} onClick={function () { setMoreOpen(!moreOpen); }} style={{ width: 44, padding: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                      </button>
                      {moreOpen && (
                        <div role="menu" style={{ position: 'absolute', right: 0, top: 50, zIndex: 20, minWidth: 170, padding: 6, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, boxShadow: C.SHADOW_LG }}>
                          <button type="button" role="menuitem" onClick={function () { setMoreOpen(false); handleDeleteTeam(); }} style={{ display: 'block', width: '100%', padding: '9px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: 14, color: C.DANGER, cursor: 'pointer', borderRadius: 6 }}>Delete team</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {inviteOpen && (
                  <form onSubmit={handleInviteMember} style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                    <input aria-label="Email address" type="email" autoFocus value={inviteEmail} onChange={function (e) { setInviteEmail(e.target.value); }} placeholder="name@company.com" style={{ ...inputStyle, flex: '1 1 240px' }} />
                    <select aria-label="Role" value={inviteRole} onChange={function (e) { setInviteRole(e.target.value as TeamRole); }} style={{ ...inputStyle, width: 150, cursor: 'pointer' }}>
                      <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                    </select>
                    <button type="submit" className="tm-btn tm-primary" disabled={saving || !inviteEmail.trim()}>{saving ? 'Sending...' : 'Send invite'}</button>
                    <button type="button" className="tm-btn" onClick={function () { setInviteOpen(false); setInviteEmail(''); }}>Cancel</button>
                  </form>
                )}

                <div role="tablist" aria-label="Team" style={{ display: 'flex', gap: 28, borderBottom: '1px solid ' + C.BORDER, marginTop: 20 }}>
                  {([['members', 'Members (' + activeMembers.length + ')'], ['quizzes', 'Shared quizzes (' + teamQuizzes.length + ')'], ['invites', 'Invitations (' + pendingInvites.length + ')']] as const).map(function (t) {
                    var active = memberTab === t[0];
                    return <button key={t[0]} type="button" role="tab" aria-selected={active} onClick={function () { setMemberTab(t[0]); }} style={{ padding: '0 2px 12px', marginBottom: -1, border: 'none', borderBottom: '2px solid ' + (active ? C.ACCENT : 'transparent'), background: 'none', fontSize: 15, fontWeight: active ? 600 : 400, color: active ? C.ACCENT : C.GRAY_600, cursor: 'pointer', fontFamily: C.FONT }}>{t[1]}</button>;
                  })}
                </div>

                {memberTab === 'members' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                    <thead><tr><th style={th}>Member</th><th style={th}>Role</th><th style={th}>Status</th><th style={th}>Joined</th><th style={th} /></tr></thead>
                    <tbody>
                      {activeMembers.map(function (m) {
                        var canEdit = isOwnerOrAdmin && m.role !== 'owner';
                        return (
                          <tr key={m.id}>
                            <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 36, height: 36, borderRadius: '50%', background: C.INK, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{nameOf(m).charAt(0)}</span><span><span style={{ display: 'block' }}>{nameOf(m)}</span>{canEdit && <span style={{ display: 'block', fontSize: 13, color: C.GRAY_500 }}>{m.email}</span>}</span></div></td>
                            <td style={td}>
                              {canEdit ? (
                                <select aria-label={'Role for ' + nameOf(m)} value={m.role} onChange={function (e) { handleUpdateRole(m.user_id, e.target.value as TeamRole); }} style={{ height: 34, padding: '0 8px', borderRadius: 6, border: '1px solid ' + C.BORDER, fontSize: 14, fontFamily: C.FONT, background: '#fff' }}>
                                  <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                                </select>
                              ) : <span style={{ padding: '3px 10px', borderRadius: 4, background: C.PERIWINKLE_SOFT, color: C.BRAND_700, fontSize: 13 }}>{ROLE_LABEL[m.role]}</span>}
                            </td>
                            <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.SUCCESS_500 }} />Active</span></td>
                            <td style={{ ...td, color: C.GRAY_600 }}>{new Date(m.accepted_at || m.created_at).toLocaleDateString()}</td>
                            <td style={{ ...td, textAlign: 'right' }}>{canEdit && <button type="button" onClick={function () { handleRemoveMember(m.user_id); }} style={{ border: 'none', background: 'none', color: C.DANGER, fontSize: 14, cursor: 'pointer' }}>Remove</button>}</td>
                          </tr>
                        );
                      })}
                      {activeMembers.length === 0 && <tr><td colSpan={5} style={{ ...td, color: C.GRAY_500, textAlign: 'center' }}>No members yet.</td></tr>}
                    </tbody>
                  </table>
                )}

                {memberTab === 'invites' && (
                  pendingInvites.length === 0 ? (
                    <div style={{ padding: '26px 0 8px', fontSize: 15, color: C.GRAY_600, textAlign: 'center' }}>No pending invitations.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {pendingInvites.map(function (m) {
                        return (
                          <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px', borderBottom: '1px solid ' + C.BORDER_LIGHT }}>
                            <span style={{ flex: 1, fontSize: 15, color: C.INK }}>{m.email}</span>
                            <span style={{ fontSize: 13, padding: '3px 10px', borderRadius: 4, background: C.WARNING_LIGHT, color: C.WARNING }}>Invited · {ROLE_LABEL[m.role]}</span>
                            {isOwnerOrAdmin && <button type="button" onClick={function () { handleRemoveMember(m.user_id); }} style={{ border: 'none', background: 'none', color: C.DANGER, fontSize: 14, cursor: 'pointer' }}>Revoke</button>}
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}

                {memberTab === 'quizzes' && (
                  teamQuizzes.length === 0 ? (
                    <div style={{ padding: '26px 0 8px', fontSize: 15, color: C.GRAY_600, textAlign: 'center' }}>No quizzes shared with this team yet.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {teamQuizzes.map(function (q) {
                        return (
                          <li key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px', borderBottom: '1px solid ' + C.BORDER_LIGHT }}>
                            <Link href={'/dashboard/' + q.id} style={{ flex: 1, fontSize: 15, color: C.INK, textDecoration: 'none' }}>{q.title}</Link>
                            {isOwnerOrAdmin && <button type="button" onClick={function () { handleRemoveQuiz(q.id); }} style={{ border: 'none', background: 'none', color: C.DANGER, fontSize: 14, cursor: 'pointer' }}>Remove</button>}
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}
              </section>

              {memberTab === 'members' && (
                <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
                  <div style={{ padding: '16px 22px', borderBottom: '1px solid ' + C.BORDER, fontSize: 17, fontWeight: 600, color: C.INK }}>Shared quizzes ({teamQuizzes.length})</div>
                  <div style={{ padding: '26px 22px', textAlign: 'center' }}>
                    {teamQuizzes.length === 0 ? (
                      <>
                        <div style={{ fontSize: 16, color: C.INK }}>No quizzes shared with this team yet.</div>
                        <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4 }}>Quizzes shared with the team appear here for everyone to work on.</div>
                      </>
                    ) : (
                      <button type="button" className="tm-btn" onClick={function () { setMemberTab('quizzes'); }}>View shared quizzes</button>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Role guide */}
        <aside>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: C.INK }}>Team roles</h2>
          <p style={{ margin: '6px 0 14px', fontSize: 15, color: C.GRAY_600 }}>Different levels of access for every need.</p>
          {ROLE_INFO.map(function (r, i) {
            return (
              <div key={r.role} style={{ display: 'flex', gap: 16, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid ' + C.BORDER }}>
                <span style={{ width: 48, height: 48, borderRadius: '50%', background: C.PERIWINKLE_SOFT, color: C.ACCENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={r.icon} /></svg>
                </span>
                <div><div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>{r.label}</div><div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 2, lineHeight: 1.45 }}>{r.desc}</div></div>
              </div>
            );
          })}
          <div style={{ position: 'relative', overflow: 'hidden', marginTop: 14, padding: '22px 22px', borderRadius: 8, background: C.PERIWINKLE_SOFT }}>
            <svg aria-hidden="true" width="110" height="100" viewBox="0 0 110 100" style={{ position: 'absolute', right: 0, bottom: 0 }}><path d="M110 0 L 110 100 L 10 100 Z" fill={C.ACCENT} /><circle cx="70" cy="86" r="16" fill={C.ACID} /></svg>
            <div style={{ position: 'relative', maxWidth: 220 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.INK }}>Build more together.</div>
              <div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 4 }}>Invite your team members to create, edit and share quizzes.</div>
            </div>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
