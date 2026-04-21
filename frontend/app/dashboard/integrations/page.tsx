'use client';

/**
 * /dashboard/integrations - Where users connect lead delivery destinations.
 *
 * Fully working integrations: Webhook, Zapier, Mailchimp, Klaviyo,
 * ConvertKit, and Google Sheets. Each has a setup form that validates
 * credentials and lets users pick lists/audiences/forms.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type IntegrationType = 'webhook' | 'zapier' | 'mailchimp' | 'klaviyo' | 'convertkit' | 'google_sheets';

type Integration = {
  id: string;
  type: IntegrationType;
  config: Record<string, any>;
  active: boolean;
  created_at: string;
};

type ListItem = { id: string; name: string; member_count?: number };

type Catalog = {
  type: IntegrationType;
  name: string;
  tagline: string;
  available: boolean;
  icon: string;
};

var CATALOG: Catalog[] = [
  { type: 'webhook', name: 'Custom webhook', tagline: 'POST every lead to your own URL.', available: true, icon: 'W' },
  { type: 'zapier', name: 'Zapier', tagline: 'Trigger any of 5,000+ Zapier apps.', available: true, icon: 'Z' },
  { type: 'mailchimp', name: 'Mailchimp', tagline: 'Push leads straight into a Mailchimp audience.', available: true, icon: 'M' },
  { type: 'klaviyo', name: 'Klaviyo', tagline: 'Sync leads + outcome tags into Klaviyo.', available: true, icon: 'K' },
  { type: 'convertkit', name: 'ConvertKit', tagline: 'Subscribe leads to a ConvertKit form or tag.', available: true, icon: 'C' },
  { type: 'google_sheets', name: 'Google Sheets', tagline: 'Append every lead to a Google Sheet row.', available: true, icon: 'G' },
];

function labelFor(type: IntegrationType): string {
  var found = CATALOG.find(function(c) { return c.type === type; });
  return found ? found.name : type;
}

function iconFor(type: IntegrationType): string {
  var found = CATALOG.find(function(c) { return c.type === type; });
  return found ? found.icon : '?';
}

var inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: C.SURFACE,
  border: '1px solid ' + C.BORDER,
  borderRadius: 8,
  fontSize: 13,
  color: C.TEXT,
  fontFamily: '"DM Sans",system-ui,sans-serif',
  outline: 'none',
};

var labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: C.TEXT_MUTED,
  marginBottom: 6,
};

/* ──────────────────────────────────────────────────────────────────────
   Email Platform Setup Form (Mailchimp, Klaviyo, ConvertKit)
   ────────────────────────────────────────────────────────────────────── */
