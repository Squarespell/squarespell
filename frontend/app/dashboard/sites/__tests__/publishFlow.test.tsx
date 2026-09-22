/**
 * Regressions found during the staging design review: placement illustrations, the two-column Pages and preview step with the quiz
 * shown in website context, the Desktop/Mobile toggle, no reset of a half-completed flow when data refreshes, long domains, and the
 * four-tile dashboard.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import type { QuizSummary, Site } from '@/lib/connect/client';
import { AnnounceProvider, SITES_CSS } from '../_components/primitives';
import { PublishFlow } from '../_components/PublishFlow';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const SITE: Site = { id: 's1', platform: 'squarespace', display_name: null, hostname: 'api-staging.squarespellquiz.com', site_key: 'ssq_' + 'K'.repeat(32), state: 'verified', attention_reason: null, loader_version_seen: null, slots_seen: ['hero-quiz'], last_heartbeat_at: null, last_verified_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', disconnected_at: null, health: 'awaiting_heartbeat' };
const quizzes = (): QuizSummary[] => [{ id: 'q1', title: 'Review quiz one', slug: 'review-one', status: 'live' }, { id: 'q2', title: 'Review quiz two', slug: 'review-two', status: 'live' }];
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 15)); });
const open = (qs = quizzes()) => (
  <AnnounceProvider><PublishFlow open token="tkn" site={SITE} quizzes={qs} onClose={() => undefined} onDone={() => undefined} /></AnnounceProvider>
);
const dialog = () => screen.getByRole('dialog');
const clickBtn = (name: RegExp) => fireEvent.click(Array.from(dialog().querySelectorAll('button')).find((b) => name.test(b.textContent || ''))!);

describe('placement choices', () => {
  it('each choice has its own approved illustration, and only one is selected', async () => {
    render(open());
    await settle();
    const radios = Array.from(dialog().querySelectorAll('[role="radio"]'));
    expect(radios.map((r) => r.getAttribute('data-art'))).toEqual(['inline', 'popup', 'floating_tab']);
    for (const r of radios) expect(r.querySelector('.sx-place-visual .sx-wire, .sx-place-visual')).not.toBeNull();
    expect(radios[0].querySelector('.sx-art-inline')).not.toBeNull();
    expect(radios[1].querySelector('.sx-art-popup')).not.toBeNull();
    expect(radios[2].querySelector('.sx-art-tab')).not.toBeNull();
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
    expect(radios[2].textContent).toContain('Recommended');
    fireEvent.click(radios[0]);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    for (const r of radios) expect(r.querySelector('.sx-place-visual')!.getAttribute('aria-hidden')).toBe('true');
  });
  it('arrow keys move the choice', async () => {
    render(open());
    await settle();
    const radios = Array.from(dialog().querySelectorAll('[role="radio"]')) as HTMLElement[];
    fireEvent.keyDown(radios[2], { key: 'ArrowRight' });
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
    expect(radios[2].getAttribute('aria-checked')).toBe('true');
  });
});

describe('a half-completed flow survives a data refresh', () => {
  it('keeps the step, the placement and the quiz when the quiz list is reloaded (new array, same content)', async () => {
    const { rerender } = render(open());
    await settle();
    fireEvent.change(dialog().querySelector('select')!, { target: { value: 'q2' } });
    fireEvent.click(dialog().querySelector('[data-art="popup"]')!);
    clickBtn(/^Continue$/);
    await settle();
    expect(dialog().querySelector('h3')!.textContent).toBe('Pages and preview');
    rerender(open(quizzes()));
    await settle();
    rerender(open(quizzes()));
    await settle();
    expect(dialog().querySelector('h3')!.textContent).toBe('Pages and preview');
    expect(dialog().querySelector('[data-testid="preview-context"]')!.getAttribute('data-mode')).toBe('popup');
    expect(dialog().querySelector('iframe')!.getAttribute('src')).toContain('review-two');
  });
  it('quizzes that arrive after opening fill an empty choice but never replace a chosen one', async () => {
    const { rerender } = render(open([]));
    await settle();
    expect((dialog().querySelector('select') as HTMLSelectElement).value).toBe('');
    rerender(open(quizzes()));
    await settle();
    expect((dialog().querySelector('select') as HTMLSelectElement).value).toBe('q1');
    fireEvent.change(dialog().querySelector('select')!, { target: { value: 'q2' } });
    rerender(open(quizzes()));
    await settle();
    expect((dialog().querySelector('select') as HTMLSelectElement).value).toBe('q2');
  });
});

describe('Pages and preview: rules beside a website-context preview', () => {
  const toStep2 = async (art?: string) => {
    render(open());
    await settle();
    if (art) fireEvent.click(dialog().querySelector('[data-art="' + art + '"]')!);
    clickBtn(/^Continue$/);
    await settle();
  };
  it('shows the display rules and the preview as two cards', async () => {
    await toStep2();
    const two = dialog().querySelector('.sx-two')!;
    const cards = two.querySelectorAll(':scope > .sx-panel-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Display rules');
    expect(cards[1].textContent).toContain('Nothing you do here is recorded');
    expect(SITES_CSS).toMatch(/\.sx-two\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.1fr\)/);
    expect(SITES_CSS).toMatch(/@media \(max-width:900px\)\{\.sx-two\{grid-template-columns:1fr\}\}/);
  });
  it('floating tab: the real quiz opens in a slide-in panel beside the tab, on a mock of the customer site', async () => {
    await toStep2('floating_tab');
    const ctx = dialog().querySelector('[data-testid="preview-context"]')!;
    expect(ctx.getAttribute('data-mode')).toBe('floating_tab');
    expect(ctx.querySelector('.sx-mock-brand')!.textContent).toBe('api-staging.squarespellquiz.com');
    expect(ctx.querySelector('.sx-mock-tab')!.textContent).toBe('Take the quiz');
    expect(ctx.querySelectorAll('iframe')).toHaveLength(1);
    expect(ctx.querySelector('.sx-mock-panel iframe')!.getAttribute('src')).toBe('/embed/review-one?embed=1&preview=1');
  });
  it('popup: the real quiz sits in an overlay on the page', async () => {
    await toStep2('popup');
    const ctx = dialog().querySelector('[data-testid="preview-context"]')!;
    expect(ctx.getAttribute('data-mode')).toBe('popup');
    expect(ctx.querySelectorAll('iframe')).toHaveLength(1);
    expect(ctx.querySelector('.sx-mock-overlay .sx-mock-dialog iframe')).not.toBeNull();
    expect(ctx.querySelector('.sx-mock-tab')).toBeNull();
  });
  it('inline: the real quiz sits inside the page, where the slot is (a slot name is needed first)', async () => {
    render(open());
    await settle();
    fireEvent.click(dialog().querySelector('[data-art="inline"]')!);
    clickBtn(/^Continue$/);
    await settle();
    expect(dialog().querySelector('h3')!.textContent).toBe('Choose how it appears');
    fireEvent.change(dialog().querySelector('#sx-slot')!, { target: { value: 'hero-quiz' } });
    clickBtn(/^Continue$/);
    await settle();
    const ctx = dialog().querySelector('[data-testid="preview-context"]')!;
    expect(ctx.getAttribute('data-mode')).toBe('inline');
    expect(ctx.querySelector('.sx-mock-page .sx-mock-quiz iframe')!.getAttribute('src')).toContain('preview=1');
    expect(ctx.querySelector('.sx-mock-overlay')).toBeNull();
    expect(ctx.querySelector('.sx-mock-tab')).toBeNull();
    expect(ctx.querySelectorAll('iframe')).toHaveLength(1);
  });
  it('the Desktop/Mobile toggle changes the preview width and keeps the real quiz', async () => {
    await toStep2('floating_tab');
    const ctx = () => dialog().querySelector('[data-testid="preview-context"]')!;
    expect(ctx().getAttribute('data-device')).toBe('desktop');
    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(ctx().getAttribute('data-device')).toBe('mobile');
    expect(ctx().querySelector('iframe')!.getAttribute('src')).toContain('preview=1');
    expect(screen.getByRole('button', { name: 'Mobile' }).getAttribute('aria-pressed')).toBe('true');
    expect(SITES_CSS).toMatch(/\.sx-site-mock\[data-device="mobile"\]\{width:340px\}/);
  });
  it('a long domain wraps in the heading and in the preview instead of crowding them', () => {
    expect(SITES_CSS).toMatch(/\.sx-modal-head h2\{overflow-wrap:anywhere\}/);
    expect(SITES_CSS).toMatch(/\.sx-modal-head>div\{min-width:0\}/);
    expect(SITES_CSS).toMatch(/\.sx-mock-brand\{[^}]*overflow-wrap:anywhere/);
  });
});

describe('style contract for the design fixes', () => {
  it('placement cards stack with a side illustration on phones, and use the approved illustration rules', () => {
    expect(SITES_CSS).toMatch(/\.sx-place-visual\{height:116px;background:#eff4f2/);
    expect(SITES_CSS).toMatch(/\.sx-art-popup\{[^}]*border-top:20px solid var\(--teal\)/);
    expect(SITES_CSS).toMatch(/\.sx-place\{display:grid;grid-template-columns:120px minmax\(0,1fr\)\}/);
  });
  it('the dashboard summary has four tiles and installations sit beside activity on wide screens', () => {
    expect(SITES_CSS).toMatch(/\.sx-metrics\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
    expect(SITES_CSS).toMatch(/\.sx-lower\{display:grid;grid-template-columns:minmax\(0,1\.5fr\) minmax\(0,1fr\)/);
    expect(SITES_CSS).toMatch(/@media \(max-width:1000px\)\{\.sx-lower\{grid-template-columns:1fr\}/);
  });
  it('the success ring is disabled by the reduced-motion rule', () => {
    expect(SITES_CSS).toMatch(/\.sx-tick::after\{[^}]*animation:sx-ring/);
    expect(SITES_CSS).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.sx-scope \*/);
  });
});
