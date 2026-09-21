'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageLoading } from '../_components/PageShell';
import { connectApi, ConnectApiError, ConnectConfig, Installation, QuizSummary, Site, SiteEvent } from '@/lib/connect/client';
import { MODE_LABEL, PLATFORM_LABEL, PLATFORM_METHOD, PRODUCT_PROMISE, eventIsProblem, eventText, friendlyError, relativeTime } from '@/lib/connect/copy';
import { AnnounceProvider, Modal, PlatformLogo, SitesStyles, StatusBadge } from './_components/primitives';
import { ConnectWizard } from './_components/ConnectWizard';
import { PublishFlow } from './_components/PublishFlow';
import { SiteDetailDrawer } from './_components/SiteDetail';

type Detail = { site: Site; installations: Installation[]; events: SiteEvent[] };

function SitesPage() {
  const { token, status } = useDashboardAuth();
  const params = useSearchParams();
  const router = useRouter();
  const presetQuiz = params.get('publish');
  const [config, setConfig] = useState<ConnectConfig | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [details, setDetails] = useState<Detail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [resumeSite, setResumeSite] = useState<Site | null>(null);
  const [publishSite, setPublishSite] = useState<Site | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [handledPreset, setHandledPreset] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const api = connectApi(token);
    try {
      const cfg = await api.config();
      setConfig(cfg);
      if (!cfg.enabled) { setLoading(false); return; }
      const [s, q] = await Promise.all([api.listSites(), api.quizzes().catch(() => [] as QuizSummary[])]);
      setSites(s.sites); setQuizzes(Array.isArray(q) ? q : []); setError('');
      const ds = await Promise.all(s.sites.slice(0, 6).map((x) => api.getSite(x.id).then((d) => ({ site: d.site, installations: d.installations, events: d.events })).catch(() => null)));
      setDetails(ds.filter(Boolean) as Detail[]);
    } catch (e) {
      setError(friendlyError((e as ConnectApiError).code, (e as Error).message));
    } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  // "Publish to website" from a quiz arrives as /dashboard/sites?publish=<quizId>.
  useEffect(() => {
    if (!presetQuiz || handledPreset || loading || !config?.enabled) return;
    setHandledPreset(true);
    const verified = sites.filter((s) => s.state === 'verified');
    if (verified.length === 1) setPublishSite(verified[0]);
    else if (verified.length > 1) setChooserOpen(true);
    else { setNotice('Connect a website first, then publish your quiz to it.'); setWizardOpen(true); }
  }, [presetQuiz, handledPreset, loading, config, sites]);

  const liveCount = useMemo(() => details.reduce((n, d) => n + d.installations.filter((i) => ['live', 'updating', 'moving'].includes(i.status)).length, 0), [details]);
  const health = useMemo(() => {
    if (!sites.length) return { label: 'None yet', state: 'draft' as const };
    if (sites.some((s) => s.state === 'needs_attention')) return { label: 'Needs attention', state: 'needs_attention' as const };
    if (sites.some((s) => s.state !== 'verified' && s.state !== 'paused')) return { label: 'Setup not finished', state: 'verifying' as const };
    if (sites.some((s) => s.health === 'awaiting_heartbeat' || s.health === 'stale')) return { label: 'Waiting for signal', state: 'verifying' as const };
    return { label: 'Healthy', state: 'verified' as const };
  }, [sites]);
  const activity = useMemo(() => details.flatMap((d) => d.events.map((e) => ({ ...e, host: d.site.hostname }))).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 6), [details]);
  const liveRows = useMemo(() => details.flatMap((d) => d.installations.filter((i) => ['live', 'updating', 'moving'].includes(i.status)).map((i) => ({ ...i, host: d.site.hostname, siteId: d.site.id }))).slice(0, 8), [details]);
  // The publish dialog links with the quiz slug; accept an id as well.
  const quizForPreset = quizzes.find((q) => q.id === presetQuiz || q.slug === presetQuiz);

  function openWizard(site: Site | null) { setResumeSite(site); setWizardOpen(true); }

  if (status === 'loading' || (loading && !config)) return <DashboardShell title="Sites"><PageLoading /></DashboardShell>;

  if (config && !config.enabled) {
    return (
      <DashboardShell title="Sites">
        <div className="sx-scope"><SitesStyles />
          <div className="sx-empty" data-testid="feature-off">
            <h2>Website connections are not available yet</h2>
            <p>You can still add any quiz to your website today with the manual embed code.</p>
            <Link className="sx-btn sx-btn-primary" href="/dashboard/embed">Open manual embed</Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Sites">
      <AnnounceProvider>
        <div className="sx-scope">
          <SitesStyles />
          <header className="sx-hero">
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>Publish / Sites</p>
              <h1>Website connections</h1>
              <p>Publish without pasting code every time. Connect each website once. Then publish, update, pause, move or remove any quiz from one place.</p>
            </div>
            <div className="sx-actions">
              <Link className="sx-btn" href="/dashboard/embed">Manual embed</Link>
              <button type="button" className="sx-btn sx-btn-primary" onClick={() => openWizard(null)}>Connect website</button>
            </div>
          </header>

          {error ? (
            <div className="sx-note sx-bad" role="alert"><b>{error}</b><div style={{ marginTop: 8 }}><button type="button" className="sx-btn sx-btn-sm" onClick={() => { setLoading(true); load(); }}>Try again</button></div></div>
          ) : null}

          {!error && sites.length === 0 ? (
            <div className="sx-empty" data-testid="sites-empty">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0f7377" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" /></svg>
              <h2>Connect your website once</h2>
              <p>{PRODUCT_PROMISE} No more copying embed code each time you publish a quiz.</p>
              <div className="sx-how">
                <div><b>1. Connect</b>Add your domain and paste one small loader, once.</div>
                <div><b>2. Verify</b>We check your live page and confirm the connection.</div>
                <div><b>3. Publish</b>Choose any quiz, choose where it appears, and publish.</div>
              </div>
              <div className="sx-actions" style={{ justifyContent: 'center' }}>
                <button type="button" className="sx-btn sx-btn-primary" onClick={() => openWizard(null)}>Connect website</button>
                <Link className="sx-btn" href="/dashboard/embed">Use manual embed instead</Link>
              </div>
            </div>
          ) : null}

          {sites.length > 0 ? (
            <>
              <div className="sx-metrics" aria-label="Connection summary">
                <div className="sx-metric"><span>Connected sites</span><b>{sites.length}{config?.limits.maxSites ? ' of ' + config.limits.maxSites : ''}</b></div>
                <div className="sx-metric"><span>Live installations</span><b>{liveCount}</b></div>
                <div className="sx-metric"><span>Connection health</span><b style={{ fontSize: 18, marginTop: 8 }}><StatusBadge state={health.state} label={health.label} /></b></div>
              </div>

              <section className="sx-section" aria-labelledby="sx-sites-h">
                <h2 id="sx-sites-h">Your websites</h2>
                <p>Every quiz installed on a connected website stays synced from here.</p>
                <div className="sx-grid">
                  {sites.map((s) => (
                    <article key={s.id} className="sx-card" aria-label={s.hostname}>
                      <div className="sx-site-head">
                        <div className="sx-host"><span className="sx-logo"><PlatformLogo id={s.platform} size={22} /></span><div style={{ minWidth: 0 }}><b>{s.hostname}</b><small>{PLATFORM_LABEL[s.platform]}, {PLATFORM_METHOD[s.platform]}</small></div></div>
                        <StatusBadge state={s.state} />
                      </div>
                      <dl className="sx-kv">
                        <dt>Live quizzes</dt><dd>{s.installations?.live ?? 0} {(s.installations?.live ?? 0) === 1 ? 'installation' : 'installations'}</dd>
                        <dt>Connection</dt><dd>Site loader</dd>
                        <dt>Heartbeat</dt><dd>{s.last_heartbeat_at ? relativeTime(s.last_heartbeat_at) : 'Not received yet'}</dd>
                      </dl>
                      <div className="sx-actions">
                        {s.state === 'draft' || (s.state === 'verifying' && !s.last_verified_at) ? (
                          <button type="button" className="sx-btn sx-btn-primary sx-btn-sm" onClick={() => openWizard(s)}>Finish setup</button>
                        ) : (
                          <button type="button" className="sx-btn sx-btn-primary sx-btn-sm" disabled={s.state !== 'verified'} onClick={() => setPublishSite(s)}>Publish a quiz</button>
                        )}
                        <button type="button" className="sx-btn sx-btn-sm" onClick={() => setDrawerId(s.id)}>Manage</button>
                      </div>
                    </article>
                  ))}
                  <article className="sx-card" style={{ borderStyle: 'dashed', background: 'var(--soft)' }}>
                    <b>Connect another website</b>
                    <p style={{ color: 'var(--muted)', fontSize: 14, margin: '6px 0 12px' }}>Add Squarespace or any custom website today. WordPress, Shopify and Wix connectors are planned. Webflow and Framer come later.</p>
                    <button type="button" className="sx-btn sx-btn-sm" onClick={() => openWizard(null)}>Choose a platform</button>
                  </article>
                </div>
              </section>

              <section className="sx-section" aria-labelledby="sx-live-h">
                <h2 id="sx-live-h">Live installations</h2>
                <p>Quizzes currently shown on connected websites.</p>
                {liveRows.length === 0 ? <p style={{ color: 'var(--muted)' }}>Nothing is live yet. Publish a quiz to a verified website to see it here.</p> : (
                  <ul className="sx-list">
                    {liveRows.map((i) => (
                      <li key={i.id} className="sx-row">
                        <div className="sx-meta"><b>{i.quiz?.title || 'Quiz'}</b><span>{i.host}, {MODE_LABEL[i.mode]}{i.placement_ref ? ' (' + i.placement_ref + ')' : ''}</span></div>
                        <button type="button" className="sx-btn sx-btn-sm" onClick={() => setDrawerId(i.siteId)}>Manage</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="sx-section" aria-labelledby="sx-act-h">
                <h2 id="sx-act-h">Recent activity</h2>
                <p>Changes to your live sites.</p>
                {activity.length === 0 ? <p style={{ color: 'var(--muted)' }}>No activity yet.</p> : (
                  <ul className="sx-timeline">
                    {activity.map((e) => <li key={e.id}><span aria-hidden="true">{eventIsProblem(e.action) ? '!' : '\u2713'}</span><div>{eventText(e.action)}<time>{e.host}, {relativeTime(e.created_at)}</time></div></li>)}
                  </ul>
                )}
              </section>
            </>
          ) : null}

          <ConnectWizard open={wizardOpen} token={token || ''} existingSite={resumeSite} onClose={() => { setWizardOpen(false); setResumeSite(null); setNotice(''); load(); }}
            onVerified={(site, publishNext) => { setWizardOpen(false); setResumeSite(null); setNotice(''); load().then(() => { if (publishNext) setPublishSite(site); else setDrawerId(site.id); }); }} />

          {publishSite ? (
            <PublishFlow open token={token || ''} site={sites.find((s) => s.id === publishSite.id) || publishSite} quizzes={quizzes} presetQuizId={quizForPreset?.id || null} onClose={() => { setPublishSite(null); if (presetQuiz) router.replace('/dashboard/sites'); }}
              onDone={(inst) => { setPublishSite(null); load(); setDrawerId(inst.site_id); if (presetQuiz) router.replace('/dashboard/sites'); }} />
          ) : null}

          <Modal open={chooserOpen} title="Choose a website" subtitle={quizForPreset ? 'Publish ' + quizForPreset.title + ' to which website?' : undefined} onClose={() => setChooserOpen(false)}>
            <ul className="sx-list">
              {sites.filter((s) => s.state === 'verified').map((s) => (
                <li key={s.id} className="sx-row"><div className="sx-host"><span className="sx-logo"><PlatformLogo id={s.platform} size={20} /></span><b>{s.hostname}</b></div><button type="button" className="sx-btn sx-btn-primary sx-btn-sm" onClick={() => { setChooserOpen(false); setPublishSite(s); }}>Choose</button></li>
              ))}
            </ul>
          </Modal>

          <SiteDetailDrawer open={!!drawerId} siteId={drawerId} token={token || ''} quizzes={quizzes} onClose={() => setDrawerId(null)} onChanged={load} onFinishSetup={(s) => { setDrawerId(null); openWizard(s); }} />
          {notice ? <div className="sx-sr" role="status">{notice}</div> : null}
        </div>
      </AnnounceProvider>
    </DashboardShell>
  );
}

export default function SitesRoute() {
  return (
    <Suspense fallback={<DashboardShell title="Sites"><PageLoading /></DashboardShell>}>
      <SitesPage />
    </Suspense>
  );
}