function EmailPlatformForm({
  type,
  token,
  onCreated,
  onCancel,
}: {
  type: 'mailchimp' | 'klaviyo' | 'convertkit';
  token: string;
  onCreated: (i: Integration) => void;
  onCancel: () => void;
}) {
  var [apiKey, setApiKey] = useState('');
  var [lists, setLists] = useState<ListItem[]>([]);
  var [selectedList, setSelectedList] = useState('');
  var [loadingLists, setLoadingLists] = useState(false);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState<string | null>(null);
  var [step, setStep] = useState<'key' | 'list'>('key');

  var platformName = labelFor(type);
  var listLabel = type === 'convertkit' ? 'Form' : type === 'klaviyo' ? 'List' : 'Audience';

  function fetchLists() {
    if (!apiKey) return;
    setLoadingLists(true);
    setError(null);

    fetch(API + '/api/integrations/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ type: type, apiKey: apiKey }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Invalid API key'); });
        return res.json();
      })
      .then(function(data) {
        setLists(data.lists || []);
        if (data.lists && data.lists.length > 0) {
          setSelectedList(data.lists[0].id);
        }
        setStep('list');
        setLoadingLists(false);
      })
      .catch(function(e) {
        setError(e.message || 'Failed to validate API key');
        setLoadingLists(false);
      });
  }

  function saveIntegration() {
    if (!apiKey || !selectedList) return;
    setSaving(true);
    setError(null);

    var config: Record<string, any> = { apiKey: apiKey };
    if (type === 'convertkit') {
      config.formId = selectedList;
    } else {
      config.listId = selectedList;
    }

    // Include the list name for display
    var listObj = lists.find(function(l) { return l.id === selectedList; });
    if (listObj) config.listName = listObj.name;

    fetch(API + '/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ type: type, config: config }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Failed to save'); });
        return res.json();
      })
      .then(function(data) {
        onCreated(data);
        setSaving(false);
      })
      .catch(function(e) {
        setError(e.message);
        setSaving(false);
      });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 700,
        }}>
          {iconFor(type)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>Connect {platformName}</div>
          <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>
            {step === 'key' ? 'Step 1: Enter your API key' : 'Step 2: Select ' + listLabel.toLowerCase()}
          </div>
        </div>
      </div>

      {step === 'key' && (
        <div>
          <label style={labelStyle}>{platformName} API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={function(e) { setApiKey(e.target.value); }}
            placeholder={type === 'mailchimp' ? 'xxxxxxxx-us21' : type === 'klaviyo' ? 'pk_xxxxxxxx' : 'xxxxxxxx'}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginBottom: 12, lineHeight: 1.5 }}>
            {type === 'mailchimp' && 'Find this in your Mailchimp account under Profile > Extras > API Keys.'}
            {type === 'klaviyo' && 'Find this in Klaviyo under Settings > API Keys. Use a private API key.'}
            {type === 'convertkit' && 'Find this in ConvertKit under Settings > Advanced > API Key.'}
          </div>
        </div>
      )}

      {step === 'list' && (
        <div>
          <label style={labelStyle}>Select {listLabel}</label>
          {lists.length === 0 ? (
            <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 12 }}>
              No {listLabel.toLowerCase()}s found. Create one in {platformName} first.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              {lists.map(function(l) {
                var isSelected = selectedList === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={function() { setSelectedList(l.id); }}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid ' + (isSelected ? C.ACCENT : C.BORDER),
                      borderRadius: 8,
                      background: isSelected ? 'rgba(13,115,119,0.06)' : C.SURFACE,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: C.TEXT }}>{l.name}</span>
                    {l.member_count !== undefined && (
                      <span style={{ fontSize: 11, color: C.TEXT_MUTED }}>{l.member_count.toLocaleString()} contacts</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <GhostButton onClick={function() { setStep('key'); }}>Back</GhostButton>
        </div>
      )}

      {error && (
        <div style={{ color: '#ff6b6b', fontSize: 12.5, marginBottom: 10 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {step === 'key' && (
          <PrimaryButton onClick={fetchLists} disabled={loadingLists || !apiKey}>
            {loadingLists ? 'Validating...' : 'Validate & continue'}
          </PrimaryButton>
        )}
        {step === 'list' && lists.length > 0 && (
          <PrimaryButton onClick={saveIntegration} disabled={saving || !selectedList}>
            {saving ? 'Connecting...' : 'Connect ' + platformName}
          </PrimaryButton>
        )}
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Google Sheets Setup Form
   ────────────────────────────────────────────────────────────────────── */
function GoogleSheetsForm({
  token,
  onCreated,
  onCancel,
}: {
  token: string;
  onCreated: (i: Integration) => void;
  onCancel: () => void;
}) {
  var [spreadsheetId, setSpreadsheetId] = useState('');
  var [sheetName, setSheetName] = useState('Sheet1');
  var [serviceAccountJson, setServiceAccountJson] = useState('');
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState<string | null>(null);

  function save() {
    if (!spreadsheetId) { setError('Spreadsheet ID is required'); return; }
    setSaving(true);
    setError(null);

    fetch(API + '/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        type: 'google_sheets',
        config: { spreadsheet_id: spreadsheetId, sheet_name: sheetName || 'Sheet1', service_account_json: serviceAccountJson },
      }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Failed to save'); });
        return res.json();
      })
      .then(function(data) { onCreated(data); setSaving(false); })
      .catch(function(e) { setError(e.message); setSaving(false); });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0f9d58', color: '#fff', fontSize: 14, fontWeight: 700,
        }}>G</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>Connect Google Sheets</div>
          <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>Auto-append every lead as a new row</div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Spreadsheet ID</label>
        <input
          type="text"
          value={spreadsheetId}
          onChange={function(e) { setSpreadsheetId(e.target.value); }}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginTop: 4 }}>
          The long ID from your Google Sheet URL: docs.google.com/spreadsheets/d/<b>this-part</b>/edit
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Sheet Name (tab)</label>
        <input
          type="text"
          value={sheetName}
          onChange={function(e) { setSheetName(e.target.value); }}
          placeholder="Sheet1"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Service Account JSON (optional)</label>
        <textarea
          value={serviceAccountJson}
          onChange={function(e) { setServiceAccountJson(e.target.value); }}
          placeholder='Paste your Google service account JSON here for private sheets...'
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'ui-monospace,monospace', fontSize: 11 }}
        />
        <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginTop: 4 }}>
          Only needed for private sheets. Make the sheet public (view access) to skip this step.
        </div>
      </div>

      {error && <div style={{ color: '#ff6b6b', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <PrimaryButton onClick={save} disabled={saving || !spreadsheetId}>
          {saving ? 'Connecting...' : 'Connect Google Sheets'}
        </PrimaryButton>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Webhook Form (unchanged)
   ────────────────────────────────────────────────────────────────────── */
function WebhookForm({
  onCreated,
  token,
}: {
  onCreated: (i: Integration) => void;
  token: string;
}) {
  var [url, setUrl] = useState('');
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState<string | null>(null);

  function submit() {
    if (!url) return;
    setSaving(true);
    setError(null);
    fetch(API + '/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ type: 'webhook', config: { url: url } }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Failed to save webhook'); });
        return res.json();
      })
      .then(function(data) { onCreated(data); setUrl(''); })
      .catch(function(e) { setError(e.message || 'Something went wrong'); })
      .finally(function() { setSaving(false); });
  }

  return (
    <div>
      <label style={labelStyle}>Webhook URL</label>
      <input
        type="url"
        value={url}
        onChange={function(e) { setUrl(e.target.value); }}
        placeholder="https://your-server.com/hooks/squarespell"
        style={{ ...inputStyle, marginBottom: 12 }}
      />
      {error && <div style={{ color: '#ff6b6b', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
      <PrimaryButton onClick={submit} disabled={saving || !url}>
        {saving ? 'Saving...' : 'Add webhook'}
      </PrimaryButton>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Integration Row (existing integrations)
   ────────────────────────────────────────────────────────────────────── */
function IntegrationRow({
  integration,
  token,
  onChange,
  onDelete,
}: {
  integration: Integration;
  token: string;
  onChange: (i: Integration) => void;
  onDelete: (id: string) => void;
}) {
  var [testing, setTesting] = useState(false);
  var [testResult, setTestResult] = useState<string | null>(null);

  function toggle() {
    fetch(API + '/api/integrations/' + integration.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ active: !integration.active }),
    }).then(function(res) {
      if (res.ok) res.json().then(function(data) { onChange(data); });
    });
  }

  function runTest() {
    setTesting(true);
    setTestResult(null);
    fetch(API + '/api/integrations/test/' + integration.id, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) setTestResult('Success');
        else setTestResult('Failed: ' + (data.error || data.status));
      })
      .catch(function(e) { setTestResult('Failed: ' + e.message); })
      .finally(function() {
        setTesting(false);
        setTimeout(function() { setTestResult(null); }, 4000);
      });
  }

  function remove() {
    if (!confirm('Remove this integration?')) return;
    fetch(API + '/api/integrations/' + integration.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    }).then(function(res) {
      if (res.ok) onDelete(integration.id);
    });
  }

  var configSummary = '';
  if (integration.type === 'webhook') {
    configSummary = integration.config?.url || '';
  } else if (integration.config?.listName) {
    configSummary = integration.config.listName;
  } else if (integration.config?.spreadsheet_id) {
    configSummary = 'Sheet: ' + (integration.config.sheet_name || 'Sheet1');
  } else {
    configSummary = 'Connected';
  }

  var canTest = integration.type === 'webhook' || integration.type === 'mailchimp' || integration.type === 'klaviyo' || integration.type === 'convertkit';

  return (
    <div style={{
      padding: '14px 18px',
      border: '1px solid ' + C.BORDER,
      borderRadius: 12,
      background: C.SURFACE,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 260px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: integration.active ? C.ACCENT : C.BORDER,
          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {iconFor(integration.type)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.TEXT }}>{labelFor(integration.type)}</span>
            <Pill variant={integration.active ? 'live' : 'draft'}>{integration.active ? 'Active' : 'Paused'}</Pill>
          </div>
          <div style={{
            fontSize: 12, color: C.TEXT_MUTED, fontFamily: 'ui-monospace,monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {configSummary}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {testResult && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: testResult === 'Success' ? '#4cd964' : '#ff6b6b',
          }}>
            {testResult}
          </span>
        )}
        {canTest && (
          <GhostButton onClick={runTest}>{testing ? 'Testing...' : 'Test'}</GhostButton>
        )}
        <GhostButton onClick={toggle}>{integration.active ? 'Pause' : 'Resume'}</GhostButton>
        <GhostButton onClick={remove}>Remove</GhostButton>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Main Page
   ────────────────────────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var router = useRouter();
  var [integrations, setIntegrations] = useState<Integration[]>([]);
  var [loading, setLoading] = useState(true);
  var [setupType, setSetupType] = useState<IntegrationType | null>(null);

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    setLoading(true);

    fetch(API + '/api/integrations', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load integrations');
        return res.json();
      })
      .then(function(data) {
        if (!cancelled) setIntegrations(Array.isArray(data) ? data : []);
      })
      .catch(function(e) { console.error(e); })
      .finally(function() { if (!cancelled) setLoading(false); });

    return function() { cancelled = true; };
  }, [token]);

  function handleCreated(i: Integration) {
    setIntegrations(function(prev) { return [i].concat(prev); });
    setSetupType(null);
  }

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Integrations">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Integrations">
      <PageHeader
        title="Integrations"
        subtitle="Deliver captured leads wherever your team already works"
      />

      {loading ? (
        <PageLoading />
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Setup form overlay */}
          {setupType && (
            <Card>
              {setupType === 'webhook' && (
                <div>
                  <WebhookForm token={token || ''} onCreated={handleCreated} />
                  <div style={{ marginTop: 10 }}>
                    <GhostButton onClick={function() { setSetupType(null); }}>Cancel</GhostButton>
                  </div>
                </div>
              )}
              {(setupType === 'mailchimp' || setupType === 'klaviyo' || setupType === 'convertkit') && (
                <EmailPlatformForm
                  type={setupType}
                  token={token || ''}
                  onCreated={handleCreated}
                  onCancel={function() { setSetupType(null); }}
                />
              )}
              {setupType === 'google_sheets' && (
                <GoogleSheetsForm
                  token={token || ''}
                  onCreated={handleCreated}
                  onCancel={function() { setSetupType(null); }}
                />
              )}
            </Card>
          )}

          {/* Connected integrations */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.TEXT }}>
                Connected ({integrations.length})
              </h2>
            </div>

            {integrations.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13.5 }}>
                No integrations connected yet. Pick one below to get started.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {integrations.map(function(i) {
                  return (
                    <IntegrationRow
                      key={i.id}
                      integration={i}
                      token={token || ''}
                      onChange={function(updated) {
                        setIntegrations(function(prev) { return prev.map(function(p) { return p.id === updated.id ? updated : p; }); });
                      }}
                      onDelete={function(id) {
                        setIntegrations(function(prev) { return prev.filter(function(p) { return p.id !== id; }); });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </Card>

          {/* Available integrations catalog */}
          <Card>
            <h2 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
              Available integrations
            </h2>
            <p style={{ margin: '0 0 18px 0', fontSize: 13, color: C.TEXT_MUTED }}>
              Pick where you want new leads to land.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}>
              {CATALOG.map(function(c) {
                var isConnected = integrations.some(function(i) { return i.type === c.type && i.active; });
                return (
                  <div
                    key={c.type}
                    onClick={function() {
                      if (c.type === 'zapier') { router.push('/dashboard/integrations/api-keys'); return; }
                      setSetupType(c.type);
                    }}
                    style={{
                      padding: 16,
                      border: '1px solid ' + (isConnected ? C.ACCENT : C.BORDER),
                      borderRadius: 12,
                      background: isConnected ? 'rgba(13,115,119,0.04)' : C.SURFACE,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,115,119,0.08)'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.borderColor = isConnected ? C.ACCENT : C.BORDER; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isConnected ? C.ACCENT : C.BG,
                        color: isConnected ? '#fff' : C.TEXT_MUTED, fontSize: 12, fontWeight: 700,
                      }}>
                        {c.icon}
                      </div>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.TEXT, flex: 1 }}>{c.name}</span>
                      {isConnected ? (
                        <Pill variant="live">Connected</Pill>
                      ) : (
                        <Pill variant="live">Set up</Pill>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
                      {c.tagline}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
