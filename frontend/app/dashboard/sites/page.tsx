'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import { PageLoading } from '../_components/PageShell';
import { connectApi, ConnectApiError, ConnectConfig, Installation, QuizSummary, Site, SiteEvent } from '@/lib/connect/client';
import { MODE_LABEL, PLATFORM_CHOICES, PLATFORM_LABEL, PLATFORM_METHOD, eventIsProblem, eventText, friendlyError, relativeTime } from '@/lib/connect/copy';
import { AnnounceProvider, Modal, PlatformLogo, SitesStyles, StatusBadge } from './_components/primitives';
import { ConnectWizard } from './_components/ConnectWizard';
import { PublishFlow } from './_components/PublishFlow';
import { SiteDetailDrawer } from './_components/SiteDetail';

type Detail = { site: Site; installations: Installation[]; events: SiteEvent[] };

function PlusIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}
function CodeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></svg>;
}

/** Miniature browser showing a connected site with a quiz on it (illustrative, no real data). */
function ConnectIllustration() {
  return (
    <svg viewBox="0 0 560 400" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="60" y="70" width="170" height="250" rx="10" fill="#BFCAFF" />
      <rect x="120" y="36" width="300" height="230" rx="8" fill="#fff" stroke="#E2E7FF" />
      <path d="M140 52h10v5h-6v1h6v9h-10v-5h6v-1h-6z" fill="#0B1233" />
      <text x="158" y="63" fontSize="12" fontWeight="700" fill="#0B1233" fontFamily="Inter" letterSpacing=".04em">SQUARESPELL</text>
      <rect x="330" y="46" width="92" height="28" rx="6" fill="#fff" stroke="#E2E7FF" />
      <circle cx="346" cy="60" r="4" fill="#1F9D57" />
      <text x="356" y="64" fontSize="11" fill="#0B1233" fontFamily="Inter">Connected</text>
      <rect x="155" y="100" width="290" height="210" rx="8" fill="#fff" stroke="#E2E7FF" />
      <circle cx="172" cy="118" r="4" fill="#0B1233" /><circle cx="186" cy="118" r="4" fill="#8B93B5" /><circle cx="200" cy="118" r="4" fill="#CDD6FF" />
      <text x="222" y="122" fontSize="11" fill="#3B4466" fontFamily="Inter">yourwebsite.com</text>
      <line x1="155" y1="134" x2="445" y2="134" stroke="#EBEFFF" />
      <rect x="170" y="148" width="130" height="146" fill="#F5F7FF" />
      <text x="182" y="192" fontSize="21" fill="#0B1233" fontFamily="'Instrument Serif', Georgia, serif">A smarter</text>
      <text x="182" y="216" fontSize="21" fill="#0B1233" fontFamily="'Instrument Serif', Georgia, serif">way to quiz.</text>
      <rect x="182" y="236" width="78" height="26" rx="4" fill="#0B1233" />
      <text x="192" y="253" fontSize="10.5" fill="#fff" fontFamily="Inter">Start quiz</text>
      <rect x="310" y="148" width="120" height="146" fill="#DCE3FF" />
      <path d="M310 294 C 340 240, 380 250, 430 200 L 430 294 Z" fill="#8FA2FF" />
      <path d="M310 294 C 350 270, 390 280, 430 250 L 430 294 Z" fill="#3154FF" />
      <rect x="36" y="200" width="58" height="58" rx="8" fill="#fff" stroke="#E2E7FF" />
      <path d="M58 234l8-8M55 229l-3 3a5 5 0 007 7l3-3M69 231l3-3a5 5 0 00-7-7l-3 3" fill="none" stroke="#0B1233" strokeWidth="2" strokeLinecap="round" />
      <path d="M94 229 H 118 V 270 H 155" fill="none" stroke="#0B1233" strokeDasharray="3 4" />
      <rect x="400" y="280" width="104" height="84" rx="4" fill="#DCE3FF" />
      <text x="412" y="304" fontSize="9.5" letterSpacing="2" fill="#0B1233" fontFamily="Inter">PUBLISH</text>
      <text x="412" y="320" fontSize="9.5" letterSpacing="2" fill="#0B1233" fontFamily="Inter">UPDATE</text>
      <text x="412" y="336" fontSize="9.5" letterSpacing="2" fill="#0B1233" fontFamily="Inter">PAUSE</text>
      <text x="412" y="352" fontSize="9.5" letterSpacing="2" fill="#0B1233" fontFamily="Inter">MOVE</text>
    </svg>
  );
}

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
  const [detailsError, setDetailsError] = useState(false);

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
      setDetailsError(ds.some((d) => d === null));
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
  const lastVerified = useMemo(() => sites.map((x) => x.last_verified_at).filter(Boolean).sort().pop() || null, [sites]);
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
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Website connections</p>
              <h1>Your websites, connected<i>.</i></h1>
              <p>Publish without pasting code every time. Connect each website once. Then publish, update, pause, move or remove any quiz from one place.</p>
            </div>
            <div className="sx-actions" style={{ paddingTop: 34 }}>
              <button type="button" className="sx-btn sx-btn-primary sx-btn-lg" onClick={() => openWizard(null)}><PlusIcon /> Connect website</button>
            </div>
          </header>

          {error ? (
            <div className="sx-note sx-bad" role="alert"><b>{error}</b><div style={{ marginTop: 8 }}><button type="button" className="sx-btn sx-btn-sm" onClick={() => { setLoading(true); load(); }}>Try again</button></div></div>
          ) : null}

          {!error && sites.length === 0 ? (
            <div data-testid="sites-empty">
              <div className="sx-start">
                <div className="sx-start-art" aria-hidden="true"><ConnectIllustration /></div>
                <div className="sx-start-body">
                  <p className="sx-eyebrow">Get started</p>
                  <h2>Connect once. Publish any quiz.</h2>
                  <p className="sx-lead">Add your website, verify the connection, and publish quizzes from here. You paste one small loader once; after that there is no more copying embed code each time you make a change.</p>
                  <div className="sx-actions">
                    <button type="button" className="sx-btn sx-btn-primary sx-btn-lg" onClick={() => openWizard(null)}><PlusIcon /> Connect website</button>
                    <Link className="sx-btn sx-btn-lg" href="/dashboard/embed"><CodeIcon /> Manual embed</Link>
                  </div>
                  <div className="sx-platform-strip">
                    <p className="sx-eyebrow">Supported platforms</p>
                    <ul>
                      {PLATFORM_CHOICES.slice(0, 4).map((c) => (
                        <li key={c.id} className={c.availability === 'Available' ? '' : 'is-planned'}>
                          <span className="sx-logo-sm"><PlatformLogo id={c.sprite} size={20} /></span>
                          <span><b>{c.id === 'html' ? 'Custom HTML' : c.label}</b><small className={c.availability === 'Available' ? 'sx-tag-ok' : 'sx-tag-muted'}>{c.availability === 'Available' ? 'Manual setup' : c.availability}</small></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <ol className="sx-steps3">
                <li><span>1</span><div><b>Connect</b>Add your domain and paste one small loader, once.</div></li>
                <li><span>2</span><div><b>Verify</b>We check your live page and confirm the connection.</div></li>
                <li><span>3</span><div><b>Publish</b>Choose any quiz, choose where it appears, and publish.</div></li>
              </ol>
            </div>
          ) : null}

          {sites.length > 0 ? (
            <>
              <div className="sx-metrics" aria-label="Connection summary">
                <div className="sx-metric"><span>Connected sites</span><b>{sites.length}{config?.limits.maxSites ? ' of ' + config.limits.maxSites : ''}</b></div>
                <div className="sx-metric"><span>Live installations</span><b>{liveCount}</b></div>
                <div className="sx-metric"><span>Connection health</span><b style={{ fontSize: 18, marginTop: 8 }}><StatusBadge state={health.state} label={health.label} /></b></div>
                <div className="sx-metric"><span>Last verified</span><b style={{ fontSize: 20 }}>{lastVerified ? relativeTime(lastVerified) : 'Not yet'}</b></div>
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

              <div className="sx-lower">
              <section className="sx-section" aria-labelledby="sx-live-h">
                <h2 id="sx-live-h">Live installations</h2>
                <p>Quizzes currently shown on connected websites.</p>
                {liveRows.length === 0 && detailsError ? (
                  <p className="sx-note sx-bad" role="alert">We could not load your installations. <button type="button" className="sx-btn sx-btn-sm" onClick={() => load()}>Try again</button></p>
                ) : liveRows.length === 0 ? <p style={{ color: 'var(--muted)' }}>Nothing is live yet. Publish a quiz to a verified website to see it here.</p> : (
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
              </div>
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
