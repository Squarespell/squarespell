/**
 * Sites screens: copy rules, no prototype data, accessible dialog behaviour, the connect wizard, the dashboard states,
 * the exact publish payload, and the responsive style contract.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useParams: () => ({ siteId: 'x' }),
  usePathname: () => '/dashboard/sites',
}));
vi.mock('../../_components/DashboardShell', () => ({ DashboardShell: ({ children }: any) => <div>{children}</div>, DASHBOARD_COLORS: {} }));
vi.mock('../../_components/useDashboardAuth', () => ({ useDashboardAuth: () => ({ token: 'tkn', status: 'ready' }) }));
vi.mock('../../_components/PageShell', () => ({ PageLoading: () => <div>Loading</div> }));

import { PLATFORM_CHOICES, RECOVERY, SITE_STATE_LABEL, INSTALL_STATUS_LABEL, PRODUCT_PROMISE, friendlyError, eventText, relativeTime } from '@/lib/connect/copy';
import { AnnounceProvider, CopyButton, Modal, SITES_CSS, StatusBadge } from '../_components/primitives';
import { ConnectWizard, checkDomainInput } from '../_components/ConnectWizard';
import { buildPayload, normalizeRule } from '../_components/PublishFlow';
import SitesRoute from '../page';

const HERE = __dirname;
const SOURCES = [
  path.join(HERE, '..', 'page.tsx'), path.join(HERE, '..', '[siteId]', 'page.tsx'),
  ...fs.readdirSync(path.join(HERE, '..', '_components')).filter((f) => f.endsWith('.tsx')).map((f) => path.join(HERE, '..', '_components', f)),
  path.join(HERE, '..', '..', '..', '..', 'lib', 'connect', 'copy.ts'),
];
const read = (f: string) => fs.readFileSync(f, 'utf8');

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('copy rules', () => {
  it('has no em dashes or en dashes in any visible product copy', () => {
    for (const f of SOURCES) expect(read(f), path.basename(f)).not.toMatch(/[\u2013\u2014]/);
  });
  it('carries no prototype data, fake analytics, fake limits or invented brands', () => {
    for (const f of SOURCES) {
      expect(read(f), path.basename(f)).not.toMatch(/riverlight|Photography Style Quiz|Brand Voice Finder|Website Fit Check|1 of 3|site_riverlight/i);
    }
  });
  it('never calls the setup one click and never promises automatic Squarespace insertion', () => {
    for (const f of SOURCES) {
      const text = read(f);
      expect(text, path.basename(f)).not.toMatch(/one[- ]click/i);
      expect(text, path.basename(f)).not.toMatch(/automatic(ally)? (page|block|insert)/i);
    }
  });
  it('states the approved promise and platform availability exactly', () => {
    expect(PRODUCT_PROMISE).toBe('Connect your website once. Publish, update or remove every quiz with one button.');
    const by = Object.fromEntries(PLATFORM_CHOICES.map((p) => [p.id, p.availability]));
    expect(by).toEqual({ squarespace: 'Available', html: 'Available', wordpress: 'Planned', shopify: 'Planned', wix: 'Planned', webflow: 'Later', framer: 'Later' });
  });
  it('has plain-language recovery for every failure the product can report', () => {
    for (const code of ['loader_not_found', 'wrong_domain', 'page_requires_login', 'plan_does_not_allow_custom_code', 'blocked_by_csp_or_consent_manager', 'slot_missing', 'token_expired', 'token_revoked', 'timeout', 'verification_lost', 'unreachable']) {
      const r = RECOVERY[code];
      expect(r, code).toBeTruthy();
      expect(r.title.length).toBeGreaterThan(10);
      expect(r.body.length).toBeGreaterThan(10);
      expect(r.steps.length).toBeGreaterThan(0);
    }
  });
  it('labels every state in words', () => {
    for (const s of ['draft', 'verifying', 'verified', 'needs_attention', 'paused', 'disconnected'] as const) expect(SITE_STATE_LABEL[s].length).toBeGreaterThan(3);
    for (const s of ['draft', 'publishing', 'live', 'updating', 'paused', 'moving', 'removing', 'removed', 'failed'] as const) expect(INSTALL_STATUS_LABEL[s].length).toBeGreaterThan(2);
    expect(friendlyError('publish_failed')).toContain('previous version is still live');
    expect(friendlyError('nope', 'fallback')).toBe('fallback');
    expect(eventText('rollback')).toBe('Previous version restored');
    expect(relativeTime(null)).toBe('Never');
    expect(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5 minutes ago');
  });
});

describe('input helpers', () => {
  it('domain input accepts a domain only', () => {
    for (const ok of ['yourbusiness.com', 'https://www.yourbusiness.com', 'shop.example.co.uk', 'https://yourbusiness.com/']) expect(checkDomainInput(ok), ok).toBeNull();
    for (const bad of ['', '   ', 'yourbusiness', 'https://yourbusiness.com/page', 'yourbusiness.com/about', 'your business.com', 'x.com?a=1']) expect(checkDomainInput(bad), bad).toBeTruthy();
  });
  it('page rules are normalised like the server does', () => {
    expect(normalizeRule('Pricing')).toBe('/pricing');
    expect(normalizeRule('/Services/')).toBe('/services');
    expect(normalizeRule('/services/*')).toBe('/services/*');
    expect(normalizeRule('*')).toBe('*');
    for (const bad of ['/a b', '/a*b', '/x?y=1', '/<b>', '']) expect(normalizeRule(bad), bad).toBeNull();
  });
  it('the publish payload is exactly what the API expects', () => {
    const base = { slot: '', ruleMode: 'all' as const, paths: [], buttonText: '', hideOnMobile: false, trigger: 'delay' as const, delaySeconds: 8, scrollPercent: 50, remember: false };
    expect(buildPayload({ ...base, mode: 'floating_tab', buttonText: ' Take the quiz ' })).toEqual({ mode: 'floating_tab', slot: undefined, include: [], exclude: [], options: { buttonText: 'Take the quiz' } });
    expect(buildPayload({ ...base, mode: 'popup', ruleMode: 'include', paths: ['/services/*'], remember: true, hideOnMobile: true, trigger: 'scroll', scrollPercent: 40 }))
      .toEqual({ mode: 'popup', slot: undefined, include: ['/services/*'], exclude: [], options: { hideOnMobile: true, trigger: 'scroll', scrollPercent: 40, dismissDays: 7 } });
    expect(buildPayload({ ...base, mode: 'popup', ruleMode: 'exclude', paths: ['/checkout/*'] }).options).toEqual({ trigger: 'delay', delaySeconds: 8 });
    expect(buildPayload({ ...base, mode: 'inline', slot: 'hero', buttonText: 'ignored', hideOnMobile: true })).toEqual({ mode: 'inline', slot: 'hero', include: [], exclude: [], options: {} });
  });
});

describe('accessible dialog', () => {
  function Harness({ initiallyOpen = true, onClose = () => undefined, persistent = false }: { initiallyOpen?: boolean; onClose?: () => void; persistent?: boolean }) {
    const [open, setOpen] = React.useState(initiallyOpen);
    return (
      <div>
        <button id="opener" onClick={() => setOpen(true)}>Open</button>
        <Modal open={open} title="Dialog title" subtitle="About this" persistent={persistent} onClose={() => { onClose(); setOpen(false); }} footer={<button>Last</button>}>
          <button>First body</button>
        </Modal>
      </div>
    );
  }
  const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 15)); });

  it('is a labelled modal dialog and moves focus into it', async () => {
    render(<Harness />);
    await settle();
    const dlg = await screen.findByRole('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.getAttribute('aria-labelledby')).toBeTruthy();
    expect(document.getElementById(dlg.getAttribute('aria-labelledby')!)!.textContent).toBe('Dialog title');
    expect(dlg.contains(document.activeElement)).toBe(true);
  });
  it('traps Tab and Shift+Tab inside the dialog', async () => {
    render(<Harness />);
    await settle();
    const dlg = await screen.findByRole('dialog');
    const buttons = Array.from(dlg.querySelectorAll('button'));
    const first = buttons[0], last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
  it('closes on Escape and returns focus to what opened it', async () => {
    const onClose = vi.fn();
    render(<Harness initiallyOpen={false} onClose={onClose} />);
    const opener = document.getElementById('opener')!;
    opener.focus();
    fireEvent.click(opener);
    await settle();
    const dlg = await screen.findByRole('dialog');
    fireEvent.keyDown(dlg, { key: 'Escape' });
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it('a persistent dialog ignores Escape and the backdrop', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} persistent />);
    await settle();
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
  it('locks page scroll while open and restores it', async () => {
    const { unmount } = render(<Harness />);
    await settle();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});

describe('announcements and status', () => {
  it('copying announces to screen readers and gives visible feedback', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true });
    render(<AnnounceProvider><CopyButton text="LOADER" label="Copy loader" doneLabel="Loader copied" announceText="Site loader copied to clipboard" /></AnnounceProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Copy loader' }));
    await waitFor(() => expect(screen.getByRole('button').textContent).toContain('Loader copied'));
    expect(write).toHaveBeenCalledWith('LOADER');
    await waitFor(() => expect(screen.getByTestId('announce-polite').textContent).toBe('Site loader copied to clipboard'));
  });
  it('every status is words plus an icon, never colour alone', () => {
    for (const state of Object.keys(SITE_STATE_LABEL) as Array<keyof typeof SITE_STATE_LABEL>) {
      const { container, unmount } = render(<StatusBadge state={state} />);
      expect(container.textContent).toBe(SITE_STATE_LABEL[state]);
      expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      unmount();
    }
  });
});

const CONFIG = { enabled: true, loaderUrl: 'https://q.test/connect/loader.js', platforms: { available: ['squarespace', 'html'], planned: [], later: [] }, limits: { maxSites: null, maxInstallationsPerSite: null } };
const SITE = { id: 's1', platform: 'squarespace', display_name: 'shop.example', hostname: 'shop.example', site_key: 'ssq_' + 'K'.repeat(32), state: 'draft', attention_reason: null, loader_version_seen: null, slots_seen: [], last_heartbeat_at: null, last_verified_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', disconnected_at: null, health: 'not_verified' };
const json = (body: any, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

function stubFetch(handler: (method: string, path: string, body: any) => any) {
  const calls: Array<{ method: string; path: string; body: any }> = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init: any = {}) => {
    const p = String(url).replace(/^https?:\/\/[^/]+/, '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method || 'GET', path: p, body });
    const out = handler(init.method || 'GET', p, body);
    return out === undefined ? json({ error: 'not found', code: 'not_found' }, 404) : out;
  }));
  return calls;
}

describe('Sites dashboard', () => {
  it('shows a plain fallback to manual embed while the feature is off', async () => {
    stubFetch((m, p) => (p === '/api/connect/config' ? json({ ...CONFIG, enabled: false }) : undefined));
    render(<SitesRoute />);
    expect(await screen.findByTestId('feature-off')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open manual embed' }).getAttribute('href')).toBe('/dashboard/embed');
  });
  it('a new user sees a polished empty state, no invented sites and no limits', async () => {
    const calls = stubFetch((m, p) => (p === '/api/connect/config' ? json(CONFIG) : p === '/api/connect/sites' ? json({ sites: [] }) : p === '/api/quizzes' ? json([]) : undefined));
    render(<SitesRoute />);
    expect(await screen.findByTestId('sites-empty')).toBeTruthy();
    expect(screen.getByText('Connect your website once')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Connect website' }).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/riverlight|Photography Style|Brand Voice|1 of 3|Healthy/);
    expect(calls.some((c) => c.path === '/api/connect/sites')).toBe(true);
  });
  it('lists the real sites from the API with their real state, and shows a limit only when one is configured', async () => {
    stubFetch((m, p) => {
      if (p === '/api/connect/config') return json(CONFIG);
      if (p === '/api/connect/sites') return json({ sites: [{ ...SITE, state: 'verified', last_verified_at: '2026-01-01T00:00:00Z', last_heartbeat_at: '2026-01-01T00:00:00Z', health: 'healthy', installations: { live: 2, paused: 0 } }] });
      if (p === '/api/quizzes') return json([]);
      if (p === '/api/connect/sites/s1') return json({ site: { ...SITE, state: 'verified', health: 'healthy' }, installations: [], events: [], checks: [], loaderUrl: CONFIG.loaderUrl });
      return undefined;
    });
    render(<SitesRoute />);
    expect(await screen.findByRole('heading', { name: 'shop.example', level: undefined }).catch(() => null) ?? await screen.findByLabelText('shop.example')).toBeTruthy();
    expect(screen.getByText('2 installations')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish a quiz' }).hasAttribute('disabled')).toBe(false);
    expect(document.body.textContent).not.toMatch(/ of \d+/);
  });
  it('an unfinished site offers Finish setup instead of publishing', async () => {
    stubFetch((m, p) => (p === '/api/connect/config' ? json(CONFIG) : p === '/api/connect/sites' ? json({ sites: [{ ...SITE, installations: { live: 0, paused: 0 } }] }) : p === '/api/quizzes' ? json([]) : p === '/api/connect/sites/s1' ? json({ site: SITE, installations: [], events: [], checks: [], loaderUrl: CONFIG.loaderUrl }) : undefined));
    render(<SitesRoute />);
    expect(await screen.findByRole('button', { name: 'Finish setup' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Publish a quiz' })).toBeNull();
  });
});

describe('Connect Website wizard', () => {
  const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 15)); });
  function open(onVerified = vi.fn()) {
    render(<AnnounceProvider><ConnectWizard open token="tkn" existingSite={null} onClose={() => undefined} onVerified={onVerified} /></AnnounceProvider>);
    return onVerified;
  }

  it('step 1: only available platforms can be chosen; planned ones explain themselves', async () => {
    stubFetch(() => undefined);
    open();
    await settle();
    const cont = screen.getByRole('button', { name: 'Continue' });
    expect(cont.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /WordPress/ }));
    expect(screen.getByText(/WordPress is planned/)).toBeTruthy();
    expect(cont.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Squarespace/ }));
    expect(screen.getByText(/does not provide a page API/)).toBeTruthy();
    expect(cont.hasAttribute('disabled')).toBe(false);
  });

  it('walks Squarespace from domain to the loader instructions and shows the real key and loader address', async () => {
    const calls = stubFetch((m, p, body) => (m === 'POST' && p === '/api/connect/sites' ? json({ site: { ...SITE, hostname: body.domain.replace(/^https?:\/\//, '') }, loaderUrl: CONFIG.loaderUrl }, 201) : undefined));
    open();
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /Squarespace/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const input = await screen.findByLabelText('Website domain');
    fireEvent.change(input, { target: { value: 'https://shop.example/about' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(document.getElementById('sx-domain-err')!.textContent).toMatch(/domain only/));
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    fireEvent.change(input, { target: { value: 'shop.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Add the Squarespell site loader.')).toBeTruthy();
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({ platform: 'squarespace', domain: 'shop.example' });
    expect(screen.getByLabelText('Site loader code').textContent).toBe('<script async src="https://q.test/connect/loader.js" data-site="' + SITE.site_key + '"></script>');
    expect(screen.getByText(/Code Injection/, { selector: 'b' })).toBeTruthy();
    expect(document.body.textContent).toMatch(/never|not an account password/i);
    expect(document.body.textContent).not.toMatch(/one[- ]click/i);
  });

  it('shows the API error when the site already exists', async () => {
    stubFetch((m, p) => (m === 'POST' && p === '/api/connect/sites' ? json({ error: 'x', code: 'site_exists' }, 409) : undefined));
    open();
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /Other \/ HTML/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(await screen.findByLabelText('Website domain'), { target: { value: 'shop.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(document.getElementById('sx-domain-err')!.textContent).toBe('This website is already connected to your account.'));
  });

  async function toVerifyStep(verify: () => any) {
    stubFetch((m, p, body) => {
      if (m === 'POST' && p === '/api/connect/sites') return json({ site: SITE, loaderUrl: CONFIG.loaderUrl }, 201);
      if (m === 'POST' && p === '/api/connect/sites/s1/verify') return verify();
      if (m === 'POST' && p === '/api/connect/sites/s1/attention') return json({ site: { ...SITE, state: 'verifying', attention_reason: body.reason } });
      return undefined;
    });
    const onVerified = open();
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /Squarespace/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(await screen.findByLabelText('Website domain'), { target: { value: 'shop.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'I saved it, continue' }));
    await screen.findByText('Verify the live connection.');
    return onVerified;
  }

  it('verification: a page that passes shows Verified and offers to publish', async () => {
    const onVerified = await toVerifyStep(() => json({ site: { ...SITE, state: 'verified', last_heartbeat_at: null }, result: { ok: true, reason: null, url: 'https://shop.example/', status: 200, loaderFound: true, slots: [] } }));
    expect(screen.getByTestId('verify-target').textContent).toContain('https://shop.example');
    fireEvent.click(screen.getByRole('button', { name: 'Verify connection' }));
    expect(await screen.findByText('Connection verified')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('announce-polite').textContent).toMatch(/Connection verified/));
    fireEvent.click(screen.getByRole('button', { name: 'Publish a quiz' }));
    expect(onVerified).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), true);
  });

  it('verification: a password-protected site stops at once with recovery steps and does not say Verified', async () => {
    await toVerifyStep(() => json({ site: { ...SITE, state: 'verifying', attention_reason: 'page_requires_login' }, result: { ok: false, reason: 'page_requires_login', url: 'https://shop.example/', status: 401, loaderFound: false, slots: [] } }));
    fireEvent.click(screen.getByRole('button', { name: 'Verify connection' }));
    const rec = await screen.findByTestId('recovery');
    expect(rec.textContent).toContain('Your website asks for a password');
    expect(screen.queryByText('Connection verified')).toBeNull();
    expect(within(rec).getByRole('button', { name: 'Check again' })).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('announce-assertive').textContent).toContain('Your website asks for a password'));
  });

  it('verification: a missing loader is retried, then explained, with a way to report a plan without Code Injection', async () => {
    vi.useFakeTimers();
    let n = 0;
    await toVerifyStepFake(() => { n++; return json({ site: { ...SITE, state: 'verifying', attention_reason: 'loader_not_found' }, result: { ok: false, reason: 'loader_not_found', url: 'https://shop.example/', status: 200, loaderFound: false, slots: [] } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Verify connection' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(40000); });
    const rec = screen.getByTestId('recovery');
    expect(rec.textContent).toContain('We could not find the site loader on your live page');
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(6);
    fireEvent.click(within(rec).getByRole('button', { name: 'I cannot find Code Injection' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByTestId('recovery').textContent).toContain('may not include Code Injection');
  });
  async function toVerifyStepFake(verify: () => any) {
    stubFetch((m, p, body) => {
      if (m === 'POST' && p === '/api/connect/sites') return json({ site: SITE, loaderUrl: CONFIG.loaderUrl }, 201);
      if (m === 'POST' && p === '/api/connect/sites/s1/verify') return verify();
      if (m === 'POST' && p === '/api/connect/sites/s1/attention') return json({ site: { ...SITE, state: 'verifying', attention_reason: body.reason } });
      return undefined;
    });
    open();
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    fireEvent.click(screen.getByRole('button', { name: /Squarespace/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    fireEvent.change(screen.getByLabelText('Website domain'), { target: { value: 'shop.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });
    fireEvent.click(screen.getByRole('button', { name: 'I saved it, continue' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(20); });
  }
});

describe('responsive and motion style contract (320px and wider)', () => {
  it('collapses to phone layouts and never relies on fixed wide widths', () => {
    expect(SITES_CSS).toMatch(/@media \(max-width:640px\)/);
    expect(SITES_CSS).toMatch(/\.sx-platforms\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
    expect(SITES_CSS).toMatch(/\.sx-metrics\{display:flex;overflow-x:auto/);
    expect(SITES_CSS).toMatch(/\.sx-backdrop\{align-items:flex-end;padding:0\}/);
    expect(SITES_CSS).toMatch(/\.sx-cards3\{grid-template-columns:1fr\}/);
    expect(SITES_CSS).toMatch(/overflow-wrap:anywhere/);
    expect(SITES_CSS).toMatch(/\.sx-scope \*\{box-sizing:border-box\}/);
    expect(SITES_CSS).not.toMatch(/min-width:\s*(3[2-9]\d|[4-9]\d\d)px/);
    expect(SITES_CSS).toMatch(/minmax\(min\(100%,340px\),1fr\)/);
  });
  it('respects reduced motion and has a visible focus ring', () => {
    expect(SITES_CSS).toMatch(/@media \(prefers-reduced-motion:reduce\)/);
    expect(SITES_CSS).toMatch(/\.sx-scope :focus-visible\{outline:3px solid/);
    expect(SITES_CSS).toMatch(/@keyframes sx-scan/);
    expect(SITES_CSS).toMatch(/@keyframes sx-pop/);
  });
});

import { within } from '@testing-library/react';
