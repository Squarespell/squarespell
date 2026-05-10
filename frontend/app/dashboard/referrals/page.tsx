'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';

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

/* ── shared card ── */
var cardBase: React.CSSProperties = {
  background: '#fff',
  border: '1px solid ' + C.GRAY_200,
  borderRadius: 16,
  boxShadow: C.SHADOW_XS,
};

/* ── Clipboard / Document illustration for empty state ── */
function ClipboardIllustration() {
  return (
    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 16px' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 72, height: 72, borderRadius: '50%',
        background: 'radial-gradient(circle, ' + C.GRAY_100 + ' 0%, ' + C.GRAY_50 + ' 60%, transparent 80%)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="3" width="14" height="18" rx="2" stroke={C.GRAY_300} strokeWidth="1.5" fill={C.GRAY_100} />
          <path d="M9 7h6M9 11h6M9 15h4" stroke={C.GRAY_400} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="8" y="1" width="8" height="4" rx="1" fill={C.GRAY_200} stroke={C.GRAY_300} strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

export default function ReferralsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [loading, setLoading] = useState(true);
  var [stats, setStats] = useState<ReferralStats | null>(null);
  var [referrals, setReferrals] = useState<Referral[]>([]);
  var [referralUrl, setReferralUrl] = useState('');
  var [copied, setCopied] = useState(false);

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
        setReferrals(listData.referrals || []);
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
    return (
      <DashboardShell title="Referrals">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: C.FONT, color: C.GRAY_400, fontSize: 14 }}>
          Loading...
        </div>
      </DashboardShell>
    );
  }

  /* ── stat card data ── */
  var statCards = [
    {
      label: 'Total Referred',
      value: String(stats?.totalReferred || 0),
      sub: "People you've invited",
      iconBg: C.BRAND_50,
      iconColor: C.ACCENT,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: 'Converted',
      value: String(stats?.converted || 0),
      sub: 'Completed signup & payment',
      iconBg: C.SUCCESS_LIGHT,
      iconColor: C.SUCCESS,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS_500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: 'Pending',
      value: String(stats?.pending || 0),
      sub: 'Awaiting signup',
      iconBg: C.GRAY_100,
      iconColor: C.GRAY_500,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'Rewards Earned',
      value: '$' + ((stats?.rewardEarned || 0) / 100).toFixed(2),
      sub: 'In account credit',
      iconBg: C.SUCCESS_LIGHT,
      iconColor: C.SUCCESS,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.SUCCESS_500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" rx="1" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
        </svg>
      ),
    },
  ];

  /* ── how-it-works steps ── */
  var howSteps = [
    {
      iconBg: C.BRAND_50,
      title: 'Share your link',
      desc: 'Share your unique referral link with friends and colleagues',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      iconBg: C.BRAND_50,
      title: 'They sign up',
      desc: "When someone signs up using your link, they'll appear in your referral list",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
    },
    {
      iconBg: C.BRAND_50,
      title: 'They subscribe',
      desc: 'When they subscribe to a paid plan, their status changes to Converted',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      iconBg: C.BRAND_50,
      title: 'You earn $25',
      desc: "You'll earn $25 in account credit for each conversion",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" rx="1" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
        </svg>
      ),
    },
  ];

  return (
    <DashboardShell title="Referrals">
      <style>{`
        .ref-copy:hover { background: ${C.ACCENT_HOVER} !important; }
        .ref-card:hover { box-shadow: ${C.SHADOW_MD}; }
        .ref-view:hover { background: ${C.GRAY_50} !important; }
        .ref-info:hover { box-shadow: ${C.SHADOW_MD}; }
        .ref-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .ref-steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 1200px) {
          .ref-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ref-steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .ref-stats-grid { grid-template-columns: 1fr !important; }
          .ref-steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, lineHeight: 1.3 }}>
            Referrals &amp; Rewards
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
            Earn rewards by inviting others to Squarespell Quiz
          </p>
        </div>

        {/* ── Referral Link Card ── */}
        <div style={{ ...cardBase, padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>
              Your Referral Link
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
              Share this link with your network to earn rewards
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' as const }}>
            <input
              type="text"
              value={referralUrl}
              readOnly
              onClick={function (e) { (e.target as HTMLInputElement).select(); }}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid ' + C.GRAY_200,
                background: C.GRAY_50,
                color: C.GRAY_700,
                fontFamily: C.FONT,
                fontSize: 14,
                fontWeight: 500,
                outline: 'none',
                boxSizing: 'border-box' as const,
              }}
            />
            <button
              onClick={copyToClipboard}
              className="ref-copy"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: copied ? C.SUCCESS : C.ACCENT,
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 14,
                fontFamily: C.FONT,
                cursor: 'pointer',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap' as const,
                boxShadow: C.SHADOW_XS,
              }}
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="ref-stats-grid">
          {statCards.map(function (card, i) {
            return (
              <div key={i} className="ref-card" style={{
                ...cardBase, padding: 24,
                display: 'flex', alignItems: 'flex-start', gap: 16,
                transition: 'box-shadow 0.2s',
              }}>
                {/* Icon circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: card.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                {/* Text */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.GRAY_500, fontFamily: C.FONT, marginBottom: 4 }}>
                    {card.label}
                  </div>
                  <div style={{
                    fontSize: 28, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT,
                    lineHeight: 1.1, letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, marginTop: 4 }}>
                    {card.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Referral History ── */}
        <div style={{ ...cardBase, padding: 0, marginBottom: 24, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid ' + C.GRAY_200,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>
              Referral History
            </h2>
            {referrals.length > 0 && (
              <button type="button" className="ref-view" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid ' + C.GRAY_200, background: '#fff',
                color: C.GRAY_600, fontSize: 13, fontWeight: 600,
                fontFamily: C.FONT, cursor: 'pointer', transition: 'background 0.15s',
              }}>
                View all history
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.GRAY_500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          {referrals.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' as const }}>
              <ClipboardIllustration />
              <div style={{ fontSize: 16, fontWeight: 600, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 6 }}>
                No referrals yet
              </div>
              <div style={{ fontSize: 14, color: C.GRAY_500, fontFamily: C.FONT }}>
                Share your link above to start earning rewards.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 14, fontFamily: C.FONT }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid ' + C.GRAY_200 }}>
                    {['Email', 'Status', 'Date Invited', 'Converted Date'].map(function (h) {
                      return (
                        <th key={h} style={{
                          padding: '12px 24px', textAlign: 'left' as const,
                          fontSize: 12, fontWeight: 600, color: C.GRAY_500,
                          textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                        }}>
                          {h}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(function (referral) {
                    var invitedDate = new Date(referral.created_at);
                    var convertedDate = referral.converted_at ? new Date(referral.converted_at) : null;

                    return (
                      <tr key={referral.id} style={{
                        borderBottom: '1px solid ' + C.GRAY_100,
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={function (e) {
                          (e.currentTarget as HTMLTableRowElement).style.background = C.GRAY_50;
                        }}
                        onMouseLeave={function (e) {
                          (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                        }}>
                        <td style={{ padding: '14px 24px', color: C.GRAY_900, fontWeight: 500 }}>
                          {referral.referred_email}
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 16,
                            fontSize: 12, fontWeight: 600,
                            background: referral.status === 'converted' ? C.SUCCESS_LIGHT : C.WARNING_LIGHT,
                            color: referral.status === 'converted' ? C.SUCCESS_700 : C.WARNING,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: referral.status === 'converted' ? C.SUCCESS_500 : C.WARNING_500,
                            }} />
                            {referral.status === 'converted' ? 'Converted' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px', color: C.GRAY_600 }}>
                          {invitedDate.toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 24px', color: C.GRAY_500 }}>
                          {convertedDate ? convertedDate.toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── How it works ── */}
        <div style={{ ...cardBase, padding: 24 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT }}>
            How it works
          </h2>

          <div className="ref-steps-grid">
            {howSteps.map(function (step, i) {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: step.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.GRAY_900, fontFamily: C.FONT, marginBottom: 4 }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 13, color: C.GRAY_500, fontFamily: C.FONT, lineHeight: 1.5 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
