/** Regressions found while operating the real staging UI at four viewport widths. */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { relativeTime } from '@/lib/connect/copy';
import { AnnounceProvider, Modal } from '../_components/primitives';
import { SiteDetailBody } from '../_components/SiteDetail';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 15)); });

describe('relative times read naturally', () => {
  const ago = (ms: number) => relativeTime(new Date(Date.now() - ms).toISOString());
  it('uses the singular for one minute and one hour', () => {
    expect(ago(60_000)).toBe('1 minute ago');
    expect(ago(90_000)).toBe('2 minutes ago');
    expect(ago(3_600_000)).toBe('1 hour ago');
    expect(ago(2 * 3_600_000)).toBe('2 hours ago');
    expect(ago(5 * 60_000)).toBe('5 minutes ago');
  });
  it('never says "0 minutes" or a plural of one', () => {
    for (const ms of [46_000, 59_000, 61_000, 100_000, 3_599_000, 3_601_000, 5_400_000]) expect(ago(ms)).not.toMatch(/\b0 |\b1 (minutes|hours)/);
  });
});

describe('focus goes back to the control that opened a dialog, even if the browser never focused it', () => {
  function Harness() {
    const [open, setOpen] = React.useState(false);
    return (<div><button id="opener" onClick={() => setOpen(true)}>Open</button><Modal open={open} title="T" onClose={() => setOpen(false)}><button>Inside</button></Modal></div>);
  }
  it('restores focus from the last pressed control (Safari does not focus buttons on click)', async () => {
    render(<Harness />);
    const opener = document.getElementById('opener')!;
    expect(document.activeElement).toBe(document.body);
    fireEvent.pointerDown(opener);
    fireEvent.click(opener);
    await settle();
    const dlg = await screen.findByRole('dialog');
    expect(dlg.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(dlg, { key: 'Escape' });
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it('still uses the focused element when there is one', async () => {
    render(<Harness />);
    const opener = document.getElementById('opener')!;
    opener.focus();
    fireEvent.click(opener);
    await settle();
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await settle();
    expect(document.activeElement).toBe(opener);
  });
});

describe('the dashboard shell top bar fits a phone', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', '_components', 'DashboardShell.tsx'), 'utf8');
  it('the search button can shrink (it used a fixed minWidth of 320 that widened every page)', () => {
    expect(src).not.toMatch(/minWidth:\s*320/);
    expect(src).toMatch(/flex:\s*'0 1 320px'/);
    expect(src).toMatch(/maxWidth:\s*320/);
  });
  it('uses a tighter side padding on phones', () => {
    expect(src).toMatch(/padding:\s*isMobile \? '0 16px' : '0 32px'/);
  });
});

describe('an unfinished site with a failed check can return to the loader', () => {
  const SITE = { id: 's1', platform: 'squarespace', display_name: null, hostname: 'shop.example', site_key: 'ssq_' + 'K'.repeat(32), state: 'verifying', attention_reason: 'unreachable', loader_version_seen: null, slots_seen: [], last_heartbeat_at: null, last_verified_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', disconnected_at: null, health: 'not_verified' };
  const stub = (site: any) => vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ site, installations: [], events: [], checks: [], loaderUrl: 'https://q.test/connect/loader.js' }) })));
  const mount = (onFinishSetup = vi.fn()) => { render(<AnnounceProvider><SiteDetailBody token="t" siteId="s1" quizzes={[]} onChanged={() => undefined} onDisconnected={() => undefined} onFinishSetup={onFinishSetup} /></AnnounceProvider>); return onFinishSetup; };

  it('shows the recovery and a Show the loader again button that reopens the setup', async () => {
    stub(SITE);
    const onFinish = mount();
    await settle();
    expect(screen.getByTestId('site-recovery').textContent).toContain('We could not reach your website');
    fireEvent.click(screen.getByRole('button', { name: 'Show the loader again' }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });
  it('a site that was verified before does not offer the loader again (its loader was already installed)', async () => {
    stub({ ...SITE, state: 'needs_attention', attention_reason: 'verification_lost', last_verified_at: '2026-01-01T00:00:00Z' });
    mount();
    await settle();
    expect(screen.getByTestId('site-recovery').textContent).toContain('no longer on your page');
    expect(screen.queryByRole('button', { name: 'Show the loader again' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeTruthy();
  });
});
