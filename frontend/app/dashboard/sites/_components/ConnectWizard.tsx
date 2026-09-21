'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectApi, ConnectApiError, Site, loaderSnippet } from '@/lib/connect/client';
import { PLATFORM_CHOICES, SQUARESPACE_EXPLANATION, recoveryFor, friendlyError, PLATFORM_LABEL } from '@/lib/connect/copy';
import { Modal, PlatformLogo, CopyButton, useAnnounce } from './primitives';

type Step = 1 | 2 | 3 | 4 | 5;
type Check = 'idle' | 'wait' | 'pass' | 'fail';
const STEP_NAMES = ['Platform', 'Website', 'Install once', 'Verify'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NO_RETRY = ['page_requires_login', 'wrong_domain'];
const NOT_REACHABLE = ['unreachable', 'timeout', 'wrong_domain', 'page_requires_login'];

const CHECK_TEXT: Record<Check, string> = { idle: 'Not started', wait: 'Checking', pass: 'Passed', fail: 'Did not pass' };

/** Domain only: no paths or page links. Returns an error message, or null when it looks right. */
export function checkDomainInput(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Enter your website domain, for example yourbusiness.com.';
  const bare = v.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  if (/[\s]/.test(bare)) return 'A domain cannot contain spaces.';
  if (/[/?#]/.test(bare.replace(/\/+$/, ''))) return 'Enter the domain only, without page links or paths.';
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(bare.replace(/\/+$/, '').replace(/:\d+$/, ''))) return 'That does not look like a complete domain, for example yourbusiness.com.';
  return null;
}

export function ConnectWizard({ open, token, existingSite, onClose, onVerified }: {
  open: boolean; token: string; existingSite: Site | null; onClose: () => void; onVerified: (site: Site, publishNext: boolean) => void;
}) {
  const announce = useAnnounce();
  const api = useRef(connectApi(token));
  useEffect(() => { api.current = connectApi(token); }, [token]);
  const [step, setStep] = useState<Step>(1);
  const [platform, setPlatform] = useState<'squarespace' | 'html' | null>(null);
  const [note, setNote] = useState('');
  const [domain, setDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [busy, setBusy] = useState(false);
  const [site, setSite] = useState<Site | null>(null);
  const [loaderUrl, setLoaderUrl] = useState('');
  const [checks, setChecks] = useState<{ reachable: Check; loader: Check; heartbeat: Check }>({ reachable: 'idle', loader: 'idle', heartbeat: 'idle' });
  const [verifying, setVerifying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const cancel = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancel.current = true; }; }, []);

  // Open fresh, or resume an unfinished connection at the loader step (progress is saved on the server).
  useEffect(() => {
    if (!open) return;
    cancel.current = false;
    setNote(''); setDomainError(''); setFailure(null); setMessage(''); setVerifying(false); setBusy(false);
    setChecks({ reachable: 'idle', loader: 'idle', heartbeat: 'idle' });
    if (existingSite) {
      setPlatform(existingSite.platform); setDomain(existingSite.hostname); setSite(existingSite); setStep(3);
      api.current.getSite(existingSite.id).then((d) => { if (mounted.current) setLoaderUrl(d.loaderUrl); }).catch(() => undefined);
    } else { setPlatform(null); setDomain(''); setSite(null); setLoaderUrl(''); setStep(1); }
  }, [open, existingSite]);

  const close = useCallback(() => { cancel.current = true; onClose(); }, [onClose]);

  function choose(id: string) {
    const c = PLATFORM_CHOICES.find((p) => p.id === id)!;
    if (c.availability !== 'Available') {
      const text = c.label + ' is ' + c.availability.toLowerCase() + '. Until then you can connect it as Other / HTML with the site loader.';
      setNote(text); setPlatform(null); announce(text); return;
    }
    setNote(''); setPlatform(id as 'squarespace' | 'html');
  }

  async function createSite() {
    const problem = checkDomainInput(domain);
    if (problem) { setDomainError(problem); announce(problem, true); return; }
    if (!platform) return;
    setBusy(true); setDomainError('');
    try {
      const r = await api.current.createSite(platform, domain.trim());
      if (!mounted.current) return;
      setSite(r.site); setLoaderUrl(r.loaderUrl); setStep(3); announce('Website added. Next, install the site loader.');
    } catch (e) {
      const err = e as ConnectApiError;
      const msg = friendlyError(err.code, err.message);
      setDomainError(msg); announce(msg, true);
    } finally { if (mounted.current) setBusy(false); }
  }

  async function runVerify() {
    if (!site) return;
    setVerifying(true); setFailure(null); setMessage(''); cancel.current = false;
    setChecks({ reachable: 'wait', loader: 'idle', heartbeat: 'idle' });
    announce('Checking your live website. This can take up to a minute.');
    let okSite: Site | null = null;
    let lastReason: string | null = null;
    for (let attempt = 0; attempt < 6 && !cancel.current; attempt++) {
      try {
        const r = await api.current.verify(site.id);
        if (!mounted.current) return;
        setSite(r.site);
        lastReason = r.result.reason;
        const reachable = !NOT_REACHABLE.includes(r.result.reason || '');
        setChecks({
          reachable: reachable ? 'pass' : 'fail',
          loader: r.result.ok ? 'pass' : reachable ? 'wait' : 'idle',
          heartbeat: r.site.last_heartbeat_at ? 'pass' : r.result.ok ? 'wait' : 'idle',
        });
        if (r.result.ok) { okSite = r.site; break; }
        if (NO_RETRY.includes(r.result.reason || '')) break;
      } catch (e) {
        const err = e as ConnectApiError;
        if (err.code === 'rate_limited') { await sleep(12000); continue; }
        setMessage(friendlyError(err.code, err.message)); lastReason = 'timeout'; break;
      }
      if (attempt < 5) await sleep(5000);
    }
    if (!mounted.current || cancel.current) return;
    setVerifying(false);
    if (okSite) { setStep(5); announce('Connection verified. Your website is ready.'); return; }
    const rec = recoveryFor(lastReason);
    setFailure(lastReason || 'unreachable');
    announce(rec.title, true);
  }

  async function reportPlan() {
    if (!site) return;
    try { const r = await api.current.reportAttention(site.id, 'plan_does_not_allow_custom_code'); setSite(r.site); setFailure('plan_does_not_allow_custom_code'); announce(recoveryFor('plan_does_not_allow_custom_code').title, true); } catch (e) { setMessage(friendlyError((e as ConnectApiError).code)); }
  }

  async function useAnotherDomain() {
    if (!site) { setStep(2); return; }
    setBusy(true);
    try { await api.current.disconnect(site.id); } catch { /* keep going: the draft can be removed later */ }
    if (!mounted.current) return;
    setBusy(false); setSite(null); setFailure(null); setChecks({ reachable: 'idle', loader: 'idle', heartbeat: 'idle' }); setStep(2);
  }

  const host = site?.hostname || domain.trim();
  const snippet = site ? loaderSnippet(loaderUrl || '', site.site_key) : '';
  const rec = failure ? recoveryFor(failure) : null;
  const shownStep = step === 5 ? 4 : step;

  const stepper = (
    <ol className="sx-stepper" aria-label="Connection steps">
      {STEP_NAMES.map((n, i) => (
        <li key={n} aria-current={shownStep === i + 1 ? 'step' : undefined} className={step > i + 1 || step === 5 ? 'sx-done' : ''}>
          <span aria-hidden="true">{step > i + 1 || step === 5 ? '\u2713' : i + 1}</span>{n}
          {step > i + 1 || step === 5 ? <span className="sx-sr">, done</span> : null}
        </li>
      ))}
    </ol>
  );

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (step === 1) {
    body = (
      <div className="sx-step">
        {stepper}
        <h3>Where is your website built?</h3>
        <p>We will show only the connection method the platform officially supports.</p>
        <div className="sx-platforms" role="group" aria-label="Platforms">
          {PLATFORM_CHOICES.map((c) => {
            const available = c.availability === 'Available';
            return (
              <button key={c.id} type="button" className="sx-platform" aria-pressed={available ? platform === c.id : undefined} aria-disabled={!available} onClick={() => choose(c.id)}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <PlatformLogo id={c.sprite} size={28} />
                  <span className={'sx-badge ' + (available ? 'sx-b-ok' : 'sx-b-neutral')}>{c.availability}</span>
                </span>
                <b>{c.label}</b>
                <small>{c.method}</small>
              </button>
            );
          })}
        </div>
        {note ? <div className="sx-note" role="status">{note}</div> : null}
        {platform === 'squarespace' ? <div className="sx-note"><b>How Squarespace works.</b> {SQUARESPACE_EXPLANATION}</div> : null}
        {platform === 'html' ? <div className="sx-note"><b>How the site loader works.</b> You paste one small line into your website once. After it is verified, popup and floating quizzes are controlled here. Each new inline location needs one slot, added once.</div> : null}
      </div>
    );
    footer = (<><span className="sx-hint">Progress is saved automatically</span><button type="button" className="sx-btn sx-btn-primary" disabled={!platform} onClick={() => setStep(2)}>Continue</button></>);
  } else if (step === 2) {
    body = (
      <div className="sx-step">
        {stepper}
        <h3>Which website should we connect?</h3>
        <p>Enter the public domain you own.{platform === 'squarespace' ? ' We never ask for your Squarespace password.' : ''}</p>
        <div className="sx-field">
          <label htmlFor="sx-domain">Website domain</label>
          <input id="sx-domain" data-autofocus className="sx-input" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="yourbusiness.com" value={domain}
            aria-invalid={domainError ? true : undefined} aria-describedby={'sx-domain-help' + (domainError ? ' sx-domain-err' : '')}
            onChange={(e) => { setDomain(e.target.value); setDomainError(''); }} onKeyDown={(e) => { if (e.key === 'Enter' && !busy) createSite(); }} />
          <small id="sx-domain-help">No paths or page links. We check https:// followed by your domain.</small>
          {domainError ? <p id="sx-domain-err" className="sx-err" role="alert">{domainError}</p> : null}
        </div>
      </div>
    );
    footer = (<><button type="button" className="sx-btn" onClick={() => setStep(1)}>Back</button><button type="button" className="sx-btn sx-btn-primary" disabled={busy} onClick={createSite}>{busy ? 'Adding website' : 'Continue'}</button></>);
  } else if (step === 3) {
    const sq = (site?.platform || platform) === 'squarespace';
    body = (
      <div className="sx-step">
        {stepper}
        <h3>Add the Squarespell site loader.</h3>
        <p>{sq ? 'This small loader connects your website to Squarespell. Paste it once in your Squarespace Code Injection settings. You will not repeat this for each quiz.' : 'This small loader connects your website to Squarespell. Paste it once into every page of your site, usually in the footer or just before the closing body tag.'}</p>
        <ol className="sx-guide">
          {sq ? (
            <>
              <li><span><b>Open Code Injection.</b> In Squarespace, open Settings, then Advanced, then Code Injection. Menu names can change, so look for Code Injection.</span></li>
              <li><span><b>Paste into Footer.</b> Add the single loader line below to the Footer field.</span></li>
              <li><span><b>Save your changes.</b> Return here and we will verify the live website.</span></li>
            </>
          ) : (
            <>
              <li><span><b>Copy the loader line.</b> It is one line and it is the same for every quiz.</span></li>
              <li><span><b>Paste it into your site.</b> Use your site-wide footer, template or tag manager so it appears on every page.</span></li>
              <li><span><b>Publish your site.</b> Return here and we will verify the live website.</span></li>
            </>
          )}
        </ol>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 14 }}>Squarespell site loader</b>
          <CopyButton text={snippet} label="Copy loader" doneLabel="Loader copied" announceText="Site loader copied to clipboard" small />
        </div>
        <pre className="sx-code" aria-label="Site loader code">{snippet}</pre>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>The site key identifies this website. It is not an account password and cannot access your {sq ? 'Squarespace ' : ''}account.</p>
        {sq ? <div className="sx-note sx-warn" style={{ marginTop: 12 }}>Code Injection needs a Squarespace plan that includes custom code. If you cannot find it, tell us in the next step.</div> : null}
      </div>
    );
    footer = (<><button type="button" className="sx-btn" onClick={() => setStep(existingSite ? 3 : 2)} disabled={!!existingSite}>Back</button><button type="button" className="sx-btn sx-btn-primary" onClick={() => setStep(4)}>I saved it, continue</button></>);
  } else if (step === 4) {
    const dot = (s: Check) => (s === 'pass' ? '\u2713' : s === 'fail' ? '!' : s === 'wait' ? '\u2026' : '\u2022');
    body = (
      <div className="sx-step">
        {stepper}
        <h3>Verify the live connection.</h3>
        <p>We check both the page source and the first secure signal from your website.</p>
        <div className="sx-note" style={{ marginTop: 0 }} data-testid="verify-target">Checking <b>{'https://' + host}</b></div>
        <div className="sx-scan" data-idle={verifying ? 'false' : 'true'} aria-hidden="true" />
        <ul className="sx-checks" aria-label="Verification checks">
          {([['Website reachable', checks.reachable], ['Site loader detected', checks.loader], ['Secure signal from your site', checks.heartbeat]] as Array<[string, Check]>).map(([label, s]) => (
            <li key={label}><span>{label}</span><span className={'sx-badge ' + (s === 'pass' ? 'sx-b-ok' : s === 'fail' ? 'sx-b-bad' : s === 'wait' ? 'sx-b-teal' : 'sx-b-neutral')}><span aria-hidden="true">{dot(s)}</span>{CHECK_TEXT[s]}</span></li>
          ))}
        </ul>
        {!verifying && !failure && !message ? <p style={{ color: 'var(--muted)', margin: 0 }}>Ready to verify. Save the loader on {(site?.platform || platform) === 'squarespace' ? 'Squarespace' : 'your website'}, then start the check.</p> : null}
        {verifying ? <p style={{ color: 'var(--muted)', margin: 0 }}>Still checking. Squarespace can take a moment to publish your change. You can cancel at any time.</p> : null}
        {message ? <div className="sx-note sx-bad" role="alert">{message}</div> : null}
        {rec ? (
          <div className="sx-note sx-warn" role="alert" data-testid="recovery">
            <b>{rec.title}</b>
            <p style={{ margin: '4px 0 6px' }}>{rec.body}</p>
            <ol style={{ margin: '0 0 8px', paddingLeft: 18 }}>{rec.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {rec.action === 'back' ? <button type="button" className="sx-btn sx-btn-sm" onClick={useAnotherDomain} disabled={busy}>Use a different domain</button> : <button type="button" className="sx-btn sx-btn-sm" onClick={runVerify}>Check again</button>}
              <button type="button" className="sx-btn sx-btn-sm" onClick={() => { setFailure(null); setStep(3); }}>Show the loader again</button>
              {failure === 'loader_not_found' && (site?.platform || platform) === 'squarespace' ? <button type="button" className="sx-btn sx-btn-sm" onClick={reportPlan}>I cannot find Code Injection</button> : null}
            </div>
          </div>
        ) : null}
      </div>
    );
    footer = (
      <>
        <button type="button" className="sx-btn" onClick={() => { cancel.current = true; setVerifying(false); setStep(3); }}>Back</button>
        {verifying ? <button type="button" className="sx-btn" onClick={() => { cancel.current = true; setVerifying(false); setChecks({ reachable: 'idle', loader: 'idle', heartbeat: 'idle' }); announce('Verification cancelled'); }}>Cancel check</button>
          : <button type="button" className="sx-btn sx-btn-primary" onClick={runVerify}>Verify connection</button>}
      </>
    );
  } else {
    body = (
      <div className="sx-step sx-success">
        <div className="sx-tick" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
        <h3>Connection verified</h3>
        <p>Your website is ready. From now on, publish, update, pause, move or remove quizzes from Squarespell. You will not paste the site loader again.</p>
        <div className="sx-row" style={{ textAlign: 'left' }}>
          <div className="sx-host"><span className="sx-logo"><PlatformLogo id={(site?.platform || 'html')} size={22} /></span><div className="sx-meta"><b>{site?.hostname}</b><span>{site ? PLATFORM_LABEL[site.platform] : ''}</span></div></div>
          <span className="sx-badge sx-b-ok"><span aria-hidden="true">{'\u2713'}</span>Verified</span>
        </div>
      </div>
    );
    footer = (<><button type="button" className="sx-btn" onClick={() => { if (site) onVerified(site, false); }}>Go to website</button><button type="button" className="sx-btn sx-btn-primary" onClick={() => { if (site) onVerified(site, true); }}>Publish a quiz</button></>);
  }

  return (
    <Modal open={open} title="Connect a website" subtitle="Connect once, then manage every quiz from Squarespell." onClose={close} footer={footer}>
      {body}
    </Modal>
  );
}
