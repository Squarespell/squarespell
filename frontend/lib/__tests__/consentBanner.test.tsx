/**
 * The app's cookie choice (components/ConsentBanner.tsx): asked once, hidden after a choice, reopened by
 * "Cookie settings", and never shown on quiz-taker pages. SEO plan Segment 4, task 4.1.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

let path = '/dashboard/settings';
vi.mock('next/navigation', () => ({ usePathname: () => path }));

import ConsentBanner from '../../components/ConsentBanner';

beforeEach(() => {
  path = '/dashboard/settings';
  document.cookie = 'sqs_consent=; path=/; max-age=0';
  delete (window as any).__sqsAnalytics;
  delete (window as any).gtag;
  (window as any).dataLayer = [];
});

describe('ConsentBanner', () => {
  it('asks once, hides after a choice, and "Cookie settings" opens it again with focus inside', async () => {
    render(<><ConsentBanner /><button type="button" data-sqs-consent-open="">Cookie settings</button></>);
    expect(await screen.findByRole('region', { name: 'Cookie choice' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }));
    expect(await screen.findByRole('region', { name: 'Cookie choice' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reject' }));
  });

  it('stays away from quiz-taker pages, even when "Cookie settings" is clicked', async () => {
    path = '/q/abc';
    render(<><ConsentBanner /><button type="button" data-sqs-consent-open="">Cookie settings</button></>);
    fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).toBeNull();
    expect((window as any).dataLayer).toHaveLength(0);
  });
});
