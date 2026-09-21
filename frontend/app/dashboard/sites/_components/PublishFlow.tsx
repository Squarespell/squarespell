'use client';

import { useEffect, useRef, useState } from 'react';
import { connectApi, ConnectApiError, DisplayOptions, Installation, InstallMode, QuizSummary, Site, slotSnippet } from '@/lib/connect/client';
import { MODE_LABEL, friendlyError, recoveryFor } from '@/lib/connect/copy';
import { Modal, CopyButton, useAnnounce } from './primitives';

type Rule = 'all' | 'include' | 'exclude';
type Prog = 'idle' | 'run' | 'done' | 'fail';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SLOT_OK = /^[a-z0-9][a-z0-9-]{0,39}$/;
const RULE_OK = /^(\*|\/[^\s<>"'`\\?#*]*(\/\*)?)$/;

export function normalizeRule(v: string): string | null {
  const s = v.trim().toLowerCase();
  if (s === '*' || s === '/*') return '*';
  const withSlash = s.startsWith('/') ? s : '/' + s;
  if (!RULE_OK.test(withSlash) || withSlash.length > 200) return null;
  return withSlash.length > 1 && !withSlash.endsWith('/*') ? withSlash.replace(/\/+$/, '') || '/' : withSlash;
}

/** The display options and page rules a form state produces. Exported so the tests can pin the exact API payload. */
export function buildPayload(f: { mode: InstallMode; slot: string; ruleMode: Rule; paths: string[]; buttonText: string; hideOnMobile: boolean; trigger: 'delay' | 'scroll' | 'exit'; delaySeconds: number; scrollPercent: number; remember: boolean }) {
  const options: DisplayOptions = {};
  if (f.mode !== 'inline') {
    if (f.buttonText.trim()) options.buttonText = f.buttonText.trim();
    if (f.hideOnMobile) options.hideOnMobile = true;
  }
  if (f.mode === 'popup') {
    options.trigger = f.trigger;
    if (f.trigger === 'delay') options.delaySeconds = f.delaySeconds;
    if (f.trigger === 'scroll') options.scrollPercent = f.scrollPercent;
    if (f.remember) options.dismissDays = 7;
  }
  return {
    mode: f.mode,
    slot: f.mode === 'inline' ? f.slot : undefined,
    include: f.ruleMode === 'include' ? f.paths : [],
    exclude: f.ruleMode === 'exclude' ? f.paths : [],
    options,
  };
}

const MODES: Array<{ id: InstallMode; title: string; body: string; badge?: string }> = [
  { id: 'inline', title: 'Inline', body: 'Add it inside a page. A new location needs one slot.' },
  { id: 'popup', title: 'Popup', body: 'Open after a delay, scroll depth or exit intent.' },
  { id: 'floating_tab', title: 'Floating tab', body: 'A small tab stays visible without covering the page. No new code needed.', badge: 'Recommended' },
];

export function PublishFlow({ open, token, site, quizzes, presetQuizId, installation, editKind = 'update', onClose, onDone }: {
  open: boolean; token: string; site: Site; quizzes: QuizSummary[]; presetQuizId?: string | null; installation?: Installation | null; editKind?: 'update' | 'move';
  onClose: () => void; onDone: (i: Installation) => void;
}) {
  const announce = useAnnounce();
  const api = useRef(connectApi(token));
  useEffect(() => { api.current = connectApi(token); }, [token]);
  const editing = !!installation;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [quizId, setQuizId] = useState('');
  const [mode, setMode] = useState<InstallMode>('floating_tab');
  const [slot, setSlot] = useState('');
  const [ruleMode, setRuleMode] = useState<Rule>('all');
  const [paths, setPaths] = useState<string[]>([]);
  const [pathInput, setPathInput] = useState('');
  const [pathError, setPathError] = useState('');
  const [buttonText, setButtonText] = useState('Take the quiz');
  const [hideOnMobile, setHideOnMobile] = useState(false);
  const [remember, setRemember] = useState(false);
  const [trigger, setTrigger] = useState<'delay' | 'scroll' | 'exit'>('delay');
  const [delaySeconds, setDelaySeconds] = useState(8);
  const [scrollPercent, setScrollPercent] = useState(50);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [prog, setProg] = useState<[Prog, Prog, Prog]>(['idle', 'idle', 'idle']);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [result, setResult] = useState<Installation | null>(null);
  const [confirmed, setConfirmed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!open) return;
    setError(null); setResult(null); setBusy(false); setFormError(''); setPathInput(''); setPathError(''); setProg(['idle', 'idle', 'idle']); setConfirmed(true);
    if (installation) {
      const o = installation.options || {};
      setQuizId(installation.quiz_id); setMode(installation.mode); setSlot(installation.placement_ref || '');
      setRuleMode(installation.path_include.length ? 'include' : installation.path_exclude.length ? 'exclude' : 'all');
      setPaths(installation.path_include.length ? installation.path_include : installation.path_exclude);
      setButtonText(o.buttonText || 'Take the quiz'); setHideOnMobile(!!o.hideOnMobile); setRemember(!!o.dismissDays);
      setTrigger(o.trigger || 'delay'); setDelaySeconds(o.delaySeconds ?? 8); setScrollPercent(o.scrollPercent ?? 50);
      setStep(2);
    } else {
      const live = quizzes.filter((q) => q.status === 'live');
      setQuizId(presetQuizId && live.some((q) => q.id === presetQuizId) ? presetQuizId : live[0]?.id || '');
      setMode('floating_tab'); setSlot(''); setRuleMode('all'); setPaths([]); setButtonText('Take the quiz'); setHideOnMobile(false); setRemember(false);
      setTrigger('delay'); setDelaySeconds(8); setScrollPercent(50); setStep(1);
    }
  }, [open, installation, presetQuizId, quizzes]);

  const quiz = quizzes.find((q) => q.id === quizId) || installation?.quiz || null;
  const liveQuizzes = quizzes.filter((q) => q.status === 'live');
  const slotOk = mode !== 'inline' || SLOT_OK.test(slot);

  function addPath() {
    const n = normalizeRule(pathInput);
    if (!n) { setPathError('Use a path like /pricing, a section like /services/* or *.'); announce('Invalid page rule', true); return; }
    if (paths.length >= 20) { setPathError('You can add up to 20 page rules.'); return; }
    if (!paths.includes(n)) setPaths([...paths, n]);
    setPathInput(''); setPathError('');
  }

  function next1() {
    if (!quizId) { setFormError('Choose a live quiz to publish.'); announce('Choose a live quiz to publish.', true); return; }
    if (!slotOk) { setFormError('Give the slot a name using lower-case letters, numbers and dashes.'); announce('Slot name needed', true); return; }
    setFormError(''); setStep(2);
  }

  async function publishNow() {
    if (ruleMode !== 'all' && paths.length === 0) { setFormError('Add at least one page, or choose All pages.'); announce('Add at least one page, or choose All pages.', true); return; }
    setFormError(''); setStep(3); setError(null); setBusy(true);
    setProg(['run', 'idle', 'idle']); announce(editing ? 'Updating your installation' : 'Publishing your quiz');
    const payload = buildPayload({ mode, slot, ruleMode, paths, buttonText, hideOnMobile, trigger, delaySeconds, scrollPercent, remember });
    try {
      await sleep(250);
      setProg(['done', 'run', 'idle']);
      let inst: Installation;
      if (installation) {
        inst = editKind === 'move'
          ? (await api.current.move(installation.id, { include: payload.include, exclude: payload.exclude, slot: payload.slot })).installation
          : (await api.current.update(installation.id, { include: payload.include, exclude: payload.exclude, options: payload.options })).installation;
      } else {
        inst = (await api.current.publish(site.id, { quizId, mode: payload.mode, slot: payload.slot, include: payload.include, exclude: payload.exclude, options: payload.options })).installation;
      }
      if (!mounted.current) return;
      setProg(['done', 'done', 'run']);
      // Confirm against the PUBLIC manifest, exactly as the loader will read it.
      const m = await api.current.publicManifest(site.site_key);
      if (!mounted.current) return;
      const seen = !!m && (inst.status !== 'live' || m.installations.some((i) => i.id === inst.id));
      setConfirmed(seen);
      setProg(['done', 'done', seen ? 'done' : 'fail']);
      setResult(inst); setStep(4);
      announce(seen ? 'Published and verified. Your quiz is live.' : 'Published. The live manifest has not confirmed it yet.', !seen);
    } catch (e) {
      if (!mounted.current) return;
      const err = e as ConnectApiError;
      setProg((p) => [p[0], p[1] === 'run' ? 'fail' : p[1], 'idle'] as [Prog, Prog, Prog]);
      setError({ code: err.code, message: friendlyError(err.code, err.message) });
      announce(friendlyError(err.code, err.message), true);
    } finally { if (mounted.current) setBusy(false); }
  }

  const stepNames = editing ? ['Pages and preview', 'Publish'] : ['Placement', 'Pages and preview', 'Publish'];
  const shown = editing ? (step === 2 ? 1 : 2) : (step === 4 ? 3 : step);
  const stepper = (
    <ol className="sx-stepper" aria-label="Publishing steps">
      {stepNames.map((n, i) => (
        <li key={n} aria-current={shown === i + 1 ? 'step' : undefined} className={shown > i + 1 || step === 4 ? 'sx-done' : ''}><span aria-hidden="true">{shown > i + 1 || step === 4 ? '\u2713' : i + 1}</span>{n}</li>
      ))}
    </ol>
  );

  const radioKeys = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setMode(MODES[(i + 1) % 3].id); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setMode(MODES[(i + 2) % 3].id); }
  };

  const summary = (ruleMode === 'all' ? 'All pages' : ruleMode === 'include' ? 'Selected pages' : 'All except selected pages');
  const previewSrc = quiz ? '/embed/' + encodeURIComponent(quiz.slug) + '?embed=1&preview=1' : '';
  const liveUrl = 'https://' + site.hostname + (ruleMode === 'include' && paths[0] && !paths[0].includes('*') ? paths[0] : '/');

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (step === 1) {
    body = (
      <div className="sx-step">
        {stepper}
        <h3>Choose how it appears</h3>
        <p>How should visitors open your quiz? Popup and floating tab are ready immediately on this connected site. Inline placement needs a slot added once at that location.</p>
        <div className="sx-field">
          <label htmlFor="sx-quiz">Quiz</label>
          <select id="sx-quiz" data-autofocus className="sx-input" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
            {liveQuizzes.length === 0 ? <option value="">No live quizzes yet</option> : null}
            {liveQuizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
          {liveQuizzes.length === 0 ? <small>Publish a quiz first, then add it to your website.</small> : <small>Only live quizzes can be added to a website.</small>}
        </div>
        <div className="sx-cards3" role="radiogroup" aria-label="Placement">
          {MODES.map((m, i) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} tabIndex={mode === m.id ? 0 : -1} className="sx-radio" onClick={() => setMode(m.id)} onKeyDown={(e) => radioKeys(e, i)}>
              <b>{m.title} {m.badge ? <span className="sx-badge sx-b-teal" style={{ marginLeft: 4 }}>{m.badge}</span> : null}</b>
              <small>{m.body}</small>
            </button>
          ))}
        </div>
        {mode === 'inline' ? (
          <div className="sx-note" style={{ background: '#fff', color: 'var(--ink)' }}>
            <div className="sx-field" style={{ margin: 0 }}>
              <label htmlFor="sx-slot">Slot name</label>
              <input id="sx-slot" className="sx-input" value={slot} maxLength={40} autoCapitalize="none" spellCheck={false} placeholder="hero-quiz" aria-describedby="sx-slot-help"
                onChange={(e) => setSlot(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
              <small id="sx-slot-help">Lower-case letters, numbers and dashes. One slot per location.</small>
            </div>
            {site.slots_seen.length ? (
              <div style={{ margin: '8px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Detected on your site: </span>
                {site.slots_seen.map((s) => <button key={s} type="button" className="sx-btn sx-btn-sm" style={{ marginRight: 6 }} onClick={() => setSlot(s)}>{s}</button>)}
              </div>
            ) : null}
            {SLOT_OK.test(slot) ? (
              <>
                <p style={{ margin: '8px 0 4px', fontSize: 13.5 }}>If this is a new location, add a Code Block where the quiz should appear, paste this once, then save and publish the page.</p>
                <pre className="sx-code" aria-label="Slot code">{slotSnippet(slot)}</pre>
                <CopyButton text={slotSnippet(slot)} label="Copy slot code" doneLabel="Slot code copied" announceText="Slot code copied to clipboard" small />
              </>
            ) : null}
          </div>
        ) : (
          <div className="sx-note">No new code needed. Your verified site loader will receive this installation automatically.</div>
        )}
        {formError ? <p className="sx-err" role="alert" style={{ marginTop: 10 }}>{formError}</p> : null}
      </div>
    );
    footer = (<><span className="sx-hint">The current live version stays active until this succeeds</span><span style={{ display: 'flex', gap: 8 }}><button type="button" className="sx-btn" onClick={onClose}>Cancel</button><button type="button" className="sx-btn sx-btn-primary" onClick={next1}>Continue</button></span></>);
  } else if (step === 2) {
    body = (
      <div className="sx-step">
        {stepper}
        <h3>Pages and preview</h3>
        <p>Choose where it appears. You can change this later without opening {site.platform === 'squarespace' ? 'Squarespace' : 'your website'}.</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Show on</legend>
          <div className="sx-seg" role="group" aria-label="Show on">
            {([['all', 'All pages'], ['include', 'Selected pages'], ['exclude', 'All except selected']] as Array<[Rule, string]>).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={ruleMode === id} onClick={() => setRuleMode(id)}>{label}</button>
            ))}
          </div>
        </fieldset>
        {ruleMode !== 'all' ? (
          <div className="sx-field">
            <label htmlFor="sx-path">Add a page</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="sx-path" className="sx-input" placeholder="/services" value={pathInput} autoCapitalize="none" spellCheck={false} aria-invalid={pathError ? true : undefined} aria-describedby="sx-path-help"
                onChange={(e) => { setPathInput(e.target.value); setPathError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPath(); } }} />
              <button type="button" className="sx-btn" onClick={addPath}>Add path</button>
            </div>
            <small id="sx-path-help">A page like /pricing, or a section like /services/* (also matches /services).</small>
            {pathError ? <p className="sx-err" role="alert">{pathError}</p> : null}
            <ul className="sx-chips" aria-label="Selected pages">
              {paths.map((p) => <li key={p} className="sx-chip" style={{ listStyle: 'none' }}>{p}<button type="button" aria-label={'Remove ' + p} onClick={() => setPaths(paths.filter((x) => x !== p))}>{'\u00d7'}</button></li>)}
            </ul>
          </div>
        ) : null}
        {mode !== 'inline' ? (
          <div className="sx-field">
            <label htmlFor="sx-btn-text">{mode === 'popup' ? 'Button text (when a visitor reopens it)' : 'Tab text'}</label>
            <input id="sx-btn-text" className="sx-input" maxLength={40} value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
          </div>
        ) : null}
        {mode === 'popup' ? (
          <div className="sx-field">
            <label>Open the popup</label>
            <div className="sx-seg" role="group" aria-label="Popup trigger">
              {([['delay', 'After a delay'], ['scroll', 'After scrolling'], ['exit', 'On exit intent']] as Array<['delay' | 'scroll' | 'exit', string]>).map(([id, label]) => <button key={id} type="button" aria-pressed={trigger === id} onClick={() => setTrigger(id)}>{label}</button>)}
            </div>
            {trigger === 'delay' ? <><label htmlFor="sx-delay" style={{ fontWeight: 500, fontSize: 13 }}>Seconds before it opens</label><input id="sx-delay" type="number" min={0} max={120} className="sx-input" value={delaySeconds} onChange={(e) => setDelaySeconds(Math.min(120, Math.max(0, Number(e.target.value) || 0)))} /></> : null}
            {trigger === 'scroll' ? <><label htmlFor="sx-scroll" style={{ fontWeight: 500, fontSize: 13 }}>Percent of the page scrolled</label><input id="sx-scroll" type="number" min={10} max={90} className="sx-input" value={scrollPercent} onChange={(e) => setScrollPercent(Math.min(90, Math.max(10, Number(e.target.value) || 50)))} /></> : null}
            {trigger === 'exit' ? <small>Exit intent works with a mouse. It does not open on touch screens.</small> : null}
          </div>
        ) : null}
        {mode === 'inline' && editing && editKind === 'move' ? (
          <div className="sx-field"><label htmlFor="sx-slot2">Slot name</label><input id="sx-slot2" className="sx-input" value={slot} maxLength={40} onChange={(e) => setSlot(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /><small>A new slot needs to be added to that page once, in a Code Block.</small></div>
        ) : null}
        {mode !== 'inline' ? (
          <>
            <label className="sx-toggle"><input type="checkbox" checked={hideOnMobile} onChange={(e) => setHideOnMobile(e.target.checked)} /><span><b>Hide on mobile</b><small>Keep visible on all devices unless this is on.</small></span></label>
            {mode === 'popup' ? <label className="sx-toggle"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span><b>Remember dismissal</b><small>Do not show again for 7 days. Uses the visitor's browser storage, never a cookie.</small></span></label> : null}
          </>
        ) : null}
        <div className="sx-preview">
          <div className="sx-preview-bar">
            <span>Live preview. Nothing you do here is recorded.</span>
            <span className="sx-seg" role="group" aria-label="Preview size"><button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</button><button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</button></span>
          </div>
          {quiz ? <div className="sx-frame" style={{ width: device === 'mobile' ? 340 : '100%' }}><iframe title={'Preview of ' + quiz.title} src={previewSrc} loading="lazy" /></div> : <p style={{ color: 'var(--muted)' }}>Choose a quiz to see it here.</p>}
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>{device === 'desktop' ? 'Desktop' : 'Mobile'} preview, {MODE_LABEL[mode]}, {summary}</div>
        </div>
        {formError ? <p className="sx-err" role="alert" style={{ marginTop: 10 }}>{formError}</p> : null}
      </div>
    );
    footer = (<><span className="sx-hint">The current live version stays active until this succeeds</span><span style={{ display: 'flex', gap: 8 }}>{editing ? <button type="button" className="sx-btn" onClick={onClose}>Cancel</button> : <button type="button" className="sx-btn" onClick={() => setStep(1)}>Back</button>}<button type="button" className="sx-btn sx-btn-primary" onClick={publishNow}>{editing ? 'Save changes' : 'Publish'}</button></span></>);
  } else if (step === 3) {
    const rec = error?.code === 'slot_missing' ? recoveryFor('slot_missing') : null;
    const rows: Array<[string, Prog]> = [[editing ? 'Prepare change' : 'Prepare installation', prog[0]], ['Publish site manifest', prog[1]], ['Verify live website', prog[2]]];
    const label: Record<Prog, string> = { idle: 'Waiting', run: 'Working', done: 'Done', fail: 'Did not finish' };
    body = (
      <div className="sx-step">
        {stepper}
        <h3>{editing ? 'Saving your changes' : 'Publishing your quiz'}</h3>
        <p>Squarespell is updating your site's secure manifest and checking the live result.</p>
        <div className="sx-scan" data-idle={busy ? 'false' : 'true'} aria-hidden="true" />
        <ul className="sx-checks" aria-label="Publish progress">
          {rows.map(([n, s]) => <li key={n}><span>{n}</span><span className={'sx-badge ' + (s === 'done' ? 'sx-b-ok' : s === 'fail' ? 'sx-b-bad' : s === 'run' ? 'sx-b-teal' : 'sx-b-neutral')}><span aria-hidden="true">{s === 'done' ? '\u2713' : s === 'fail' ? '!' : s === 'run' ? '\u2026' : '\u2022'}</span>{label[s]}</span></li>)}
        </ul>
        {error ? (
          <div className="sx-note sx-bad" role="alert" data-testid="publish-error">
            <b>{error.message}</b>
            {rec ? <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>{rec.steps.map((s) => <li key={s}>{s}</li>)}</ol> : <p style={{ margin: '4px 0 0' }}>Nothing changed on your live website.</p>}
          </div>
        ) : null}
      </div>
    );
    footer = busy ? (<span className="sx-hint">The current live version stays active until this succeeds</span>) : (<><button type="button" className="sx-btn" onClick={() => setStep(editing ? 2 : 1)}>Back</button><button type="button" className="sx-btn sx-btn-primary" onClick={publishNow}>Try again</button></>);
  } else {
    body = (
      <div className="sx-step sx-success">
        <div className="sx-tick" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
        <h3>{editing ? 'Changes saved' : 'Your quiz is live.'}</h3>
        <p>{quiz?.title || 'Your quiz'} {mode === 'inline' ? 'now appears in the ' + slot + ' slot' : mode === 'popup' ? 'now opens as a popup' : 'now appears as a floating tab'} on {summary.toLowerCase()}.</p>
        <div className="sx-row" style={{ textAlign: 'left' }}>
          <div className="sx-meta"><b>{site.hostname}</b><span>{confirmed ? 'Checked just now' : 'Published. Waiting for the live manifest to confirm.'}</span></div>
          <span className={'sx-badge ' + (confirmed ? 'sx-b-ok' : 'sx-b-warn')}><span aria-hidden="true">{confirmed ? '\u2713' : '!'}</span>{confirmed ? 'Live' : 'Not confirmed yet'}</span>
        </div>
        {!confirmed ? <div className="sx-note sx-warn" style={{ textAlign: 'left' }}>Your change was saved. Visitors should see it within a minute. If it does not appear, open the website and use Re-check.</div> : null}
      </div>
    );
    footer = (<><a className="sx-btn" href={liveUrl} target="_blank" rel="noopener noreferrer">View live page<span className="sx-sr"> (opens in a new tab)</span></a><button type="button" className="sx-btn sx-btn-primary" onClick={() => { if (result) onDone(result); }}>Manage installation</button></>);
  }

  return (
    <Modal open={open} title={editing ? 'Edit installation' : 'Publish to ' + site.hostname} subtitle={quiz ? quiz.title : undefined} onClose={onClose} footer={footer} wide>
      {body}
    </Modal>
  );
}
