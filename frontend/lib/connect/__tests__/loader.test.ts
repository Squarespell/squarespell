/**
 * The shipped site loader, executed in jsdom exactly as customers receive it (renderLoader output).
 * Covers: idempotency, no cookies, privacy of the heartbeat, page rules, popup, floating tab, inline slots, Squarespace-style
 * AJAX navigation, retaining the previous manifest when an update fails, pause/remove, and accessibility of the dialogs.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderLoader, LOADER_VERSION } from '../loaderSource';

const KEY = 'ssq_' + 'A'.repeat(32);
const API = 'https://api.test';
const ORIGIN = 'https://quiz.test';
type Inst = { id: string; quiz: string; mode: string; slot: string | null; include: string[]; exclude: string[]; options: Record<string, any> };
const inst = (over: Partial<Inst> = {}): Inst => ({ id: 'i1', quiz: 'my-quiz', mode: 'floating_tab', slot: null, include: [], exclude: [], options: {}, ...over });
const manifest = (installations: Inst[], over: Record<string, any> = {}) => ({ v: 1, site: KEY, hostname: 'localhost', version: 1, paused: false, generatedAt: '2026-01-01T00:00:00Z', installations, ...over });

let current: any;
let manifestCalls: string[];
let heartbeats: Array<{ url: string; init: any }>;
let failNext: 'reject' | 'invalid' | null;

function stubNetwork() {
  manifestCalls = []; heartbeats = []; failNext = null;
  vi.stubGlobal('fetch', vi.fn((url: string, init?: any) => {
    if (String(url).includes('/heartbeat')) { heartbeats.push({ url: String(url), init }); return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) }); }
    manifestCalls.push(String(url));
    if (failNext === 'reject') return Promise.reject(new Error('offline'));
    if (failNext === 'invalid') return Promise.resolve({ ok: true, status: 200, json: async () => ({ v: 2, nonsense: true }) });
    return Promise.resolve({ ok: true, status: 200, json: async () => current });
  }));
}

function addLoaderTag(key = KEY) {
  const s = document.createElement('script');
  s.setAttribute('src', ORIGIN + '/connect/loader.js');
  s.setAttribute('data-site', key);
  document.head.appendChild(s);
}
function runLoader() { new Function(renderLoader({ api: API, origin: ORIGIN }))(); }
async function tick(ms = 0) { await vi.advanceTimersByTimeAsync(ms); }
async function boot(m: any, key = KEY) {
  current = m;
  addLoaderTag(key);
  runLoader();
  await tick(0);
  await tick(300);
}
const setPath = (p: string) => { window.history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); };

beforeEach(() => {
  vi.useFakeTimers();
  stubNetwork();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  window.history.pushState({}, '', '/');
  document.body.innerHTML = '';
  document.head.querySelectorAll('script[data-site]').forEach((n) => n.remove());
  try { window.localStorage.clear(); } catch { /* not available */ }
});
afterEach(() => {
  (window as any).__squarespellConnect?.destroy();
  document.getElementById('squarespell-connect-styles')?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('starting up', () => {
  it('does nothing without a valid site key and makes no request', async () => {
    addLoaderTag('nope');
    runLoader();
    await tick(500);
    expect((window as any).__squarespellConnect).toBeUndefined();
    expect(manifestCalls).toHaveLength(0);
    expect(heartbeats).toHaveLength(0);
  });
  it('is idempotent: including it twice fetches the manifest and starts observers once', async () => {
    current = manifest([inst()]);
    addLoaderTag();
    runLoader();
    runLoader();
    addLoaderTag();
    runLoader();
    await tick(500);
    expect(manifestCalls).toHaveLength(1);
    expect(document.querySelectorAll('.sqc-tab')).toHaveLength(1);
    expect(document.querySelectorAll('#squarespell-connect-styles')).toHaveLength(1);
  });
  it('fetches the public manifest for its site without credentials and uses only the final domain', async () => {
    await boot(manifest([]));
    expect(manifestCalls[0]).toBe(API + '/api/public/connect/manifest?site=' + KEY);
    const src = renderLoader({ api: API, origin: ORIGIN });
    expect(src).not.toMatch(/quiz\.squarespell\.com|app\.squarespell\.com/);
    expect(src).toContain(ORIGIN);
    expect(((fetch as any).mock.calls[0][1] as any).credentials).toBe('omit');
  });
  it('sets no cookies and sends a heartbeat with only the version, the public path and slot names', async () => {
    document.body.innerHTML = '<div data-squarespell-slot="hero"></div>';
    window.history.pushState({}, '', '/pricing?email=a@b.c&utm=1#frag');
    await boot(manifest([]));
    expect(document.cookie).toBe('');
    expect(heartbeats.length).toBeGreaterThanOrEqual(1);
    const hb = heartbeats[0];
    expect(hb.url).toBe(API + '/api/public/connect/heartbeat?site=' + KEY);
    expect(hb.init.method).toBe('POST');
    expect(hb.init.credentials).toBe('omit');
    expect(hb.init.headers['Content-Type']).toMatch(/^text\/plain/);
    expect(JSON.parse(hb.init.body)).toEqual({ version: LOADER_VERSION, path: '/pricing', slots: ['hero'] });
    expect(hb.init.body).not.toMatch(/email|utm|frag|cookie|agent/i);
  });
  it('never renders for a manifest that belongs to a different hostname', async () => {
    await boot(manifest([inst()], { hostname: 'someone-else.example' }));
    expect(document.querySelector('.sqc-tab')).toBeNull();
  });
  it('a paused site renders nothing', async () => {
    await boot(manifest([inst()], { paused: true }));
    expect(document.querySelector('.sqc-tab')).toBeNull();
  });
  it('survives garbage: a broken network, an invalid manifest and odd installations never throw or change the page', async () => {
    failNext = 'reject';
    await boot(manifest([inst()]));
    expect(document.body.children).toHaveLength(0);
    const bad = manifest([{ ...inst(), mode: 'banner' }]);
    (window as any).__squarespellConnect.destroy();
    failNext = null;
    document.head.querySelectorAll('script[data-site]').forEach((n) => n.remove());
    await boot(bad);
    expect(document.querySelector('.sqc-tab')).toBeNull();
    (window as any).__squarespellConnect.destroy();
    document.head.querySelectorAll('script[data-site]').forEach((n) => n.remove());
    await boot(manifest([inst({ quiz: '../../evil' })]));
    expect(document.querySelector('.sqc-tab')).toBeNull();
  });
});

describe('floating tab and popup', () => {
  it('renders a floating tab that opens an accessible dialog, closes with Escape and returns focus', async () => {
    await boot(manifest([inst({ options: { buttonText: 'Find my fit', accentColor: '#0f7377' } })]));
    const tab = document.querySelector('.sqc-tab') as HTMLButtonElement;
    expect(tab.textContent).toBe('Find my fit');
    expect(tab.getAttribute('aria-expanded')).toBe('false');
    tab.focus();
    tab.click();
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dlg).not.toBeNull();
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.getAttribute('aria-label')).toBeTruthy();
    expect(tab.getAttribute('aria-expanded')).toBe('true');
    const frame = dlg.querySelector('iframe') as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toBe(ORIGIN + '/embed/my-quiz?embed=1&v=' + LOADER_VERSION + '&accent=%230f7377');
    const close = dlg.querySelector('button') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Close quiz');
    expect(document.activeElement).toBe(close);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(tab);
    expect(tab.getAttribute('aria-expanded')).toBe('false');
  });
  it('keeps keyboard focus inside the dialog', async () => {
    await boot(manifest([inst()]));
    (document.querySelector('.sqc-tab') as HTMLButtonElement).click();
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
    const close = dlg.querySelector('button') as HTMLButtonElement;
    const frame = dlg.querySelector('iframe') as HTMLIFrameElement;
    close.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(frame);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);
    (document.body as any).focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(close);
  });
  it('a popup opens after its delay, once, and restores the page when closed', async () => {
    await boot(manifest([inst({ mode: 'popup', options: { trigger: 'delay', delaySeconds: 2 } })]));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await tick(1500);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await tick(1000);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.documentElement.style.overflow).toBe('hidden');
    (document.querySelector('.sqc-close') as HTMLButtonElement).click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
    await tick(5000);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('an exit-intent popup opens when the pointer leaves through the top', async () => {
    await boot(manifest([inst({ mode: 'popup', options: { trigger: 'exit' } })]));
    document.dispatchEvent(new MouseEvent('mouseout', { clientY: 200, bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    document.dispatchEvent(new MouseEvent('mouseout', { clientY: -1, bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
  it('remembers a dismissal only when the owner asked for it, in local storage and never in a cookie', async () => {
    await boot(manifest([inst({ mode: 'popup', options: { trigger: 'delay', delaySeconds: 0, dismissDays: 7 } })]));
    await tick(100);
    (document.querySelector('.sqc-close') as HTMLButtonElement).click();
    expect(window.localStorage.getItem('sqc:d:i1')).toBeTruthy();
    expect(document.cookie).toBe('');
    (window as any).__squarespellConnect.destroy();
    document.head.querySelectorAll('script[data-site]').forEach((n) => n.remove());
    await boot(manifest([inst({ mode: 'popup', options: { trigger: 'delay', delaySeconds: 0, dismissDays: 7 } })]));
    await tick(100);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('without remember-dismissal nothing is written to storage', async () => {
    await boot(manifest([inst({ mode: 'popup', options: { trigger: 'delay', delaySeconds: 0 } })]));
    await tick(100);
    (document.querySelector('.sqc-close') as HTMLButtonElement).click();
    expect(window.localStorage.length).toBe(0);
  });
  it('hides on small screens when asked', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    await boot(manifest([inst({ options: { hideOnMobile: true } }), inst({ id: 'i2', mode: 'popup', options: { trigger: 'delay', delaySeconds: 0, hideOnMobile: true } })]));
    await tick(100);
    expect(document.querySelector('.sqc-tab')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  });
});

describe('inline slots', () => {
  it('fills a named slot, honours a fixed height, and resizes only from messages sent by the quiz origin', async () => {
    document.body.innerHTML = '<div id="s" data-squarespell-slot="hero-quiz"></div>';
    await boot(manifest([inst({ mode: 'inline', slot: 'hero-quiz' })]));
    const frame = document.querySelector('#s iframe') as HTMLIFrameElement;
    expect(frame).not.toBeNull();
    expect(frame.style.height).toBe('600px');
    const send = (origin: string, data: any) => window.dispatchEvent(new MessageEvent('message', { origin, data, source: frame.contentWindow as any }));
    send(ORIGIN, { source: 'squarespell', type: 'resize', height: 900 });
    expect(frame.style.height).toBe('900px');
    send('https://evil.example', { source: 'squarespell', type: 'resize', height: 1500 });
    expect(frame.style.height).toBe('900px');
    send(ORIGIN, { source: 'squarespell', type: 'resize', height: 10 });
    expect(frame.style.height).toBe('200px');
    (window as any).__squarespellConnect.destroy();
    document.head.querySelectorAll('script[data-site]').forEach((n) => n.remove());
    document.body.innerHTML = '<div id="t" data-squarespell-slot="hero-quiz"></div>';
    await boot(manifest([inst({ mode: 'inline', slot: 'hero-quiz', options: { height: 640 } })]));
    const fixed = document.querySelector('#t iframe') as HTMLIFrameElement;
    expect(fixed.style.height).toBe('640px');
    window.dispatchEvent(new MessageEvent('message', { origin: ORIGIN, data: { source: 'squarespell', type: 'resize', height: 900 }, source: fixed.contentWindow as any }));
    expect(fixed.style.height).toBe('640px');
  });
  it('waits for a late-rendered slot (a Code Block that appears after load) and fills it once', async () => {
    await boot(manifest([inst({ mode: 'inline', slot: 'late' })]));
    expect(document.querySelector('iframe')).toBeNull();
    const el = document.createElement('div');
    el.setAttribute('data-squarespell-slot', 'late');
    document.body.appendChild(el);
    await tick(400);
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    document.body.appendChild(document.createElement('p'));
    await tick(400);
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    // The heartbeat is throttled to one per five seconds; the new slot is reported as soon as that window ends.
    await tick(6000);
    expect(heartbeats.some((h) => JSON.parse(h.init.body).slots.includes('late'))).toBe(true);
  });
  it('a slot with another name is left alone', async () => {
    document.body.innerHTML = '<div data-squarespell-slot="other"></div>';
    await boot(manifest([inst({ mode: 'inline', slot: 'hero' })]));
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('page rules and Squarespace-style navigation', () => {
  it.each([
    ['/', [], [], true], ['/anything', [], [], true],
    ['/services', ['/services/*'], [], true], ['/services/web', ['/services/*'], [], true], ['/servicesx', ['/services/*'], [], false],
    ['/pricing/', ['/pricing'], [], true], ['/about', ['/'], [], false], ['/', ['/'], [], true],
    ['/checkout/pay', ['*'], ['/checkout/*'], false], ['/blog/a', ['*'], ['/checkout/*'], true], ['/services/private', ['/services/*'], ['/services/private'], false],
  ] as Array<[string, string[], string[], boolean]>)('%s include=%j exclude=%j shows=%s', async (path, include, exclude, shows) => {
    window.history.pushState({}, '', path);
    await boot(manifest([inst({ include, exclude })]));
    expect(!!document.querySelector('.sqc-tab')).toBe(shows);
  });
  it('follows single-page navigation: appears on matching pages, disappears elsewhere, and re-fills a replaced page body', async () => {
    document.body.innerHTML = '<main id="page"><p>home</p></main>';
    await boot(manifest([inst({ id: 'tab', include: ['/services/*'] }), inst({ id: 'inl', mode: 'inline', slot: 'hero', include: ['/services/*'] })]));
    expect(document.querySelector('.sqc-tab')).toBeNull();
    // Squarespace 7.1 replaces the page content without a reload.
    window.history.pushState({}, '', '/services/web');
    document.body.innerHTML = '<main id="page"><div data-squarespell-slot="hero"></div></main>';
    await tick(400);
    expect(document.querySelector('.sqc-tab')).not.toBeNull();
    expect(document.querySelectorAll('[data-squarespell-slot="hero"] iframe')).toHaveLength(1);
    window.history.pushState({}, '', '/contact');
    document.body.innerHTML = '<main id="page"><p>contact</p></main>';
    await tick(400);
    expect(document.querySelector('.sqc-tab')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    setPath('/services/seo');
    document.body.innerHTML = '<main id="page"><div data-squarespell-slot="hero"></div></main>';
    await tick(400);
    expect(document.querySelectorAll('[data-squarespell-slot="hero"] iframe')).toHaveLength(1);
  });
  it('reacts to the Squarespace mercury:load event', async () => {
    await boot(manifest([inst({ include: ['/promo'] })]));
    expect(document.querySelector('.sqc-tab')).toBeNull();
    window.history.pushState({}, '', '/promo');
    window.dispatchEvent(new Event('mercury:load'));
    await tick(400);
    expect(document.querySelector('.sqc-tab')).not.toBeNull();
  });
});

describe('updates, pause, move, remove and failure', () => {
  const refreshWith = async (m: any) => { current = m; failNext = null; await tick(300_000); };
  it('picks up an update, a pause and a removal on the next refresh, and a move to another page', async () => {
    await boot(manifest([inst({ options: { buttonText: 'One' } })], { version: 1 }));
    expect(document.querySelector('.sqc-tab')!.textContent).toBe('One');
    await refreshWith(manifest([inst({ options: { buttonText: 'Two' } })], { version: 2 }));
    expect(document.querySelectorAll('.sqc-tab')).toHaveLength(1);
    expect(document.querySelector('.sqc-tab')!.textContent).toBe('Two');
    await refreshWith(manifest([inst({ options: { buttonText: 'Two' }, include: ['/elsewhere'] })], { version: 3 }));
    expect(document.querySelector('.sqc-tab')).toBeNull();
    await refreshWith(manifest([inst({ options: { buttonText: 'Two' }, include: ['/'] })], { version: 4 }));
    expect(document.querySelector('.sqc-tab')).not.toBeNull();
    await refreshWith(manifest([], { version: 5 }));
    expect(document.querySelector('.sqc-tab')).toBeNull();
  });
  it('keeps the previous manifest when an update fails or is invalid', async () => {
    await boot(manifest([inst({ options: { buttonText: 'Stays' } })]));
    failNext = 'reject';
    await tick(300_000);
    expect(document.querySelector('.sqc-tab')!.textContent).toBe('Stays');
    failNext = 'invalid';
    await tick(300_000);
    expect(document.querySelector('.sqc-tab')!.textContent).toBe('Stays');
    expect(manifestCalls.length).toBeGreaterThanOrEqual(3);
  });
  it('an open dialog is closed cleanly when its installation is removed', async () => {
    await boot(manifest([inst()]));
    (document.querySelector('.sqc-tab') as HTMLButtonElement).click();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await refreshWith(manifest([], { version: 2 }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('.sqc-tab')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });
  it('destroy removes everything it added', async () => {
    document.body.innerHTML = '<div data-squarespell-slot="hero"></div>';
    await boot(manifest([inst(), inst({ id: 'i2', mode: 'inline', slot: 'hero' })]));
    expect(document.querySelector('.sqc-tab')).not.toBeNull();
    (window as any).__squarespellConnect.destroy();
    expect(document.querySelector('.sqc-tab')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector('[data-squarespell-connect]')).toBeNull();
  });
});
