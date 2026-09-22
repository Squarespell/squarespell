'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectApi, ConnectApiError, Installation, QuizSummary, Site, SiteEvent, VerificationCheck } from '@/lib/connect/client';
import { INSTALL_STATUS_LABEL, MODE_LABEL, PLATFORM_LABEL, eventIsProblem, eventText, friendlyError, recoveryFor, relativeTime } from '@/lib/connect/copy';
import { ActionMenu, InstallBadge, Modal, PlatformLogo, StatusBadge, useAnnounce } from './primitives';
import { PublishFlow } from './PublishFlow';

type Tab = 'installations' | 'health' | 'activity';
type Confirm = null | { kind: 'remove'; inst: Installation } | { kind: 'disconnect' };

function pagesText(i: Installation): string {
  if (i.path_include.length) return i.path_include.length === 1 ? i.path_include[0] : i.path_include.length + ' pages';
  if (i.path_exclude.length) return 'All except ' + i.path_exclude.length;
  return 'All pages';
}

export function SiteDetailBody({ token, siteId, quizzes, onChanged, onDisconnected, onFinishSetup }: {
  token: string; siteId: string; quizzes: QuizSummary[]; onChanged: () => void; onDisconnected: () => void; onFinishSetup: (site: Site) => void;
}) {
  const announce = useAnnounce();
  const api = useRef(connectApi(token));
  useEffect(() => { api.current = connectApi(token); }, [token]);
  const [data, setData] = useState<{ site: Site; installations: Installation[]; events: SiteEvent[]; checks: VerificationCheck[] } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Tab>('installations');
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [edit, setEdit] = useState<{ inst: Installation; kind: 'update' | 'move' } | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async () => {
    try {
      const d = await api.current.getSite(siteId);
      if (!mounted.current) return;
      setData(d); setLoadError('');
    } catch (e) {
      if (!mounted.current) return;
      setLoadError(friendlyError((e as ConnectApiError).code, (e as Error).message));
    }
  }, [siteId]);
  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load(); }, 30000); return () => clearInterval(t); }, [load]);

  async function run(label: string, fn: () => Promise<unknown>, done: string) {
    setBusy(label); setProblem('');
    try { await fn(); announce(done); await load(); onChanged(); }
    catch (e) { const m = friendlyError((e as ConnectApiError).code, (e as Error).message); setProblem(m); announce(m, true); }
    finally { if (mounted.current) setBusy(''); }
  }

  if (loadError && !data) {
    return (<div className="sx-note sx-bad" role="alert"><b>{loadError}</b><div style={{ marginTop: 8 }}><button type="button" className="sx-btn sx-btn-sm" onClick={load}>Try again</button></div></div>);
  }
  if (!data) return <p role="status" style={{ color: 'var(--muted)' }}>Loading website details</p>;

  const { site, installations, events, checks } = data;
  const disconnected = site.state === 'disconnected';
  const live = installations.filter((i) => i.status === 'live' || i.status === 'updating' || i.status === 'moving').length;
  const attention = site.state === 'needs_attention' || (site.state === 'verifying' && !!site.attention_reason);
  const rec = attention ? recoveryFor(site.attention_reason) : null;
  const lastOk = checks.find((c) => c.method === 'page_fetch' && c.result === 'ok');

  return (
    <div>
      <div className="sx-site-head">
        <div className="sx-host"><span className="sx-logo"><PlatformLogo id={site.platform} size={22} /></span><div><b>{site.hostname}</b><small>{PLATFORM_LABEL[site.platform]}, connected {new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div></div>
        <StatusBadge state={site.state} />
      </div>

      {site.state === 'draft' || (site.state === 'verifying' && !attention) ? (
        <div className="sx-note sx-warn" role="status"><b>Setup is not finished.</b> Install the site loader and verify it to publish quizzes here.
          <div style={{ marginTop: 8 }}><button type="button" className="sx-btn sx-btn-sm sx-btn-primary" onClick={() => onFinishSetup(site)}>Finish setup</button></div></div>
      ) : null}

      {rec ? (
        <div className="sx-note sx-warn" role="alert" data-testid="site-recovery" style={{ marginTop: 0, marginBottom: 14 }}>
          <b>{rec.title}</b>
          <p style={{ margin: '4px 0 6px' }}>{rec.body}</p>
          <ol style={{ margin: '0 0 8px', paddingLeft: 18 }}>{rec.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <button type="button" className="sx-btn sx-btn-sm" disabled={!!busy} onClick={() => run('verify', () => api.current.verify(siteId), 'Check finished')}>{busy === 'verify' ? 'Checking' : 'Check again'}</button>
          {!site.last_verified_at ? <button type="button" className="sx-btn sx-btn-sm" style={{ marginLeft: 8 }} onClick={() => onFinishSetup(site)}>Show the loader again</button> : null}
        </div>
      ) : null}
      {problem ? <div className="sx-note sx-bad" role="alert" style={{ marginBottom: 14 }}>{problem}</div> : null}

      <dl className="sx-kv">
        <dt>Live quizzes</dt><dd>{live} {live === 1 ? 'installation' : 'installations'}</dd>
        <dt>Heartbeat</dt><dd>{site.last_heartbeat_at ? relativeTime(site.last_heartbeat_at) : 'Not received yet'}</dd>
        <dt>Loader</dt><dd>{site.loader_version_seen ? 'Version ' + site.loader_version_seen : 'Not seen yet'}</dd>
        <dt>Last verified</dt><dd>{site.last_verified_at ? relativeTime(site.last_verified_at) : 'Not verified yet'}</dd>
      </dl>

      <div role="tablist" aria-label="Website details" className="sx-tabs" onKeyDown={(e) => {
        const order: Tab[] = ['installations', 'health', 'activity'];
        const i = order.indexOf(tab);
        if (e.key === 'ArrowRight') { e.preventDefault(); setTab(order[(i + 1) % 3]); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(order[(i + 2) % 3]); }
      }}>
        {([['installations', 'Installations'], ['health', 'Connection health'], ['activity', 'Activity']] as Array<[Tab, string]>).map(([id, label]) => (
          <button key={id} type="button" role="tab" id={'tab-' + id} aria-selected={tab === id} aria-controls={'panel-' + id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab}>
        {tab === 'installations' ? (
          installations.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No quizzes are published on this website yet.</p>
          ) : (
            <ul className="sx-list">
              {installations.map((i) => (
                <li key={i.id} className="sx-row">
                  <div className="sx-meta"><b>{i.quiz?.title || 'Quiz'}</b><span>{MODE_LABEL[i.mode]}{i.placement_ref ? ' (' + i.placement_ref + ')' : ''}, {pagesText(i)}, updated {relativeTime(i.updated_at)}</span></div>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <InstallBadge status={i.status} label={INSTALL_STATUS_LABEL[i.status]} />
                    {!disconnected ? (
                      <ActionMenu label={'Actions for ' + (i.quiz?.title || 'quiz')} items={[
                        { label: 'Edit pages and options', onSelect: () => setEdit({ inst: i, kind: 'update' }) },
                        { label: 'Move to other pages', onSelect: () => setEdit({ inst: i, kind: 'move' }) },
                        i.status === 'paused' ? { label: 'Resume', onSelect: () => run('inst', () => api.current.resume(i.id), 'Quiz resumed') } : { label: 'Pause', onSelect: () => run('inst', () => api.current.pause(i.id), 'Quiz paused') },
                        { label: 'Remove from website', danger: true, onSelect: () => setConfirm({ kind: 'remove', inst: i }) },
                      ]} />
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === 'health' ? (
          <div>
            <ul className="sx-checks" aria-label="Connection health">
              <li><span>Site loader found</span><span className={'sx-badge ' + (lastOk ? 'sx-b-ok' : 'sx-b-neutral')}><span aria-hidden="true">{lastOk ? '\u2713' : '\u2022'}</span>{lastOk ? relativeTime(lastOk.checked_at) : 'Not yet'}</span></li>
              <li><span>Heartbeat received</span><span className={'sx-badge ' + (site.last_heartbeat_at ? 'sx-b-ok' : 'sx-b-neutral')}><span aria-hidden="true">{site.last_heartbeat_at ? '\u2713' : '\u2022'}</span>{site.last_heartbeat_at ? relativeTime(site.last_heartbeat_at) : 'Not yet'}</span></li>
              <li><span>Connection health</span><span className={'sx-badge ' + (site.health === 'healthy' ? 'sx-b-ok' : site.health === 'not_verified' ? 'sx-b-neutral' : 'sx-b-warn')}>{site.health === 'healthy' ? '\u2713 Healthy' : site.health === 'awaiting_heartbeat' ? '\u2026 Waiting for the first signal' : site.health === 'stale' ? '! No recent signal' : 'Not verified'}</span></li>
            </ul>
            <h3 style={{ fontSize: 14, margin: '14px 0 6px' }}>Recent checks</h3>
            {checks.length === 0 ? <p style={{ color: 'var(--muted)' }}>No checks yet.</p> : (
              <ul className="sx-timeline">{checks.map((c) => <li key={c.id}><span aria-hidden="true">{c.result === 'ok' ? '\u2713' : '!'}</span><div>{c.method === 'page_fetch' ? 'Page check' : 'Heartbeat'}: {c.result === 'ok' ? 'passed' : 'did not pass' + (c.reason_code ? ' (' + recoveryFor(c.reason_code).title.toLowerCase() + ')' : '')}<time>{relativeTime(c.checked_at)}</time></div></li>)}</ul>
            )}
          </div>
        ) : null}

        {tab === 'activity' ? (
          events.length === 0 ? <p style={{ color: 'var(--muted)' }}>No activity yet.</p> : (
            <ul className="sx-timeline">{events.map((e) => <li key={e.id}><span aria-hidden="true">{eventIsProblem(e.action) ? '!' : '\u2713'}</span><div>{eventText(e.action)}<time>{relativeTime(e.created_at)}{e.actor === 'system' ? ', automatic' : e.actor === 'loader' ? ', from your website' : ''}</time></div></li>)}</ul>
          )
        ) : null}
      </div>

      {!disconnected ? (
        <div className="sx-actions" style={{ marginTop: 18 }}>
          <button type="button" className="sx-btn sx-btn-primary" disabled={site.state !== 'verified'} onClick={() => setPublishOpen(true)}>Publish another quiz</button>
          <button type="button" className="sx-btn" disabled={!!busy} onClick={() => run('verify', () => api.current.verify(siteId), 'Check finished')}>{busy === 'verify' ? 'Checking' : 'Re-check connection'}</button>
          {site.state === 'paused'
            ? <button type="button" className="sx-btn" disabled={!!busy} onClick={() => run('site', () => api.current.resumeSite(siteId), 'Website resumed')}>Resume website</button>
            : site.state === 'verified' ? <button type="button" className="sx-btn" disabled={!!busy} onClick={() => run('site', () => api.current.pauseSite(siteId), 'Website paused. Quizzes are hidden until you resume.')}>Pause website</button> : null}
          <button type="button" className="sx-btn sx-btn-danger" disabled={!!busy} onClick={() => setConfirm({ kind: 'disconnect' })}>Disconnect</button>
        </div>
      ) : <p style={{ color: 'var(--muted)' }}>This website is disconnected. No quizzes are shown on it.</p>}

      <PublishFlow open={publishOpen} token={token} site={site} quizzes={quizzes} onClose={() => setPublishOpen(false)} onDone={() => { setPublishOpen(false); load(); onChanged(); }} />
      <PublishFlow open={!!edit} token={token} site={site} quizzes={quizzes} installation={edit?.inst || null} editKind={edit?.kind || 'update'} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); onChanged(); }} />

      <Modal open={confirm?.kind === 'remove'} title="Remove this quiz from your website?" subtitle={confirm?.kind === 'remove' ? (confirm.inst.quiz?.title || 'Quiz') + ' on ' + site.hostname : undefined} onClose={() => setConfirm(null)}
        footer={<><button type="button" className="sx-btn" onClick={() => setConfirm(null)}>Keep it</button><button type="button" className="sx-btn sx-btn-danger" onClick={async () => { const c = confirm; setConfirm(null); if (c?.kind === 'remove') await run('inst', () => api.current.remove(c.inst.id), 'Quiz removed from your website'); }}>Remove quiz</button></>}>
        <p>It disappears from your live website within about a minute. Your quiz and its leads in Squarespell are not deleted, and you can publish it again at any time.</p>
      </Modal>
      <Modal open={confirm?.kind === 'disconnect'} title={'Disconnect ' + site.hostname + '?'} onClose={() => setConfirm(null)}
        footer={<><button type="button" className="sx-btn" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="sx-btn sx-btn-danger" onClick={async () => { setConfirm(null); await run('site', () => api.current.disconnect(siteId), 'Website disconnected'); onDisconnected(); }}>Disconnect website</button></>}>
        <p>Every quiz installed on this website is removed from it. Nothing is deleted from your Squarespell account. You can remove the loader line from {site.platform === 'squarespace' ? 'Code Injection' : 'your site'} afterwards, or connect the website again later.</p>
      </Modal>
    </div>
  );
}

export function SiteDetailDrawer(props: { open: boolean; siteId: string | null; token: string; quizzes: QuizSummary[]; onClose: () => void; onChanged: () => void; onFinishSetup: (site: Site) => void }) {
  return (
    <Modal open={props.open && !!props.siteId} title="Website details" subtitle="Connection, installations and history." onClose={props.onClose} drawer>
      {props.siteId ? <SiteDetailBody token={props.token} siteId={props.siteId} quizzes={props.quizzes} onChanged={props.onChanged} onDisconnected={props.onClose} onFinishSetup={props.onFinishSetup} /> : null}
    </Modal>
  );
}
