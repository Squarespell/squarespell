/**
 * App 404 page (app/not-found.tsx): its own title and a way back (SEO plan Segment 1, task 1.9).
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import NotFound, { metadata } from '../not-found';

describe('not-found page', () => {
  it('has the title "Page not found | Squarespell Quiz"', () => {
    expect(metadata.title).toBe('Page not found | Squarespell Quiz');
  });

  it('links back to the dashboard and home', () => {
    const { container } = render(<NotFound />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/');
  });
});
