'use client';
import { useEffect, useState } from 'react';
import { DashboardShell, DASHBOARD_COLORS as C } from '../../_components/DashboardShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { PageHeader, Card, EmptyState, PrimaryButton, PageLoading, Pill } from '../../_components/PageShell';
import { api } from '@/lib/api';

interface Suppression {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

function sourceLabel(s: string): string {
  if (s === 'hard_bounce') return 'Hard bounce';
  if (s === 'spam_complaint') return 'Spam complaint';
  if (s === 'manual') return 'Manual';
  if (s === 'user') return 'Unsubscribed';
  return s || 'Unknown';
}

function sourceVariant(s: string): 'live' | 'draft' | 'neutral' | 'accent' {
  if (s === 'hard_bounce') return 'draft';
  if (s === 'spam_complaint') return 'draft';
  if (s === 'manual') return 'neutral';
  return 'accent';
}

export default function SuppressionsPage() {
  const { token, status: authStatus } = useDashboardAuth();
  const [items, setItems] = useState<Suppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authStatus !== 'ready' || !token) return;
    loadData();
  }, [authStatus, token]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await api.getSuppressions();
      setItems(data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!addEmail.trim()) return;
    setAdding(true);
    try {
      await api.addSuppression({ email: addEmail.trim(), reason: 'manual' });
      setAddEmail('');
      await loadData();
    } catch {
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      await api.removeSuppression(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
    } finally {
      setRemoving(null);
    }
  }

  if (authStatus === 'loading' || loading) {
    return <DashboardShell><PageLoading /></DashboardShell>;
  }

  const filtered = search
    ? items.filter(i => i.email.toLowerCase().includes(search.toLowerCase()))
    : items;

  const bouncedCount = items.filter(i => i.source === 'hard_bounce').length;
  const complaintCount = items.filter(i => i.source === 'spam_complaint').length;
  const manualCount = items.filter(i => i.source === 'manual').length;
  const unsubCount = items.filter(i => i.source === 'user' || (!i.source)).length;

  return (
    <DashboardShell>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px' }}>
        <PageHeader
          title="Suppression List"
          subtitle="Emails that will not receive any future sends. Includes unsubscribes, bounces, and spam complaints."
        />

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{
            padding: '6px 14px', borderRadius: 6,
            background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
            fontSize: 12, color: C.TEXT_MUTED,
          }}>
            Total: <strong style={{ color: C.TEXT }}>{items.length}</strong>
          </div>
          {bouncedCount > 0 && (
            <div style={{
              padding: '6px 14px', borderRadius: 6,
              background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,92,92,0.2)',
              fontSize: 12, color: '#ff5c5c',
            }}>
              Bounced: <strong>{bouncedCount}</strong>
            </div>
          )}
          {complaintCount > 0 && (
            <div style={{
              padding: '6px 14px', borderRadius: 6,
              background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,92,92,0.2)',
              fontSize: 12, color: '#ff5c5c',
            }}>
              Complaints: <strong>{complaintCount}</strong>
            </div>
          )}
          {unsubCount > 0 && (
            <div style={{
              padding: '6px 14px', borderRadius: 6,
              background: `rgba(13,115,119,0.08)`, border: `1px solid rgba(13,115,119,0.2)`,
              fontSize: 12, color: C.ACCENT,
            }}>
              Unsubscribed: <strong>{unsubCount}</strong>
            </div>
          )}
          {manualCount > 0 && (
            <div style={{
              padding: '6px 14px', borderRadius: 6,
              background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
              fontSize: 12, color: C.TEXT_MUTED,
            }}>
              Manual: <strong style={{ color: C.TEXT }}>{manualCount}</strong>
            </div>
          )}
        </div>

        {/* Add + Search bar */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppressed emails..."
              style={{
                flex: 1, minWidth: 200, padding: '8px 12px',
                background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
                borderRadius: 6, color: C.TEXT, fontSize: 13, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="Add email to suppress..."
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                style={{
                  width: 220, padding: '8px 12px',
                  background: C.ELEVATED, border: `1px solid ${C.BORDER}`,
                  borderRadius: 6, color: C.TEXT, fontSize: 13, outline: 'none',
                }}
              />
              <PrimaryButton onClick={handleAdd} disabled={adding || !addEmail.trim()}>
                {adding ? 'Adding...' : 'Add'}
              </PrimaryButton>
            </div>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            }
            title={search ? 'No matches found' : 'Suppression list is empty'}
            body={search ? 'Try a different search term.' : 'Bounced, complained, and unsubscribed emails will appear here automatically.'}
          />
        ) : (
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED }}>Email</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED }}>Reason</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.TEXT_MUTED }}>Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.TEXT_MUTED }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.BORDER}` }}>
                      <td style={{ padding: '10px 12px', color: C.TEXT, fontFamily: 'monospace', fontSize: 12 }}>
                        {item.email}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Pill variant={sourceVariant(item.source)}>{sourceLabel(item.source)}</Pill>
                      </td>
                      <td style={{ padding: '10px 12px', color: C.TEXT_MUTED, fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removing === item.id}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${C.BORDER}`,
                            color: C.TEXT_MUTED,
                            padding: '4px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 11,
                            opacity: removing === item.id ? 0.5 : 1,
                          }}
                        >
                          {removing === item.id ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
