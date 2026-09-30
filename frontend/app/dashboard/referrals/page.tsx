'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { DisplayTitle, PageLoading, SettingsTabs } from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type ReferralStats = {
  totalReferred: number;
  converted: number;
  pending: number;
  rewardEarned: number;
};

type Referral = {
  id: string;
  referred_email: string;
  status: 'pending' | 'converted';
  created_at: string;
  converted_at: string | null;
};

/** Show enough of a referred address to recognise it without displaying it in full. */
function maskEmail(email: string): string {
  var at = (email || '').indexOf('@');
  if (at < 1) return email || 'Invited person';
  return email.charAt(0) + '•••' + email.slice(at);
}

export default function ReferralsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [loading, setLoading] = useState(true);
  var [stats, setStats] = useState<ReferralStats | null>(null);
  var [referrals, setReferrals] = useState<Referral[]>([]);
  var [referralUrl, setReferralUrl] = useState('');
  var [copied, setCopied] = useState(false);
  var [tab, setTab] = useState<'overview' | 'history'>('overview');

  useEffect(function () {
    try { if (new URLSearchParams(window.location.search).get('tab') === 'history') setTab('history'); } catch (e) {}
  }, []);

  function changeTab(t: 'overview' | 'history') {
    setTab(t);
    try {
      var url = new URL(window.location.href);
      if (t === 'history') url.searchParams.set('tab', 'history'); else url.searchParams.delete('tab');
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  useEffect(function () {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(API + '/api/referrals/code', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function (r) {
        if (!r.ok) throw new Error('Failed to get code');
        return r.json();
      }),
      fetch(API + '/api/referrals/stats', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function (r) {
        if (!r.ok) throw new Error('Failed to get stats');
        return r.json();
      }),
      fetch(API + '/api/referrals/list', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function (r) {
        if (!r.ok) throw new Error('Failed to get list');
        return r.json();
      }),
    ])
      .then(function ([codeData, statsData, listData]) {
        setReferralUrl(codeData.url || '');
        setStats(statsData);
        setReferrals(Array.isArray(listData?.referrals) ? listData.referrals : Array.isArray(listData) ? listData : []);
      })
      .catch(function (e) {
        console.error(e);
      })
      .finally(function () {
        setLoading(false);
      });
  }, [token]);

  function copyToClipboard() {
    if (!referralUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(referralUrl).then(function () {
          setCopied(true);
          setTimeout(function () { setCopied(false); }, 2000);
        }).catch(function () {
          fallbackCopy();
        });
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    var textarea = document.createElement('textarea');
    textarea.value = referralUrl;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(function () { setCopied(false); }, 2000);
  }

  if (authStatus === 'loading' || loading) {
    return <DashboardShell title="Referrals"><PageLoading /></DashboardShell>;
  }

  // rewardEarned comes from the API in dollars (reward_amount is 25 per conversion), not cents.
  var rewardDollars = stats?.rewardEarned || 0;
  var STEPS = [
    { t: 'Share your link', d: 'Send your unique referral link to friends, colleagues or your network.', icon: 'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7', bg: C.PERIWINKLE_SOFT },
    { t: 'They sign up', d: 'When someone signs up using your link, they appear in your referral list.', icon: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M19 8v6M16 11h6', bg: C.PERIWINKLE_SOFT },
    { t: 'They subscribe', d: 'When they subscribe to a paid plan, their status changes to Converted.', icon: 'M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2zM2 10h20', bg: C.ACID_SOFT },
    { t: 'You earn $25', d: 'You earn $25 in account credit for each conversion.', icon: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z', bg: C.PERIWINKLE_SOFT },
  ];
  var statCards = [
    { label: 'Total referred', value: String(stats?.totalReferred || 0), sub: 'People you’ve invited', bg: C.PERIWINKLE_SOFT, icon: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M17 11a3 3 0 100-6M22 21c0-3-1.8-5-4.5-5.7' },
    { label: 'Converted', value: String(stats?.converted || 0), sub: 'Completed signup and payment', bg: C.ACID_SOFT, icon: 'M22 11.1V12a10 10 0 11-5.9-9.1M22 4 12 14l-3-3' },
    { label: 'Pending', value: String(stats?.pending || 0), sub: 'Signed up, not yet subscribed', bg: C.PERIWINKLE_SOFT, icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2' },
    { label: 'Rewards earned', value: '$' + rewardDollars.toFixed(2), sub: 'In account credit', bg: C.ACID_SOFT, icon: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z' },
  ];

  var th: React.CSSProperties = { textAlign: 'left', padding: '14px 22px', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.GRAY_500, background: C.GRAY_25, borderBottom: '1px solid ' + C.BORDER };
  var td: React.CSSProperties = { padding: '14px 22px', fontSize: 15, color: C.INK, borderBottom: '1px solid ' + C.BORDER_LIGHT };

  var copyBtn = (
    <button type="button" onClick={copyToClipboard} disabled={!referralUrl}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10, height: 50, padding: '0 22px', borderRadius: 6, border: 'none', background: C.ACCENT, color: '#fff', fontSize: 16, fontWeight: 500, fontFamily: C.FONT, cursor: referralUrl ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );

  var history = (
    <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, overflow: 'hidden' }}>
      <h2 style={{ margin: 0, padding: '20px 22px', fontSize: 21, fontWeight: 600, color: C.INK }}>Referral history</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead><tr><th style={th}>Referral</th><th style={th}>Status</th><th style={th}>Joined</th><th style={th}>Reward</th></tr></thead>
          <tbody>
            {referrals.map(function (r) {
              var conv = r.status === 'converted';
              return (
                <tr key={r.id}>
                  <td style={td}>{maskEmail(r.referred_email)}</td>
                  <td style={td}><span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 13, background: conv ? C.SUCCESS_LIGHT : C.WARNING_LIGHT, color: conv ? C.SUCCESS_700 : C.WARNING }}>{conv ? 'Converted' : 'Pending'}</span></td>
                  <td style={{ ...td, color: C.GRAY_600 }}>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td style={td}>{conv ? '$25.00' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {referrals.length === 0 && (
        <div style={{ padding: '40px 20px 44px', textAlign: 'center' }}>
          <span style={{ width: 72, height: 72, borderRadius: '50%', background: C.GRAY_50, border: '1px solid ' + C.BORDER, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.GRAY_600, marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></svg>
          </span>
          <div style={{ fontSize: 19, fontWeight: 600, color: C.INK }}>No referrals yet</div>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: C.GRAY_600 }}>Share your link to start earning rewards.</p>
        </div>
      )}
    </section>
  );

  return (
    <DashboardShell title="Referrals">
      <style dangerouslySetInnerHTML={{ __html: `
        .rf-hero { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr); gap: 32px; align-items: center; margin-bottom: 28px; }
        .rf-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
        .rf-lower { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr); gap: 20px; }
        .rf-steps { display: grid; grid-template-columns: 260px repeat(4, minmax(0, 1fr)); gap: 20px; align-items: start; }
        @media (max-width: 1150px) { .rf-hero, .rf-lower { grid-template-columns: 1fr; } .rf-stats { grid-template-columns: 1fr 1fr; } .rf-steps { grid-template-columns: 1fr 1fr; } }
      ` }} />

      <div className="rf-hero">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.GRAY_600, marginBottom: 14 }}>Referrals &amp; rewards</div>
          <DisplayTitle size="xl">{tab === 'history' ? 'Your referral activity.' : 'Share something worth sharing.'}</DisplayTitle>
          <p style={{ margin: '14px 0 0', fontSize: 'clamp(17px, 1.5vw, 21px)', color: C.GRAY_600 }}>{tab === 'history' ? 'Share Squarespell Quiz with your network and earn account credit.' : 'Invite others to Squarespell Quiz and earn rewards.'}</p>
        </div>
        <section aria-label="Refer a friend" style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, background: C.PERIWINKLE, minHeight: 230, padding: '30px 34px' }}>
          <svg aria-hidden="true" width="280" height="230" viewBox="0 0 280 230" preserveAspectRatio="xMaxYMid slice" style={{ position: 'absolute', right: 0, top: 0, height: '100%' }}>
            <rect x="0" y="0" width="280" height="230" fill={C.ACCENT} />
            <rect x="0" y="150" width="70" height="80" fill={C.ACID} />
            <rect x="70" y="70" width="70" height="80" fill="#fff" opacity="0.9" />
            <rect x="130" y="30" width="130" height="130" rx="4" fill="#fff" />
            <text x="148" y="80" fontSize="16" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif">Build</text>
            <text x="148" y="100" fontSize="16" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif">Create</text>
            <text x="148" y="120" fontSize="16" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif">Share</text>
            <text x="148" y="140" fontSize="16" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif">Grow</text>
            <path d="M216 62 L 244 42 M 230 42 L 244 42 L 244 56" stroke={C.INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'relative', maxWidth: '58%' }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: C.GRAY_700, marginBottom: 12 }}>REFER A FRIEND</div>
            <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 'clamp(28px, 2.8vw, 42px)', fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, color: C.INK }}>Give your network better quizzes.</div>
            <div style={{ fontFamily: C.SERIF_FONT, fontSize: 'clamp(30px, 3vw, 46px)', lineHeight: 1.1, color: C.INK, marginTop: 6 }}>Earn $25 in credit<span style={{ color: C.ACCENT }}>.</span></div>
          </div>
        </section>
      </div>

      <SettingsTabs />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div role="tablist" aria-label="Referrals" style={{ display: 'flex', gap: 8 }}>
          {(['overview', 'history'] as const).map(function (t) {
            var active = tab === t;
            return <button key={t} type="button" role="tab" aria-selected={active} onClick={function () { changeTab(t); }} style={{ height: 44, padding: '0 24px', borderRadius: 999, border: '1px solid ' + (active ? C.ACCENT : C.BORDER), background: active ? C.ACCENT : '#fff', color: active ? '#fff' : C.INK, fontSize: 16, fontFamily: C.FONT, cursor: 'pointer' }}>{t === 'overview' ? 'Overview' : 'History'}</button>;
          })}
        </div>
      </div>

      {/* Referral link */}
      <section style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 26px', marginBottom: 20, background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.INK }}>Your referral link</div>
          <div style={{ fontSize: 15, color: C.GRAY_600, marginTop: 2 }}>Share this link with your network to earn rewards.</div>
        </div>
        <input readOnly aria-label="Your referral link" value={referralUrl || 'Link unavailable right now'} onFocus={function (e) { e.currentTarget.select(); }}
          style={{ flex: '1 1 320px', height: 50, padding: '0 16px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: C.GRAY_25, fontSize: 16, fontFamily: C.FONT, color: C.INK }} />
        {copyBtn}
      </section>

      {tab === 'overview' ? (
        <>
          <div className="rf-stats">
            {statCards.map(function (s) {
              return (
                <div key={s.label} className="stat" style={{ display: 'flex', gap: 18, padding: '22px 22px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
                  <span style={{ width: 58, height: 58, borderRadius: '50%', background: s.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.INK, flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.icon} /></svg>
                  </span>
                  <div>
                    <div style={{ fontSize: 16, color: C.GRAY_600 }}>{s.label}</div>
                    <div style={{ fontFamily: C.DISPLAY_FONT, fontSize: 32, fontWeight: 500, color: C.INK, lineHeight: 1.15, marginTop: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 14, color: C.GRAY_500, marginTop: 4 }}>{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rf-lower">
            {history}
            <section style={{ background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, padding: '22px 24px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 21, fontWeight: 600, color: C.INK }}>How it works</h2>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {STEPS.map(function (st, i) {
                  return (
                    <li key={st.t} style={{ position: 'relative', display: 'flex', gap: 16, paddingBottom: i < STEPS.length - 1 ? 20 : 0 }}>
                      {i < STEPS.length - 1 && <span aria-hidden="true" style={{ position: 'absolute', left: 17, top: 40, bottom: 4, borderLeft: '1px solid ' + C.BORDER }} />}
                      <span style={{ width: 36, height: 36, borderRadius: '50%', background: C.PERIWINKLE_SOFT, color: C.ACCENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                      <div><div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>{st.t}</div><div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 2, lineHeight: 1.45 }}>{st.d}</div></div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="rf-lower" style={{ marginBottom: 20 }}>
            {history}
            <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, background: C.PERIWINKLE_SOFT, padding: '30px 30px' }}>
              <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute', right: 0, top: 0 }}><path d="M120 0 V 110 A 110 110 0 0 1 10 0 Z" fill={C.ACCENT} /></svg>
              <svg aria-hidden="true" width="80" height="90" viewBox="0 0 80 90" style={{ position: 'absolute', right: 0, bottom: 120 }}><path d="M80 0 V 80 A 80 80 0 0 1 0 0 Z" fill={C.ACID} opacity="0.8" transform="rotate(180 40 40)" /></svg>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: C.GRAY_700, marginBottom: 22 }}>REFERRAL REWARDS</div>
                <div style={{ fontFamily: C.SERIF_FONT, fontSize: 'clamp(36px, 3.4vw, 54px)', lineHeight: 1, color: C.INK }}>Rewards are account credit.</div>
                <p style={{ margin: '16px 0 6px', fontSize: 17, color: C.GRAY_700, lineHeight: 1.5 }}>When someone subscribes to a paid plan using your link, you’ll earn</p>
                <div style={{ fontFamily: C.SERIF_FONT, fontSize: 'clamp(70px, 6vw, 96px)', lineHeight: 1, color: C.ACCENT }}>$25</div>
                <div style={{ fontSize: 17, color: C.GRAY_700, marginTop: 8 }}>in account credit for each conversion.</div>
              </div>
            </section>
          </div>
          <section className="rf-steps" style={{ padding: '26px 28px', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: C.GRAY_600, marginBottom: 12 }}>HOW IT WORKS</div>
              <div style={{ fontFamily: C.SERIF_FONT, fontSize: 36, lineHeight: 1.05, color: C.INK }}>Four simple steps to earn rewards.</div>
            </div>
            {STEPS.map(function (st) {
              return (
                <div key={st.t} style={{ display: 'flex', gap: 14 }}>
                  <span style={{ width: 56, height: 56, borderRadius: 8, background: st.bg, color: C.INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={st.icon} /></svg>
                  </span>
                  <div><div style={{ fontSize: 16, fontWeight: 600, color: C.INK }}>{st.t}</div><div style={{ fontSize: 14, color: C.GRAY_600, marginTop: 4, lineHeight: 1.45 }}>{st.d}</div></div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </DashboardShell>
  );
}
