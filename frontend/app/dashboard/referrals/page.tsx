'use client';

import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageHeader, Card, PageLoading } from '../_components/PageShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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

export default function ReferralsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var [loading, setLoading] = useState(true);
  var [stats, setStats] = useState<ReferralStats | null>(null);
  var [referrals, setReferrals] = useState<Referral[]>([]);
  var [referralUrl, setReferralUrl] = useState('');
  var [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(API + '/api/referrals/code', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function(r) {
        if (!r.ok) throw new Error('Failed to get code');
        return r.json();
      }),
      fetch(API + '/api/referrals/stats', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function(r) {
        if (!r.ok) throw new Error('Failed to get stats');
        return r.json();
      }),
      fetch(API + '/api/referrals/list', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function(r) {
        if (!r.ok) throw new Error('Failed to get list');
        return r.json();
      }),
    ])
      .then(function([codeData, statsData, listData]) {
        setReferralUrl(codeData.url || '');
        setStats(statsData);
        setReferrals(listData.referrals || []);
      })
      .catch(function(e) {
        console.error(e);
      })
      .finally(function() {
        setLoading(false);
      });
  }, [token]);

  function copyToClipboard() {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl).then(function() {
        setCopied(true);
        setTimeout(function() {
          setCopied(false);
        }, 2000);
      });
    }
  }

  if (authStatus === 'loading') {
    return <DashboardShell title="Referrals"><PageLoading /></DashboardShell>;
  }

  var StatCard = function({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
    return (
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.TEXT }}>
            {value}
          </div>
          {subtext && (
            <div style={{ fontSize: 12.5, color: C.TEXT_MUTED, marginTop: 4 }}>
              {subtext}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <DashboardShell title="Referrals">
      <PageHeader
        title="Referrals & Rewards"
        subtitle="Earn rewards by inviting others to Squarespell"
      />

      {loading ? (
        <PageLoading />
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Referral Link Card */}
          <Card>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
                Your Referral Link
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: C.TEXT_MUTED }}>
                Share this link with your network to earn rewards
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                type="text"
                value={referralUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid ' + C.BORDER,
                  background: C.SURFACE,
                  color: C.TEXT,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              />
              <button
                onClick={copyToClipboard}
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: '1px solid ' + C.BORDER,
                  background: copied ? C.SUCCESS : C.ACCENT,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </Card>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <StatCard
              label="Total Referred"
              value={stats?.totalReferred || 0}
              subtext="People you've invited"
            />
            <StatCard
              label="Converted"
              value={stats?.converted || 0}
              subtext="Completed signup & payment"
            />
            <StatCard
              label="Pending"
              value={stats?.pending || 0}
              subtext="Awaiting signup"
            />
            <StatCard
              label="Rewards Earned"
              value={'$' + ((stats?.rewardEarned || 0) / 100).toFixed(2)}
              subtext="In account credit"
            />
          </div>

          {/* Referrals Table */}
          <Card>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
              Referral History
            </h2>

            {referrals.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: C.TEXT_MUTED,
              }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No referrals yet</div>
                <div style={{ fontSize: 13, color: C.TEXT_MUTED }}>
                  Share your link above to start earning rewards
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid ' + C.BORDER }}>
                      <th style={{
                        padding: '12px 0',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.TEXT_MUTED,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Email
                      </th>
                      <th style={{
                        padding: '12px 0',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.TEXT_MUTED,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Status
                      </th>
                      <th style={{
                        padding: '12px 0',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.TEXT_MUTED,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Date Invited
                      </th>
                      <th style={{
                        padding: '12px 0',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.TEXT_MUTED,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Converted Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map(function(referral) {
                      var invitedDate = new Date(referral.created_at);
                      var convertedDate = referral.converted_at ? new Date(referral.converted_at) : null;

                      return (
                        <tr key={referral.id} style={{
                          borderBottom: '1px solid ' + C.BORDER,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={function(e) {
                          (e.currentTarget as HTMLTableRowElement).style.background = C.GRAY_50;
                        }}
                        onMouseLeave={function(e) {
                          (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                        }}>
                          <td style={{ padding: '12px 0', color: C.TEXT }}>
                            {referral.referred_email}
                          </td>
                          <td style={{ padding: '12px 0' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: referral.status === 'converted' ? '#DFFCF0' : '#FFF8E1',
                              color: referral.status === 'converted' ? '#047857' : '#92400E',
                            }}>
                              {referral.status === 'converted' ? 'Converted' : 'Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 0', color: C.TEXT }}>
                            {invitedDate.toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 0', color: C.TEXT_MUTED }}>
                            {convertedDate ? convertedDate.toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Info Card */}
          <Card>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: C.TEXT }}>
              How it works
            </h2>
            <ul style={{
              margin: '0 0 0 16px',
              paddingLeft: 0,
              color: C.TEXT_MUTED,
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              <li>Share your unique referral link with friends and colleagues</li>
              <li>When someone signs up using your link, they'll appear in your referral list</li>
              <li>When they subscribe to a paid plan, their status changes to Converted</li>
              <li>You'll earn $25 in account credit for each conversion</li>
            </ul>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
